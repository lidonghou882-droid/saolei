/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Smile, Frown, MousePointer2, Volume2, VolumeX, X, Bomb, Flag, Timer, Settings, RotateCcw, HelpCircle } from 'lucide-react';

type Cell = {
  x: number;
  y: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
};

type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

const DIFFICULTIES = {
  easy: { width: 9, height: 9, mines: 10, name: '初级' },
  medium: { width: 16, height: 16, mines: 40, name: '中级' },
  hard: { width: 16, height: 30, mines: 99, name: '高级' },
};
type DifficultyKey = keyof typeof DIFFICULTIES;
type GameMode = DifficultyKey | 'challenge';

const CHALLENGE_LEVELS = [
  { width: 6, height: 6, mines: 5 },
  { width: 10, height: 10, mines: 15 },
  { width: 14, height: 14, mines: 30 },
  { width: 18, height: 18, mines: 55 },
  { width: 22, height: 22, mines: 90 },
  { width: 26, height: 26, mines: 140 },
];

export default function App() {
  const [difficulty, setDifficulty] = useState<GameMode>('easy');
  const [challengeLevel, setChallengeLevel] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [board, setBoard] = useState<Cell[][]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [minesLeft, setMinesLeft] = useState(DIFFICULTIES.easy.mines);
  const [time, setTime] = useState(0);
  const [isFlagMode, setIsFlagMode] = useState(false);
  const [hitMine, setHitMine] = useState<{x: number, y: number} | null>(null);
  const [showLostModal, setShowLostModal] = useState(false);
  const [showWonModal, setShowWonModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [sysTime, setSysTime] = useState(new Date());

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setSysTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const playSound = useCallback((type: 'click' | 'flag' | 'unflag' | 'boom' | 'win') => {
    if (!soundEnabled) return;
    
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'flag') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(900, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'unflag') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'boom') {
        // Realistic explosion sound using white noise + low frequency rumble
        const bufferSize = ctx.sampleRate * 0.6;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(1000, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(50, now + 0.5);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(1, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

        whiteNoise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        whiteNoise.start(now);

        // Low frequency rumble
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(1.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'win') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.1);
        osc.frequency.setValueAtTime(659.25, now + 0.2);
        osc.frequency.setValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch (e) {
      console.error("Audio play failed", e);
    }
  }, [soundEnabled]);

  const currentDiff = React.useMemo(() => {
    return difficulty === 'challenge'
      ? { ...CHALLENGE_LEVELS[challengeLevel], name: `挑战 (第${challengeLevel + 1}关)` }
      : DIFFICULTIES[difficulty as DifficultyKey];
  }, [difficulty, challengeLevel]);

  // Initialize board
  const initBoard = useCallback(() => {
    const { width, height, mines } = currentDiff;
    const newBoard: Cell[][] = [];
    for (let y = 0; y < height; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < width; x++) {
        row.push({
          x,
          y,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0,
        });
      }
      newBoard.push(row);
    }
    setBoard(newBoard);
    setGameStatus('idle');
    setMinesLeft(mines);
    setTime(0);
    setHitMine(null);
    setIsFlagMode(false);
    setShowLostModal(false);
    setShowWonModal(false);
  }, [currentDiff]);

  useEffect(() => {
    initBoard();
  }, [initBoard]);

  // Timer
  useEffect(() => {
    let timer: number;
    if (gameStatus === 'playing') {
      timer = window.setInterval(() => {
        setTime((t) => Math.min(t + 1, 999));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameStatus]);

  const placeMines = (firstX: number, firstY: number, currentBoard: Cell[][]) => {
    const { width, height, mines } = currentDiff;
    let minesPlaced = 0;
    while (minesPlaced < mines) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      
      if (!currentBoard[y][x].isMine && !(x === firstX && y === firstY)) {
        currentBoard[y][x].isMine = true;
        minesPlaced++;
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!currentBoard[y][x].isMine) {
          let count = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                if (currentBoard[ny][nx].isMine) count++;
              }
            }
          }
          currentBoard[y][x].neighborMines = count;
        }
      }
    }
  };

  const revealCell = (x: number, y: number) => {
    if (gameStatus === 'won' || gameStatus === 'lost') return;
    if (board[y][x].isRevealed || board[y][x].isFlagged) return;

    const { width, height } = currentDiff;
    const newBoard = [...board.map(row => [...row])];

    if (gameStatus === 'idle') {
      placeMines(x, y, newBoard);
      setGameStatus('playing');
    }

    if (newBoard[y][x].isMine) {
      setHitMine({x, y});
      playSound('boom');
      newBoard.forEach(row => row.forEach(cell => {
        // Reveal all mines. Also reveal incorrectly flagged cells.
        if (cell.isMine || (cell.isFlagged && !cell.isMine)) {
          cell.isRevealed = true;
        }
      }));
      setBoard(newBoard);
      setGameStatus('lost');
      setTimeout(() => setShowLostModal(true), 600);
      return;
    }

    playSound('click');

    const stack = [[x, y]];
    let revealedCount = 0;

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
        const cell = newBoard[cy][cx];
        if (!cell.isRevealed && !cell.isFlagged) {
          cell.isRevealed = true;
          revealedCount++;
          if (cell.neighborMines === 0) {
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                stack.push([cx + dx, cy + dy]);
              }
            }
          }
        }
      }
    }

    setBoard(newBoard);
    checkWin(newBoard);
  };

  const toggleFlag = (x: number, y: number) => {
    if (gameStatus === 'won' || gameStatus === 'lost' || board[y][x].isRevealed) return;

    const newBoard = [...board.map(row => [...row])];
    const cell = newBoard[y][x];
    
    if (!cell.isFlagged && minesLeft > 0) {
      cell.isFlagged = true;
      setMinesLeft(m => m - 1);
      playSound('flag');
    } else if (cell.isFlagged) {
      cell.isFlagged = false;
      setMinesLeft(m => m + 1);
      playSound('unflag');
    }

    setBoard(newBoard);
  };

  const handleCellClick = (x: number, y: number) => {
    if (isFlagMode) {
      toggleFlag(x, y);
    } else {
      revealCell(x, y);
    }
  };

  const handleCellContextMenu = (e: React.MouseEvent, x: number, y: number) => {
    e.preventDefault();
    toggleFlag(x, y);
  };

  const checkWin = (currentBoard: Cell[][]) => {
    let unrevealedSafeCells = 0;
    currentBoard.forEach(row => {
      row.forEach(cell => {
        if (!cell.isMine && !cell.isRevealed) {
          unrevealedSafeCells++;
        }
      });
    });

    if (unrevealedSafeCells === 0) {
      playSound('win');
      setGameStatus('won');
      const finalBoard = [...currentBoard.map(row => [...row])];
      finalBoard.forEach(row => row.forEach(cell => {
        if (cell.isMine && !cell.isFlagged) {
          cell.isFlagged = true;
        }
      }));
      setBoard(finalBoard);
      setMinesLeft(0);
      setTimeout(() => setShowWonModal(true), 600);
    }
  };

  const getNumberColor = (num: number) => {
    const colors = [
      '',
      'text-blue-500',
      'text-emerald-500',
      'text-red-500',
      'text-indigo-500',
      'text-rose-700',
      'text-teal-500',
      'text-slate-900',
      'text-slate-600'
    ];
    return colors[num] || '';
  };

  const getCellStyles = (diff: GameMode) => {
    if (diff === 'challenge') {
      const w = CHALLENGE_LEVELS[challengeLevel].width;
      if (w <= 10) return { cell: 'w-10 h-10 sm:w-12 sm:h-12 text-2xl rounded-md', icon: 24 };
      if (w <= 16) return { cell: 'w-8 h-8 sm:w-10 sm:h-10 text-xl rounded-md', icon: 18 };
      if (w <= 22) return { cell: 'w-7 h-7 sm:w-8 sm:h-8 text-lg rounded-sm', icon: 16 };
      return { cell: 'w-6 h-6 sm:w-7 sm:h-7 text-base rounded-sm', icon: 14 };
    }
    switch (diff) {
      case 'easy': return { cell: 'w-full aspect-square text-2xl sm:text-3xl rounded-lg', icon: "60%" };
      case 'medium': return { cell: 'w-9 h-9 sm:w-10 sm:h-10 text-xl sm:text-2xl rounded-md', icon: 20 };
      case 'hard': return { cell: 'w-8 h-8 sm:w-9 sm:h-9 text-lg sm:text-xl rounded-sm', icon: 18 };
      default: return { cell: 'w-9 h-9 sm:w-10 sm:h-10 text-xl sm:text-2xl rounded-md', icon: 20 };
    }
  };
  const { cell: cellClass, icon: iconSize } = getCellStyles(difficulty);

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 text-slate-100 flex flex-col select-none touch-none font-sans overscroll-none">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translate(0, 0); }
          10%, 30%, 50%, 70%, 90% { transform: translate(-4px, 2px); }
          20%, 40%, 60%, 80% { transform: translate(4px, -2px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        /* Hide scrollbar for Chrome, Safari and Opera */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>

      {/* Top Header */}
      <div className="flex justify-between items-center p-4 bg-slate-900/80 backdrop-blur-md z-10 shrink-0 border-b border-slate-800 overflow-x-auto no-scrollbar">
        <div className="flex bg-slate-800 p-1 rounded-full shadow-inner shrink-0">
          {(Object.keys(DIFFICULTIES) as DifficultyKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setDifficulty(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                difficulty === key 
                  ? 'bg-indigo-500 text-white shadow-md scale-105' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {DIFFICULTIES[key].name}
            </button>
          ))}
          <button
            onClick={() => setDifficulty('challenge')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-200 whitespace-nowrap ml-1 ${
              difficulty === 'challenge'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md scale-105'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            挑战
          </button>
        </div>
        <div className="flex gap-2 shrink-0 ml-4">
          <button 
            onClick={() => setShowHelpModal(true)}
            className="p-2.5 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors active:scale-95"
          >
            <HelpCircle size={20} />
          </button>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors active:scale-95"
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </div>

      {/* HUD Scoreboard */}
      <div className="flex justify-between items-center px-6 py-4 shrink-0">
        <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2.5 rounded-2xl shadow-inner border border-slate-700/50 min-w-[100px] justify-center">
          <Bomb className="text-rose-400" size={24} />
          <span className="text-2xl font-mono font-bold text-slate-100">{minesLeft.toString().padStart(3, '0')}</span>
        </div>
        
        <button 
          onClick={initBoard}
          className="p-3 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.4)] active:scale-90 transition-all duration-200 border-2 border-indigo-400"
        >
          {gameStatus === 'lost' ? <Frown className="text-white" size={32} /> : 
           gameStatus === 'won' ? <Smile className="text-white" size={32} /> : 
           <Smile className="text-white" size={32} />}
        </button>

        <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2.5 rounded-2xl shadow-inner border border-slate-700/50 min-w-[100px] justify-center">
          <Timer className="text-emerald-400" size={24} />
          <span className="text-2xl font-mono font-bold text-slate-100">{time.toString().padStart(3, '0')}</span>
        </div>
      </div>

      {/* Game Board Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 min-h-0 w-full">
        <div className={`bg-slate-800/50 p-2 sm:p-4 rounded-3xl shadow-2xl border border-slate-700/50 max-w-full max-h-full flex flex-col min-h-0 w-full ${gameStatus === 'lost' ? 'animate-shake' : ''}`}>
          <div className={`min-h-0 w-full rounded-xl ${difficulty === 'easy' ? 'flex items-center justify-center overflow-hidden' : 'overflow-auto touch-pan-x touch-pan-y no-scrollbar overscroll-none'}`}>
            <div 
              className={`grid gap-1 p-1 ${difficulty === 'easy' ? 'w-full max-w-[450px] mx-auto' : 'w-max mx-auto'}`}
              style={{ 
                gridTemplateColumns: difficulty === 'easy' 
                  ? `repeat(${currentDiff.width}, minmax(0, 1fr))` 
                  : `repeat(${currentDiff.width}, max-content)`
              }}
            >
              {board.map((row, y) => 
                row.map((cell, x) => {
                  const isHit = hitMine?.x === x && hitMine?.y === y;
                  const isIncorrectFlag = gameStatus === 'lost' && cell.isFlagged && !cell.isMine;

                  return (
                    <button
                      key={`${x}-${y}`}
                      onClick={() => handleCellClick(x, y)}
                      onContextMenu={(e) => handleCellContextMenu(e, x, y)}
                      className={`
                        ${cellClass} flex items-center justify-center font-bold transition-all duration-150
                        ${cell.isRevealed 
                          ? (isHit 
                              ? 'bg-rose-500 text-white shadow-inner scale-95' 
                              : 'bg-slate-900 text-slate-200 shadow-inner border border-slate-800/50') 
                          : 'bg-slate-600 border-b-[3px] border-slate-800 active:border-b-0 active:translate-y-[3px] shadow-sm hover:bg-slate-500'
                        }
                      `}
                      disabled={gameStatus === 'won' || gameStatus === 'lost'}
                    >
                      {cell.isRevealed ? (
                        cell.isMine ? (
                          <Bomb size={iconSize} className={isHit ? "text-white" : "text-rose-500"} />
                        ) : isIncorrectFlag ? (
                          <div className="relative flex items-center justify-center w-full h-full">
                            <Bomb size={typeof iconSize === 'number' ? iconSize - 2 : "50%"} className="text-slate-500" />
                            <X size={typeof iconSize === 'number' ? iconSize + 6 : "80%"} className="absolute text-rose-500" strokeWidth={3} />
                          </div>
                        ) : (
                          cell.neighborMines > 0 && (
                            <span className={getNumberColor(cell.neighborMines)}>
                              {cell.neighborMines}
                            </span>
                          )
                        )
                      ) : (
                        cell.isFlagged && <Flag size={iconSize} className="text-rose-500 drop-shadow-md" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar (Mobile specific toggle) */}
      <div className="p-4 bg-slate-900/80 backdrop-blur-md pb-safe shrink-0 border-t border-slate-800">
        <div className="flex gap-4 max-w-md mx-auto">
          <button
            onClick={() => setIsFlagMode(false)}
            className={`flex-1 py-3.5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-200 ${
              !isFlagMode 
                ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <MousePointer2 size={22} /> 挖开
          </button>
          <button
            onClick={() => setIsFlagMode(true)}
            className={`flex-1 py-3.5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-200 ${
              isFlagMode 
                ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] scale-105' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Flag size={22} /> 插旗
          </button>
        </div>
      </div>

      {/* Lost Modal */}
      {showLostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bomb className="text-rose-500" size={40} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">挑战失败</h2>
            <p className="text-slate-400 mb-8 text-lg">难度: {currentDiff.name} • 用时: {time}秒</p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setShowLostModal(false)} 
                className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors"
              >
                查看棋盘
              </button>
              <button 
                onClick={initBoard} 
                className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} /> 再来一局
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Won Modal */}
      {showWonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Smile className="text-emerald-500" size={40} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">挑战成功！</h2>
            <p className="text-slate-400 mb-8 text-lg">难度: {currentDiff.name} • 用时: {time}秒</p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setShowWonModal(false)} 
                className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors"
              >
                查看棋盘
              </button>
              {difficulty === 'challenge' && challengeLevel < CHALLENGE_LEVELS.length - 1 ? (
                <button 
                  onClick={() => {
                    setChallengeLevel(l => l + 1);
                    setShowWonModal(false);
                  }} 
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-lg shadow-orange-500/30 hover:from-amber-600 hover:to-orange-600 transition-colors flex items-center justify-center gap-2"
                >
                  下一关
                </button>
              ) : difficulty === 'challenge' && challengeLevel === CHALLENGE_LEVELS.length - 1 ? (
                <button 
                  onClick={() => {
                    setChallengeLevel(0);
                    setDifficulty('easy');
                    setShowWonModal(false);
                  }} 
                  className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
                >
                  通关！返回初级
                </button>
              ) : (
                <button 
                  onClick={initBoard} 
                  className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw size={18} /> 再来一局
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 sm:p-8 rounded-3xl shadow-2xl max-w-sm w-full transform transition-all animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <HelpCircle className="text-indigo-400" />
                游戏说明
              </h2>
              <button onClick={() => setShowHelpModal(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white active:scale-95 transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto pr-2 text-slate-300 space-y-4 text-sm sm:text-base leading-relaxed overscroll-none">
              <p><strong>目标：</strong> 找出所有没有地雷的方块，完成排雷。</p>
              <p><strong>玩法：</strong></p>
              <ul className="list-disc pl-5 space-y-2">
                <li>点击 <strong>挖开</strong> 模式，点击方块揭开它。如果揭开的是地雷，游戏结束。</li>
                <li>如果揭开的是数字，该数字表示其周围 8 个方块中隐藏的地雷数量。</li>
                <li>根据数字逻辑推断地雷位置。点击 <strong>插旗</strong> 模式，在认为是地雷的方块上插旗标记。</li>
                <li>再次点击已插旗的方块可取消标记。</li>
              </ul>
              <p><strong>技巧：</strong></p>
              <ul className="list-disc pl-5 space-y-2">
                <li>第一步点击永远不会是地雷。</li>
                <li>利用边缘和角落的数字更容易推断出地雷位置。</li>
              </ul>
            </div>
            <div className="mt-6 shrink-0">
              <button 
                onClick={() => setShowHelpModal(false)} 
                className="w-full py-3 rounded-xl bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 transition-colors"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}