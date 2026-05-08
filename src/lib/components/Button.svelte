<script lang="ts">
	export let variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary';
	export let size: 'sm' | 'md' = 'md';
	export let type: 'button' | 'submit' = 'button';
	export let disabled = false;
	export let title: string | undefined = undefined;

	const variants = {
		primary: 'bg-sky-500 hover:bg-sky-400 text-white border-transparent',
		secondary: 'bg-white/10 hover:bg-white/20 text-white border-white/15',
		ghost: 'bg-transparent hover:bg-white/10 text-white/80 hover:text-white border-transparent',
		danger: 'bg-rose-500/90 hover:bg-rose-500 text-white border-transparent'
	};
	const sizes = {
		sm: 'px-2.5 py-1 text-xs',
		md: 'px-3.5 py-1.5 text-sm'
	};
</script>

<button
	{type}
	{disabled}
	{title}
	on:click
	class={`inline-flex items-center justify-center gap-1.5 rounded-md border font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]}`}
>
	<slot />
</button>
