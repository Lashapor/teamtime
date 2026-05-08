import { writable } from 'svelte/store';
import type { SignedInUser } from '../types';

export const signedInUser = writable<SignedInUser | null>(null);
export const authError = writable<string | null>(null);
