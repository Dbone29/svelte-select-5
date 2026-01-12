<script>
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];
</script>


<Select {items}>
    {#snippet selection({ selection })}
        <div>🎉 {selection.label} 🎉</div>
    {/snippet}
</Select>

<br />
<br />

<Select {items} multiple>
    {#snippet selection({ selection, index })}
        <div>🎉 {index} : {selection.label} 🎉</div>
    {/snippet}
</Select>
