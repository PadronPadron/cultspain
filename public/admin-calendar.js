import { addDays, bookingEnd, calendarMinute, escapeHTML as esc } from './model.js';

const dateAtNoon = date => new Date(`${date}T12:00:00Z`);
const monthFormat = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dayFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'full', timeZone: 'UTC' });
const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const statusLabels = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

export function shiftBookingMonth(date, offset) {
  const first = dateAtNoon(`${date.slice(0, 7)}-01`);
  first.setUTCMonth(first.getUTCMonth() + offset);
  return first.toISOString().slice(0, 10);
}

function statusMark(status) {
  return `<span class="agenda-dot agenda-${status}" aria-hidden="true"></span>`;
}

function bookingCard(booking, serviceLabel, layout, displayDate) {
  const { id, status, name, date, time, service } = booking;
  const when = date===displayDate ? `<time datetime="${esc(`${date}T${time}`)}">${esc(time)}</time>` : '<span class="agenda-continuation">Continúa</span>';
  return `<button type="button" class="agenda-booking agenda-${status}"
    id="agenda-${layout}-${displayDate}-${esc(id)}" data-manage-booking="${esc(id)}"
    title="${esc(`${time} · ${name} · ${serviceLabel(service)}`)}">
    ${when}
    <strong>${esc(name)}</strong>
    <span class="agenda-service">${esc(serviceLabel(service))}</span>
    <span class="agenda-status">${statusMark(status)}${statusLabels[status]}</span>
  </button>`;
}

export function bookingCalendar(rows, selectedDate, today, serviceLabel) {
  const first = shiftBookingMonth(selectedDate, 0);
  const next = shiftBookingMonth(selectedDate, 1);
  const offset = (dateAtNoon(first).getUTCDay() + 6) % 7;
  const monthDays = Number(addDays(next, -1).slice(-2));
  const cellCount = Math.ceil((offset + monthDays) / 7) * 7;
  const byDay = new Map();
  for (const booking of rows) {
    if (booking.date >= next) continue;
    const end = bookingEnd(booking.date, booking.time, booking.duration).getTime()/60000;
    if (booking.date < first && (booking.status === 'cancelled' || end <= calendarMinute(first))) continue;
    let date = booking.date < first ? first : booking.date;
    while (date < next && (date === booking.date || booking.status !== 'cancelled' && calendarMinute(date) < end)) {
      if (!byDay.has(date)) byDay.set(date, []);
      byDay.get(date).push(booking);
      date = addDays(date, 1);
    }
  }
  for (const dayRows of byDay.values()) dayRows.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const cells = Array.from({ length: cellCount }, (_, index) => {
    const day = index - offset + 1;
    if (day < 1 || day > monthDays) return '<div class="agenda-cell agenda-padding" aria-hidden="true"></div>';
    const date = addDays(first, day - 1);
    const dayRows = byDay.get(date) || [];
    const isToday = date === today;
    const counts = Object.keys(statusLabels).map(status => ({ status, count: dayRows.filter(row => row.status === status).length })).filter(item => item.count);
    const summary = counts.map(({ status, count }) => `${statusLabels[status]}: ${count}`).join(', ') || 'Sin citas';
    return `<div class="agenda-cell${isToday ? ' agenda-today' : ''}">
      <div class="agenda-cell-heading"><time datetime="${date}">${day}</time></div>
      <div class="agenda-cell-bookings">${dayRows.map(row => bookingCard(row, serviceLabel, 'month', date)).join('')}</div>
      <button type="button" class="agenda-date" id="agenda-date-${date}" data-agenda-date="${date}"
        aria-label="${dayFormat.format(dateAtNoon(date))}. ${summary}" aria-pressed="${date === selectedDate}"
        ${isToday ? 'aria-current="date"' : ''}>
        <span class="agenda-date-number">${day}</span>
        ${dayRows.length ? `<small>${dayRows.length}</small><span class="agenda-date-dots">${counts.map(({ status }) => statusMark(status)).join('')}</span>` : ''}
      </button>
    </div>`;
  });
  const dailyRows = byDay.get(selectedDate) || [];
  return `<div class="agenda-month-bar">
    <button type="button" class="agenda-nav" id="agenda-prev" data-agenda-offset="-1" aria-label="Mes anterior">‹</button>
    <h3 id="agenda-month" aria-live="polite">${monthFormat.format(dateAtNoon(first))}</h3>
    <button type="button" class="agenda-nav" id="agenda-next" data-agenda-offset="1" aria-label="Mes siguiente">›</button>
    <button type="button" class="agenda-nav" id="agenda-today" data-agenda-date="${today}">Hoy</button>
  </div>
  <div class="agenda-legend" aria-label="Estados de las citas">${Object.entries(statusLabels).map(([status, label]) => `<span>${statusMark(status)}${label}</span>`).join('')}</div>
  <div class="agenda-grid" role="group" aria-labelledby="agenda-month">
    ${weekdays.map(day => `<span class="agenda-weekday" title="${day}" aria-label="${day}">${day.slice(0, 3)}</span>`).join('')}
    ${cells.join('')}
  </div>
  <section class="agenda-daily" aria-labelledby="agenda-day-heading">
    <h3 id="agenda-day-heading" aria-live="polite">${dayFormat.format(dateAtNoon(selectedDate))}</h3>
    <div class="agenda-daily-list">${dailyRows.map(row => bookingCard(row, serviceLabel, 'day', selectedDate)).join('') || '<p>No hay citas para este día.</p>'}</div>
  </section>`;
}
