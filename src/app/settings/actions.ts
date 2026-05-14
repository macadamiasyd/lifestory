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
): Promise<void> {
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
}
