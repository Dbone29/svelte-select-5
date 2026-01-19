# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this codebase.

## Project Overview

This is `svelte-select-5`, a Select/autocomplete/typeahead component for **Svelte 5**. It's a fork of [svelte-select](https://github.com/rob-balfre/svelte-select) with full Svelte 5 support.

## Key Commands

```bash
# Development
npm run dev          # Start dev server

# Building
npm run build        # Build the SvelteKit app
npm run prepare      # Build the npm package (outputs to package/)

# Publishing
cd package && npm publish   # Publish to npm
```

## Architecture

### Main Component
- `src/lib/Select.svelte` - The main Select component (~750 lines)
- Uses Svelte 5 runes: `$props()`, `$bindable()`, `$state()`, `$derived()`, `$effect()`
- Floating UI for dropdown positioning via `svelte-floating-ui`

### Key Props Pattern
```svelte
let {
    selectedValue = $bindable(),  // Selected item(s) - full objects
    selectedId = $bindable(),     // Selected IDs only - can be set to update selectedValue
    items = $bindable(),          // Array of selectable items
    multiple = false,             // Multi-select mode
    // ... many more props
} = $props();
```

### Snippets (Svelte 5 slots replacement)
Slot names use camelCase (Svelte 5 requirement):
- `clearIcon`, `chevronIcon`, `loadingIcon`
- `selection`, `item`, `list`
- `prepend`, `inputHidden`, `required`

### Event Callbacks
Events use `on` prefix callback props:
- `onselect`, `onclear`, `oninput`
- `onfocus`, `onblur`, `onchange`
- `onloaded`, `onerror`, `onfilter`

## Package Structure

The npm package is built to `package/` directory:
- `svelte-package -o package` compiles `src/lib/` → `package/`
- `src/post-prepare.cjs` generates `package/package.json`
- Publish from `package/` directory

## Common Tasks

### Adding a new prop
1. Add to `$props()` destructuring in Select.svelte
2. Use `$bindable()` if two-way binding is needed
3. Update README.md props table
4. Update CHANGELOG.md

### Version bumps
1. Update `version` in `package.json`
2. Add entry to `CHANGELOG.md`
3. Commit and tag: `git tag v6.x.x`
4. Push with tags: `git push origin master --tags`

### Publishing to npm
```bash
npm run prepare                    # Build package
cd package && npm publish          # Publish
```

## Testing

Examples are in `src/routes/examples/` - use `npm run dev` to test interactively.

## Important Notes

- Svelte 5 snippets cannot have hyphenated names (use camelCase)
- `$bindable()` props without fallback values allow `bind:prop={undefined}`
- The `selectedId` prop can now be set to update `selectedValue` automatically
