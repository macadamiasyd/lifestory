"use server";

import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/ai/anthropic";
import { buildConversationPrompt } from "@/lib/ai/conversation-prompt";
import type { Profile } from "@/lib/types";

export async function getChapterContext(chapterId: string) {
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

  const { data: chapter } = await supabase
    .from("chapters")
    .select("*")
    .eq("id", chapterId)
    .single();

  if (!chapter) throw new Error("Chapter not found");

  // Get existing session messages for this chapter (last 2 sessions)
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, summary")
    .eq("chapter_id", chapterId)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(2);

  let previousMessages: { role: "user" | "assistant"; content: string }[] = [];
  let sessionSummary = "";

  if (sessions && sessions.length > 0) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("role, content")
      .eq("session_id", sessions[0].id)
      .order("created_at");

    previousMessages = (msgs || []) as {
      role: "user" | "assistant";
      content: string;
    }[];

    sessionSummary = sessions
      .map((s) => s.summary)
      .filter(Boolean)
      .join("\n\n");
  }

  // Check for active session
  const { data: activeSession } = await supabase
    .from("sessions")
    .select("id")
    .eq("chapter_id", chapterId)
    .eq("status", "active")
    .single();

  let activeSessionId = activeSession?.id || null;
  let activeMessages: { role: "user" | "assistant"; content: string }[] = [];

  if (activeSessionId) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("role, content")
      .eq("session_id", activeSessionId)
      .order("created_at");
    activeMessages = (msgs || []) as {
      role: "user" | "assistant";
      content: string;
    }[];
  }

  return {
    profile: profile as Profile,
    chapter,
    previousMessages,
    sessionSummary,
    activeSessionId,
    activeMessages,
  };
}

export async function startSession(chapterId: string): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: session } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      chapter_id: chapterId,
      session_type: "chapter",
    })
    .select("id")
    .single();

  if (!session) throw new Error("Failed to create session");

  // Mark chapter as in_progress
  await supabase
    .from("chapters")
    .update({ status: "in_progress" })
    .eq("id", chapterId);

  return session.id;
}

export async function sendChatMessage(
  sessionId: string,
  chapterId: string,
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

  const { data: chapter } = await supabase
    .from("chapters")
    .select("title, description")
    .eq("id", chapterId)
    .single();

  const { data: previousSessions } = await supabase
    .from("sessions")
    .select("summary")
    .eq("chapter_id", chapterId)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(3);

  const sessionSummary = (previousSessions || [])
    .map((s) => s.summary)
    .filter(Boolean)
    .join("\n\n");

  const systemPrompt = buildConversationPrompt({
    profile: profile as Profile,
    chapterTitle: chapter?.title,
    chapterDescription: chapter?.description || undefined,
    sessionSummary: sessionSummary || undefined,
    isFirstSession: false,
  });

  const allMessages = [
    ...messages,
    { role: "user" as const, content: userMessage },
  ];

  // Save user message to DB
  await supabase.from("messages").insert({
    session_id: sessionId,
    role: "user",
    content: userMessage,
  });

  // Call Claude
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: allMessages,
  });

  const reply =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Save assistant message to DB
  await supabase.from("messages").insert({
    session_id: sessionId,
    role: "assistant",
    content: reply,
  });

  return reply;
}

export async function wrapUpSession(
  sessionId: string,
  chapterId: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<void> {
  const supabase = await createClient();

  // Generate session summary using Claude
  const client = getAnthropicClient();
  const summaryResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `Summarize this memoir interview session. Extract:
1. Key stories and anecdotes shared (2-3 sentences each)
2. Key people mentioned (names and relationships)
3. Key themes or emotions
4. Any unfinished threads to pick up next time

Be concise but capture the important details that a future session or writing engine would need.`,
    messages: [
      {
        role: "user",
        content: `Here is the interview transcript:\n\n${messages.map((m) => `${m.role === "user" ? "INTERVIEWEE" : "INTERVIEWER"}: ${m.content}`).join("\n\n")}`,
      },
    ],
  });

  const summary =
    summaryResponse.content[0].type === "text"
      ? summaryResponse.content[0].text
      : "";

  // Update session
  await supabase
    .from("sessions")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
      summary,
    })
    .eq("id", sessionId);

  // Save chapter notes
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
          .map(
            (m) =>
              `${m.role === "user" ? "INTERVIEWEE" : "INTERVIEWER"}: ${m.content}`
          )
          .join("\n\n"),
      },
    ],
  });

  const notesJson =
    notesResponse.content[0].type === "text"
      ? notesResponse.content[0].text
      : "{}";

  let notes;
  try {
    notes = JSON.parse(notesJson);
  } catch {
    const match = notesJson.match(/```(?:json)?\s*([\s\S]*?)```/);
    notes = match ? JSON.parse(match[1]) : {};
  }

  await supabase.from("chapter_notes").insert({
    chapter_id: chapterId,
    session_id: sessionId,
    key_themes: notes.key_themes || [],
    key_people: notes.key_people || [],
    key_events: notes.key_events || [],
    summary: notes.summary || summary,
  });
}
