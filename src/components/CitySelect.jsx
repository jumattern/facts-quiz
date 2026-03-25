import { useEffect, useState } from 'react';
import { getCities } from '../supabase';

const CATEGORY_EMOJI = {
  dark: '\u{1F480}',
  funny: '\u{1F602}',
  hidden: '\u{1F50D}',
  legendary: '\u{1F451}',
  weird: '\u{1F47D}',
};

const CITY_IMAGES = {
  Zürich: 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=400&h=250&fit=crop',
  Bern: 'https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?w=400&h=250&fit=crop',
  Basel: 'https://images.unsplash.com/photo-1549877452-d6e99849e5a0?w=400&h=250&fit=crop',
  Luzern: 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?w=400&h=250&fit=crop',
  Geneva: 'https://images.unsplash.com/photo-1573108037329-37aa135a142e?w=400&h=250&fit=crop',
  Lausanne: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=400&h=250&fit=crop',
};

function getDefaultImage(city) {
  return CITY_IMAGES[city] || `https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=250&fit=crop`;
}

export default function CitySelect({ onSelectCity, lang }) {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      <header className="hero">
        <h1>City Facts Quiz</h1>
        <p className="subtitle">
          Pick a city and test your knowledge about its most surprising facts
        </p>
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
