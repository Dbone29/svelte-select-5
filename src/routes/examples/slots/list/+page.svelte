<script>
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    let value = $state([]);

    function handleClick(item) {
        if (!value) value = [item];
        else value = [...value, item]
    }
</script>

<Select {items} bind:value multiple>
    {#snippet list({ filteredItems })}
        <div class="custom-list">
            {#each filteredItems as item }
                <span onclick={() => handleClick(item)}>{item.label}</span>
            {/each}
        </div>
    {/snippet}
</Select>


<style>
    .custom-list {
        display: flex;
        flex-direction: column;
        font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
    }

    span {
        height: 50px;
        display: flex;
        align-items: center;
        padding: 20px;
    }
</style>
