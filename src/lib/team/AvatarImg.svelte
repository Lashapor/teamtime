<script lang="ts">
	export let src: string | null;
	export let name: string;
	export let size: 'sm' | 'md' = 'md';

	let errored = false;

	function initials(n: string): string {
		const parts = n.trim().split(/\s+/);
		const first = parts[0]?.[0] ?? '';
		const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
		return (first + last).toUpperCase() || '?';
	}

	function bgColor(n: string): string {
		const palette = [
			'#0ea5e9',
			'#6366f1',
			'#22c55e',
			'#f59e0b',
			'#ec4899',
			'#a855f7',
			'#14b8a6',
			'#ef4444'
		];
		let hash = 0;
		for (let i = 0; i < n.length; i++) hash = (hash * 31 + n.charCodeAt(i)) | 0;
		return palette[Math.abs(hash) % palette.length];
	}

	$: dim = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
	$: showFallback = errored || !src;
</script>

<span
	class={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ${dim}`}
	style={showFallback ? `background:${bgColor(name)}` : 'background:rgba(255,255,255,0.05)'}
>
	{#if !showFallback}
		<img
			src={src}
			alt={name}
			referrerpolicy="no-referrer"
			loading="lazy"
			class="h-full w-full object-cover"
			on:error={() => (errored = true)}
		/>
	{:else}
		{initials(name)}
	{/if}
</span>
