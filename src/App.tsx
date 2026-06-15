import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Flag, Grid3X3, Lock, RotateCcw, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { practiceDays, type PracticeDay, type Question } from './data/practiceDays';

type Answers = Record<string, string>;
type Mode = 'dashboard' | 'practice' | 'review';

const STORAGE_KEY = 'sat-30-days-math-mastery';

function normalizeAnswer(answer: string) {
  return answer.trim().toUpperCase().replace(/\s+/g, '');
}

function loadAnswers(): Answers {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Answers;
  } catch {
    return {};
  }
}

function saveAnswers(answers: Answers) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
}

function scoreDay(day: PracticeDay, answers: Answers) {
  const answered = day.questions.filter((q) => answers[q.id]?.trim()).length;
  const correct = day.questions.filter((q) => normalizeAnswer(answers[q.id] || '') === normalizeAnswer(q.answer)).length;
  return { answered, correct, total: day.questions.length, percent: day.questions.length ? Math.round((correct / day.questions.length) * 100) : 0 };
}

function DayCard({ day, selected, onSelect }: { day: PracticeDay; selected: boolean; onSelect: () => void }) {
  return (
    <button className={`day-card ${selected ? 'selected' : ''} ${day.status === 'locked' ? 'locked' : ''}`} onClick={onSelect}>
      <div className="day-card-top">
        <span>Day {day.day}</span>
        {day.status === 'ready' ? <CheckCircle2 size={16} /> : <Lock size={15} />}
      </div>
      <strong>{day.focus}</strong>
      <small>{day.status === 'ready' ? `${day.questions.length} official questions` : 'Prepared slot'}</small>
    </button>
  );
}

