<script>
    import Select from '$lib/Select.svelte';

    let items = ['One', 'Two', 'Three'];

    let collection = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    let selectedValue;
</script>

<Select {items} selectedValue="One" />
<br />
<Select items={collection} bind:selectedValue />

<p>{selectedValue?.label || ''}</p>
