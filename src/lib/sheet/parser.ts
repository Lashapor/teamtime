import { formatOffset, parseOffset } from '../time/offsets';
import { parseShift } from '../time/shifts';
import { tokenizeCsv } from './csv';
import type { Shift, TeamMember } from '../types';

type ColumnIndex = {
	name: number;
	timezone: number;
	imgUrl: number;
	startWorkTime1: number;
	endWorkTime1: number;
	startWorkTime2: number;
	endWorkTime2: number;
	email: number;
};

function buildColumnIndex(headers: string[]): ColumnIndex {
	const seen = new Map<string, number>();
	const occurrences: Array<{ name: string; index: number; ord: number }> = [];
	headers.forEach((raw, index) => {
		const name = raw.trim().toLowerCase();
		const ord = (seen.get(name) ?? -1) + 1;
		seen.set(name, ord);
		occurrences.push({ name, index, ord });
	});
	const find = (name: string, ord: number): number => {
		const hit = occurrences.find((o) => o.name === name && o.ord === ord);
		return hit ? hit.index : -1;
	};
	return {
		name: find('name', 0),
		timezone: find('timezone', 0),
		imgUrl: find('imgurl', 0),
		startWorkTime1: find('startworktime', 0),
		endWorkTime1: find('endworktime', 0),
		startWorkTime2: find('startworktime', 1),
		endWorkTime2: find('endworktime', 1),
		email: find('email', 0)
	};
}

function transformDriveUrl(raw: string): string | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/);
	if (driveMatch) {
		return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w200`;
	}
	const openMatch = trimmed.match(/drive\.google\.com\/open\?id=([^&]+)/);
	if (openMatch) {
		return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w200`;
	}
	return trimmed;
}

export function parseTeam(rawCsv: string): TeamMember[] {
	const rows = tokenizeCsv(rawCsv);
	if (rows.length < 2) return [];
	const headers = rows[0];
	const idx = buildColumnIndex(headers);
	const members: TeamMember[] = [];
	for (let r = 1; r < rows.length; r++) {
		const row = rows[r];
		const cell = (i: number) => (i >= 0 && i < row.length ? row[i] : '');
		const name = cell(idx.name).trim();
		if (!name) continue;
		const tzRaw = cell(idx.timezone).trim();
		const offsetMinutes = parseOffset(tzRaw);
		if (offsetMinutes === null) continue;
		const shifts: Shift[] = [];
		const s1 = parseShift(cell(idx.startWorkTime1), cell(idx.endWorkTime1));
		if (s1) shifts.push(s1);
		if (idx.startWorkTime2 >= 0) {
			const s2 = parseShift(cell(idx.startWorkTime2), cell(idx.endWorkTime2));
			if (s2) shifts.push(s2);
		}
		if (shifts.length === 0) {
			shifts.push({ startMin: 540, endMin: 1080 });
		}
		shifts.sort((a, b) => a.startMin - b.startMin);
		members.push({
			name,
			email: cell(idx.email).trim().toLowerCase(),
			imgUrl: transformDriveUrl(cell(idx.imgUrl)),
			offsetMinutes,
			offsetLabel: formatOffset(offsetMinutes),
			shifts: shifts.length === 2 ? [shifts[0], shifts[1]] : [shifts[0]],
			rowIndex: r + 1
		});
	}
	return members;
}
