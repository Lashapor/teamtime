<script lang="ts">
    import "../app.css";
</script>

<main class="content flex justify-center">
    <div class=" flex flex-col w-full items-start justify-center m-1 md:m-5">
        <slot />
    </div>
</main>

<style>
    body {
        background: radial-gradient(
            50% 50% at 50% 50%,
            rgba(0, 99, 172, 0.5) 0%,
            rgba(0, 99, 172, 0) 100%
        );
    }
</style>
