import { useState } from 'react';
import { type Country, type Difficulty, DIFFICULTY_LABELS } from './data';
import { CountryGuessGame, type Mode } from './games/CountryGuessGame';
import { Capitals } from './games/Capitals';
import { Cities } from './games/Cities';
import { ImageGuess } from './games/ImageGuess';
import { Wordle } from './games/Wordle';
import { NbaLogo } from './games/NbaLogo';
import { NbaNameAll } from './games/NbaNameAll';
import { NbaClues } from './games/NbaClues';
import { NbaColors } from './games/NbaColors';
import { GeoDash } from './games/GeoDash';
import { BrandLogos } from './games/BrandLogos';
import { DressUp } from './games/DressUp';
import { RetroGames } from './games/RetroGames';
import { SketchIt } from './games/SketchIt';
import { HigherLower } from './games/HigherLower';
import { Countryle } from './games/Countryle';
import { Travle } from './games/Travle';
import { OddOneOut } from './games/OddOneOut';
import { Hangman } from './games/Hangman';
import { MathDrill } from './games/MathDrill';
import { OfflineStatus } from './OfflineStatus';
import { usePlayers } from './players';
import { PlayersModal } from './PlayersModal';

type GameId =
  | Mode | 'capitals' | 'cities' | 'dogs' | 'cats' | 'animals' | 'birds' | 'wordle'
  | 'nbalogo' | 'nbaname' | 'nbaclues' | 'nbacolors' | 'geodash'
  | 'higherlower' | 'countryle' | 'travle' | 'oddoneout' | 'hangman' | 'mathdrill'
  | 'flowers' | 'brands' | 'dressup' | 'retro' | 'sketch';

interface GameDef {
  id: GameId;
  emoji: string;
  title: string;
  blurb: string;
  cat: string;
}

const GAMES: GameDef[] = [
  { id: 'globle', emoji: '🌍', title: 'Globle', blurb: 'Find the mystery country. Guesses glow hotter as you get closer.', cat: 'Geography' },
  { id: 'worldle', emoji: '🗺️', title: 'Worldle', blurb: 'Name the country from its shape. 6 guesses.', cat: 'Geography' },
  { id: 'flagle', emoji: '🚩', title: 'Flagle', blurb: 'Guess the country from its flag. 6 guesses.', cat: 'Geography' },
  { id: 'capitals', emoji: '🏛️', title: 'Capitals', blurb: 'Pick the right capital city. Multiple choice.', cat: 'Geography' },
  { id: 'cities', emoji: '🏙️', title: 'Cities', blurb: 'Zoom in: find cities anywhere in the world.', cat: 'Geography' },
  { id: 'countryle', emoji: '🧭', title: 'Countryle', blurb: 'Guess the country from attribute clues. 6 tries.', cat: 'Geography' },
  { id: 'travle', emoji: '✈️', title: 'Travle', blurb: 'Hop country-to-country by land from start to target.', cat: 'Geography' },
  { id: 'higherlower', emoji: '📊', title: 'Higher or Lower', blurb: 'More or fewer people? Build your streak.', cat: 'Geography' },
  { id: 'oddoneout', emoji: '🧩', title: 'Odd One Out', blurb: 'Three share a trait, one doesn’t. Spot it.', cat: 'Geography' },
  { id: 'dogs', emoji: '🐕', title: 'Dog Breeds', blurb: 'Guess the dog breed from its photos.', cat: 'Nature' },
  { id: 'cats', emoji: '🐈', title: 'Cat Breeds', blurb: 'Guess the cat breed. Origin & temperament hints.', cat: 'Nature' },
  { id: 'animals', emoji: '🦁', title: 'Animals', blurb: 'Hard! Name the species. Taxonomy hints.', cat: 'Nature' },
  { id: 'birds', emoji: '🦜', title: 'Birdle', blurb: 'Name the bird from photos. 117 species worldwide.', cat: 'Nature' },
  { id: 'flowers', emoji: '🌸', title: 'Flowers', blurb: 'Name the flower from photos. 90 kinds + plant-family hints.', cat: 'Nature' },
  { id: 'wordle', emoji: '🔤', title: 'Wordle', blurb: 'Guess the hidden word in 6 tries. Easy=4, Med=5, Hard=6 letters.', cat: 'Words' },
  { id: 'hangman', emoji: '🪢', title: 'Hangman', blurb: 'Guess the word letter by letter before your lives run out.', cat: 'Words' },
  { id: 'mathdrill', emoji: '➗', title: 'Math Drill', blurb: 'Answer as many sums as you can in 60 seconds.', cat: 'Math' },
  { id: 'nbalogo', emoji: '🏀', title: 'NBA Logos', blurb: 'Guess the NBA team from its logo. De-blurs as you guess.', cat: 'Basketball' },
  { id: 'nbaname', emoji: '📋', title: 'Name the NBA', blurb: 'Name all 30 NBA teams from memory.', cat: 'Basketball' },
  { id: 'nbaclues', emoji: '🔎', title: 'NBA Clues', blurb: 'Guess the team from clues: conference, city, titles…', cat: 'Basketball' },
  { id: 'nbacolors', emoji: '🎨', title: 'NBA Colors', blurb: 'Guess the NBA team from its colors. Tricky!', cat: 'Basketball' },
  { id: 'geodash', emoji: '🟦', title: 'Geo Dash', blurb: 'One-touch runner — cube, ship, wave & ball modes, coins. Speeds up!', cat: 'Arcade' },
  { id: 'retro', emoji: '🕹️', title: 'Retro Games', blurb: 'C64-style sports meet: 100m Sprint & Long Jump.', cat: 'Arcade' },
  { id: 'dressup', emoji: '👗', title: 'Dress to Impress', blurb: 'Style the model to the theme and hit the runway.', cat: 'Arcade' },
  { id: 'sketch', emoji: '✏️', title: 'Sketch It', blurb: 'Draw the prompt — get rated on how close you got. Drawing Wordle!', cat: 'Arcade' },
  { id: 'brands', emoji: '🏷️', title: 'Brand Logos', blurb: 'Guess the brand from its logo. 80+ brands, de-blurs as you guess.', cat: 'Brands' },
];
const CATEGORIES = ['Arcade', 'Geography', 'Words', 'Math', 'Nature', 'Basketball', 'Brands'];

