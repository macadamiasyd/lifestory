import type { Profile, UserSettings, BiographyMeta, SourceMaterial } from "@/lib/types";

type WritingContext = {
  profile: Profile;
  chapterTitle: string;
  chapterDescription?: string;
  conversationTranscript: string;
  existingContent?: string;
  bookType?: "autobiography" | "biography";
  biographyMeta?: BiographyMeta | null;
  sourceMaterials?: SourceMaterial[];
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
  if (ctx.bookType === "biography") {
    return buildBiographyWritingPrompt(ctx);
  }
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

function buildBiographyWritingPrompt(ctx: WritingContext): string {
  const { profile, chapterTitle, chapterDescription, conversationTranscript, existingContent, biographyMeta, sourceMaterials } = ctx;
  const settings = getSettings(profile);

  const targetWords = lengthWords[settings.chapter_length] || 2500;
  const subjectName = biographyMeta?.subject_name || "the subject";
  const biographerName = profile.name;
  const relationship = biographyMeta?.subject_relationship || "biographer";
  const tone = settings.tone === "auto"
    ? (profile.tone_preference || "warm and reflective")
    : settings.tone;

  let prompt = `You are a skilled biography ghostwriter. Your job is to transform interview transcripts into polished, readable biography prose.

SUBJECT: ${subjectName}
BIOGRAPHER: ${biographerName} (${relationship})
AUDIENCE: ${profile.audience || "general readers"}
TONE: ${tone}
CHAPTER: ${chapterTitle}${chapterDescription ? ` — ${chapterDescription}` : ""}

BIOGRAPHY WRITING RULES:
- Third person throughout. The subject is referred to by name or "he/she/they", never "I"
- The biographer's voice appears as attributed quotes and observations:
  "According to ${biographerName}, the recording sessions were chaotic."
  "${biographerName} recalls arriving at the studio to find..."
- Direct quotes from ${subjectName} (as recalled by the biographer) are presented in quotation marks with context
- Source material quotes are attributed to their source title
- Clearly distinguish between firsthand accounts and secondhand information
- The narrative voice is authoritative but warm — this is a biography, not a Wikipedia article
- Preserve the tone established above

ATTRIBUTION HIERARCHY:
1. Direct quotes from ${subjectName} (most powerful — use sparingly for impact)
2. Biographer's firsthand account ("I was there when...")
3. Biographer's secondhand account ("I was told that...")
4. Source material references (press clippings, articles, etc.)

CHAPTER STRUCTURE:
- Open chapters with scene-setting, not attribution
- GOOD: "The studio on West 54th Street smelled of cigarettes and yesterday's takeaway."
- BAD: "According to the band's manager, the studio smelled of cigarettes."
- Weave between the biographer's account and source material naturally

TARGET LENGTH: approximately ${targetWords.toLocaleString()} words per chapter.

CONVERSATION TRANSCRIPT:
${conversationTranscript}
`;

  if (sourceMaterials && sourceMaterials.length > 0) {
    prompt += `\nSOURCE MATERIALS:\n`;
    for (const sm of sourceMaterials) {
      prompt += `\n--- ${sm.title} (${sm.source_type}) ---\n${sm.content}\n`;
    }
    prompt += `\nUse these source materials to enrich the narrative. Attribute quotes from them to their source title.\n`;
  }

  if (existingContent) {
    prompt += `\nEXISTING CHAPTER CONTENT (merge new material into this):
${existingContent}

Integrate any new stories or details from the transcript into the existing chapter. Maintain narrative flow and avoid repetition.`;
  } else {
    prompt += `\nWrite the complete chapter based on the conversation and source materials. Open with a compelling scene or moment, then weave the stories together naturally.`;
  }

  return prompt;
}
