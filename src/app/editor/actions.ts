"use server";

import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/ai/anthropic";
import { buildWritingPrompt } from "@/lib/ai/writing-prompt";
import type { Profile } from "@/lib/types";

export async function getChapterForEditing(chapterId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: chapter } = await supabase
    .from("chapters")
    .select("*")
    .eq("id", chapterId)
    .single();

  if (!chapter) throw new Error("Chapter not found");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("chapter_id", chapterId)
    .eq("status", "completed");

  return {
    chapter,
    hasConversations: (sessions?.length || 0) > 0,
  };
}

export async function generateChapter(chapterId: string): Promise<string> {
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

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("chapter_id", chapterId)
    .eq("status", "completed")
    .order("started_at");

  if (!sessions || sessions.length === 0) {
    throw new Error("No conversations yet — start a conversation first");
  }

  const sessionIds = sessions.map((s) => s.id);
  const { data: messages } = await supabase
    .from("messages")
    .select("role, content, session_id, created_at")
    .in("session_id", sessionIds)
    .order("created_at");

  const transcript = (messages || [])
    .filter((m) => !m.content.startsWith("[System:"))
    .map(
      (m) =>
        `${m.role === "user" ? "INTERVIEWEE" : "INTERVIEWER"}: ${m.content}`
    )
    .join("\n\n");

  const writingPrompt = buildWritingPrompt({
    profile: profile as Profile,
    chapterTitle: chapter.title,
    chapterDescription: chapter.description || undefined,
    conversationTranscript: transcript,
    existingContent: chapter.content || undefined,
  });

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: writingPrompt,
    messages: [
      {
        role: "user",
        content: chapter.content
          ? "Please update and expand this chapter with the new interview material."
          : "Please write this chapter based on the interview transcript.",
      },
    ],
  });

  const content =
    response.content[0]?.type === "text" ? response.content[0].text : "";

  await supabase
    .from("chapters")
    .update({ content, status: "draft" })
    .eq("id", chapterId);

  return content;
}

export async function saveChapterContent(
  chapterId: string,
  content: string
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("chapters").update({ content }).eq("id", chapterId);
}
