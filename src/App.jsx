import { useState } from 'react';
import CitySelect from './components/CitySelect';
import Quiz from './components/Quiz';
import './App.css';

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'fr', label: 'FR' },
  { code: 'it', label: 'IT' },
];

function App() {
  const [selectedCity, setSelectedCity] = useState(null);
  const [lang, setLang] = useState('en');

  return (
    <div className="app">
      <nav className="top-nav">
        <span className="logo" onClick={() => setSelectedCity(null)}>
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
        {selectedCity ? (
          <Quiz
            city={selectedCity}
            lang={lang}
            onBack={() => setSelectedCity(null)}
          />
        ) : (
          <CitySelect onSelectCity={setSelectedCity} lang={lang} />
        )}
      </main>
    </div>
  );
}

export default App;
