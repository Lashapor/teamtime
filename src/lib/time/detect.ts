import { DateTime } from 'luxon';

export function detectViewerOffsetMinutes(): number {
	try {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const dt = DateTime.now().setZone(tz);
		if (!dt.isValid) return -new Date().getTimezoneOffset();
		return dt.offset;
	} catch {
		return -new Date().getTimezoneOffset();
	}
}
