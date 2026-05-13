"use server";

import { createClient } from "@/lib/supabase/server";

export async function getBookWithChapters() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!book) throw new Error("No book found");

  const { data: chapters } = await supabase
    .from("chapters")
    .select("*")
    .eq("book_id", book.id)
    .order("sort_order");

  return { book, chapters: chapters || [] };
}

export async function updateChapterTitle(chapterId: string, title: string) {
  const supabase = await createClient();
  await supabase.from("chapters").update({ title }).eq("id", chapterId);
}

export async function updateChapterOrder(chapterIds: string[]) {
  const supabase = await createClient();

  for (let i = 0; i < chapterIds.length; i++) {
    await supabase
      .from("chapters")
      .update({ sort_order: i })
      .eq("id", chapterIds[i]);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: book } = await supabase
    .from("books")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (book) {
    await supabase
      .from("books")
      .update({ chapter_order: chapterIds })
      .eq("id", book.id);
  }
}

export async function addChapter(bookId: string, title: string, sortOrder: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chapters")
    .insert({ book_id: bookId, title, sort_order: sortOrder })
    .select()
    .single();
  return data;
}

export async function deleteChapter(chapterId: string) {
  const supabase = await createClient();
  await supabase.from("chapters").delete().eq("id", chapterId);
}
