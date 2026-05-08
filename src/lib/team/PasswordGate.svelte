<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '../components/Button.svelte';
	import TextInput from '../components/TextInput.svelte';
	import type { TeamConfig } from './teams';

	export let team: TeamConfig;

	let unlocked = false;
	let value = '';
	let error: string | null = null;
	let storageKey = '';

	$: storageKey = `teamtime.${team.slug}.unlocked`;

	onMount(() => {
		try {
			if (sessionStorage.getItem(storageKey) === '1') unlocked = true;
		} catch {
			// sessionStorage might be disabled
		}
	});

	function submit() {
		if (value === team.password) {
			unlocked = true;
			error = null;
			try {
				sessionStorage.setItem(storageKey, '1');
			} catch {
				// ignore
			}
		} else {
			error = 'Incorrect password';
		}
	}
</script>

{#if unlocked}
	<slot />
{:else}
	<div class="min-h-[80vh] flex items-center justify-center px-4">
		<form
			on:submit|preventDefault={submit}
			class="w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 shadow-2xl"
		>
			<div class="mb-1 text-xs uppercase tracking-wide text-sky-300">{team.name}</div>
			<h1 class="text-xl font-semibold text-white mb-1">Team timeline</h1>
			<p class="text-sm text-white/60 mb-5">Enter the team password to view the schedule.</p>

			<label class="block mb-3">
				<span class="block text-xs text-white/70 mb-1">Password</span>
				<TextInput bind:value placeholder="••••" ariaLabel="Team password" />
			</label>

			{#if error}
				<p class="text-xs text-rose-300 mb-3">{error}</p>
			{/if}

			<Button type="submit" variant="primary">Unlock</Button>
		</form>
	</div>
{/if}
