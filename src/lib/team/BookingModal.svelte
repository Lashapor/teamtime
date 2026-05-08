<script lang="ts">
	import { DateTime } from 'luxon';
	import { createEventDispatcher } from 'svelte';
	import Modal from '../components/Modal.svelte';
	import Button from '../components/Button.svelte';
	import Select from '../components/Select.svelte';
	import TextInput from '../components/TextInput.svelte';
	import Toggle from '../components/Toggle.svelte';
	import Spinner from '../components/Spinner.svelte';
	import { signedInUser } from '../stores/auth';
	import { signIn } from '../auth/gis';
	import { buildIso, insertEvent } from '../calendar/client';
	import { offsetToZone, shortLabel } from '../time/offsets';
	import type { TeamMember } from '../types';

	export let open = false;
	export let member: TeamMember | null = null;
	export let initialInstant: DateTime | null = null;
	export let viewerOffset: number;

	const dispatch = createEventDispatcher<{ close: void }>();

	let title = '';
	let dateStr = '';
	let timeStr = '';
	let durationMin = 30;
	let durationStr = '30';
	$: durationMin = parseInt(durationStr, 10) || 30;
	let notes = '';
	let addMeet = true;
	let busy = false;
	let error: string | null = null;
	let result: { htmlLink: string; hangoutLink?: string } | null = null;

	$: if (open && member && initialInstant) {
		const local = initialInstant.setZone(offsetToZone(viewerOffset));
		dateStr = local.toFormat('yyyy-LL-dd');
		timeStr = local.toFormat('HH:mm');
		title = title || `Sync with ${member.name}`;
		error = null;
		result = null;
	}

	$: viewerStart = (() => {
		if (!dateStr || !timeStr) return null;
		const dt = DateTime.fromFormat(`${dateStr} ${timeStr}`, 'yyyy-LL-dd HH:mm', {
			zone: offsetToZone(viewerOffset)
		});
		return dt.isValid ? dt : null;
	})();
	$: viewerEnd = viewerStart ? viewerStart.plus({ minutes: durationMin }) : null;
	$: memberStart = viewerStart && member
		? viewerStart.setZone(offsetToZone(member.offsetMinutes))
		: null;
	$: memberEnd = viewerEnd && member
		? viewerEnd.setZone(offsetToZone(member.offsetMinutes))
		: null;

	function close() {
		dispatch('close');
		setTimeout(() => {
			title = '';
			notes = '';
			result = null;
			error = null;
		}, 200);
	}

	async function ensureSignedIn() {
		if ($signedInUser && Date.now() < $signedInUser.accessTokenExpiresAt) return $signedInUser;
		return signIn();
	}

	async function submit() {
		if (!member) return;
		error = null;
		busy = true;
		try {
			const user = await ensureSignedIn();
			const start = DateTime.fromFormat(`${dateStr} ${timeStr}`, 'yyyy-LL-dd HH:mm', {
				zone: offsetToZone(viewerOffset)
			});
			if (!start.isValid) {
				error = 'Pick a valid date and time.';
				return;
			}
			const end = start.plus({ minutes: durationMin });
			const created = await insertEvent(user.accessToken, {
				summary: title || `Sync with ${member.name}`,
				description: notes || undefined,
				startIso: buildIso(start),
				endIso: buildIso(end),
				timeZone: offsetToZone(viewerOffset),
				attendees: [{ email: member.email }, { email: user.email }],
				addMeet
			});
			result = { htmlLink: created.htmlLink, hangoutLink: created.hangoutLink };
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create the meeting.';
		} finally {
			busy = false;
		}
	}
</script>

