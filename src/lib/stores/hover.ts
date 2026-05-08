import { writable } from 'svelte/store';
import type { DateTime } from 'luxon';

export const hoveredInstant = writable<DateTime | null>(null);
export const pinnedInstant = writable<DateTime | null>(null);

export function togglePin(instant: DateTime) {
	pinnedInstant.update((current) => {
		if (!current) return instant;
		return Math.abs(current.toMillis() - instant.toMillis()) < 1000 ? null : instant;
	});
}

export function clearPin() {
	pinnedInstant.set(null);
}
