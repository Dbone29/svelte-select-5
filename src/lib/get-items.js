/**
 * @typedef {Object} SelectItem
 * @property {string|number} [value]
 * @property {string} [label]
 * @property {*} [key: string]
 */

/**
 * @typedef {Object} GetItemsOptions
 * @property {(event: string, detail: Object) => void} dispatch - Event dispatcher function
 * @property {(filterText: string) => Promise<SelectItem[]|string[]>} loadOptions - Async load function
 * @property {(items: string[]) => SelectItem[]} convertStringItemsToObjects - String to object converter
 * @property {string} filterText - Current filter text
 */

/**
 * @typedef {Object} GetItemsResult
 * @property {SelectItem[]} filteredItems - Loaded items
 * @property {boolean} loading - Loading state
 * @property {boolean} focused - Focus state
 * @property {boolean} listOpen - List open state
 */

/**
 * Asynchronously loads items using loadOptions function
 * @param {GetItemsOptions} options - Options for loading items
 * @returns {Promise<GetItemsResult|undefined>} Result object or undefined if cancelled/error
 */
export default async function getItems({ dispatch, loadOptions, convertStringItemsToObjects, filterText }) {
    let loadedItems;

    try {
        loadedItems = await loadOptions(filterText);
    } catch (err) {
        console.warn('svelte-select loadOptions error :>> ', err);
        dispatch('error', { type: 'loadOptions', details: err });
        return undefined;
    }

    if (!loadedItems || loadedItems.cancelled) {
        return undefined;
    }

    if (loadedItems.length > 0 && typeof loadedItems[0] !== 'object') {
        loadedItems = convertStringItemsToObjects(loadedItems);
    }

    dispatch('loaded', { items: loadedItems });

    return {
        filteredItems: loadedItems,
        loading: false,
        focused: true,
        listOpen: true,
    };
}
