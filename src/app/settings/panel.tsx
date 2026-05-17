"use client";

import { useState, useEffect } from "react";
import { getSettings, saveSettings, regenerateAllDrafts } from "./actions";
import type { UserSettings } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SettingsPanel({ open, onClose }: Props) {
  const [settings, setSettings] = useState<UserSettings>({
    tone: "auto",
    structure_type: "chronological",
    point_of_view: "first_person",
    chapter_length: "medium",
    topics_to_avoid: "",
  });
  const [bookTitle, setBookTitle] = useState("");
  const [audience, setAudience] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draftCount, setDraftCount] = useState(0);
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateResult, setRegenerateResult] = useState<string | null>(null);
  const [bookType, setBookType] = useState<"autobiography" | "biography">("autobiography");
  const [subjectName, setSubjectName] = useState("");
  const [subjectRelationship, setSubjectRelationship] = useState("");

  useEffect(() => {
    if (open) loadSettings();
  }, [open]);

  async function loadSettings() {
    setLoading(true);
    setShowRegenerate(false);
    setRegenerateResult(null);
    try {
      const data = await getSettings();
      setSettings(data.settings);
      setBookTitle(data.bookTitle);
      setAudience(data.audience);
      setBookType(data.bookType);
      setSubjectName(data.biographyMeta?.subject_name || "");
      setSubjectRelationship(data.biographyMeta?.subject_relationship || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const bioMeta = bookType === "biography"
        ? { subject_name: subjectName, subject_relationship: subjectRelationship }
        : null;
      const result = await saveSettings(settings, bookTitle, audience, bioMeta);
      if (result.draftCount > 0) {
        setDraftCount(result.draftCount);
        setShowRegenerate(true);
      } else {
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    setRegenerateResult(null);
    try {
      const result = await regenerateAllDrafts();
      setRegenerateResult(
        `Regenerated ${result.regenerated} chapter${result.regenerated !== 1 ? "s" : ""}`
      );
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error(err);
      setRegenerateResult("Something went wrong");
    } finally {
      setRegenerating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-stone-900">Settings</h2>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 text-2xl leading-none"
            >
              &times;
            </button>
          </div>

          <p className="mb-8 text-sm text-stone-500 bg-stone-50 rounded-lg p-3">
            These settings are completely optional. The AI will figure most of
            this out from your conversations. But if you want to fine-tune
            things, here&apos;s where you can.
          </p>

          {loading ? (
            <p className="text-stone-500">Loading...</p>
          ) : (
            <div className="space-y-6">
              {/* Book title */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Book title
                </label>
                <input
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Audience */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Who is this book for?
                </label>
                <input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. my grandchildren"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Biography-specific fields */}
              {bookType === "biography" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Subject name
                    </label>
                    <input
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      placeholder="Who is this biography about?"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Your relationship to the subject
                    </label>
                    <input
                      value={subjectRelationship}
                      onChange={(e) => setSubjectRelationship(e.target.value)}
                      placeholder="e.g. band manager, daughter, researcher"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </>
              )}

              {/* Tone */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Tone
                </label>
                <select
                  value={settings.tone}
                  onChange={(e) =>
                    setSettings({ ...settings, tone: e.target.value as UserSettings["tone"] })
                  }
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="auto">Let the AI decide</option>
                  <option value="warm and reflective">Warm &amp; reflective</option>
                  <option value="casual and humorous">Casual &amp; humorous</option>
                  <option value="dignified and formal">Dignified &amp; formal</option>
                </select>
              </div>

              {/* Chapter structure */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Chapter structure
                </label>
                <div className="space-y-2">
                  {[
                    { value: "chronological", label: "Chronological", desc: "Life story in order" },
                    { value: "thematic", label: "Theme-based", desc: "Organised by themes" },
                    { value: "milestone", label: "Milestone-based", desc: "Key life events" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-start gap-3 rounded-lg border border-stone-200 p-3 cursor-pointer hover:bg-stone-50"
                    >
                      <input
                        type="radio"
                        name="structure"
                        value={opt.value}
                        checked={settings.structure_type === opt.value}
                        onChange={() =>
                          setSettings({
                            ...settings,
                            structure_type: opt.value as UserSettings["structure_type"],
                          })
                        }
                        className="mt-0.5 accent-amber-600"
                      />
                      <div>
                        <span className="font-medium text-stone-800">{opt.label}</span>
                        <span className="block text-sm text-stone-500">{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Point of view */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Point of view
                </label>
                <div className="flex gap-3">
                  {[
                    { value: "first_person", label: "First person (\"I was...\")" },
                    { value: "third_person", label: "Third person (\"She was...\")" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 cursor-pointer hover:bg-stone-50"
                    >
                      <input
                        type="radio"
                        name="pov"
                        value={opt.value}
                        checked={settings.point_of_view === opt.value}
                        onChange={() =>
                          setSettings({
                            ...settings,
                            point_of_view: opt.value as UserSettings["point_of_view"],
                          })
                        }
                        className="accent-amber-600"
                      />
                      <span className="text-sm text-stone-800">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Chapter length */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Chapter length
                </label>
                <select
                  value={settings.chapter_length}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      chapter_length: e.target.value as UserSettings["chapter_length"],
                    })
                  }
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="short">Short (~1,000 words)</option>
                  <option value="medium">Medium (~2,500 words)</option>
                  <option value="long">Long (~4,000 words)</option>
                </select>
              </div>

              {/* Topics to avoid */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Topics to avoid
                </label>
                <textarea
                  value={settings.topics_to_avoid}
                  onChange={(e) =>
                    setSettings({ ...settings, topics_to_avoid: e.target.value })
                  }
                  placeholder="The AI will steer away from these subjects..."
                  rows={3}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                />
              </div>

              {/* Save */}
              {showRegenerate ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <p className="text-sm text-stone-700">
                    Settings saved. You have {draftCount} existing chapter draft{draftCount !== 1 ? "s" : ""}.
                    Would you like to regenerate {draftCount !== 1 ? "them" : "it"} with your new settings?
                  </p>
                  {regenerateResult ? (
                    <p className="text-sm font-medium text-amber-700">{regenerateResult}</p>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
                      >
                        {regenerating ? "Regenerating..." : "Regenerate drafts"}
                      </button>
                      <button
                        onClick={onClose}
                        disabled={regenerating}
                        className="flex-1 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
                      >
                        Skip
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full rounded-lg bg-amber-600 px-4 py-3 font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save settings"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
