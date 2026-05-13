-- LifeStory Phase 1 Schema

-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  age integer,
  location text,
  tone_preference text default 'warm and reflective',
  audience text,
  topics_to_cover text,
  topics_to_avoid text,
  intake_complete boolean default false,
  intake_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Books table
create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'My Life Story',
  chapter_order jsonb default '[]'::jsonb,
  status text default 'in_progress' check (status in ('in_progress', 'complete')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Chapters table
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  status text default 'not_started' check (status in ('not_started', 'in_progress', 'draft', 'review', 'final')),
  content text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sessions table
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete set null,
  session_type text not null default 'chapter' check (session_type in ('intake', 'chapter')),
  started_at timestamptz default now(),
  ended_at timestamptz,
  status text default 'active' check (status in ('active', 'completed')),
  summary text
);

-- Messages table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- Chapter notes (AI-generated metadata from conversations)
create table public.chapter_notes (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  key_themes jsonb default '[]'::jsonb,
  key_people jsonb default '[]'::jsonb,
  key_events jsonb default '[]'::jsonb,
  summary text,
  created_at timestamptz default now()
);

-- Indexes
create index idx_books_user_id on public.books(user_id);
create index idx_chapters_book_id on public.chapters(book_id);
create index idx_sessions_user_id on public.sessions(user_id);
create index idx_sessions_chapter_id on public.sessions(chapter_id);
create index idx_messages_session_id on public.messages(session_id);
create index idx_chapter_notes_chapter_id on public.chapter_notes(chapter_id);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.chapters enable row level security;
alter table public.sessions enable row level security;
alter table public.messages enable row level security;
alter table public.chapter_notes enable row level security;

-- Profiles: users can only read/write their own
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Books: users can only access their own
create policy "Users can view own books" on public.books for select using (auth.uid() = user_id);
create policy "Users can insert own books" on public.books for insert with check (auth.uid() = user_id);
create policy "Users can update own books" on public.books for update using (auth.uid() = user_id);

-- Chapters: users can access chapters belonging to their books
create policy "Users can view own chapters" on public.chapters for select
  using (exists (select 1 from public.books where books.id = chapters.book_id and books.user_id = auth.uid()));
create policy "Users can insert own chapters" on public.chapters for insert
  with check (exists (select 1 from public.books where books.id = chapters.book_id and books.user_id = auth.uid()));
create policy "Users can update own chapters" on public.chapters for update
  using (exists (select 1 from public.books where books.id = chapters.book_id and books.user_id = auth.uid()));
create policy "Users can delete own chapters" on public.chapters for delete
  using (exists (select 1 from public.books where books.id = chapters.book_id and books.user_id = auth.uid()));

-- Sessions: users can only access their own
create policy "Users can view own sessions" on public.sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on public.sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on public.sessions for update using (auth.uid() = user_id);

-- Messages: users can access messages from their sessions
create policy "Users can view own messages" on public.messages for select
  using (exists (select 1 from public.sessions where sessions.id = messages.session_id and sessions.user_id = auth.uid()));
create policy "Users can insert own messages" on public.messages for insert
  with check (exists (select 1 from public.sessions where sessions.id = messages.session_id and sessions.user_id = auth.uid()));

-- Chapter notes: users can access notes for their chapters
create policy "Users can view own chapter notes" on public.chapter_notes for select
  using (exists (
    select 1 from public.chapters
    join public.books on books.id = chapters.book_id
    where chapters.id = chapter_notes.chapter_id and books.user_id = auth.uid()
  ));
create policy "Users can insert own chapter notes" on public.chapter_notes for insert
  with check (exists (
    select 1 from public.chapters
    join public.books on books.id = chapters.book_id
    where chapters.id = chapter_notes.chapter_id and books.user_id = auth.uid()
  ));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'New User'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger books_updated_at before update on public.books
  for each row execute function public.handle_updated_at();
create trigger chapters_updated_at before update on public.chapters
  for each row execute function public.handle_updated_at();
