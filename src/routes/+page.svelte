<script lang="ts">
    import UserComponent from "$lib/UserComponent.svelte";

    let usersData = [
        {
            name: "Lasha Porchkhidze",
            areaLocationRegion: "/Asia/Tbilisi",
            imgUrl: "/user-imgs/lashap.png",
        },
        {
            name: "Ron Koren",
            areaLocationRegion: "/Asia/Jerusalem",
            imgUrl: "/user-imgs/ronk.jpeg",
        },
    ];
</script>

<h1 class="text-3xl">Hello TeamTime</h1>
{#each usersData as userData}
    <UserComponent {userData} />
{/each}
