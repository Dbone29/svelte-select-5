/**
 * @typedef {Object} SelectItem
 * @property {string|number} [value]
 * @property {string} [label]
 * @property {*} [key: string]
 */

/**
 * @typedef {Object} FilterOptions
 * @property {Function|undefined} loadOptions - Async load function
 * @property {string} filterText - Current filter text
 * @property {(SelectItem|string)[]} items - Items to filter
 * @property {boolean} multiple - Multi-select mode
 * @property {SelectItem|SelectItem[]|null} value - Current value
 * @property {string} itemId - Property name for item ID
 * @property {string|undefined} groupBy - Property name for grouping
 * @property {boolean} filterSelectedItems - Whether to filter out selected items
 * @property {(label: string, filterText: string, item: SelectItem) => boolean} itemFilter - Filter function
 * @property {(items: (string|SelectItem)[]) => SelectItem[]} convertStringItemsToObjects - Converter function
 * @property {(items: SelectItem[]) => SelectItem[]} filterGroupedItems - Group filter function
 * @property {string} label - Property name for label
 */

/**
 * Filters items based on filter text and selection state
 * @param {FilterOptions} options - Filter options
 * @returns {SelectItem[]} Filtered items
 */
export default function filter({
    loadOptions,
    filterText,
    items,
    multiple,
    value,
    itemId,
    groupBy,
    filterSelectedItems,
    itemFilter,
    convertStringItemsToObjects,
    filterGroupedItems,
    label,
}) {
    // When using loadOptions, filtering happens server-side, so return items as-is
    if (loadOptions && items) return items;
    if (!items) return [];

    if (items && items.length > 0 && typeof items[0] !== 'object') {
        items = convertStringItemsToObjects(items);
    }

    let filterResults = items.filter((item) => {
        let matchesFilter = itemFilter(item[label] ?? '', filterText, item);

        // In multi-select mode, optionally exclude already-selected items
        if (matchesFilter && multiple && value?.length && filterSelectedItems) {
            const isAlreadySelected = value.some((selected) => selected[itemId] === item[itemId]);
            matchesFilter = !isAlreadySelected;
        }

        return matchesFilter;
    });

    if (groupBy) {
        filterResults = filterGroupedItems(filterResults);
    }

    return filterResults;
}
