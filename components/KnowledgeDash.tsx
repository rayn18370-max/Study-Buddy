
import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Trophy, Heart, Timer, Zap, RotateCcw, Check, X } from 'lucide-react';
import { audioService } from '../services/audioService';

interface Props {
  data: {
    flashcards: { front: string; back: string }[];
    clean_notes: { heading: string; points: string[] }[];
  };
}

interface Question {
  term: string;
  definition: string;
  isCorrect: boolean;
}

const KnowledgeDash: React.FC<Props> = ({ data }) => {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(30);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const generateQuestion = useCallback(() => {
    const allPairs: { term: string; def: string }[] = [];
    
    data.flashcards.forEach(f => allPairs.push({ term: f.front, def: f.back }));
    data.clean_notes.forEach(n => {
      n.points.forEach(p => {
        const parts = p.split(/[:\-–—]/);
        if (parts.length >= 2) {
          allPairs.push({ term: parts[0].trim(), def: parts[1].trim() });
        }
      });
    });

    if (allPairs.length < 2) return null;

    const isCorrectMatch = Math.random() > 0.5;
    const pairA = allPairs[Math.floor(Math.random() * allPairs.length)];
    
    if (isCorrectMatch) {
      return { term: pairA.term, definition: pairA.def, isCorrect: true };
    } else {
      let pairB = allPairs[Math.floor(Math.random() * allPairs.length)];
      while (pairB.term === pairA.term) {
        pairB = allPairs[Math.floor(Math.random() * allPairs.length)];
      }
      return { term: pairA.term, definition: pairB.def, isCorrect: false };
    }
  }, [data]);

  const startGame = () => {
    audioService.playClick();
    setScore(0);
    setStreak(0);
    setLives(3);
    setTimeLeft(30);
    setGameState('playing');
    setCurrentQuestion(generateQuestion());
  };

  const handleAnswer = (answer: boolean) => {
    if (!currentQuestion || feedback) return;

    if (answer === currentQuestion.isCorrect) {
      audioService.playCorrect();
      setScore(prev => prev + (10 * (streak + 1)));
      setStreak(prev => prev + 1);
      setFeedback('correct');
    } else {
      audioService.playWrong();
      setLives(prev => prev - 1);
      setStreak(0);
      setFeedback('wrong');
    }

    setTimeout(() => {
      setFeedback(null);
      if (lives <= (answer === currentQuestion.isCorrect ? 0 : 1)) {
        audioService.playError();
        setGameState('ended');
      } else {
        setCurrentQuestion(generateQuestion());
      }
    }, 600);
  };

  useEffect(() => {
    let timer: number;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            audioService.playError();
            setGameState('ended');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  if (gameState === 'idle') {
    return (
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-200 no-print mb-8 mx-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shrink-0">
            <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-300 fill-yellow-300" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight">Knowledge Dash</h3>
        </div>
        <p className="text-indigo-100 text-base sm:text-lg mb-8 max-w-md">
          How fast can you spot the truth? 30 seconds. 3 lives. Zero mercy.
        </p>
        <button 
          onClick={startGame}
          className="w-full sm:w-auto group flex items-center justify-center gap-3 bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-lg sm:text-xl hover:scale-105 active:scale-95 transition-all shadow-lg"
        >
          START CHALLENGE
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform" />
        </button>
      </div>
    );
  }

  if (gameState === 'ended') {
    return (
      <div className="bg-white border-4 border-indigo-600 rounded-3xl p-6 sm:p-8 text-center no-print mb-8 animate-in zoom-in-95 duration-300 mx-1">
        <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2">Session Over!</h3>
        <div className="flex justify-center gap-6 sm:gap-8 mb-8">
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase">Final Score</p>
            <p className="text-3xl sm:text-4xl font-black text-indigo-600">{score}</p>
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase">Best Streak</p>
            <p className="text-3xl sm:text-4xl font-black text-violet-600">{streak}</p>
          </div>
        </div>
        <button 
          onClick={startGame}
          className="w-full sm:w-auto flex items-center justify-center gap-2 mx-auto bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-600 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className={`relative bg-slate-900 rounded-3xl p-6 sm:p-10 text-white overflow-hidden no-print mb-8 transition-all duration-300 mx-1 ${feedback === 'correct' ? 'ring-8 ring-green-500/30' : feedback === 'wrong' ? 'ring-8 ring-red-500/30 animate-shake' : ''}`}>
      <div className="flex flex-row justify-between items-center mb-10 gap-2">
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-1 sm:gap-2">
            {[...Array(3)].map((_, i) => (
              <Heart key={i} className={`w-5 h-5 sm:w-6 sm:h-6 ${i < lives ? 'text-red-500 fill-red-500' : 'text-slate-700'}`} />
            ))}
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="flex items-center gap-1 sm:gap-2 text-yellow-400">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-black text-lg sm:text-xl">{score}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 bg-white/10 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full backdrop-blur-md shrink-0">
          <Timer className={`w-4 h-4 sm:w-5 sm:h-5 ${timeLeft < 10 ? 'text-red-400 animate-pulse' : 'text-indigo-300'}`} />
          <span className="font-mono font-bold text-lg sm:text-xl">{timeLeft}s</span>
        </div>
      </div>

      <div className="min-h-[250px] sm:min-h-[200px] flex flex-col items-center justify-center text-center px-2 relative z-10">
        {streak > 1 && (
          <div className="absolute -top-6 bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-black animate-bounce">
            {streak}X COMBO!
          </div>
        )}
        <h4 className="text-indigo-400 font-bold uppercase tracking-[0.2em] mb-4 text-[10px]">Concept Match</h4>
        <p className="text-xl sm:text-3xl font-bold text-white mb-6 leading-tight">
          "{currentQuestion?.term}"
        </p>
        <div className="w-12 h-1 bg-slate-800 rounded-full mb-6 shrink-0"></div>
        <div className="max-h-[150px] overflow-y-auto w-full custom-scrollbar">
          <p className="text-base sm:text-xl text-slate-300 italic max-w-2xl mx-auto leading-relaxed pb-2">
            {currentQuestion?.definition}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-12 relative z-10">
        <button 
          onClick={() => handleAnswer(false)}
          className="group relative h-20 bg-slate-800 hover:bg-red-600 rounded-2xl transition-all border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 font-black text-xl sm:text-2xl">
            <X className="w-6 h-6 sm:w-8 sm:h-8" />
            FAKE
          </div>
        </button>
        <button 
          onClick={() => handleAnswer(true)}
          className="group relative h-20 bg-indigo-600 hover:bg-green-600 rounded-2xl transition-all border-b-4 border-indigo-900 active:border-b-0 active:translate-y-1 overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 font-black text-xl sm:text-2xl">
            <Check className="w-6 h-6 sm:w-8 sm:h-8" />
            FACT
          </div>
        </button>
      </div>

      {feedback === 'correct' && (
        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center z-20 pointer-events-none animate-in fade-in duration-200">
           <Check className="w-32 h-32 text-green-500 animate-in zoom-in-150 duration-300" />
        </div>
      )}
      {feedback === 'wrong' && (
        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center z-20 pointer-events-none animate-in fade-in duration-200">
           <X className="w-32 h-32 text-red-500 animate-in zoom-in-150 duration-300" />
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default KnowledgeDash;
