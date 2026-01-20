<script>
    import Select from '../../src/lib/Select.svelte';

    let { filterText = $bindable('') } = $props();

    let items = [
        { value: 'chocolate', label: 'Chocolate', group: 'Sweet' },
        { value: 'pizza', label: 'Pizza', group: 'Savory' },
        { value: 'cake', label: 'Cake', group: 'Sweet', selectable: false },
        { value: 'chips', label: 'Chips', group: 'Savory' },
        { value: 'ice-cream', label: 'Ice Cream', group: 'Sweet' },
    ];

    let selectedValue = $state(undefined);
</script>

<Select {items} groupBy={(item) => item.group} bind:selectedValue bind:filterText />
