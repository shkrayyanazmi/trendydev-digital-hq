"use client";

import { useMemo, useState } from "react";

type PlayerId = 0 | 1 | 2 | 3;

type Token = {
  id: number;
  progress: number; // -1 = base, 0-51 = board, 52-57 = home lane, 57 = finished
};

type PlayerState = {
  id: PlayerId;
  name: string;
  color: string;
  startIndex: number;
  tokens: Token[];
  finishedCount: number;
};

const PLAYERS: Omit<PlayerState, "tokens" | "finishedCount">[] = [
  { id: 0, name: "Red", color: "bg-red-500", startIndex: 0 },
  { id: 1, name: "Green", color: "bg-emerald-500", startIndex: 13 },
  { id: 2, name: "Yellow", color: "bg-amber-400", startIndex: 26 },
  { id: 3, name: "Blue", color: "bg-sky-500", startIndex: 39 },
];

const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const TOKENS_PER_PLAYER = 4;
const FINAL_PROGRESS = 57;

function initPlayers() {
  return PLAYERS.map((player) => ({
    ...player,
    tokens: Array.from({ length: TOKENS_PER_PLAYER }, (_, id) => ({ id, progress: -1 })),
    finishedCount: 0,
  }));
}

function getBoardIndex(player: PlayerState, token: Token) {
  if (token.progress < 0 || token.progress > 51) return null;
  return (player.startIndex + token.progress) % 52;
}

function canMove(token: Token, roll: number) {
  if (roll < 1 || roll > 6) return false;
  if (token.progress === -1) return roll === 6;
  return token.progress + roll <= FINAL_PROGRESS;
}

