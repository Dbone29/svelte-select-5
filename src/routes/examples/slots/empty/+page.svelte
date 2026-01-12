<script>
    import Select from '$lib/Select.svelte';

    let items = [];
</script>

<Select {items}>
    {#snippet empty()}
        <div class="empty-message">Nothing to see here...</div>
    {/snippet}
</Select>

<style>
    .empty-message {
        padding: 10px;
        text-align: center;
    }
</style>
