"use server";

import { createClient } from "@/lib/supabase/server";

export async function getSourceMaterials(): Promise<{
  materials: {
    id: string;
    title: string;
    content: string;
    source_type: string;
    created_at: string;
  }[];
  bookId: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: book } = await supabase
    .from("books")
    .select("id, book_type")
    .eq("user_id", user.id)
    .single();

  if (!book || book.book_type !== "biography") {
    return { materials: [], bookId: null };
  }

  const { data: materials } = await supabase
    .from("source_materials")
    .select("id, title, content, source_type, created_at")
    .eq("book_id", book.id)
    .order("created_at", { ascending: false });

  return { materials: materials || [], bookId: book.id };
}

export async function addSourceMaterial(
  title: string,
  content: string,
  sourceType: string
): Promise<{ id: string }> {
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

  if (!book) throw new Error("No book found");

  const { data: material } = await supabase
    .from("source_materials")
    .insert({
      book_id: book.id,
      title,
      content,
      source_type: sourceType,
    })
    .select("id")
    .single();

  if (!material) throw new Error("Failed to create source material");
  return { id: material.id };
}

export async function updateSourceMaterial(
  id: string,
  title: string,
  content: string,
  sourceType: string
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("source_materials")
    .update({ title, content, source_type: sourceType, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function deleteSourceMaterial(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("source_materials").delete().eq("id", id);
}
