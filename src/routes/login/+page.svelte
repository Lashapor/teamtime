<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import TextInput from '$lib/components/TextInput.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { sendMagicCode, signInWithGoogle, signInWithMagicCode } from '$lib/auth/supabase-auth';
	import { SUPABASE_CONFIGURED, SUPABASE_URL } from '$lib/db/client';
	import { authStore } from '$lib/db/auth-store';
	import { APP_NAME } from '$lib/config';

	let stage: 'email' | 'code' = 'email';
	let email = '';
	let code = '';
	let busy = false;
	let error: string | null = null;

	onMount(() => {
		const unsub = authStore.subscribe((s) => {
			if (s.user && !s.isLoading) goto('/dashboard');
		});
		return unsub;
	});

	async function submitEmail() {
		error = null;
		busy = true;
		try {
			await sendMagicCode(email.trim().toLowerCase());
			stage = 'code';
		} catch (e) {
			console.error('[teamtime] sendMagicCode failed', e, 'url:', SUPABASE_URL);
			const msg = e instanceof Error ? e.message : String(e);
			if (/failed to fetch|networkerror|load failed/i.test(msg)) {
				error = `Couldn't reach ${SUPABASE_URL}. Project may not be ready yet (wait 30s and retry), the URL may be wrong, or your network may be blocking it. Check the browser devtools Network tab for details.`;
			} else {
				error = msg;
			}
		} finally {
			busy = false;
		}
	}

	async function submitCode() {
		error = null;
		busy = true;
		try {
			await signInWithMagicCode(email.trim().toLowerCase(), code.trim());
			goto('/dashboard');
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function handleGoogle() {
		error = null;
		busy = true;
		try {
			await signInWithGoogle();
			// signInWithGoogle redirects; we don't reach here
		} catch (e) {
			console.error('[teamtime] Google sign-in failed', e);
			const msg = e instanceof Error ? e.message : String(e);
			if (/provider is not enabled|google.*not enabled|400/i.test(msg)) {
				error =
					'Google sign-in isn\'t enabled in this Supabase project yet. Open Authentication → Providers → Google in your Supabase dashboard. (See setup wizard for the Google Cloud steps.)';
			} else {
				error = msg;
			}
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Sign in · {APP_NAME}</title>
</svelte:head>

<div class="min-h-[80vh] flex items-center justify-center px-4 py-8">
	<div class="w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5 md:p-6 shadow-2xl">
		<div class="mb-1 text-xs uppercase tracking-wide text-sky-300">{APP_NAME}</div>
		<h1 class="text-xl md:text-2xl font-semibold text-white mb-1">Sign in</h1>
		<p class="text-sm text-white/60 mb-5">Continue with Google, or get a 6-digit code by email.</p>

		{#if !SUPABASE_CONFIGURED}
			<div class="rounded-md border border-amber-400/30 bg-amber-500/10 text-amber-100 px-3 py-2 text-xs leading-relaxed">
				<strong>This deployment isn't configured yet.</strong>
				<a class="underline" href="/setup">Open the setup wizard</a> to connect a Supabase project.
			</div>
		{:else if stage === 'email'}
			<button
				type="button"
				on:click={handleGoogle}
				disabled={busy}
				class="w-full inline-flex items-center justify-center gap-2 rounded-md bg-white text-slate-900 font-medium px-4 py-2.5 text-sm hover:bg-white/90 disabled:opacity-50 mb-4"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
					<path fill="#4285F4" d="M14.66 8.18c0-.55-.05-1.09-.14-1.6H8v3.02h3.74a3.2 3.2 0 0 1-1.39 2.1v1.74h2.24c1.31-1.21 2.07-3 2.07-5.26z"/>
					<path fill="#34A853" d="M8 15c1.88 0 3.45-.62 4.6-1.68l-2.25-1.74c-.62.42-1.42.66-2.35.66-1.81 0-3.34-1.22-3.89-2.86H1.79v1.8A6.9 6.9 0 0 0 8 15z"/>
					<path fill="#FBBC05" d="M4.11 9.38a4.14 4.14 0 0 1 0-2.65V4.93H1.79a6.9 6.9 0 0 0 0 6.25l2.32-1.8z"/>
					<path fill="#EA4335" d="M8 4.13c1.02 0 1.94.35 2.66 1.04l2-2A6.86 6.86 0 0 0 8 1.1a6.9 6.9 0 0 0-6.21 3.83l2.32 1.8C4.66 5.1 6.19 4.13 8 4.13z"/>
				</svg>
				Continue with Google
			</button>
			<div class="my-4 flex items-center gap-3 text-xs text-white/40">
				<span class="h-px flex-1 bg-white/10"></span>or<span class="h-px flex-1 bg-white/10"></span>
			</div>
			<form on:submit|preventDefault={submitEmail} class="space-y-3">
				<label class="block">
					<span class="block text-xs text-white/70 mb-1.5">Email</span>
					<TextInput type="email" bind:value={email} placeholder="you@example.com" />
				</label>
				{#if error}<p class="text-xs text-rose-300 leading-relaxed">{error}</p>{/if}
				<button
					type="submit"
					disabled={busy || !email}
					class="w-full inline-flex items-center justify-center gap-2 rounded-md bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-medium px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300/60"
				>
					{#if busy}<Spinner size="sm" />{/if} Send magic code
				</button>
			</form>
		{:else}
			<form on:submit|preventDefault={submitCode} class="space-y-3">
				<p class="text-xs text-white/70">
					We sent a 6-digit code to <strong class="text-white">{email}</strong>.
				</p>
				<label class="block">
					<span class="block text-xs text-white/70 mb-1.5">Magic code</span>
					<TextInput bind:value={code} placeholder="123456" />
				</label>
				{#if error}<p class="text-xs text-rose-300">{error}</p>{/if}
				<div class="flex gap-2">
					<button
						type="button"
						class="rounded-md bg-white/10 hover:bg-white/15 text-white text-sm px-3 py-2"
						on:click={() => (stage = 'email')}
						disabled={busy}
					>
						Back
					</button>
					<button
						type="submit"
						class="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-medium px-4 py-2.5 text-sm"
						disabled={busy || code.length < 4}
					>
						{#if busy}<Spinner size="sm" />{/if} Verify code
					</button>
				</div>
			</form>
		{/if}
	</div>
</div>
