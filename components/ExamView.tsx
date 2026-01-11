
import React, { useState } from 'react';
import { ExamQuestions } from '../types';
import { CheckCircle2, XCircle, Info, PlusCircle, Loader2 } from 'lucide-react';
import { audioService } from '../services/audioService';

interface Props {
  questions: ExamQuestions;
  onGenerateMoreMCQs?: () => void;
  isGenerating?: boolean;
}

const ExamView: React.FC<Props> = ({ questions, onGenerateMoreMCQs, isGenerating }) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<number, string>>({});
  const [revealedShort, setRevealedShort] = useState<Record<number, boolean>>({});
  const [showOverallAnswers, setShowOverallAnswers] = useState(false);

  const handleOptionClick = (qIdx: number, option: string) => {
    if (showOverallAnswers) return;
    
    const isCorrect = option === questions.mcq[qIdx].correct_answer;
    if (isCorrect) audioService.playCorrect();
    else audioService.playWrong();
    
    setSelectedOptions(prev => ({ ...prev, [qIdx]: option }));
  };

  const toggleShortReveal = (qIdx: number) => {
    audioService.playClick();
    setRevealedShort(prev => ({ ...prev, [qIdx]: !prev[qIdx] }));
  };

  const resetPractice = () => {
    audioService.playClick();
    setSelectedOptions({});
    setShortAnswers({});
    setRevealedShort({});
    setShowOverallAnswers(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Interactive Practice</h3>
          <p className="text-sm text-slate-500">Test your knowledge and get instant feedback.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={resetPractice}
            className="flex-1 sm:flex-none px-4 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition border border-slate-200"
          >
            Reset
          </button>
          <button 
            onClick={() => { audioService.playClick(); setShowOverallAnswers(!showOverallAnswers); }}
            className={`flex-1 sm:flex-none px-4 py-3 rounded-xl font-bold transition ${showOverallAnswers ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
          >
            {showOverallAnswers ? 'Hide Answers' : 'Show Answers'}
          </button>
        </div>
      </div>

      {questions.mcq.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm shrink-0">A</span>
              Multiple Choice
            </h4>
          </div>
          <div className="grid gap-6">
            {questions.mcq.map((q, idx) => {
              const selected = selectedOptions[idx];
              const isCorrect = selected === q.correct_answer;
              const hasAnswered = !!selected || showOverallAnswers;

              return (
                <div key={idx} className={`p-5 sm:p-6 bg-white border rounded-2xl transition-all ${hasAnswered && !showOverallAnswers ? (isCorrect ? 'border-green-200 shadow-green-50 shadow-md' : 'border-red-200 shadow-red-50 shadow-md') : 'border-slate-200'}`}>
                  <div className="flex justify-between items-start mb-6 gap-3">
                    <p className="font-bold text-slate-800 text-lg leading-tight">{idx + 1}. {q.question}</p>
                    {hasAnswered && !showOverallAnswers && (
                      isCorrect ? <CheckCircle2 className="text-green-500 w-6 h-6 shrink-0" /> : <XCircle className="text-red-500 w-6 h-6 shrink-0" />
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt, oIdx) => {
                      let bgColor = 'bg-slate-50 border-slate-100 hover:border-indigo-200';
                      let textColor = 'text-slate-700';
                      
                      if (showOverallAnswers) {
                        if (opt === q.correct_answer) bgColor = 'bg-green-100 border-green-300 text-green-800 font-bold';
                      } else if (selected === opt) {
                        if (isCorrect) {
                          bgColor = 'bg-green-100 border-green-300 text-green-800 font-bold';
                        } else {
                          bgColor = 'bg-red-100 border-red-300 text-red-800 font-bold';
                        }
                      }

                      return (
                        <button 
                          key={oIdx} 
                          disabled={hasAnswered && !showOverallAnswers}
                          onClick={() => handleOptionClick(idx, opt)}
                          className={`p-4 min-h-[60px] border rounded-xl text-left text-sm transition-all ${bgColor} ${textColor} ${!hasAnswered ? 'hover:shadow-sm active:scale-[0.98]' : ''}`}
                        >
                          <div className="flex gap-2">
                            <span className="font-black opacity-30 shrink-0">{String.fromCharCode(65 + oIdx)}.</span>
                            <span>{opt}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {questions.short.length > 0 && (
        <section className="space-y-6">
          <h4 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm shrink-0">B</span>
            Short Answer
          </h4>
          <div className="grid gap-6">
            {questions.short.map((q, idx) => {
              const isRevealed = revealedShort[idx] || showOverallAnswers;
              return (
                <div key={idx} className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <p className="font-bold text-slate-800 text-lg mb-6 leading-tight">{idx + 1}. {q.question}</p>
                  
                  <div className="no-print">
                    <textarea 
                      placeholder="Type your answer here to test yourself..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition resize-none min-h-[120px]"
                      rows={4}
                      value={shortAnswers[idx] || ''}
                      onChange={(e) => setShortAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                    ></textarea>
                    
                    <button 
                      onClick={() => toggleShortReveal(idx)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-100 transition"
                    >
                      <Info className="w-4 h-4" />
                      {isRevealed ? 'Hide Answer' : 'Check Model Answer'}
                    </button>
                  </div>

                  {isRevealed && (
                    <div className="mt-6 p-5 bg-indigo-600/5 border-l-4 border-indigo-600 rounded-r-2xl animate-in slide-in-from-top-2 duration-300">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Model Answer</p>
                      <p className="text-sm text-indigo-900 leading-relaxed font-medium">{q.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default ExamView;
