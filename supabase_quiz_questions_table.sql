-- Separate table for LLM-generated easy quiz questions.
-- Source facts stay untouched in the `facts` table.
-- The regenerate script truncates + re-inserts on each run.

CREATE TABLE quiz_questions (
  id BIGSERIAL PRIMARY KEY,
  fact_id BIGINT NOT NULL REFERENCES facts(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  category TEXT,
  title TEXT,
  fact_text TEXT,
  image_url TEXT,
  year INT,
  juiciness NUMERIC,
  difficulty SMALLINT NOT NULL DEFAULT 1,
  question TEXT NOT NULL,
  answer_a TEXT NOT NULL,
  answer_b TEXT NOT NULL,
  answer_c TEXT NOT NULL,
  answer_d TEXT NOT NULL,
  correct_answer SMALLINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read quiz questions
CREATE POLICY "Anyone can read quiz_questions"
  ON quiz_questions FOR SELECT
  USING (true);

-- Service role can insert/delete (used by regenerate script)
CREATE POLICY "Service role can manage quiz_questions"
  ON quiz_questions FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes for the common queries
CREATE INDEX idx_quiz_questions_city ON quiz_questions (city);
CREATE INDEX idx_quiz_questions_fact_id ON quiz_questions (fact_id);
