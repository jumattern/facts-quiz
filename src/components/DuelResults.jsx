import { useEffect, useState } from 'react';
import Confetti from './Confetti';
import { playComplete } from '../sounds';

export default function DuelResults({ duel, onBack, onHome }) {
  const [showConfetti, setShowConfetti] = useState(false);

  const c = {
    name: duel.challenger_name,
    score: duel.challenger_score,
    correct: duel.challenger_correct,
    total: duel.challenger_total,
    bestStreak: duel.challenger_best_streak,
    answers: duel.challenger_answers || [],
  };

  const o = {
    name: duel.opponent_name,
    score: duel.opponent_score,
    correct: duel.opponent_correct,
    total: duel.opponent_total,
    bestStreak: duel.opponent_best_streak,
    answers: duel.opponent_answers || [],
  };

  const winner =
    c.score > o.score ? 'challenger' : o.score > c.score ? 'opponent' : 'tie';

  useEffect(() => {
    playComplete();
    if (winner !== 'tie') setShowConfetti(true);
  }, []);

  return (
    <div className="results animate-in">
      <Confetti active={showConfetti} />

      <div className="results-card">
        <div className="results-emoji">
          {winner === 'tie' ? '\u{1F91D}' : '\u{2694}\u{FE0F}'}
        </div>
        <h2 className="results-title">{duel.city} Duel</h2>

        {winner === 'tie' ? (
          <p className="duel-winner-text">It's a tie!</p>
        ) : (
          <p className="duel-winner-text">
            <strong>{winner === 'challenger' ? c.name : o.name}</strong> wins!
          </p>
        )}

        <div className="duel-comparison">
          <div className={`duel-player ${winner === 'challenger' ? 'duel-winner' : ''}`}>
            <div className="duel-player-name">{c.name}</div>
            {winner === 'challenger' && <span className="duel-crown">{'\u{1F451}'}</span>}
            <div className="duel-player-score">{c.score}</div>
            <div className="duel-player-label">points</div>

            <div className="duel-detail-grid">
              <div className="duel-detail">
                <span className="duel-detail-value">{c.correct}/{c.total}</span>
                <span className="duel-detail-label">Correct</span>
              </div>
              <div className="duel-detail">
                <span className="duel-detail-value">{c.bestStreak > 0 ? `${c.bestStreak}x` : '-'}</span>
                <span className="duel-detail-label">Streak</span>
              </div>
              <div className="duel-detail">
                <span className="duel-detail-value">{Math.round((c.correct / c.total) * 100)}%</span>
                <span className="duel-detail-label">Accuracy</span>
              </div>
            </div>
          </div>

          <div className="duel-vs">VS</div>

          <div className={`duel-player ${winner === 'opponent' ? 'duel-winner' : ''}`}>
            <div className="duel-player-name">{o.name}</div>
            {winner === 'opponent' && <span className="duel-crown">{'\u{1F451}'}</span>}
            <div className="duel-player-score">{o.score}</div>
            <div className="duel-player-label">points</div>

            <div className="duel-detail-grid">
              <div className="duel-detail">
                <span className="duel-detail-value">{o.correct}/{o.total}</span>
                <span className="duel-detail-label">Correct</span>
              </div>
              <div className="duel-detail">
                <span className="duel-detail-value">{o.bestStreak > 0 ? `${o.bestStreak}x` : '-'}</span>
                <span className="duel-detail-label">Streak</span>
              </div>
              <div className="duel-detail">
                <span className="duel-detail-value">{Math.round((o.correct / o.total) * 100)}%</span>
                <span className="duel-detail-label">Accuracy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Per-question comparison */}
        <div className="duel-breakdown">
          <h3>Question-by-Question</h3>
          {c.answers.map((cAnswer, i) => {
            const oAnswer = o.answers[i];
            if (!cAnswer || !oAnswer) return null;
            return (
              <div key={i} className="duel-q-row">
                <span className="duel-q-num">Q{i + 1}</span>
                <span className={`duel-q-result ${cAnswer.isCorrect ? 'is-correct' : 'is-wrong'}`}>
                  {cAnswer.isCorrect ? '\u2713' : '\u2717'}
                  {cAnswer.points > 0 && <small>+{cAnswer.points}</small>}
                </span>
                <span className="duel-q-vs">vs</span>
                <span className={`duel-q-result ${oAnswer.isCorrect ? 'is-correct' : 'is-wrong'}`}>
                  {oAnswer.isCorrect ? '\u2713' : '\u2717'}
                  {oAnswer.points > 0 && <small>+{oAnswer.points}</small>}
                </span>
              </div>
            );
          })}
        </div>

        <div className="results-actions">
          <button className="btn btn-primary" onClick={onBack}>
            &#x1F504; Play Again
          </button>
          <button className="btn btn-secondary" onClick={onHome}>
            &#x1F30D; Other Cities
          </button>
        </div>
      </div>
    </div>
  );
}
