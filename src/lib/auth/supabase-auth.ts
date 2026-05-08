import { supabase, SUPABASE_CONFIGURED } from '../db/client';

function ensureConfigured() {
	if (!SUPABASE_CONFIGURED) {
		throw new Error('Supabase is not configured. Open /setup to connect a project.');
	}
}

export async function sendMagicCode(email: string): Promise<void> {
	ensureConfigured();
	const { error } = await supabase.auth.signInWithOtp({
		email,
		options: { shouldCreateUser: true }
	});
	if (error) throw error;
}

export async function signInWithMagicCode(email: string, code: string): Promise<void> {
	ensureConfigured();
	const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
	if (error) throw error;
}

export async function signInWithGoogle(): Promise<void> {
	ensureConfigured();
	const redirectTo =
		typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;
	const { error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: { redirectTo }
	});
	if (error) throw error;
}

export async function signOut(): Promise<void> {
	if (!SUPABASE_CONFIGURED) return;
	await supabase.auth.signOut();
}
