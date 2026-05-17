-- Add book_type and biography_meta to books
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS book_type TEXT DEFAULT 'autobiography'
    CHECK (book_type IN ('autobiography', 'biography'));

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS biography_meta JSONB DEFAULT NULL;

-- Create source_materials table
CREATE TABLE IF NOT EXISTS public.source_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT DEFAULT 'general'
    CHECK (source_type IN ('interview', 'article', 'notes', 'correspondence', 'general')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_materials_book_id ON public.source_materials(book_id);

-- RLS for source_materials
ALTER TABLE public.source_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own source materials"
  ON public.source_materials
  FOR ALL
  USING (
    book_id IN (SELECT id FROM public.books WHERE user_id = auth.uid())
  )
  WITH CHECK (
    book_id IN (SELECT id FROM public.books WHERE user_id = auth.uid())
  );
