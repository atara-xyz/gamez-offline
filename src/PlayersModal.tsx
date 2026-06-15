// Player management modal: rename, add, remove, set active, reset — persisted.
import { useState } from 'react';
import { type Player, avg } from './players';

export function PlayersModal({
  players,
  activeId,
  onClose,
  setActive,
  addPlayer,
  removePlayer,
  renamePlayer,
  resetScores,
}: {
  players: Player[];
  activeId: string;
  onClose: () => void;
  setActive: (id: string) => void;
  addPlayer: (name?: string) => void;
  removePlayer: (id: string) => void;
  renamePlayer: (id: string, name: string) => void;
  resetScores: () => void;
}) {
  const [newName, setNewName] = useState('');
  const ranked = [...players].sort((a, b) => b.points - a.points);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>👥 Players</h2>
          <button className="ghost" onClick={onClose}>✕</button>
        </div>
        <p className="hint">Scores are saved on this device and persist between sessions.</p>

        <div className="player-list">
          {ranked.map((p, i) => (
            <div key={p.id} className={`player-row ${p.id === activeId ? 'active' : ''}`}>
              <span className="rank">{i + 1}</span>
              <input
                className="player-name"
                value={p.name}
                onChange={(e) => renamePlayer(p.id, e.target.value)}
                maxLength={16}
              />
              <span className="player-stat"><strong>{p.points}</strong><small>pts</small></span>
              <span className="player-stat"><strong>{avg(p)}</strong><small>avg</small></span>
              <span className="player-stat"><strong>{p.rounds}</strong><small>rounds</small></span>
              <button
                className={`pill ${p.id === activeId ? 'on' : ''}`}
                onClick={() => setActive(p.id)}
              >
                {p.id === activeId ? '● active' : 'set active'}
              </button>
              <button
                className="ghost danger"
                disabled={players.length <= 1}
                onClick={() => removePlayer(p.id)}
                title={players.length <= 1 ? 'Keep at least one player' : 'Remove'}
              >
                🗑
              </button>
            </div>
          ))}
        </div>

        <div className="add-player">
          <input
            value={newName}
            placeholder="New player name…"
            maxLength={16}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) { addPlayer(newName); setNewName(''); } }}
          />
          <button className="primary" onClick={() => { addPlayer(newName); setNewName(''); }}>+ Add player</button>
        </div>

        <div className="modal-foot">
          <button className="ghost danger" onClick={resetScores}>Reset all scores</button>
          <button className="primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
