import { describe, expect, it } from 'vitest';
import { formatOffset, offsetToZone, parseOffset, shortLabel } from '../offsets';

describe('parseOffset', () => {
	it('parses UTC+4', () => {
		expect(parseOffset('UTC+4')).toBe(240);
	});
	it('parses UTC-4', () => {
		expect(parseOffset('UTC-4')).toBe(-240);
	});
	it('parses UTC+5:30', () => {
		expect(parseOffset('UTC+5:30')).toBe(330);
	});
	it('parses UTC+05:45', () => {
		expect(parseOffset('UTC+05:45')).toBe(345);
	});
	it('parses GMT+4 (legacy form)', () => {
		expect(parseOffset('GMT+4')).toBe(240);
	});
	it('returns null for garbage', () => {
		expect(parseOffset('hello')).toBeNull();
		expect(parseOffset('UTC+99')).toBeNull();
		expect(parseOffset('UTC+5:60')).toBeNull();
	});
});

describe('formatOffset / shortLabel', () => {
	it('canonicalises positive offset', () => {
		expect(formatOffset(240)).toBe('UTC+04:00');
	});
	it('canonicalises negative offset', () => {
		expect(formatOffset(-240)).toBe('UTC-04:00');
	});
	it('handles half-hour', () => {
		expect(formatOffset(330)).toBe('UTC+05:30');
	});
	it('shortens whole-hour offset', () => {
		expect(shortLabel(240)).toBe('UTC+4');
		expect(shortLabel(-300)).toBe('UTC-5');
	});
	it('keeps minutes for non-whole offsets', () => {
		expect(shortLabel(330)).toBe('UTC+5:30');
	});
});

describe('offsetToZone', () => {
	it('produces a luxon-compatible zone string', () => {
		expect(offsetToZone(240)).toBe('UTC+04:00');
		expect(offsetToZone(-300)).toBe('UTC-05:00');
		expect(offsetToZone(330)).toBe('UTC+05:30');
	});
});
