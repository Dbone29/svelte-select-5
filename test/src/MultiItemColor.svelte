<script>
    import Select from '../../src/lib/Select.svelte';

    let items = $state([{value: 'one', label: 'one'}, {value: 'two', label: 'two'}]);
    let selectedValue = $state([{value: 'one', label: 'one'}]);
</script>

<Select multiple bind:items bind:selectedValue listOpen --multi-item-color="red" />
