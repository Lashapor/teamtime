<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import TimelinePage from '$lib/team/TimelinePage.svelte';
	import EditRowPanel from '$lib/team/EditRowPanel.svelte';
	import Button from '$lib/components/Button.svelte';
	import TextInput from '$lib/components/TextInput.svelte';
	import TimezoneCombobox from '$lib/components/TimezoneCombobox.svelte';
	import Toggle from '$lib/components/Toggle.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { SUPABASE_CONFIGURED } from '$lib/db/client';
	import { authStore } from '$lib/db/auth-store';
	import {
		addMember,
		deleteTeam,
		fetchTeamFull,
		isSlugAvailable,
		memberShiftIds,
		removeMember,
		slugify,
		toMember,
		toTeam,
		updateTeam,
		type FullTeamData
	} from '$lib/db/queries';
	import { detectViewerOffsetMinutes } from '$lib/time/detect';
	import { parseShift } from '$lib/time/shifts';
	import type { Shift } from '$lib/types';
	import { signOut } from '$lib/auth/supabase-auth';
	import { APP_NAME } from '$lib/config';

	const slug = $page.params.slug as string;

	let activeTab: 'admin' | 'timeline' = 'admin';
	let data: FullTeamData | null = null;
	let loadingData = true;
	let userId: string | null = null;
	let userEmail: string | null = null;

	let showAdd = false;
	let newName = '';
	let newEmail = '';
	let newOffset = detectViewerOffsetMinutes();
	let newShift1Start = '09:00';
	let newShift1End = '18:00';
	let newShift2Has = false;
	let newShift2Start = '';
	let newShift2End = '';
	let busy = false;
	let error: string | null = null;
	let copied = false;
	let pwInput = '';
	let pwSavedHint = false;
	let pwInitialized = false;

	let nameInput = '';
	let nameInitialized = false;
	let nameSavedHint = false;

	let slugInput = '';
	let slugInitialized = false;
	let slugSavedHint = false;

	let editingMemberId: string | null = null;

	type SlugCheck = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';
	let slugStatus: SlugCheck = 'idle';
	let slugCheckTimer: ReturnType<typeof setTimeout> | null = null;

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
			userId = s.user.id;
			userEmail = s.user.email?.toLowerCase() ?? null;
			if (data === null && loadingData) {
				void refresh();
			}
		});
		return unsub;
	});

	async function refresh() {
		loadingData = true;
		try {
			data = await fetchTeamFull(slug);
			error = null;
			if (data && !pwInitialized) {
				pwInput = data.team.share_password ?? '';
				pwInitialized = true;
			}
			if (data && !nameInitialized) {
				nameInput = data.team.name;
				nameInitialized = true;
			}
			if (data && !slugInitialized) {
				slugInput = data.team.slug;
				slugInitialized = true;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loadingData = false;
		}
	}

	$: teamRow = data?.team ?? null;
	$: members = data ? data.members.map(toMember) : [];
	$: shiftIdMap = data ? Object.fromEntries(data.members.map((m) => [m.id, memberShiftIds(m)])) : {};
	$: isOwner = !!teamRow && !!userId && teamRow.owner_id === userId;
	$: shareUrl =
		typeof window !== 'undefined' && teamRow?.share_enabled
			? `${window.location.origin}/teams/${teamRow.slug}`
			: '';
	$: hasPassword = !!(teamRow?.share_password && teamRow.share_password.length);
	$: slugPreviewSlug = slugify(slugInput) || teamRow?.slug || '';

	$: scheduleSlugCheck(slugInput, teamRow?.slug ?? '');

	function scheduleSlugCheck(value: string, currentSlug: string) {
		if (slugCheckTimer) {
			clearTimeout(slugCheckTimer);
			slugCheckTimer = null;
		}
		const next = slugify(value);
		if (!next) {
			slugStatus = value.trim() ? 'invalid' : 'idle';
			return;
		}
		if (next === currentSlug) {
			slugStatus = 'idle';
			return;
		}
		slugStatus = 'checking';
		slugCheckTimer = setTimeout(async () => {
			try {
				const ok = await isSlugAvailable(next);
				if (slugify(slugInput) === next) {
					slugStatus = ok ? 'available' : 'taken';
				}
			} catch {
				slugStatus = 'idle';
			}
		}, 450);
	}

	function canEditMember(m: { email: string; userId: string | null }): boolean {
		if (isOwner) return true;
		if (userEmail && userEmail === m.email) return true;
		return false;
	}

	async function submitAddMember() {
		if (!teamRow) return;
		error = null;

		const shifts: Shift[] = [];
		const s1HasInput = newShift1Start.trim() !== '' || newShift1End.trim() !== '';
		if (s1HasInput) {
			const s1 = parseShift(newShift1Start, newShift1End);
			if (!s1) {
				error = 'Shift 1 must have start before end. To skip, leave both fields empty.';
				return;
			}
			shifts.push(s1);
		}
		if (newShift2Has) {
			const s2 = parseShift(newShift2Start, newShift2End);
			if (!s2) {
				error = 'Shift 2 must have start before end.';
				return;
			}
			shifts.push(s2);
		}
		shifts.sort((a, b) => a.startMin - b.startMin);

		busy = true;
		try {
			await addMember({
				teamId: teamRow.id,
				name: newName.trim(),
				email: newEmail.trim().toLowerCase(),
				offsetMinutes: newOffset,
				role: 'editor',
				shifts
			});
			newName = '';
			newEmail = '';
			newShift1Start = '09:00';
			newShift1End = '18:00';
			newShift2Has = false;
			newShift2Start = '';
			newShift2End = '';
			showAdd = false;
			await refresh();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function handleRemoveMember(memberId: string, memberName: string) {
		if (!confirm(`Remove ${memberName} from this team?`)) return;
		busy = true;
		try {
			await removeMember(memberId);
			if (editingMemberId === memberId) editingMemberId = null;
			await refresh();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function handleSaveSlug() {
		if (!teamRow) return;
		const next = slugify(slugInput);
		if (!next || next === teamRow.slug) return;
		if (slugStatus === 'taken') return;
		busy = true;
		try {
			await updateTeam({ teamId: teamRow.id, patch: { slug: next } });
			// Full reload to the new URL so all derived state (slug, shareUrl) refreshes.
			window.location.replace(`/teams/${next}/admin`);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			if (/duplicate key|unique/i.test(msg)) {
				error = `Slug "${next}" is already taken in this project. Pick another.`;
				slugStatus = 'taken';
			} else {
				error = msg;
			}
			busy = false;
		}
	}

	async function handleToggleShare() {
		if (!teamRow) return;
		busy = true;
		try {
			await updateTeam({
				teamId: teamRow.id,
				patch: { share_enabled: !teamRow.share_enabled }
			});
			await refresh();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function handleSaveName() {
		if (!teamRow) return;
		const trimmed = nameInput.trim();
		if (!trimmed || trimmed === teamRow.name) return;
		busy = true;
		try {
			await updateTeam({ teamId: teamRow.id, patch: { name: trimmed } });
			nameSavedHint = true;
			setTimeout(() => (nameSavedHint = false), 2000);
			await refresh();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function handleSavePassword() {
		if (!teamRow) return;
		const value = pwInput.trim();
		if (!value) return;
		busy = true;
		try {
			await updateTeam({ teamId: teamRow.id, patch: { share_password: value } });
			pwSavedHint = true;
			setTimeout(() => (pwSavedHint = false), 2000);
			await refresh();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function handleDisablePassword() {
		if (!teamRow || !hasPassword) return;
		if (!confirm('Remove the password from this team? Anyone with the share link will see the timeline without a password.')) return;
		busy = true;
		try {
			await updateTeam({ teamId: teamRow.id, patch: { share_password: null } });
			pwInput = '';
			await refresh();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function handleDeleteTeam() {
		if (!teamRow) return;
		if (!confirm(`Permanently delete team "${teamRow.name}"? This cannot be undone.`)) return;
		busy = true;
		try {
			await deleteTeam(teamRow.id);
			goto('/dashboard');
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function copyShareUrl() {
		if (!shareUrl) return;
		try {
			await navigator.clipboard.writeText(shareUrl);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// silent
		}
	}

	async function doSignOut() {
		await signOut();
		goto('/');
	}

	function toggleEdit(memberId: string) {
		editingMemberId = editingMemberId === memberId ? null : memberId;
	}

	function closeEdit() {
		editingMemberId = null;
	}

	async function onMemberSaved() {
		editingMemberId = null;
		await refresh();
	}
</script>

<svelte:head>
	{#if teamRow}<title>{teamRow.name} · admin · {APP_NAME}</title>{:else}<title>{APP_NAME}</title>{/if}
</svelte:head>

{#if !SUPABASE_CONFIGURED}
	<div class="mx-auto max-w-md px-4 py-12 text-white/70">Configure Supabase to use this app.</div>
{:else if loadingData}
	<div class="flex items-center justify-center py-20"><Spinner /></div>
{:else if !teamRow}
	<div class="mx-auto max-w-md px-4 py-12 text-center text-white/70">
		<h1 class="text-xl font-semibold mb-2">Team not found</h1>
		<a href="/dashboard" class="text-sm text-sky-300 underline">Back to your teams</a>
	</div>
{:else}
	<!-- Top nav: tabs left, links right, all visually consistent -->
	<div class="mx-auto max-w-6xl px-3 md:px-6 pt-4 md:pt-6">
		<div class="flex items-center justify-between gap-4 border-b border-white/10">
			<nav class="flex" aria-label="Sections">
				<button
					type="button"
					class="px-3 md:px-4 py-2 text-sm border-b-2 -mb-px transition {activeTab === 'admin'
						? 'text-white border-sky-400 font-semibold'
						: 'text-white/50 hover:text-white/80 border-transparent'}"
					on:click={() => (activeTab = 'admin')}
				>
					Admin
				</button>
				<button
					type="button"
					class="px-3 md:px-4 py-2 text-sm border-b-2 -mb-px transition {activeTab === 'timeline'
						? 'text-white border-sky-400 font-semibold'
						: 'text-white/50 hover:text-white/80 border-transparent'}"
					on:click={() => (activeTab = 'timeline')}
				>
					{APP_NAME}
				</button>
			</nav>
			<div class="flex items-center gap-3 md:gap-4">
				<a href="/" class="text-sm text-white/50 hover:text-white transition">Home</a>
				<a href="/dashboard" class="text-sm text-white/50 hover:text-white transition">All teams</a>
				<button
					type="button"
					on:click={doSignOut}
					class="text-sm text-white/50 hover:text-white transition"
				>
					Sign out
				</button>
			</div>
		</div>
	</div>

	{#if activeTab === 'timeline'}
		<TimelinePage
			team={toTeam(teamRow)}
			{members}
			memberShiftIdsById={shiftIdMap}
			canEditMember={canEditMember}
			on:saved={refresh}
		/>
	{:else}
		<div class="mx-auto max-w-6xl px-3 md:px-6 pt-4 md:pt-6 pb-10 space-y-4">
			{#if isOwner}
				<!-- 1. Team name -->
				<section class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
					<h2 class="text-sm font-semibold text-white mb-3">Team name</h2>
					<form on:submit|preventDefault={handleSaveName} class="max-w-md">
						<div class="flex items-end gap-2">
							<div class="flex-1 min-w-0">
								<TextInput bind:value={nameInput} placeholder="Acme Engineering" />
							</div>
							<Button
								type="submit"
								size="sm"
								variant="secondary"
								disabled={busy || !nameInput.trim() || nameInput.trim() === teamRow.name}
							>
								{nameSavedHint ? 'Saved' : 'Save'}
							</Button>
						</div>
					</form>
				</section>

				<!-- 2. URL slug -->
				<section class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
					<h2 class="text-sm font-semibold text-white mb-3">URL slug</h2>
					<form on:submit|preventDefault={handleSaveSlug} class="max-w-md">
						<div class="flex items-end gap-2">
							<div class="flex-1 min-w-0">
								<TextInput bind:value={slugInput} placeholder="acme-engineering" />
							</div>
							<Button
								type="submit"
								size="sm"
								variant="secondary"
								disabled={busy ||
									!slugify(slugInput) ||
									slugify(slugInput) === teamRow.slug ||
									slugStatus === 'taken' ||
									slugStatus === 'checking'}
							>
								{slugSavedHint ? 'Saved' : 'Save'}
							</Button>
						</div>
						<div class="flex flex-wrap items-center justify-between gap-2 mt-1.5 text-[11px]">
							<span class="text-white/45 break-all">
								{typeof window !== 'undefined' ? window.location.origin : ''}/teams/<span
									class="text-white/75">{slugPreviewSlug}</span
								>
							</span>
							<span class="shrink-0">
								{#if slugStatus === 'checking'}
									<span class="text-white/45">checking…</span>
								{:else if slugStatus === 'available'}
									<span class="text-emerald-300">✓ available</span>
								{:else if slugStatus === 'taken'}
									<span class="text-rose-300">✗ taken</span>
								{:else if slugStatus === 'invalid'}
									<span class="text-amber-200">letters/numbers/hyphens only</span>
								{/if}
							</span>
						</div>
					</form>
					<p class="text-[11px] text-white/55 mt-3 leading-relaxed">
						Renaming the slug breaks any old share links. The new URL is yours to share again.
					</p>
				</section>

				<!-- 3. Sharing -->
				<section class="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
					<div class="flex items-center justify-between">
						<h2 class="text-sm font-semibold text-white">Sharing</h2>
						<button
							type="button"
							class="text-xs text-white/70 hover:text-white"
							on:click={handleToggleShare}
							disabled={busy}
						>
							{teamRow.share_enabled ? 'Disable share link' : 'Enable share link'}
						</button>
					</div>

					{#if teamRow.share_enabled && shareUrl}
						<div class="flex items-center gap-2 max-w-xl">
							<input
								type="text"
								readonly
								value={shareUrl}
								class="flex-1 min-w-0 rounded-md border border-white/15 bg-white/5 text-white/80 text-xs px-2.5 py-2 font-mono"
							/>
							<Button size="sm" variant="secondary" on:click={copyShareUrl}>
								{copied ? 'Copied!' : 'Copy'}
							</Button>
						</div>
						<p class="text-[11px] text-white/45 leading-relaxed">
							Anyone with this URL can read the timeline. To "revoke" a leaked URL, rename the
							slug above — the old URL will 404 immediately.
						</p>
					{:else}
						<p class="text-xs text-white/50">
							Share link disabled. Toggle on to make this team viewable by anyone with the URL.
						</p>
					{/if}
				</section>

				<!-- 4. Password -->
				<section class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
					<div class="flex items-center justify-between mb-3">
						<h2 class="text-sm font-semibold text-white">Password</h2>
						{#if hasPassword}
							<span class="text-[11px] text-emerald-300">Currently set</span>
						{/if}
					</div>
					<form on:submit|preventDefault={handleSavePassword} class="max-w-md">
						<div class="flex items-end gap-2">
							<div class="flex-1 min-w-0">
								<TextInput
									bind:value={pwInput}
									placeholder={hasPassword ? 'Type a new password to change' : 'Set a password'}
								/>
							</div>
							{#if hasPassword}
								<Button
									type="button"
									size="sm"
									variant="danger"
									on:click={handleDisablePassword}
									disabled={busy}
								>
									Disable
								</Button>
							{/if}
							<Button
								type="submit"
								size="sm"
								variant="secondary"
								disabled={busy || !pwInput.trim()}
							>
								{pwSavedHint ? 'Saved' : hasPassword ? 'Update' : 'Set'}
							</Button>
						</div>
					</form>
					<p class="text-[11px] text-white/55 mt-2 leading-relaxed">
						Optional. When set, share-link visitors are prompted before the timeline renders.
						Cached for the browser session once entered. To remove, click <strong>Disable</strong>.
					</p>
				</section>

				<!-- 5. Members -->
				<section class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
					<div class="flex items-center justify-between mb-3">
						<h2 class="text-sm font-semibold text-white">Members</h2>
						<Button size="sm" on:click={() => (showAdd = !showAdd)}>
							{showAdd ? 'Cancel' : '+ Add member'}
						</Button>
					</div>

					{#if showAdd}
						<form
							on:submit|preventDefault={submitAddMember}
							class="space-y-3 mb-4 rounded-lg border border-white/10 bg-white/[0.02] p-3"
						>
							<div class="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
								<label class="block">
									<span class="block text-xs text-white/70 mb-1">Name</span>
									<TextInput bind:value={newName} placeholder="Jane Doe" />
								</label>
								<label class="block">
									<span class="block text-xs text-white/70 mb-1">Email</span>
									<TextInput type="email" bind:value={newEmail} placeholder="jane@example.com" />
								</label>
								<div class="flex flex-col gap-1 text-xs text-white/70">
									<span>Timezone</span>
									<TimezoneCombobox
										value={newOffset}
										on:change={(e) => (newOffset = e.detail)}
										ariaLabel="Member timezone"
									/>
								</div>
							</div>

							<div class="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
								<div class="flex flex-col gap-1 text-xs text-white/70">
									<span>Shift 1</span>
									<div class="flex items-center gap-2">
										<TextInput type="time" bind:value={newShift1Start} ariaLabel="Shift 1 start" />
										<span class="text-white/40">→</span>
										<TextInput type="time" bind:value={newShift1End} ariaLabel="Shift 1 end" />
									</div>
								</div>

								<div class="flex flex-col gap-1 text-xs text-white/70">
									<div class="flex items-center justify-between">
										<span>Shift 2</span>
										<Toggle bind:checked={newShift2Has} label="Add second shift" />
									</div>
									<div class="flex items-center gap-2 {newShift2Has ? '' : 'opacity-40'}">
										<TextInput
											type="time"
											bind:value={newShift2Start}
											disabled={!newShift2Has}
											ariaLabel="Shift 2 start"
										/>
										<span class="text-white/40">→</span>
										<TextInput
											type="time"
											bind:value={newShift2End}
											disabled={!newShift2Has}
											ariaLabel="Shift 2 end"
										/>
									</div>
								</div>

								<Button
									size="sm"
									type="submit"
									disabled={busy || !newName.trim() || !newEmail.trim()}
								>
									{#if busy}<Spinner size="sm" />{/if} Add
								</Button>
							</div>

							<p class="text-[11px] text-white/45 leading-relaxed">
								Leave both Shift 1 fields empty to add a member without working hours yet — they'll
								show on the timeline once shifts are filled in. Use 0:00 for midnight at end of day.
							</p>
						</form>
					{/if}

					{#if members.length > 0}
						<ul class="text-sm text-white/80 space-y-1">
							{#each members as m (m.id)}
								<li class="rounded border border-transparent {editingMemberId === m.id ? 'border-white/10 bg-white/[0.02]' : ''}">
									<div class="flex items-center justify-between gap-3 px-2 py-1.5">
										<span class="truncate">
											{m.name} · <span class="text-white/50">{m.email}</span>
											<span class="ml-1 text-[11px] text-white/40">{m.offsetLabel}</span>
										</span>
										<div class="flex items-center gap-3 shrink-0">
											{#if canEditMember(m)}
												<button
													type="button"
													class="text-[11px] text-sky-300 hover:text-sky-200"
													on:click={() => toggleEdit(m.id)}
													disabled={busy}
												>
													{editingMemberId === m.id ? 'Close' : 'Edit'}
												</button>
											{/if}
											{#if isOwner}
												<button
													type="button"
													class="text-[11px] text-rose-300 hover:text-rose-200"
													on:click={() => handleRemoveMember(m.id, m.name)}
													disabled={busy}
												>
													Remove
												</button>
											{/if}
										</div>
									</div>
									{#if editingMemberId === m.id}
										<EditRowPanel
											member={m}
											currentShiftIds={shiftIdMap[m.id] ?? []}
											on:close={closeEdit}
											on:saved={onMemberSaved}
										/>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</section>

				<!-- Danger zone -->
				<section class="rounded-xl border border-rose-400/20 bg-rose-500/5 p-4">
					<h2 class="text-sm font-semibold text-rose-200 mb-2">Danger zone</h2>
					<Button variant="danger" size="sm" on:click={handleDeleteTeam} disabled={busy}>
						Delete team
					</Button>
				</section>
			{/if}

			{#if error}
				<p class="text-xs text-rose-300">{error}</p>
			{/if}
		</div>
	{/if}
{/if}