export default function App() {
  const [game, setGame] = useState<GameId | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(1);
  const [cityCountry, setCityCountry] = useState<Country | null>(null);
  const [showPlayers, setShowPlayers] = useState(false);
  const players = usePlayers();

  // Games report a 0–100 round score; record it for the active player.
  function record(_win: boolean, points: number) {
    if (game) players.recordRound(game, points);
  }

  function exploreCities(c: Country) {
    setCityCountry(c);
    setGame('cities');
  }

  function openGame(id: GameId) {
    if (id !== 'cities') setCityCountry(null);
    setGame(id);
  }

  return (
    <div className="app">
      <header>
        <button className="logo" onClick={() => setGame(null)}>
          🌐 Geo Games
        </button>
        <OfflineStatus />
        <div className="scores">
          {players.players.map((p) => (
            <button
              key={p.id}
              className={`score-chip ${p.id === players.activeId ? 'active' : ''}`}
              onClick={() => players.setActive(p.id)}
              title="Tap to set the active player"
            >
              {p.name}: <strong>{p.points}</strong>
              <span className="muted">/{p.rounds}</span>
            </button>
          ))}
          <button className="score-chip add" onClick={() => setShowPlayers(true)}>👥 Manage</button>
        </div>
        <div className="difficulty">
          {([1, 2, 3] as Difficulty[]).map((d) => (
            <button
              key={d}
              className={d === difficulty ? 'on' : ''}
              onClick={() => setDifficulty(d)}
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
      </header>

      {game === null ? (
        <main className="menu">
          <p className="tagline">
            Learn the world the fun way — fully offline. Pick a game:
          </p>
          {CATEGORIES.map((cat) => (
            <section key={cat} className="cat-section">
              <h2 className="cat-title">{cat}</h2>
              <div className="game-grid">
                {GAMES.filter((g) => g.cat === cat).map((g) => (
                  <button key={g.id} className="game-tile" onClick={() => openGame(g.id)}>
                    <span className="tile-emoji">{g.emoji}</span>
                    <span className="tile-title">{g.title}</span>
                    <span className="tile-blurb">{g.blurb}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
          {players.players.length === 1 && (
            <p className="hint center">
              Playing with the kids? Tap <strong>👥 Manage</strong> above to add players for pass-and-play.
            </p>
          )}
        </main>
      ) : (
        <main className="play">
          <div className="play-head">
            <button className="ghost" onClick={() => setGame(null)}>← Menu</button>
            <h1>
              {GAMES.find((g) => g.id === game)?.emoji}{' '}
              {GAMES.find((g) => g.id === game)?.title}
            </h1>
            {players.players.length > 1 && (
              <span className="turn">🎲 {players.active.name}’s turn</span>
            )}
          </div>

          {(game === 'globle' || game === 'worldle' || game === 'flagle') && (
            <CountryGuessGame
              key={game + difficulty}
              mode={game}
              difficulty={difficulty}
              onResult={record}
              onExploreCities={exploreCities}
            />
          )}
          {game === 'capitals' && (
            <Capitals key={'cap' + difficulty} difficulty={difficulty} onResult={record} />
          )}
          {game === 'cities' && (
            <Cities
              key={'cities' + (cityCountry?.id ?? 'world') + difficulty}
              country={cityCountry}
              difficulty={difficulty}
              onResult={record}
            />
          )}
          {(game === 'dogs' || game === 'cats' || game === 'animals' || game === 'birds' || game === 'flowers') && (
            <ImageGuess
              key={game + difficulty}
              setKey={game}
              difficulty={difficulty}
              onResult={record}
            />
          )}
          {game === 'wordle' && (
            <Wordle key={'wordle' + difficulty} difficulty={difficulty} onResult={record} />
          )}
          {game === 'nbalogo' && (
            <NbaLogo key={'nbalogo' + difficulty} difficulty={difficulty} onResult={record} />
          )}
          {game === 'nbaname' && <NbaNameAll key="nbaname" onResult={record} />}
          {game === 'nbaclues' && (
            <NbaClues key={'nbaclues' + difficulty} difficulty={difficulty} onResult={record} />
          )}
          {game === 'nbacolors' && (
            <NbaColors key={'nbacolors' + difficulty} difficulty={difficulty} onResult={record} />
          )}
          {game === 'geodash' && <GeoDash key={'geodash' + difficulty} difficulty={difficulty} />}
          {game === 'higherlower' && <HigherLower key={'hl' + difficulty} difficulty={difficulty} onResult={record} />}
          {game === 'countryle' && <Countryle key={'cle' + difficulty} difficulty={difficulty} onResult={record} />}
          {game === 'travle' && <Travle key={'trv' + difficulty} difficulty={difficulty} onResult={record} />}
          {game === 'oddoneout' && <OddOneOut key={'odd' + difficulty} difficulty={difficulty} onResult={record} />}
          {game === 'hangman' && <Hangman key={'hm' + difficulty} difficulty={difficulty} onResult={record} />}
          {game === 'mathdrill' && <MathDrill key={'md' + difficulty} difficulty={difficulty} onResult={record} />}
          {game === 'brands' && <BrandLogos key={'br' + difficulty} difficulty={difficulty} onResult={record} />}
          {game === 'dressup' && <DressUp key="dressup" onResult={record} />}
          {game === 'retro' && <RetroGames key="retro" />}
          {game === 'sketch' && <SketchIt key={'sketch' + difficulty} difficulty={difficulty} onResult={record} />}
        </main>
      )}

      {showPlayers && (
        <PlayersModal
          players={players.players}
          activeId={players.activeId}
          onClose={() => setShowPlayers(false)}
          setActive={players.setActive}
          addPlayer={players.addPlayer}
          removePlayer={players.removePlayer}
          renamePlayer={players.renamePlayer}
          resetScores={players.resetScores}
        />
      )}

      <footer>
        <span>Offline geography suite · {difficulty === 1 ? 'Easy mode — great for younger kids' : DIFFICULTY_LABELS[difficulty] + ' mode'}</span>
      </footer>
    </div>
  );
}
