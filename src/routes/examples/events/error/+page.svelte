<script>
    import Select from '$lib/Select.svelte';

    function loadOptions() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject('error');
            });
        });
    }

    function handle(error) {
        console.log(error);
    }
</script>

<Select onerror={handle} {loadOptions} />
