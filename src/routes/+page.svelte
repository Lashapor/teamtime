<script lang="ts">
    import UserComponent from "$lib/UserComponent.svelte";
    import { onMount } from "svelte";
    import Loading from "$lib/Loading.svelte";
    import * as d3 from "d3";

    let usersData: [];

    let defaultDataUrl =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vRlywXJkjZT1DpyXr3bBfINZlyjlZ0TEcJYNOIQwoIPc0lsUG0P2-gTm1SxcQ09h4ieykJiWipkD797/pub?output=csv";

    function fetchData(dataUrl: string) {
        d3.csv(dataUrl)
            .then((data: any) => {
                console.log({ data: data });
                usersData = data;
            })
            .catch((error: any) => console.log("Error:", error));
    }

    onMount(() => {
        let hashUrl = window.location.hash.substring(1); // Remove '#' from the start
        let dataUrl = hashUrl ? hashUrl : defaultDataUrl;

        fetchData(dataUrl);
    });
</script>

<h1 class="text-3xl font-bold text-white">
    Welcome to TeamTime for ETF Insider
</h1>
{#if usersData && usersData.length > 0}
    {#each usersData as userData}
        <UserComponent {userData} />
    {/each}
{:else}
    <div class="flex w-full items-center justify-center">
        <Loading />
    </div>
{/if}
