/**
 * Devuelve el lunes (00:00:00 local) de la semana que contiene `date`.
 * La semana arranca el lunes; el domingo cuenta como fin de la semana previa.
 */
export function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Lunes (00:00:00 local) de la semana actual. */
export function getMondayOfCurrentWeek(): Date {
  return getMondayOf(new Date());
}
