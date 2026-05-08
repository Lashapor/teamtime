import { DateTime } from 'luxon';
import { writable } from 'svelte/store';
import { offsetToZone } from '../time/offsets';

function todayInOffset(offsetMinutes: number): DateTime {
	return DateTime.now().setZone(offsetToZone(offsetMinutes)).startOf('day');
}

export const anchorDay = writable<DateTime>(todayInOffset(-new Date().getTimezoneOffset()));

export function setAnchorToToday(offsetMinutes: number) {
	anchorDay.set(todayInOffset(offsetMinutes));
}

export function shiftDay(days: number) {
	anchorDay.update((d) => d.plus({ days }));
}

export function rebaseAnchor(offsetMinutes: number, prev: DateTime) {
	const zoned = prev.setZone(offsetToZone(offsetMinutes), { keepLocalTime: true }).startOf('day');
	anchorDay.set(zoned);
}
