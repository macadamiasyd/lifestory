import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Chapter } from "@/lib/types";

export default async function PreviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!book) redirect("/dashboard");

  const { data: chapters } = await supabase
    .from("chapters")
    .select("*")
    .eq("book_id", book.id)
    .order("sort_order");

  const typedChapters = (chapters || []) as Chapter[];
  const chaptersWithContent = typedChapters.filter((c) => c.content);

  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-stone-900">Book Preview</h1>
        <Link
          href="/dashboard"
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
        >
          Back to dashboard
        </Link>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Title page */}
        <div className="mb-16 text-center">
          <h1 className="text-5xl font-bold text-stone-900 font-serif">
            {book.title}
          </h1>
        </div>

        {/* Table of contents */}
        {chaptersWithContent.length > 0 && (
          <div className="mb-16">
            <h2 className="mb-6 text-2xl font-bold text-stone-900 font-serif">
              Contents
            </h2>
            <div className="space-y-2">
              {typedChapters.map((chapter, index) => (
                <div key={chapter.id} className="flex items-baseline gap-3">
                  <span className="text-stone-400">{index + 1}.</span>
                  {chapter.content ? (
                    <a
                      href={`#chapter-${chapter.id}`}
                      className="text-lg text-amber-700 hover:text-amber-800 font-serif"
                    >
                      {chapter.title}
                    </a>
                  ) : (
                    <span className="text-lg text-stone-400 font-serif italic">
                      {chapter.title} (not yet written)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chapters */}
        {chaptersWithContent.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-stone-300 p-12 text-center">
            <p className="text-lg text-stone-600">
              No chapters have been written yet.
            </p>
            <p className="mt-2 text-stone-500">
              Start conversations and generate chapters to see your book take
              shape.
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {typedChapters.map(
              (chapter, index) =>
                chapter.content && (
                  <article key={chapter.id} id={`chapter-${chapter.id}`}>
                    <h2 className="mb-2 text-sm font-medium uppercase tracking-widest text-stone-400">
                      Chapter {index + 1}
                    </h2>
                    <h3 className="mb-8 text-3xl font-bold text-stone-900 font-serif">
                      {chapter.title}
                    </h3>
                    <div className="prose prose-lg prose-stone max-w-none font-serif">
                      {chapter.content.split("\n\n").map((paragraph, pi) => (
                        <p key={pi}>{paragraph}</p>
                      ))}
                    </div>
                  </article>
                )
            )}
          </div>
        )}
      </div>
    </main>
  );
}
