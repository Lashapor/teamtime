<script lang="ts">
	export let checked = false;
	export let label = '';
	export let id: string | undefined = undefined;
</script>

<label class="inline-flex items-center gap-2 text-sm text-white/80 cursor-pointer select-none" {...$$restProps}>
	<input
		{id}
		type="checkbox"
		bind:checked
		on:change
		class="h-4 w-4 accent-sky-500 cursor-pointer"
	/>
	{#if label}<span>{label}</span>{/if}
</label>
