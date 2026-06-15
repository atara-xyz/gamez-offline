// Dress to Impress — style the model to match a theme, then get scored. Pure SVG
// (no assets). Pick a top, bottom, shoes, hair and accessory; each piece has tags;
// the more tags matching the round's theme, the higher the runway score.
import { useState } from 'react';
import { useEnterToAdvance, useRoundPick } from '../ui';

type Slot = 'hair' | 'top' | 'bottom' | 'shoes' | 'acc';
interface Piece { id: string; name: string; color: string; tags: string[]; }

const PIECES: Record<Slot, Piece[]> = {
  hair: [
    { id: 'h1', name: 'Sleek Black', color: '#1c1c22', tags: ['formal', 'classy', 'goth'] },
    { id: 'h2', name: 'Blonde Waves', color: '#e8c66a', tags: ['beach', 'summer', 'party'] },
    { id: 'h3', name: 'Pink Bun', color: '#ff6fae', tags: ['party', 'cute', 'neon'] },
    { id: 'h4', name: 'Fiery Red', color: '#d6442a', tags: ['bold', 'autumn', 'party'] },
    { id: 'h5', name: 'Icy Blue', color: '#7fd4ff', tags: ['winter', 'neon', 'cool'] },
  ],
  top: [
    { id: 't1', name: 'Ball Gown Bodice', color: '#b03a6e', tags: ['formal', 'classy', 'royal'] },
    { id: 't2', name: 'Neon Crop', color: '#39ff14', tags: ['party', 'neon', 'summer'] },
    { id: 't3', name: 'Cozy Sweater', color: '#c9883a', tags: ['winter', 'cozy', 'autumn'] },
    { id: 't4', name: 'Leather Jacket', color: '#2a2a30', tags: ['bold', 'goth', 'cool'] },
    { id: 't5', name: 'Floral Blouse', color: '#ff9ecb', tags: ['spring', 'cute', 'beach'] },
    { id: 't6', name: 'Sporty Tee', color: '#3aa0ff', tags: ['sporty', 'summer', 'cool'] },
  ],
  bottom: [
    { id: 'b1', name: 'Flowing Skirt', color: '#7a4fd6', tags: ['formal', 'classy', 'royal'] },
    { id: 'b2', name: 'Ripped Jeans', color: '#3f6bb0', tags: ['cool', 'sporty', 'bold'] },
    { id: 'b3', name: 'Neon Shorts', color: '#ff2d6f', tags: ['party', 'neon', 'summer'] },
    { id: 'b4', name: 'Wool Trousers', color: '#6a5a3a', tags: ['winter', 'cozy', 'autumn'] },
    { id: 'b5', name: 'Tutu', color: '#ffd1e8', tags: ['cute', 'party', 'spring'] },
  ],
  shoes: [
    { id: 's1', name: 'Glass Heels', color: '#cfe8ff', tags: ['formal', 'classy', 'royal'] },
    { id: 's2', name: 'Sneakers', color: '#ffffff', tags: ['sporty', 'cool', 'summer'] },
    { id: 's3', name: 'Combat Boots', color: '#1c1c22', tags: ['bold', 'goth', 'autumn'] },
    { id: 's4', name: 'Neon Platforms', color: '#b14dff', tags: ['party', 'neon', 'cute'] },
    { id: 's5', name: 'Fur Boots', color: '#e8e2d0', tags: ['winter', 'cozy'] },
  ],
  acc: [
    { id: 'a1', name: 'Tiara', color: '#ffe27a', tags: ['royal', 'formal', 'classy'] },
    { id: 'a2', name: 'Sunglasses', color: '#222', tags: ['summer', 'cool', 'beach'] },
    { id: 'a3', name: 'Glow Necklace', color: '#39ff14', tags: ['neon', 'party'] },
    { id: 'a4', name: 'Scarf', color: '#d6442a', tags: ['winter', 'cozy', 'autumn'] },
    { id: 'a5', name: 'Flower Crown', color: '#ff8fd0', tags: ['spring', 'cute', 'beach'] },
  ],
};

const THEMES = [
  { name: 'Royal Gala 👑', tags: ['formal', 'classy', 'royal'] },
  { name: 'Neon Night Party 🪩', tags: ['party', 'neon', 'cute'] },
  { name: 'Winter Wonderland ❄️', tags: ['winter', 'cozy', 'cool'] },
  { name: 'Beach Day 🏖️', tags: ['beach', 'summer', 'sporty'] },
  { name: 'Goth Glam 🖤', tags: ['goth', 'bold', 'cool'] },
  { name: 'Spring Bloom 🌸', tags: ['spring', 'cute', 'classy'] },
];

