<script>
    import Select from '../../src/lib/Select.svelte';

    let items = [];

    for (let i = 0; i < 100; i++) {
        items.push({ label: String(i), value: i, group: 'a' });
    }

    let selectedValue = $state(null);

    let { hoverItemIndex = $bindable() } = $props();
</script>

<Select {items} bind:selectedValue groupBy={(i) => i.group} bind:hoverItemIndex />

{#if selectedValue}
    <p>
        Selected value: {selectedValue.label}
    </p>
{/if}
