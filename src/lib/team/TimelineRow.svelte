<script lang="ts">
	import { DateTime } from 'luxon';
	import HourCell from './HourCell.svelte';
	import AvatarImg from './AvatarImg.svelte';
	import EditRowPanel from './EditRowPanel.svelte';
	import { hoveredInstant } from '../stores/hover';
	import { signedInUser } from '../stores/auth';
	import { hourCellInstant, instantToRowLocal, isCurrentHour, nowInOffset } from '../time/clock';
	import { isInstantInShifts } from '../time/shifts';
	import { shortLabel } from '../time/offsets';
	import type { TeamMember } from '../types';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';

	export let member: TeamMember;
	export let anchorDay: DateTime;

	const dispatch = createEventDispatcher<{
		bookCell: { member: TeamMember; instant: DateTime; rowLocal: DateTime };
	}>();

	let editing = false;
	let now = nowInOffset(member.offsetMinutes);
	let interval: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		interval = setInterval(() => {
			now = nowInOffset(member.offsetMinutes);
		}, 30_000);
	});
	onDestroy(() => {
		if (interval) clearInterval(interval);
	});

	$: now = nowInOffset(member.offsetMinutes);

	$: cells = Array.from({ length: 24 }, (_, h) => {
		const instant = hourCellInstant(anchorDay, h);
		const rowLocal = instantToRowLocal(instant, member.offsetMinutes);
		const previousLocal =
			h === 0
				? rowLocal.minus({ hours: 1 })
				: instantToRowLocal(hourCellInstant(anchorDay, h - 1), member.offsetMinutes);
		const isDayStart = h !== 0 && rowLocal.day !== previousLocal.day;
		return {
			instant,
			rowLocal,
			isDayStart,
			isWorking: isInstantInShifts(instant, member),
			isCurrent: isCurrentHour(instant, member.offsetMinutes)
		};
	});

	$: dayChips = cells
		.map((c, i) => ({ index: i, rowLocal: c.rowLocal, isDayStart: c.isDayStart }))
		.filter((c) => c.isDayStart);

	$: canEdit = !!$signedInUser && $signedInUser.email === member.email;

	function onHover(e: CustomEvent<DateTime>) {
		hoveredInstant.set(e.detail);
	}
	function onLeave() {
		hoveredInstant.set(null);
	}
	function onClick(e: CustomEvent<{ instant: DateTime; rowLocal: DateTime }>) {
		dispatch('bookCell', { member, instant: e.detail.instant, rowLocal: e.detail.rowLocal });
	}

	function isHoveredCell(instant: DateTime, hovered: DateTime | null): boolean {
		if (!hovered) return false;
		return Math.abs(instant.toMillis() - hovered.toMillis()) < 1000;
	}
</script>

<div class="rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition">
	<div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 px-3 py-2 md:px-4">
		<div class="flex items-center gap-2.5 md:w-56 md:shrink-0">
			<AvatarImg src={member.imgUrl} name={member.name} size="sm" />
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<span class="text-sm font-semibold text-white truncate">{member.name}</span>
					<span class="text-[10px] uppercase tracking-wide text-white/40">
						{shortLabel(member.offsetMinutes)}
					</span>
				</div>
				<div class="text-xs text-white/70 tabular-nums">
					{now.toFormat('h:mm a')} · {now.toFormat('ccc, LLL d')}
				</div>
			</div>
			{#if canEdit}
				<button
					type="button"
					class="text-[11px] text-sky-300 hover:text-sky-200 px-2 py-0.5 rounded border border-sky-400/30 hover:border-sky-300"
					on:click={() => (editing = !editing)}
				>
					{editing ? 'Close' : 'Edit'}
				</button>
			{/if}
		</div>

		<div class="relative flex-1 min-w-0">
			<div class="flex w-full rounded-md overflow-hidden ring-1 ring-white/10">
				{#each cells as cell, i (i)}
					<HourCell
						instant={cell.instant}
						rowLocal={cell.rowLocal}
						isWorking={cell.isWorking}
						isCurrent={cell.isCurrent}
						isHovered={isHoveredCell(cell.instant, $hoveredInstant)}
						isDayStart={cell.isDayStart}
						on:hover={onHover}
						on:leave={onLeave}
						on:click={onClick}
					/>
				{/each}
			</div>
			<div class="relative h-3.5 mt-0.5">
				{#each dayChips as chip}
					<span
						class="absolute -top-px text-[9px] uppercase font-semibold tracking-wide text-amber-200 bg-amber-500/20 border border-amber-400/30 rounded px-1 py-0.5 -translate-x-1/2"
						style={`left: ${(chip.index / 24) * 100}%`}
					>
						{chip.rowLocal.toFormat('ccc · LLL d')}
					</span>
				{/each}
			</div>
		</div>
	</div>

	{#if editing && canEdit}
		<EditRowPanel
			{member}
			on:close={() => (editing = false)}
			on:saved={() => (editing = false)}
		/>
	{/if}
</div>