function ChoiceButton({ letter, active, onClick }: { letter: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`choice ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="choice-letter">{letter}</span>
      <span>Choose {letter}</span>
    </button>
  );
}

function QuestionPanel({ question, answer, setAnswer, reveal }: { question: Question; answer: string; setAnswer: (value: string) => void; reveal: boolean }) {
  const isMC = question.type === 'multiple-choice';
  const isCorrect = normalizeAnswer(answer) === normalizeAnswer(question.answer);

  return (
    <section className="question-panel">
      <div className="question-meta-row">
        <span className="pill">Question {question.number}</span>
        <span className="pill muted">{question.difficulty}</span>
        <span className="pill muted">{isMC ? 'Multiple choice' : 'Student-produced response'}</span>
      </div>

      <div className="paper-frame">
        <img src={question.image} alt={`SAT question ${question.number}`} />
      </div>

      {isMC ? (
        <div className="choices-grid" aria-label="Answer choices">
          {['A', 'B', 'C', 'D'].map((letter) => (
            <ChoiceButton key={letter} letter={letter} active={answer === letter} onClick={() => setAnswer(letter)} />
          ))}
        </div>
      ) : (
        <div className="spr-box">
          <label htmlFor={`answer-${question.id}`}>Your answer</label>
          <input
            id={`answer-${question.id}`}
            value={answer || ''}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Type a number, decimal, or fraction"
          />
        </div>
      )}

      {reveal && (
        <div className={`result-card ${isCorrect ? 'correct' : 'wrong'}`}>
          <strong>{isCorrect ? 'Correct' : 'Review this one'}</strong>
          <span>Correct answer: {question.answer}</span>
        </div>
      )}
    </section>
  );
}

function App() {
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [mode, setMode] = useState<Mode>('dashboard');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(() => loadAnswers());
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});

  const selectedDay = practiceDays.find((day) => day.day === selectedDayNumber) || practiceDays[0];
  const currentQuestion = selectedDay.questions[questionIndex];
  const stats = useMemo(() => scoreDay(selectedDay, answers), [selectedDay, answers]);

  const setAnswer = (question: Question, value: string) => {
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    saveAnswers(next);
  };

  const resetDay = () => {
    const next = { ...answers };
    selectedDay.questions.forEach((question) => delete next[question.id]);
    setAnswers(next);
    saveAnswers(next);
    setQuestionIndex(0);
    setMode('practice');
  };

  const startPractice = () => {
    if (selectedDay.status !== 'ready') return;
    setQuestionIndex(0);
    setMode('practice');
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">S</div>
          <div>
            <strong>SAT Mastery</strong>
            <span>30-day math sprint</span>
          </div>
        </div>

        <div className="side-section-title">Practice calendar</div>
        <div className="day-list">
          {practiceDays.map((day) => (
            <DayCard
              key={day.day}
              day={day}
              selected={selectedDay.day === day.day}
              onSelect={() => {
                setSelectedDayNumber(day.day);
                setMode('dashboard');
                setQuestionIndex(0);
              }}
            />
          ))}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Personal SAT Math Lab</span>
            <h1>{selectedDay.title}: {selectedDay.focus}</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-btn" onClick={() => setMode('dashboard')}><Grid3X3 size={16} /> Dashboard</button>
            <button className="ghost-btn" onClick={() => setMode('review')}><Trophy size={16} /> Review</button>
          </div>
        </header>

        {mode === 'dashboard' && (
          <div className="dashboard-grid">
            <section className="hero-card">
              <span className="pill accent"><BookOpen size={14} /> Official-style practice</span>
              <h2>Bluebook-inspired SAT practice, without answers shown on the question page.</h2>
              <p>
                Day 1 is loaded with 50 College Board SAT Suite Question Bank questions on linear equations in one variable.
                Future days are already structured as locked slots, so new daily sets can be dropped in cleanly.
              </p>
              <div className="hero-actions">
                <button className="primary-btn" onClick={startPractice} disabled={selectedDay.status !== 'ready'}>Start Day {selectedDay.day}</button>
                <button className="ghost-btn" onClick={resetDay} disabled={selectedDay.status !== 'ready'}><RotateCcw size={16} /> Reset day</button>
              </div>
            </section>

            <section className="stats-card">
              <div className="stat"><span>Answered</span><strong>{stats.answered}/{stats.total}</strong></div>
              <div className="stat"><span>Correct</span><strong>{stats.correct}/{stats.total}</strong></div>
              <div className="stat"><span>Score</span><strong>{stats.percent}%</strong></div>
              <div className="stat"><span>Timer target</span><strong>{selectedDay.durationMinutes}m</strong></div>
            </section>
          </div>
        )}

        {mode === 'practice' && currentQuestion && (
          <div className="test-layout">
            <nav className="question-nav">
              {selectedDay.questions.map((question, index) => (
                <button
                  key={question.id}
                  className={`bubble ${index === questionIndex ? 'current' : ''} ${answers[question.id] ? 'answered' : ''} ${flagged[question.id] ? 'flagged' : ''}`}
                  onClick={() => setQuestionIndex(index)}
                >
                  {question.number}
                </button>
              ))}
            </nav>

            <QuestionPanel
              question={currentQuestion}
              answer={answers[currentQuestion.id] || ''}
              setAnswer={(value) => setAnswer(currentQuestion, value)}
              reveal={false}
            />

            <footer className="test-footer">
              <button className="ghost-btn" onClick={() => setQuestionIndex(Math.max(0, questionIndex - 1))} disabled={questionIndex === 0}>
                <ChevronLeft size={16} /> Back
              </button>
              <button
                className={`ghost-btn ${flagged[currentQuestion.id] ? 'flag-on' : ''}`}
                onClick={() => setFlagged((prev) => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }))}
              >
                <Flag size={16} /> Mark for review
              </button>
              {questionIndex < selectedDay.questions.length - 1 ? (
                <button className="primary-btn" onClick={() => setQuestionIndex(questionIndex + 1)}>
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button className="primary-btn" onClick={() => setMode('review')}>Finish & score</button>
              )}
            </footer>
          </div>
        )}

        {mode === 'review' && (
          <section className="review-screen">
            <div className="review-hero">
              <Clock3 size={18} />
              <div>
                <h2>Day {selectedDay.day} review</h2>
                <p>{stats.correct}/{stats.total} correct · {stats.answered}/{stats.total} answered · {stats.percent}%</p>
              </div>
            </div>
            <div className="review-list">
              {selectedDay.questions.map((question, index) => (
                <div key={question.id} className="review-item">
                  <button className="bubble answered" onClick={() => { setQuestionIndex(index); setMode('practice'); }}>{question.number}</button>
                  <div>
                    <strong>{question.skill}</strong>
                    <span>{question.difficulty} · Your answer: {answers[question.id] || 'blank'} · Correct: {question.answer}</span>
                  </div>
                  <span className={normalizeAnswer(answers[question.id] || '') === normalizeAnswer(question.answer) ? 'status-good' : 'status-bad'}>
                    {normalizeAnswer(answers[question.id] || '') === normalizeAnswer(question.answer) ? 'Correct' : 'Missed'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default App;
