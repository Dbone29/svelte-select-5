<script>
    import Select from '../../src/lib/Select.svelte';

    let items = $state(['one', 'two']);
    let selectedValue = $state(undefined);
    let listOpen = $state(true);
</script>

<Select bind:items bind:selectedValue bind:listOpen showChevron>
    {#snippet chevronIcon({ listOpen })}
        <div>
            {#if listOpen}
                ⬆️
            {:else}
                ⬇️
            {/if}
        </div>
    {/snippet}
</Select>
