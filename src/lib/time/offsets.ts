export type UtcOffset = {
	minutes: number;
	label: string;
};

export const UTC_OFFSETS: UtcOffset[] = (() => {
	const list: UtcOffset[] = [];
	for (let h = -12; h <= 14; h++) {
		list.push({ minutes: h * 60, label: formatOffset(h * 60) });
		if (h === 5 || h === 9 || h === 10) {
			list.push({ minutes: h * 60 + 30, label: formatOffset(h * 60 + 30) });
		}
		if (h === 5) {
			list.push({ minutes: h * 60 + 45, label: formatOffset(h * 60 + 45) });
		}
		if (h === 8) {
			list.push({ minutes: h * 60 + 45, label: formatOffset(h * 60 + 45) });
		}
		if (h === 12) {
			list.push({ minutes: h * 60 + 45, label: formatOffset(h * 60 + 45) });
		}
		if (h === -3 || h === -9 || h === 3 || h === 4 || h === 6) {
			list.push({ minutes: h * 60 + 30, label: formatOffset(h * 60 + 30) });
		}
	}
	list.sort((a, b) => a.minutes - b.minutes);
	return list;
})();

export function formatOffset(minutes: number): string {
	const sign = minutes >= 0 ? '+' : '-';
	const abs = Math.abs(minutes);
	const hh = Math.floor(abs / 60).toString().padStart(2, '0');
	const mm = (abs % 60).toString().padStart(2, '0');
	return `UTC${sign}${hh}:${mm}`;
}

export function shortLabel(minutes: number): string {
	const sign = minutes >= 0 ? '+' : '-';
	const abs = Math.abs(minutes);
	const hh = Math.floor(abs / 60);
	const mm = abs % 60;
	return mm === 0 ? `UTC${sign}${hh}` : `UTC${sign}${hh}:${mm.toString().padStart(2, '0')}`;
}

export function parseOffset(input: string): number | null {
	const trimmed = input.trim().toUpperCase();
	const match = trimmed.match(/^(?:UTC|GMT)\s*([+-])\s*(\d{1,2})(?::(\d{2}))?$/);
	if (!match) return null;
	const sign = match[1] === '-' ? -1 : 1;
	const hours = parseInt(match[2], 10);
	const mins = match[3] ? parseInt(match[3], 10) : 0;
	if (hours > 14 || mins >= 60) return null;
	return sign * (hours * 60 + mins);
}

export function offsetToZone(minutes: number): string {
	const sign = minutes >= 0 ? '+' : '-';
	const abs = Math.abs(minutes);
	const hh = Math.floor(abs / 60).toString().padStart(2, '0');
	const mm = (abs % 60).toString().padStart(2, '0');
	return `UTC${sign}${hh}:${mm}`;
}
