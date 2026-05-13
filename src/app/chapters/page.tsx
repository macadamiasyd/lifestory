"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getBookWithChapters,
  updateChapterTitle,
  updateChapterOrder,
  addChapter,
  deleteChapter,
} from "./actions";
import type { Book, Chapter } from "@/lib/types";

export default function ChapterPlannerPage() {
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await getBookWithChapters();
      setBook(data.book as Book);
      setChapters(data.chapters as Chapter[]);
    } catch {
      router.push("/onboarding");
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(chapterId: string) {
    if (!editTitle.trim()) return;
    await updateChapterTitle(chapterId, editTitle.trim());
    setChapters((prev) =>
      prev.map((c) => (c.id === chapterId ? { ...c, title: editTitle.trim() } : c))
    );
    setEditingId(null);
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const updated = [...chapters];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setChapters(updated);
    await updateChapterOrder(updated.map((c) => c.id));
  }

  async function handleMoveDown(index: number) {
    if (index === chapters.length - 1) return;
    const updated = [...chapters];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setChapters(updated);
    await updateChapterOrder(updated.map((c) => c.id));
  }

  async function handleAdd() {
    if (!newTitle.trim() || !book) return;
    const chapter = await addChapter(book.id, newTitle.trim(), chapters.length);
    if (chapter) {
      setChapters((prev) => [...prev, chapter as Chapter]);
      setNewTitle("");
    }
  }

  async function handleDelete(chapterId: string) {
    await deleteChapter(chapterId);
    setChapters((prev) => prev.filter((c) => c.id !== chapterId));
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50">
        <p className="text-stone-500">Loading your chapters...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-6 py-4">
        <h1 className="text-2xl font-bold text-stone-900">Your Chapter Plan</h1>
        <p className="text-sm text-stone-500">
          Here&apos;s the structure we&apos;ve proposed for your story. Reorder, rename, or
          add chapters to make it yours.
        </p>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="space-y-3">
          {chapters.map((chapter, index) => (
            <div
              key={chapter.id}
              className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm border border-stone-100"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                {index + 1}
              </span>

              {editingId === chapter.id ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleRename(chapter.id)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename(chapter.id)}
                  className="flex-1 rounded-lg border border-stone-300 px-3 py-1 text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              ) : (
                <button
                  onClick={() => {
                    setEditingId(chapter.id);
                    setEditTitle(chapter.title);
                  }}
                  className="flex-1 text-left font-medium text-stone-800 hover:text-amber-700"
                >
                  {chapter.title}
                </button>
              )}

              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="rounded p-1 text-stone-400 hover:text-stone-600 disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === chapters.length - 1}
                  className="rounded p-1 text-stone-400 hover:text-stone-600 disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  onClick={() => handleDelete(chapter.id)}
                  className="rounded p-1 text-stone-400 hover:text-red-500"
                  aria-label="Delete chapter"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add a new chapter..."
            className="flex-1 rounded-xl border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim()}
            className="rounded-xl bg-amber-600 px-6 py-3 font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-xl bg-stone-900 px-8 py-4 text-lg font-medium text-white hover:bg-stone-800 transition-colors"
          >
            Looks good &mdash; let&apos;s start writing
          </button>
        </div>
      </div>
    </main>
  );
}
