<script>
    /**
     * @typedef {Object} SelectItem
     * @property {string|number} [value] - The value identifier for the item
     * @property {string} [label] - Display label (or use custom label prop)
     * @property {boolean} [selectable] - Whether the item can be selected
     * @property {boolean} [isCreator] - Whether this is a "create new" item
     * @property {string} [groupValue] - Group identifier for grouped items
     * @property {string} [groupHeader] - Group header display text
     * @property {*} [key: string] - Additional custom properties
     */

    /**
     * @typedef {SelectItem|SelectItem[]|null|undefined} SelectValue
     */

    /**
     * @typedef {Object} FloatingConfig
     * @property {'absolute'|'fixed'} [strategy] - Positioning strategy
     * @property {'bottom-start'|'bottom-end'|'top-start'|'top-end'} [placement] - Dropdown placement
     */

    /**
     * @callback ItemFilterFn
     * @param {string} label - The item's label value
     * @param {string} filterText - Current filter text
     * @param {SelectItem} item - The item being filtered
     * @returns {boolean} - Whether the item matches the filter
     */

    /**
     * @callback LoadOptionsFn
     * @param {string} filterText - Current filter text
     * @returns {Promise<SelectItem[]>} - Promise resolving to items
     */

    import { onDestroy, onMount } from 'svelte';
    import { offset, flip, shift } from 'svelte-floating-ui/dom';
    import { createFloatingActions } from 'svelte-floating-ui';

    import _filter from './filter';
    import _getItems from './get-items';

    import ChevronIcon from './ChevronIcon.svelte';
    import ClearIcon from './ClearIcon.svelte';
    import LoadingIcon from './LoadingIcon.svelte';

    // Performance: Polymorphic shallow equality comparison (faster than JSON.stringify)
    function shallowEqual(a, b) {
        if (a === b) return true;
        if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;

        // Handle arrays
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return false;
            return a.every((item, i) => shallowEqual(item, b[i]));
        }

        // Handle objects
        const keysA = Object.keys(a);
        if (keysA.length !== Object.keys(b).length) return false;
        return keysA.every(key => a[key] === b[key]);
    }

    // Props with $props() rune
    let {
        // Bindable props (two-way binding)
        // Note: Props that can be undefined don't have fallback values
        // to allow bind:prop={undefined} (Svelte 5 requirement)
        justValue = $bindable(),
        container = $bindable(),
        input = $bindable(),
        focused = $bindable(false),
        value = $bindable(),
        filterText = $bindable(''),
        items = $bindable(),
        loading = $bindable(false),
        listOpen = $bindable(false),
        hoverItemIndex = $bindable(0),

        // Read-only bindable props (output only - external changes are ignored)
        readonlyValue = $bindable(),
        readonlyId = $bindable(),

        // Function props
        filter = _filter,
        getItems = _getItems,

        // Regular props
        id = null,
        name = null,
        multiple = false,
        multiFullItemClearable = false,
        disabled = false,
        placeholder = 'Please select',
        placeholderAlwaysShow = false,
        label = 'label',
        itemFilter = (labelValue, filterTextValue, option) => `${labelValue}`.toLowerCase().includes(filterTextValue.toLowerCase()),
        groupBy = undefined,
        groupFilter = (groups) => groups,
        groupHeaderSelectable = false,
        itemId = 'value',
        loadOptions = undefined,
        containerStyles = '',
        hasError = false,
        filterSelectedItems = true,
        required = false,
        closeListOnChange = true,
        clearFilterTextOnBlur = true,
        createGroupHeaderItem = (groupValue, item) => {
            return {
                value: groupValue,
                [label]: groupValue,
            };
        },
        searchable = true,
        inputStyles = '',
        clearable = true,
        debounce = (fn, wait = 1) => {
            clearTimeout(timeout);
            timeout = setTimeout(fn, wait);
        },
        debounceWait = 300,
        hideEmptyState = false,
        inputAttributes = {},
        listAutoWidth = true,
        showChevron = false,
        listOffset = 5,
        floatingConfig = {},
        class: containerClasses = '',

        // Aria props
        ariaValues = (values) => {
            return `Option ${values}, selected.`;
        },
        ariaListOpen = (labelValue, count) => {
            return `You are currently focused on option ${labelValue}. There are ${count} results available.`;
        },
        ariaFocused = () => {
            return `Select is focused, type to refine list, press down to open the menu.`;
        },

        // Event callback props (replacing createEventDispatcher)
        onchange = undefined,
        oninput = undefined,
        onselect = undefined,
        onclear = undefined,
        onfocus = undefined,
        onblur = undefined,
        onfilter = undefined,
        onerror = undefined,
        onloaded = undefined,
        onhoverItem = undefined,

        // Snippet props (replacing slots) - using camelCase for Svelte 5 compatibility
        item: itemSnippet = undefined,
        selection: selectionSnippet = undefined,
        empty: emptySnippet = undefined,
        prepend: prependSnippet = undefined,
        listPrepend: listPrependSnippet = undefined,
        listAppend: listAppendSnippet = undefined,
        list: listSnippet = undefined,
        clearIcon: clearIconSnippet = undefined,
        multiClearIcon: multiClearIconSnippet = undefined,
        loadingIcon: loadingIconSnippet = undefined,
        chevronIcon: chevronIconSnippet = undefined,
        inputHidden: inputHiddenSnippet = undefined,
        requiredSlot: requiredSlotSnippet = undefined,
    } = $props();

    // Internal state
    let timeout;
    let activeFocusedIndex = $state(undefined);
    let previousValue = $state(undefined);
    let previousFilterText = $state(undefined);
    let previousMultiple = $state(undefined);
    let list = $state(null);
    let isScrolling = $state(false);
    let prefloat = $state(true);
    let _inputAttributes = $state({});
    let previousJustValue = $state(undefined);
    let pendingJustValue = $state(undefined);
    let previousItemsRef = $state(undefined);
    let loadRequestVersion = 0;
    let isScrollingTimer;
    let itemSelectedTimer;

    // Validated props using $derived to avoid state_referenced_locally warning
    const validatedItemId = $derived.by(() => {
        if (typeof itemId !== 'string') {
            console.warn('[svelte-select-5] itemId must be a string, using "value"');
            return 'value';
        }
        return itemId;
    });

    const validatedLabel = $derived.by(() => {
        if (typeof label !== 'string') {
            console.warn('[svelte-select-5] label must be a string, using "label"');
            return 'label';
        }
        return label;
    });

    const validatedLoadOptions = $derived.by(() => {
        if (loadOptions !== undefined && typeof loadOptions !== 'function') {
            console.warn('[svelte-select-5] loadOptions must be a function');
            return undefined;
        }
        return loadOptions;
    });

    // Floating UI config - using closure for listOffset to capture current value
    let _floatingConfig = {
        strategy: 'absolute',
        placement: 'bottom-start',
        middleware: [offset(() => listOffset), flip(), shift()],
        autoUpdate: false,
    };

    const [floatingRef, floatingContent, floatingUpdate] = createFloatingActions(_floatingConfig);

    // Exported functions
    export function getFilteredItems() {
        return filteredItems;
    }

    export function handleClear() {
        onclear?.(value);
        value = undefined;
        closeList();
        handleFocus();
    }

    // Helper functions
    function setValue() {
        if (typeof value === 'string') {
            let item = (items || []).find((item) => item[validatedItemId] === value);
            value = item || {
                [validatedItemId]: value,
                label: value,
            };
        } else if (multiple && Array.isArray(value) && value.length > 0) {
            // Only transform if there are string items that need conversion
            const hasStringItems = value.some(item => typeof item === 'string');
            if (hasStringItems) {
                value = value.map((item) => (typeof item === 'string' ? { value: item, label: item } : item));
            }
        }
    }

    function assignInputAttributes() {
        _inputAttributes = Object.assign(
            {
                autocapitalize: 'none',
                autocomplete: 'off',
                autocorrect: 'off',
                spellcheck: false,
                tabindex: 0,
                type: 'text',
                'aria-autocomplete': 'list',
            },
            inputAttributes
        );

        if (id) {
            _inputAttributes['id'] = id;
        }

        if (!searchable) {
            _inputAttributes['readonly'] = true;
        }
    }

    function convertStringItemsToObjects(_items) {
        return _items.map((item, index) => {
            return {
                index,
                value: item,
                label: `${item}`,
            };
        });
    }

    function filterGroupedItems(_items) {
        const groupValuesSet = new Set();
        const groupValues = [];
        const groups = {};

        _items.forEach((item) => {
            const groupValue = groupBy(item);

            if (!groupValuesSet.has(groupValue)) {
                groupValuesSet.add(groupValue);
                groupValues.push(groupValue);
                groups[groupValue] = [];

                if (groupValue) {
                    groups[groupValue].push(
                        Object.assign(createGroupHeaderItem(groupValue, item), {
                            id: groupValue,
                            groupHeader: true,
                            selectable: groupHeaderSelectable,
                        })
                    );
                }
            }

            groups[groupValue].push(Object.assign({ groupItem: !!groupValue }, item));
        });

        const sortedGroupedItems = [];

        groupFilter(groupValues).forEach((groupValue) => {
            if (groups[groupValue]) sortedGroupedItems.push(...groups[groupValue]);
        });

        return sortedGroupedItems;
    }

    function dispatchSelectedItem() {
        if (multiple) {
            if (!shallowEqual(value, previousValue)) {
                if (checkValueForDuplicates()) {
                    oninput?.(value);
                }
            }
            return;
        }

        if (!previousValue || value[validatedItemId] !== previousValue[validatedItemId]) {
            oninput?.(value);
        }
    }

    function syncValueToMode(isMultiple) {
        if (isMultiple && value && !Array.isArray(value)) {
            value = [value];
        } else if (!isMultiple && value) {
            value = null;
        }
    }

    function setValueIndexAsHoverIndex() {
        const valueIndex = filteredItems.findIndex((i) => {
            return i[validatedItemId] === value[validatedItemId];
        });

        checkHoverSelectable(valueIndex, true);
    }

    function dispatchHover(i) {
        onhoverItem?.(i);
    }

    function checkHoverSelectable(startingIndex = 0, ignoreGroup) {
        hoverItemIndex = startingIndex < 0 ? 0 : startingIndex;
        if (!ignoreGroup && groupBy && filteredItems[hoverItemIndex] && !filteredItems[hoverItemIndex].selectable) {
            setHoverIndex(1);
        }
    }

    function setupFilterText() {
        if (!validatedLoadOptions && filterText.length === 0) return;

        if (validatedLoadOptions) {
            debounce(async function () {
                const currentVersion = ++loadRequestVersion;
                loading = true;

                let res = await getItems({
                    dispatch: (event, data) => {
                        if (event === 'error') onerror?.(data);
                        if (event === 'loaded') onloaded?.(data);
                    },
                    loadOptions: validatedLoadOptions,
                    convertStringItemsToObjects,
                    filterText,
                });

                // Ignore stale responses from earlier requests
                if (currentVersion !== loadRequestVersion) {
                    loading = false;
                    return;
                }

                if (res) {
                    loading = res.loading;
                    listOpen = listOpen ? res.listOpen : filterText.length > 0 ? true : false;
                    focused = listOpen && res.focused;
                    items = groupBy ? filterGroupedItems(res.filteredItems) : res.filteredItems;
                } else {
                    loading = false;
                    focused = true;
                    listOpen = true;
                }
            }, debounceWait);
        } else {
            listOpen = true;

            if (multiple) {
                activeFocusedIndex = undefined;
            }
        }
    }

    function computeJustValue() {
        if (!value) return multiple ? null : undefined;
        if (multiple) {
            return value.map((item) => item?.[validatedItemId]).filter(id => id !== undefined);
        }
        const id = value[validatedItemId];
        return id !== undefined ? id : undefined;
    }

    function checkValueForDuplicates() {
        if (!value?.length) return true;

        const seen = new Set();
        const uniqueValues = [];
        let noDuplicates = true;

        for (const val of value) {
            const id = val[validatedItemId];
            if (seen.has(id)) {
                noDuplicates = false;
            } else {
                seen.add(id);
                uniqueValues.push(val);
            }
        }

        if (!noDuplicates) value = uniqueValues;
        return noDuplicates;
    }

    function findItem(selection) {
        let matchTo = selection ? selection[validatedItemId] : value[validatedItemId];
        return items.find((item) => item[validatedItemId] === matchTo);
    }

    function updateValueDisplay(items) {
        if (!items || items.length === 0 || items.some((item) => typeof item !== 'object')) return;
        if (!value || (multiple ? value.some((selection) => !selection || !selection[validatedItemId]) : !value[validatedItemId])) return;

        if (Array.isArray(value)) {
            // Check if any value needs updating - compare properties, not references
            // (Svelte 5 proxies have different identities than their targets)
            let needsUpdate = false;
            const newValue = value.map((selection) => {
                const found = findItem(selection);
                // Only update if found item has different properties (not just different reference)
                if (found && found[validatedItemId] === selection[validatedItemId]) {
                    // Same itemId - check if other properties differ using shallow comparison
                    if (!shallowEqual(found, selection)) {
                        needsUpdate = true;
                        return found;
                    }
                }
                return selection;
            });
            if (needsUpdate) {
                value = newValue;
            }
        } else {
            const found = findItem();
            // Only update if found item has different properties
            if (found && found[validatedItemId] === value[validatedItemId]) {
                if (!shallowEqual(found, value)) {
                    value = found;
                }
            }
        }
    }

    async function handleMultiItemClear(i) {
        const itemToRemove = value[i];

        if (value.length === 1) {
            value = undefined;
        } else {
            value = value.filter((item) => {
                return item !== itemToRemove;
            });
        }

        onclear?.(itemToRemove);
    }

    function handleKeyDown(e) {
        if (!focused) return;
        e.stopPropagation();
        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                closeList();
                break;
            case 'Enter':
                e.preventDefault();

                if (listOpen) {
                    if (filteredItems.length === 0) break;
                    const hoverItem = filteredItems[hoverItemIndex];
                    if (!hoverItem) break;

                    if (value && !multiple && value[validatedItemId] === hoverItem[validatedItemId]) {
                        closeList();
                        break;
                    } else {
                        handleSelect(hoverItem);
                    }
                }

                break;
            case 'ArrowDown':
                e.preventDefault();

                if (listOpen) {
                    setHoverIndex(1);
                } else {
                    listOpen = true;
                    activeFocusedIndex = undefined;
                }

                break;
            case 'ArrowUp':
                e.preventDefault();

                if (listOpen) {
                    setHoverIndex(-1);
                } else {
                    listOpen = true;
                    activeFocusedIndex = undefined;
                }

                break;
            case 'Tab':
                if (listOpen && focused) {
                    if (
                        filteredItems.length === 0 ||
                        (value && value[validatedItemId] === filteredItems[hoverItemIndex][validatedItemId])
                    )
                        return closeList();

                    e.preventDefault();
                    handleSelect(filteredItems[hoverItemIndex]);
                    closeList();
                }

                break;
            case 'Backspace':
                if (!multiple || filterText.length > 0) return;

                if (multiple && value && value.length > 0) {
                    handleMultiItemClear(activeFocusedIndex !== undefined ? activeFocusedIndex : value.length - 1);
                    if (activeFocusedIndex === 0 || activeFocusedIndex === undefined) break;
                    activeFocusedIndex = value.length > activeFocusedIndex ? activeFocusedIndex - 1 : undefined;
                }

                break;
            case 'ArrowLeft':
                if (!value || !multiple || filterText.length > 0) return;
                if (activeFocusedIndex === undefined) {
                    activeFocusedIndex = value.length - 1;
                } else if (value.length > activeFocusedIndex && activeFocusedIndex !== 0) {
                    activeFocusedIndex -= 1;
                }
                break;
            case 'ArrowRight':
                if (!value || !multiple || filterText.length > 0 || activeFocusedIndex === undefined) return;
                if (activeFocusedIndex === value.length - 1) {
                    activeFocusedIndex = undefined;
                } else if (activeFocusedIndex < value.length - 1) {
                    activeFocusedIndex += 1;
                }
                break;
        }
    }

    function handleFocus(e) {
        if (focused && input === document?.activeElement) return;
        if (e) onfocus?.(e);
        input?.focus();
        focused = true;
    }

    async function handleBlur(e) {
        if (isScrolling) return;
        if (listOpen || focused) {
            onblur?.(e);
            closeList();
            focused = false;
            activeFocusedIndex = undefined;
            input?.blur();
        }
    }

    function handleClick() {
        if (disabled) return;
        if (filterText.length > 0) return listOpen = true;
        listOpen = !listOpen;
    }

    function itemSelected(selection) {
        if (selection) {
            filterText = '';
            const item = Object.assign({}, selection);

            if (item.groupHeader && !item.selectable) return;
            value = multiple ? (value ? value.concat([item]) : [item]) : (value = item);

            itemSelectedTimer = setTimeout(() => {
                if (closeListOnChange) closeList();
                activeFocusedIndex = undefined;
                onchange?.(value);
                onselect?.(selection);
            });
        }
    }

    function closeList() {
        if (clearFilterTextOnBlur) {
            filterText = '';
        }
        listOpen = false;
    }

    function handleAriaSelection(_multiple) {
        let selected = undefined;

        if (_multiple && value.length > 0) {
            selected = value.map((v) => v[validatedLabel]).join(', ');
        } else {
            selected = value[validatedLabel];
        }

        return ariaValues(selected);
    }

    function handleAriaContent() {
        if (!filteredItems || filteredItems.length === 0) return '';
        let _item = filteredItems[hoverItemIndex];
        if (listOpen && _item) {
            let count = filteredItems ? filteredItems.length : 0;
            return ariaListOpen(_item[validatedLabel], count);
        } else {
            return ariaFocused();
        }
    }

    function handleListScroll() {
        clearTimeout(isScrollingTimer);
        isScrollingTimer = setTimeout(() => {
            isScrolling = false;
        }, 100);
    }

    function handleClickOutside(event) {
        if (!listOpen && !focused && container && !container.contains(event.target) && !list?.contains(event.target)) {
            handleBlur();
        }
    }

    function handleSelect(item) {
        if (!item || item.selectable === false) return;
        itemSelected(item);
    }

    function handleHover(i) {
        if (isScrolling) return;
        hoverItemIndex = i;
    }

    function handleItemClick(args) {
        const { item, i } = args;
        if (item?.selectable === false) return;
        if (value && !multiple && value[validatedItemId] === item[validatedItemId]) return closeList();
        if (isItemSelectable(item)) {
            hoverItemIndex = i;
            handleSelect(item);
        }
    }

    function setHoverIndex(increment) {
        let selectableFilteredItems = filteredItems.filter(
            (item) => !Object.hasOwn(item, 'selectable') || item.selectable === true
        );

        if (selectableFilteredItems.length === 0) {
            return (hoverItemIndex = 0);
        }

        // Use loop instead of recursion to prevent stack overflow with many non-selectable items
        const maxIterations = filteredItems.length;
        let iterations = 0;

        while (iterations < maxIterations) {
            if (increment > 0 && hoverItemIndex === filteredItems.length - 1) {
                hoverItemIndex = 0;
            } else if (increment < 0 && hoverItemIndex === 0) {
                hoverItemIndex = filteredItems.length - 1;
            } else {
                hoverItemIndex = hoverItemIndex + increment;
            }

            const hover = filteredItems[hoverItemIndex];

            // Found a selectable item - done
            if (!hover || hover.selectable !== false) {
                return;
            }

            // Only continue for single-step increments
            if (increment !== 1 && increment !== -1) {
                return;
            }

            iterations++;
        }
    }

    function isItemActive(item, value, itemId) {
        if (multiple) return;
        return value && value[itemId] === item[itemId];
    }

    function isItemSelectable(item) {
        return (item.groupHeader && item.selectable) || item.selectable || !item.hasOwnProperty('selectable');
    }

    function scrollAction(node) {
        return {
            update(args) {
                if (args.scroll) {
                    handleListScroll();
                    node.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                }
            },
        };
    }

    function setListWidth() {
        const { width } = container.getBoundingClientRect();
        list.style.width = listAutoWidth ? width + 'px' : 'auto';
    }

    function listMounted(list, listOpen) {
        if (!list || !listOpen) return (prefloat = true);
        setTimeout(() => {
            prefloat = false;
        }, 0);
    }

    function handleFilterEvent(items) {
        if (listOpen) onfilter?.(items);
    }

    // Derived values - order matters! filteredItems must come before ariaContext
    let filteredItems = $derived(filter({
        loadOptions: validatedLoadOptions,
        filterText,
        items,
        multiple,
        value,
        itemId: validatedItemId,
        groupBy,
        label: validatedLabel,
        filterSelectedItems,
        itemFilter,
        convertStringItemsToObjects,
        filterGroupedItems,
    }));
    let hasValue = $derived(multiple ? value && value.length > 0 : value);
    let hideSelectedItem = $derived(hasValue && filterText.length > 0);
    let showClear = $derived(hasValue && clearable && !disabled && !loading);
    function getPlaceholderText() {
        if (placeholderAlwaysShow && multiple) return placeholder;
        if (multiple && !value?.length) return placeholder;
        return value ? '' : placeholder;
    }
    let placeholderText = $derived(getPlaceholderText());
    let ariaSelection = $derived(value ? handleAriaSelection(multiple) : '');
    let ariaContext = $derived(handleAriaContent());
    let isListRendered = $derived(!!list);
    let scrollToHoverItem = $derived(hoverItemIndex);

    // Effects (side effects replacing reactive statements)
    $effect.pre(() => {
        previousValue = value;
        previousFilterText = filterText;
        previousMultiple = multiple;
    });

    $effect(() => {
        if (items !== undefined || value !== undefined) setValue();
    });

    $effect(() => {
        if (inputAttributes || !searchable) assignInputAttributes();
    });

    // Consolidated: Multiple-mode effects
    $effect(() => {
        if (multiple) {
            syncValueToMode(true);
            if (value && value.length > 1) checkValueForDuplicates();
        } else if (previousMultiple) {
            syncValueToMode(false);
        }
    });

    // Consolidated: Value change effects
    $effect(() => {
        if (value) {
            dispatchSelectedItem();
        } else if (previousValue) {
            oninput?.(value);
        }
    });

    $effect(() => {
        if (!focused && input) closeList();
    });

    $effect(() => {
        if (filterText !== previousFilterText) setupFilterText();
    });

    $effect(() => {
        if (!multiple && listOpen && value && filteredItems) setValueIndexAsHoverIndex();
    });

    // Only run updateValueDisplay when items content actually changes (not just reference)
    // This prevents loops when parent components create new array references on each render
    $effect(() => {
        if (items !== previousItemsRef) {
            // Use $state.snapshot() to compare plain objects, avoiding proxy identity issues
            const itemsSnapshot = items ? $state.snapshot(items) : items;
            const prevSnapshot = previousItemsRef ? $state.snapshot(previousItemsRef) : previousItemsRef;
            if (!shallowEqual(itemsSnapshot, prevSnapshot)) {
                updateValueDisplay(items);
            }
            previousItemsRef = items;
        }
    });

    $effect(() => {
        justValue = computeJustValue();
    });

    // Helper function to resolve justValue to value
    function resolveJustValue(jv) {
        if (multiple) {
            value = jv ? items.filter(item => jv.includes(item[validatedItemId])) : null;
        } else {
            value = jv != null ? items.find(item => item[validatedItemId] === jv) ?? null : null;
        }
    }

    // Handle external changes to justValue (allows setting value via justValue)
    // Also handles case where justValue is set before items are loaded
    $effect(() => {
        const computed = computeJustValue();
        // Compare justValue with computed - handles arrays (multiple) and primitives (single)
        const valuesMatch = Array.isArray(justValue) && Array.isArray(computed)
            ? justValue.length === computed.length && justValue.every((v, i) => v === computed[i])
            : justValue === computed;
        const isExternalChange = justValue !== previousJustValue && !valuesMatch;

        if (isExternalChange) {
            if (!items) {
                // Items not loaded yet - save for later
                pendingJustValue = justValue;
            } else {
                // Items available - resolve immediately
                resolveJustValue(justValue);
                pendingJustValue = undefined;
            }
        }

        // When items load and we have a pending justValue, resolve it
        if (items && pendingJustValue !== undefined && !value) {
            resolveJustValue(pendingJustValue);
            pendingJustValue = undefined;
        }

        previousJustValue = justValue;
    });

    // Read-only props - always reflect current state, external changes are ignored
    // Using $effect.pre to update before DOM render for better synchronization
    $effect.pre(() => {
        readonlyValue = value;
        readonlyId = computeJustValue();
    });

    $effect(() => {
        if (listOpen && filteredItems && !multiple && !value) checkHoverSelectable();
    });

    $effect(() => {
        handleFilterEvent(filteredItems);
    });

    $effect(() => {
        if (container && floatingConfig) floatingUpdate(Object.assign(_floatingConfig, floatingConfig));
    });

    // Consolidated: List open effects
    $effect(() => {
        listMounted(list, listOpen);
        if (listOpen) {
            if (container && list) setListWidth();
            if (input && !focused) handleFocus();
        }
    });

    // Consolidated: hoverItemIndex effects
    $effect(() => {
        if (filterText || (listOpen && multiple)) hoverItemIndex = 0;
        dispatchHover(hoverItemIndex);
    });

    // Lifecycle
    onMount(() => {
        if (listOpen) focused = true;
        if (focused && input) input.focus();
    });

    onDestroy(() => {
        clearTimeout(timeout);
        clearTimeout(isScrollingTimer);
        clearTimeout(itemSelectedTimer);
        list?.remove();
    });
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeyDown} />

