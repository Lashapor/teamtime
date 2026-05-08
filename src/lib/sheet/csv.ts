export async function fetchPublishedCsv(url: string): Promise<string> {
	const response = await fetch(url, { redirect: 'follow' });
	if (!response.ok) {
		throw new Error(`CSV fetch failed: ${response.status} ${response.statusText}`);
	}
	return response.text();
}

export function tokenizeCsv(input: string): string[][] {
	const rows: string[][] = [];
	let current: string[] = [];
	let field = '';
	let inQuotes = false;
	let i = 0;
	const text = input.replace(/^﻿/, '');

	while (i < text.length) {
		const ch = text[i];
		if (inQuotes) {
			if (ch === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i += 2;
					continue;
				}
				inQuotes = false;
				i++;
				continue;
			}
			field += ch;
			i++;
			continue;
		}
		if (ch === '"') {
			inQuotes = true;
			i++;
			continue;
		}
		if (ch === ',') {
			current.push(field);
			field = '';
			i++;
			continue;
		}
		if (ch === '\r') {
			i++;
			continue;
		}
		if (ch === '\n') {
			current.push(field);
			rows.push(current);
			current = [];
			field = '';
			i++;
			continue;
		}
		field += ch;
		i++;
	}

	if (field.length > 0 || current.length > 0) {
		current.push(field);
		rows.push(current);
	}

	return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}
