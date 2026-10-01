/**
 * Calendrier de la semaine affichée — présentation uniquement.
 * Hypothèse (TICKET-0009) : semaine ISO du lundi au dimanche, saisie du lundi au vendredi.
 * La période de référence sera fournie par l'API feuille de temps (TICKET-0004).
 */
export interface WeekDay {
  label: string;
  date: string;
  isToday: boolean;
}

export interface CalendarWeek {
  number: number;
  range: string;
  days: WeekDay[];
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
const WORKING_DAYS = DAY_LABELS.length;

export function calendarWeek(today: Date = new Date()): CalendarWeek {
  const monday = startOfDay(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const sunday = addDays(monday, 6);
  const shortDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });
  const longDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

  const days = Array.from({ length: WORKING_DAYS }, (_, index) => {
    const date = addDays(monday, index);
    return {
      label: DAY_LABELS[index],
      date: shortDate.format(date),
      isToday: date.getTime() === startOfDay(today).getTime()
    };
  });

  return {
    number: isoWeekNumber(monday),
    range: `${longDate.format(monday)} – ${longDate.format(sunday)} ${sunday.getFullYear()}`,
    days
  };
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
