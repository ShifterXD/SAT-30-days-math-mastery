import {
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Flag,
  Grid3X3,
  Highlighter,
  Home,
  Lock,
  MoreHorizontal,
  PanelLeftClose,
  RotateCcw,
  Trophy,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { practiceDays, type PracticeDay, type Question } from './data/practiceDays';

type Answers = Record<string, string>;
type Mode = 'home' | 'test' | 'review';
type Flagged = Record<string, boolean>;

type CalculatorKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | '+' | '-' | '×' | '÷' | '(' | ')';

const STORAGE_KEY = 'sat-30-days-math-mastery:v2';
const FLAG_KEY = 'sat-30-days-math-mastery:flags';

function normalizeAnswer(answer: string) {
  return answer.trim().toUpperCase().replace(/\s+/g, '');
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || '') as T;
  } catch {
    return fallback;
  }
}

function saveJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function scoreDay(day: PracticeDay, answers: Answers) {
  const answered = day.questions.filter((q) => answers[q.id]?.trim()).length;
  const correct = day.questions.filter((q) => normalizeAnswer(answers[q.id] || '') === normalizeAnswer(q.answer)).length;
  const total = day.questions.length;
  return { answered, correct, total, percent: total ? Math.round((correct / total) * 100) : 0 };
}

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function questionImageSrc(question: Question) {
  return `${import.meta.env.BASE_URL}${question.image.replace(/^\//, '')}`;
}

function evaluateCalculatorExpression(expression: string) {
  const normalized = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  if (!normalized.trim()) return '';
  if (!/^[\d+\-*/().\s]+$/.test(normalized)) return 'Error';

  try {
    const result = Function(`"use strict"; return (${normalized});`)() as unknown;
    if (typeof result !== 'number' || !Number.isFinite(result)) return 'Error';
    return Number.isInteger(result) ? String(result) : String(Number(result.toFixed(10)));
  } catch {
    return 'Error';
  }
}

function DayTile({ day, active, onSelect }: { day: PracticeDay; active: boolean; onSelect: () => void }) {
  return (
    <button className={`day-tile ${active ? 'active' : ''} ${day.status !== 'ready' ? 'locked' : ''}`} onClick={onSelect}>
      <span className="day-number">Day {day.day}</span>
      <strong>{day.focus}</strong>
      <span className="day-status">{day.status === 'ready' ? `${day.questions.length} questions · ready` : 'Coming soon'}</span>
      {day.status === 'ready' ? <Check size={17} /> : <Lock size={16} />}
    </button>
  );
}

