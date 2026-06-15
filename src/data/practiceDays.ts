import day1 from './day1.json';

export type QuestionType = 'multiple-choice' | 'student-produced-response';

export type Question = {
  id: string;
  number: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | string;
  skill: string;
  type: QuestionType;
  image: string;
  answer: string;
  choices: string[];
  source: string;
};

export type PracticeDay = {
  day: number;
  title: string;
  focus: string;
  durationMinutes: number;
  status: 'ready' | 'locked' | 'draft';
  questions: Question[];
};

const emptyDay = (day: number): PracticeDay => ({
  day,
  title: `Day ${day}`,
  focus: 'Coming soon',
  durationMinutes: 70,
  status: 'locked',
  questions: []
});

export const practiceDays: PracticeDay[] = [
  {
    day: 1,
    title: 'Day 1',
    focus: 'Linear equations in one variable',
    durationMinutes: 70,
    status: 'ready',
    questions: day1 as Question[]
  },
  ...Array.from({ length: 29 }, (_, index) => emptyDay(index + 2))
];
