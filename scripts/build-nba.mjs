// Builds the NBA dataset for the basketball games. Team facts are curated here;
// logos are fetched once from ESPN's CDN at build time, resized to small PNG, and
// saved to public/nba/<id>.png (PNG so they're in the precache → offline). Writes
// src/data/nba.json. Run: npm run nba
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NBA_DIR = resolve(root, 'public/nba');
const DATA = resolve(root, 'src/data');
mkdirSync(NBA_DIR, { recursive: true });
mkdirSync(DATA, { recursive: true });

// id, name(nickname), city, conf, div, founded, titles, primary/secondary, espn slug
const T = (id, name, city, conf, div, founded, titles, c1, c2, slug) =>
  ({ id, name, city, full: `${city} ${name}`, conf, div, founded, titles, colors: [c1, c2], slug });

const TEAMS = [
  // Eastern — Atlantic
  T('BOS', 'Celtics', 'Boston', 'East', 'Atlantic', 1946, 18, '#007A33', '#BA9653', 'bos'),
  T('BKN', 'Nets', 'Brooklyn', 'East', 'Atlantic', 1967, 0, '#000000', '#FFFFFF', 'bkn'),
  T('NYK', 'Knicks', 'New York', 'East', 'Atlantic', 1946, 2, '#006BB6', '#F58426', 'ny'),
  T('PHI', '76ers', 'Philadelphia', 'East', 'Atlantic', 1949, 3, '#006BB6', '#ED174C', 'phi'),
  T('TOR', 'Raptors', 'Toronto', 'East', 'Atlantic', 1995, 1, '#CE1141', '#000000', 'tor'),
  // Eastern — Central
  T('CHI', 'Bulls', 'Chicago', 'East', 'Central', 1966, 6, '#CE1141', '#000000', 'chi'),
  T('CLE', 'Cavaliers', 'Cleveland', 'East', 'Central', 1970, 1, '#860038', '#FDBB30', 'cle'),
  T('DET', 'Pistons', 'Detroit', 'East', 'Central', 1941, 3, '#C8102E', '#1D42BA', 'det'),
  T('IND', 'Pacers', 'Indiana', 'East', 'Central', 1967, 0, '#002D62', '#FDBB30', 'ind'),
  T('MIL', 'Bucks', 'Milwaukee', 'East', 'Central', 1968, 2, '#00471B', '#EEE1C6', 'mil'),
  // Eastern — Southeast
  T('ATL', 'Hawks', 'Atlanta', 'East', 'Southeast', 1946, 1, '#E03A3E', '#C1D32F', 'atl'),
  T('CHA', 'Hornets', 'Charlotte', 'East', 'Southeast', 1988, 0, '#1D1160', '#00788C', 'cha'),
  T('MIA', 'Heat', 'Miami', 'East', 'Southeast', 1988, 3, '#98002E', '#F9A01B', 'mia'),
  T('ORL', 'Magic', 'Orlando', 'East', 'Southeast', 1989, 0, '#0077C0', '#C4CED4', 'orl'),
  T('WAS', 'Wizards', 'Washington', 'East', 'Southeast', 1961, 1, '#002B5C', '#E31837', 'wsh'),
  // Western — Northwest
  T('DEN', 'Nuggets', 'Denver', 'West', 'Northwest', 1967, 1, '#0E2240', '#FEC524', 'den'),
  T('MIN', 'Timberwolves', 'Minnesota', 'West', 'Northwest', 1989, 0, '#0C2340', '#236192', 'min'),
  T('OKC', 'Thunder', 'Oklahoma City', 'West', 'Northwest', 1967, 1, '#007AC1', '#EF3B24', 'okc'),
  T('POR', 'Trail Blazers', 'Portland', 'West', 'Northwest', 1970, 1, '#E03A3E', '#000000', 'por'),
  T('UTA', 'Jazz', 'Utah', 'West', 'Northwest', 1974, 0, '#002B5C', '#00471B', 'utah'),
  // Western — Pacific
  T('GSW', 'Warriors', 'Golden State', 'West', 'Pacific', 1946, 7, '#1D428A', '#FFC72C', 'gs'),
  T('LAC', 'Clippers', 'Los Angeles', 'West', 'Pacific', 1970, 0, '#C8102E', '#1D428A', 'lac'),
  T('LAL', 'Lakers', 'Los Angeles', 'West', 'Pacific', 1947, 17, '#552583', '#FDB927', 'lal'),
  T('PHX', 'Suns', 'Phoenix', 'West', 'Pacific', 1968, 0, '#1D1160', '#E56020', 'phx'),
  T('SAC', 'Kings', 'Sacramento', 'West', 'Pacific', 1945, 1, '#5A2D81', '#63727A', 'sac'),
  // Western — Southwest
  T('DAL', 'Mavericks', 'Dallas', 'West', 'Southwest', 1980, 1, '#00538C', '#002B5E', 'dal'),
  T('HOU', 'Rockets', 'Houston', 'West', 'Southwest', 1967, 2, '#CE1141', '#000000', 'hou'),
  T('MEM', 'Grizzlies', 'Memphis', 'West', 'Southwest', 1995, 0, '#5D76A9', '#12173F', 'mem'),
  T('NOP', 'Pelicans', 'New Orleans', 'West', 'Southwest', 2002, 0, '#0C2340', '#C8102E', 'no'),
  T('SAS', 'Spurs', 'San Antonio', 'West', 'Southwest', 1967, 5, '#C4CED4', '#000000', 'sa'),
];

function getBuffer(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'geo-games' } }, (r) => {
      if (r.statusCode !== 200) return rej(new Error('http ' + r.statusCode));
      const c = [];
      r.on('data', (b) => c.push(b));
      r.on('end', () => res(Buffer.concat(c)));
    }).on('error', rej);
  });
}

const out = [];
for (const t of TEAMS) {
  try {
    const buf = await getBuffer(`https://a.espncdn.com/i/teamlogos/nba/500/${t.slug}.png`);
    await sharp(buf).resize(256, 256, { fit: 'inside' }).png({ quality: 90 }).toFile(resolve(NBA_DIR, `${t.id}.png`));
    out.push({ ...t, logo: `nba/${t.id}.png` });
    process.stdout.write(`  🏀 ${t.full} (${t.id})\n`);
  } catch (e) {
    console.log(`  ✗ ${t.full}: ${e.message}`);
  }
}
out.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(resolve(DATA, 'nba.json'), JSON.stringify(out));
console.log(`\nWrote nba.json — ${out.length} teams.`);
