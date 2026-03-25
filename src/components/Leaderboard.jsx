import { useEffect, useState } from 'react';
import { getLeaderboard } from '../supabase';
import { t } from '../i18n';

const MEDAL = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

function timeAgo(dateStr, lang) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t(lang, 'timeJustNow');
  if (mins < 60) return t(lang, 'timeMinutes')(mins);
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t(lang, 'timeHours')(hrs);
  const days = Math.floor(hrs / 24);
  if (days < 7) return t(lang, 'timeDays')(days);
  return new Date(dateStr).toLocaleDateString();
}

export default function Leaderboard({ city, lang, onClose, highlightId }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(city ? 'city' : 'global');

  useEffect(() => {
    setLoading(true);
    getLeaderboard(tab === 'city' ? city : null, 50)
      .then(setScores)
      .catch(() => setScores([]))
      .finally(() => setLoading(false));
  }, [tab, city]);

  return (
    <div className="leaderboard-overlay" onClick={onClose}>
      <div className="leaderboard-modal animate-in" onClick={(e) => e.stopPropagation()}>
        <div className="leaderboard-header">
          <h2>&#x1F3C6; {t(lang, 'leaderboard')}</h2>
          <button className="lb-close" onClick={onClose}>&#x2715;</button>
        </div>

        {city && (
          <div className="lb-tabs">
            <button
              className={`lb-tab ${tab === 'city' ? 'active' : ''}`}
              onClick={() => setTab('city')}
            >
              {city}
            </button>
            <button
              className={`lb-tab ${tab === 'global' ? 'active' : ''}`}
              onClick={() => setTab('global')}
            >
              {t(lang, 'allCities')}
            </button>
          </div>
        )}

        {loading ? (
          <div className="lb-loading">
            <div className="loader" />
          </div>
        ) : scores.length === 0 ? (
          <div className="lb-empty">
            <p>{t(lang, 'noScores')}</p>
          </div>
        ) : (
          <div className="lb-list">
            {scores.map((s, i) => (
              <div
                key={s.id}
                className={`lb-row ${i < 3 ? 'lb-top' : ''} ${s.id === highlightId ? 'lb-highlight' : ''}`}
              >
                <span className="lb-rank">
                  {i < 3 ? MEDAL[i] : `#${i + 1}`}
                </span>
                <div className="lb-info">
                  <span className="lb-name">{s.player_name}</span>
                  {tab === 'global' && (
                    <span className="lb-city">{s.city}</span>
                  )}
                </div>
                <div className="lb-stats">
                  <span className="lb-score">{s.score} {t(lang, 'pts')}</span>
                  <span className="lb-detail">
                    {s.correct}/{s.total}
                    {s.best_streak > 0 && ` \u{1F525}${s.best_streak}`}
                  </span>
                </div>
                <span className="lb-time">{timeAgo(s.created_at, lang)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
