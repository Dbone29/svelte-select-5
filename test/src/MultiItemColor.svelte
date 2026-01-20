<script>
    import Select from '../../src/lib/Select.svelte';

    let items = $state(['one', 'two']);
    let selectedValue = $state(['one']);
</script>

<Select multiple bind:items bind:selectedValue listOpen --multi-item-color="red" />
