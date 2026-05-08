<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Button from '../components/Button.svelte';
	import Select from '../components/Select.svelte';
	import TextInput from '../components/TextInput.svelte';
	import Toggle from '../components/Toggle.svelte';
	import Spinner from '../components/Spinner.svelte';
	import { UTC_OFFSETS } from '../time/offsets';
	import { formatHHMM, parseShift } from '../time/shifts';
	import { team } from '../stores/team';
	import { signedInUser } from '../stores/auth';
	import { updateRow } from '../sheet/writer';
	import type { Shift, TeamMember } from '../types';

	export let member: TeamMember;

	const dispatch = createEventDispatcher<{ close: void; saved: void }>();

	let offset = String(member.offsetMinutes);
	let shift1Start = formatHHMM(member.shifts[0].startMin);
	let shift1End = formatHHMM(member.shifts[0].endMin);
	let hasShift2 = member.shifts.length === 2;
	let shift2Start = hasShift2 ? formatHHMM(member.shifts[1]!.startMin) : '';
	let shift2End = hasShift2 ? formatHHMM(member.shifts[1]!.endMin) : '';
	let saving = false;
	let error: string | null = null;

	async function save() {
		error = null;
		const s1 = parseShift(shift1Start, shift1End);
		if (!s1) {
			error = 'First shift must have start before end (use 0:00 for midnight).';
			return;
		}
		const shifts: Shift[] = [s1];
		if (hasShift2) {
			const s2 = parseShift(shift2Start, shift2End);
			if (!s2) {
				error = 'Second shift must have start before end.';
				return;
			}
			shifts.push(s2);
		}
		shifts.sort((a, b) => a.startMin - b.startMin);
		const offsetMinutes = parseInt(offset, 10);
		const user = $signedInUser;
		if (!user) {
			error = 'Sign in again to save.';
			return;
		}
		saving = true;
		const previous = member;
		const optimistic: TeamMember = {
			...member,
			offsetMinutes,
			offsetLabel: optimistic_offsetLabel(offsetMinutes),
			shifts: shifts.length === 2 ? [shifts[0], shifts[1]] : [shifts[0]]
		};
		team.update((list) => list.map((m) => (m.email === member.email ? optimistic : m)));
		try {
			await updateRow({ email: member.email, offsetMinutes, shifts }, user.idToken);
			dispatch('saved');
		} catch (e) {
			team.update((list) => list.map((m) => (m.email === member.email ? previous : m)));
			error = e instanceof Error ? e.message : 'Failed to save.';
		} finally {
			saving = false;
		}
	}

	function optimistic_offsetLabel(min: number): string {
		const sign = min >= 0 ? '+' : '-';
		const abs = Math.abs(min);
		const hh = Math.floor(abs / 60).toString().padStart(2, '0');
		const mm = (abs % 60).toString().padStart(2, '0');
		return `UTC${sign}${hh}:${mm}`;
	}
</script>

<div class="border-t border-white/10 bg-black/20 px-4 py-4">
	<div class="grid gap-3 md:grid-cols-[auto_1fr_1fr_auto] items-end">
		<label class="flex flex-col gap-1 text-xs text-white/70">
			Timezone
			<Select bind:value={offset} ariaLabel="Timezone offset">
				{#each UTC_OFFSETS as opt}
					<option value={String(opt.minutes)}>{opt.label}</option>
				{/each}
			</Select>
		</label>

		<div class="flex flex-col gap-1 text-xs text-white/70">
			<span>Shift 1</span>
			<div class="flex items-center gap-2">
				<TextInput type="time" bind:value={shift1Start} ariaLabel="Shift 1 start" />
				<span class="text-white/40">→</span>
				<TextInput type="time" bind:value={shift1End} ariaLabel="Shift 1 end" />
			</div>
		</div>

		<div class="flex flex-col gap-1 text-xs text-white/70">
			<div class="flex items-center justify-between">
				<span>Shift 2</span>
				<Toggle bind:checked={hasShift2} label="Add second shift" />
			</div>
			<div class="flex items-center gap-2 {hasShift2 ? '' : 'opacity-40'}">
				<TextInput
					type="time"
					bind:value={shift2Start}
					disabled={!hasShift2}
					ariaLabel="Shift 2 start"
				/>
				<span class="text-white/40">→</span>
				<TextInput
					type="time"
					bind:value={shift2End}
					disabled={!hasShift2}
					ariaLabel="Shift 2 end"
				/>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<Button variant="ghost" size="sm" on:click={() => dispatch('close')} disabled={saving}>
				Cancel
			</Button>
			<Button variant="primary" size="sm" on:click={save} disabled={saving}>
				{#if saving}<Spinner size="sm" />{/if} Save
			</Button>
		</div>
	</div>
	{#if error}
		<p class="mt-2 text-xs text-rose-300">{error}</p>
	{/if}
	<p class="mt-2 text-[11px] text-white/40">
		Use 0:00 for the end of a shift that ends at midnight (e.g., 21:30 → 0:00).
	</p>
</div>
