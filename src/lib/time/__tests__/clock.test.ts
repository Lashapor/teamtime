import { describe, expect, it, vi, afterEach } from 'vitest';
import { DateTime } from 'luxon';
import { hourCellInstant, isCurrentHour } from '../clock';

describe('isCurrentHour', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns true for the cell whose instant covers "now" — independent of row offset', () => {
		// Frozen wall clock: 2026-05-09T12:00:00Z (== 16:00 UTC+4 == 08:00 UTC-4).
		const fixedNowMs = Date.UTC(2026, 4, 9, 12, 0, 0);
		vi.useFakeTimers();
		vi.setSystemTime(new Date(fixedNowMs));

		// Anchor day = the viewer's local midnight.
		const viewerOffsetMin = 240; // UTC+4 (the hypothetical viewer / Lasha)
		const anchorDay = DateTime.fromMillis(fixedNowMs)
			.setZone('UTC+04:00')
			.startOf('day');

		// 24 cells, each one hour apart, anchored to the viewer's day.
		const cells = Array.from({ length: 24 }, (_, h) => hourCellInstant(anchorDay, h));

		// Exactly one cell should be flagged "current".
		const lashaHits = cells.map((c) => isCurrentHour(c, viewerOffsetMin)).filter(Boolean).length;
		expect(lashaHits).toBe(1);

		// And the same column should also be flagged "current" for a row at a different offset
		// (Shivam, UTC-4). This was the bug: comparing .hour across mismatched zones.
		const shivamHits = cells.map((c) => isCurrentHour(c, -240)).filter(Boolean).length;
		expect(shivamHits).toBe(1);

		// And it must be the SAME index for both rows — same absolute instant.
		const lashaIdx = cells.findIndex((c) => isCurrentHour(c, viewerOffsetMin));
		const shivamIdx = cells.findIndex((c) => isCurrentHour(c, -240));
		expect(shivamIdx).toBe(lashaIdx);
	});

	it('returns false everywhere when "now" is outside the visible day', () => {
		const fixedNowMs = Date.UTC(2026, 4, 9, 12, 0, 0);
		vi.useFakeTimers();
		vi.setSystemTime(new Date(fixedNowMs));

		// Anchor a different day.
		const anchorDay = DateTime.fromMillis(fixedNowMs)
			.setZone('UTC+04:00')
			.startOf('day')
			.plus({ days: 7 });
		const cells = Array.from({ length: 24 }, (_, h) => hourCellInstant(anchorDay, h));
		const hits = cells.map((c) => isCurrentHour(c)).filter(Boolean).length;
		expect(hits).toBe(0);
	});
});
