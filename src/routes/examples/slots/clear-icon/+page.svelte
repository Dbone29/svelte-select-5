<script>
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];
</script>

<Select {items}>
    {#snippet clearIcon()}
        <div class="clear-icon">❌</div>
    {/snippet}
</Select>

<style>
    .clear-icon {
        cursor: default;
    }
</style>
