import {
	PUBLIC_APPS_SCRIPT_URL,
	PUBLIC_CSV_URL,
	PUBLIC_GOOGLE_CLIENT_ID,
	PUBLIC_SHEET_WRITE_SECRET
} from '$env/static/public';

export const DEFAULT_CSV_URL =
	'https://docs.google.com/spreadsheets/d/e/2PACX-1vSH90sYkVlSRqPD3VmWOGgTbUEoRA4PsiukSdHUh4C3aZAkXnvtzvoGVnRN-S_seFJSR9N9gQgeMR1Z/pub?gid=0&single=true&output=csv';

export const CSV_URL = PUBLIC_CSV_URL || DEFAULT_CSV_URL;
export const APPS_SCRIPT_URL = PUBLIC_APPS_SCRIPT_URL || '';
export const GOOGLE_CLIENT_ID = PUBLIC_GOOGLE_CLIENT_ID || '';
export const SHEET_WRITE_SECRET = PUBLIC_SHEET_WRITE_SECRET || '';

export function getCsvUrlFromHash(): string {
	if (typeof window === 'undefined') return CSV_URL;
	const hash = window.location.hash.slice(1);
	return hash || CSV_URL;
}
