import { useEffect, useState } from 'react';
import Confetti from './Confetti';
import Leaderboard from './Leaderboard';
import { playComplete } from '../sounds';
import { submitScore, getPlayerRank, createDuel } from '../supabase';
import { t } from '../i18n';

export default function Results({
  city,
  lang,
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
  const [duelLink, setDuelLink] = useState(null);
  const [creatingDuel, setCreatingDuel] = useState(false);
  const [duelCopied, setDuelCopied] = useState(false);
  const [duelError, setDuelError] = useState(null);

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

  const handleChallenge = async () => {
    const name = playerName.trim() || t(lang, 'anonymous');
    setCreatingDuel(true);
    setDuelError(null);
    try {
      const duel = await createDuel({
        city,
        lang: lang || 'en',
        challengerName: name,
        questionIds: questions.map((q) => q.id),
        challengerScore: totalPoints,
        challengerCorrect: correct,
        challengerTotal: total,
        challengerBestStreak: bestStreak,
        challengerAnswers: answers.map((a) => ({
          isCorrect: a.isCorrect,
          points: a.points,
          elapsed: a.elapsed,
        })),
      });
      const url = `${window.location.origin}${window.location.pathname}?duel=${duel.id}`;
      setDuelLink(url);
    } catch (err) {
      console.error('Duel creation failed:', err);
      setDuelError(err.message);
    } finally {
      setCreatingDuel(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(duelLink);
      setDuelCopied(true);
      setTimeout(() => setDuelCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement('input');
      input.value = duelLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setDuelCopied(true);
      setTimeout(() => setDuelCopied(false), 2000);
    }
  };

  let emoji, message;
  if (pct === 100) {
    emoji = '\u{1F3C6}';
    message = t(lang, 'flawless')(city);
  } else if (pct >= 80) {
    emoji = '\u{1F389}';
    message = t(lang, 'amazing')(city);
  } else if (pct >= 60) {
    emoji = '\u{1F44F}';
    message = t(lang, 'wellPlayed')(city);
  } else if (pct >= 40) {
    emoji = '\u{1F914}';
    message = t(lang, 'notBad')(city);
  } else {
    emoji = '\u{1F4DA}';
    message = t(lang, 'explore')(city);
  }

  return (
    <div className="results animate-in">
      <Confetti active={showConfetti} />

      {showLeaderboard && (
        <Leaderboard
          city={city}
          lang={lang}
          onClose={() => setShowLeaderboard(false)}
          highlightId={submittedId}
        />
      )}

      <div className="results-card">
        <div className="results-emoji">{emoji}</div>
        <h2 className="results-title">{t(lang, 'quizComplete')(city)}</h2>

        <div className="results-stats">
          <div className="stat-box">
            <div className="stat-value">{totalPoints}</div>
            <div className="stat-label">{t(lang, 'points')}</div>
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
              {correct}/{total} {t(lang, 'correct')}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-value">
              {bestStreak > 0 ? `${bestStreak}x` : '-'}
            </div>
            <div className="stat-label">{t(lang, 'bestStreak')}</div>
          </div>
        </div>

        <p className="results-message">{message}</p>

        {/* Score submission */}
        {!submitted ? (
          <form className="score-submit" onSubmit={handleSubmit}>
            <p className="score-submit-label">{t(lang, 'saveScore')}</p>
            <div className="score-submit-row">
              <input
                type="text"
                className="name-input"
                placeholder={t(lang, 'yourName')}
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
                {submitting ? t(lang, 'saving') : t(lang, 'submit')}
              </button>
            </div>
            {submitError && (
              <p className="submit-error">{submitError}</p>
            )}
          </form>
        ) : (
          <div className="score-submitted animate-in">
            <p className="submitted-text">
              &#x2705; {t(lang, 'scoreSaved')}
              {rank && (
                <span className="rank-text">
                  {' '}{t(lang, 'yourRank')(rank, city)}
                </span>
              )}
            </p>
            <button
              className="btn btn-leaderboard"
              onClick={() => setShowLeaderboard(true)}
            >
              &#x1F3C6; {t(lang, 'viewLeaderboard')}
            </button>
          </div>
        )}

        <div className="results-breakdown">
          <h3>{t(lang, 'questionBreakdown')}</h3>
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

        {/* Duel challenge */}
        {!duelLink ? (
          <div className="duel-challenge-section">
            <button
              className="btn btn-challenge"
              onClick={handleChallenge}
              disabled={creatingDuel}
            >
              {creatingDuel ? t(lang, 'creating') : `\u2694\uFE0F ${t(lang, 'challengeFriend')}`}
            </button>
            {duelError && (
              <p className="submit-error" style={{ marginTop: '10px' }}>
                {t(lang, 'duelFailed')} {duelError}
              </p>
            )}
          </div>
        ) : (
          <div className="duel-link-section animate-in">
            <p className="duel-link-label">{t(lang, 'shareLink')}</p>
            <div className="duel-link-row">
              <input
                type="text"
                className="duel-link-input"
                value={duelLink}
                readOnly
                onClick={(e) => e.target.select()}
              />
              <button className="btn btn-primary btn-copy" onClick={handleCopyLink}>
                {duelCopied ? `\u2705 ${t(lang, 'copied')}` : `\u{1F4CB} ${t(lang, 'copy')}`}
              </button>
            </div>
            <p className="duel-link-hint">
              {t(lang, 'shareLinkHint')}
            </p>
          </div>
        )}

        <div className="results-actions">
          <button className="btn btn-primary" onClick={onRetry}>
            &#x1F504; {t(lang, 'playAgain')}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowLeaderboard(true)}
          >
            &#x1F3C6; {t(lang, 'leaderboard')}
          </button>
          <button className="btn btn-secondary" onClick={onBack}>
            &#x1F30D; {t(lang, 'otherCities')}
          </button>
        </div>
      </div>
    </div>
  );
}
