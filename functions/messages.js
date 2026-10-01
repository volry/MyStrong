// Push texts, copied from src/i18n/dictionaries.ts (push.* and prog.week/day keys).
const en = {
  week: (n) => `Week ${n}`,
  day: (n) => `Day ${n}`,
  workoutDone: (name) => `${name} finished a workout`,
  programActive: (name) => `New program: ${name}`,
  programActiveBody: "Your coach activated a program. Open the app to see your next workout.",
  programSubmitted: (name) => `${name} sent a program`,
  programSubmittedBody: (program) => `${program} — open the app to review it.`,
  programApproved: "Your coach approved your program",
  programChanges: "Your coach asked for changes",
};

const uk = {
  week: (n) => `Тиждень ${n}`,
  day: (n) => `День ${n}`,
  workoutDone: (name) => `${name}: тренування завершено`,
  programActive: (name) => `Нова програма: ${name}`,
  programActiveBody: "Тренер активував програму. Відкрийте застосунок, щоб побачити наступне тренування.",
  programSubmitted: (name) => `${name} надіслав програму`,
  programSubmittedBody: (program) => `${program} — відкрийте застосунок, щоб переглянути.`,
  programApproved: "Тренер погодив вашу програму",
  programChanges: "Тренер попросив дещо змінити",
};

export function text(locale) {
  return locale === "uk" ? uk : en;
}
