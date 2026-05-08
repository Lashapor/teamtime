import { writable, get } from 'svelte/store';
import { detectViewerOffsetMinutes } from '../time/detect';
import { formatOffset } from '../time/offsets';
import type { ViewerRef } from '../types';

const STORAGE_KEY = 'teamtime.viewer.offset';

function initial(): ViewerRef {
	if (typeof window === 'undefined') {
		return { offsetMinutes: 0, label: formatOffset(0), source: 'detected' };
	}
	const stored = window.localStorage.getItem(STORAGE_KEY);
	if (stored !== null) {
		const n = parseInt(stored, 10);
		if (!Number.isNaN(n)) {
			return { offsetMinutes: n, label: formatOffset(n), source: 'manual' };
		}
	}
	const detected = detectViewerOffsetMinutes();
	return { offsetMinutes: detected, label: formatOffset(detected), source: 'detected' };
}

export const viewer = writable<ViewerRef>(initial());

export function setViewerOffset(offsetMinutes: number) {
	const next: ViewerRef = {
		offsetMinutes,
		label: formatOffset(offsetMinutes),
		source: 'manual'
	};
	viewer.set(next);
	if (typeof window !== 'undefined') {
		window.localStorage.setItem(STORAGE_KEY, String(offsetMinutes));
	}
}

export function resetViewerOffset() {
	const detected = detectViewerOffsetMinutes();
	viewer.set({ offsetMinutes: detected, label: formatOffset(detected), source: 'detected' });
	if (typeof window !== 'undefined') {
		window.localStorage.removeItem(STORAGE_KEY);
	}
}

export function currentViewer(): ViewerRef {
	return get(viewer);
}
