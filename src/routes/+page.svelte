<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/Button.svelte';
	import { authStore } from '$lib/db/auth-store';
	import { SUPABASE_CONFIGURED } from '$lib/db/client';
	import { APP_NAME } from '$lib/config';

	let signedIn = false;

	onMount(() => {
		const unsub = authStore.subscribe((s) => {
			signedIn = !!s.user && !s.isLoading;
		});
		return unsub;
	});

	function setupCta() {
		goto('/setup');
	}

	function loginCta() {
		goto(SUPABASE_CONFIGURED ? '/login' : '/setup');
	}

	function dashboardCta() {
		goto('/dashboard');
	}
</script>

<svelte:head>
	<title>{APP_NAME} — your team across timezones</title>
	<meta
		name="description"
		content="Open-source team scheduling tool — see your team's working hours across timezones, share teams via link. Self-hostable on your own Supabase project."
	/>
</svelte:head>

<div class="h-screen flex flex-col overflow-hidden">
	<header class="flex items-center justify-between px-5 md:px-10 py-4 md:py-5 shrink-0">
		<div class="flex items-center gap-2">
			<span class="inline-block h-2 w-2 rounded-full bg-sky-300"></span>
			<span class="text-sm font-semibold tracking-tight text-white">{APP_NAME}</span>
		</div>
		<a
			href="https://github.com/Lashapor/teamtime"
			target="_blank"
			rel="noreferrer"
			class="text-xs text-white/50 hover:text-white"
		>
			Source on GitHub ↗
		</a>
	</header>

	<main class="flex-1 flex items-center px-5 md:px-10">
		<div class="mx-auto w-full max-w-6xl grid md:grid-cols-[1.1fr_1fr] gap-8 md:gap-14 items-center">
			<!-- Left: hero copy + CTAs -->
			<div class="space-y-5 md:space-y-6">
				<span
					class="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[11px] uppercase tracking-wide text-sky-200"
				>
					<span class="h-1.5 w-1.5 rounded-full bg-sky-300"></span>
					Open source · self-hosted
				</span>

				<h1 class="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] text-white">
					See your team across timezones.
				</h1>

				<p class="text-sm md:text-base text-white/70 leading-relaxed max-w-xl">
					A live, side-by-side view of every teammate's working hours in their local timezone —
					with a current-hour marker, day-boundary chips, and tap-to-translate-time across rows.
					Bring your own database; your team's schedule never sits on someone else's server.
				</p>

				<div class="flex flex-wrap gap-3 pt-1">
					{#if signedIn}
						<Button on:click={dashboardCta}>Open dashboard →</Button>
					{:else}
						<Button on:click={setupCta}>Set up your own TeamTime →</Button>
						<Button variant="secondary" on:click={loginCta}>Sign in</Button>
					{/if}
				</div>

				<p class="text-[11px] text-white/40 pt-1">
					~3 minutes to set up. Free tier covers a team of 50. No credit card.
				</p>
			</div>

			<!-- Right: feature highlights -->
			<dl class="grid gap-3 md:gap-4">
				<div class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
					<dt class="text-sm font-semibold text-white flex items-center gap-2">
						<span class="text-sky-300">●</span> Self-hostable
					</dt>
					<dd class="text-xs text-white/55 mt-1.5 leading-relaxed">
						Connects to your own Supabase project. Paste the URL + publishable key once, run
						the schema in the SQL editor, you're set. No terminal needed.
					</dd>
				</div>
				<div class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
					<dt class="text-sm font-semibold text-white flex items-center gap-2">
						<span class="text-emerald-300">●</span> Multi-tenant
					</dt>
					<dd class="text-xs text-white/55 mt-1.5 leading-relaxed">
						Every signed-in user owns their own teams. Permissions are enforced server-side by
						Postgres row-level security — there's no service-role key on the client to leak.
					</dd>
				</div>
				<div class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
					<dt class="text-sm font-semibold text-white flex items-center gap-2">
						<span class="text-amber-300">●</span> Shareable, revocable
					</dt>
					<dd class="text-xs text-white/55 mt-1.5 leading-relaxed">
						Each team has a per-team URL with a rotatable token and optional password. Sign-in
						unlocks editing; share-link recipients can only read.
					</dd>
				</div>
			</dl>
		</div>
	</main>

	<footer class="px-5 md:px-10 py-3 md:py-4 shrink-0 text-[11px] text-white/40 flex flex-wrap items-center justify-between gap-2">
		<span>SvelteKit · Tailwind · Luxon · Supabase</span>
		<span>Bring your own database — your data, your DB, your call.</span>
	</footer>
</div>
