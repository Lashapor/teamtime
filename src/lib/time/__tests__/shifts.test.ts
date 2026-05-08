import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { formatHHMM, isInstantInShifts, parseHHMM, parseShift } from '../shifts';
import type { TeamMember } from '../../types';

describe('parseHHMM', () => {
	it('parses 9:00', () => expect(parseHHMM('9:00')).toBe(540));
	it('parses 09:00', () => expect(parseHHMM('09:00')).toBe(540));
	it('parses 21:30', () => expect(parseHHMM('21:30')).toBe(1290));
	it('parses 0:00', () => expect(parseHHMM('0:00')).toBe(0));
	it('rejects empty', () => expect(parseHHMM('')).toBeNull());
	it('rejects garbage', () => expect(parseHHMM('25:00')).toBeNull());
});

describe('parseShift', () => {
	it('parses 9:00-18:00', () => {
		expect(parseShift('9:00', '18:00')).toEqual({ startMin: 540, endMin: 1080 });
	});
	it('treats 0:00 end as midnight (1440)', () => {
		expect(parseShift('21:30', '0:00')).toEqual({ startMin: 1290, endMin: 1440 });
	});
	it('returns null when end <= start', () => {
		expect(parseShift('18:00', '9:00')).toBeNull();
	});
	it('returns null for blank values', () => {
		expect(parseShift('', '')).toBeNull();
	});
});

describe('formatHHMM', () => {
	it('formats 540 as 09:00', () => expect(formatHHMM(540)).toBe('09:00'));
	it('formats 1290 as 21:30', () => expect(formatHHMM(1290)).toBe('21:30'));
	it('formats 1440 (midnight end) as 00:00', () => expect(formatHHMM(1440)).toBe('00:00'));
});

describe('isInstantInShifts', () => {
	const lasha: TeamMember = {
		name: 'Lasha',
		email: 'l@test.com',
		imgUrl: null,
		offsetMinutes: 240,
		offsetLabel: 'UTC+04:00',
		shifts: [
			{ startMin: 540, endMin: 1080 },
			{ startMin: 1290, endMin: 1440 }
		],
		rowIndex: 2
	};

	it('returns true at 10:00 in row local time', () => {
		const i = DateTime.fromObject({ year: 2026, month: 5, day: 9, hour: 10 }, { zone: 'UTC+04:00' });
		expect(isInstantInShifts(i, lasha)).toBe(true);
	});

	it('returns false at 19:00 (between shifts)', () => {
		const i = DateTime.fromObject({ year: 2026, month: 5, day: 9, hour: 19 }, { zone: 'UTC+04:00' });
		expect(isInstantInShifts(i, lasha)).toBe(false);
	});

	it('returns true at 22:00 (second shift)', () => {
		const i = DateTime.fromObject({ year: 2026, month: 5, day: 9, hour: 22 }, { zone: 'UTC+04:00' });
		expect(isInstantInShifts(i, lasha)).toBe(true);
	});

	it('returns true at 21:30 boundary', () => {
		const i = DateTime.fromObject({ year: 2026, month: 5, day: 9, hour: 21, minute: 30 }, { zone: 'UTC+04:00' });
		expect(isInstantInShifts(i, lasha)).toBe(true);
	});

	it('returns false at 18:00 (exclusive end)', () => {
		const i = DateTime.fromObject({ year: 2026, month: 5, day: 9, hour: 18 }, { zone: 'UTC+04:00' });
		expect(isInstantInShifts(i, lasha)).toBe(false);
	});
});
