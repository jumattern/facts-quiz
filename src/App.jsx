import { useState, useEffect } from 'react';
import CitySelect from './components/CitySelect';
import Quiz from './components/Quiz';
import Background from './components/Background';
import { getDuel } from './supabase';
import './App.css';

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'fr', label: 'FR' },
  { code: 'it', label: 'IT' },
];

function App() {
  const [selectedCity, setSelectedCity] = useState(null);
  const [lang, setLang] = useState('de');
  const [duel, setDuel] = useState(null);
  const [duelLoading, setDuelLoading] = useState(false);
  const [duelError, setDuelError] = useState(null);

  // Check for duel param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const duelId = params.get('duel');
    if (duelId) {
      setDuelLoading(true);
      getDuel(duelId)
        .then((d) => {
          if (d.completed_at) {
            setDuelError('This duel has already been completed.');
          } else {
            setDuel(d);
            setSelectedCity(d.city);
            setLang(d.lang || 'en');
          }
        })
        .catch(() => setDuelError('Duel not found or link is invalid.'))
        .finally(() => setDuelLoading(false));
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleBack = () => {
    setSelectedCity(null);
    setDuel(null);
    setDuelError(null);
  };

  return (
    <div className="app">
      <Background />
      <div className="gradient-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <nav className="top-nav">
        <span className="logo" onClick={handleBack}>
          <span className="logo-icon">&#x2728;</span>
          City Facts Quiz
        </span>
        <div className="lang-switcher">
          {LANGS.map((l) => (
            <button
              key={l.code}
              className={`lang-btn ${lang === l.code ? 'active' : ''}`}
              onClick={() => setLang(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </nav>

      <main>
        {duelLoading ? (
          <div className="quiz-loading">
            <div className="loader" />
            <p>Loading duel challenge...</p>
          </div>
        ) : duelError ? (
          <div className="quiz-error">
            <p>{duelError}</p>
            <button className="btn btn-primary" onClick={handleBack}>
              Back to Cities
            </button>
          </div>
        ) : selectedCity ? (
          <Quiz
            city={selectedCity}
            lang={lang}
            onBack={handleBack}
            duel={duel}
          />
        ) : (
          <CitySelect onSelectCity={setSelectedCity} lang={lang} />
        )}
      </main>
    </div>
  );
}

export default App;
