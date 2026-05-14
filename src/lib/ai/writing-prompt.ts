import type { Profile, UserSettings } from "@/lib/types";

type WritingContext = {
  profile: Profile;
  chapterTitle: string;
  chapterDescription?: string;
  conversationTranscript: string;
  existingContent?: string;
};

function getSettings(profile: Profile): UserSettings {
  const defaults: UserSettings = {
    tone: "auto",
    structure_type: "chronological",
    point_of_view: "first_person",
    chapter_length: "medium",
    topics_to_avoid: "",
  };
  return { ...defaults, ...(profile.settings || {}) };
}

const lengthWords: Record<string, number> = {
  short: 1000,
  medium: 2500,
  long: 4000,
};

export function buildWritingPrompt(ctx: WritingContext): string {
  const { profile, chapterTitle, chapterDescription, conversationTranscript, existingContent } = ctx;
  const settings = getSettings(profile);

  const targetWords = lengthWords[settings.chapter_length] || 2500;
  const pov = settings.point_of_view === "third_person" ? "third person" : "first person";
  const tone = settings.tone === "auto"
    ? (profile.tone_preference || "warm and reflective")
    : settings.tone;

  let prompt = `You are a skilled memoir ghostwriter. Your job is to transform interview transcripts into polished, readable autobiography prose.

SUBJECT: ${profile.name}
AUDIENCE: ${profile.audience || "their family"}
TONE: ${tone}
CHAPTER: ${chapterTitle}${chapterDescription ? ` — ${chapterDescription}` : ""}

WRITING PRINCIPLES:
- Write in ${pov}, past tense
- Preserve the subject's voice — if they use colloquialisms, keep them
- Expand on sensory and emotional details they provided
- Never invent facts — only work with what was said in the interview
- Structure the chapter with a natural narrative arc (beginning, middle, reflection)
- Match the tone established above
- Use scene-setting and vivid detail to bring stories to life
- Weave multiple stories/topics from the conversation into a cohesive chapter
- Include dialogue where the subject quoted people directly

TARGET LENGTH: approximately ${targetWords.toLocaleString()} words per chapter.
Write to approximately this length. If the conversation material for this chapter is thin, write what you have rather than padding. If it's rich, you can go slightly over.

CONVERSATION TRANSCRIPT:
${conversationTranscript}
`;

  if (existingContent) {
    prompt += `\nEXISTING CHAPTER CONTENT (merge new material into this):
${existingContent}

Integrate any new stories or details from the transcript into the existing chapter. Maintain narrative flow and avoid repetition.`;
  } else {
    prompt += `\nWrite the complete chapter based on this conversation. Open with a compelling scene or moment, then weave the stories together naturally.`;
  }

  return prompt;
}
