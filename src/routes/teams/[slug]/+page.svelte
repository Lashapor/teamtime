<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import TimelinePage from '$lib/team/TimelinePage.svelte';
	import Button from '$lib/components/Button.svelte';
	import TextInput from '$lib/components/TextInput.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { SUPABASE_CONFIGURED } from '$lib/db/client';
	import { authStore } from '$lib/db/auth-store';
	import {
		fetchSharedTeam,
		fetchTeamFull,
		memberShiftIds,
		toMember,
		toTeam,
		type DbMemberRow,
		type DbTeamRow
	} from '$lib/db/queries';
	import { APP_NAME } from '$lib/config';

	const slug = $page.params.slug as string;

	let teamRow: DbTeamRow | null = null;
	let memberRows: DbMemberRow[] = [];
	let loading = true;
	let error: string | null = null;
	let viewerEmail: string | null = null;
	let viewerUserId: string | null = null;
	let loaded = false;

	let unlocked = false;
	let pwInput = '';
	let pwError: string | null = null;
	const sessionKey = `teamtime.${slug}.unlocked`;

	onMount(() => {
		try {
			if (sessionStorage.getItem(sessionKey) === '1') unlocked = true;
		} catch {
			// ignore
		}

		if (!SUPABASE_CONFIGURED) {
			error = 'Supabase is not configured.';
			loading = false;
			return;
		}

		const unsub = authStore.subscribe((s) => {
			if (s.isLoading) return;
			viewerEmail = s.user?.email?.toLowerCase() ?? null;
			viewerUserId = s.user?.id ?? null;
			if (!loaded) {
				loaded = true;
				void load();
			}
		});
		return unsub;
	});

	async function load() {
		loading = true;
		try {
			// Try authed read first (works for owner / member via RLS).
			let data = await fetchTeamFull(slug);
			// Fall back to public-by-slug RPC (works when share_enabled = true).
			if (!data) data = await fetchSharedTeam(slug);
			if (!data) {
				teamRow = null;
				memberRows = [];
			} else {
				teamRow = data.team;
				memberRows = data.members;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	function tryPassword(actualPassword: string | null) {
		if (!actualPassword || pwInput === actualPassword) {
			unlocked = true;
			pwError = null;
			try {
				sessionStorage.setItem(sessionKey, '1');
			} catch {
				// ignore
			}
		} else {
			pwError = 'Incorrect password.';
		}
	}

	$: members = memberRows.map(toMember);
	$: shiftIdMap = Object.fromEntries(memberRows.map((m) => [m.id, memberShiftIds(m)]));
	$: needsPassword = !!teamRow?.share_password && !unlocked;
	$: isOwnerViewer = !!teamRow && !!viewerUserId && teamRow.owner_id === viewerUserId;
</script>

<svelte:head>
	{#if teamRow}<title>{teamRow.name} · {APP_NAME}</title>{:else}<title>{APP_NAME}</title>{/if}
</svelte:head>

{#if !SUPABASE_CONFIGURED}
	<div class="mx-auto max-w-md px-4 py-12 text-center text-white/70">
		<p>Configure Supabase to use this app.</p>
		<p class="mt-2 text-xs">
			See <a class="underline text-sky-300" href="/setup">/setup</a>.
		</p>
	</div>
{:else if loading}
	<div class="flex items-center justify-center py-20"><Spinner /></div>
{:else if error}
	<div class="mx-auto max-w-md px-4 py-12 text-center text-rose-300 text-sm">
		{error}
	</div>
{:else if !teamRow}
	<div class="mx-auto max-w-md px-4 py-12 text-center text-white/70">
		<h1 class="text-xl font-semibold mb-2">Team not found</h1>
		<p class="text-sm">
			The team doesn't exist, sharing is disabled, or you don't have access. Double-check the URL.
		</p>
	</div>
{:else if needsPassword}
	<div class="min-h-[80vh] flex items-center justify-center px-4 py-8">
		<form
			on:submit|preventDefault={() => tryPassword(teamRow?.share_password ?? null)}
			class="w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5 md:p-6 shadow-2xl"
		>
			<div class="mb-1 text-xs uppercase tracking-wide text-sky-300">{teamRow.name}</div>
			<h1 class="text-xl md:text-2xl font-semibold text-white mb-1">Team timeline</h1>
			<p class="text-sm text-white/60 mb-5">Enter the team password to view the schedule.</p>
			<label class="block mb-3">
				<span class="block text-xs text-white/70 mb-1.5">Password</span>
				<TextInput bind:value={pwInput} placeholder="••••" />
			</label>
			{#if pwError}<p class="text-xs text-rose-300 mb-3">{pwError}</p>{/if}
			<button
				type="submit"
				class="w-full inline-flex items-center justify-center rounded-md bg-sky-500 hover:bg-sky-400 text-white font-medium px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300/60"
			>
				Unlock
			</button>
		</form>
	</div>
{:else}
	<TimelinePage
		team={toTeam(teamRow)}
		{members}
		memberShiftIdsById={shiftIdMap}
		canEditMember={() => false}
	>
		<svelte:fragment slot="header-actions">
			{#if isOwnerViewer}
				<a href={`/teams/${slug}/admin`} class="contents">
					<Button size="sm" variant="secondary">Manage</Button>
				</a>
			{:else if viewerEmail && members.some((m) => m.email === viewerEmail)}
				<a href={`/teams/${slug}/admin`} class="contents">
					<Button size="sm" variant="secondary">Edit my row</Button>
				</a>
			{/if}
		</svelte:fragment>
	</TimelinePage>
{/if}
