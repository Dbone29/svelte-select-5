<script>
  import Select from '../../../src/lib/Select.svelte';

  let { selectedValue = $bindable(), items } = $props();
</script>

<div class="container">
  <Select bind:selectedValue {items}></Select>

  <p class="result">{selectedValue.label}</p>
</div>
