<script lang="ts">
    import { onMount } from "svelte";
    import { hoverState } from "../routes/stores/store";

    // data sample
    export let userData = {
        name: "Lasha Porchkhidze",
        timezone: "GMT+4",
        imgUrl: "/img.png",
        startWorkTime: "09:00",
        endWorkTime: "18:00",
    };

    let userTime = "";
    let userDate = "";
    let currentHourBasedOnUserTime: any;
    let timeBasedOnHovered: number | null;

    // fetch time based on GMT
    async function fetchTime() {
        try {
            // Since the API uses a reverse offset, convert "GMT+3" to "GMT-3"
            const apiTimezone = `Etc/GMT${
                userData.timezone[3] === "+" ? "-" : "+"
            }${userData.timezone.substring(4)}`;
            const response = await fetch(
                `https://worldtimeapi.org/api/timezone/${apiTimezone}`,
            );
            const data = await response.json();

            const datetime = data.datetime;
            userTime = datetime.split("T")[1].substring(0, 5);
            userDate = datetime.substring(0, 7);
            currentHourBasedOnUserTime = parseInt(
                datetime.split("T")[1].substring(0, 2),
            );
        } catch (error) {
            console.error("Error fetching time:", error);
        }
    }

    function handleMouseEnter(event: any) {
        let hoveredTime = parseInt(event.target.textContent); // 20
        let hoveredTimezone = parseInt(userData.timezone.split("GMT")[1]); // gmt +2

        hoverState.set({
            hoveredTime: hoveredTime,
            hoveredTimezone: hoveredTimezone,
        });
    }

    function handleMouseLeave() {
        hoverState.set({ hoveredTime: null, hoveredTimezone: null });
    }

    // calculate timeDifference and set Time based on hovered time&timezone
    hoverState.subscribe(($hoverState) => {
        if (
            $hoverState.hoveredTime !== null &&
            $hoverState.hoveredTimezone !== null
        ) {
            let userTimeZone = parseInt(userData.timezone.split("GMT")[1]);
            let hoveredTimeZone = $hoverState.hoveredTimezone;

            let timeDifference = hoveredTimeZone - userTimeZone;

            timeBasedOnHovered =
                ($hoverState.hoveredTime - timeDifference + 24) % 24;
        } else {
            timeBasedOnHovered = null;
        }
    });

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

    // Extract hours as numbers for comparison
    const startHour = parseInt(userData.startWorkTime.split(":")[0]);
    const endHour = parseInt(userData.endWorkTime.split(":")[0]);

    // Function to check if the current hour is within the range
    function isWithinRange(hour: string) {
        const currentHour = parseInt(hour);
        return currentHour >= startHour && currentHour <= endHour;
    }
</script>

<div class="flex m-4 text-white">
    <div class="user-info mr-4 items-center flex w-60">
        <div class="img mr-2 w-10 h-10">
            <img class="rounded-full" src={userData.imgUrl} alt="user-img" />
        </div>
        <div class="">
            <div class="user-name text-xs md:text-base">{userData.name}</div>
            <div class="time text-xs font-bold md:text-base">{userTime}</div>
        </div>
        <div class="edit-user hidden"></div>
    </div>
    <div class="flex flex-wrap justify-center time-container">
        {#each hours as hour}
            <button
                on:mouseenter={(event) => handleMouseEnter(event)}
                on:mouseleave={handleMouseLeave}
                class={`p-1 md:p-2 hover:bg-[#FF7C60] cursor-pointer text-xs md:text-base border text-center flex items-center border-[#16A6F8] justify-center ${
                    parseInt(hour) === currentHourBasedOnUserTime
                        ? `bg-[#ff8e3d]`
                        : ""
                } ${isWithinRange(hour) ? `bg-[#16a5f89a]` : ""} ${
                    parseInt(hour) === timeBasedOnHovered
                        ? `bg-[#f6c29d9b]`
                        : ""
                } `}
            >
                {hour}
            </button>
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
