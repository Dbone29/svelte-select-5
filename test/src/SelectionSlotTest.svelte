<script>
    import Select from '../../src/lib/Select.svelte';

    let items = $state(['one', 'two']);
    let selectedValue = $state('one');
</script>

<Select bind:items bind:selectedValue>
    {#snippet selection({ selection })}
        Slot: {selection.label}
    {/snippet}
</Select>
