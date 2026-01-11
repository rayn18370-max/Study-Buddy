
import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCcw, CheckCircle2 } from 'lucide-react';

interface GameCard {
  id: number;
  content: string;
  type: 'term' | 'definition';
  pairId: number;
  isFlipped: boolean;
  isMatched: boolean;
}

interface Props {
  notes: { heading: string; points: string[] }[];
}

const MemoryGame: React.FC<Props> = ({ notes }) => {
  const [cards, setCards] = useState<GameCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);

  const initGame = () => {
    // Extract potential term-definition pairs from bullet points
    // We look for patterns like "Term: Definition" or "Term - Definition"
    const pairs: { term: string; def: string }[] = [];
    
    notes.forEach(note => {
      note.points.forEach(point => {
        const parts = point.split(/[:\-–—]/);
        if (parts.length >= 2 && parts[0].trim().length < 40 && parts[1].trim().length > 5) {
          pairs.push({
            term: parts[0].trim(),
            def: parts[1].trim().substring(0, 100) + (parts[1].trim().length > 100 ? '...' : '')
          });
        }
      });
    });

    // If no clear pairs, just use headings and first points as a fallback
    if (pairs.length < 3) {
      notes.slice(0, 4).forEach(note => {
        if (note.points.length > 0) {
          pairs.push({
            term: note.heading,
            def: note.points[0].substring(0, 100)
          });
        }
      });
    }

    // Shuffle and pick 4-6 pairs
    const selectedPairs = pairs.sort(() => 0.5 - Math.random()).slice(0, 4);
    
    let gameCards: GameCard[] = [];
    selectedPairs.forEach((pair, idx) => {
      gameCards.push({
        id: idx * 2,
        content: pair.term,
        type: 'term',
        pairId: idx,
        isFlipped: false,
        isMatched: false
      });
      gameCards.push({
        id: idx * 2 + 1,
        content: pair.def,
        type: 'definition',
        pairId: idx,
        isFlipped: false,
        isMatched: false
      });
    });

    setCards(gameCards.sort(() => 0.5 - Math.random()));
    setFlippedCards([]);
    setMatches(0);
    setMoves(0);
  };

  useEffect(() => {
    initGame();
  }, [notes]);

  const handleCardClick = (id: number) => {
    if (flippedCards.length === 2 || cards.find(c => c.id === id)?.isMatched || flippedCards.includes(id)) return;

    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      const first = cards.find(c => c.id === newFlipped[0])!;
      const second = cards.find(c => c.id === newFlipped[1])!;

      if (first.pairId === second.pairId) {
        // Match found
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.id === first.id || c.id === second.id ? { ...c, isMatched: true } : c
          ));
          setFlippedCards([]);
          setMatches(prev => prev + 1);
        }, 600);
      } else {
        // No match
        setTimeout(() => {
          setFlippedCards([]);
        }, 1200);
      }
    }
  };

  const isGameOver = matches > 0 && matches === cards.length / 2;

  return (
    <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100 mt-8 no-print">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Concept Matcher
          </h3>
          <p className="text-sm text-indigo-700">Test your memory! Match the key terms with their definitions.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs font-bold text-indigo-600 bg-white px-3 py-1.5 rounded-full border border-indigo-100 shadow-sm">
            Moves: {moves}
          </div>
          <button 
            onClick={initGame}
            className="p-2 text-indigo-600 hover:bg-white rounded-full transition shadow-sm"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(card => {
          const isFlipped = flippedCards.includes(card.id) || card.isMatched;
          return (
            <div 
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className={`h-32 rounded-2xl cursor-pointer transition-all duration-300 preserve-3d relative ${isFlipped ? 'rotate-y-180' : 'hover:scale-102 shadow-md'}`}
            >
              {/* Back of Card (Hidden) */}
              <div className="absolute inset-0 bg-white border-2 border-indigo-100 rounded-2xl flex items-center justify-center p-3 text-center backface-hidden overflow-hidden">
                <p className={`text-[10px] leading-tight font-medium text-slate-700 ${card.type === 'term' ? 'font-bold text-xs' : ''}`}>
                  {card.content}
                </p>
                {card.isMatched && (
                  <div className="absolute top-1 right-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  </div>
                )}
              </div>
              
              {/* Front of Card (Visible) */}
              <div className="absolute inset-0 bg-indigo-600 rounded-2xl flex items-center justify-center backface-hidden rotate-y-180 border-2 border-indigo-400">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white/80 font-bold">
                  ?
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isGameOver && (
        <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-between animate-in zoom-in-95 duration-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-green-900">Well done! Concept Mastered.</p>
              <p className="text-xs text-green-700">You matched everything in {moves} moves.</p>
            </div>
          </div>
          <button 
            onClick={initGame}
            className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition"
          >
            Play Again
          </button>
        </div>
      )}

      <style>{`
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .hover\:scale-102:hover { transform: scale(1.02); }
      `}</style>
    </div>
  );
};

export default MemoryGame;
