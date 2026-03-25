import { useEffect, useState, useCallback } from 'react';
import { getQuizQuestions } from '../supabase';
import QuizCard from './QuizCard';
import Results from './Results';
import { playCorrect, playWrong, playStreak } from '../sounds';

const BASE_POINTS = 100;
const SPEED_BONUS_MAX = 100; // max bonus for fast answer
const TIMER_SECONDS = 20;

function calcPoints(isCorrect, elapsed, streak) {
  if (!isCorrect) return 0;
  const speedRatio = Math.max(0, 1 - elapsed / TIMER_SECONDS);
  const speedBonus = Math.round(speedRatio * SPEED_BONUS_MAX);
  const streakMultiplier = 1 + Math.min(streak, 10) * 0.1; // up to 2x at 10 streak
  return Math.round((BASE_POINTS + speedBonus) * streakMultiplier);
}

export default function Quiz({ city, lang, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizDone, setQuizDone] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [pointsPopup, setPointsPopup] = useState(null);
  const [transition, setTransition] = useState(false);

  useEffect(() => {
    setLoading(true);
    getQuizQuestions(city, lang)
      .then((qs) => {
        const shuffled = qs.sort(() => Math.random() - 0.5);
        setQuestions(shuffled);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [city, lang]);

  const handleAnswer = useCallback(
    (answerIndex, elapsed) => {
      const q = questions[current];
      const isCorrect = answerIndex === q.correctAnswer;
      const newStreak = isCorrect ? streak + 1 : 0;
      const points = calcPoints(isCorrect, elapsed, streak);

      if (isCorrect) {
        playCorrect();
        if (newStreak >= 3 && newStreak % 3 === 0) playStreak();
      } else {
        playWrong();
      }

      setStreak(newStreak);
      setTotalPoints((p) => p + points);

      if (points > 0) {
        setPointsPopup({ points, key: Date.now() });
        setTimeout(() => setPointsPopup(null), 1000);
      }

      const newAnswers = [
        ...answers,
        { questionIndex: current, answerIndex, isCorrect, points, elapsed },
      ];
      setAnswers(newAnswers);

      setTimeout(() => {
        if (current + 1 < questions.length) {
          setTransition(true);
          setTimeout(() => {
            setCurrent(current + 1);
            setTransition(false);
          }, 300);
        } else {
          setQuizDone(true);
        }
      }, 1800);
    },
    [current, questions, answers, streak]
  );

  if (loading) {
    return (
      <div className="quiz-loading">
        <div className="loader" />
        <p>Loading {city} quiz...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-error">
        <p>Error: {error}</p>
        <button className="btn" onClick={onBack}>
          Back to cities
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="quiz-error">
        <p>No quiz questions found for {city}.</p>
        <button className="btn" onClick={onBack}>
          Back to cities
        </button>
      </div>
    );
  }

  if (quizDone) {
    return (
      <Results
        city={city}
        questions={questions}
        answers={answers}
        totalPoints={totalPoints}
        onBack={onBack}
        onRetry={() => {
          setCurrent(0);
          setAnswers([]);
          setQuizDone(false);
          setTotalPoints(0);
          setStreak(0);
          setQuestions((qs) => [...qs].sort(() => Math.random() - 0.5));
        }}
      />
    );
  }

  const q = questions[current];
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const wrongCount = answers.filter((a) => !a.isCorrect).length;

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <button className="btn-back" onClick={onBack}>
          &larr; Cities
        </button>
        <h2 className="quiz-city-title">{city}</h2>
        <div className="quiz-progress">
          <span className="progress-text">
            {current + 1} / {questions.length}
          </span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${((current + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="quiz-score-bar">
        <div className="score-left">
          <span className="score-points">&#x2B50; {totalPoints} pts</span>
          {streak >= 2 && (
            <span className="streak-indicator">
              &#x1F525; {streak}x
            </span>
          )}
        </div>
        <div className="score-right">
          <span className="score-correct">&#x2713; {correctCount}</span>
          <span className="score-wrong">&#x2717; {wrongCount}</span>
        </div>
      </div>

      {pointsPopup && (
        <div className="points-popup" key={pointsPopup.key}>
          +{pointsPopup.points}
        </div>
      )}

      <div className={`card-wrapper ${transition ? 'slide-out' : ''}`}>
        <QuizCard
          key={q.id}
          question={q}
          onAnswer={handleAnswer}
          questionNumber={current + 1}
          streak={streak}
        />
      </div>
    </div>
  );
}
