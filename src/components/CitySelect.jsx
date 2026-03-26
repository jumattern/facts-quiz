import { useEffect, useState } from 'react';
import { getCities } from '../supabase';
import Leaderboard from './Leaderboard';
import { t } from '../i18n';

// City card images — stable seeded photos from picsum.photos (CDN, no rate limits)
// Each city gets a consistent image based on its name as seed
function getCityImageUrl(city) {
  return `https://picsum.photos/seed/${encodeURIComponent(city)}/640/360`;
}

export default function CitySelect({ onSelectCity, lang }) {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    getCities()
      .then(setCities)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="city-select-loading">
        <div className="loader" />
        <p>{t(lang, 'discoveringCities')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="city-select-error">
        <p>{t(lang, 'couldNotLoadCities')} {error}</p>
        <p className="hint">{t(lang, 'checkConnection')}</p>
      </div>
    );
  }

  return (
    <div className="city-select">
      {showLeaderboard && (
        <Leaderboard
          city={null}
          lang={lang}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      <header className="hero">
        <h1>{t(lang, 'heroTitle')}</h1>
        <p className="subtitle">
          {t(lang, 'heroSubtitle')}
        </p>
        <button
          className="btn btn-leaderboard hero-lb-btn"
          onClick={() => setShowLeaderboard(true)}
        >
          &#x1F3C6; {t(lang, 'leaderboard')}
        </button>
      </header>

      <div className="city-grid">
        {cities.map((c) => (
          <button
            key={`${c.city}-${c.country}`}
            className="city-card"
            onClick={() => onSelectCity(c.city)}
          >
            <div
              className="city-card-bg"
              style={{ backgroundImage: `url(${getCityImageUrl(c.city)})` }}
            />
            <div className="city-card-overlay" />
            <div className="city-card-content">
              <h2>{c.city}</h2>
              <span className="country">{c.country}</span>
              <span className="question-count">
                {t(lang, 'questionCount')(c.count)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
