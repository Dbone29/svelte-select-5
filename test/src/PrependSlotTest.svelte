<script>
    import Select from '../../src/lib/Select.svelte';

    let items = $state(['one', 'two']);
    let selectedValue = $state(undefined);
</script>

<Select bind:items bind:selectedValue>
    {#snippet prepend()}
        <div class="before">Before it all</div>
    {/snippet}
</Select>
