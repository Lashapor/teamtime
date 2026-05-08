<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import {
		SUPABASE_CONFIGURED,
		SUPABASE_URL,
		buildSetupLink,
		clearSupabaseConfig
	} from '$lib/db/client';
	import { authStore } from '$lib/db/auth-store';
	import { signOut } from '$lib/auth/supabase-auth';
	import { APP_NAME } from '$lib/config';

	let userEmail: string | null = null;
	let copied = false;

	onMount(() => {
		if (!SUPABASE_CONFIGURED) {
			goto('/setup');
			return;
		}
		const unsub = authStore.subscribe((s) => {
			if (s.isLoading) return;
			if (!s.user) {
				goto('/login');
				return;
			}
			userEmail = s.user.email ?? null;
		});
		return unsub;
	});

	async function doSignOut() {
		await signOut();
		goto('/');
	}

	function changeProject() {
		const ok = confirm(
			'Disconnect from this Supabase project and start over?\n\nYou will not lose any data — it stays in your Supabase project. You will just be signed out and asked for a project URL again.'
		);
		if (!ok) return;
		clearSupabaseConfig();
		signOut().finally(() => {
			window.location.replace('/setup');
		});
	}

	async function copySetupLink() {
		const link = buildSetupLink();
		if (!link) return;
		try {
			await navigator.clipboard.writeText(link);
			copied = true;
			setTimeout(() => (copied = false), 1800);
		} catch {
			// silent
		}
	}
</script>

<svelte:head>
	<title>Account · {APP_NAME}</title>
</svelte:head>

<div class="mx-auto max-w-md px-4 py-8 md:py-12">
	<a href="/dashboard" class="text-xs text-white/50 hover:text-white/80">← Your teams</a>
	<h1 class="text-2xl md:text-3xl font-semibold text-white tracking-tight mt-2 mb-6">Account</h1>

	{#if userEmail}
		<div class="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3 mb-4">
			<dl class="text-sm">
				<dt class="text-xs uppercase tracking-wide text-white/50">Signed in as</dt>
				<dd class="text-white">{userEmail}</dd>
			</dl>
			<Button variant="ghost" size="sm" on:click={doSignOut}>Sign out</Button>
		</div>
	{/if}

	<div class="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2 mb-4">
		<dl class="text-sm">
			<dt class="text-xs uppercase tracking-wide text-white/50">Connected to Supabase project</dt>
			<dd class="text-white font-mono text-xs break-all mt-1">{SUPABASE_URL}</dd>
		</dl>
		<p class="text-[11px] text-white/45 leading-relaxed">
			Stored in your browser's localStorage. Disconnecting only affects this browser — your data
			stays in your Supabase project.
		</p>
		<Button variant="ghost" size="sm" on:click={changeProject}>Change Supabase project</Button>
	</div>

	<div class="rounded-xl border border-sky-400/20 bg-sky-400/[0.04] p-4 space-y-2">
		<dl class="text-sm">
			<dt class="text-xs uppercase tracking-wide text-white/50">Setup link for new devices / teammates</dt>
			<dd class="text-white/85 mt-1 leading-relaxed">
				One-click setup for any other browser, phone, or teammate. Opening this link auto-fills
				the Supabase URL + key and skips the setup wizard entirely.
			</dd>
		</dl>
		<Button size="sm" on:click={copySetupLink}>
			{copied ? 'Copied!' : 'Copy setup link'}
		</Button>
		<p class="text-[11px] text-white/45 leading-relaxed">
			Save this in your password manager so you can re-link this browser if you ever clear your
			data, switch browsers, or set up a new device. The Supabase anon key is public-by-design —
			row-level security is what protects your data, not key secrecy.
		</p>
	</div>
</div>
