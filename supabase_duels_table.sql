-- Create the duels table for quiz duel challenges
CREATE TABLE duels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en',
  challenger_name TEXT NOT NULL,
  question_ids BIGINT[] NOT NULL,
  challenger_score INTEGER NOT NULL,
  challenger_correct INTEGER NOT NULL,
  challenger_total INTEGER NOT NULL,
  challenger_best_streak INTEGER NOT NULL DEFAULT 0,
  challenger_answers JSONB NOT NULL DEFAULT '[]',
  opponent_name TEXT,
  opponent_score INTEGER,
  opponent_correct INTEGER,
  opponent_total INTEGER,
  opponent_best_streak INTEGER,
  opponent_answers JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read duels (needed to load challenge link)
CREATE POLICY "Anyone can read duels"
  ON duels FOR SELECT
  USING (true);

-- Allow anyone to create duels
CREATE POLICY "Anyone can create duels"
  ON duels FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update duels (for opponent completing)
CREATE POLICY "Anyone can update duels"
  ON duels FOR UPDATE
  USING (true);

-- Index for looking up duels by id (already primary key)
-- Index for checking if a duel is completed
CREATE INDEX idx_duels_completed_at ON duels (completed_at) WHERE completed_at IS NULL;
