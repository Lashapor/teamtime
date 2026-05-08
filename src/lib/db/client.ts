import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

const URL_KEY = 'teamtime.supabase_url';
const KEY_KEY = 'teamtime.supabase_anon_key';

const ENV_URL = env.PUBLIC_SUPABASE_URL || '';
const ENV_KEY = env.PUBLIC_SUPABASE_ANON_KEY || '';

function readConfig(): { url: string; anonKey: string } {
	if (typeof window === 'undefined') return { url: ENV_URL, anonKey: ENV_KEY };
	try {
		const url = window.localStorage.getItem(URL_KEY) || ENV_URL;
		const anonKey = window.localStorage.getItem(KEY_KEY) || ENV_KEY;
		return { url, anonKey };
	} catch {
		return { url: ENV_URL, anonKey: ENV_KEY };
	}
}

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = readConfig();

export const SUPABASE_CONFIGURED = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
export { SUPABASE_URL };

export const supabase: SupabaseClient = SUPABASE_CONFIGURED
	? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				detectSessionInUrl: true,
				flowType: 'pkce'
			}
		})
	: (null as unknown as SupabaseClient);

export function saveSupabaseConfig(url: string, anonKey: string): void {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(URL_KEY, url);
		window.localStorage.setItem(KEY_KEY, anonKey);
	} catch {
		// ignore
	}
	void requestPersistentStorage();
}

export function clearSupabaseConfig(): void {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.removeItem(URL_KEY);
		window.localStorage.removeItem(KEY_KEY);
	} catch {
		// ignore
	}
}

export function getAnonKey(): string {
	if (typeof window === 'undefined') return ENV_KEY;
	try {
		return window.localStorage.getItem(KEY_KEY) || ENV_KEY;
	} catch {
		return ENV_KEY;
	}
}

export function buildSetupLink(extraQuery?: string): string {
	if (typeof window === 'undefined') return '';
	const url = SUPABASE_URL;
	const key = getAnonKey();
	if (!url || !key) return '';
	const fragment = new URLSearchParams({ u: url, k: key }).toString();
	const path = extraQuery ? `/setup?${extraQuery}` : '/setup';
	return `${window.location.origin}${path}#${fragment}`;
}

async function requestPersistentStorage(): Promise<void> {
	if (typeof navigator === 'undefined' || !navigator.storage?.persist) return;
	try {
		await navigator.storage.persist();
	} catch {
		// best-effort; some browsers reject silently
	}
}
