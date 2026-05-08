<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { SUPABASE_CONFIGURED } from '$lib/db/client';

	const PUBLIC_ROUTES = new Set(['/', '/setup', '/login']);

	$: pathname = $page.url.pathname;
	$: isPublicRoute = PUBLIC_ROUTES.has(pathname);

	onMount(() => {
		if (!SUPABASE_CONFIGURED && !isPublicRoute) {
			goto('/setup', { replaceState: true });
		}
	});

	$: if (typeof window !== 'undefined' && !SUPABASE_CONFIGURED && !isPublicRoute) {
		goto('/setup', { replaceState: true });
	}
</script>

<main class="min-h-screen">
	<slot />
</main>

<style>
	:global(html) {
		background-color: #0f1530;
	}
	:global(body) {
		background-image:
			radial-gradient(60% 60% at 30% 0%, rgba(56, 189, 248, 0.15) 0%, rgba(56, 189, 248, 0) 60%),
			radial-gradient(50% 50% at 80% 100%, rgba(99, 102, 241, 0.18) 0%, rgba(99, 102, 241, 0) 60%);
		background-color: #0f1530;
		background-attachment: fixed;
		background-repeat: no-repeat;
		background-size: 100% 100%;
		color: #fff;
		min-height: 100vh;
	}
</style>
