<script>
    import Select from '../../src/lib/Select.svelte';

    let items = $state(['one', 'two']);
    let selectedValue = $state('one');
</script>

<Select bind:items name="test" bind:selectedValue>
    {#snippet inputHidden({ value })}
        <input type="hidden" name="test" value={value.value} />
    {/snippet}
</Select>
