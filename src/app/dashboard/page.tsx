import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/signout/actions";
import type { Chapter } from "@/lib/types";

const statusLabels: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  draft: "Draft ready",
  review: "In review",
  final: "Complete",
};

const statusColors: Record<string, string> = {
  not_started: "bg-stone-100 text-stone-500",
  in_progress: "bg-amber-100 text-amber-700",
  draft: "bg-blue-100 text-blue-700",
  review: "bg-purple-100 text-purple-700",
  final: "bg-green-100 text-green-700",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, intake_complete")
    .eq("id", user.id)
    .single();

  if (!profile?.intake_complete) redirect("/onboarding");

  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!book) redirect("/onboarding");

  const { data: chapters } = await supabase
    .from("chapters")
    .select("*")
    .eq("book_id", book.id)
    .order("sort_order");

  const typedChapters = (chapters || []) as Chapter[];
  const completedCount = typedChapters.filter(
    (c) => c.status === "draft" || c.status === "review" || c.status === "final"
  ).length;

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-6 py-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-stone-900">{book.title}</h1>
          <p className="mt-1 text-stone-500">
            {completedCount} of {typedChapters.length} chapters have drafts
          </p>
          <form action={signOut} className="mt-2">
            <button
              type="submit"
              className="text-sm text-stone-400 hover:text-stone-600"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-3">
          {typedChapters.map((chapter, index) => (
            <div
              key={chapter.id}
              className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm border border-stone-100"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                {index + 1}
              </span>

              <div className="flex-1">
                <h2 className="font-semibold text-stone-900">{chapter.title}</h2>
                {chapter.description && (
                  <p className="text-sm text-stone-500">{chapter.description}</p>
                )}
              </div>

              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusColors[chapter.status]}`}
              >
                {statusLabels[chapter.status]}
              </span>

              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/chat/${chapter.id}`}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
                >
                  {chapter.status === "not_started" ? "Start" : "Continue"}
                </Link>
                {(chapter.status === "draft" ||
                  chapter.status === "review" ||
                  chapter.status === "final") && (
                  <Link
                    href={`/editor/${chapter.id}`}
                    className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    Read
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-between">
          <Link
            href="/chapters"
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            Edit chapter plan
          </Link>
          <Link
            href="/preview"
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Preview full book
          </Link>
        </div>
      </div>
    </main>
  );
}
