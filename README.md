# svelte-select-5

A select/autocomplete/typeahead component for **Svelte 5**.

This is a fork of [svelte-select](https://github.com/rob-balfre/svelte-select) with full Svelte 5 support.

## Installation

```bash
npm install svelte-select-5
```

## Svelte 5 Migration

This fork has been fully migrated to Svelte 5:
- Uses Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`)
- Slots replaced with snippets (e.g., `slot="clear-icon"` → `{#snippet clearIcon()}`)
- Events use callback props (e.g., `on:select` → `onselect`)

See [CHANGELOG.md](./CHANGELOG.md) for breaking changes.


## Upgrading Svelte Select
See [migration guide](/MIGRATION_GUIDE.md) if upgrading


## Rollup and low/no-build setups

List position and floating is powered by `floating-ui`, see their [package-entry-points](https://github.com/floating-ui/floating-ui#package-entry-points) docs if you encounter build errors.



## Props

| Prop                   | Type      | Default         | Description                                                    |
| ---------------------- | --------- | --------------- | -------------------------------------------------------------- |
| items                  | `any[]`   | `[]`            | Array of items available to display / filter                   |
| value                  | `any`     | `null`          | Selected value(s)                                              |
| justValue              | `any`     | `null`          | Selected value(s) IDs only. Can be set to update `value`.      |
| itemId                 | `string`  | `value`         | Override default identifier                                    |
| label                  | `string`  | `label`         | Override default label                                         |
| id                     | `string`  | `null`          | id attr for input field                                        |
| filterText             | `string`  | `''`            | Text to filter `items` by                                      |
| placeholder            | `string`  | `Please select` | Placeholder text                                               |
| hideEmptyState         | `boolean` | `false`         | When no items hide list                                        |
| listOpen               | `boolean` | `false`         | Open/close list                                                |
| class                  | `string`  | `''`            | container classes                                              |
| containerStyles        | `string`  | `''`            | Add inline styles to container                                 |
| clearable              | `boolean` | `true`          | Enable clearing of value(s)                                    |
| disabled               | `boolean` | `false`         | Disable select                                                 |
| multiple               | `boolean` | `false`         | Enable multi-select                                            |
| searchable             | `boolean` | `true`          | If `false` search/filtering is disabled                        |
| groupHeaderSelectable  | `boolean` | `false`         | Enable selectable group headers                                |
| focused                | `boolean` | `false`         | Controls input focus                                           |
| listAutoWidth          | `boolean` | `true`          | If `false` will ignore width of select                         |
| showChevron            | `boolean` | `false`         | Show chevron                                                   |
| inputAttributes        | `object`  | `{}`            | Pass in HTML attributes to Select's input                      |
| placeholderAlwaysShow  | `boolean` | `false`         | When `multiple` placeholder text will always show              |
| loading                | `boolean` | `false`         | Shows `loading-icon`. `loadOptions` will override this         |
| listOffset             | `number`  | `5`             | `px` space between select and list                             |
| debounceWait           | `number`  | `300`           | `milliseconds` debounce wait                                   |
| floatingConfig         | `object`  | `{}`            | [Floating UI Config](https://floating-ui.com/)                 |
| hasError               | `boolean` | `false`         | If `true` sets error class and styles                          |
| name                   | `string`  | `null`          | Name attribute of hidden input, helpful for form actions       |
| required               | `boolean` | `false`         | If `Select` is within a `<form>` will restrict form submission |
| multiFullItemClearable | `boolean` | `false`         | When `multiple` selected items will clear on click             |
| closeListOnChange      | `boolean` | `true`          | After `on:change` list will close                              |
| clearFilterTextOnBlur  | `boolean` | `true`          | If `false`, `filterText` value is preserved on:blur            |


## Snippets (Svelte 5)

Svelte 5 uses snippets instead of slots. Note: snippet names use camelCase (Svelte 5 requirement).

```svelte
<Select>
  {#snippet prepend()}
    <div>Prepend content</div>
  {/snippet}

  {#snippet selection({ selection, index })}
    <!-- index only available when multiple -->
    <div>{selection.label}</div>
  {/snippet}

  {#snippet clearIcon()}
    <span>×</span>
  {/snippet}

  {#snippet multiClearIcon()}
    <span>×</span>
  {/snippet}

  {#snippet loadingIcon()}
    <span>Loading...</span>
  {/snippet}

  {#snippet chevronIcon({ listOpen })}
    <span>{listOpen ? '▲' : '▼'}</span>
  {/snippet}

  {#snippet listPrepend()}
    <div>List header</div>
  {/snippet}

  {#snippet list({ filteredItems })}
    <!-- Custom list rendering -->
  {/snippet}

  {#snippet listAppend()}
    <div>List footer</div>
  {/snippet}

  {#snippet item({ item, index })}
    <div>{item.label}</div>
  {/snippet}

  {#snippet inputHidden({ value })}
    <input type="hidden" value={JSON.stringify(value)} />
  {/snippet}

  {#snippet requiredSlot({ value })}
    <!-- Custom required indicator -->
  {/snippet}

  {#snippet empty()}
    <div>No results found</div>
  {/snippet}
</Select>
```


## Event Callbacks (Svelte 5)

Svelte 5 uses callback props instead of `on:event` syntax.

| Callback     | Argument            | Description                                                                |
| ------------ | ------------------- | -------------------------------------------------------------------------- |
| `onchange`   | `value`             | fires when the user selects an option                                      |
| `oninput`    | `value`             | fires when the value has been changed                                      |
| `onselect`   | `selection`         | fires when an item is selected                                             |
| `onfocus`    | `event`             | fires when select input gains focus                                        |
| `onblur`     | `event`             | fires when select input loses focus                                        |
| `onclear`    | `value`             | fires when clear is invoked or item is removed (by user) from multi select |
| `onloaded`   | `{ items }`         | fires when `loadOptions` resolves                                          |
| `onerror`    | `{ type, details }` | fires when error is caught                                                 |
| `onfilter`   | `filteredItems`     | fires when `listOpen: true` and items are filtered                         |
| `onhoverItem`| `hoverItemIndex`    | fires when hoverItemIndex changes                                          |

```svelte
<Select
  onchange={(value) => console.log('Changed:', value)}
  onselect={(selection) => console.log('Selected:', selection)}
  onclear={(clearedValue) => console.log('Cleared:', clearedValue)}
/>
```


### Items

`items` can be simple arrays or collections.

```html
<script>
  import Select from 'svelte-select';

  let simple = ['one', 'two', 'three'];

  let collection = [
    { value: 1, label: 'one' },
    { value: 2, label: 'two' },
    { value: 3, label: 'three' },
  ];
</script>

<Select items={simple} />

<Select items={collection} />
```

They can also be grouped and include non-selectable items.

```html
<script>
  import Select from 'svelte-select';

  const items = [
    {value: 'chocolate', label: 'Chocolate', group: 'Sweet'},
    {value: 'pizza', label: 'Pizza', group: 'Savory'},
    {value: 'cake', label: 'Cake', group: 'Sweet', selectable: false},
    {value: 'chips', label: 'Chips', group: 'Savory'},
    {value: 'ice-cream', label: 'Ice Cream', group: 'Sweet'}
  ];

  const groupBy = (item) => item.group;
</script>

<Select {items} {groupBy} />
```

You can also use custom collections.

```html
<script>
  import Select from 'svelte-select';

  const itemId = 'id';
  const label = 'title';

  const items = [
    {id: 0, title: 'Foo'},
    {id: 1, title: 'Bar'},
  ];
</script>

<Select {itemId} {label} {items} />
```

### Async Items

To load items asynchronously then `loadOptions` is the simplest solution. Supply a function that returns a `Promise` that resolves with a list of items. `loadOptions` has debounce baked in and fires each time `filterText` is updated.

```html
<script>
  import Select from 'svelte-select';

  import { someApiCall } from './services';

  async function examplePromise(filterText) {
    // Put your async code here...
    // For example call an API using filterText as your search params
    // When your API responds resolve your Promise
    let res = await someApiCall(filterText);
    return res;
  }
</script>

<Select loadOptions={examplePromise} />
```


### Advanced List Positioning / Floating 

`svelte-select` uses [floating-ui](https://floating-ui.com/) to control the list floating. See their docs and pass in your config via the `floatingConfig` prop.

```html
<script>
  import Select from 'svelte-select';

  let floatingConfig = {
    strategy: 'fixed'
  }
</script>

<Select {floatingConfig} />
```

### Exposed methods
These internal functions are exposed to override if needed. Look through the test file (test/src/index.js) for examples.

```js
export let itemFilter = (label, filterText, option) => label.toLowerCase().includes(filterText.toLowerCase());
```

```js
export let groupBy = undefined;
```

```js
export let groupFilter = groups => groups;
```

```js
export let createGroupHeaderItem = groupValue => {
  return {
    value: groupValue,
    label: groupValue
  };
};
```

```js
export function handleClear() {
  value = undefined;
  listOpen = false;
  dispatch("clear", value);
  handleFocus();
}
```

```js
export let loadOptions = undefined; // if used must return a Promise that updates 'items'
/* Return an object with { cancelled: true } to keep the loading state as active. */
```

```js
export const getFilteredItems = () => {
  return filteredItems;
};
```

```js
export let debounce = (fn, wait = 1) => {
  clearTimeout(timeout);
  timeout = setTimeout(fn, wait);
};
```

Override core functionality at your own risk! See ([get-items.js](/src/lib/get-items.js) & [filter.js](/src/lib/filter.js))

```js
    // core replaceable methods...
    <Select 
      filter={...}
      getItems={...}
    />
```

## A11y (Accessibility)

Override these methods to change the `aria-context` and `aria-selection` text.

```js
export let ariaValues = (values) => {
  return `Option ${values}, selected.`;
}

export let ariaListOpen = (label, count) => {
  return `You are currently focused on option ${label}. There are ${count} results available.`;
}

export let ariaFocused = () => {
  return `Select is focused, type to refine list, press down to open the menu.`;
}
```

## CSS custom properties (variables)

You can style a component by overriding [the available CSS custom properties](/docs/theming_variables.md).

```html
<script>
  import Select from 'svelte-select';
</script>

<Select --border-radius= "10px" --placeholder-color="blue" />
```

You can also use the `inputStyles` prop to write in any override styles needed for the input.

```html
<script>
  import Select from 'svelte-select';

  const items = ['One', 'Two', 'Three'];
</script>

<Select {items} inputStyles="box-sizing: border-box;"></Select>
```

### 🧪 Experimental: Replace styles (Tailwind, Bootstrap, Bulma etc)
If you'd like to supply your own styles use: `import Select from 'svelte-select/no-styles/Select.svelte'`. Then somewhere in your code or build pipeline add your own. There is a tailwind stylesheet via `import 'svelte-select/tailwind.css'`. It uses `@extend` so PostCSS is required.


## License

[LIL](LICENSE)
