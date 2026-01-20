<script>
    import Select from '../../src/lib/Select.svelte';

    let items = $state([{value: 'one', label: 'one'}, {value: 'two', label: 'two'}]);
    let selectedValue = $state({value: 'one', label: 'one'});
</script>

<Select bind:items name="test" bind:selectedValue>
    {#snippet inputHidden({ value })}
        <input type="hidden" name="test" value={value?.value ?? ''} />
    {/snippet}
</Select>
