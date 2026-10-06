import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calendarReadingItems, dayLabel, describeToday, describeWeek, tidyLines, type CalendarWeek } from '../utils/calendar.ts';
import { resolveVoiceCommand } from '../utils/speech/commands.ts';

const week: CalendarWeek = {
  number: '09',
  range: 'Del 5 al 11 de octubre',
  days: [
    { date: '2026-10-05', events: [{ kind: 'clase', lines: ['Interacción Humano Computador', '07:00 - 09:00', 'Presencial'] }, { kind: 'actividad', lines: ['Tarea 3', 'Por entregar'] }] },
    { date: '2026-10-06', events: [] },
    { date: null, events: [{ kind: 'ciclo', lines: ['Foro general'] }] },
  ],
};

describe('calendario', () => {
  it('nombra los días en español', () => {
    assert.equal(dayLabel('2026-10-05'), 'lunes 5 de octubre');
    assert.equal(dayLabel(null), 'Todo el ciclo');
  });

  it('limpia líneas repetidas o contenidas en otras', () => {
    assert.deepEqual(tidyLines(['Tarea 3', ' Tarea  3 ', 'Tarea 3 Por entregar', '', 'Por entregar']), ['Tarea 3 Por entregar']);
  });

  it('describe el día y la semana', () => {
    assert.match(describeToday(week, '2026-10-05'), /1 clase y 1 actividad o aviso.*Clase: Interacción Humano Computador\. 07:00 - 09:00/);
    assert.match(describeToday(week, '2026-10-06'), /no tienes clases ni actividades/);
    assert.match(describeToday(week, '2026-11-01'), /no está en la semana/);
    assert.match(describeWeek(week), /^Semana 09, Del 5 al 11 de octubre\. lunes 5 de octubre: 1 clase y 1 actividad o aviso\./);
    assert.match(describeWeek(week), /1 aviso dura todo el ciclo/);
  });

  it('arma la lectura: un título por día y un bloque por evento', () => {
    const items = calendarReadingItems(week);
    assert.deepEqual(items.map((item) => item.kind), ['heading', 'block', 'block', 'heading', 'block', 'heading', 'block']);
    assert.equal(items[4]!.text, 'Sin clases ni actividades.');
  });

  it('reconoce los comandos del calendario', () => {
    assert.equal(resolveVoiceCommand('¿Qué tengo hoy?').command, 'calendar-today');
    assert.equal(resolveVoiceCommand('qué semana es').command, 'calendar-week');
    assert.equal(resolveVoiceCommand('semana anterior').command, 'calendar-previous');
    assert.equal(resolveVoiceCommand('Semana siguiente').command, 'calendar-next');
    assert.equal(resolveVoiceCommand('hoy').command, 'calendar-current');
    assert.equal(resolveVoiceCommand('ver horario').command, 'go-calendar');
  });
});
