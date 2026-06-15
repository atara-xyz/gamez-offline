// Bakes the offline word lists for the Wordle/Hangman games. Fetched once at build
// time (internet), frozen into src/data/words.json so runtime stays offline.
//   answers[len] = common, kid-friendly words (Google 10k ∩ dictionary, no plurals,
//                  NO proper nouns — names & places are filtered out)
//   allowed[len] = the dictionary for that length, minus proper nouns (valid guesses)
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import https from 'node:https';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = resolve(root, 'src/data');
const CACHE = resolve(root, 'scripts');
mkdirSync(DATA, { recursive: true });

const LENGTHS = [4, 5, 6];

function getText(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'geo-games' } }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location)
        return getText(r.headers.location).then(res, rej);
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => res(d));
    }).on('error', rej);
  });
}

// Cache the big downloads locally so re-runs are instant/offline.
async function cached(name, url) {
  const p = resolve(CACHE, name);
  if (existsSync(p)) return readFileSync(p, 'utf8');
  console.log('  fetching', name, '…');
  const t = await getText(url);
  writeFileSync(p, t);
  return t;
}

const dict = await cached(
  'words_alpha.txt',
  'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt',
);
const common = await cached(
  'google-10000-english.txt',
  'https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt',
);

const onlyAZ = (w) => /^[a-z]+$/.test(w);
const dictWords = new Set(dict.split(/\r?\n/).map((w) => w.trim().toLowerCase()).filter(onlyAZ));
const commonList = common.split(/\r?\n/).map((w) => w.trim().toLowerCase()).filter(onlyAZ);
const commonSet = new Set(commonList);

// ---- proper-noun blocklist: names & places ---------------------------------
// US baby-names dataset (year,name,percent,sex) — comprehensive given names.
const babyCsv = await cached(
  'baby-names.csv',
  'https://raw.githubusercontent.com/hadley/data-baby-names/master/baby-names.csv',
);
const worldCountries = require('world-countries');
const allCities = require('all-the-cities');

const lc = (s) => String(s).trim().toLowerCase();
const block = new Set();
// Given names: only block names that were genuinely POPULAR (max yearly share
// ≥ 0.2%). This catches John/Mary/David/Diana while leaving the long tail of rare
// word-names (Price, River, Queen, Stone…) that the dataset also lists.
const NAME_MIN = 0.002;
const namePct = {};
for (const line of babyCsv.split(/\r?\n/).slice(1)) {
  const m = line.split(',');
  const name = (m[1] || '').replace(/"/g, '').trim().toLowerCase();
  const pct = parseFloat(m[2]);
  if (name && pct >= 0) namePct[name] = Math.max(namePct[name] || 0, pct);
}
for (const [name, pct] of Object.entries(namePct)) if (pct >= NAME_MIN) block.add(name);
// countries, capitals, alt spellings. NOT demonyms — nationality adjectives
// (french, german, polish, dutch, thai…) are everyday words, not names/places.
for (const c of worldCountries) {
  block.add(lc(c.name.common));
  block.add(lc(c.name.official));
  for (const a of c.altSpellings || []) block.add(lc(a));
  for (const cap of c.capital || []) block.add(lc(cap));
}
// major cities (people-recognizable places) — high threshold avoids blocking the
// many small towns that share common words (Bath, Reading, Nice, Same, …).
for (const city of allCities) if (city.population >= 500000) block.add(lc(city.name));
// continents, oceans, US states, misc places
for (const p of [
  'africa','asia','europe','america','antarctica','oceania','australia','arctic',
  'pacific','atlantic','indian','mediterranean','sahara','amazon','everest','nile',
  'alabama','alaska','arizona','arkansas','colorado','florida','georgia','hawaii',
  'idaho','illinois','indiana','iowa','kansas','kentucky','maine','maryland',
  'michigan','minnesota','mississippi','missouri','montana','nebraska','nevada',
  'ohio','oklahoma','oregon','tennessee','texas','utah','vermont','virginia',
  'washington','wisconsin','wyoming',
]) block.add(p);

// Allowlist: words that are ALSO everyday English — keep these even though they
// appear in the blocklist as a name or place. Curated from the actual removed set.
const allow = new Set([
  // dual-use common words & nouns
  'same','sale','male','nice','split','cork','china','turkey','page','star','island',
  'bill','else','hope','rose','faith','carry','bird','bell','lane','storm','gray',
  'shell','pearl','grace','honor','glad','candy','glory','dawn','doll','lucky','cherry',
  'cookie','robin','carol','amber','camel','ruby','honey','sandy','sunny','olive',
  'easter','coral','fancy','bride','deny','ivory','aurora','holly','mercy','queens',
  'kitty','merry','brook','eden','belle','bunny','jewel','velvet','gale','willow',
  'daisy','myrtle','jade','berry','angel','jean','penny','gene','happy','meta','heath',
  'dale','glen','cliff','ford','kent','reed','wade','dean','bay','sound','jersey',
  'marina','blair','devon','coral','salem','brooks','perry','barry','curry',
  // months + more dual-use words found in the removed set
  'march','may','june','april','august','autumn','chase','earl','lance','mason',
  'hunter','amber','wells','noble','grant','royal','forest','chance','stone','brown',
  'hill','wood','field','rock','river','spring','green','queen','prince','duke',
  // common given-words also used as words
  'mark','will','jack','art','ray','joy','ivy','lily','iris','sage','basil','summer',
  'sky','heather','hazel','drew','miles','max','ace','rich','rod','herb','victor',
  'baker','tabby','dolly',
]);
for (const a of allow) block.delete(a);

const isProperNoun = (w) => block.has(w);

// Drop simple plurals/3rd-person -s (answer is "never a simple plural").
const isPlural = (w) =>
  w.endsWith('s') && !w.endsWith('ss') && (commonSet.has(w.slice(0, -1)) || dictWords.has(w.slice(0, -1)));

const answers = {};
const allowed = {};
const removed = [];
for (const len of LENGTHS) {
  // common answers: in the frequency list, in the dictionary, not plural, not a name/place
  const ans = commonList.filter(
    (w) => w.length === len && dictWords.has(w) && !isPlural(w) && !isProperNoun(w),
  );
  for (const w of commonList) if (w.length === len && dictWords.has(w) && isProperNoun(w)) removed.push(w);
  answers[len] = [...new Set(ans)];
  // allowed guesses: dictionary words of this length, minus proper nouns, plus answers
  const all = new Set(answers[len]);
  for (const w of dictWords) if (w.length === len && !isProperNoun(w)) all.add(w);
  allowed[len] = [...all].sort();
}

const out = { lengths: LENGTHS, answers, allowed };
const json = JSON.stringify(out);
writeFileSync(resolve(DATA, 'words.json'), json);
console.log('words.json', (Buffer.byteLength(json) / 1024).toFixed(0), 'KB');
console.log(`Blocked ${block.size} names/places; removed ${removed.length} from answers.`);
console.log('  e.g.', [...new Set(removed)].slice(0, 30).join(', '));
for (const len of LENGTHS)
  console.log(`  ${len}-letter: ${answers[len].length} answers, ${allowed[len].length} allowed`);
