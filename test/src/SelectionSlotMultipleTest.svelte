<script>
    import Select from '../../src/lib/Select.svelte';

    let items = $state([{value: 'one', label: 'one'}, {value: 'two', label: 'two'}]);
    let selectedValue = $state([{value: 'one', label: 'one'}, {value: 'two', label: 'two'}]);
</script>

<Select bind:items bind:selectedValue multiple>
    {#snippet selection({ selection, index })}
        Index: {index} Slot: {selection.label}
    {/snippet}
</Select>
