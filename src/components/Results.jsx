import { useEffect, useState } from 'react';
import Confetti from './Confetti';
import Leaderboard from './Leaderboard';
import { playComplete } from '../sounds';
import { submitScore, getPlayerRank } from '../supabase';

export default function Results({
  city,
  questions,
  answers,
  totalPoints,
  onBack,
  onRetry,
}) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [rank, setRank] = useState(null);
  const [submittedId, setSubmittedId] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

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
    if (pct >= 70) setShowConfetti(true);

    // Restore last used name
    const saved = localStorage.getItem('quizPlayerName');
    if (saved) setPlayerName(saved);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!playerName.trim() || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      localStorage.setItem('quizPlayerName', playerName.trim());
      const entry = await submitScore({
        playerName: playerName.trim(),
        city,
        score: totalPoints,
        correct,
        total,
        bestStreak,
      });
      setSubmittedId(entry.id);
      setSubmitted(true);

      const r = await getPlayerRank(city, totalPoints);
      if (r) setRank(r);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

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

      {showLeaderboard && (
        <Leaderboard
          city={city}
          onClose={() => setShowLeaderboard(false)}
          highlightId={submittedId}
        />
      )}

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

        {/* Score submission */}
        {!submitted ? (
          <form className="score-submit" onSubmit={handleSubmit}>
            <p className="score-submit-label">Save your score to the leaderboard</p>
            <div className="score-submit-row">
              <input
                type="text"
                className="name-input"
                placeholder="Your name..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={30}
                autoFocus
              />
              <button
                type="submit"
                className="btn btn-primary btn-submit"
                disabled={!playerName.trim() || submitting}
              >
                {submitting ? 'Saving...' : 'Submit'}
              </button>
            </div>
            {submitError && (
              <p className="submit-error">{submitError}</p>
            )}
          </form>
        ) : (
          <div className="score-submitted animate-in">
            <p className="submitted-text">
              &#x2705; Score saved!
              {rank && (
                <span className="rank-text">
                  {' '}You're <strong>#{rank}</strong> in {city}!
                </span>
              )}
            </p>
            <button
              className="btn btn-leaderboard"
              onClick={() => setShowLeaderboard(true)}
            >
              &#x1F3C6; View Leaderboard
            </button>
          </div>
        )}

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
          <button
            className="btn btn-secondary"
            onClick={() => setShowLeaderboard(true)}
          >
            &#x1F3C6; Leaderboard
          </button>
          <button className="btn btn-secondary" onClick={onBack}>
            &#x1F30D; Other Cities
          </button>
        </div>
      </div>
    </div>
  );
}
