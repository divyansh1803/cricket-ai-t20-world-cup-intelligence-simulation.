import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { QUIZ_QUESTIONS, GUESS_PLAYER_POOL, LEADERBOARD_SEED } from '../../data/cricketData';
import { cricketAudio } from '../../utils/audioSystem';
import { TeamFlag } from '../common/CricketIdentity';
import {
  HelpCircle,
  Sparkles,
  Trophy,
  CheckCircle2,
  XCircle,
  Timer,
  RotateCcw,
  Award,
  Users,
} from 'lucide-react';

export const GamesHub: React.FC = () => {
  const { addXp, recordPrediction } = useGame();
  const [activeTab, setActiveTab] = useState<'guess' | 'quiz' | 'leaderboard'>('guess');

  // --- GUESS THE PLAYER STATE ---
  const [guessIndex, setGuessIndex] = useState(0);
  const [cluesRevealed, setCluesRevealed] = useState(1);
  const [selectedGuessOption, setSelectedGuessOption] = useState<string | null>(null);
  const [guessResult, setGuessResult] = useState<'CORRECT' | 'WRONG' | null>(null);

  const currentGuess = GUESS_PLAYER_POOL[guessIndex % GUESS_PLAYER_POOL.length];

  const handleRevealClue = () => {
    if (cluesRevealed < currentGuess.clues.length) {
      setCluesRevealed((prev) => prev + 1);
      cricketAudio.playBatHit();
    }
  };

  const handleMakeGuess = (optionName: string) => {
    if (selectedGuessOption) return;
    setSelectedGuessOption(optionName);

    const isCorrect = optionName === currentGuess.player;
    if (isCorrect) {
      setGuessResult('CORRECT');
      cricketAudio.playVictory();
      addXp(currentGuess.xpReward, `Guessed mystery player: ${currentGuess.player}!`);
      recordPrediction(true);
    } else {
      setGuessResult('WRONG');
      cricketAudio.playWicket();
      recordPrediction(false);
    }
  };

  const handleNextGuess = () => {
    setGuessIndex((prev) => (prev + 1) % GUESS_PLAYER_POOL.length);
    setCluesRevealed(1);
    setSelectedGuessOption(null);
    setGuessResult(null);
  };

  // --- QUIZ STATE ---
  const [quizQuestionIdx, setQuizQuestionIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [quizTimer, setQuizTimer] = useState(15);
  const [isQuizFinished, setIsQuizFinished] = useState(false);

  const currentQuestion = QUIZ_QUESTIONS[quizQuestionIdx % QUIZ_QUESTIONS.length];

  useEffect(() => {
    if (activeTab === 'quiz' && !isQuizFinished && selectedQuizAnswer === null) {
      const timer = setInterval(() => {
        setQuizTimer((prev) => {
          if (prev <= 1) {
            handleAnswerQuiz(-1); // time out
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeTab, quizQuestionIdx, selectedQuizAnswer, isQuizFinished]);

  const handleAnswerQuiz = (idx: number) => {
    if (selectedQuizAnswer !== null) return;
    setSelectedQuizAnswer(idx);

    const isCorrect = idx === currentQuestion.correctIndex;
    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
      cricketAudio.playBoundary();
    } else {
      cricketAudio.playWicket();
    }
  };

  const handleNextQuestion = () => {
    if (quizQuestionIdx + 1 >= QUIZ_QUESTIONS.length) {
      setIsQuizFinished(true);
      cricketAudio.playVictory();
      addXp(200, `Completed Cricket Intelligence Quiz (${quizScore}/${QUIZ_QUESTIONS.length} correct)`);
    } else {
      setQuizQuestionIdx((prev) => prev + 1);
      setSelectedQuizAnswer(null);
      setQuizTimer(15);
    }
  };

  const handleRestartQuiz = () => {
    setQuizQuestionIdx(0);
    setQuizScore(0);
    setSelectedQuizAnswer(null);
    setQuizTimer(15);
    setIsQuizFinished(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>FAN ENGAGEMENT & REPUTATION</span>
            <span aria-hidden="true">·</span>
            <span>CRICKET INTELLIGENCE GAMES</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Cricket Games & Global Leaderboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Play Guess the Player, take the timed tactical quiz, and compare your analyst rating on the world stage.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('guess')}
            className={`rounded-lg px-3.5 py-1.5 transition-colors cursor-pointer ${
              activeTab === 'guess' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Guess the Player
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`rounded-lg px-3.5 py-1.5 transition-colors cursor-pointer ${
              activeTab === 'quiz' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Timed Quiz
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`rounded-lg px-3.5 py-1.5 transition-colors cursor-pointer ${
              activeTab === 'leaderboard' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Leaderboard
          </button>
        </div>
      </div>

      {/* --- TAB 1: GUESS THE PLAYER --- */}
      {activeTab === 'guess' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-cyan-400 font-bold">MYSTERY PLAYER CHALLENGE</span>
                <h2 className="text-lg font-bold text-white mt-0.5">Who Am I?</h2>
              </div>
              <span className="text-xs font-mono text-amber-400">+{currentGuess.xpReward} XP REWARD</span>
            </div>

            {/* Clues Stream */}
            <div className="space-y-3">
              <span className="text-xs text-slate-400 font-mono">
                PROGRESSIVE CLUES ({cluesRevealed} of {currentGuess.clues.length} revealed):
              </span>

              <div className="space-y-2">
                {currentGuess.clues.slice(0, cluesRevealed).map((clue, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs text-slate-200 animate-in fade-in duration-200"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-cyan-500/20 text-[10px] font-mono font-bold text-cyan-400">
                      {idx + 1}
                    </span>
                    <p className="leading-relaxed">{clue}</p>
                  </div>
                ))}
              </div>

              {cluesRevealed < currentGuess.clues.length && !selectedGuessOption && (
                <button
                  onClick={handleRevealClue}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  Reveal Next Clue ({currentGuess.clues.length - cluesRevealed} remaining)
                </button>
              )}
            </div>

            {/* Multiple Choice Options */}
            <div className="space-y-3 pt-2">
              <span className="text-xs text-slate-400 font-mono">SELECT YOUR GUESS:</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentGuess.options.map((opt) => {
                  const isChosen = selectedGuessOption === opt;
                  const isCorrect = opt === currentGuess.player;
                  return (
                    <button
                      key={opt}
                      onClick={() => handleMakeGuess(opt)}
                      disabled={!!selectedGuessOption}
                      className={`p-3.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                        selectedGuessOption
                          ? isCorrect
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                            : isChosen
                            ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                            : 'border-slate-800 bg-slate-950 text-slate-500 opacity-60'
                          : 'border-slate-800 bg-slate-950 text-slate-200 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Result Message */}
            {guessResult && (
              <div
                className={`rounded-xl border p-4 text-xs font-bold flex items-center justify-between animate-in fade-in duration-200 ${
                  guessResult === 'CORRECT'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {guessResult === 'CORRECT' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                  <span>
                    {guessResult === 'CORRECT'
                      ? `Brilliant! That is ${currentGuess.player} (+${currentGuess.xpReward} XP)`
                      : `Incorrect. The mystery player was ${currentGuess.player}.`}
                  </span>
                </div>
                <button
                  onClick={handleNextGuess}
                  className="rounded-lg bg-sky-500 px-3.5 py-1.5 text-xs text-slate-950 font-bold hover:bg-sky-400 cursor-pointer"
                >
                  Next Player →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: TIMED QUIZ --- */}
      {activeTab === 'quiz' && (
        <div className="max-w-3xl mx-auto space-y-6">
          {!isQuizFinished ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-cyan-400 font-bold">
                    {currentQuestion.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    QUESTION {quizQuestionIdx + 1} OF {QUIZ_QUESTIONS.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
                  <Timer className="h-4 w-4" />
                  <span className="tabular-nums">{quizTimer}s</span>
                </div>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
                {currentQuestion.question}
              </h2>

              {/* Options */}
              <div className="space-y-2.5">
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = selectedQuizAnswer === idx;
                  const isCorrect = idx === currentQuestion.correctIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswerQuiz(idx)}
                      disabled={selectedQuizAnswer !== null}
                      className={`w-full p-4 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                        selectedQuizAnswer !== null
                          ? isCorrect
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold'
                            : isSelected
                            ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                            : 'border-slate-800 bg-slate-950 text-slate-500 opacity-60'
                          : 'border-slate-800 bg-slate-950 text-slate-200 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {/* Explanation & Next */}
              {selectedQuizAnswer !== null && (
                <div className="space-y-4 pt-2 border-t border-slate-800 animate-in fade-in duration-200">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong className="text-sky-400">Tactical Context:</strong> {currentQuestion.explanation}
                  </p>

                  <div className="flex justify-end">
                    <button
                      onClick={handleNextQuestion}
                      className="rounded-xl bg-sky-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400 cursor-pointer"
                    >
                      {quizQuestionIdx + 1 >= QUIZ_QUESTIONS.length ? 'View Final Results' : 'Next Question →'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-8 text-center space-y-5 backdrop-blur-md">
              <Trophy className="h-12 w-12 text-amber-400 mx-auto" />
              <div>
                <h2 className="text-2xl font-black text-white">Quiz Completed!</h2>
                <p className="text-xs text-slate-400 mt-1">
                  You scored <strong className="text-white text-base">{quizScore}</strong> out of{' '}
                  <strong className="text-white text-base">{QUIZ_QUESTIONS.length}</strong> correct.
                </p>
              </div>

              <div className="inline-block rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sky-400 text-xs font-bold">
                +200 XP ADDED TO YOUR ANALYST PROFILE
              </div>

              <div className="pt-2">
                <button
                  onClick={handleRestartQuiz}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  Retake Quiz
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: LEADERBOARD --- */}
      {activeTab === 'leaderboard' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Global Cricket Intelligence Leaderboard</h2>
              </div>
              <span className="text-xs font-mono text-slate-400">UPDATED REAL-TIME</span>
            </div>

            <div className="space-y-2.5">
              {LEADERBOARD_SEED.map((user) => (
                <div
                  key={user.rank}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                    user.name.includes('You')
                      ? 'border-sky-500/60 bg-sky-500/10'
                      : 'border-slate-800 bg-slate-950/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-mono font-bold ${
                        user.rank === 1
                          ? 'bg-amber-500 text-slate-950'
                          : user.rank === 2
                          ? 'bg-slate-300 text-slate-950'
                          : user.rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {user.rank}
                    </span>
                    <TeamFlag code={user.flag} size="sm" />
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{user.name}</span>
                        {user.name.includes('You') && (
                          <span className="text-[10px] bg-sky-500 text-slate-950 px-1.5 rounded font-mono font-black">YOU</span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400">{user.title}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 font-mono text-xs">
                    <div className="hidden sm:block text-right">
                      <span className="text-slate-500 block text-[10px]">ACCURACY</span>
                      <span className="text-slate-200 font-bold">{user.accuracy}%</span>
                    </div>
                    <div className="hidden sm:block text-right">
                      <span className="text-slate-500 block text-[10px]">AI WINS</span>
                      <span className="text-emerald-400 font-bold">{user.aiWins}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[10px]">XP</span>
                      <span className="text-sky-400 font-black text-sm">{user.xp.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
