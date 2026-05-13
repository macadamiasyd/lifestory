"use server";

import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/ai/anthropic";
import { buildConversationPrompt } from "@/lib/ai/conversation-prompt";
import type { Profile } from "@/lib/types";

export async function sendIntakeMessage(
  messages: { role: "user" | "assistant"; content: string }[],
  userMessage: string
): Promise<{ reply: string; intakeComplete: boolean }> {
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
    isIntake: true,
  });

  const allMessages = [
    ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: userMessage },
  ];

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: allMessages,
  });

  const reply =
    response.content[0].type === "text" ? response.content[0].text : "";
  const intakeComplete = reply.includes("[INTAKE_COMPLETE]");
  const cleanReply = reply.replace("[INTAKE_COMPLETE]", "").trim();

  return { reply: cleanReply, intakeComplete };
}

export async function completeIntake(
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const client = getAnthropicClient();
  const extractionResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: `Extract structured information from this intake conversation. Return ONLY valid JSON with these fields:
{
  "name": "string",
  "age": number or null,
  "location": "string or null",
  "audience": "string describing who the book is for",
  "tone_preference": "one of: warm and reflective, casual and humorous, dignified and thoughtful, matter-of-fact",
  "topics_to_cover": "string or null",
  "topics_to_avoid": "string or null",
  "proposed_chapters": [
    { "title": "string", "description": "brief description" }
  ]
}
Propose 7 chapters based on what you learned about this person. Adapt the chapter structure to their life — a younger person gets fewer chapters, someone with a rich career gets a career-focused chapter, etc. Use the chronological structure as a default but adapt based on what seems most natural for their story.`,
    messages,
  });

  const jsonText =
    extractionResponse.content[0].type === "text"
      ? extractionResponse.content[0].text
      : "{}";

  let intakeData;
  try {
    intakeData = JSON.parse(jsonText);
  } catch {
    const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    intakeData = match ? JSON.parse(match[1]) : {};
  }

  // Update profile
  await supabase
    .from("profiles")
    .update({
      name: intakeData.name || "Friend",
      age: intakeData.age,
      location: intakeData.location,
      audience: intakeData.audience,
      tone_preference: intakeData.tone_preference || "warm and reflective",
      topics_to_cover: intakeData.topics_to_cover,
      topics_to_avoid: intakeData.topics_to_avoid,
      intake_complete: true,
      intake_data: intakeData,
    })
    .eq("id", user.id);

  // Create book
  const { data: book } = await supabase
    .from("books")
    .insert({
      user_id: user.id,
      title: `${intakeData.name || "My"}'s Life Story`,
    })
    .select()
    .single();

  if (!book) throw new Error("Failed to create book");

  // Create chapters from AI proposal
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

  // Save chapter order on book
  await supabase
    .from("books")
    .update({ chapter_order: chapterIds })
    .eq("id", book.id);

  // Save the intake session and messages
  const { data: session } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      session_type: "intake",
      status: "completed",
      ended_at: new Date().toISOString(),
      summary: `Intake conversation with ${intakeData.name}. Audience: ${intakeData.audience}. Tone: ${intakeData.tone_preference}.`,
    })
    .select("id")
    .single();

  if (session) {
    const messageRows = messages.map((m) => ({
      session_id: session.id,
      role: m.role,
      content: m.content,
    }));
    await supabase.from("messages").insert(messageRows);
  }
}
