# SAT 30 Days Math Mastery

A personal, portfolio-ready SAT Math practice web app for a 30-day sprint.

## What is inside

- **Day-based SAT calendar:** Day 1 through Day 30 slots.
- **Day 1 ready:** 50 College Board SAT Suite Question Bank questions on **Linear equations in one variable**.
- **Bluebook-inspired testing UI:** navy exam header, timer, toolbar, question rail, bottom navigation, mark-for-review, answer panel, and review screen.
- **Answers hidden while practicing:** scoring appears only on the review screen.
- **Future-proof data model:** add `src/data/day2.json`, images in `public/day-assets/day-2/`, then connect the day in `src/data/practiceDays.ts`.

> This is an independent personal study tool. It is Bluebook-inspired, but it does not use College Board branding or logos.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Add a future day

1. Put question images in:

```text
public/day-assets/day-N/
```

2. Create a JSON file:

```text
src/data/dayN.json
```

3. Add the day to `src/data/practiceDays.ts`:

```ts
{
  day: N,
  title: 'Day N',
  focus: 'Topic name',
  durationMinutes: 70,
  status: 'ready',
  questions: dayN as Question[]
}
```

## Day 1 topic

**Linear equations in one variable**

Question types included:

- Multiple choice
- Student-produced response

The question assets were generated from the official SAT Suite Question Bank PDF for personal practice so the answer/rationale sections are not visible during the test flow.
