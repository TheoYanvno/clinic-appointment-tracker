// Date and time helpers shared by the server, the browser and the seed generator.
// Dates are 'YYYY-MM-DD' strings and times are 'HH:MM', so they sort and compare correctly as text.
// Date math uses UTC internally so time zones and daylight saving time can't shift a day.

const pad = (n) => String(n).padStart(2, '0');

export const toDateString = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;   // local date
export const nowString = (d = new Date()) => `${toDateString(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

const parse = (date) => { const [y, m, d] = date.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const format = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export const addDays = (date, days) => { const d = parse(date); d.setUTCDate(d.getUTCDate() + days); return format(d); };
export const weekdayOf = (date) => parse(date).getUTCDay();                // 0 = Sunday … 6 = Saturday
export const toMinutes = (time) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
export const toTime = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** Monday–Friday of the week containing `date`. */
export function weekOf(date) {
  const day = weekdayOf(date);
  const monday = addDays(date, day === 0 ? -6 : 1 - day);
  return [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
}

/** Every date shown on a month calendar (whole weeks, Sunday first) for the month containing `date`. */
export function monthGrid(date) {
  const first = `${date.slice(0, 7)}-01`;
  const start = addDays(first, -weekdayOf(first));
  const days = [];
  for (let d = start; days.length < 42; d = addDays(d, 1)) days.push(d);
  // drop a trailing week that is entirely in the next month
  return days.slice(35).every((d) => d.slice(0, 7) !== date.slice(0, 7)) ? days.slice(0, 35) : days;
}
