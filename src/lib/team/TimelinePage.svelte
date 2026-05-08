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
	import { clearPin, pinnedInstant } from '../stores/hover';
	import { BOOKING_ENABLED, getCsvUrlFromHash } from '../config';
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
	$: anchorShortLabel = $anchorDay.toFormat('ccc, LLL d');
	$: anchorLongLabel = $anchorDay.toFormat('ccc, LLL d, yyyy');

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

<div class="w-full px-3 md:px-6 py-3 md:py-5">
	<header class="flex items-start justify-between gap-3 mb-3 md:mb-4">
		<div class="min-w-0">
			<h1 class="text-lg md:text-2xl font-semibold text-white tracking-tight">
				{team.name}
			</h1>
			<p class="hidden sm:block text-xs text-white/50 mt-0.5">
				Tap or hover any hour to highlight the matching time across every teammate's row.
			</p>
			<p class="sm:hidden text-[11px] text-white/50 mt-0.5">
				Tap an hour to highlight it on every row.
			</p>
		</div>
		{#if BOOKING_ENABLED}
			<div class="flex items-center gap-2 shrink-0">
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
		{/if}
	</header>

	<div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-3 text-sm">
		<div class="flex items-center gap-2 text-white/70 flex-wrap">
			<span class="text-[11px] uppercase tracking-wide">Your timezone</span>
			<TimezoneCombobox value={$viewer.offsetMinutes} on:change={onTzChange} ariaLabel="Your timezone" />
			{#if $viewer.source === 'manual'}
				<button
					type="button"
					class="text-[11px] text-sky-300 hover:text-sky-200 underline-offset-2 hover:underline"
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

		<div class="md:ml-auto flex items-center gap-1 md:gap-2">
			<button
				type="button"
				class="h-9 w-9 inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
				on:click={() => shiftDay(-1)}
				aria-label="Previous day"
				title="Previous day"
			>
				<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
					<path d="M9 3l-4 4 4 4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</button>
			<button
				type="button"
				class="text-sm text-white/85 tabular-nums px-2 md:px-3 py-1.5 rounded-md border border-transparent hover:bg-white/5 hover:border-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
				on:click={() => setAnchorToToday($viewer.offsetMinutes)}
				title={anchorIsToday ? 'Showing today' : 'Jump to today'}
			>
				<span class="md:hidden">{anchorShortLabel}</span>
				<span class="hidden md:inline">{anchorLongLabel}</span>
				{#if !anchorIsToday}
					<span class="ml-1.5 inline-flex items-center rounded bg-sky-500/20 border border-sky-400/30 text-sky-200 px-1 py-px text-[10px] uppercase tracking-wide font-semibold">
						Today
					</span>
				{/if}
			</button>
			<button
				type="button"
				class="h-9 w-9 inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
				on:click={() => shiftDay(1)}
				aria-label="Next day"
				title="Next day"
			>
				<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
					<path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</button>
		</div>
	</div>

	{#if $pinnedInstant}
		<div class="flex items-center gap-2 mb-2 text-[11px] text-amber-200">
			<span class="inline-flex items-center gap-1.5 rounded bg-amber-500/20 border border-amber-400/30 px-2 py-0.5">
				<span class="inline-block h-2 w-2 rounded-full bg-amber-300"></span>
				Hour pinned across all rows
			</span>
			<button
				type="button"
				class="text-amber-200 hover:text-amber-100 underline underline-offset-2"
				on:click={clearPin}
			>
				Clear
			</button>
		</div>
	{/if}

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
				<TimelineRow
					{member}
					anchorDay={$anchorDay}
					bookingEnabled={BOOKING_ENABLED}
					on:bookCell={onBookCell}
				/>
			{/each}
		</div>
		<div class="hidden md:flex mt-3 flex-wrap items-center gap-3 text-[11px] text-white/50">
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
				Pinned/hovered hour
			</span>
		</div>
	{/if}
</div>

{#if BOOKING_ENABLED}
	<BookingModal
		open={bookingOpen}
		member={bookingMember}
		initialInstant={bookingInstant}
		viewerOffset={$viewer.offsetMinutes}
		on:close={() => (bookingOpen = false)}
	/>
{/if}
