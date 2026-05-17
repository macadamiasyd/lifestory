"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getSourceMaterials,
  addSourceMaterial,
  updateSourceMaterial,
  deleteSourceMaterial,
} from "./actions";

type Material = {
  id: string;
  title: string;
  content: string;
  source_type: string;
  created_at: string;
};

export default function SourcesPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sourceType, setSourceType] = useState("general");
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadMaterials();
  }, []);

  async function loadMaterials() {
    try {
      const data = await getSourceMaterials();
      if (!data.bookId) {
        router.push("/dashboard");
        return;
      }
      setMaterials(data.materials);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    setEditingId(null);
    setTitle("");
    setContent("");
    setSourceType("general");
    setShowForm(true);
  }

  function handleEdit(m: Material) {
    setEditingId(m.id);
    setTitle(m.title);
    setContent(m.content);
    setSourceType(m.source_type);
    setShowForm(true);
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateSourceMaterial(editingId, title, content, sourceType);
      } else {
        await addSourceMaterial(title, content, sourceType);
      }
      setShowForm(false);
      await loadMaterials();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this source material?")) return;
    try {
      await deleteSourceMaterial(id);
      await loadMaterials();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50">
        <p className="text-stone-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-6 py-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Source Material</h1>
            <p className="mt-1 text-sm text-stone-500">
              Paste articles, interviews, notes, or letters. The AI uses these to ask better questions and enrich the writing.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Back to dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {showForm ? (
          <div className="rounded-xl bg-white p-6 shadow-sm border border-stone-100">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">
              {editingId ? "Edit source material" : "Add source material"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Title / Label
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder='e.g. "NME interview, March 1987"'
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Type
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="general">General</option>
                  <option value="interview">Interview</option>
                  <option value="article">Article</option>
                  <option value="notes">Notes</option>
                  <option value="correspondence">Correspondence</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste the text here..."
                  rows={12}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-y font-mono text-sm"
                />
                {content && (
                  <p className="mt-1 text-xs text-stone-400">
                    {content.length.toLocaleString()} characters
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || !title.trim() || !content.trim()}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update" : "Save"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={handleAdd}
              className="mb-6 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
            >
              + Add source material
            </button>

            {materials.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-stone-300 p-12 text-center">
                <p className="text-lg text-stone-600">No source material yet</p>
                <p className="mt-2 text-stone-500">
                  Paste in articles, interviews, notes, or letters to give the AI more context.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {materials.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl bg-white p-5 shadow-sm border border-stone-100"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-stone-900">{m.title}</h3>
                        <p className="text-sm text-stone-500">
                          {m.source_type} &middot; {m.content.length.toLocaleString()} chars &middot; added{" "}
                          {new Date(m.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() =>
                            setExpandedId(expandedId === m.id ? null : m.id)
                          }
                          className="text-sm text-stone-500 hover:text-stone-700"
                        >
                          {expandedId === m.id ? "Collapse" : "View"}
                        </button>
                        <button
                          onClick={() => handleEdit(m)}
                          className="text-sm text-amber-600 hover:text-amber-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="text-sm text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {expandedId === m.id && (
                      <pre className="mt-3 whitespace-pre-wrap text-sm text-stone-700 bg-stone-50 rounded-lg p-4 max-h-96 overflow-y-auto font-sans">
                        {m.content}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
