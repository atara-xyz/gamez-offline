// Offline readiness UI. Two parts:
//  1) App shell — precached by the service worker (small + reliable). When ready,
//     every map/flag/word game works with no network.
//  2) Photos — the ~2,200 dog/cat/animal images are downloaded on demand into the
//     Cache API (resumable, with progress) so the image games also work offline.
//     They're NOT precached because a 49 MB atomic precache fails if one file
//     hiccups on phone Wi-Fi, which would break offline entirely.
import { useEffect, useMemo, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { QUIZSETS } from './data';

const PHOTO_CACHE = 'geo-photos';
const DONE_KEY = 'geo-photos-cached';

function allPhotoPaths(): string[] {
  const base = import.meta.env.BASE_URL;
  const out: string[] = [];
  for (const set of Object.values(QUIZSETS))
    for (const it of set.items ?? [])
      for (const img of it.images ?? []) out.push(base + img);
  return out;
}

async function pool<T>(items: T[], n: number, work: (t: T) => Promise<void>, onTick: () => void) {
  let i = 0;
  const run = async () => {
    while (i < items.length) {
      const idx = i++;
      try { await work(items[idx]); } catch { /* skip one bad image */ }
      onTick();
    }
  };
  await Promise.all(Array.from({ length: n }, run));
}

export function OfflineStatus() {
  const [open, setOpen] = useState(false);
  const [controlled, setControlled] = useState(
    typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller,
  );
  const {
    offlineReady: [offlineReady],
  } = useRegisterSW();

  const photoPaths = useMemo(allPhotoPaths, []);
  const total = photoPaths.length;
  const [phase, setPhase] = useState<'idle' | 'downloading' | 'done'>('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onCtrl = () => setControlled(!!navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', onCtrl);
    navigator.serviceWorker.ready.then(onCtrl);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onCtrl);
  }, []);

  // Reflect a previously-finished photo download.
  useEffect(() => {
    if (total && Number(localStorage.getItem(DONE_KEY) || 0) >= total) setPhase('done');
  }, [total]);

  // Service workers (and therefore offline mode) only exist on a SECURE origin:
  // https:// or localhost. Over plain http on a LAN IP, the browser disables them
  // — so instead of rendering nothing, explain why offline can't work here.
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return (
      <div className="offline-status">
        <button className="offline-chip warn" onClick={() => setOpen((o) => !o)}>
          ⚠ Offline needs HTTPS
        </button>
        {open && (
          <div className="offline-pop">
            <strong>Offline mode is blocked here</strong>
            <p className="op-note" style={{ borderTop: 'none', paddingTop: 6 }}>
              This page is served over plain <code>http://</code> on a local address,
              so the browser won’t allow saving it for offline use. Open the app over{' '}
              <strong>https://</strong> (or from <code>localhost</code> on the same
              machine) and offline play will work.
            </p>
          </div>
        )}
      </div>
    );
  }

  const appReady = offlineReady || controlled;
  const photosReady = phase === 'done';
  const fullyReady = appReady && (total === 0 || photosReady);
  const mb = Math.round(total * 0.022); // ~22 KB/photo

  async function downloadPhotos() {
    if (!('caches' in window)) return;
    setPhase('downloading');
    setProgress(0);
    const cache = await caches.open(PHOTO_CACHE);
    let done = 0;
    await pool(
      photoPaths,
      8,
      async (url) => {
        const hit = await cache.match(url);
        if (!hit) await cache.add(url);
      },
      () => setProgress(++done),
    );
    localStorage.setItem(DONE_KEY, String(total));
    setPhase('done');
  }

  return (
    <div className="offline-status">
      <button
        className={`offline-chip ${fullyReady ? 'ready' : appReady ? 'partial' : 'saving'}`}
        onClick={() => setOpen((o) => !o)}
        title="Offline status"
      >
        {fullyReady ? '✓ Ready offline' : appReady ? '◐ Offline (photos?)' : '⬇ Saving…'}
      </button>
      {open && (
        <div className="offline-pop">
          <div className="op-line">
            <span className={appReady ? 'ok' : 'wait'}>{appReady ? '✓' : '⏳'}</span>
            <span>
              <strong>Games & maps</strong> {appReady ? 'saved for offline' : 'saving…'}
            </span>
          </div>

          {total > 0 && (
            <div className="op-photos">
              <div className="op-line">
                <span className={photosReady ? 'ok' : 'wait'}>{photosReady ? '✓' : '○'}</span>
                <span>
                  <strong>Animal & breed photos</strong>{' '}
                  {photosReady
                    ? 'saved for offline'
                    : phase === 'downloading'
                      ? `saving ${progress} / ${total}…`
                      : `${total} photos (~${mb} MB) — not saved yet`}
                </span>
              </div>
              {phase === 'downloading' && (
                <div className="op-bar"><span style={{ width: `${(progress / total) * 100}%` }} /></div>
              )}
              {phase !== 'done' && phase !== 'downloading' && (
                <button className="primary" onClick={downloadPhotos}>
                  ⬇ Save photos for offline (~{mb} MB)
                </button>
              )}
            </div>
          )}

          <p className="op-note">
            {fullyReady
              ? 'You can turn off Wi-Fi / go in airplane mode and play everything from the home-screen app. ✈️'
              : 'Tip: keep this open on Wi-Fi until everything shows ✓, then it works fully offline.'}
          </p>
        </div>
      )}
    </div>
  );
}
