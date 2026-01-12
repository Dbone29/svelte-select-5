<script>
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    let checked = $state([]);
    let value = $derived(checked.map((c) => items.find((i) => i.value === c)));
    let isChecked = $derived.by(() => {
        const result = {};
        checked.forEach((c) => (result[c] = true));
        return result;
    });

    function handleChange(e, type) {
        if (type === 'clear' && Array.isArray(e)) checked = [];
        else
            checked.includes(e.value)
                ? (checked = checked.filter((i) => i != e.value))
                : (checked = [...checked, e.value]);
    }
</script>

<Select
    {items}
    {value}
    multiple={true}
    filterSelectedItems={false}
    closeListOnChange={false}
    onselect={(e) => handleChange(e, 'select')}
    onclear={(e) => handleChange(e, 'clear')}>
    {#snippet item({ item })}
        <div class="item">
            <label for={item.value}>
                <input type="checkbox" id={item.value} checked={isChecked[item.value]} />
                {item.label}
            </label>
        </div>
    {/snippet}
</Select>

<style>
    .item {
        pointer-events: none;
    }
</style>