const SLOTS: Slot[] = ['hair', 'top', 'bottom', 'shoes', 'acc'];
const SLOT_LABEL: Record<Slot, string> = { hair: 'Hair', top: 'Top', bottom: 'Bottom', shoes: 'Shoes', acc: 'Accessory' };

export function DressUp({
  seed,
  onResult,
}: {
  seed?: number;
  onResult: (win: boolean, points: number) => void;
}) {
  const [round, setRound] = useState(0);
  const theme = useRoundPick(THEMES, round, { seed, key: (t) => t.name });

  const [outfit, setOutfit] = useState<Record<Slot, Piece | null>>({ hair: null, top: null, bottom: null, shoes: null, acc: null });
  const [tab, setTab] = useState<Slot>('hair');
  const [scored, setScored] = useState<number | null>(null);

  const chosen = SLOTS.filter((s) => outfit[s]).length;

  function walk() {
    let match = 0, total = 0;
    for (const s of SLOTS) {
      const p = outfit[s];
      if (!p) continue;
      total += 1;
      if (p.tags.some((t) => theme.tags.includes(t))) match += 1;
    }
    const score = Math.round((100 * match) / SLOTS.length);
    setScored(score);
    onResult(score >= 60, score);
  }
  function next() {
    setOutfit({ hair: null, top: null, bottom: null, shoes: null, acc: null });
    setTab('hair'); setScored(null); setRound((r) => r + 1);
  }
  useEnterToAdvance(scored != null, next);

  const o = outfit;
  return (
    <div className="game dressup">
      <div className="du-theme">Theme: <strong>{theme.name}</strong></div>

      <div className="du-main">
        {/* SVG model */}
        <svg className="du-model" viewBox="0 0 160 280" role="img" aria-label="Model">
          <ellipse cx="80" cy="262" rx="46" ry="9" fill="#0a1424" />
          {/* legs */}
          <rect x="68" y="170" width="10" height="74" rx="5" fill="#e3b58f" />
          <rect x="82" y="170" width="10" height="74" rx="5" fill="#e3b58f" />
          {/* shoes */}
          <rect x="63" y="240" width="18" height="12" rx="4" fill={o.shoes?.color ?? '#26304a'} />
          <rect x="79" y="240" width="18" height="12" rx="4" fill={o.shoes?.color ?? '#26304a'} />
          {/* bottom */}
          <path d="M60 168 L100 168 L104 210 L56 210 Z" fill={o.bottom?.color ?? '#26304a'} />
          {/* arms */}
          <rect x="48" y="92" width="9" height="72" rx="4" fill="#e3b58f" />
          <rect x="103" y="92" width="9" height="72" rx="4" fill="#e3b58f" />
          {/* top */}
          <path d="M56 88 L104 88 L100 172 L60 172 Z" fill={o.top?.color ?? '#26304a'} />
          {/* head */}
          <circle cx="80" cy="62" r="24" fill="#e9bd96" />
          {/* hair */}
          <path d="M54 60 a26 26 0 0 1 52 0 q-6 -22 -26 -22 q-20 0 -26 22 Z" fill={o.hair?.color ?? '#3a3a44'} />
          {/* accessory dot */}
          {o.acc && <circle cx="80" cy="40" r="6" fill={o.acc.color} />}
        </svg>

        {/* wardrobe */}
        <div className="du-wardrobe">
          <div className="du-tabs">
            {SLOTS.map((s) => (
              <button key={s} className={`du-tab ${tab === s ? 'on' : ''} ${outfit[s] ? 'filled' : ''}`} onClick={() => setTab(s)}>
                {SLOT_LABEL[s]}
              </button>
            ))}
          </div>
          <div className="du-pieces">
            {PIECES[tab].map((p) => (
              <button key={p.id} className={`du-piece ${outfit[tab]?.id === p.id ? 'on' : ''}`}
                onClick={() => setOutfit((prev) => ({ ...prev, [tab]: p }))} disabled={scored != null}>
                <span className="du-swatch" style={{ background: p.color }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {scored == null ? (
        <button className="primary big" disabled={chosen < 3} onClick={walk}>
          {chosen < 3 ? `Pick ${3 - chosen} more…` : '💃 Hit the runway!'}
        </button>
      ) : (
        <div className="round-end">
          <p className={scored >= 60 ? 'result win' : 'result lose'}>
            {scored >= 80 ? 'Slay! 🌟' : scored >= 60 ? 'Looking good! ✨' : 'Off-theme 😬'} — {scored}/100
          </p>
          <p className="hint">Theme wanted: {theme.tags.join(', ')}</p>
          <button className="primary big" onClick={next}>▶ New theme</button>
        </div>
      )}
    </div>
  );
}
