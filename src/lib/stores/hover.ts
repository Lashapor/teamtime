import { writable } from 'svelte/store';
import type { DateTime } from 'luxon';

export const hoveredInstant = writable<DateTime | null>(null);
