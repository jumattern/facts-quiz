import { useEffect, useState } from 'react';
import { getCities } from '../supabase';
import Leaderboard from './Leaderboard';
import { t } from '../i18n';

// City card images — Wikipedia Commons thumbnails (real Swiss city photos)
const CITY_IMAGES = {
  'Zurich': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Altstadt_Z%C3%BCrich_2015.jpg/640px-Altstadt_Z%C3%BCrich_2015.jpg',
  'Bern': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Bundeshaus_Bern_2009%2C_Flooffy.jpg/640px-Bundeshaus_Bern_2009%2C_Flooffy.jpg',
  'Basel': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Basel_-_M%C3%BCnsterpfalz1.jpg/640px-Basel_-_M%C3%BCnsterpfalz1.jpg',
  'Lucerne': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/2009_08_24_06262_Lucerne.jpg/640px-2009_08_24_06262_Lucerne.jpg',
  'Geneva': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Geneve_2005_001_Ork.ch.jpg/640px-Geneve_2005_001_Ork.ch.jpg',
  'Lausanne': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Lausanne_Wiki.jpg/640px-Lausanne_Wiki.jpg',
  'Winterthur': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Blick_auf_die_Winterthurer_Altstadt.jpg/640px-Blick_auf_die_Winterthurer_Altstadt.jpg',
  'St. Gallen': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/St.Gallen_vonDreiweieren_09.jpg/640px-St.Gallen_vonDreiweieren_09.jpg',
  'Lugano': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Lago_di_Lugano_at_Sunset_%28cropped_2%29.jpg/640px-Lago_di_Lugano_at_Sunset_%28cropped_2%29.jpg',
  'Montreux': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Montreux_%28Svizzera%29_Panoramica_del_centro_della_citt%C3%A0_dal_lago.jpg/640px-Montreux_%28Svizzera%29_Panoramica_del_centro_della_citt%C3%A0_dal_lago.jpg',
  'Thun': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/1_thun_castle_view_2012.jpg/640px-1_thun_castle_view_2012.jpg',
  'Sion': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Sion_panoramic_view.jpg/640px-Sion_panoramic_view.jpg',
  'Schaffhausen': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/1_schaffhausen_2012.jpg/640px-1_schaffhausen_2012.jpg',
  'Locarno': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Locarno_porto_-_panoramio.jpg/640px-Locarno_porto_-_panoramio.jpg',
  'Chur': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/View_of_Chur.jpg/640px-View_of_Chur.jpg',
  'Bellinzona': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Town_and_Castelgrande_castle_of_Bellinzona.jpg/640px-Town_and_Castelgrande_castle_of_Bellinzona.jpg',
  'Zermatt': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/1_zermatt_evening_2022.jpg/640px-1_zermatt_evening_2022.jpg',
  'Davos': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/City_of_Davos.jpg/640px-City_of_Davos.jpg',
  'Fribourg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Panorama_Fribourg_107.JPG/640px-Panorama_Fribourg_107.JPG',
  'Schwyz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Frauenkloster_www.f64.ch-1.jpg/640px-Frauenkloster_www.f64.ch-1.jpg',
  'Olten': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Picswiss_SO-18-02.jpg/640px-Picswiss_SO-18-02.jpg',
  'Frauenfeld': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/20080507_1708MESZ_Schloss_Frauenfeld_1680x1050_HDR.jpg/640px-20080507_1708MESZ_Schloss_Frauenfeld_1680x1050_HDR.jpg',
  'Glarus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Landsgemeinde_Glarus%2C_2009.jpg/640px-Landsgemeinde_Glarus%2C_2009.jpg',
  'La Chaux-de-Fonds': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/La_Chaux_de_Fonds.jpg/640px-La_Chaux_de_Fonds.jpg',
  'Altdorf': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Altdorf_Ortskern.JPG/640px-Altdorf_Ortskern.JPG',
  'Liestal': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Vorstadt-2000.jpg/640px-Vorstadt-2000.jpg',
  'Einsiedeln': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Einsiedeln-Katzenstrick.jpg/640px-Einsiedeln-Katzenstrick.jpg',
  'Appenzell': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Aerial_View_of_Appenzell_14.02.2008_14-45-40.JPG/640px-Aerial_View_of_Appenzell_14.02.2008_14-45-40.JPG',
  'Köniz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Koeniz_Schloss.jpg/640px-Koeniz_Schloss.jpg',
  'Interlaken': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Goldswil-Viadukt_Panorama_mit_Interlaken_im_Hintergrund_2.jpg/640px-Goldswil-Viadukt_Panorama_mit_Interlaken_im_Hintergrund_2.jpg',
  'Aarau': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Aarau_Altstadt.jpg/640px-Aarau_Altstadt.jpg',
  'Baden': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Baden-1803-1819.png/640px-Baden-1803-1819.png',
  'Solothurn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Solothurn_2023.jpg/640px-Solothurn_2023.jpg',
  'Rapperswil': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Rapperswil_-_Seedamm_-_Holzbr%C3%BCcke_-_Etzel_Kulm_2010-10-21_16-39-22.JPG/640px-Rapperswil_-_Seedamm_-_Holzbr%C3%BCcke_-_Etzel_Kulm_2010-10-21_16-39-22.JPG',
  'Neuchâtel': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Vuevilledeneuchatel.jpg/640px-Vuevilledeneuchatel.jpg',
  'Biel/Bienne': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Picswiss_BE-98-20_Biel-_Stadthaus_und_Polizei_%28Burgplatz%29.jpg/640px-Picswiss_BE-98-20_Biel-_Stadthaus_und_Polizei_%28Burgplatz%29.jpg',
  'Delémont': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/2006-Delsberg-Chateau-Eglise.jpg/640px-2006-Delsberg-Chateau-Eglise.jpg',
  'Sarnen': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Sarnen-See.jpg/640px-Sarnen-See.jpg',
  'Stans': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Stans_rathaus_3_thm.JPG/640px-Stans_rathaus_3_thm.JPG',
  'Herisau': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Herisau.jpg/640px-Herisau.jpg',
  'Switzerland': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Matterhorn-EastAndNorthside-viewedFromZermworatt.JPG/640px-Matterhorn-EastAndNorthside-viewedFromZermworatt.JPG',
};

function getCityImageUrl(city) {
  return CITY_IMAGES[city] || `https://picsum.photos/seed/${encodeURIComponent(city)}/640/360`;
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
