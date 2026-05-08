<script lang="ts">
	import TimelinePage from '$lib/team/TimelinePage.svelte';
	import PasswordGate from '$lib/team/PasswordGate.svelte';
	import { getTeam } from '$lib/team/teams';

	const team = getTeam('thn')!;
</script>

<svelte:head>
	<title>{team.name} · Team Time</title>
</svelte:head>

<PasswordGate {team}>
	<TimelinePage {team} />
</PasswordGate>
