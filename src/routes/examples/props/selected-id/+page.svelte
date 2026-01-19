<script>
    import Select from '$lib/Select.svelte';

    let collection = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    let selectedId;
</script>


<Select items={collection} bind:selectedId />

<p>selectedId: {selectedId}</p>
