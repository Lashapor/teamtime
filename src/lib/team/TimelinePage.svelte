<script lang="ts">
	import { DateTime } from 'luxon';
	import { onMount } from 'svelte';
	import TimelineRow from './TimelineRow.svelte';
	import BookingModal from './BookingModal.svelte';
	import Button from '../components/Button.svelte';
	import Spinner from '../components/Spinner.svelte';
	import TimezoneCombobox from '../components/TimezoneCombobox.svelte';
	import { team as teamStore, teamError, teamLoading } from '../stores/team';
	import { resetViewerOffset, setViewerOffset, viewer } from '../stores/viewer';
	import { anchorDay, rebaseAnchor, setAnchorToToday, shiftDay } from '../stores/anchorDay';
	import { signedInUser } from '../stores/auth';
	import { signIn, signOut } from '../auth/gis';
	import { fetchPublishedCsv } from '../sheet/csv';
	import { parseTeam } from '../sheet/parser';
	import { offsetToZone } from '../time/offsets';
	import { getCsvUrlFromHash } from '../config';
	import type { TeamMember } from '../types';
	import type { TeamConfig } from './teams';

	export let team: TeamConfig;

	let bookingOpen = false;
	let bookingMember: TeamMember | null = null;
	let bookingInstant: DateTime | null = null;
	let signInBusy = false;

	function onTzChange(e: CustomEvent<number>) {
		const next = e.detail;
		const prev = $anchorDay;
		setViewerOffset(next);
		rebaseAnchor(next, prev);
	}

	$: viewerLocalNow = DateTime.now().setZone(offsetToZone($viewer.offsetMinutes));
	$: anchorIsToday =
		$anchorDay.year === viewerLocalNow.year &&
		$anchorDay.month === viewerLocalNow.month &&
		$anchorDay.day === viewerLocalNow.day;

	onMount(async () => {
		setAnchorToToday($viewer.offsetMinutes);
		teamLoading.set(true);
		teamError.set(null);
		try {
			const csvUrl = team.csvUrl || getCsvUrlFromHash();
			const csv = await fetchPublishedCsv(csvUrl);
			teamStore.set(parseTeam(csv));
		} catch (e) {
			teamError.set(e instanceof Error ? e.message : 'Failed to load team data.');
		} finally {
			teamLoading.set(false);
		}
	});

	function onBookCell(e: CustomEvent<{ member: TeamMember; instant: DateTime; rowLocal: DateTime }>) {
		bookingMember = e.detail.member;
		bookingInstant = e.detail.instant;
		bookingOpen = true;
	}

	async function handleSignIn() {
		signInBusy = true;
		try {
			await signIn();
		} catch {
			// auth store carries the error
		} finally {
			signInBusy = false;
		}
	}
</script>

<div class="w-full px-3 md:px-6 py-4 md:py-5">
	<header class="flex flex-wrap items-center justify-between gap-3 mb-4">
		<div class="flex items-baseline gap-3">
			<h1 class="text-xl md:text-2xl font-semibold text-white tracking-tight">
				{team.name}
			</h1>
			<span class="text-xs text-white/50">
				Click a slot to book · Hover to translate across rows
			</span>
		</div>
		<div class="flex items-center gap-2">
			{#if $signedInUser}
				<div class="flex items-center gap-2 text-sm text-white/80">
					{#if $signedInUser.picture}
						<img
							src={$signedInUser.picture}
							alt=""
							class="h-7 w-7 rounded-full"
							referrerpolicy="no-referrer"
						/>
					{/if}
					<span class="hidden sm:inline truncate max-w-[180px]">{$signedInUser.email}</span>
				</div>
				<Button variant="ghost" size="sm" on:click={signOut}>Sign out</Button>
			{:else}
				<Button variant="primary" size="sm" on:click={handleSignIn} disabled={signInBusy}>
					{#if signInBusy}<Spinner size="sm" />{/if} Sign in with Google
				</Button>
			{/if}
		</div>
	</header>

	<div class="flex flex-wrap items-center gap-3 mb-3 text-sm">
		<div class="flex items-center gap-2 text-white/70">
			<span class="text-[11px] uppercase tracking-wide">Your timezone</span>
			<TimezoneCombobox value={$viewer.offsetMinutes} on:change={onTzChange} ariaLabel="Your timezone" />
			{#if $viewer.source === 'manual'}
				<button
					type="button"
					class="text-[11px] text-sky-300 hover:text-sky-200"
					on:click={() => {
						resetViewerOffset();
						const prev = $anchorDay;
						rebaseAnchor($viewer.offsetMinutes, prev);
					}}
				>
					Reset to detected
				</button>
			{/if}
		</div>

		<div class="ml-auto flex items-center gap-2">
			<Button variant="secondary" size="sm" on:click={() => shiftDay(-1)} title="Previous day">
				← Prev
			</Button>
			<div class="text-sm text-white/80 tabular-nums px-2">
				{$anchorDay.toFormat('ccc, LLL d, yyyy')}
			</div>
			<Button variant="secondary" size="sm" on:click={() => shiftDay(1)} title="Next day">
				Next →
			</Button>
			{#if !anchorIsToday}
				<Button variant="ghost" size="sm" on:click={() => setAnchorToToday($viewer.offsetMinutes)}>
					Today
				</Button>
			{/if}
		</div>
	</div>

	{#if $teamLoading}
		<div class="flex items-center justify-center py-16">
			<Spinner />
		</div>
	{:else if $teamError}
		<div class="rounded-lg border border-rose-400/30 bg-rose-500/10 text-rose-100 px-4 py-3">
			Could not load team data — {$teamError}
		</div>
	{:else if $teamStore.length === 0}
		<div class="rounded-lg border border-white/10 bg-white/5 text-white/70 px-4 py-6 text-center">
			No teammates found. Check the CSV at the configured URL.
		</div>
	{:else}
		<div class="space-y-1.5">
			{#each $teamStore as member (member.email || member.name)}
				<TimelineRow {member} anchorDay={$anchorDay} on:bookCell={onBookCell} />
			{/each}
		</div>
		<div class="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-white/50">
			<span class="inline-flex items-center gap-1.5">
				<span class="inline-block h-3 w-3 rounded-sm bg-sky-500/30 border border-sky-400/30"></span>
				Working hours
			</span>
			<span class="inline-flex items-center gap-1.5">
				<span class="inline-block h-3 w-3 rounded-sm ring-2 ring-amber-300 ring-inset"></span>
				Current hour
			</span>
			<span class="inline-flex items-center gap-1.5">
				<span class="inline-block h-3 w-1 bg-amber-300/70"></span>
				Day boundary
			</span>
			<span class="inline-flex items-center gap-1.5">
				<span class="inline-block h-3 w-3 rounded-sm bg-amber-300"></span>
				Hovered hour (shown on every row in their local time)
			</span>
		</div>
	{/if}
</div>

<BookingModal
	open={bookingOpen}
	member={bookingMember}
	initialInstant={bookingInstant}
	viewerOffset={$viewer.offsetMinutes}
	on:close={() => (bookingOpen = false)}
/>
