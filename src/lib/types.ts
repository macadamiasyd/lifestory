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
  created_at: string;
  updated_at: string;
};

export type Book = {
  id: string;
  user_id: string;
  title: string;
  chapter_order: string[];
  status: "in_progress" | "complete";
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