function LaunchScreen({
  selectedDay,
  selectedDayNumber,
  setSelectedDayNumber,
  startTest,
  openReview,
  resetDay,
  stats
}: {
  selectedDay: PracticeDay;
  selectedDayNumber: number;
  setSelectedDayNumber: (day: number) => void;
  startTest: () => void;
  openReview: () => void;
  resetDay: () => void;
  stats: ReturnType<typeof scoreDay>;
}) {
  return (
    <main className="launch-shell">
      <section className="launch-hero">
        <div className="product-mark">SM</div>
        <p className="overline">SAT 30 Days Math Mastery</p>
        <h1>Bluebook-style daily SAT Math practice.</h1>
        <p className="hero-copy">
          A polished personal test environment for Pavel/Shifter: day-by-day modules, hidden answer keys,
          official-question assets, review mode, and a portfolio-ready codebase.
        </p>
        <div className="hero-actions">
          <button className="primary-action" onClick={startTest} disabled={selectedDay.status !== 'ready'}>
            Start Day {selectedDay.day}
          </button>
          <button className="secondary-action" onClick={openReview} disabled={selectedDay.status !== 'ready'}>
            <Trophy size={18} /> Review score
          </button>
          <button className="text-action" onClick={resetDay} disabled={selectedDay.status !== 'ready'}>
            <RotateCcw size={17} /> Reset answers
          </button>
        </div>
      </section>

      <aside className="launch-panel">
        <div className="panel-header">
          <span>Selected module</span>
          <strong>{selectedDay.title}</strong>
        </div>
        <h2>{selectedDay.focus}</h2>
        <div className="metric-grid">
          <div><span>Answered</span><strong>{stats.answered}/{stats.total}</strong></div>
          <div><span>Correct</span><strong>{stats.correct}/{stats.total}</strong></div>
          <div><span>Score</span><strong>{stats.percent}%</strong></div>
          <div><span>Time</span><strong>{selectedDay.durationMinutes}m</strong></div>
        </div>
      </aside>

      <section className="calendar-section">
        <div className="section-title-row">
          <div>
            <p className="overline">Practice calendar</p>
            <h2>30-day SAT Math sprint</h2>
          </div>
          <span className="subtle-pill">Day 1 loaded · future days prepared</span>
        </div>
        <div className="day-grid">
          {practiceDays.map((day) => (
            <DayTile
              key={day.day}
              day={day}
              active={selectedDayNumber === day.day}
              onSelect={() => setSelectedDayNumber(day.day)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function ToolButton({ icon, label, onClick, active = false }: { icon: ReactNode; label: string; onClick?: () => void; active?: boolean }) {
  return (
    <button className={`tool-button ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function SATCalculator({ onClose }: { onClose: () => void }) {
  const [expression, setExpression] = useState('');
  const [memory, setMemory] = useState<number | null>(null);
  const displayValue = expression || '0';

  const append = (value: CalculatorKey) => setExpression((current) => (current === 'Error' ? value : `${current}${value}`));
  const evaluate = () => setExpression((current) => evaluateCalculatorExpression(current));
  const clear = () => setExpression('');
  const backspace = () => setExpression((current) => (current === 'Error' ? '' : current.slice(0, -1)));
  const currentNumber = () => {
    const value = Number(evaluateCalculatorExpression(expression));
    return Number.isFinite(value) ? value : 0;
  };

  const keys: Array<CalculatorKey | 'AC' | '⌫' | '='> = [
    'AC', '(', ')', '÷',
    '7', '8', '9', '×',
    '4', '5', '6', '-',
    '1', '2', '3', '+',
    '0', '.', '⌫', '='
  ];

  return (
    <aside className="sat-calculator" aria-label="SAT calculator">
      <div className="calc-header">
        <div>
          <strong>Calculator</strong>
          <span>Basic SAT math tool</span>
        </div>
        <button className="calc-close" onClick={onClose} aria-label="Close calculator"><X size={18} /></button>
      </div>
      <div className="calc-display" aria-live="polite">{displayValue}</div>
      <div className="calc-memory-row">
        <button onClick={() => setMemory(currentNumber())}>MS</button>
        <button onClick={() => memory !== null && setExpression((current) => `${current}${memory}`)}>MR</button>
        <button onClick={() => setMemory(null)}>MC</button>
      </div>
      <div className="calc-keypad">
        {keys.map((key) => {
          const isOperator = ['÷', '×', '-', '+', '='].includes(key);
          return (
            <button
              key={key}
              className={`${isOperator ? 'operator' : ''} ${key === '=' ? 'equals' : ''}`}
              onClick={() => {
                if (key === 'AC') clear();
                else if (key === '⌫') backspace();
                else if (key === '=') evaluate();
                else append(key);
              }}
            >
              {key}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function QuestionRail({
  questions,
  currentIndex,
  answers,
  flagged,
  setQuestionIndex
}: {
  questions: Question[];
  currentIndex: number;
  answers: Answers;
  flagged: Flagged;
  setQuestionIndex: (index: number) => void;
}) {
  return (
    <aside className="question-rail" aria-label="Question navigation">
      <div className="rail-title">Questions</div>
      <div className="rail-grid">
        {questions.map((question, index) => (
          <button
            key={question.id}
            className={`q-dot ${index === currentIndex ? 'current' : ''} ${answers[question.id] ? 'answered' : ''} ${flagged[question.id] ? 'flagged' : ''}`}
            onClick={() => setQuestionIndex(index)}
            aria-label={`Go to question ${question.number}`}
          >
            {question.number}
          </button>
        ))}
      </div>
    </aside>
  );
}

function AnswerPanel({ question, answer, setAnswer }: { question: Question; answer: string; setAnswer: (value: string) => void }) {
  if (question.type === 'student-produced-response') {
    return (
      <section className="answer-panel">
        <h3>Your Answer</h3>
        <p>Enter a number, decimal, or fraction exactly as you would on the digital SAT.</p>
        <input
          className="spr-input"
          value={answer || ''}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Type your answer"
          inputMode="decimal"
        />
      </section>
    );
  }

  return (
    <section className="answer-panel">
      <h3>Your Answer</h3>
      <p>Select one option. The official answer choices are visible in the question pane.</p>
      <div className="bluebook-choices">
        {['A', 'B', 'C', 'D'].map((letter) => (
          <button key={letter} className={`bb-choice ${answer === letter ? 'selected' : ''}`} onClick={() => setAnswer(letter)}>
            <span>{letter}</span>
            <strong>Choice {letter}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function TestScreen({
  selectedDay,
  currentQuestion,
  questionIndex,
  setQuestionIndex,
  answers,
  setAnswer,
  flagged,
  toggleFlag,
  finish,
  goHome,
  secondsLeft,
  timerHidden,
  setTimerHidden
}: {
  selectedDay: PracticeDay;
  currentQuestion: Question;
  questionIndex: number;
  setQuestionIndex: (index: number) => void;
  answers: Answers;
  setAnswer: (question: Question, value: string) => void;
  flagged: Flagged;
  toggleFlag: (question: Question) => void;
  finish: () => void;
  goHome: () => void;
  secondsLeft: number;
  timerHidden: boolean;
  setTimerHidden: (hidden: boolean) => void;
}) {
  const progress = ((questionIndex + 1) / selectedDay.questions.length) * 100;
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  return (
    <main className="bluebook-shell">
      <header className="bb-topbar">
        <div className="bb-brand" onClick={goHome} role="button" tabIndex={0}>
          <div className="bb-logo">SM</div>
          <div>
            <strong>SAT Math</strong>
            <span>{selectedDay.title}: {selectedDay.focus}</span>
          </div>
        </div>
        <div className="timer-block">
          <span>{timerHidden ? 'Timer hidden' : formatTime(secondsLeft)}</span>
          <button onClick={() => setTimerHidden(!timerHidden)}>{timerHidden ? 'Show' : 'Hide'}</button>
        </div>
        <div className="toolbar-strip">
          <ToolButton icon={<CircleHelp size={18} />} label="Directions" />
          <ToolButton icon={<Highlighter size={18} />} label="Highlights & Notes" />
          <ToolButton icon={<Calculator size={18} />} label="Calculator" active={calculatorOpen} onClick={() => setCalculatorOpen((open) => !open)} />
          <ToolButton icon={<MoreHorizontal size={18} />} label="More" />
        </div>
      </header>

      <div className="module-strip">
        <span>Module 1: Math</span>
        <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
        <strong>Question {currentQuestion.number} of {selectedDay.questions.length}</strong>
      </div>

      <div className="bb-workspace">
        {calculatorOpen && <SATCalculator onClose={() => setCalculatorOpen(false)} />}
        <QuestionRail questions={selectedDay.questions} currentIndex={questionIndex} answers={answers} flagged={flagged} setQuestionIndex={setQuestionIndex} />

        <section className="question-stage">
          <div className="stage-card">
            <div className="stage-topline">
              <span className="question-badge">Question {currentQuestion.number}</span>
              <span className="difficulty-chip">{currentQuestion.difficulty}</span>
              <button className={`mark-button ${flagged[currentQuestion.id] ? 'on' : ''}`} onClick={() => toggleFlag(currentQuestion)}>
                <Flag size={17} /> Mark for Review
              </button>
            </div>
            <div className="question-document">
              <img src={questionImageSrc(currentQuestion)} alt={`SAT question ${currentQuestion.number}`} />
            </div>
          </div>
        </section>

        <AnswerPanel question={currentQuestion} answer={answers[currentQuestion.id] || ''} setAnswer={(value) => setAnswer(currentQuestion, value)} />
      </div>

      <footer className="bb-footer">
        <button className="footer-link" onClick={goHome}><Home size={17} /> Exit</button>
        <button className="footer-link"><PanelLeftClose size={17} /> Question Menu</button>
        <div className="footer-nav">
          <button className="nav-button" onClick={() => setQuestionIndex(Math.max(0, questionIndex - 1))} disabled={questionIndex === 0}>
            <ChevronLeft size={18} /> Back
          </button>
          {questionIndex < selectedDay.questions.length - 1 ? (
            <button className="next-button" onClick={() => setQuestionIndex(questionIndex + 1)}>
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <button className="next-button" onClick={finish}>Finish & score</button>
          )}
        </div>
      </footer>
    </main>
  );
}

function ReviewScreen({ selectedDay, answers, stats, setMode, setQuestionIndex }: { selectedDay: PracticeDay; answers: Answers; stats: ReturnType<typeof scoreDay>; setMode: (mode: Mode) => void; setQuestionIndex: (index: number) => void }) {
  return (
    <main className="review-shell">
      <section className="review-card-main">
        <div className="review-heading">
          <Trophy size={34} />
          <div>
            <p className="overline">Day {selectedDay.day} score report</p>
            <h1>{stats.correct}/{stats.total} correct · {stats.percent}%</h1>
            <p>Use this screen after practice. Correct answers are hidden during the test and revealed only here.</p>
          </div>
        </div>
        <div className="review-actions">
          <button className="primary-action" onClick={() => setMode('test')}>Continue practice</button>
          <button className="secondary-action" onClick={() => setMode('home')}><Grid3X3 size={17} /> Calendar</button>
        </div>
      </section>

      <section className="review-table">
        {selectedDay.questions.map((question, index) => {
          const user = answers[question.id] || '';
          const ok = normalizeAnswer(user) === normalizeAnswer(question.answer);
          return (
            <button key={question.id} className="review-row" onClick={() => { setQuestionIndex(index); setMode('test'); }}>
              <span className={`row-number ${ok ? 'ok' : 'missed'}`}>{question.number}</span>
              <div>
                <strong>{question.skill}</strong>
                <small>{question.difficulty} · Your answer: {user || 'blank'} · Correct: {question.answer}</small>
              </div>
              <em>{ok ? 'Correct' : 'Review'}</em>
            </button>
          );
        })}
      </section>
    </main>
  );
}

function App() {
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [mode, setMode] = useState<Mode>('home');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(() => loadJson<Answers>(STORAGE_KEY, {}));
  const [flagged, setFlagged] = useState<Flagged>(() => loadJson<Flagged>(FLAG_KEY, {}));
  const [timerHidden, setTimerHidden] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(70 * 60);

  const selectedDay = practiceDays.find((day) => day.day === selectedDayNumber) || practiceDays[0];
  const currentQuestion = selectedDay.questions[questionIndex] || selectedDay.questions[0];
  const stats = useMemo(() => scoreDay(selectedDay, answers), [selectedDay, answers]);

  useEffect(() => {
    if (mode !== 'test') return;
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [mode]);

  const setAnswer = (question: Question, value: string) => {
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    saveJson(STORAGE_KEY, next);
  };

  const toggleFlag = (question: Question) => {
    const next = { ...flagged, [question.id]: !flagged[question.id] };
    setFlagged(next);
    saveJson(FLAG_KEY, next);
  };

  const resetDay = () => {
    const nextAnswers = { ...answers };
    const nextFlags = { ...flagged };
    selectedDay.questions.forEach((question) => {
      delete nextAnswers[question.id];
      delete nextFlags[question.id];
    });
    setAnswers(nextAnswers);
    setFlagged(nextFlags);
    saveJson(STORAGE_KEY, nextAnswers);
    saveJson(FLAG_KEY, nextFlags);
    setQuestionIndex(0);
    setSecondsLeft(selectedDay.durationMinutes * 60);
  };

  if (mode === 'review') {
    return <ReviewScreen selectedDay={selectedDay} answers={answers} stats={stats} setMode={setMode} setQuestionIndex={setQuestionIndex} />;
  }

  if (mode === 'test' && currentQuestion) {
    return (
      <TestScreen
        selectedDay={selectedDay}
        currentQuestion={currentQuestion}
        questionIndex={questionIndex}
        setQuestionIndex={setQuestionIndex}
        answers={answers}
        setAnswer={setAnswer}
        flagged={flagged}
        toggleFlag={toggleFlag}
        finish={() => setMode('review')}
        goHome={() => setMode('home')}
        secondsLeft={secondsLeft}
        timerHidden={timerHidden}
        setTimerHidden={setTimerHidden}
      />
    );
  }

  return (
    <LaunchScreen
      selectedDay={selectedDay}
      selectedDayNumber={selectedDayNumber}
      setSelectedDayNumber={(day) => {
        const nextDay = practiceDays.find((practiceDay) => practiceDay.day === day);
        setSelectedDayNumber(day);
        setQuestionIndex(0);
        setSecondsLeft((nextDay?.durationMinutes || 70) * 60);
      }}
      startTest={() => selectedDay.status === 'ready' && setMode('test')}
      openReview={() => selectedDay.status === 'ready' && setMode('review')}
      resetDay={resetDay}
      stats={stats}
    />
  );
}

export default App;
