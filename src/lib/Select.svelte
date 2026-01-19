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
        selectedId = $bindable(),
        startId = undefined,  // One-time initialization of selectedId
        container = $bindable(),
        input = $bindable(),
        focused = $bindable(false),
        selectedValue = $bindable(),
        filterText = $bindable(''),
        items = $bindable(),
        loading = $bindable(false),
        listOpen = $bindable(false),
        hoverItemIndex = $bindable(0),

        // Read-only bindable props (output only - external changes are ignored)
        readOnlySelectedValue = $bindable(),
        readOnlySelectedId = $bindable(),

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
        ariaValues = (selectedValues) => {
            return `Option ${selectedValues}, selected.`;
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
    let previousSelectedValue = $state(undefined);
    let previousFilterText = $state(undefined);
    let previousMultiple = $state(undefined);
    let list = $state(null);
    let isScrolling = $state(false);
    let prefloat = $state(true);
    let computedInputAttributes = $state({});
    let previousSelectedId = $state(undefined);
    let pendingSelectedId = $state(undefined);
    let previousItemsRef = $state(undefined);
    let loadRequestVersion = 0;
    let isScrollingTimer;
    let itemSelectedTimer;
    let startIdApplied = $state(false);

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
    let internalFloatingConfig = {
        strategy: 'absolute',
        placement: 'bottom-start',
        middleware: [offset(() => listOffset), flip(), shift()],
        autoUpdate: false,
    };

    const [floatingRef, floatingContent, floatingUpdate] = createFloatingActions(internalFloatingConfig);

    // Exported functions
    export function getFilteredItems() {
        return filteredItems;
    }

    export function handleClear() {
        onclear?.(selectedValue);
        selectedValue = undefined;
        closeList();
        handleFocus();
    }

    // Helper functions
    function setValue() {
        if (typeof selectedValue === 'string') {
            let item = (items || []).find((item) => item[validatedItemId] === selectedValue);
            selectedValue = item || {
                [validatedItemId]: selectedValue,
                label: selectedValue,
            };
        } else if (multiple && Array.isArray(selectedValue) && selectedValue.length > 0) {
            // Only transform if there are string items that need conversion
            const hasStringItems = selectedValue.some(item => typeof item === 'string');
            if (hasStringItems) {
                selectedValue = selectedValue.map((item) => (typeof item === 'string' ? { value: item, label: item } : item));
            }
        }
    }

    function assignInputAttributes() {
        computedInputAttributes = Object.assign(
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
            computedInputAttributes['id'] = id;
        }

        if (!searchable) {
            computedInputAttributes['readonly'] = true;
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
            if (!shallowEqual(selectedValue, previousSelectedValue)) {
                if (checkValueForDuplicates()) {
                    oninput?.(selectedValue);
                }
            }
            return;
        }

        if (!previousSelectedValue || !selectedValue || selectedValue[validatedItemId] !== previousSelectedValue[validatedItemId]) {
            oninput?.(selectedValue);
        }
    }

    function syncValueToMode(isMultiple) {
        if (isMultiple && selectedValue && !Array.isArray(selectedValue)) {
            selectedValue = [selectedValue];
        } else if (!isMultiple && Array.isArray(selectedValue)) {
            selectedValue = selectedValue.length > 0 ? selectedValue[0] : undefined;
        }
    }

    function setValueIndexAsHoverIndex() {
        if (!selectedValue) return;
        const valueIndex = filteredItems.findIndex((item) => {
            return item[validatedItemId] === selectedValue[validatedItemId];
        });

        checkHoverSelectable(selectedValueIndex, true);
    }

    function dispatchHover(itemIndex) {
        onhoverItem?.(itemIndex);
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

                // Ignore stale responses from earlier requests - don't modify any state
                if (currentVersion !== loadRequestVersion) {
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

    function computeSelectedId() {
        if (!selectedValue) return multiple ? [] : undefined;
        if (multiple) {
            return selectedValue.map((item) => item?.[validatedItemId]).filter(id => id !== undefined);
        }
        return selectedValue[validatedItemId];
    }

    function checkValueForDuplicates() {
        if (!selectedValue?.length) return true;

        const seen = new Set();
        const uniqueValues = [];
        let noDuplicates = true;

        for (const val of selectedValue) {
            const id = val[validatedItemId];
            if (seen.has(id)) {
                noDuplicates = false;
            } else {
                seen.add(id);
                uniqueValues.push(val);
            }
        }

        if (!noDuplicates) selectedValue = uniqueValues;
        return noDuplicates;
    }

    function findItem(selection) {
        if (!items) return undefined;
        const matchTo = selection?.[validatedItemId] ?? selectedValue?.[validatedItemId];
        if (matchTo === undefined) return undefined;
        return items.find((item) => item[validatedItemId] === matchTo);
    }

    function updateValueDisplay(items) {
        if (!items || items.length === 0 || items.some((item) => !item || typeof item !== 'object')) return;
        if (!selectedValue || (multiple ? selectedValue.some((selection) => !selection || !selection[validatedItemId]) : !selectedValue[validatedItemId])) return;

        if (Array.isArray(selectedValue)) {
            // Check if any value needs updating - compare properties, not references
            // (Svelte 5 proxies have different identities than their targets)
            let needsUpdate = false;
            const newValue = selectedValue.map((selection) => {
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
                selectedValue = newValue;
            }
        } else {
            const found = findItem();
            // Only update if found item has different properties
            if (found && found[validatedItemId] === selectedValue[validatedItemId]) {
                if (!shallowEqual(found, selectedValue)) {
                    selectedValue = found;
                }
            }
        }
    }

    function handleMultiItemClear(itemIndex) {
        if (!selectedValue || !Array.isArray(selectedValue) || itemIndex < 0 || itemIndex >= selectedValue.length) {
            return;
        }
        const itemToRemove = selectedValue[itemIndex];

        if (selectedValue.length === 1) {
            selectedValue = undefined;
        } else {
            selectedValue = selectedValue.filter((item) => {
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

                    if (selectedValue && !multiple && selectedValue[validatedItemId] === hoverItem[validatedItemId]) {
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
                    const hoverItem = filteredItems[hoverItemIndex];
                    if (
                        filteredItems.length === 0 ||
                        !hoverItem ||
                        (selectedValue && selectedValue[validatedItemId] === hoverItem[validatedItemId])
                    )
                        return closeList();

                    e.preventDefault();
                    handleSelect(hoverItem);
                    closeList();
                }

                break;
            case 'Backspace':
                if (!multiple || filterText.length > 0) return;

                if (multiple && selectedValue && selectedValue.length > 0) {
                    handleMultiItemClear(activeFocusedIndex !== undefined ? activeFocusedIndex : selectedValue.length - 1);
                    if (activeFocusedIndex === 0 || activeFocusedIndex === undefined) break;
                    activeFocusedIndex = selectedValue.length > activeFocusedIndex ? activeFocusedIndex - 1 : undefined;
                }

                break;
            case 'ArrowLeft':
                if (!selectedValue || !multiple || filterText.length > 0) return;
                if (activeFocusedIndex === undefined) {
                    activeFocusedIndex = selectedValue.length - 1;
                } else if (selectedValue.length > activeFocusedIndex && activeFocusedIndex !== 0) {
                    activeFocusedIndex -= 1;
                }
                break;
            case 'ArrowRight':
                if (!selectedValue || !multiple || filterText.length > 0 || activeFocusedIndex === undefined) return;
                if (activeFocusedIndex === selectedValue.length - 1) {
                    activeFocusedIndex = undefined;
                } else if (activeFocusedIndex < selectedValue.length - 1) {
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

    function handleBlur(e) {
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

            if (multiple) {
                selectedValue = selectedValue ? [...selectedValue, item] : [item];
            } else {
                selectedValue = item;
            }

            clearTimeout(itemSelectedTimer);
            itemSelectedTimer = setTimeout(() => {
                if (closeListOnChange) closeList();
                activeFocusedIndex = undefined;
                onchange?.(selectedValue);
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
        if (_multiple && selectedValue && Array.isArray(selectedValue) && selectedValue.length > 0) {
            return ariaValues(selectedValue.map((v) => v[validatedLabel]).join(', '));
        } else if (!_multiple && selectedValue) {
            return ariaValues(selectedValue[validatedLabel]);
        }
        return '';
    }

    function handleAriaContent() {
        if (!filteredItems || filteredItems.length === 0) return '';
        let hoveredItem = filteredItems[hoverItemIndex];
        if (listOpen && hoveredItem) {
            let count = filteredItems ? filteredItems.length : 0;
            return ariaListOpen(hoveredItem[validatedLabel], count);
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

    function handleHover(itemIndex) {
        if (isScrolling) return;
        hoverItemIndex = itemIndex;
    }

    function handleItemClick(args) {
        const { item, itemIndex } = args;
        if (item?.selectable === false) return;
        if (selectedValue && !multiple && selectedValue[validatedItemId] === item[validatedItemId]) return closeList();
        if (isItemSelectable(item)) {
            hoverItemIndex = itemIndex;
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

    function isItemActive(item, selectedValue, itemId) {
        if (multiple) return;
        return selectedValue && selectedValue[itemId] === item[itemId];
    }

    function isItemSelectable(item) {
        if (!item) return false;
        if (item.groupHeader) return item.selectable === true;
        return !Object.hasOwn(item, 'selectable') || item.selectable === true;
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
        if (!container || !list) return;
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
        selectedValue,
        itemId: validatedItemId,
        groupBy,
        label: validatedLabel,
        filterSelectedItems,
        itemFilter,
        convertStringItemsToObjects,
        filterGroupedItems,
    }));
    let hasValue = $derived(multiple ? selectedValue && selectedValue.length > 0 : selectedValue);
    let hideSelectedItem = $derived(hasValue && filterText.length > 0);
    let showClear = $derived(hasValue && clearable && !disabled && !loading);
    function getPlaceholderText() {
        if (placeholderAlwaysShow && multiple) return placeholder;
        if (multiple && !selectedValue?.length) return placeholder;
        return selectedValue ? '' : placeholder;
    }
    let placeholderText = $derived(getPlaceholderText());
    let ariaSelection = $derived(selectedValue ? handleAriaSelection(multiple) : '');
    let ariaContext = $derived(handleAriaContent());
    let isListRendered = $derived(!!list);
    let scrollToHoverItem = $derived(hoverItemIndex);

    // Effects (side effects replacing reactive statements)
    $effect.pre(() => {
        previousSelectedValue = selectedValue;
        previousFilterText = filterText;
        previousMultiple = multiple;
    });

    $effect(() => {
        if (items !== undefined || selectedValue !== undefined) setValue();
    });

    $effect(() => {
        if (inputAttributes || !searchable) assignInputAttributes();
    });

    // Consolidated: Multiple-mode effects
    $effect(() => {
        if (multiple) {
            syncValueToMode(true);
            if (selectedValue && selectedValue.length > 1) checkValueForDuplicates();
        } else if (previousMultiple) {
            syncValueToMode(false);
        }
    });

    // Consolidated: Value change effects
    $effect(() => {
        if (selectedValue) {
            dispatchSelectedItem();
        } else if (previousSelectedValue) {
            // Intentionally passing undefined to signal value was cleared
            oninput?.(selectedValue);
        }
    });

    $effect(() => {
        if (!focused && input) closeList();
    });

    $effect(() => {
        if (filterText !== previousFilterText) setupFilterText();
    });

    $effect(() => {
        if (!multiple && listOpen && selectedValue && filteredItems) setValueIndexAsHoverIndex();
    });

    // Only run updateValueDisplay when items content actually changes (not just reference)
    // This prevents loops when parent components create new array references on each render
    // Optimized: Compare length and first/last item IDs instead of full deep comparison
    $effect(() => {
        if (items !== previousItemsRef) {
            const itemsLen = items?.length ?? 0;
            const prevLen = previousItemsRef?.length ?? 0;
            const hasChanged = itemsLen !== prevLen ||
                (itemsLen > 0 && (
                    items[0]?.[validatedItemId] !== previousItemsRef?.[0]?.[validatedItemId] ||
                    items[itemsLen - 1]?.[validatedItemId] !== previousItemsRef?.[prevLen - 1]?.[validatedItemId]
                ));
            if (hasChanged) {
                updateValueDisplay(items);
            }
            previousItemsRef = items;
        }
    });

    $effect(() => {
        selectedId = computeSelectedId();
    });

    // Helper function to resolve selectedId to value
    function resolveSelectedId(id) {
        if (!items) return; // Wait for items to load
        if (multiple) {
            selectedValue = id && Array.isArray(id)
                ? items.filter(item => id.includes(item[validatedItemId]))
                : undefined;
        } else {
            selectedValue = id != null
                ? items.find(item => item[validatedItemId] === id) ?? undefined
                : undefined;
        }
    }

    // Handle external changes to selectedId (allows setting value via selectedId)
    // Also handles case where selectedId is set before items are loaded
    $effect(() => {
        const computed = computeSelectedId();
        // Compare selectedId with computed - handles arrays (multiple) and primitives (single)
        const valuesMatch = Array.isArray(selectedId) && Array.isArray(computed)
            ? selectedId.length === computed.length && selectedId.every((v, i) => v === computed[i])
            : selectedId === computed;
        const isExternalChange = selectedId !== previousSelectedId && !valuesMatch;

        if (isExternalChange) {
            if (!items) {
                // Items not loaded yet - save for later
                pendingSelectedId = selectedId;
            } else {
                // Items available - resolve immediately
                resolveSelectedId(selectedId);
                pendingSelectedId = undefined;
            }
        }

        // When items load and we have a pending selectedId, resolve it
        if (items && pendingSelectedId !== undefined && !selectedValue) {
            resolveSelectedId(pendingSelectedId);
            pendingSelectedId = undefined;
        }

        previousSelectedId = selectedId;
    });

    // Apply startId only once at initialization
    $effect(() => {
        if (startId !== undefined && !startIdApplied) {
            selectedId = startId;
            startIdApplied = true;
        }
    });

    // Read-only props - always reflect current state, external changes are ignored
    // Using $effect.pre to update before DOM render for better synchronization
    $effect.pre(() => {
        readOnlySelectedValue = selectedValue;
        readOnlySelectedId = computeSelectedId();
    });

    $effect(() => {
        if (listOpen && filteredItems && !multiple && !selectedValue) checkHoverSelectable();
    });

    $effect(() => {
        handleFilterEvent(filteredItems);
    });

    $effect(() => {
        if (container && floatingConfig) {
            const mergedConfig = {
                ...internalFloatingConfig,
                ...floatingConfig,
                middleware: floatingConfig.middleware || internalFloatingConfig.middleware
            };
            floatingUpdate(mergedConfig);
        }
    });

    // Consolidated: List open effects
    $effect(() => {
        listMounted(list, listOpen);
        if (listOpen) {
            if (container && list) setListWidth();
            if (input && !focused) handleFocus();
        }
    });

    // Reset hoverItemIndex when filterText changes
    $effect(() => {
        if (filterText) hoverItemIndex = 0;
    });

    // Dispatch hover event when hoverItemIndex changes
    $effect(() => {
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
            role="listbox">
            {#if listPrependSnippet}{@render listPrependSnippet()}{/if}
            {#if listSnippet}
                {@render listSnippet({ filteredItems })}
            {:else if filteredItems.length > 0}
                {#each filteredItems as item, itemIndex}
                    <div
                        onmouseover={() => handleHover(itemIndex)}
                        onfocus={() => handleHover(itemIndex)}
                        onclick={(e) => { e.stopPropagation(); handleItemClick({ item, itemIndex }); }}
                        onkeydown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        class="list-item"
                        tabindex="-1"
                        role="option"
                        aria-selected={isItemActive(item, selectedValue, validatedItemId)}>
                        <div
                            use:scrollAction={{ scroll: isItemActive(item, selectedValue, validatedItemId) || scrollToHoverItem === itemIndex, isListRendered }}
                            class="item"
                            class:list-group-title={item.groupHeader}
                            class:active={isItemActive(item, selectedValue, validatedItemId)}
                            class:first={itemIndex === 0}
                            class:hover={hoverItemIndex === itemIndex}
                            class:group-item={item.groupItem}
                            class:not-selectable={item?.selectable === false}>
                            {#if itemSnippet}
                                {@render itemSnippet({ item, index: itemIndex })}
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
                {#each selectedValue as item, itemIndex}
                    <div
                        class="multi-item"
                        class:active={activeFocusedIndex === itemIndex}
                        class:disabled
                        onclick={(e) => { e.preventDefault(); if (multiFullItemClearable) handleMultiItemClear(itemIndex); }}
                        onkeydown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        role="none">
                        <span class="multi-item-text">
                            {#if selectionSnippet}
                                {@render selectionSnippet({ selection: item, index: itemIndex })}
                            {:else}
                                {item[validatedLabel]}
                            {/if}
                        </span>

                        {#if !disabled && !multiFullItemClearable && ClearIcon}
                            <div
                                class="multi-item-clear"
                                onpointerup={(e) => { e.preventDefault(); e.stopPropagation(); handleMultiItemClear(itemIndex); }}>
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
                        {@render selectionSnippet({ selection: selectedValue })}
                    {:else}
                        {selectedValue[validatedLabel]}
                    {/if}
                </div>
            {/if}
        {/if}

        <input
            onkeydown={handleKeyDown}
            onblur={handleBlur}
            onfocus={handleFocus}
            readonly={!searchable}
            aria-label={id ? undefined : 'Select input'}
            aria-expanded={listOpen}
            {...computedInputAttributes}
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
        {@render inputHiddenSnippet({ selectedValue })}
    {:else}
        <input {name} type="hidden" value={selectedValue ? JSON.stringify(selectedValue) : null} />
    {/if}

    {#if required && (!selectedValue || selectedValue.length === 0)}
        {#if requiredSlotSnippet}
            {@render requiredSlotSnippet({ selectedValue })}
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
