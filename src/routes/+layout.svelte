<script lang="ts">
	import '../app.css';
</script>

<main class="min-h-screen">
	<slot />
</main>

<style>
	:global(body) {
		background:
			radial-gradient(60% 60% at 30% 0%, rgba(56, 189, 248, 0.15) 0%, rgba(56, 189, 248, 0) 60%),
			radial-gradient(50% 50% at 80% 100%, rgba(99, 102, 241, 0.18) 0%, rgba(99, 102, 241, 0) 60%),
			#0f1530;
		color: #fff;
		min-height: 100vh;
	}
</style>
