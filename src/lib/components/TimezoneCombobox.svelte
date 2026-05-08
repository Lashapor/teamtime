<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
	import { UTC_OFFSETS, formatOffset, shortLabel } from '../time/offsets';

	export let value: number;
	export let placeholder = 'Search timezone…';
	export let ariaLabel = 'Timezone';

	const dispatch = createEventDispatcher<{ change: number }>();

	let open = false;
	let query = '';
	let highlight = 0;
	let inputEl: HTMLInputElement | undefined;
	let listEl: HTMLUListElement | undefined;
	let rootEl: HTMLDivElement | undefined;

	$: selectedLabel = formatOffset(value);

	$: filtered = (() => {
		const q = query.trim().toLowerCase();
		if (!q) return UTC_OFFSETS;
		return UTC_OFFSETS.filter((o) => {
			const long = formatOffset(o.minutes).toLowerCase();
			const short = shortLabel(o.minutes).toLowerCase();
			return long.includes(q) || short.includes(q);
		});
	})();

	$: if (highlight >= filtered.length) highlight = Math.max(0, filtered.length - 1);

	async function openMenu() {
		if (open) return;
		open = true;
		query = '';
		highlight = Math.max(
			0,
			UTC_OFFSETS.findIndex((o) => o.minutes === value)
		);
		await tick();
		inputEl?.focus();
		scrollToHighlight();
	}

	function closeMenu() {
		open = false;
		query = '';
	}

	function selectByIndex(i: number) {
		const o = filtered[i];
		if (!o) return;
		if (o.minutes !== value) {
			value = o.minutes;
			dispatch('change', o.minutes);
		}
		closeMenu();
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlight = Math.min(filtered.length - 1, highlight + 1);
			scrollToHighlight();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlight = Math.max(0, highlight - 1);
			scrollToHighlight();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			selectByIndex(highlight);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			closeMenu();
		}
	}

	function scrollToHighlight() {
		if (!listEl) return;
		const el = listEl.querySelectorAll('li')[highlight] as HTMLElement | undefined;
		if (el) el.scrollIntoView({ block: 'nearest' });
	}

	function onDocClick(e: MouseEvent) {
		if (!rootEl) return;
		if (!rootEl.contains(e.target as Node)) closeMenu();
	}

	onMount(() => {
		document.addEventListener('mousedown', onDocClick);
	});
	onDestroy(() => {
		document.removeEventListener('mousedown', onDocClick);
	});
</script>

<div bind:this={rootEl} class="relative inline-block text-sm">
	<button
		type="button"
		class="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-label={ariaLabel}
		on:click={openMenu}
	>
		<span class="tabular-nums">{selectedLabel}</span>
		<svg
			width="10"
			height="10"
			viewBox="0 0 10 10"
			class="text-white/50"
			aria-hidden="true"
		>
			<path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</button>

	{#if open}
		<div
			class="absolute z-30 mt-1 w-56 rounded-md border border-white/10 bg-[#1d2547] shadow-xl"
			role="dialog"
		>
			<div class="p-1.5 border-b border-white/10">
				<input
					bind:this={inputEl}
					bind:value={query}
					on:keydown={onKey}
					{placeholder}
					class="w-full rounded bg-black/30 border border-white/10 text-white text-sm px-2 py-1 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400"
					aria-label="Search timezones"
				/>
			</div>
			<ul
				bind:this={listEl}
				role="listbox"
				class="max-h-56 overflow-y-auto py-1 text-sm"
			>
				{#each filtered as opt, i (opt.minutes)}
					<li
						role="option"
						aria-selected={opt.minutes === value}
						on:mouseenter={() => (highlight = i)}
						on:mousedown|preventDefault={() => selectByIndex(i)}
						class="px-3 py-1.5 cursor-pointer flex items-center justify-between {i === highlight
							? 'bg-sky-500/20 text-white'
							: 'text-white/80 hover:bg-white/5'}"
					>
						<span class="tabular-nums">{formatOffset(opt.minutes)}</span>
						<span class="text-xs text-white/40">{shortLabel(opt.minutes)}</span>
					</li>
				{:else}
					<li class="px-3 py-2 text-xs text-white/50">No matches</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
