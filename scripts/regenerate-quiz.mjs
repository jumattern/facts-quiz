/**
 * Regenerate quiz questions using an LLM to make them easier.
 *
 * Usage:
 *   node scripts/regenerate-quiz.mjs                        # dry-run, 5 rows, Claude
 *   node scripts/regenerate-quiz.mjs --provider groq        # use Groq (fast & free)
 *   node scripts/regenerate-quiz.mjs --limit 50             # dry-run, 50 rows
 *   node scripts/regenerate-quiz.mjs --apply                # write ALL rows back to DB
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
import { writeFileSync } from 'fs';

config(); // load .env

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : (APPLY ? 99999 : 5);
const providerIdx = args.indexOf('--provider');
const PROVIDER = providerIdx !== -1 ? args[providerIdx + 1] : 'anthropic';
const BATCH_SIZE = 10;
const CONCURRENCY = PROVIDER === 'groq' ? 2 : 3; // groq has tighter rate limits

console.log(`Mode: ${APPLY ? 'APPLY (will write to DB)' : 'DRY-RUN (preview only)'}`);
console.log(`Provider: ${PROVIDER}, Limit: ${LIMIT}, Batch size: ${BATCH_SIZE}, Concurrency: ${CONCURRENCY}\n`);

// ── Fetch facts ──────────────────────────────────────────────────────
async function fetchFacts() {
  let allFacts = [];
  let from = 0;
  const pageSize = 1000;

  while (from < LIMIT) {
    const fetchSize = Math.min(pageSize, LIMIT - from);
    const { data, error } = await supabase
      .from('facts')
      .select('id, city, country, fact_text, category, year, title')
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

// ── Generate easy questions via Claude ───────────────────────────────
const SYSTEM_PROMPT = `You generate FUN and VERY EASY multiple-choice quiz questions from city facts. These should be enjoyable pub-quiz style questions that most people can answer.

CRITICAL RULES FOR MAKING QUESTIONS EASY:

1. NEVER ask about specific years, dates, exact numbers, or death/birth details.
2. NEVER ask "When did X happen?" or "What year...?" or "Where did X die/born?"
3. Instead, use these EASY question patterns:
   - Give a fun description and ask WHICH CITY it's about: "Which city is home to [interesting thing from fact]?"
   - Ask about the GENERAL TOPIC: "What is the Jet d'Eau in Geneva?" → answers: A fountain, A museum, A bridge, A park
   - Ask TRUE/FALSE style (as 4 options): "The [landmark] in [city] is famous for...?" → correct description + 3 wrong ones
   - Ask WHAT CATEGORY something falls into: "What kind of attraction is [X]?" → Museum, Park, Bridge, Church
   - Use the fact to create a "fun fact" question: "[Interesting claim from fact] — which city is this about?"

4. The correct answer should be guessable through common sense or general knowledge, even without knowing the specific fact.
5. Wrong answers must be CLEARLY wrong — not tricky. Use obviously different categories/cities.
6. Vary the correct answer position across questions (don't always put it in the same slot).
7. Keep it fun and interesting — the goal is entertainment, not a history exam.
8. Keep questions and answers concise (under 120 chars each).
9. Set difficulty to 1 (very easy) or 2 (easy).

GOOD example: "Which Swiss city has a famous 140-meter-tall water fountain in its lake?" → Geneva, Zurich, Basel, Bern
BAD example: "What year was the Jet d'Eau first installed?" → 1886, 1891, 1903, 1920

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
  const factsText = facts
    .map(
      (f) =>
        `[ID ${f.id}] City: ${f.city}, ${f.country}. ` +
        `Category: ${f.category || 'general'}. ` +
        (f.year ? `Year: ${f.year}. ` : '') +
        `Fact: ${f.fact_text}`
    )
    .join('\n\n');

  // For Groq's json_object mode, ask for a wrapper object
  const groqSuffix =
    PROVIDER === 'groq'
      ? '\n\nRespond with a JSON object: { "questions": [...] }'
      : '';

  const text = await callLLM(
    SYSTEM_PROMPT,
    `Generate one easy quiz question per fact below.${groqSuffix}\n\n${factsText}`
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

// ── Update Supabase ──────────────────────────────────────────────────
async function updateRow(q) {
  const { error } = await supabase
    .from('facts')
    .update({
      quiz_question_en: q.question,
      quiz_answer_a_en: q.answers[0],
      quiz_answer_b_en: q.answers[1],
      quiz_answer_c_en: q.answers[2],
      quiz_answer_d_en: q.answers[3],
      quiz_correct_answer: q.correct,
      quiz_difficulty: q.difficulty,
    })
    .eq('id', q.id);

  if (error) console.error(`  ✗ Failed to update id=${q.id}: ${error.message}`);
  return !error;
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
  const facts = await fetchFacts();
  if (!facts.length) {
    console.log('No facts found.');
    return;
  }

  // Split into batches
  const batches = [];
  for (let i = 0; i < facts.length; i += BATCH_SIZE) {
    batches.push(facts.slice(i, i + BATCH_SIZE));
  }
  console.log(`Processing ${batches.length} batches...\n`);

  let totalGenerated = 0;
  let totalUpdated = 0;

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

  console.log(`\nGenerated ${allQuestions.length} questions total.\n`);

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
    // Write to DB
    console.log('Writing to database...');
    for (const q of allQuestions) {
      const ok = await updateRow(q);
      if (ok) totalUpdated++;
    }
    console.log(`\nDone! Updated ${totalUpdated}/${allQuestions.length} rows.`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
