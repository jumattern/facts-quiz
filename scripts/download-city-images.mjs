/**
 * Download city thumbnail images from Wikipedia into public/cities/
 * Usage: node scripts/download-city-images.mjs
 */
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CITIES = [
  'Zurich', 'Bern', 'Basel', 'Lucerne', 'Geneva', 'Lausanne',
  'Winterthur', 'St. Gallen', 'Lugano', 'Montreux', 'Thun', 'Sion',
  'Schaffhausen', 'Locarno', 'Chur', 'Bellinzona', 'Zermatt', 'Davos',
  'Fribourg', 'Schwyz', 'Olten', 'Frauenfeld', 'Glarus',
  'La Chaux-de-Fonds', 'Altdorf', 'Liestal', 'Einsiedeln', 'Appenzell',
  'Köniz', 'Interlaken', 'Aarau', 'Baden', 'Solothurn', 'Rapperswil',
  'Neuchâtel', 'Biel/Bienne', 'Delémont', 'Sarnen', 'Stans', 'Herisau',
];

// Wikipedia article names (some differ from display names)
const WIKI_NAMES = {
  'St. Gallen': 'St._Gallen',
  'La Chaux-de-Fonds': 'La_Chaux-de-Fonds',
  'Altdorf': 'Altdorf,_Uri',
  'Appenzell': 'Appenzell_(town)',
  'Biel/Bienne': 'Biel/Bienne',
  'Köniz': 'Köniz',
  'Neuchâtel': 'Neuchâtel',
  'Delémont': 'Delémont',
  'Rapperswil': 'Rapperswil',
};

const OUT_DIR = join(import.meta.dirname, '..', 'public', 'cities');
const DELAY = 500; // ms between requests to be polite

function slug(city) {
  return city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadCity(city) {
  const file = join(OUT_DIR, `${slug(city)}.jpg`);
  if (existsSync(file)) {
    console.log(`  ✓ ${city} (already exists)`);
    return true;
  }

  const wikiName = WIKI_NAMES[city] || city;
  const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiName)}`;

  try {
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'SwissQuizApp/1.0 (city image downloader)' },
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();

    // Get the original image URL and request a 640px wide version
    const origUrl = data.originalimage?.source || data.thumbnail?.source;
    if (!origUrl) {
      console.log(`  ✗ ${city}: no image found`);
      return false;
    }

    // Convert to 640px thumbnail
    let imgUrl = origUrl;
    if (origUrl.includes('/commons/')) {
      // Replace any existing size with 640px
      imgUrl = origUrl.replace(/\/(\d+)px-/, '/640px-');
      if (!imgUrl.includes('/640px-')) {
        // Original (no thumb), build thumb URL
        imgUrl = origUrl.replace('/commons/', '/commons/thumb/') + '/640px-' + origUrl.split('/').pop();
      }
    }

    const imgRes = await fetch(imgUrl, {
      headers: { 'User-Agent': 'SwissQuizApp/1.0 (city image downloader)' },
    });
    if (!imgRes.ok) throw new Error(`Image ${imgRes.status} for ${imgUrl}`);

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    writeFileSync(file, buffer);
    console.log(`  ✓ ${city} (${Math.round(buffer.length / 1024)}KB)`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${city}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log(`Downloading ${CITIES.length} city images...\n`);
  let ok = 0;
  for (const city of CITIES) {
    const success = await downloadCity(city);
    if (success) ok++;
    await sleep(DELAY);
  }
  console.log(`\nDone: ${ok}/${CITIES.length} images downloaded to public/cities/`);
}

main();
