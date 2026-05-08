<script lang="ts">
	import Button from '$lib/components/Button.svelte';
</script>

<svelte:head>
	<title>Team Time</title>
	<meta
		name="description"
		content="See your team across timezones at a glance, then book a meeting in one click."
	/>
</svelte:head>

<div class="min-h-[calc(100vh-2rem)] flex items-center">
	<div class="mx-auto w-full max-w-3xl px-5 sm:px-6 py-10 sm:py-16 md:py-24">
		<div class="space-y-5 md:space-y-6 text-white">
			<span
				class="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[11px] sm:text-xs uppercase tracking-wide text-sky-200"
			>
				<span class="h-1.5 w-1.5 rounded-full bg-sky-300"></span> Team Time
			</span>
			<h1 class="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.15]">
				See your team across timezones — and book a meeting in one click.
			</h1>
			<p class="text-sm sm:text-base md:text-lg text-white/70 leading-relaxed">
				Team Time turns a Google Sheet into a live, side-by-side view of everyone's working hours.
				Spot overlap instantly, click a slot, schedule it. No more "what time is that for you?"
			</p>
			<div class="flex flex-col sm:flex-row gap-3 pt-2">
				<a href="/thn" class="contents">
					<Button>View THN timeline →</Button>
				</a>
				<a
					href="https://github.com/Lashapor/teamtime"
					target="_blank"
					rel="noreferrer"
					class="contents"
				>
					<Button variant="secondary">How it works</Button>
				</a>
			</div>
			<dl class="grid gap-4 sm:grid-cols-3 pt-7 md:pt-8 border-t border-white/10 mt-8 md:mt-10">
				<div>
					<dt class="text-sm font-medium text-white">Live timezones</dt>
					<dd class="text-xs text-white/60 mt-1 leading-relaxed">
						Auto-detected; switch with a search-as-you-type dropdown. Half-hour offsets supported.
					</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-white">Split shifts</dt>
					<dd class="text-xs text-white/60 mt-1 leading-relaxed">
						Two working ranges per teammate, e.g. 9–18 and 21:30–24:00.
					</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-white">One-click booking</dt>
					<dd class="text-xs text-white/60 mt-1 leading-relaxed">
						Click any hour to draft a Google Calendar invite to that teammate.
					</dd>
				</div>
			</dl>
		</div>
	</div>
</div>