<Modal {open} title={member ? `Book a meeting with ${member.name}` : 'Book a meeting'} on:close={close}>
	{#if !member}
		<p class="text-sm text-white/70">No teammate selected.</p>
	{:else if result}
		<div class="space-y-3">
			<p class="text-sm text-white/80">
				Meeting created. Both calendars have been notified.
			</p>
			<div class="flex flex-col gap-2">
				<a
					class="text-sky-300 hover:text-sky-200 text-sm underline"
					href={result.htmlLink}
					target="_blank"
					rel="noreferrer"
				>
					Open in Google Calendar
				</a>
				{#if result.hangoutLink}
					<a
						class="text-sky-300 hover:text-sky-200 text-sm underline"
						href={result.hangoutLink}
						target="_blank"
						rel="noreferrer"
					>
						Join Google Meet
					</a>
				{/if}
			</div>
			<div class="flex justify-end pt-2">
				<Button variant="primary" on:click={close}>Done</Button>
			</div>
		</div>
	{:else}
		<form
			on:submit|preventDefault={submit}
			class="space-y-3 text-sm"
		>
			<label class="block">
				<span class="text-xs text-white/70">Title</span>
				<TextInput bind:value={title} placeholder="Sync with {member.name}" />
			</label>
			<div class="grid grid-cols-2 gap-3">
				<label class="block">
					<span class="text-xs text-white/70">Date (your time)</span>
					<TextInput type="date" bind:value={dateStr} />
				</label>
				<label class="block">
					<span class="text-xs text-white/70">Start (your time)</span>
					<TextInput type="time" bind:value={timeStr} />
				</label>
			</div>

			{#if viewerStart && viewerEnd && memberStart && memberEnd}
				<div class="rounded-lg border border-white/10 bg-white/[0.03] p-3 grid grid-cols-2 gap-3 text-xs">
					<div>
						<div class="text-[10px] uppercase tracking-wide text-white/50 mb-1">
							You · {shortLabel(viewerOffset)}
						</div>
						<div class="text-white text-sm font-semibold tabular-nums">
							{viewerStart.toFormat('h:mm a')} – {viewerEnd.toFormat('h:mm a')}
						</div>
						<div class="text-white/60 tabular-nums">
							{viewerStart.toFormat('ccc, LLL d')}
						</div>
					</div>
					<div>
						<div class="text-[10px] uppercase tracking-wide text-white/50 mb-1">
							{member.name} · {shortLabel(member.offsetMinutes)}
						</div>
						<div class="text-white text-sm font-semibold tabular-nums">
							{memberStart.toFormat('h:mm a')} – {memberEnd.toFormat('h:mm a')}
						</div>
						<div class="text-white/60 tabular-nums">
							{memberStart.toFormat('ccc, LLL d')}
							{#if memberStart.startOf('day').toMillis() !== viewerStart.startOf('day').toMillis()}
								{@const dayDiff = Math.round(
									(memberStart.startOf('day').toMillis() -
										viewerStart.startOf('day').toMillis()) /
										86_400_000
								)}
								<span class="ml-1 inline-flex items-center gap-1 rounded bg-amber-500/20 border border-amber-400/30 text-amber-200 px-1 py-px text-[10px] uppercase tracking-wide font-semibold">
									{dayDiff > 0 ? 'next day' : 'prev day'}
								</span>
							{/if}
						</div>
					</div>
				</div>
			{/if}
			<label class="block">
				<span class="text-xs text-white/70">Duration</span>
				<Select bind:value={durationStr}>
					<option value="15">15 minutes</option>
					<option value="30">30 minutes</option>
					<option value="45">45 minutes</option>
					<option value="60">60 minutes</option>
				</Select>
			</label>
			<label class="block">
				<span class="text-xs text-white/70">Notes (optional)</span>
				<textarea
					bind:value={notes}
					rows="3"
					class="w-full rounded-md border border-white/15 bg-white/5 text-white text-sm px-2.5 py-1.5 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400"
				></textarea>
			</label>
			<Toggle bind:checked={addMeet} label="Add Google Meet link" />
			{#if !$signedInUser}
				<p class="text-xs text-white/60">
					You'll be asked to sign in with Google when you submit.
				</p>
			{/if}
			{#if error}
				<p class="text-xs text-rose-300">{error}</p>
			{/if}
			<div class="flex justify-end gap-2 pt-2">
				<Button variant="ghost" on:click={close}>Cancel</Button>
				<Button variant="primary" type="submit" disabled={busy}>
					{#if busy}<Spinner size="sm" />{/if} Create meeting
				</Button>
			</div>
		</form>
	{/if}
</Modal>
