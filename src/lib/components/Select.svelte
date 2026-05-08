<script lang="ts">
	export let value: string;
	export let id: string | undefined = undefined;
	export let ariaLabel: string | undefined = undefined;
</script>

<select
	{id}
	bind:value
	aria-label={ariaLabel}
	on:change
	class="rounded-md border border-white/15 bg-white/5 text-white text-sm px-2.5 py-1.5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400"
>
	<slot />
</select>
