"use server";

import { createClient } from "@/lib/supabase/server";
import type { UserSettings } from "@/lib/types";

const defaults: UserSettings = {
  tone: "auto",
  structure_type: "chronological",
  point_of_view: "first_person",
  chapter_length: "medium",
  topics_to_avoid: "",
};

export async function getSettings(): Promise<{
  settings: UserSettings;
  bookTitle: string;
  audience: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("settings, audience")
    .eq("id", user.id)
    .single();

  const { data: book } = await supabase
    .from("books")
    .select("title")
    .eq("user_id", user.id)
    .single();

  return {
    settings: { ...defaults, ...(profile?.settings || {}) } as UserSettings,
    bookTitle: book?.title || "",
    audience: profile?.audience || "",
  };
}

export async function saveSettings(
  settings: UserSettings,
  bookTitle: string,
  audience: string
): Promise<{ draftCount: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("profiles")
    .update({ settings, audience })
    .eq("id", user.id);

  if (bookTitle) {
    await supabase
      .from("books")
      .update({ title: bookTitle })
      .eq("user_id", user.id);
  }

  // Count chapters that have drafts (so we can offer to regenerate)
  const { data: book } = await supabase
    .from("books")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!book) return { draftCount: 0 };

  const { data: drafts } = await supabase
    .from("chapters")
    .select("id")
    .eq("book_id", book.id)
    .in("status", ["draft", "review", "final"]);

  return { draftCount: drafts?.length || 0 };
}

export async function regenerateAllDrafts(): Promise<{ regenerated: number }> {
  const { generateChapter } = await import("@/app/editor/actions");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: book } = await supabase
    .from("books")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!book) return { regenerated: 0 };

  // Get all chapters with existing drafts that have conversation data
  const { data: chapters } = await supabase
    .from("chapters")
    .select("id")
    .eq("book_id", book.id)
    .in("status", ["draft", "review", "final"]);

  if (!chapters || chapters.length === 0) return { regenerated: 0 };

  let regenerated = 0;
  for (const chapter of chapters) {
    try {
      await generateChapter(chapter.id);
      regenerated++;
    } catch {
      // Skip chapters that fail (e.g. no conversations)
    }
  }

  return { regenerated };
}
