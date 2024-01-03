<script lang="ts">
    import { onMount } from "svelte";

    export let userData = {
        name: "Lasha Porchkhidze",
        areaLocationRegion: "/Asia/Tbilisi",
        imgUrl: "/user-imgs/lashap.png",
    };

    let userTime = "";
    let currentHourBasedOnUserTime: any;

    async function fetchTime() {
        try {
            const response = await fetch(
                `https://worldtimeapi.org/api/timezone${userData.areaLocationRegion}.txt`,
            );
            const data = await response.text();
            const lines = data.split("\n");
            const datetimeLine = lines.find((line) =>
                line.startsWith("datetime:"),
            );
            if (datetimeLine) {
                userTime = datetimeLine.split(" ")[1].substr(11, 5); // Extract the time part
                currentHourBasedOnUserTime = parseInt(userTime.split(":")[0]); // Extract the hour
            }
        } catch (error) {
            console.error("Error fetching time:", error);
        }
    }

    onMount(() => {
        fetchTime();
        const interval = setInterval(fetchTime, 60000); // Update every minute

        return () => {
            clearInterval(interval); // Clear interval when component is destroyed
        };
    });

    let hours = Array.from({ length: 24 }, (_, i) =>
        i.toString().padStart(2, "0"),
    );
    let startTime = "09:00";
    let endTime = "18:00";

    // Extract hours as numbers for comparison
    const startHour = parseInt(startTime.split(":")[0]);
    const endHour = parseInt(endTime.split(":")[0]);

    // Function to check if the current hour is within the range
    function isWithinRange(hour: string) {
        const currentHour = parseInt(hour);
        return currentHour >= startHour && currentHour <= endHour;
    }
</script>

<div class="flex m-4">
    <div class="user-info mr-4 items-center flex w-60">
        <div class="img mr-2  w-10 h-10">
            <img class="rounded-full" src={userData.imgUrl} alt="user-img" />
        </div>
        <div class="">
            <div class="user-name">{userData.name}</div>
            <div class="time">{userTime}</div>
        </div>
        <div class="edit-user hidden"></div>
    </div>
    <div class="flex flex-wrap justify-center time-container">
        {#each hours as hour}
            <div
                class={`p-2 border border-red-300 text-center flex items-center justify-center ${
                    parseInt(hour) === currentHourBasedOnUserTime
                        ? "bg-red-300"
                        : ""
                } ${isWithinRange(hour) ? "bg-green-300" : ""}`}
            >
                {hour}
            </div>
        {/each}
    </div>
</div>

<style>
    .time-container > div:not(:last-child) {
        border-right: none;
    }

    .time-container > div:first-child {
        border-top-left-radius: 10px;
        border-bottom-left-radius: 10px;
    }

    .time-container > div:last-child {
        border-top-right-radius: 10px;
        border-bottom-right-radius: 10px;
    }
</style>
