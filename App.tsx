
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  BookOpen, 
  CheckSquare, 
  Loader2, 
  AlertCircle,
  FileBox,
  PlusCircle,
  Printer,
  ClipboardList,
  Trash2,
  ChevronRight,
  Plus,
  FileDown,
  Heart,
  File as FileIcon,
  History,
  Clock,
  ExternalLink,
  Volume2,
  VolumeX,
  Download,
  Lock
} from 'lucide-react';
import { processStudyMaterial, processTextMaterial, generateMoreContent } from './services/geminiService';
import { audioService } from './services/audioService';
import { StudyBuddyResponse, AppState } from './types';
import Flashcard from './components/Flashcard';
import ExamView from './components/ExamView';
import KnowledgeDash from './components/KnowledgeDash';

const LOADING_MESSAGES = [
  "Reading your material...",
  "Analyzing content...",
  "Structuring notes for you...",
  "Generating exam questions...",
  "Creating awesome flashcards...",
  "Almost ready, Study Buddy!",
  "Fine-tuning explanations..."
];

const DAILY_LIMIT = 5;

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [data, setData] = useState<StudyBuddyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'notes' | 'flashcards' | 'exam'>('notes');
  const [currentFile, setCurrentFile] = useState<{base64: string, mime: string} | null>(null);
  const [pastedContent, setPastedContent] = useState<string>('');
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [history, setHistory] = useState<StudyBuddyResponse[]>([]);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('study_buddy_muted') === 'true');
  
  // Daily Usage Tracking
  const [dailyUsage, setDailyUsage] = useState(() => {
    const saved = localStorage.getItem('study_buddy_usage');
    const today = new Date().toDateString();
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.lastDate === today) return parsed;
    }
    return { count: 0, lastDate: today };
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    audioService.setMuted(isMuted);
    localStorage.setItem('study_buddy_muted', isMuted.toString());
  }, [isMuted]);

  useEffect(() => {
    const saved = localStorage.getItem('study_buddy_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('study_buddy_usage', JSON.stringify(dailyUsage));
  }, [dailyUsage]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (isMuted) audioService.playClick();
  };

  const checkLimit = () => {
    const today = new Date().toDateString();
    if (dailyUsage.lastDate === today && dailyUsage.count >= DAILY_LIMIT) {
      audioService.playError();
      setError(`You've reached your daily limit of ${DAILY_LIMIT} study sessions. You're doing great! Take a break and come back tomorrow.`);
      setState(AppState.ERROR);
      return false;
    }
    return true;
  };

  const incrementUsage = () => {
    const today = new Date().toDateString();
    setDailyUsage(prev => ({
      count: prev.lastDate === today ? prev.count + 1 : 1,
      lastDate: today
    }));
  };

  const saveToHistory = (session: StudyBuddyResponse) => {
    setHistory(prev => {
      const filtered = prev.filter(item => item.id !== session.id);
      const updated = [session, ...filtered].slice(0, 15);
      localStorage.setItem('study_buddy_history', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteFromHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    audioService.playClick();
    setHistory(prev => {
      const updated = prev.filter(item => id !== item.id);
      localStorage.setItem('study_buddy_history', JSON.stringify(updated));
      return updated;
    });
  };

  const startAnalysis = async (type: 'upload' | 'paste') => {
    if (!checkLimit()) return;
    
    audioService.playClick();
    setState(AppState.LOADING);
    setError(null);
    const interval = setInterval(() => {
      setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    try {
      let result: StudyBuddyResponse;
      if (type === 'upload' && currentFile) {
        result = await processStudyMaterial(currentFile.base64, currentFile.mime);
      } else if (type === 'paste' && pastedContent) {
        result = await processTextMaterial(pastedContent);
      } else {
        throw new Error("Missing input material.");
      }
      setData(result);
      saveToHistory(result);
      incrementUsage();
      audioService.playSuccess();
      setState(AppState.RESULT);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred. Please try again.");
      audioService.playError();
      setState(AppState.ERROR);
    } finally {
      clearInterval(interval);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!checkLimit()) return;

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        const mimeType = file.type;
        const base64Content = base64.split(',')[1];
        setCurrentFile({ base64: base64Content, mime: mimeType });
        setPastedContent('');
        
        setState(AppState.LOADING);
        const interval = setInterval(() => {
          setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
        }, 2000);
        
        try {
          const result = await processStudyMaterial(base64Content, mimeType);
          setData(result);
          saveToHistory(result);
          incrementUsage();
          audioService.playSuccess();
          setState(AppState.RESULT);
        } catch (err: any) {
          setError(err.message || "Analysis failed.");
          audioService.playError();
          setState(AppState.ERROR);
        } finally {
          clearInterval(interval);
        }
      };
    } catch (err: any) {
      setError(err.message || "Failed to read file.");
      audioService.playError();
      setState(AppState.ERROR);
    }
  };

  const handleReset = () => {
    audioService.playClick();
    setState(AppState.IDLE);
    setData(null);
    setError(null);
    setCurrentFile(null);
    setPastedContent('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTabChange = (tab: 'notes' | 'flashcards' | 'exam') => {
    audioService.playClick();
    setActiveTab(tab);
  };

  const loadFromHistory = (session: StudyBuddyResponse) => {
    audioService.playClick();
    setData(session);
    setState(AppState.RESULT);
  };

  const handleDownloadFullDoc = () => {
    if (!data) return;
    audioService.playClick();

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${data.title}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #334155; }
          h1 { color: #4f46e5; font-size: 24pt; text-align: center; border-bottom: 2pt solid #e2e8f0; padding-bottom: 10pt; }
          h2 { color: #1e1b4b; margin-top: 30pt; font-size: 18pt; border-left: 5pt solid #4f46e5; padding-left: 10pt; }
          h3 { color: #334155; margin-top: 20pt; font-size: 14pt; }
          ul { margin-bottom: 15pt; }
          li { margin-bottom: 8pt; }
          .question-box { background: #f8fafc; padding: 15pt; border: 1pt solid #e2e8f0; border-radius: 8pt; margin-bottom: 15pt; }
          .footer { font-size: 9pt; color: #94a3b8; text-align: center; margin-top: 50pt; }
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body>
        <h1>${data.title}</h1>
        <p align="center"><i>A Study Guide Powered by Social Drive AI</i></p>

        <h2>1. Structured Notes</h2>
        ${data.clean_notes.map(note => `
          <h3>${note.heading}</h3>
          <ul>${note.points.map(p => `<li>${p}</li>`).join('')}</ul>
        `).join('')}

        ${data.diagram_explanation.length > 0 ? `
          <div class="page-break"></div>
          <h2>2. Diagram Explanations</h2>
          ${data.diagram_explanation.map(dia => `
            <h3>${dia.diagram_title}</h3>
            <ul>${dia.explanation.map(e => `<li>${e}</li>`).join('')}</ul>
          `).join('')}
        ` : ''}

        <div class="page-break"></div>
        <h2>3. Flashcards</h2>
        ${data.flashcards.map((card, i) => `
          <div class="question-box">
            <p><b>Card ${i+1} Question:</b> ${card.front}</p>
            <p><b>Card ${i+1} Answer:</b> ${card.back}</p>
          </div>
        `).join('')}

        <div class="page-break"></div>
        <h2>4. Practice Exam</h2>
        <h3>Section A: Multiple Choice</h3>
        ${data.exam_questions.mcq.map((q, i) => `
          <div class="question-box">
            <p><b>Q${i+1}: ${q.question}</b></p>
            <p>${q.options.map((opt, oi) => `${String.fromCharCode(65+oi)}) ${opt}`).join('<br/>')}</p>
            <p><i>Correct Answer: ${q.correct_answer}</i></p>
          </div>
        `).join('')}

        <h3>Section B: Short Answers</h3>
        ${data.exam_questions.short.map((q, i) => `
          <div class="question-box">
            <p><b>Q${i+1}: ${q.question}</b></p>
            <p><i>Model Answer: ${q.answer}</i></p>
          </div>
        `).join('')}

        <div class="footer">
          Generated by Study Buddy • Social Drive AI
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.title.replace(/\s+/g, '_')}_Study_Guide.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
              S
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-none">Study Buddy</h1>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1">Social Drive</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleMute}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            {state === AppState.RESULT && (
              <div className="flex gap-2">
                <button 
                  onClick={handleDownloadFullDoc}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Save Full DOC</span>
                </button>
                <button 
                  onClick={handleReset}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-slate-600 rounded-lg transition"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
        {state === AppState.IDLE && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mt-6 sm:mt-12 mb-12">
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
                <BookOpen className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl mb-4 px-2">
                Turn your notes into <span className="text-indigo-600">exam-ready</span> tools.
              </h2>
              <p className="text-lg text-slate-600 mb-8 px-4 max-w-2xl mx-auto">
                Upload images, PDFs, or paste your notes. Study Buddy handles the structuring and practice tools.
              </p>

              <div className="mb-10 flex flex-col items-center gap-4">
                <div className="flex justify-center p-1 bg-slate-200/50 rounded-2xl w-fit">
                  <button 
                    onClick={() => { audioService.playClick(); setInputMode('upload'); }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition ${inputMode === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <Upload className="w-4 h-4" />
                    Upload
                  </button>
                  <button 
                    onClick={() => { audioService.playClick(); setInputMode('paste'); }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition ${inputMode === 'paste' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    Paste
                  </button>
                </div>
                
                {/* Daily Usage Indicator */}
                <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full border border-slate-200 shadow-sm">
                  <div className={`w-2 h-2 rounded-full ${dailyUsage.count >= DAILY_LIMIT ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {dailyUsage.count} of {DAILY_LIMIT} sessions used today
                  </span>
                </div>
              </div>

              {inputMode === 'upload' ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative group cursor-pointer max-w-2xl mx-auto px-4 ${dailyUsage.count >= DAILY_LIMIT ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                  <div className="relative bg-white p-8 sm:p-12 rounded-3xl border-2 border-dashed border-slate-200 group-hover:border-indigo-300 transition-all">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                        <FileBox className="w-8 h-8" />
                      </div>
                      <p className="text-lg font-bold text-slate-800 mb-1">Click to upload material</p>
                      <p className="text-sm text-slate-500">Supports Images and PDFs</p>
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden" 
                    accept="image/*,application/pdf"
                  />
                </div>
              ) : (
                <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-100 flex flex-col gap-4 max-w-2xl mx-auto">
                  <textarea 
                    placeholder="Paste your study notes here..."
                    className="w-full min-h-[200px] p-4 sm:p-6 text-slate-800 text-lg border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition resize-none"
                    value={pastedContent}
                    onChange={(e) => setPastedContent(e.target.value)}
                  ></textarea>
                  <button 
                    onClick={() => startAnalysis('paste')}
                    disabled={!pastedContent.trim() || dailyUsage.count >= DAILY_LIMIT}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                  >
                    Analyze & Generate
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {history.length > 0 && (
              <div className="mt-16 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-2 mb-6">
                  <History className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-xl font-bold text-slate-800">Recent Study Sessions</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {history.map((session) => (
                    <div 
                      key={session.id}
                      onClick={() => loadFromHistory(session)}
                      className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-50 transition-all cursor-pointer relative"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 pr-8">
                          {session.title || "Untitled Session"}
                        </h4>
                        <button 
                          onClick={(e) => deleteFromHistory(e, session.id)}
                          className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete History"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(session.timestamp).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {session.flashcards.length} Cards
                        </div>
                        <div className="flex items-center gap-1 text-indigo-500 font-bold">
                          Practice Now
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {state === AppState.LOADING && (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
                <Loader2 className="w-10 h-10 animate-pulse" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Analyzing Material</h3>
            <p className="text-slate-500 animate-fade-in font-medium transition-all">
              {LOADING_MESSAGES[loadingMsgIdx]}
            </p>
          </div>
        )}

        {state === AppState.ERROR && (
          <div className="max-w-xl mx-auto mt-6 sm:mt-12 bg-white p-6 sm:p-8 rounded-3xl border border-red-100 shadow-xl shadow-red-50 mx-2">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              {error?.includes("limit") ? <Lock className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 text-center">
              {error?.includes("limit") ? "Daily Limit Reached" : "Something went wrong"}
            </h3>
            <p className="text-slate-600 text-center mb-8">{error}</p>
            <button 
              onClick={handleReset}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
            >
              {error?.includes("limit") ? "Back to Home" : "Try Again"}
            </button>
          </div>
        )}

        {state === AppState.RESULT && data && (
          <div className="space-y-8 animate-in fade-in duration-700 px-1">
            <div className="bg-indigo-600 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-indigo-100 relative overflow-hidden no-print">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                   <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-widest">Study Session</span>
                   <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{dailyUsage.count}/{DAILY_LIMIT} Used Today</div>
                </div>
                <input 
                  type="text" 
                  value={data.title} 
                  onChange={(e) => setData({...data, title: e.target.value})}
                  className="w-full bg-transparent text-2xl sm:text-4xl font-black outline-none border-b-2 border-white/0 focus:border-white/50 transition-all placeholder:text-white/50"
                  placeholder="Topic Title"
                />
              </div>
            </div>

            <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-full sm:w-fit no-print">
              <button 
                onClick={() => handleTabChange('notes')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'notes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                <FileText className="w-4 h-4" />
                Notes
              </button>
              <button 
                onClick={() => handleTabChange('flashcards')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'flashcards' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                <BookOpen className="w-4 h-4" />
                Flashcards
              </button>
              <button 
                onClick={() => handleTabChange('exam')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'exam' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                <CheckSquare className="w-4 h-4" />
                Practice
              </button>
            </div>

            <div className="min-h-[500px] no-print">
              {activeTab === 'notes' && (
                <div className="space-y-8">
                  <KnowledgeDash data={data} />
                  <div className="grid gap-6">
                    {data.clean_notes.map((note, noteIdx) => (
                      <section key={noteIdx} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm group">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="w-2 h-8 bg-indigo-600 rounded-full shrink-0"></span>
                            <input 
                              type="text" 
                              value={note.heading}
                              className="text-xl font-extrabold text-slate-800 outline-none w-full"
                              readOnly
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          {note.points.map((pt, pIdx) => (
                            <div key={pIdx} className="flex gap-4 group/point">
                              <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>
                              <p className="flex-1 text-slate-700 leading-relaxed font-medium py-1">{pt}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'flashcards' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.flashcards.map((card, idx) => (
                      <Flashcard key={idx} card={card} />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'exam' && (
                <div className="space-y-8">
                  <div className="bg-white p-4 sm:p-8 rounded-3xl border border-slate-100 shadow-sm relative">
                    <ExamView 
                      questions={data.exam_questions} 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 bg-slate-50 border-t border-slate-200 mt-auto no-print">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-red-500 fill-current" />
            <p className="text-slate-800 font-bold">A Product of Social Drive</p>
          </div>
          <p className="text-slate-500 text-sm font-medium px-4 mb-2">Study Buddy is powered by Social Drive AI.</p>
          <div className="inline-block px-4 py-1.5 bg-indigo-100/50 rounded-full border border-indigo-100">
            <p className="text-indigo-600 text-[11px] font-black uppercase tracking-widest">Made by Rayyan</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