<div
    class="svelte-select {containerClasses}"
    class:multi={multiple}
    class:disabled
    class:focused
    class:list-open={listOpen}
    class:show-chevron={showChevron}
    class:error={hasError}
    style={containerStyles}
    onpointerup={(e) => { e.preventDefault(); handleClick(); }}
    bind:this={container}
    use:floatingRef
    role="none">
    {#if listOpen}
        <div
            use:floatingContent
            bind:this={list}
            class="svelte-select-list"
            class:prefloat
            onscroll={handleListScroll}
            onpointerup={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onmousedown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            role="none">
            {#if listPrependSnippet}{@render listPrependSnippet()}{/if}
            {#if listSnippet}
                {@render listSnippet({ filteredItems })}
            {:else if filteredItems.length > 0}
                {#each filteredItems as item, i}
                    <div
                        onmouseover={() => handleHover(i)}
                        onfocus={() => handleHover(i)}
                        onclick={(e) => { e.stopPropagation(); handleItemClick({ item, i }); }}
                        onkeydown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        class="list-item"
                        tabindex="-1"
                        role="none">
                        <div
                            use:scrollAction={{ scroll: isItemActive(item, value, validatedItemId) || scrollToHoverItem === i, isListRendered }}
                            class="item"
                            class:list-group-title={item.groupHeader}
                            class:active={isItemActive(item, value, validatedItemId)}
                            class:first={i === 0}
                            class:hover={hoverItemIndex === i}
                            class:group-item={item.groupItem}
                            class:not-selectable={item?.selectable === false}>
                            {#if itemSnippet}
                                {@render itemSnippet({ item, index: i })}
                            {:else}
                                {item?.[validatedLabel]}
                            {/if}
                        </div>
                    </div>
                {/each}
            {:else if !hideEmptyState}
                {#if emptySnippet}
                    {@render emptySnippet()}
                {:else}
                    <div class="empty">No options</div>
                {/if}
            {/if}
            {#if listAppendSnippet}{@render listAppendSnippet()}{/if}
        </div>
    {/if}

    <span aria-live="polite" aria-atomic="false" aria-relevant="additions text" class="a11y-text">
        {#if focused}
            <span id="aria-selection">{ariaSelection}</span>
            <span id="aria-context">
                {ariaContext}
            </span>
        {/if}
    </span>

    <div class="prepend">
        {#if prependSnippet}
            {@render prependSnippet()}
        {/if}
    </div>

    <div class="value-container">
        {#if hasValue}
            {#if multiple}
                {#each value as item, i}
                    <div
                        class="multi-item"
                        class:active={activeFocusedIndex === i}
                        class:disabled
                        onclick={(e) => { e.preventDefault(); if (multiFullItemClearable) handleMultiItemClear(i); }}
                        onkeydown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        role="none">
                        <span class="multi-item-text">
                            {#if selectionSnippet}
                                {@render selectionSnippet({ selection: item, index: i })}
                            {:else}
                                {item[validatedLabel]}
                            {/if}
                        </span>

                        {#if !disabled && !multiFullItemClearable && ClearIcon}
                            <div
                                class="multi-item-clear"
                                onpointerup={(e) => { e.preventDefault(); e.stopPropagation(); handleMultiItemClear(i); }}>
                                {#if multiClearIconSnippet}
                                    {@render multiClearIconSnippet()}
                                {:else}
                                    <ClearIcon />
                                {/if}
                            </div>
                        {/if}
                    </div>
                {/each}
            {:else}
                <div class="selected-item" class:hide-selected-item={hideSelectedItem}>
                    {#if selectionSnippet}
                        {@render selectionSnippet({ selection: value })}
                    {:else}
                        {value[validatedLabel]}
                    {/if}
                </div>
            {/if}
        {/if}

        <input
            onkeydown={handleKeyDown}
            onblur={handleBlur}
            onfocus={handleFocus}
            readonly={!searchable}
            {..._inputAttributes}
            bind:this={input}
            bind:value={filterText}
            placeholder={placeholderText}
            style={inputStyles}
            {disabled} />
    </div>

    <div class="indicators">
        {#if loading}
            <div class="icon loading" aria-hidden="true">
                {#if loadingIconSnippet}
                    {@render loadingIconSnippet()}
                {:else}
                    <LoadingIcon />
                {/if}
            </div>
        {/if}

        {#if showClear}
            <button type="button" class="icon clear-select" onclick={handleClear}>
                {#if clearIconSnippet}
                    {@render clearIconSnippet()}
                {:else}
                    <ClearIcon />
                {/if}
            </button>
        {/if}

        {#if showChevron}
            <div class="icon chevron" aria-hidden="true">
                {#if chevronIconSnippet}
                    {@render chevronIconSnippet({ listOpen })}
                {:else}
                    <ChevronIcon />
                {/if}
            </div>
        {/if}
    </div>

    {#if inputHiddenSnippet}
        {@render inputHiddenSnippet({ value })}
    {:else}
        <input {name} type="hidden" value={value ? JSON.stringify(value) : null} />
    {/if}

    {#if required && (!value || value.length === 0)}
        {#if requiredSlotSnippet}
            {@render requiredSlotSnippet({ value })}
        {:else}
            <select class="required" required tabindex="-1" aria-hidden="true"></select>
        {/if}
    {/if}
</div>

<style>
    .svelte-select {
        /* deprecating camelCase custom props in favour of kebab-case for v5 */
        --borderRadius: var(--border-radius);
        --clearSelectColor: var(--clear-select-color);
        --clearSelectWidth: var(--clear-select-width);
        --disabledBackground: var(--disabled-background);
        --disabledBorderColor: var(--disabled-border-color);
        --disabledColor: var(--disabled-color);
        --disabledPlaceholderColor: var(--disabled-placeholder-color);
        --disabledPlaceholderOpacity: var(--disabled-placeholder-opacity);
        --errorBackground: var(--error-background);
        --errorBorder: var(--error-border);
        --groupItemPaddingLeft: var(--group-item-padding-left);
        --groupTitleColor: var(--group-title-color);
        --groupTitleFontSize: var(--group-title-font-size);
        --groupTitleFontWeight: var(--group-title-font-weight);
        --groupTitlePadding: var(--group-title-padding);
        --groupTitleTextTransform: var(--group-title-text-transform);
        --groupTitleBorderColor: var(--group-title-border-color);
        --groupTitleBorderWidth: var(--group-title-border-width);
        --groupTitleBorderStyle: var(--group-title-border-style);
        --indicatorColor: var(--chevron-color);
        --indicatorHeight: var(--chevron-height);
        --indicatorWidth: var(--chevron-width);
        --inputColor: var(--input-color);
        --inputLeft: var(--input-left);
        --inputLetterSpacing: var(--input-letter-spacing);
        --inputMargin: var(--input-margin);
        --inputPadding: var(--input-padding);
        --itemActiveBackground: var(--item-active-background);
        --itemColor: var(--item-color);
        --itemFirstBorderRadius: var(--item-first-border-radius);
        --itemHoverBG: var(--item-hover-bg);
        --itemHoverColor: var(--item-hover-color);
        --itemIsActiveBG: var(--item-is-active-bg);
        --itemIsActiveColor: var(--item-is-active-color);
        --itemIsNotSelectableColor: var(--item-is-not-selectable-color);
        --itemPadding: var(--item-padding);
        --listBackground: var(--list-background);
        --listBorder: var(--list-border);
        --listBorderRadius: var(--list-border-radius);
        --listEmptyColor: var(--list-empty-color);
        --listEmptyPadding: var(--list-empty-padding);
        --listEmptyTextAlign: var(--list-empty-text-align);
        --listMaxHeight: var(--list-max-height);
        --listPosition: var(--list-position);
        --listShadow: var(--list-shadow);
        --listZIndex: var(--list-z-index);
        --multiItemBG: var(--multi-item-bg);
        --multiItemBorderRadius: var(--multi-item-border-radius);
        --multiItemDisabledHoverBg: var(--multi-item-disabled-hover-bg);
        --multiItemDisabledHoverColor: var(--multi-item-disabled-hover-color);
        --multiItemHeight: var(--multi-item-height);
        --multiItemMargin: var(--multi-item-margin);
        --multiItemPadding: var(--multi-item-padding);
        --multiSelectInputMargin: var(--multi-select-input-margin);
        --multiSelectInputPadding: var(--multi-select-input-padding);
        --multiSelectPadding: var(--multi-select-padding);
        --placeholderColor: var(--placeholder-color);
        --placeholderOpacity: var(--placeholder-opacity);
        --selectedItemPadding: var(--selected-item-padding);
        --spinnerColor: var(--spinner-color);
        --spinnerHeight: var(--spinner-height);
        --spinnerWidth: var(--spinner-width);

        --internal-padding: 0 0 0 16px;

        border: var(--border, 1px solid #d8dbdf);
        border-radius: var(--border-radius, 6px);
        min-height: var(--height, 42px);
        position: relative;
        display: flex;
        align-items: stretch;
        padding: var(--padding, var(--internal-padding));
        background: var(--background, #fff);
        margin: var(--margin, 0);
        width: var(--width, 100%);
        font-size: var(--font-size, 16px);
        max-height: var(--max-height);
    }

    * {
        box-sizing: var(--box-sizing, border-box);
    }

    .svelte-select:hover {
        border: var(--border-hover, 1px solid #b2b8bf);
    }

    .value-container {
        display: flex;
        flex: 1 1 0%;
        flex-wrap: wrap;
        align-items: center;
        gap: 5px 10px;
        padding: var(--value-container-padding, 5px 0);
        position: relative;
        overflow: var(--value-container-overflow, hidden);
        align-self: stretch;
    }

    .prepend,
    .indicators {
        display: flex;
        flex-shrink: 0;
        align-items: center;
    }

    .indicators {
        position: var(--indicators-position);
        top: var(--indicators-top);
        right: var(--indicators-right);
        bottom: var(--indicators-bottom);
    }

    input {
        position: absolute;
        cursor: default;
        border: none;
        color: var(--input-color, var(--item-color));
        padding: var(--input-padding, 0);
        letter-spacing: var(--input-letter-spacing, inherit);
        margin: var(--input-margin, 0);
        min-width: 10px;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        background: transparent;
        font-size: var(--font-size, 16px);
    }

    :not(.multi) > .value-container > input {
        width: 100%;
        height: 100%;
    }

    input::placeholder {
        color: var(--placeholder-color, #78848f);
        opacity: var(--placeholder-opacity, 1);
    }

    input:focus {
        outline: none;
    }

    .svelte-select.focused {
        border: var(--border-focused, 1px solid #006fe8);
        border-radius: var(--border-radius-focused, var(--border-radius, 6px));
    }

    .disabled {
        background: var(--disabled-background, #ebedef);
        border-color: var(--disabled-border-color, #ebedef);
        color: var(--disabled-color, #c1c6cc);
    }

    .disabled input::placeholder {
        color: var(--disabled-placeholder-color, #c1c6cc);
        opacity: var(--disabled-placeholder-opacity, 1);
    }

    .selected-item {
        position: relative;
        overflow: var(--selected-item-overflow, hidden);
        padding: var(--selected-item-padding, 0 20px 0 0);
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--selected-item-color, inherit);
        font-size: var(--font-size, 16px);
    }

    .multi .selected-item {
        position: absolute;
        line-height: var(--height, 42px);
        height: var(--height, 42px);
    }

    .selected-item:focus {
        outline: none;
    }

    .hide-selected-item {
        opacity: 0;
    }

    .icon {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .clear-select {
        all: unset;
        display: flex;
        align-items: center;
        justify-content: center;
        width: var(--clear-select-width, 40px);
        height: var(--clear-select-height, 100%);
        color: var(--clear-select-color, var(--icons-color));
        margin: var(--clear-select-margin, 0);
        pointer-events: all;
        flex-shrink: 0;
    }

    .clear-select:focus {
        outline: var(--clear-select-focus-outline, 1px solid #006fe8);
    }

    .loading {
        width: var(--loading-width, 40px);
        height: var(--loading-height);
        color: var(--loading-color, var(--icons-color));
        margin: var(--loading--margin, 0);
        flex-shrink: 0;
    }

    .chevron {
        width: var(--chevron-width, 40px);
        height: var(--chevron-height, 40px);
        background: var(--chevron-background, transparent);
        pointer-events: var(--chevron-pointer-events, none);
        color: var(--chevron-color, var(--icons-color));
        border: var(--chevron-border, 0 0 0 1px solid #d8dbdf);
        flex-shrink: 0;
    }

    .multi {
        padding: var(--multi-select-padding, var(--internal-padding));
    }

    .multi input {
        padding: var(--multi-select-input-padding, 0);
        position: relative;
        margin: var(--multi-select-input-margin, 5px 0);
        flex: 1 1 40px;
    }

    .svelte-select.error {
        border: var(--error-border, 1px solid #ff2d55);
        background: var(--error-background, #fff);
    }

    .a11y-text {
        z-index: 9999;
        border: 0px;
        clip: rect(1px, 1px, 1px, 1px);
        height: 1px;
        width: 1px;
        position: absolute;
        overflow: hidden;
        padding: 0px;
        white-space: nowrap;
    }

    .multi-item {
        background: var(--multi-item-bg, #ebedef);
        margin: var(--multi-item-margin, 0);
        outline: var(--multi-item-outline, 1px solid #ddd);
        border-radius: var(--multi-item-border-radius, 4px);
        height: var(--multi-item-height, 25px);
        line-height: var(--multi-item-height, 25px);
        display: flex;
        cursor: default;
        padding: var(--multi-item-padding, 0 5px);
        overflow: hidden;
        gap: var(--multi-item-gap, 4px);
        outline-offset: -1px;
        max-width: var(--multi-max-width, none);
        color: var(--multi-item-color, var(--item-color));
    }

    .multi-item.disabled:hover {
        background: var(--multi-item-disabled-hover-bg, #ebedef);
        color: var(--multi-item-disabled-hover-color, #c1c6cc);
    }

    .multi-item-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .multi-item-clear {
        display: flex;
        align-items: center;
        justify-content: center;
        --clear-icon-color: var(--multi-item-clear-icon-color, #000);
    }

    .multi-item.active {
        outline: var(--multi-item-active-outline, 1px solid #006fe8);
    }

    .svelte-select-list {
        box-shadow: var(--list-shadow, 0 2px 3px 0 rgba(44, 62, 80, 0.24));
        border-radius: var(--list-border-radius, 4px);
        max-height: var(--list-max-height, 252px);
        overflow-y: auto;
        background: var(--list-background, #fff);
        position: var(--list-position, absolute);
        z-index: var(--list-z-index, 2);
        border: var(--list-border);
    }

    .prefloat {
        opacity: 0;
        pointer-events: none;
    }

    .list-group-title {
        color: var(--group-title-color, #8f8f8f);
        cursor: default;
        font-size: var(--group-title-font-size, 16px);
        font-weight: var(--group-title-font-weight, 600);
        height: var(--height, 42px);
        line-height: var(--height, 42px);
        padding: var(--group-title-padding, 0 20px);
        text-overflow: ellipsis;
        overflow-x: hidden;
        white-space: nowrap;
        text-transform: var(--group-title-text-transform, uppercase);
        border-width: var(--group-title-border-width, medium);
        border-style: var(--group-title-border-style, none);
        border-color: var(--group-title-border-color, color);
    }

    .empty {
        text-align: var(--list-empty-text-align, center);
        padding: var(--list-empty-padding, 20px 0);
        color: var(--list-empty-color, #78848f);
    }

    .item {
        cursor: default;
        height: var(--item-height, var(--height, 42px));
        line-height: var(--item-line-height, var(--height, 42px));
        padding: var(--item-padding, 0 20px);
        color: var(--item-color, inherit);
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        transition: var(--item-transition, all 0.2s);
        align-items: center;
        width: 100%;
    }

    .item.group-item {
        padding-left: var(--group-item-padding-left, 40px);
    }

    .item:active {
        background: var(--item-active-background, #b9daff);
    }

    .item.active {
        background: var(--item-is-active-bg, #007aff);
        color: var(--item-is-active-color, #fff);
    }

    .item.first {
        border-radius: var(--item-first-border-radius, 4px 4px 0 0);
    }

    .item.hover:not(.active) {
        background: var(--item-hover-bg, #e7f2ff);
        color: var(--item-hover-color, inherit);
    }

    .item.not-selectable,
    .item.hover.item.not-selectable,
    .item.active.item.not-selectable,
    .item.not-selectable:active {
        color: var(--item-is-not-selectable-color, #999);
        background: transparent;
    }

    .required {
        opacity: 0;
        z-index: -1;
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
    }
</style>
