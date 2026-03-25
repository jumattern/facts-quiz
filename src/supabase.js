import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getCities() {
  const { data, error } = await supabase
    .from('facts')
    .select('city, country')
    .not('quiz_question_en', 'is', null)
    .not('quiz_correct_answer', 'is', null);

  if (error) throw error;

  const cityMap = new Map();
  for (const row of data) {
    const key = `${row.city}, ${row.country}`;
    cityMap.set(key, {
      city: row.city,
      country: row.country,
      count: (cityMap.get(key)?.count || 0) + 1,
    });
  }

  return Array.from(cityMap.values())
    .filter((c) => c.count >= 3)
    .sort((a, b) => b.count - a.count);
}

export async function getQuizQuestions(city, lang = 'en', limit = 10) {
  const langSuffix = lang === 'en' ? 'en' : lang;
  const questionCol = `quiz_question_${langSuffix}`;
  const answerACol = `quiz_answer_a_${langSuffix}`;
  const answerBCol = `quiz_answer_b_${langSuffix}`;
  const answerCCol = `quiz_answer_c_${langSuffix}`;
  const answerDCol = `quiz_answer_d_${langSuffix}`;

  const { data, error } = await supabase
    .from('facts')
    .select(
      `id, city, country, category, title, title_de, title_fr, title_it,
       fact_text, fact_text_de, fact_text_fr, fact_text_it,
       image_url, year, juiciness, quiz_difficulty,
       ${questionCol}, ${answerACol}, ${answerBCol}, ${answerCCol}, ${answerDCol},
       quiz_correct_answer`
    )
    .eq('city', city)
    .not(questionCol, 'is', null)
    .not('quiz_correct_answer', 'is', null)
    .order('juiciness', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    city: row.city,
    country: row.country,
    category: row.category,
    title: row[`title${lang === 'en' ? '' : `_${lang}`}`] || row.title,
    fact: row[`fact_text${lang === 'en' ? '' : `_${lang}`}`] || row.fact_text,
    imageUrl: row.image_url,
    year: row.year,
    difficulty: row.quiz_difficulty,
    juiciness: row.juiciness,
    question: row[questionCol],
    answers: [
      row[answerACol],
      row[answerBCol],
      row[answerCCol],
      row[answerDCol],
    ],
    correctAnswer: row.quiz_correct_answer,
  }));
}
