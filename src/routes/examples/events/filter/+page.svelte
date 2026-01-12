<script>
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    function handle(filteredItems) {
        console.log(filteredItems);
    }
</script>

<Select {items} onfilter={handle} />

