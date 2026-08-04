import { readable } from 'svelte/store';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, SUPABASE_CONFIGURED } from './client';

export type AuthState = {
	session: Session | null;
	user: User | null;
	isLoading: boolean;
};

const initial: AuthState = { session: null, user: null, isLoading: true };

export const authStore = readable<AuthState>(initial, (set) => {
	if (!SUPABASE_CONFIGURED) {
		set({ session: null, user: null, isLoading: false });
		return () => {};
	}

	let cancelled = false;

	supabase.auth
		.getSession()
		.then(({ data }) => {
			if (cancelled) return;
			set({ session: data.session, user: data.session?.user ?? null, isLoading: false });
		})
		.catch(() => {
			if (cancelled) return;
			set({ session: null, user: null, isLoading: false });
		});

	const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
		set({ session, user: session?.user ?? null, isLoading: false });
	});

	return () => {
		cancelled = true;
		sub.subscription.unsubscribe();
	};
});
