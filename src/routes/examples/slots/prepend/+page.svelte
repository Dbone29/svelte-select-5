<script>
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];
</script>


<Select {items}>
    {#snippet prepend()}
        <div class="prepend-icon">💪</div>
    {/snippet}
</Select>

<style>
    .prepend-icon {
        margin-right: 5px;
    }
</style>
