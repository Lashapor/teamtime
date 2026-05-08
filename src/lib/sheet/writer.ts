import { APPS_SCRIPT_URL, SHEET_WRITE_SECRET } from '../config';
import { formatHHMM } from '../time/shifts';
import { shortLabel } from '../time/offsets';
import type { Shift } from '../types';

export type WritePatch = {
	email: string;
	offsetMinutes: number;
	shifts: Shift[];
};

export async function updateRow(patch: WritePatch, idToken: string): Promise<void> {
	if (!APPS_SCRIPT_URL) {
		throw new Error(
			'PUBLIC_APPS_SCRIPT_URL is not configured. Deploy scripts/Code.gs as a Web App and set the URL in .env.'
		);
	}
	const shift1 = patch.shifts[0];
	const shift2 = patch.shifts[1];
	const body = {
		secret: SHEET_WRITE_SECRET,
		idToken,
		patch: {
			email: patch.email,
			timezone: shortLabel(patch.offsetMinutes),
			startWorkTime1: shift1 ? formatHHMM(shift1.startMin) : '',
			endWorkTime1: shift1 ? formatHHMM(shift1.endMin) : '',
			startWorkTime2: shift2 ? formatHHMM(shift2.startMin) : '',
			endWorkTime2: shift2 ? formatHHMM(shift2.endMin) : ''
		}
	};
	const response = await fetch(APPS_SCRIPT_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'text/plain;charset=utf-8' },
		body: JSON.stringify(body)
	});
	if (!response.ok) {
		throw new Error(`Sheet write failed: ${response.status} ${response.statusText}`);
	}
	const json = await response.json().catch(() => ({ ok: false }));
	if (!json.ok) {
		throw new Error(json.error || 'Sheet write rejected');
	}
}
