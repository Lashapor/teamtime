<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { SUPABASE_CONFIGURED } from '$lib/db/client';
	import { authStore } from '$lib/db/auth-store';
	import { fetchMyTeams, type DbTeamRow } from '$lib/db/queries';
	import { signOut } from '$lib/auth/supabase-auth';
	import { APP_NAME } from '$lib/config';

	let teams: DbTeamRow[] = [];
	let loadingTeams = true;
	let userEmail: string | null = null;
	let error: string | null = null;
	let lastLoadedUserId: string | null = null;

	onMount(() => {
		if (!SUPABASE_CONFIGURED) {
			goto('/');
			return;
		}
		const unsub = authStore.subscribe((s) => {
			if (s.isLoading) return;
			if (!s.user) {
				goto('/login');
				return;
			}
			userEmail = s.user.email ?? null;
			if (s.user.id !== lastLoadedUserId) {
				lastLoadedUserId = s.user.id;
				void loadTeams(s.user.id);
			}
		});
		return unsub;
	});

	async function loadTeams(userId: string) {
		loadingTeams = true;
		try {
			teams = await fetchMyTeams(userId);
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loadingTeams = false;
		}
	}

	async function doSignOut() {
		await signOut();
		goto('/');
	}
</script>

<svelte:head>
	<title>Your teams · {APP_NAME}</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 md:px-6 py-6 md:py-10">
	<header class="flex items-center justify-between mb-8">
		<div>
			<h1 class="text-2xl md:text-3xl font-semibold text-white tracking-tight">Your teams</h1>
			<p class="text-sm text-white/60 mt-1">
				{#if userEmail}Signed in as {userEmail}{/if}
			</p>
		</div>
		<Button variant="ghost" size="sm" on:click={doSignOut}>Sign out</Button>
	</header>

	{#if loadingTeams}
		<div class="flex items-center justify-center py-16"><Spinner /></div>
	{:else if error}
		<div class="rounded-lg border border-rose-400/30 bg-rose-500/10 text-rose-100 px-4 py-3 text-sm">
			{error}
		</div>
	{:else if teams.length === 0}
		<div class="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
			<p class="text-white/80 mb-1">No teams yet.</p>
			<p class="text-sm text-white/50 mb-5">
				Create your first team and start tracking working hours across timezones.
			</p>
			<a href="/teams/new" class="contents">
				<Button>Create your first team →</Button>
			</a>
		</div>
	{:else}
		<div class="flex justify-end mb-3">
			<a href="/teams/new" class="contents">
				<Button size="sm">+ New team</Button>
			</a>
		</div>
		<ul class="space-y-2">
			{#each teams as team (team.id)}
				<li>
					<a
						href={`/teams/${team.slug}/admin`}
						class="block rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-4 py-3 transition"
					>
						<div class="flex items-center justify-between gap-3">
							<div class="min-w-0">
								<div class="text-white font-semibold truncate">{team.name}</div>
								<div class="text-xs text-white/50">/teams/{team.slug}</div>
							</div>
							<span class="text-xs text-sky-300">Manage →</span>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
