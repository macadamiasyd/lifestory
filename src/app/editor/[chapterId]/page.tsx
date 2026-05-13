"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  getChapterForEditing,
  generateChapter,
  saveChapterContent,
} from "../actions";
import type { Chapter } from "@/lib/types";

export default function EditorPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = use(params);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [content, setContent] = useState("");
  const [hasConversations, setHasConversations] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadChapter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  async function loadChapter() {
    try {
      const data = await getChapterForEditing(chapterId);
      setChapter(data.chapter as Chapter);
      setContent(data.chapter.content || "");
      setHasConversations(data.hasConversations);
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const newContent = await generateChapter(chapterId);
      setContent(newContent);
      setSaved(true);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to generate chapter");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveChapterContent(chapterId, content);
      setSaved(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function handleContentChange(newContent: string) {
    setContent(newContent);
    setSaved(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50">
        <p className="text-stone-500">Loading chapter...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">
            {chapter?.title}
          </h1>
          <p className="text-sm text-stone-500">
            {content
              ? `${content.split(/\s+/).length.toLocaleString()} words`
              : "No content yet"}
            {!saved && " — unsaved changes"}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating || !hasConversations}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {generating
              ? "Generating..."
              : content
                ? "Regenerate chapter"
                : "Generate chapter"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved" : "Save"}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Back
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {!content && !generating ? (
          <div className="rounded-2xl border-2 border-dashed border-stone-300 p-12 text-center">
            {hasConversations ? (
              <>
                <p className="text-lg text-stone-600">
                  You&apos;ve had conversations about this chapter.
                </p>
                <p className="mt-2 text-stone-500">
                  Click &quot;Generate chapter&quot; to turn your conversations into prose.
                </p>
              </>
            ) : (
              <>
                <p className="text-lg text-stone-600">
                  No conversations yet for this chapter.
                </p>
                <button
                  onClick={() => router.push(`/chat/${chapterId}`)}
                  className="mt-4 rounded-lg bg-amber-600 px-6 py-3 font-medium text-white hover:bg-amber-700 transition-colors"
                >
                  Start a conversation
                </button>
              </>
            )}
          </div>
        ) : generating ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-stone-100">
            <p className="text-lg text-stone-600">
              Writing your chapter...
            </p>
            <p className="mt-2 text-sm text-stone-400">
              This may take a minute
            </p>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="min-h-[600px] w-full rounded-2xl bg-white p-8 text-lg leading-relaxed text-stone-800 shadow-sm border border-stone-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-serif"
          />
        )}
      </div>
    </main>
  );
}
