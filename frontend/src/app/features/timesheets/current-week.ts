/**
 * Calendrier de la semaine affichée pour la feuille de temps TimeFlow.
 * Semaine ISO du lundi au dimanche, saisie principale du lundi au vendredi.
 */
export interface WeekDay {
  label: string;
  date: string; // "05/10"
  isoDate: string; // "2026-10-05"
  isToday: boolean;
  dayKey: string;
  isWorkingDay: boolean;
}

export interface CalendarWeek {
  number: number;
  mondayDate: Date;
  mondayIsoDate: string;
  range: string;
  days: WeekDay[];
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAY_KEYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export function calendarWeek(
  target: Date = new Date(),
  today: Date = new Date(),
  workingDays: string[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  includeWeekend: boolean = false
): CalendarWeek {
  const monday = startOfDay(target);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const sunday = addDays(monday, 6);
  const shortDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });
  const longDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

  const totalDays = includeWeekend ? 7 : 5;
  const days: WeekDay[] = Array.from({ length: totalDays }, (_, index) => {
    const date = addDays(monday, index);
    const dayKey = DAY_KEYS[index];
    return {
      label: DAY_LABELS[index],
      date: shortDate.format(date),
      isoDate: toIsoDateString(date),
      isToday: date.getTime() === startOfDay(today).getTime(),
      dayKey,
      isWorkingDay: workingDays.includes(dayKey)
    };
  });

  return {
    number: isoWeekNumber(monday),
    mondayDate: monday,
    mondayIsoDate: toIsoDateString(monday),
    range: `${longDate.format(monday)} – ${longDate.format(sunday)} ${sunday.getFullYear()}`,
    days
  };
}

export function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

function isoWeekNumber(monday: Date): number {
  const thursday = addDays(monday, 3);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
