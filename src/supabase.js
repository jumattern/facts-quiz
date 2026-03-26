import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getCities() {
  // Paginate to get all rows — Supabase defaults to max 1000
  const cityMap = new Map();
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('city, country')
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data.length) break;

    for (const row of data) {
      const key = `${row.city}, ${row.country}`;
      cityMap.set(key, {
        city: row.city,
        country: row.country,
        count: (cityMap.get(key)?.count || 0) + 1,
      });
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return Array.from(cityMap.values())
    .filter((c) => c.count >= 3)
    .sort((a, b) => b.count - a.count);
}

export async function getQuizQuestions(city, lang = 'en', limit = 5) {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('city', city)
    .order('juiciness', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data.map((row) => ({
    id: row.fact_id,
    city: row.city,
    country: row.country,
    category: row.category,
    title: row.title,
    fact: row.fact_text,
    imageUrl: row.image_url,
    year: row.year,
    difficulty: row.difficulty,
    juiciness: row.juiciness,
    question: row.question,
    answers: [row.answer_a, row.answer_b, row.answer_c, row.answer_d],
    correctAnswer: row.correct_answer,
  }));
}

// ── Leaderboard ──────────────────────────────────────────────────────

export async function submitScore({ playerName, city, score, correct, total, bestStreak }) {
  const { data, error } = await supabase
    .from('leaderboard')
    .insert({
      player_name: playerName.trim().slice(0, 30),
      city,
      score,
      correct,
      total,
      best_streak: bestStreak,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLeaderboard(city, limit = 20) {
  const query = supabase
    .from('leaderboard')
    .select('*')
    .order('score', { ascending: false })
    .limit(limit);

  if (city) query.eq('city', city);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getPlayerRank(city, score) {
  const { count, error } = await supabase
    .from('leaderboard')
    .select('*', { count: 'exact', head: true })
    .eq('city', city)
    .gt('score', score);

  if (error) return null;
  return (count || 0) + 1;
}

// ── Duels ────────────────────────────────────────────────────────────

export async function createDuel({
  city,
  lang,
  challengerName,
  questionIds,
  challengerScore,
  challengerCorrect,
  challengerTotal,
  challengerBestStreak,
  challengerAnswers,
}) {
  const { data, error } = await supabase
    .from('duels')
    .insert({
      city,
      lang,
      challenger_name: challengerName.trim().slice(0, 30),
      question_ids: questionIds,
      challenger_score: challengerScore,
      challenger_correct: challengerCorrect,
      challenger_total: challengerTotal,
      challenger_best_streak: challengerBestStreak,
      challenger_answers: challengerAnswers,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getDuel(duelId) {
  const { data, error } = await supabase
    .from('duels')
    .select('*')
    .eq('id', duelId)
    .single();

  if (error) throw error;
  return data;
}

export async function completeDuel(duelId, {
  opponentName,
  opponentScore,
  opponentCorrect,
  opponentTotal,
  opponentBestStreak,
  opponentAnswers,
}) {
  const { data, error } = await supabase
    .from('duels')
    .update({
      opponent_name: opponentName.trim().slice(0, 30),
      opponent_score: opponentScore,
      opponent_correct: opponentCorrect,
      opponent_total: opponentTotal,
      opponent_best_streak: opponentBestStreak,
      opponent_answers: opponentAnswers,
      completed_at: new Date().toISOString(),
    })
    .eq('id', duelId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getQuizQuestionsByIds(ids, lang = 'en') {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('*')
    .in('fact_id', ids);

  if (error) throw error;

  const mapped = data.map((row) => ({
    id: row.fact_id,
    city: row.city,
    country: row.country,
    category: row.category,
    title: row.title,
    fact: row.fact_text,
    imageUrl: row.image_url,
    year: row.year,
    difficulty: row.difficulty,
    juiciness: row.juiciness,
    question: row.question,
    answers: [row.answer_a, row.answer_b, row.answer_c, row.answer_d],
    correctAnswer: row.correct_answer,
  }));

  // Sort by the order of ids
  const idOrder = new Map(ids.map((id, i) => [id, i]));
  return mapped.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
}
