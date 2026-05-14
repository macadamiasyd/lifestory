"use server";

import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/ai/anthropic";
import { buildConversationPrompt } from "@/lib/ai/conversation-prompt";
import { buildWritingPrompt } from "@/lib/ai/writing-prompt";
import type { Profile } from "@/lib/types";

export async function getOrCreateFirstSession(): Promise<{
  sessionId: string;
  existingMessages: { role: "user" | "assistant"; content: string }[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check for existing active session
  const { data: activeSession } = await supabase
    .from("sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("session_type", "intake")
    .eq("status", "active")
    .single();

  if (activeSession) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("role, content")
      .eq("session_id", activeSession.id)
      .order("created_at");

    return {
      sessionId: activeSession.id,
      existingMessages: (msgs || []) as { role: "user" | "assistant"; content: string }[],
    };
  }

  // Create new intake session
  const { data: session } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      session_type: "intake",
    })
    .select("id")
    .single();

  if (!session) throw new Error("Failed to create session");

  return { sessionId: session.id, existingMessages: [] };
}

export async function sendFirstSessionMessage(
  sessionId: string,
  messages: { role: "user" | "assistant"; content: string }[],
  userMessage: string
): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const systemPrompt = buildConversationPrompt({
    profile: (profile as Profile) || ({ id: user.id, name: "Friend" } as Profile),
    isFirstSession: true,
  });

  const allMessages = [
    ...messages,
    { role: "user" as const, content: userMessage },
  ];

  // Save user message
  await supabase.from("messages").insert({
    session_id: sessionId,
    role: "user",
    content: userMessage,
  });

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: allMessages,
  });

  const reply =
    response.content[0]?.type === "text" ? response.content[0].text : "";

  // Save assistant message
  await supabase.from("messages").insert({
    session_id: sessionId,
    role: "assistant",
    content: reply,
  });

  return reply;
}

export async function wrapUpFirstSession(
  sessionId: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const client = getAnthropicClient();

  // 1. Extract profile data from conversation
  const extractionResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: `Extract structured information from this memoir interview conversation. Return ONLY valid JSON:
{
  "name": "string (the interviewee's name)",
  "age": number or null,
  "location": "string or null (where they grew up or live)",
  "audience": "string (who the book is for)",
  "proposed_chapters": [
    { "title": "string", "description": "brief description personalised to their story" }
  ]
}
Propose 7 chronological chapters based on what you learned about this person. Personalise the titles based on actual details from the conversation — use real names, places, and events they mentioned. Structure:
1. Early life / childhood
2. Growing up / school years
3. Young adulthood / leaving home
4. Relationships / partner
5. Family / children (if applicable)
6. Career / work life
7. Reflections / what matters most

Adapt as needed — a younger person gets fewer chapters, someone without children skips that chapter, etc. Keep titles warm and personal, not generic.`,
    messages: [
      {
        role: "user" as const,
        content: messages
          .map((m) => `${m.role === "user" ? "INTERVIEWEE" : "INTERVIEWER"}: ${m.content}`)
          .join("\n\n"),
      },
    ],
  });

  const jsonText =
    extractionResponse.content[0]?.type === "text"
      ? extractionResponse.content[0].text
      : "{}";

  let intakeData;
  try {
    intakeData = JSON.parse(jsonText);
  } catch {
    const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    intakeData = match ? JSON.parse(match[1]) : {};
  }

  // 2. Update profile
  await supabase
    .from("profiles")
    .update({
      name: intakeData.name || "Friend",
      age: intakeData.age,
      location: intakeData.location,
      audience: intakeData.audience,
      intake_complete: true,
      intake_data: intakeData,
    })
    .eq("id", user.id);

  // Re-fetch profile for writing prompt
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // 3. Create book
  const { data: book } = await supabase
    .from("books")
    .insert({
      user_id: user.id,
      title: `${intakeData.name || "My"}'s Story`,
    })
    .select()
    .single();

  if (!book) throw new Error("Failed to create book");

  // 4. Create chapters
  const chapters = intakeData.proposed_chapters || [];
  const chapterIds: string[] = [];

  for (let i = 0; i < chapters.length; i++) {
    const { data: chapter } = await supabase
      .from("chapters")
      .insert({
        book_id: book.id,
        title: chapters[i].title,
        description: chapters[i].description,
        sort_order: i,
      })
      .select("id")
      .single();
    if (chapter) chapterIds.push(chapter.id);
  }

  await supabase
    .from("books")
    .update({ chapter_order: chapterIds })
    .eq("id", book.id);

  // 5. Complete the session
  const summaryResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `Summarize this memoir interview session. Extract key stories, people, themes, and any unfinished threads. Be concise.`,
    messages: [
      {
        role: "user",
        content: messages
          .map((m) => `${m.role === "user" ? "INTERVIEWEE" : "INTERVIEWER"}: ${m.content}`)
          .join("\n\n"),
      },
    ],
  });

  const summary =
    summaryResponse.content[0]?.type === "text"
      ? summaryResponse.content[0].text
      : "";

  await supabase
    .from("sessions")
    .update({
      status: "completed",
      chapter_id: chapterIds[0] || null,
      ended_at: new Date().toISOString(),
      summary,
    })
    .eq("id", sessionId);

  // 6. Generate first chapter draft (if we have a first chapter and enough content)
  if (chapterIds[0] && profile) {
    const transcript = messages
      .filter((m) => !m.content.startsWith("[System:"))
      .map((m) => `${m.role === "user" ? "INTERVIEWEE" : "INTERVIEWER"}: ${m.content}`)
      .join("\n\n");

    const firstChapter = chapters[0];
    const writingPrompt = buildWritingPrompt({
      profile: profile as Profile,
      chapterTitle: firstChapter?.title || "The Early Days",
      chapterDescription: firstChapter?.description,
      conversationTranscript: transcript,
    });

    const chapterResponse = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: writingPrompt,
      messages: [
        {
          role: "user",
          content: "Please write this chapter based on the interview transcript.",
        },
      ],
    });

    const chapterContent =
      chapterResponse.content[0]?.type === "text"
        ? chapterResponse.content[0].text
        : "";

    if (chapterContent) {
      await supabase
        .from("chapters")
        .update({ content: chapterContent, status: "draft" })
        .eq("id", chapterIds[0]);
    }
  }

  // 7. Save chapter notes
  const notesResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `Extract structured metadata from this interview transcript. Return ONLY valid JSON:
{
  "key_themes": ["theme1", "theme2"],
  "key_people": ["Person Name - relationship"],
  "key_events": ["Brief event description"],
  "summary": "2-3 sentence summary"
}`,
    messages: [
      {
        role: "user",
        content: messages
          .map((m) => `${m.role === "user" ? "INTERVIEWEE" : "INTERVIEWER"}: ${m.content}`)
          .join("\n\n"),
      },
    ],
  });

  const notesJson =
    notesResponse.content[0]?.type === "text"
      ? notesResponse.content[0].text
      : "{}";

  let notes;
  try {
    notes = JSON.parse(notesJson);
  } catch {
    const match = notesJson.match(/```(?:json)?\s*([\s\S]*?)```/);
    notes = match ? JSON.parse(match[1]) : {};
  }

  if (chapterIds[0]) {
    await supabase.from("chapter_notes").insert({
      chapter_id: chapterIds[0],
      session_id: sessionId,
      key_themes: notes.key_themes || [],
      key_people: notes.key_people || [],
      key_events: notes.key_events || [],
      summary: notes.summary || summary,
    });
  }
}
