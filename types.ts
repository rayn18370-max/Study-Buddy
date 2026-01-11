
export interface StudyNote {
  heading: string;
  points: string[];
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface MCQQuestion {
  question: string;
  options: string[];
  correct_answer: string;
}

export interface ShortQuestion {
  question: string;
  answer: string;
}

export interface ExamQuestions {
  mcq: MCQQuestion[];
  short: ShortQuestion[];
}

export interface DiagramExplanation {
  diagram_title: string;
  explanation: string[];
}

export interface StudyBuddyResponse {
  id: string;
  timestamp: number;
  title: string;
  clean_notes: StudyNote[];
  flashcards: Flashcard[];
  exam_questions: ExamQuestions;
  diagram_explanation: DiagramExplanation[];
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}
