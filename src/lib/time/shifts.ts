import type { DateTime } from 'luxon';
import type { Shift, TeamMember } from '../types';
import { offsetToZone } from './offsets';

export function parseShift(start: string, end: string): Shift | null {
	const s = parseHHMM(start);
	const e = parseHHMM(end);
	if (s === null || e === null) return null;
	const endMin = e === 0 ? 1440 : e;
	if (endMin <= s) return null;
	return { startMin: s, endMin };
}

export function parseHHMM(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
	if (!match) return null;
	const h = parseInt(match[1], 10);
	const m = parseInt(match[2], 10);
	if (h < 0 || h > 24 || m < 0 || m >= 60) return null;
	if (h === 24 && m !== 0) return null;
	return h * 60 + m;
}

export function formatHHMM(minutes: number): string {
	const m = minutes === 1440 ? 0 : minutes;
	const hh = Math.floor(m / 60).toString().padStart(2, '0');
	const mm = (m % 60).toString().padStart(2, '0');
	return `${hh}:${mm}`;
}

export function isInstantInShifts(instant: DateTime, member: TeamMember): boolean {
	const local = instant.setZone(offsetToZone(member.offsetMinutes));
	const minuteOfDay = local.hour * 60 + local.minute;
	for (const shift of member.shifts) {
		if (minuteOfDay >= shift.startMin && minuteOfDay < shift.endMin) return true;
	}
	return false;
}
