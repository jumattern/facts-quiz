import { useEffect, useState } from 'react';
import { getCities } from '../supabase';
import Leaderboard from './Leaderboard';
import { t } from '../i18n';

const CITY_IMAGES = {
  Zurich: 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=600&h=400&fit=crop',
  Bern: 'https://images.unsplash.com/photo-1741900033774-5957b5f03dd7?w=600&h=400&fit=crop',
  Basel: 'https://images.unsplash.com/photo-1627410566847-738061cb6995?w=600&h=400&fit=crop',
  Lucerne: 'https://images.unsplash.com/photo-1749195403421-b40b0ff3cae7?w=600&h=400&fit=crop',
  Geneva: 'https://images.unsplash.com/photo-1757584666096-59deb41f1124?w=600&h=400&fit=crop',
  Lausanne: 'https://images.unsplash.com/photo-1603646049799-736bb072cec5?w=600&h=400&fit=crop',
  Winterthur: 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?w=600&h=400&fit=crop',
  'St. Gallen': 'https://images.unsplash.com/photo-1573108037329-37aa135a142e?w=600&h=400&fit=crop',
  Lugano: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=600&h=400&fit=crop',
  Montreux: 'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=600&h=400&fit=crop',
  Thun: 'https://images.unsplash.com/photo-1569880153113-76e33fc52d5f?w=600&h=400&fit=crop',
  Sion: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&h=400&fit=crop',
  Schaffhausen: 'https://images.unsplash.com/photo-1545893835-abaa50cbe628?w=600&h=400&fit=crop',
  Locarno: 'https://images.unsplash.com/photo-1610117238813-1d5325d66045?w=600&h=400&fit=crop',
};

// Deterministic fallback: pick a unique Unsplash photo based on city name hash
const FALLBACK_PHOTOS = [
  'photo-1477959858617-67f85cf4f1df',
  'photo-1480714378408-67cf0d13bc1b',
  'photo-1449824913935-59a10b8d2000',
  'photo-1444723121867-7a241cacace9',
  'photo-1514565131-fce0801e5785',
  'photo-1519501025264-65ba15a82390',
  'photo-1467269204594-9661b134dd2b',
  'photo-1502602898657-3e91760cbb34',
  'photo-1534430480872-3498386e7856',
  'photo-1543832923-44667a44c860',
  'photo-1513635269975-59663e0ac1ad',
  'photo-1518391846015-55a9cc003b25',
  'photo-1486325212027-8081e485255e',
  'photo-1526129318478-62ed807ebdf9',
  'photo-1571173729460-18461d6a50d0',
  'photo-1533929736458-ca588d08c8be',
  'photo-1569880153113-76e33fc52d5f',
  'photo-1558642452-9d2a7deb7f62',
  'photo-1545893835-abaa50cbe628',
  'photo-1570168007204-dfb528c6958f',
];

function getCityImageUrl(city) {
  if (CITY_IMAGES[city]) return CITY_IMAGES[city];
  // Hash city name to pick a consistent fallback
  let hash = 0;
  for (let i = 0; i < city.length; i++) {
    hash = ((hash << 5) - hash + city.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % FALLBACK_PHOTOS.length;
  return `https://images.unsplash.com/${FALLBACK_PHOTOS[idx]}?w=600&h=400&fit=crop`;
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
