<script lang="ts">
	import type { DateTime } from 'luxon';
	import { createEventDispatcher } from 'svelte';

	export let instant: DateTime;
	export let rowLocal: DateTime;
	export let isWorking: boolean;
	export let isCurrent: boolean;
	export let isHovered: boolean;
	export let isDayStart: boolean;
	export let clickable = true;

	const dispatch = createEventDispatcher<{
		hover: DateTime;
		leave: void;
		click: { instant: DateTime; rowLocal: DateTime };
	}>();

	$: hourLabel = rowLocal.hour;
	$: ampm = rowLocal.hour < 12 ? 'am' : 'pm';
	$: hour12 = rowLocal.hour % 12 === 0 ? 12 : rowLocal.hour % 12;

	$: classes = [
		'group relative flex h-10 min-w-0 flex-1 shrink basis-0 flex-col items-center justify-center text-[11px] md:text-xs transition-colors select-none border-r border-white/5',
		clickable ? 'cursor-pointer' : 'cursor-default',
		isWorking ? 'bg-sky-500/30 text-white' : 'bg-white/[0.02] text-white/60',
		hourLabel === 0 ? 'font-semibold' : '',
		isCurrent ? 'ring-2 ring-amber-300 ring-inset z-10' : '',
		isHovered
			? '!bg-amber-300 !text-slate-900 ring-2 ring-amber-400 ring-inset font-semibold z-20'
			: 'hover:bg-white/15',
		isDayStart ? 'border-l-2 border-l-amber-300/70' : ''
	].join(' ');
</script>

<button
	type="button"
	class={classes}
	on:mouseenter={() => dispatch('hover', instant)}
	on:mouseleave={() => dispatch('leave')}
	on:focus={() => dispatch('hover', instant)}
	on:blur={() => dispatch('leave')}
	on:click={() => dispatch('click', { instant, rowLocal })}
>
	<span class="leading-none tabular-nums">{hour12}</span>
	<span class="text-[9px] md:text-[10px] uppercase opacity-70 leading-none mt-0.5">{ampm}</span>
</button>
