// Players with cross-session persistence (localStorage). Tracks cumulative skill
// points, rounds, and per-game breakdown so we can keep a running family score.
import { useCallback, useEffect, useState } from 'react';

export interface GameStat {
  points: number;
  rounds: number;
  best: number; // best single-round score
}
export interface Player {
  id: string;
  name: string;
  points: number;
  rounds: number;
  perGame: Record<string, GameStat>;
}

const KEY = 'geo-players-v1';
let counter = 0;
const newId = () => `p${Date.now().toString(36)}${(counter++).toString(36)}`;

interface Store {
  players: Player[];
  activeId: string;
}

function freshPlayer(name: string): Player {
  return { id: newId(), name, points: 0, rounds: 0, perGame: {} };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Store;
      if (s.players?.length) return s;
    }
  } catch {
    /* ignore corrupt storage */
  }
  const p = freshPlayer('Player 1');
  return { players: [p], activeId: p.id };
}

export function usePlayers() {
  const [store, setStore] = useState<Store>(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* quota */ }
  }, [store]);

  const { players, activeId } = store;
  const active = players.find((p) => p.id === activeId) ?? players[0];

  const setActive = useCallback((id: string) => setStore((s) => ({ ...s, activeId: id })), []);

  const addPlayer = useCallback((name?: string) => {
    setStore((s) => {
      const p = freshPlayer(name?.trim() || `Player ${s.players.length + 1}`);
      return { players: [...s.players, p], activeId: p.id };
    });
  }, []);

  const removePlayer = useCallback((id: string) => {
    setStore((s) => {
      if (s.players.length <= 1) return s; // keep at least one
      const players = s.players.filter((p) => p.id !== id);
      const activeId = s.activeId === id ? players[0].id : s.activeId;
      return { players, activeId };
    });
  }, []);

  const renamePlayer = useCallback((id: string, name: string) => {
    setStore((s) => ({ ...s, players: s.players.map((p) => (p.id === id ? { ...p, name } : p)) }));
  }, []);

  const resetScores = useCallback(() => {
    setStore((s) => ({ ...s, players: s.players.map((p) => ({ ...p, points: 0, rounds: 0, perGame: {} })) }));
  }, []);

  /** Record a finished round for the active player, then return the next active id
   *  (round-robin) for pass-and-play. */
  const recordRound = useCallback((game: string, points: number): void => {
    setStore((s) => {
      const players = s.players.map((p) => {
        if (p.id !== s.activeId) return p;
        const g = p.perGame[game] ?? { points: 0, rounds: 0, best: 0 };
        return {
          ...p,
          points: p.points + points,
          rounds: p.rounds + 1,
          perGame: {
            ...p.perGame,
            [game]: { points: g.points + points, rounds: g.rounds + 1, best: Math.max(g.best, points) },
          },
        };
      });
      // round-robin to the next player for pass-and-play
      const idx = players.findIndex((p) => p.id === s.activeId);
      const nextId = players.length > 1 ? players[(idx + 1) % players.length].id : s.activeId;
      return { players, activeId: nextId };
    });
  }, []);

  return { players, active, activeId, setActive, addPlayer, removePlayer, renamePlayer, resetScores, recordRound };
}

export const avg = (p: Player) => (p.rounds ? Math.round(p.points / p.rounds) : 0);
