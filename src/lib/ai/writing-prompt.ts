import type { Profile } from "@/lib/types";

type WritingContext = {
  profile: Profile;
  chapterTitle: string;
  chapterDescription?: string;
  conversationTranscript: string;
  existingContent?: string;
};

export function buildWritingPrompt(ctx: WritingContext): string {
  const { profile, chapterTitle, chapterDescription, conversationTranscript, existingContent } = ctx;

  let prompt = `You are a skilled memoir ghostwriter. Your job is to transform interview transcripts into polished, readable autobiography prose.

SUBJECT: ${profile.name}
AUDIENCE: ${profile.audience || "their family"}
TONE: ${profile.tone_preference || "warm and reflective"}
CHAPTER: ${chapterTitle}${chapterDescription ? ` — ${chapterDescription}` : ""}

WRITING PRINCIPLES:
- Write in first person, past tense
- Preserve the subject's voice — if they use colloquialisms, keep them
- Expand on sensory and emotional details they provided
- Never invent facts — only work with what was said in the interview
- Structure the chapter with a natural narrative arc (beginning, middle, reflection)
- Match the tone established above
- Target 1,500-3,000 words
- Use scene-setting and vivid detail to bring stories to life
- Weave multiple stories/topics from the conversation into a cohesive chapter
- Include dialogue where the subject quoted people directly

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
