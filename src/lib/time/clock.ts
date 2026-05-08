import { DateTime } from 'luxon';
import { offsetToZone } from './offsets';

export function nowInOffset(offsetMinutes: number): DateTime {
	return DateTime.now().setZone(offsetToZone(offsetMinutes));
}

export function viewerToday(offsetMinutes: number): DateTime {
	return nowInOffset(offsetMinutes).startOf('day');
}

export function hourCellInstant(
	anchorDayLocal: DateTime,
	hourIndex: number
): DateTime {
	return anchorDayLocal.plus({ hours: hourIndex });
}

export function instantToRowLocal(instant: DateTime, rowOffsetMinutes: number): DateTime {
	return instant.setZone(offsetToZone(rowOffsetMinutes));
}

export function isCurrentHour(instant: DateTime, _offsetMinutes?: number): boolean {
	const ms = Date.now();
	const start = instant.toMillis();
	return ms >= start && ms < start + 3_600_000;
}
