<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let open = false;
	export let title = '';

	const dispatch = createEventDispatcher<{ close: void }>();

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) dispatch('close');
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') dispatch('close');
	}
</script>

<svelte:window on:keydown={handleKey} />

{#if open}
	<div
		role="dialog"
		aria-modal="true"
		class="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
		on:click={handleBackdrop}
		on:keydown={handleKey}
	>
		<div class="w-full max-w-md rounded-xl border border-white/10 bg-[#1d2547] text-white shadow-2xl">
			<header class="flex items-center justify-between px-5 py-4 border-b border-white/10">
				<h2 class="text-base font-semibold">{title}</h2>
				<button
					type="button"
					class="text-white/60 hover:text-white text-xl leading-none"
					on:click={() => dispatch('close')}
					aria-label="Close"
				>
					×
				</button>
			</header>
			<div class="px-5 py-4">
				<slot />
			</div>
		</div>
	</div>
{/if}
