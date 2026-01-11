
import React, { useState } from 'react';
import { Flashcard as FlashcardType } from '../types';
import { audioService } from '../services/audioService';

interface Props {
  card: FlashcardType;
}

const Flashcard: React.FC<Props> = ({ card }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    audioService.playFlip();
  };

  return (
    <div 
      className="relative w-full min-h-[320px] cursor-pointer perspective-1000 group no-print"
      onClick={handleFlip}
    >
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        {/* Front */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-white border-2 border-indigo-100 rounded-3xl shadow-sm backface-hidden group-hover:border-indigo-300 overflow-y-auto">
          <span className="text-xs font-bold tracking-wider text-indigo-500 uppercase mb-4 shrink-0">Question</span>
          <div className="flex-1 flex items-center justify-center w-full">
            <p className="text-lg sm:text-xl font-medium text-center text-slate-800 leading-relaxed">
              {card.front}
            </p>
          </div>
          <p className="mt-4 text-xs text-slate-400 shrink-0">Click to flip</p>
        </div>
        
        {/* Back */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-indigo-50 border-2 border-indigo-200 rounded-3xl shadow-sm backface-hidden rotate-y-180 overflow-y-auto">
          <span className="text-xs font-bold tracking-wider text-indigo-600 uppercase mb-4 shrink-0">Answer</span>
          <div className="flex-1 flex items-center justify-center w-full">
            <p className="text-lg sm:text-xl font-semibold text-center text-indigo-900 leading-relaxed">
              {card.back}
            </p>
          </div>
          <p className="mt-4 text-xs text-indigo-400 shrink-0">Click to flip back</p>
        </div>
      </div>
      
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};

export default Flashcard;