export default function Home() {
  const [players, setPlayers] = useState<PlayerState[]>(() => initPlayers());
  const [turn, setTurn] = useState<PlayerId>(0);
  const [dice, setDice] = useState<number | null>(null);
  const [status, setStatus] = useState("Roll the dice to begin.");
  const [leaderboard, setLeaderboard] = useState<PlayerId[]>([]);

  const activePlayer = players[turn];
  const movableTokenIds = useMemo(() => {
    if (!dice) return [];
    return activePlayer.tokens.filter((token) => canMove(token, dice)).map((token) => token.id);
  }, [activePlayer.tokens, dice]);

  const isGameOver = leaderboard.length === PLAYERS.length;

  function advanceTurn(from: PlayerId) {
    setTurn(((from + 1) % PLAYERS.length) as PlayerId);
    setDice(null);
  }

  function resetGame() {
    setPlayers(initPlayers());
    setTurn(0);
    setDice(null);
    setStatus("Game reset. Red starts.");
    setLeaderboard([]);
  }

  function rollDice() {
    if (dice || isGameOver) return;

    const value = Math.floor(Math.random() * 6) + 1;
    setDice(value);

    const nextMovable = activePlayer.tokens.some((token) => canMove(token, value));
    if (!nextMovable) {
      setStatus(`${activePlayer.name} rolled ${value}. No valid move, turn passes.`);
      setTimeout(() => {
        advanceTurn(turn);
      }, 800);
      return;
    }

    setStatus(`${activePlayer.name} rolled ${value}. Select a token to move.`);
  }

  function moveToken(tokenId: number) {
    if (!dice || isGameOver) return;
    const token = activePlayer.tokens[tokenId];
    if (!canMove(token, dice)) return;

    const previousProgress = token.progress;
    const nextProgress = previousProgress === -1 ? 0 : previousProgress + dice;

    const nextPlayers = players.map((player) => ({
      ...player,
      tokens: player.tokens.map((item) => ({ ...item })),
    }));

    let captureHappened = false;
    const current = nextPlayers[turn];
    current.tokens[tokenId].progress = nextProgress;

    const landedBoardIndex = getBoardIndex(current, current.tokens[tokenId]);

    if (landedBoardIndex !== null && !SAFE_SQUARES.has(landedBoardIndex)) {
      nextPlayers.forEach((player, playerIndex) => {
        if (playerIndex === turn) return;
        player.tokens.forEach((enemyToken) => {
          const enemyBoardIndex = getBoardIndex(player, enemyToken);
          if (enemyBoardIndex === landedBoardIndex) {
            enemyToken.progress = -1;
            captureHappened = true;
          }
        });
      });
    }

    if (nextProgress === FINAL_PROGRESS) {
      current.finishedCount += 1;
      if (!leaderboard.includes(current.id) && current.finishedCount === TOKENS_PER_PLAYER) {
        setLeaderboard((prev) => [...prev, current.id]);
      }
    }

    setPlayers(nextPlayers);

    const shouldPlayAgain = dice === 6 || captureHappened;

    if (leaderboard.length + (current.finishedCount === TOKENS_PER_PLAYER ? 1 : 0) === PLAYERS.length) {
      setStatus("All positions are decided. Game over.");
      setDice(null);
      return;
    }

    if (shouldPlayAgain) {
      setStatus(
        captureHappened
          ? `${current.name} captured a token and gets another roll!`
          : `${current.name} rolled a 6 and gets another roll!`,
      );
      setDice(null);
      return;
    }

    setStatus(`${current.name} moved token ${tokenId + 1}. Next player's turn.`);
    advanceTurn(turn);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <h1 className="text-3xl font-bold">Ludo-style Multiplayer Arena</h1>
          <p className="mt-2 text-slate-300">
            A playable Ludo-inspired prototype with classic rules: unlock on 6, capture opponents,
            safe squares, and first-to-finish ranking.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Turn Console</h2>
            <p className="mt-2 text-slate-300">Current turn: {activePlayer.name}</p>
            <p className="text-slate-300">{status}</p>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={rollDice}
                disabled={!!dice || isGameOver}
                className="rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                {dice ? `Rolled: ${dice}` : "Roll Dice"}
              </button>

              <button
                onClick={resetGame}
                className="rounded-xl border border-slate-600 px-4 py-2 font-semibold"
              >
                Reset
              </button>
            </div>

            {dice && movableTokenIds.length > 0 ? (
              <div className="mt-5">
                <p className="text-sm text-slate-400">Choose token to move:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {movableTokenIds.map((tokenId) => (
                    <button
                      key={tokenId}
                      onClick={() => moveToken(tokenId)}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900"
                    >
                      Token {tokenId + 1}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Leaderboard</h2>
            {leaderboard.length === 0 ? (
              <p className="mt-2 text-slate-300">No finisher yet.</p>
            ) : (
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-200">
                {leaderboard.map((playerId) => (
                  <li key={playerId}>{PLAYERS[playerId].name}</li>
                ))}
              </ol>
            )}
            {isGameOver ? <p className="mt-4 font-semibold">Match complete.</p> : null}
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {players.map((player, index) => (
            <article key={player.id} className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-3 w-3 rounded-full ${player.color}`} />
                  <h3 className="font-semibold">{player.name}</h3>
                </div>
                {turn === index ? <span className="text-xs text-indigo-300">ACTIVE</span> : null}
              </div>

              <ul className="mt-3 space-y-1 text-sm text-slate-300">
                {player.tokens.map((token) => {
                  const boardIndex = getBoardIndex(player, token);
                  const label =
                    token.progress === -1
                      ? "Base"
                      : token.progress === FINAL_PROGRESS
                        ? "Finished"
                        : boardIndex !== null
                          ? `Track #${boardIndex}`
                          : `Home lane (${token.progress - 51}/6)`;

                  return (
                    <li key={token.id}>
                      Token {token.id + 1}: <span className="font-medium text-slate-100">{label}</span>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-3 text-sm text-slate-400">
                Finished tokens: {player.finishedCount}/{TOKENS_PER_PLAYER}
              </p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
