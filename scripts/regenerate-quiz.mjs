/**
 * Regenerate quiz questions using an LLM to make them easier.
 *
 * Usage:
 *   node scripts/regenerate-quiz.mjs                        # dry-run, 5 rows, Claude
 *   node scripts/regenerate-quiz.mjs --provider groq        # use Groq (fast & free)
 *   node scripts/regenerate-quiz.mjs --limit 50             # dry-run, 50 rows
 *   node scripts/regenerate-quiz.mjs --apply                # generate + write to DB
 *   node scripts/regenerate-quiz.mjs --upload               # upload preview-questions.json to DB
 *   node scripts/regenerate-quiz.mjs --apply --limit 100 --provider groq
 *
 * Env vars (reads from .env):
 *   ANTHROPIC_API_KEY          (for --provider anthropic, default)
 *   GROQ_API_KEY               (for --provider groq)
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_KEY       (optional, preferred for writes)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { writeFileSync, readFileSync } from 'fs';

config(); // load .env

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const UPLOAD = args.includes('--upload');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : (APPLY ? 99999 : 5);
const providerIdx = args.indexOf('--provider');
const PROVIDER = providerIdx !== -1 ? args[providerIdx + 1] : 'anthropic';
const BATCH_SIZE = 10;
const CONCURRENCY = PROVIDER === 'groq' ? 2 : 3; // groq has tighter rate limits

const mode = UPLOAD ? 'UPLOAD (from preview-questions.json)' : APPLY ? 'APPLY (will write to DB)' : 'DRY-RUN (preview only)';
console.log(`Mode: ${mode}`);
if (!UPLOAD) console.log(`Provider: ${PROVIDER}, Limit: ${LIMIT}, Batch size: ${BATCH_SIZE}, Concurrency: ${CONCURRENCY}`);
console.log();

// ── Fetch facts ──────────────────────────────────────────────────────
async function fetchFacts() {
  let allFacts = [];
  let from = 0;
  const pageSize = 500; // smaller pages to avoid statement timeout

  while (from < LIMIT) {
    const fetchSize = Math.min(pageSize, LIMIT - from);
    const { data, error } = await supabase
      .from('facts')
      .select('id, city, country, fact_text, category, year, title, juiciness, image_url')
      .not('fact_text', 'is', null)
      .range(from, from + fetchSize - 1)
      .order('id', { ascending: true });

    if (error) throw error;
    if (!data.length) break;
    allFacts = allFacts.concat(data);
    from += data.length;
    if (data.length < fetchSize) break;
  }

  console.log(`Fetched ${allFacts.length} facts\n`);
  return allFacts;
}

// ── Fetch facts by IDs (for --upload mode, avoids full table scan) ───
async function fetchFactsByIds(ids) {
  const allFacts = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const { data, error } = await supabase
      .from('facts')
      .select('id, city, country, fact_text, category, year, title, juiciness, image_url')
      .in('id', chunk);
    if (error) throw error;
    allFacts.push(...data);
    if ((i + 50) % 500 === 0) process.stdout.write(`  Fetched ${allFacts.length}/${ids.length} facts\n`);
  }
  console.log(`Fetched ${allFacts.length} facts by ID\n`);
  return allFacts;
}

// ── Generate easy questions via Claude ───────────────────────────────
const SYSTEM_PROMPT = `You generate FUN and EXTREMELY EASY multiple-choice quiz questions about Swiss cities, aimed at casual players who may know very little about Switzerland. Think "tourist trivia" — questions so easy that someone who visited once or watched a travel video could answer them.

You receive a batch of facts about ONE city. Read ALL the facts to build context. SKIP any fact that is too obscure to make a truly easy question — it is MUCH BETTER to skip a fact than to produce a hard question.

WHAT MAKES A QUESTION EASY ENOUGH:
- A 15-year-old who has never been to Switzerland could guess the answer
- The question is about something visible, tangible, or widely known (a lake, a mountain, a sport, chocolate, cheese, a famous building)
- The wrong answers are from a completely different category so the right answer "feels" obvious

SKIP these types of facts (output nothing for them):
- Obscure historical figures nobody outside Switzerland has heard of
- Niche academic, scientific, or literary achievements
- Internal political events, reforms, or administrative details
- Anything where you'd need specialized knowledge to even understand the question

GOOD question patterns:
1. LANDMARKS → "What is the [X] in [City]?" → correct description + 3 silly wrong ones
2. FOOD/CULTURE → "Which city is famous for [well-known thing]?"
3. GEOGRAPHY → "What lake/mountain/river is near [City]?"
4. WORLD-FAMOUS PEOPLE (Einstein, Federer, Chaplin, etc.) → simple questions
5. GENERAL VIBES → "What is [City] best known for?" → Tourism | Banking | Chocolate | Skiing

BAD question patterns (NEVER use):
- "What did [obscure person] do?" — nobody knows who they are
- "What type of product did [unknown inventor] create?" — too specific
- "What year / how many / what exact number...?" — impossible to guess
- Any question where you have to already know the answer to get it right

ABSOLUTE RULES:
- SKIP facts that can't produce genuinely easy questions — return fewer items than input, that's fine
- NEVER mention obscure people by name in the question
- The correct answer must be guessable with common sense alone
- Wrong answers must be OBVIOUSLY wrong — comically different
- Keep questions under 120 characters, answers under 60 characters
- Vary the correct answer position (0-3)
- Set difficulty to 1 (trivial) or 2 (easy)

Respond with a JSON array (no markdown fences). Each element:
{
  "id": <fact id>,
  "question": "<question>",
  "answers": ["<a>", "<b>", "<c>", "<d>"],
  "correct": <0-3>,
  "difficulty": <1 or 2>
}`;

// ── LLM Providers ────────────────────────────────────────────────────
async function callAnthropic(systemPrompt, userPrompt) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  return response.content[0].text.trim();
}

async function callGroq(systemPrompt, userPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set in .env');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API ${res.status}: ${err}`);
  }
  const json = await res.json();
  return json.choices[0].message.content.trim();
}

async function callLLM(systemPrompt, userPrompt) {
  if (PROVIDER === 'groq') return callGroq(systemPrompt, userPrompt);
  return callAnthropic(systemPrompt, userPrompt);
}

async function generateBatch(facts) {
  // Group facts by city so the LLM sees full city context
  const city = facts[0]?.city || 'Unknown';
  const factsText = facts
    .map(
      (f) =>
        `[ID ${f.id}] Category: ${f.category || 'general'}. ` +
        (f.year ? `Year: ${f.year}. ` : '') +
        `Fact: ${f.fact_text}`
    )
    .join('\n\n');

  const prompt = `City: ${city}, ${facts[0]?.country || 'Switzerland'}\n\nHere are ${facts.length} facts about ${city}. Read them ALL first. SKIP any fact that is too obscure — only generate questions for facts that a casual tourist could answer. It's OK to return fewer questions than facts.\n\n${factsText}`;

  // For Groq's json_object mode, ask for a wrapper object
  const groqSuffix =
    PROVIDER === 'groq'
      ? '\n\nRespond with a JSON object: { "questions": [...] }'
      : '';

  const text = await callLLM(
    SYSTEM_PROMPT,
    `Generate one easy quiz question per fact below.${groqSuffix}\n\n${prompt}`
  );

  try {
    const parsed = JSON.parse(text);
    // Handle both direct array and { questions: [...] } wrapper
    return Array.isArray(parsed) ? parsed : parsed.questions || [];
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    console.error('Failed to parse response:', text.slice(0, 200));
    return [];
  }
}

// ── Write to quiz_questions table ─────────────────────────────────────
async function writeQuestions(allQuestions, factsById) {
  // Clear old questions in batches to avoid statement timeout
  console.log('Clearing old quiz_questions...');
  let deleted = true;
  while (deleted) {
    const { data, error: delErr } = await supabase
      .from('quiz_questions')
      .delete()
      .limit(1000)
      .gte('id', 0)
      .select('id');
    if (delErr) throw delErr;
    deleted = data && data.length > 0;
  }

  // Batch insert in chunks of 500
  const rows = [];
  let skippedMissing = 0;
  for (const q of allQuestions) {
    const fact = factsById.get(q.id);
    if (!fact) {
      skippedMissing++;
      continue;
    }
    rows.push({
      fact_id: q.id,
      city: fact.city,
      country: fact.country,
      category: fact.category || null,
      title: fact.title || null,
      fact_text: fact.fact_text || null,
      image_url: fact.image_url || null,
      year: fact.year || null,
      juiciness: fact.juiciness || null,
      difficulty: q.difficulty,
      question: q.question,
      answer_a: q.answers[0],
      answer_b: q.answers[1],
      answer_c: q.answers[2],
      answer_d: q.answers[3],
      correct_answer: q.correct,
    });
  }
  if (skippedMissing) console.log(`  Skipped ${skippedMissing} questions with missing fact data`);

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await supabase.from('quiz_questions').insert(chunk);
    if (error) {
      console.error(`  ✗ Insert batch at offset ${i} failed: ${error.message}`);
    } else {
      inserted += chunk.length;
    }
  }
  return inserted;
}

// ── Concurrency helper ───────────────────────────────────────────────
async function processWithConcurrency(batches, fn, concurrency) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < batches.length) {
      const idx = i++;
      results[idx] = await fn(batches[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results.flat();
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  // Upload mode: read from saved JSON, fetch only needed facts, insert
  if (UPLOAD) {
    const raw = readFileSync('scripts/preview-questions.json', 'utf-8');
    const allQuestions = JSON.parse(raw);
    console.log(`Loaded ${allQuestions.length} questions from preview-questions.json`);

    const ids = [...new Set(allQuestions.map((q) => q.id))];
    const facts = await fetchFactsByIds(ids);
    const factsById = new Map(facts.map((f) => [f.id, f]));

    console.log('Writing to quiz_questions table...');
    const inserted = await writeQuestions(allQuestions, factsById);
    console.log(`\nDone! Inserted ${inserted}/${allQuestions.length} rows into quiz_questions.`);
    return;
  }

  const facts = await fetchFacts();
  if (!facts.length) {
    console.log('No facts found.');
    return;
  }

  // Build lookup map for fact metadata
  const factsById = new Map(facts.map((f) => [f.id, f]));

  // Group facts by city, then split large city groups into sub-batches
  const byCity = new Map();
  for (const f of facts) {
    const key = f.city;
    if (!byCity.has(key)) byCity.set(key, []);
    byCity.get(key).push(f);
  }

  const batches = [];
  for (const [, cityFacts] of byCity) {
    for (let i = 0; i < cityFacts.length; i += BATCH_SIZE) {
      batches.push(cityFacts.slice(i, i + BATCH_SIZE));
    }
  }
  console.log(`Processing ${batches.length} city-grouped batches (${byCity.size} cities)...\n`);

  let totalGenerated = 0;

  const allQuestions = await processWithConcurrency(
    batches,
    async (batch, idx) => {
      const batchNum = idx + 1;
      try {
        const questions = await generateBatch(batch);
        totalGenerated += questions.length;
        process.stdout.write(`  Batch ${batchNum}/${batches.length}: ${questions.length} questions generated\n`);
        return questions;
      } catch (err) {
        console.error(`  Batch ${batchNum} error: ${err.message}`);
        return [];
      }
    },
    CONCURRENCY
  );

  const totalFacts = batches.reduce((sum, b) => sum + b.length, 0);
  const skipped = totalFacts - allQuestions.length;
  console.log(`\nGenerated ${allQuestions.length} questions from ${totalFacts} facts (${skipped} skipped as too obscure).\n`);

  if (!APPLY) {
    // Preview
    for (const q of allQuestions.slice(0, 10)) {
      const marker = ['A', 'B', 'C', 'D'];
      console.log(`── ID ${q.id} (difficulty ${q.difficulty}) ──`);
      console.log(`Q: ${q.question}`);
      q.answers.forEach((a, i) =>
        console.log(`  ${i === q.correct ? '✓' : ' '} ${marker[i]}) ${a}`)
      );
      console.log();
    }
    console.log('Dry run complete. Use --apply to write to database.');

    // Save full output for inspection
    writeFileSync('scripts/preview-questions.json', JSON.stringify(allQuestions, null, 2));
    console.log('Full output saved to scripts/preview-questions.json');
  } else {
    // Save to JSON as backup (allows --upload if DB write fails)
    writeFileSync('scripts/preview-questions.json', JSON.stringify(allQuestions, null, 2));
    console.log('Saved to scripts/preview-questions.json');

    // Write to quiz_questions table
    console.log('Writing to quiz_questions table...');
    const inserted = await writeQuestions(allQuestions, factsById);
    console.log(`\nDone! Inserted ${inserted}/${allQuestions.length} rows into quiz_questions.`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
