<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import TextInput from '$lib/components/TextInput.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { SUPABASE_CONFIGURED } from '$lib/db/client';
	import { authStore } from '$lib/db/auth-store';
	import { createTeam } from '$lib/db/queries';
	import { APP_NAME } from '$lib/config';

	let name = '';
	let sharePassword = '';
	let busy = false;
	let error: string | null = null;
	let userId: string | null = null;

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
		});
		return unsub;
	});

	async function submit() {
		if (!userId) return;
		error = null;
		busy = true;
		try {
			const { slug } = await createTeam({
				name: name.trim(),
				sharePassword: sharePassword.trim() || undefined,
				ownerUserId: userId
			});
			goto(`/teams/${slug}/admin`);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>New team · {APP_NAME}</title>
</svelte:head>

<div class="mx-auto max-w-md px-4 py-8 md:py-12">
	<a href="/dashboard" class="text-xs text-white/50 hover:text-white/80">← Your teams</a>
	<h1 class="text-2xl md:text-3xl font-semibold text-white tracking-tight mt-2 mb-6">
		Create a team
	</h1>

	<form on:submit|preventDefault={submit} class="space-y-4">
		<label class="block">
			<span class="block text-xs text-white/70 mb-1.5">Team name</span>
			<TextInput bind:value={name} placeholder="Acme Engineering" />
		</label>

		<label class="block">
			<span class="block text-xs text-white/70 mb-1.5">Share password (optional)</span>
			<TextInput bind:value={sharePassword} placeholder="Leave empty for no password" />
			<span class="block text-[11px] text-white/40 mt-1">
				Visitors with the share link will be prompted for this password before they can view the team.
			</span>
		</label>

		{#if error}<p class="text-xs text-rose-300">{error}</p>{/if}

		<div class="flex gap-2 pt-2">
			<a href="/dashboard" class="contents">
				<Button variant="ghost">Cancel</Button>
			</a>
			<Button type="submit" disabled={busy || !name.trim() || !userId}>
				{#if busy}<Spinner size="sm" />{/if} Create team
			</Button>
		</div>
	</form>
</div>
