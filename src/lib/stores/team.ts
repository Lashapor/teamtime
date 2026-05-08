import { writable } from 'svelte/store';
import type { TeamMember } from '../types';

export const team = writable<TeamMember[]>([]);
export const teamLoading = writable<boolean>(false);
export const teamError = writable<string | null>(null);
