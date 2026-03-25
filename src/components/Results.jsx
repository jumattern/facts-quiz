import { useEffect, useState } from 'react';
import Confetti from './Confetti';
import { playComplete } from '../sounds';

export default function Results({
  city,
  questions,
  answers,
  totalPoints,
  onBack,
  onRetry,
}) {
  const [showConfetti, setShowConfetti] = useState(false);
  const correct = answers.filter((a) => a.isCorrect).length;
  const total = questions.length;
  const pct = Math.round((correct / total) * 100);
  const bestStreak = answers.reduce(
    (acc, a) => {
      const cur = a.isCorrect ? acc.cur + 1 : 0;
      return { cur, max: Math.max(acc.max, cur) };
    },
    { cur: 0, max: 0 }
  ).max;

  useEffect(() => {
    playComplete();
    if (pct >= 70) {
      setShowConfetti(true);
    }
  }, []);

  let emoji, message;
  if (pct === 100) {
    emoji = '\u{1F3C6}';
    message = `Flawless! You're the ultimate ${city} expert!`;
  } else if (pct >= 80) {
    emoji = '\u{1F389}';
    message = `Amazing! You really know ${city}!`;
  } else if (pct >= 60) {
    emoji = '\u{1F44F}';
    message = `Well played! ${city} is starting to reveal its secrets.`;
  } else if (pct >= 40) {
    emoji = '\u{1F914}';
    message = `Not bad! ${city} still has surprises for you.`;
  } else {
    emoji = '\u{1F4DA}';
    message = `Time to explore ${city} a bit more!`;
  }

  return (
    <div className="results animate-in">
      <Confetti active={showConfetti} />

      <div className="results-card">
        <div className="results-emoji">{emoji}</div>
        <h2 className="results-title">{city} Quiz Complete</h2>

        <div className="results-stats">
          <div className="stat-box">
            <div className="stat-value">{totalPoints}</div>
            <div className="stat-label">Points</div>
          </div>
          <div className="stat-box stat-main">
            <div className="score-ring">
              <svg viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke={
                    pct >= 70
                      ? '#22c55e'
                      : pct >= 40
                        ? '#eab308'
                        : '#ef4444'
                  }
                  strokeWidth="8"
                  strokeDasharray={`${(pct / 100) * 327} 327`}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  className="score-ring-fill"
                />
              </svg>
              <span className="score-number">{pct}%</span>
            </div>
            <div className="stat-label">
              {correct}/{total} correct
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-value">
              {bestStreak > 0 ? `${bestStreak}x` : '-'}
            </div>
            <div className="stat-label">Best Streak</div>
          </div>
        </div>

        <p className="results-message">{message}</p>

        <div className="results-breakdown">
          <h3>Question Breakdown</h3>
          {questions.map((q, i) => {
            const answer = answers[i];
            return (
              <div
                key={q.id}
                className={`breakdown-row ${answer?.isCorrect ? 'is-correct' : 'is-wrong'}`}
              >
                <span className="breakdown-icon">
                  {answer?.isCorrect ? '\u2713' : '\u2717'}
                </span>
                <span className="breakdown-question">{q.question}</span>
                {answer?.points > 0 && (
                  <span className="breakdown-points">+{answer.points}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="results-actions">
          <button className="btn btn-primary" onClick={onRetry}>
            &#x1F504; Play Again
          </button>
          <button className="btn btn-secondary" onClick={onBack}>
            &#x1F30D; Other Cities
          </button>
        </div>
      </div>
    </div>
  );
}
