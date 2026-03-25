import { useEffect, useState } from 'react';
import { getCities } from '../supabase';
import Leaderboard from './Leaderboard';

const CITY_IMAGES = {
  Zurich: 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=600&h=400&fit=crop',
  Bern: 'https://images.unsplash.com/photo-1741900033774-5957b5f03dd7?w=600&h=400&fit=crop',
  Basel: 'https://images.unsplash.com/photo-1627410566847-738061cb6995?w=600&h=400&fit=crop',
  Lucerne: 'https://images.unsplash.com/photo-1749195403421-b40b0ff3cae7?w=600&h=400&fit=crop',
  Geneva: 'https://images.unsplash.com/photo-1757584666096-59deb41f1124?w=600&h=400&fit=crop',
  Lausanne: 'https://images.unsplash.com/photo-1603646049799-736bb072cec5?w=600&h=400&fit=crop',
};

function getDefaultImage(city) {
  return CITY_IMAGES[city] || `https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&h=400&fit=crop`;
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
              style={{ backgroundImage: `url(${getDefaultImage(c.city)})` }}
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
