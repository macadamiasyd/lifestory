export type UserSettings = {
  tone: "auto" | "warm and reflective" | "casual and humorous" | "dignified and formal";
  structure_type: "chronological" | "thematic" | "milestone";
  point_of_view: "first_person" | "third_person";
  chapter_length: "short" | "medium" | "long";
  topics_to_avoid: string;
};

export const DEFAULT_SETTINGS: UserSettings = {
  tone: "auto",
  structure_type: "chronological",
  point_of_view: "first_person",
  chapter_length: "medium",
  topics_to_avoid: "",
};

export const CHAPTER_LENGTH_WORDS: Record<UserSettings["chapter_length"], number> = {
  short: 1000,
  medium: 2500,
  long: 4000,
};

export type Profile = {
  id: string;
  name: string;
  age: number | null;
  location: string | null;
  tone_preference: string;
  audience: string | null;
  topics_to_cover: string | null;
  topics_to_avoid: string | null;
  intake_complete: boolean;
  intake_data: Record<string, unknown>;
  settings: UserSettings;
  created_at: string;
  updated_at: string;
};

export type Book = {
  id: string;
  user_id: string;
  title: string;
  chapter_order: string[];
  status: "in_progress" | "complete";
  book_type: "autobiography" | "biography";
  biography_meta: BiographyMeta | null;
  created_at: string;
  updated_at: string;
};

export type Chapter = {
  id: string;
  book_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  status: "not_started" | "in_progress" | "draft" | "review" | "final";
  content: string;
  created_at: string;
  updated_at: string;
};

export type Session = {
  id: string;
  user_id: string;
  chapter_id: string | null;
  session_type: "intake" | "chapter";
  started_at: string;
  ended_at: string | null;
  status: "active" | "completed";
  summary: string | null;
};

export type Message = {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type ChapterNote = {
  id: string;
  chapter_id: string;
  session_id: string | null;
  key_themes: string[];
  key_people: string[];
  key_events: string[];
  summary: string | null;
  created_at: string;
};

export type BiographyMeta = {
  subject_name: string;
  subject_relationship: string;
  subject_status: "living" | "deceased" | "unknown";
  subject_era: string;
  biographer_role: string;
};

export type SourceMaterial = {
  id: string;
  book_id: string;
  title: string;
  content: string;
  source_type: "interview" | "article" | "notes" | "correspondence" | "general";
  created_at: string;
  updated_at: string;
};

export type Quote = {
  speaker: "subject" | "biographer" | "source";
  text: string;
  context: string;
  source_session_id?: string;
  source_material_id?: string;
  source_title?: string;
  firsthand?: boolean;
};
