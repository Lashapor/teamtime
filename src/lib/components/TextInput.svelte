<script lang="ts">
	export let value: string;
	export let placeholder = '';
	export let type: 'text' | 'time' | 'date' | 'email' = 'text';
	export let id: string | undefined = undefined;
	export let ariaLabel: string | undefined = undefined;
	export let disabled = false;

	const cls =
		'w-full rounded-md border border-white/15 bg-white/5 text-white text-sm px-3 py-2 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 disabled:opacity-50';
</script>

{#if type === 'time'}
	<input {id} type="time" {placeholder} {disabled} aria-label={ariaLabel} bind:value class={cls} on:input on:change />
{:else if type === 'date'}
	<input {id} type="date" {placeholder} {disabled} aria-label={ariaLabel} bind:value class={cls} on:input on:change />
{:else if type === 'email'}
	<input {id} type="email" {placeholder} {disabled} aria-label={ariaLabel} bind:value class={cls} on:input on:change />
{:else}
	<input {id} type="text" {placeholder} {disabled} aria-label={ariaLabel} bind:value class={cls} on:input on:change />
{/if}
