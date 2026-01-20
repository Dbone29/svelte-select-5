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
 * @property {SelectItem|SelectItem[]|null} selectedValue - Current selected value
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
    selectedValue,
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

    if (items && items.length > 0 && (typeof items[0] === 'string' || typeof items[0] === 'number')) {
        items = convertStringItemsToObjects(items);
    }

    // Pre-compute selected IDs Set for O(1) lookup instead of O(n) per item
    const selectedIds = multiple && Array.isArray(selectedValue) && selectedValue.length > 0 && filterSelectedItems
        ? new Set(selectedValue.map(v => v?.[itemId]))
        : null;

    let filterResults = items.filter((item) => {
        let matchesFilter = itemFilter(item[label] ?? '', filterText, item);

        // In multi-select mode, optionally exclude already-selected items
        if (matchesFilter && selectedIds) {
            matchesFilter = !selectedIds.has(item[itemId]);
        }

        return matchesFilter;
    });

    if (groupBy) {
        filterResults = filterGroupedItems(filterResults);
    }

    return filterResults;
}
