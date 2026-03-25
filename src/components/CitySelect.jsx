import { useEffect, useState } from 'react';
import { getCities } from '../supabase';
import Leaderboard from './Leaderboard';

function getCityImageUrl(city, country) {
  // Use Unsplash source for a city-specific photo
  const query = encodeURIComponent(`${city} ${country} city`);
  return `https://source.unsplash.com/600x400/?${query}`;
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
        <p>Discovering cities...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="city-select-error">
        <p>Could not load cities: {error}</p>
        <p className="hint">Check your Supabase connection settings.</p>
      </div>
    );
  }

  return (
    <div className="city-select">
      {showLeaderboard && (
        <Leaderboard
          city={null}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      <header className="hero">
        <h1>City Facts Quiz</h1>
        <p className="subtitle">
          Pick a city and test your knowledge about its most surprising facts
        </p>
        <button
          className="btn btn-leaderboard hero-lb-btn"
          onClick={() => setShowLeaderboard(true)}
        >
          &#x1F3C6; Leaderboard
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
              style={{ backgroundImage: `url(${getCityImageUrl(c.city, c.country)})` }}
            />
            <div className="city-card-overlay" />
            <div className="city-card-content">
              <h2>{c.city}</h2>
              <span className="country">{c.country}</span>
              <span className="question-count">
                {c.count} question{c.count !== 1 ? 's' : ''}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
