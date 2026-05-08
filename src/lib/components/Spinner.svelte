<script lang="ts">
	export let size: 'sm' | 'md' = 'md';
	const sizeClass = size === 'sm' ? 'h-4 w-4 border-2' : 'h-8 w-8 border-[3px]';
</script>

<span
	role="status"
	aria-label="Loading"
	class={`inline-block animate-spin rounded-full ${sizeClass} border-white/20 border-t-sky-400`}
></span>
