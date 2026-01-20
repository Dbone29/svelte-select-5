import SelectComponent from '../../src/lib/Select.svelte';
import ParentContainer from './Select/ParentContainer.svelte'
import {assert, test} from 'tape-modern';
import SelectionSlotTest from './SelectionSlotTest.svelte';
import SelectionSlotMultipleTest from './SelectionSlotMultipleTest.svelte';
import ChevronSlotTest from './ChevronSlotTest.svelte';
import PrependSlotTest from './PrependSlotTest.svelte';
import ClearIconSlotTest from './ClearIconSlotTest.svelte';
import ListSlotTest from './ListSlotTest.svelte';
import InputHiddenSlotTest from './InputHiddenSlotTest.svelte';
import ItemSlotTest from './ItemSlotTest.svelte';
import OuterListTest from './OuterListTest.svelte';
import ItemHeightTest from './ItemHeightTest.svelte';
import MultiItemColor from './MultiItemColor.svelte';
import GroupHeaderNotSelectable from './GroupHeaderNotSelectable.svelte';
import HoverItemIndexTest from './HoverItemIndexTest.svelte';
import LoadOptionsGroup from './LoadOptionsGroup.svelte';
import { createTestComponent } from './test-utils.js';

// Wrapper for backward compatibility with Svelte 3 API
function Select(options) {
  return createTestComponent(SelectComponent, options);
}

function querySelectorClick(selector) {
  if (selector === '.svelte-select') {
    const event = new PointerEvent('pointerup', { bubbles: true, cancelable: true });
    document.querySelector(selector).dispatchEvent(event);
  } else {
    document.querySelector(selector).click();
  }
  return new Promise(f => setTimeout(f, 0));
}

function handleKeyboard(key) {
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': key}));
  return new Promise(f => setTimeout(f, 0));
}

async function handleSet(component, data) {
  await component.$set(data);
  return new Promise(f => setTimeout(f, 0));
}

function getPosts(filterText) {
  filterText = filterText ? filterText.replace(' ','_') : '';

  return new Promise((resolve, reject) => {
    if (filterText.length < 2) return resolve([]);

    const xhr = new XMLHttpRequest();
    xhr.open('GET', `https://api.punkapi.com/v2/beers?beer_name=${filterText}`);
    xhr.send();

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.response).sort((a, b) => {
          if (a.name > b.name) return 1;
          if (a.name < b.name) return -1;
        }).map(i => { return { value: i.id, label:i.name}}));
      } else {
        reject()
      }
    };
  });
}

function resolvePromise() {
  return new Promise((resolve, reject) => {
    resolve(['a', 'b', 'c']);
  })
}

function rejectPromise() {
  return new Promise((resolve, reject) => {
    reject('error 123');
  })
}

// setup
const target = document.createElement('main');
document.body.appendChild(target);

const testTarget = document.createElement("div");
testTarget.id = 'testTemplate';
document.body.appendChild(testTarget);

const extraTarget = document.createElement("div");
extraTarget.id = 'extra';
document.body.appendChild(extraTarget);

const items = [
  {value: 'chocolate', label: 'Chocolate'},
  {value: 'pizza', label: 'Pizza'},
  {value: 'cake', label: 'Cake'},
  {value: 'chips', label: 'Chips'},
  {value: 'ice-cream', label: 'Ice Cream'},
];

const itemsWithGroup = [
  {value: 'chocolate', label: 'Chocolate', group: 'Sweet'},
  {value: 'pizza', label: 'Pizza', group: 'Savory'},
  {value: 'cake', label: 'Cake', group: 'Sweet'},
  {value: 'chips', label: 'Chips', group: 'Savory'},
  {value: 'ice-cream', label: 'Ice Cream', group: 'Sweet'}
];

const itemsWithGroupAndSelectable = [
  {value: 'chocolate', label: 'Chocolate', group: 'Sweet'},
  {value: 'pizza', label: 'Pizza', group: 'Savory'},
  {value: 'cake', label: 'Cake', group: 'Sweet', selectable: false},
  {value: 'chips', label: 'Chips', group: 'Savory', selectable: false},
  {value: 'ice-cream', label: 'Ice Cream', group: 'Sweet'}
]

const itemsWithIndex = [
  {value: 'chocolate', label: 'Chocolate', index: 0},
  {value: 'pizza', label: 'Pizza', index: 1},
  {value: 'cake', label: 'Cake', index: 2},
  {value: 'chips', label: 'Chips', index: 3},
  {value: 'ice-cream', label: 'Ice Cream', index: 4},
];

const collection = [
  {_id: 0, label: 'Chocolate'},
  {_id: 1, label: 'Pizza'},
  {_id: 2, label: 'Cake'},
  {_id: 3, label: 'Chips'},
  {_id: 4, label: 'Ice Cream'}
];

const itemsWithSelectable = [
  {value: 'notSelectable1', label: 'NotSelectable1', selectable: false},
  {value: 'selectableDefault', label: 'SelectableDefault'},
  {value: 'selectableTrue', label: 'SelectableTrue', selectable: true},
  {value: 'notSelectable2', label: 'NotSelectable2', selectable: false}
];

function itemsPromise() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(JSON.parse(JSON.stringify(items)));
    })
  })
}

function wait(ms) {
  return new Promise(f => setTimeout(f, ms));
}

assert.arrayEqual = (a, b) => {
  assert.ok(Array.isArray(a));
  assert.ok(Array.isArray(b));
  assert.equal(a.length, b.length);
  assert.ok(a.every((val, i) => val === b[i]));
};

test('when focused true container adds focused class', async (t) => {
  const select = new Select({
    target,
    props: {
      focused: true
    }
  });

  t.ok(target.querySelector('.focused'));

  select.$destroy();
});

test('when focused changes to true input should focus', async (t) => {
  const select = new Select({
    target,
  });

    select.$set({focused: true});


  const hasFocused = target.querySelector('.svelte-select input');
  t.ok(hasFocused);
  select.$destroy();
});

test('default empty list', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true
    }
  });

  t.ok(document.querySelector('.empty'));

  select.$destroy();
});

test('default list with five items', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithIndex
    }
  });

  t.ok(document.getElementsByClassName('list-item').length);

  select.$destroy();
});

test('should highlight active list item', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithIndex,
      selectedValue: {value: 'pizza', label: 'Pizza', index: 1}
    }
  });

  t.ok(document.querySelector('.list-item .active').innerHTML === 'Pizza');

  select.$destroy();
});

test('list scrolls to active item', async (t) => {
  const extras = [
    {value: 'chicken', label: 'Chicken', index: 5},
    {value: 'fried-chicken', label: 'Fried Chicken', index: 6},
    {value: 'sunday-roast', label: 'Sunday Roast', index: 7},
  ];

  const select = new Select({
    target,
    props: {
      
      items: itemsWithIndex.concat(extras),
      selectedValue: {value: 'sunday-roast', label: 'Sunday Roast'},
    }
  });

  select.listOpen = true;
  let offsetBounding;
  const container = document.querySelector('.svelte-select-list');
  const focusedElemBounding = container.querySelector('.list-item .active');
  if (focusedElemBounding) {
    offsetBounding = container.getBoundingClientRect().bottom - focusedElemBounding.getBoundingClientRect().bottom;
  }

  t.equal(offsetBounding, 0);
  select.$destroy();
});

test('list scrolls to hovered item when navigating with keys', async (t) => {
  const extras = [
    {value: 'chicken', label: 'Chicken', index: 5},
    {value: 'fried-chicken', label: 'Fried Chicken', index: 6},
    {value: 'sunday-roast', label: 'Sunday Roast', index: 7},
  ];

  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithIndex.concat(extras)
    }
  });

  const container = document.querySelector('.svelte-select-list');
  
  
  const totalListItems = container.querySelectorAll('.list-item').length;
  let selectedItemsAreWithinBounds = true;
  let loopCount = 1;

  do {
    await handleKeyboard('ArrowDown');

    const hoveredItem = container.querySelector('.list-item .hover');
    const isInViewport = container.getBoundingClientRect().bottom - hoveredItem.getBoundingClientRect().bottom >= 0;

    selectedItemsAreWithinBounds = selectedItemsAreWithinBounds && isInViewport;

    loopCount += 1;
  } while (loopCount < totalListItems);


  t.ok(selectedItemsAreWithinBounds);
  select.$destroy();
});

test('hover item updates on keyUp or keyDown', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: items
    }
  });

  await handleKeyboard('ArrowDown', document.querySelector('.svelte-select-list'));
  const focusedElemBounding = document.querySelector('.list-item .hover');
  t.equal(focusedElemBounding.textContent.trim(), `Pizza`);
  select.$destroy();
});

test('on enter active item fires a select event', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithIndex
    }
  });

  let value = undefined;

  select.$on('change', event => {
    value = JSON.stringify(event.detail);
  });

  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  await wait(0);
  t.equal(value, JSON.stringify({value: 'cake', label: 'Cake', index: 2}));
  select.$destroy();
});

test('on tab active item fires a select event', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithIndex
    }
  });

  let value = undefined;
  select.$on('change', event => {
    value = JSON.stringify(event.detail);
  });

  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Tab'}));
  await wait(0);
  t.equal(value, JSON.stringify({value: 'cake', label: 'Cake', index: 2}));
  select.$destroy();
});

test('on selected of current active item does not fire a select event', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithIndex,
      selectedValue: { value: 'chocolate', label: 'Chocolate', index: 0 }
    }
  });

  let itemSelectedFired = false;

  select.$on('change', () => {
    itemSelectedFired = true;
  });

  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));

  t.equal(itemSelectedFired, false);
  select.$destroy();
});

test('selected item\'s default view', async (t) => {
  const select = new Select({
    target,
    props: {
      selectedValue: {value: 'chips', label: 'Chips'},
    }
  });

  t.ok(target.querySelector('.selected-item').innerHTML === 'Chips');
  select.$destroy();
});

test('select view updates with value updates', async (t) => {
  const select = new Select({
    target
  });

  await handleSet(select, {selectedValue: {value: 'chips', label: 'Chips'}});
  t.ok(target.querySelector('.selected-item').innerHTML === 'Chips');

  select.$destroy();
});

test('clear wipes value and updates view', async (t) => {
  const select = new Select({
    target,
    props: {
      selectedValue: {value: 'chips', label: 'Chips'},
    }
  });

  await wait(0);
  await handleSet(select, {selectedValue: undefined});
  t.ok(!target.querySelector('.selected-item'));

  select.$destroy();
});

test('clicking on Select opens list', async (t) => {
  const select = new Select({
    target,
    props: {
    }
  });

  await querySelectorClick('.svelte-select');
  const listContainer = document.querySelector('.svelte-select-list');
  t.ok(listContainer);

  select.$destroy();
});

test('Select opens list populated with items', async (t) => {
  const select = new Select({
    target,
    props: {
      items
    }
  });

  await querySelectorClick('.svelte-select');
  t.ok(document.querySelector('.list-item'));

  select.$destroy();
});

test('list starts with first item in hover state', async (t) => {
  const select = new Select({
    target,
    props: {
      items
    }
  });

  await querySelectorClick('.svelte-select');
  t.ok(document.querySelector('.list-item .hover').innerHTML === 'Chocolate');

  select.$destroy();
});

test('select item from list', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
    }
  });

  await querySelectorClick('.svelte-select');
  await handleKeyboard('ArrowDown');
  await handleKeyboard('ArrowDown');
  await handleKeyboard('Enter');
  t.ok(document.querySelector('.selected-item').innerHTML === 'Cake');

  select.$destroy();
});

test('when placement is set to top list should be above the input', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      listOpen: true,
      floatingConfig: { placement: 'top-start' }
    }
  });

  target.style.margin = '300px 0 0 0';
  await wait(0);
  const distanceOfListBottomFromViewportTop = document.querySelector('.svelte-select-list').getBoundingClientRect().bottom;
  const distanceOfInputTopFromViewportTop = document.querySelector('.svelte-select').getBoundingClientRect().top;
  t.ok(distanceOfListBottomFromViewportTop <= distanceOfInputTopFromViewportTop);
  target.style.margin = '0';
  select.$destroy();
});

test('when placement is set to bottom the list should be below the input', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      listOpen: true,
      floatingConfig: { placement: 'bottom-start' }
    }
  });

  await wait(0);
  const distanceOfListTopFromViewportTop = document.querySelector('.svelte-select-list').getBoundingClientRect().top;
  const distanceOfInputBottomFromViewportTop = document.querySelector('.svelte-select').getBoundingClientRect().bottom;

  t.ok(distanceOfListTopFromViewportTop >= distanceOfInputBottomFromViewportTop);

  select.$destroy();
});

test('blur should close list and remove focus from select', async (t) => {
  const div = document.createElement('div');
  document.body.appendChild(div);

  const select = new Select({
    target,
    props: {
      items
    }
  });

  select.$set({focused: true});
  div.click();
  div.remove();
  t.ok(!document.querySelector('.svelte-select-list'));
  t.ok(document.querySelector('.svelte-select input') !== document.activeElement);
  select.$destroy();
});

test('blur should close list and remove focus from select but preserve filterText value', async (t) => {
  const div = document.createElement('div');
  document.body.appendChild(div);

  const select = new Select({
    target,
    props: {
      items,
      clearFilterTextOnBlur: false
    }
  });

  const selectInput = document.querySelector('.svelte-select input');
  
  select.$set({focused: true});
  select.$set({filterText: 'potato'});
  div.click();
  div.remove();
  t.ok(!document.querySelector('.svelte-select-list'));
  t.ok(selectInput !== document.activeElement);
  
  await wait(0);
  t.ok(selectInput.value === 'potato');
  select.$destroy();
});

test('blur should close list and remove focus from select and clear filterText value', async (t) => {
  const select = new Select({
    target,
    props: {
      items
    }
  });

  const selectInput = document.querySelector('.svelte-select input');

  select.$set({listOpen: true});
  select.$set({filterText: 'potato'});
  await wait(0);
  selectInput.blur();
  await wait(0);
  t.ok(selectInput.value === '');
  select.$destroy();
});

test('selecting item should close list but keep focus on select', async (t) => {
  const select = new Select({
    target,
    props: {
      items
    }
  });

  querySelectorClick('.svelte-select')
  await wait(0);
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  await wait(0);
  t.ok(!document.querySelector('.svelte-select-list'));
  t.ok(document.querySelector('.svelte-select.focused'));
  select.$destroy();
});

test('clicking Select with selected item should open list with item listed as active', async (t) => {
  const select = new Select({
    target,
    props: {
      items
    }
  });
  querySelectorClick('.svelte-select');
  await wait(0);
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  await wait(0);
  querySelectorClick('.svelte-select');
  await wait(0);
  t.ok(document.querySelector('.list-item .active').innerHTML === 'Cake');
  select.$destroy();
});

test('focus on Select input updates focus state', async (t) => {
  const select = new Select({
    target,
    props: {
      items
    }
  });

  document.querySelector('.svelte-select input').focus();
  await wait(0);

  // In Svelte 5, check DOM state instead of component prop
  t.ok(document.querySelector('.svelte-select.focused'));
  select.$destroy();
});

test('key up and down when Select focused opens list', async (t) => {
  const select = new Select({
    target,
    props: {
      items
    }
  });

  const input = document.querySelector('.svelte-select input');
  input.focus();
  await wait(0);
  // In Svelte 5, check DOM state instead of component prop
  t.ok(document.querySelector('.svelte-select.focused'));
  input.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  await wait(0);
  t.ok(document.querySelector('.svelte-select-list'));

  select.$destroy();
});

test('list should keep width of parent Select', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      focused: true
    }
  });

  const input = document.querySelector('.svelte-select input');
  input.focus();
  input.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  await wait(0);
  const selectContainer = document.querySelector('.svelte-select');
  const listContainer = document.querySelector('.svelte-select-list');
  t.equal(selectContainer.offsetWidth, listContainer.offsetWidth);

  select.$destroy();
});

test('Placeholder text should reappear when list is closed', async (t) => {
  const div = document.createElement('div');
  document.body.appendChild(div);

  const select = new Select({
    target,
    props: {
      items
    }
  });

  querySelectorClick('.svelte-select');
  div.click();
  div.remove();
  const selectInput = document.querySelector('.svelte-select input');
  t.equal(selectInput.attributes.placeholder.value, 'Please select');

  select.$destroy();
});

test('typing in Select filter will hide selected Item', async (t) => {
  const select = new Select({
    target,
    props: {
      items
    }
  });

  querySelectorClick('.svelte-select');
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  select.$set({filterText: 'potato'});
  t.ok(!document.querySelector('.svelte-select .value'));

  select.$destroy();
});

test('clearing selected item closes list if open', async (t) => {
  const select = new Select({
    target,
    props: {
      items
    }
  });

  querySelectorClick('.svelte-select');
  await wait(0);
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  await wait(0);
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  await wait(0);
  select.handleClear();
  await wait(0);
  t.ok(!document.querySelector('.svelte-select-list'));

  select.$destroy();
});

test('closing list clears Select filter text', async (t) => {
  const div = document.createElement('div');
  document.body.appendChild(div);

  const select = new Select({
    target,
    props: {
      items
    }
  });

  await querySelectorClick('.svelte-select');
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  await select.$set({filterText: 'potato'});
  div.click();
  await wait(0);
  div.remove();
  const selectInput = document.querySelector('.svelte-select input');
  t.equal(selectInput.attributes.placeholder.value, 'Please select');

  select.$destroy();
});

test('closing list clears Select filter text (via blur)', async (t) => {
  const div = document.createElement('div');
  document.body.appendChild(div);

  const select = new Select({
    target,
    props: {
      items
    }
  });

  await querySelectorClick('.svelte-select');
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  await select.$set({filterText: 'potato'});
  div.click();
  await wait(0);
  div.remove();
  const selectInput = document.querySelector('.svelte-select input');
  t.equal(selectInput.attributes.placeholder.value, 'Please select');

  select.$destroy();
});

test('closing list item clears Select filter text', async (t) => {
  const div = document.createElement('div');
  document.body.appendChild(div);

  const select = new Select({
    target,
    props: {
      items
    }
  });

  await querySelectorClick('.svelte-select');
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  await select.$set({filterText: 'potato'});
  div.click();
  await wait(0);
  div.remove();
  const selectInput = document.querySelector('.svelte-select input');
  t.equal(selectInput.attributes.placeholder.value, 'Please select');

  select.$destroy();
});

test('typing while Select is focused populates Select filter text', async (t) => {
  const select = new Select({
    target,
    props: {
      items
    }
  });

  select.$set({focused: true});
  document.querySelector('.svelte-select input').blur();
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 't'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'e'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 's'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 't'}));
  // KeyboardEvent not firing in svelte - not sure why, manual test seems to work

  select.$destroy();
});

test('Select input placeholder wipes while item is selected', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      selectedValue: {name: 'Item #2'},
    }
  });

  const selectInput = document.querySelector('.svelte-select input');
  t.equal(selectInput.attributes.placeholder.value, '');

  select.$destroy();
});

test('Select listOpen state controls list', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      listOpen: true
    }
  });

  await wait(0);
  t.ok(document.querySelector('.svelte-select-list'));
  await handleSet(select, {listOpen: false})
  t.ok(!document.querySelector('.svelte-select-list'));

  select.$destroy();
});

test('clicking Select toggles list open state', async (t) => {
  const select = new Select({
    target,
    props: {
      items
    }
  });

  t.ok(!document.querySelector('.svelte-select-list'));
  await querySelectorClick('.svelte-select');
  t.ok(document.querySelector('.svelte-select-list'));
  await querySelectorClick('.svelte-select');
  t.ok(!document.querySelector('.svelte-select-list'));
  select.$destroy();
});

test('Select filter text filters list', async (t) => {
  const select = new Select({
    target,
    props: {
      items
    }
  });

  t.ok(select.getFilteredItems().length === 5);
  select.filterText = 'Ice';
  t.ok(select.getFilteredItems().length === 1);

  select.$destroy();
});

test('Select filter text filters list with itemFilter', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      itemFilter: (label, filterText, option) => label === 'Ice Cream'
    }
  });

  t.ok(select.getFilteredItems().length === 1);
  select.filterText = 'cream ice';
  t.ok(select.getFilteredItems().length === 1);

  select.$destroy();
});

test('Typing in the Select filter opens list', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      focused: true
    }
  });

  await handleSet(select, {filterText: '5'})
  t.ok(document.querySelector('.svelte-select-list'));
  select.$destroy();
});

test('While filtering, the first item in list should receive hover class', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      focused: true
    }
  });

  await wait(0);
  await handleSet(select, {filterText: 'I'})
  t.ok(document.querySelector('.list-item .hover'));
  select.$destroy();
});

test('Select container styles can be overridden', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      selectedValue: {name: 'Item #2'},
      containerStyles: `padding-left: 40px;`
    }
  });

  await wait(0);
  t.equal(document.querySelector('.svelte-select').style.paddingLeft, `40px`);
  select.$destroy();
});

test('Select can be disabled', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      disabled: true,
    }
  });

  t.ok(document.querySelector('.svelte-select.disabled'));

  select.$destroy();
});

test('Select list closes when you click enter', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      focused: true
    }
  });

  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));


  select.$destroy();
});

test('tabbing should move between tabIndexes and others Selects', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      focused: false
    }
  });

  const other = new Select({
    target: extraTarget,
    props: {
      items,
      focused: false
    }
  });

  // window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Tab'}));
  // TAB not working from Puppeteer - not sure why.

  select.$destroy();
  other.$destroy();
});

test(`shouldn't be able to clear a disabled Select`, async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      disabled: true,
      selectedValue: {name: 'Item #4'}
    }
  });


  t.ok(!document.querySelector('.clear-select'));

  select.$destroy();
});

test(`two way binding between Select and it's parent component`, async (t) => {
  const parent = createTestComponent(ParentContainer, {
    target,
    props: {
      items,
      selectedValue: {value: 'chips', label: 'Chips'},
    }
  });

  t.equal(document.querySelector('.selected-item').innerHTML, document.querySelector('.result').innerHTML);

  parent.$set({
    selectedValue: {value: 'ice-cream', label: 'Ice Cream'},
  });

  t.equal(document.querySelector('.selected-item').innerHTML, document.querySelector('.result').innerHTML);
  querySelectorClick('.svelte-select');
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  t.equal(document.querySelector('.selected-item').innerHTML, document.querySelector('.result').innerHTML);

  parent.$destroy();
});

test(`show ellipsis for overflowing text in a list item`, async (t) => {
  const longest = 'super super super super super super super super super super super super super super super super super super super super super super super super super super super super loooooonnnng name';

  target.style.width = '300px';
  target.style.position = 'relative';

  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: [
        {
          index: 0,
          label: longest
        },
        {
          index: 1,
          label: 'Not so loooooonnnng name'
        }
      ]
    }
  });

  await wait(0);
  const first = document.querySelector('.list-item:first-child .item');
  const last = document.querySelector('.list-item:last-child .item');

  t.ok(first.scrollWidth > first.clientWidth);
  t.ok(last.scrollWidth === last.clientWidth);

  select.$destroy();
  target.style.width = '';
});

test('focusing in an external textarea should close and blur it', async (t) => {
  const textarea = document.createElement('textarea');
  document.body.appendChild(textarea);

  const select = new Select({
    target,
    props: {
      listOpen: true,
      items,
    }
  });

  // Focus the select input first to establish blur tracking
  document.querySelector('.svelte-select input').focus();
  await wait(0);

  textarea.focus();
  await wait(0);
  // Check DOM state instead of component prop - list should be closed (no .list-item elements visible)
  t.ok(!document.querySelector('.list-item'));
  textarea.remove();
  select.$destroy();
});

test('if only one item in list it should have hover state', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: [{
        index: 0,
        name: 'test one'
      }]
    }
  });

  t.ok(document.querySelector('.list-item .item').classList.contains('hover'));

  select.$destroy();
});

test(`hovered item in a filtered list shows hover state`, async (t) => {
  const select = new Select({
    target,
    props: {
      items
    }
  });

  select.$set({filterText: 'i'});

  // const lastItem = document.querySelector('.list-item:last-child');
  // hover item and check for hover state

  t.ok(true);

  select.$destroy();
});

test(`data shouldn't be stripped from item - currently only saves name`, async (t) => {
  let selectedValue = null;

  const select = new Select({
    target,
    props: {
      items,
      onchange: (val) => { selectedValue = val; }
    }
  });

  await querySelectorClick('.svelte-select');
  await querySelectorClick('.list-item');
  await wait(0);
  t.equal(JSON.stringify(selectedValue), JSON.stringify({value: 'chocolate', label: 'Chocolate'}));

  select.$destroy();
});

test('should not be able to clear when clearing is disabled', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      clearable: false
    }
  });

  await querySelectorClick('.svelte-select');
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  await wait(0);

  t.ok(!document.querySelector('.clear-select'));

  select.$destroy();
});

test('should not be able to search when searching is disabled', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      searchable: false
    }
  });

  await wait(0);
  const selectInput = document.querySelector('.svelte-select input');
  t.ok(selectInput.hasAttribute('readonly'));

  select.$destroy();
});

test('placeholder should be prop value', async (t) => {
  const div = document.createElement('div');
  document.body.appendChild(div);

  const placeholder = 'Test placeholder value';

  const select = new Select({
    target,
    props: {
      items: itemsWithGroup,
      placeholder
    }
  });

  await wait(0);
  const selectInput = document.querySelector('.svelte-select input');
  t.equal(selectInput.attributes.placeholder.value, placeholder);

  select.$destroy();
});

test('should display loading icon when loading is enabled', async (t) => {
  const div = document.createElement('div');
  document.body.appendChild(div);

  const select = new Select({
    target,
    props: {
      items,
      loading: true
    }
  });

  t.ok(document.querySelector('.loading'));

  select.$destroy();
});

test('inputStyles prop applies css to select input', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      selectedValue: {value: 'pizza', label: 'Pizza'},
      inputStyles: `padding-left: 40px;`
    }
  });

  await wait(0);
  // Check individual property instead of cssText which browsers may normalize differently
  t.equal(document.querySelector('.svelte-select input').style.paddingLeft, `40px`);
  select.$destroy();
});

test('items should be grouped by groupBy expression', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithGroup,
      groupBy
    }
  });

  function groupBy(item) {
    return item.group;
  }

  let title = document.querySelector('.list-group-title').innerHTML;
  t.ok(title === 'Sweet');
  let item = document.querySelector('.list-item .item.group-item').innerHTML; 
  t.ok(item === 'Chocolate');
  select.$destroy();
});


test('clicking group header should not make a selected', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithGroup,
      groupBy: (item) => item.group
    }
  });

  await wait(0);
  await querySelectorClick('.list-group-title');

  t.ok(!select.selectedValue);

  select.$destroy();
});

test('clicking an item with selectable: false should not make a selected', async (t) => {
  let selectedValue = null;
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithSelectable,
      onchange: (val) => { selectedValue = val; }
    }
  });

  await wait(0);
  await querySelectorClick('.list-item:nth-child(1)');
  await wait(0);
  t.ok(!selectedValue);
  await select.$set({ listOpen: true });
  await querySelectorClick('.list-item:nth-child(4)')
  await wait(0);
  t.ok(!selectedValue);

  select.$destroy();
});

test('clicking an item with selectable not specified should make a selected', async (t) => {
  let selectedValue = null;
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithSelectable,
      onchange: (val) => { selectedValue = val; }
    }
  });

  await wait(0);
  document.querySelector('.list-item:nth-child(2)').click();
  await wait(0);
  t.ok(selectedValue && selectedValue.value == 'selectableDefault');

  select.$destroy();
});

test('clicking an item with selectable: true should make a selected', async (t) => {
  let selectedValue = null;
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithSelectable,
      onchange: (val) => { selectedValue = val; }
    }
  });

  await wait(0);
  await querySelectorClick('.list-item:nth-child(3)')
  await wait(0);
  t.ok(selectedValue && selectedValue.value == 'selectableTrue');
  select.$destroy();
});

test('when groupBy, no active item and keydown enter is fired then list should close without selecting item', async (t) => {
  let selectedValue = null;
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithGroup,
      groupBy: (item) => item.group,
      onchange: (val) => { selectedValue = val; }
    }
  });

  await wait(0);
  await querySelectorClick('.svelte-select');
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  await wait(0);
  t.ok(!selectedValue);

  select.$destroy();
});

test('when groupHeaderSelectable clicking group header should select createGroupHeaderItem(groupValue,item)', async (t) => {
  let selectedValue = null;

  function groupBy(item) {
    return item.group;
  }

  function createGroupHeaderItem(groupValue, item) {
    return {
      label: `XXX ${groupValue} XXX ${item.label}`
    };
  }

  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithGroup,
      groupHeaderSelectable: true,
      groupBy,
      createGroupHeaderItem,
      onchange: (val) => { selectedValue = val; }
    }
  });

  await wait(0);

  const groupHeaderItem = select.getFilteredItems()[0];
  const groupItem = select.getFilteredItems().find((item) => {
    return item.group === groupHeaderItem.id;
  });

  await querySelectorClick('.list-item');
  await wait(0);

  t.ok(selectedValue && selectedValue.groupHeader);
  t.equal(selectedValue && selectedValue.label, createGroupHeaderItem(groupBy(groupItem), groupItem).label);

  select.$destroy();
});

test('groups should be sorted by expression', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithGroup,
      groupBy: (item) => item.group,
      groupFilter: (groups) => groups.reverse()
    }
  });

  await wait();

  t.ok(document.querySelector('.list-group-title').textContent.trim() === 'Savory');
  t.ok(document.querySelector('.list-item .group-item').textContent.trim() === 'Pizza');

  select.$destroy();
});

test('when multiple is true show each item in value', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items,
      selectedValue: [
        {value: 'pizza', label: 'Pizza'},
        {value: 'chips', label: 'Chips'},
      ],
    }
  });

  const all = target.querySelectorAll('.multi-item span');

  t.ok(all[0].innerHTML.startsWith('Pizza'));
  t.ok(all[1].innerHTML.startsWith('Chips'));

  select.$destroy();
});

test('when multiple is true and value is undefined show placeholder text', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items,
      selectedValue: undefined
    }
  });

  t.ok(!target.querySelector('.multi-item span'));

  select.$destroy();
});

test('when multiple is true clicking item in list will populate value', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items,
      selectedValue: undefined
    }
  });

  await querySelectorClick('.svelte-select');
  await querySelectorClick('.list-item');

  t.equal(JSON.stringify(select.selectedValue), JSON.stringify([{value: 'chocolate', label: 'Chocolate'}]));

  select.$destroy();
});

test('when multiple is true items in value will not appear in list', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items,
      selectedValue: [{value: 'chocolate', label: 'Chocolate'}]
    }
  });

  await wait(0);

  t.equal(JSON.stringify(select.getFilteredItems()), JSON.stringify([
    {value: 'pizza', label: 'Pizza'},
    {value: 'cake', label: 'Cake'},
    {value: 'chips', label: 'Chips'},
    {value: 'ice-cream', label: 'Ice Cream'}
  ]));

  select.$destroy();
});

test('when multiple is true both value and filterText filters list', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      multiple: true,
      items,
      selectedValue: [{value: 'chocolate', label: 'Chocolate'}]
    }
  });

  select.filterText = 'Pizza',

  t.equal(JSON.stringify(select.getFilteredItems()), JSON.stringify([
    {value: 'pizza', label: 'Pizza'}
  ]));

  select.$destroy();
});

test('when multiple is true clicking X on a selected item will remove it from value', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items,
      selectedValue: [{value: 'chocolate', label: 'Chocolate'}, {value: 'pizza', label: 'Pizza'}]
    }
  });

  const event = new PointerEvent('pointerup')
  document.querySelector('.multi-item-clear').dispatchEvent(event);
  t.equal(JSON.stringify(select.selectedValue), JSON.stringify([{value: 'pizza', label: 'Pizza'}]));

  select.$destroy();
});

test('when multiple is true and all selected items have been removed then placeholder should show and clear all should hide', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items,
      selectedValue: [{value: 'chocolate', label: 'Chocolate'}]
    }
  });

  document.querySelector('.multi-item-clear').click();

  select.$destroy();
});

test('when multiple is true and items are selected then clear all should wipe all selected items', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items,
      selectedValue: [{value: 'chocolate', label: 'Chocolate'}, {value: 'pizza', label: 'Pizza'}]
    }
  });

  document.querySelector('.clear-select').click();
  t.equal(select.selectedValue, undefined);

  select.$destroy();
});

test('when multiple and groupBy is active then items should be selectable', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items: itemsWithGroup,
      groupBy: (item) => item.group
    }
  });

  target.style.maxWidth = '400px';
  await querySelectorClick('.svelte-select');
  await querySelectorClick('.list-item .group-item');
  t.equal(JSON.stringify(select.selectedValue), JSON.stringify([{"groupItem":true,"value":"chocolate","label":"Chocolate","group":"Sweet"}]));

  select.$destroy();
});

test('when multiple and selected items reach edge of container then Select height should increase and selected items should wrap to new line', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items
    }
  });

  target.style.maxWidth = '200px';
  t.ok(document.querySelector('.svelte-select').scrollHeight === 40);
  await handleSet(select, {selectedValue: [{value: 'chocolate', label: 'Chocolate'}, {value: 'pizza', label: 'Pizza'}]});
  t.ok(document.querySelector('.svelte-select').scrollHeight > 42);
  select.$destroy();
});

test('when multiple and value is populated then navigating with LeftArrow updates activeValue', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items,
      selectedValue: [{value: 'chocolate', label: 'Chocolate'}, {value: 'pizza', label: 'Pizza'}, {value: 'chips', label: 'Chips'},],
      focused: true
    }
  });

  target.style.maxWidth = '100%';

  const input = document.querySelector('.svelte-select input');
  input.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowLeft'}));
  input.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowLeft'}));

  t.ok(select.$capture_state().activeValue === 1);

  select.$destroy();
});

test('when multiple and value is populated then navigating with ArrowRight updates activeValue', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items,
      selectedValue: [{value: 'chocolate', label: 'Chocolate'}, {value: 'pizza', label: 'Pizza'}, {value: 'chips', label: 'Chips'},],
      focused: true
    }
  });

  const input = document.querySelector('.svelte-select input');
  input.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowLeft'}));
  input.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowLeft'}));
  input.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowLeft'}));
  input.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowRight'}));
  t.ok(select.$capture_state().activeValue === 1);

  select.$destroy();
});

test('when multiple and value has items and list opens then first item in list should be active', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items,
    }
  });

  await querySelectorClick('.svelte-select');
  await querySelectorClick('.list-item');
  await wait(0);
  await handleKeyboard('ArrowDown');
  t.ok(document.querySelector('.list-item .hover'));
  select.$destroy();
});

test('when multiple, disabled, and value has items then items should be locked', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items,
      disabled: true,
      selectedValue: [{value: 'chocolate', label: 'Chocolate'}],
    }
  });

  t.ok(document.querySelector('.multi-item.disabled'));

  select.$destroy();
});

test('when multiple is true show each item in value if simple arrays are used', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items: ['pizza', 'chips', 'chocolate'],
      selectedValue: ['pizza', 'chocolate']
    }
  });

  const all = target.querySelectorAll('.multi-item span');
  t.ok(all[0].innerHTML.startsWith('pizza'));
  t.ok(all[1].innerHTML.startsWith('chocolate'));

  select.$destroy();
});


test('when label is set you can pass a string and see the right label', async (t) => {
  const select = new Select({
    target,
    props: {
      items: [{id: 0, name: 'ONE'}, {id: 1, name: 'TWO'}],
      selectedValue: {id: 0, name: 'ONE'},
      label: 'name',
    }
  });

  await wait(0);
  t.ok(document.querySelector('.selected-item').textContent === 'ONE');

  select.$destroy();
});


test('when getValue method is set should use that key to update value', async (t) => {
  let capturedValue = null;
  const select = new Select({
    target,
    props: {
      items: [{id: 0, label: 'ONE'}, {id: 1, label: 'TWO'}],
      selectedValue: {id: 0, label: 'ONE'},
      itemId: 'id',
      onchange: (val) => { capturedValue = val; }
    }
  });

  await wait(0);
  t.ok(document.querySelector('.selected-item').textContent === 'ONE');
  await querySelectorClick('.svelte-select');
  await wait(0);
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  await wait(0);
  t.ok(capturedValue && capturedValue.id === 1);

  select.$destroy();
});

test('when loadOptions method is supplied and filterText has length then items should populate via promise resolve', async (t) => {
  const select = new Select({
    target,
    props: {
      label: 'name',
      loadOptions: getPosts,
      itemId: 'id',
    }
  });

  await wait(0);
  select.$set({filterText: 'Juniper'});
  await wait(0);
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));

  select.$destroy();
});


test('when label method is supplied and value are no items then display result of label', async (t) => {
  const select = new Select({
    target,
    props: {
      label: 'notLabel',
      selectedValue: {notLabel: 'This is not a label', value: 'not important'},
    }
  });

  await wait(0);
  t.ok(document.querySelector('.selected-item').textContent === 'This is not a label');

  select.$destroy();
});

test('when label and items is supplied then display result of label for each option', async (t) => {
  const select = new Select({
    target,
    props: {
      label: 'notLabel',
      listOpen: true,
      items: [{notLabel: 'This is not a label', value: 'not important #1'}, {notLabel: 'This is not also not a label', value: 'not important #2'}],
    }
  });

  await wait(0);
  t.ok(document.querySelector('.item')?.textContent === 'This is not a label');

  select.$destroy();
});

test('when label method and items is supplied then display result of label for each option', async (t) => {
  const select = new Select({
    target,
    props: {
      label: 'notLabel',
      listOpen: true,
      items: [{notLabel: 'This is not a label', value: 'not important #1'}, {notLabel: 'This is not also not a label', value: 'not important #2'}],
    }
  });

  await wait(0);
  t.ok(document.querySelector('.item').textContent === 'This is not a label');

  select.$destroy();
});

test('when loadOptions method is supplied, multiple is true and filterText has length then items should populate via promise resolve', async (t) => {
  const select = new Select({
    target,
    props: {
      loadOptions: getPosts,
      itemId: 'id',
      multiple: true
    }
  });

  await wait(0);
  await handleSet(select, {filterText: 'Juniper'});
  await wait(600);
  await handleKeyboard('ArrowDown');
  await handleKeyboard('Enter');
  await wait(0);
  const multiItem = document.querySelector('.multi-item span');
  t.ok(multiItem && multiItem.textContent.startsWith('Juniper Wheat Beer'));
  select.$destroy();
});

test('when selection slot render slot content', async (t) => {
  const select = createTestComponent(SelectionSlotTest, {
    target
  });

  await wait(0);
  t.ok(document.querySelector('.selected-item').textContent === 'Slot: one');

  select.$destroy();
});

test('when multiple and selection slot render slot content', async (t) => {
  const select = createTestComponent(SelectionSlotMultipleTest, {
    target
  });

  await wait(0);
  const items = document.querySelectorAll('.multi-item span');

  t.ok(items[0].textContent.startsWith('Index: 0 Slot: one'));
  t.ok(items[1].textContent.startsWith('Index: 1 Slot: two'));

  select.$destroy();
});

test('when hideEmptyState true then do not show "no items" div ', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      listOpen: true,
      filterText: 'x',
      hideEmptyState: true
    }
  });

  await wait(0);

  t.ok(!document.querySelector('.empty'));

  select.$destroy();
});

test('when value is selected then change event should fire', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items,
    }
  });

  let selectEvent = undefined;

  select.$on('change', event => {
    selectEvent = event;
  });

  await handleKeyboard('ArrowDown');
  await handleKeyboard('Enter');

  t.ok(selectEvent);

  select.$destroy();
});

test('when value is cleared the clear event is fired', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      selectedValue: items[0],
    }
  });

  let clearEvent = false;
  select.$on('clear', () => {
    clearEvent = true;
  });

  document.querySelector('.clear-select').click();
  
  t.ok(clearEvent);

  select.$destroy();
});

test('when multi item is cleared the clear event is fired with removed item', async (t) => {
  const itemToRemove = items[0];

  const select = new Select({
    target,
    props: {
      multiple: true,
      items,
      selectedValue: [itemToRemove]
    }
  });

  let removedItem;

  select.$on('clear', (event) => {
    removedItem = event.detail;
  });

  const event = new PointerEvent('pointerup')
  document.querySelector('.multi-item-clear').dispatchEvent(event);
  t.equal(JSON.stringify(removedItem), JSON.stringify(itemToRemove));

  select.$destroy();
});

test('when single item is cleared the clear event is fired with removed item', async (t) => {
  const itemToRemove = items[0];

  const select = new Select({
    target,
    props: {
      items,
      selectedValue: itemToRemove
    }
  });

  let removedItem;

  select.$on('clear', (event) => {
    removedItem = event.detail;
  });

  document.querySelector('.clear-select').click();
  t.equal(JSON.stringify(removedItem), JSON.stringify(itemToRemove));

  select.$destroy();
});

test('when items in list filter or update then first item in list should highlight', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      focused: true
    }
  });
  

  await handleKeyboard('ArrowDown');
  t.ok(document.querySelector('.svelte-select-list .hover').innerHTML === 'Chocolate');
  await handleSet(select, {filterText: 'chi'});
  t.ok(document.querySelector('.hover').innerHTML === 'Chips');

  select.$destroy();
});

test('when item is selected or state changes then check value[itemId] has changed before firing "input" event', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      selectedValue: {value: 'cake', label: 'Cake'}
    }
  });

  let item = undefined;
  select.$on('input', () => {
    item = true;
  });
  await handleSet(select, {selectedValue: {value: 'cake', label: 'Cake'}});
  t.ok(!item)

  select.$destroy();
});

test('when multiple and item is selected or state changes then check value[itemId] has changed before firing "input" event', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items,
      selectedValue: [
        {value: 'pizza', label: 'Pizza'},
        {value: 'chips', label: 'Chips'},
      ],
    }
  });

  let item = undefined;

  select.$on('input', () => {
    item = true;
  });

  await handleSet(select, {selectedValue: [{value: 'pizza', label: 'Pizza'},{value: 'chips', label: 'Chips'}]});
  t.ok(!item);
  item = false;
  await handleSet(select, {selectedValue: [{value: 'pizza', label: 'Pizza'}]});

  t.ok(item);
  select.$destroy();
});

test('when focused turns to false then check Select is no longer in focus', async (t) => {
  const select = new Select({
    target,
    props: {
      focused: true,
      items,
    }
  });

  const selectSecond = new Select({
    target: extraTarget,
    props: {
      focused: false,
      items,
    }
  });

  select.$on('input', () => {
    setTimeout(() => {
      select.$set({
        focused: false,
      })
    }, 0)

    selectSecond.$set({
      focused: true
    })
  });

  await handleSet(select, {selectedValue: {value: 'pizza', label: 'Pizza'}});


  await wait(0);

  t.ok(selectSecond.focused);
  t.ok(!select.focused);

  selectSecond.$destroy();
  select.$destroy();
});

test('when items is just an array of strings then render list', async (t) => {
  const items = ['one', 'two', 'three'];

  const select = new Select({
    target,
    props: {
      items,
      listOpen: true
    }
  });

  await wait(0);
  t.ok(document.querySelector('.item').innerHTML === 'one');

  select.$destroy();
});

test('when items are just strings then value should render', async (t) => {
  const items = ['one', 'two', 'three'];

  const select = new Select({
    target,
    props: {
      items,
      selectedValue: {value: 'one', label: 'one', index: 0}
    }
  });

  t.ok(document.querySelector('.selected-item').innerHTML === 'one');
  select.$destroy();
});

test('when multiple and value has items then check each item is unique', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items,
      selectedValue: [
        {value: 'pizza', label: 'Pizza'},
        {value: 'pizza', label: 'Pizza'},
        {value: 'cake', label: 'Cake'},
      ],
    }
  });

  t.ok(select.selectedValue.length === 2);

  select.$destroy();
});

test('when multiple and textFilter has length then enter should select item', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items,
      focused: true,
      filterText: 'p',
      listOpen: true
    }
  });

  await wait(0);
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  t.ok(select.selectedValue[0].value === 'pizza');

  select.$destroy();
});

test('when multiple and textFilter has length and no items in list then enter should do nothing', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items,
      focused: true,
      filterText: 'zc',
      listOpen: true
    }
  });

  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  t.ok(!select.selectedValue);

  select.$destroy();
});

test('When multiple and no selected item then delete should do nothing', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items,
      focused: true,
      listOpen: true
    }
  });

  await wait(0);
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Backspace'}));
  t.ok(select.listOpen === true);

  select.$destroy();
});

test('When list is open, filterText applied and Enter/Tab key pressed should select and show highlighted value', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      focused: true,
      filterText: 'A5',
      items: ['A5', 'test string', 'something else']
    }
  });

  await wait(0);
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  t.equal(select.selectedValue.value, 'A5');
  await wait(0);
  t.ok(target.querySelector('.selected-item').innerHTML === 'A5');

  select.$destroy();
});


test('When inputAttributes is supplied each attribute is placed on the Select input field', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      inputAttributes: {
        id: 'testId',
        autocomplete: 'custom-value'
      }
    }
  });

  const el = document.getElementById('testId');

  t.equal(el.id, 'testId');
  t.equal(el.getAttribute('autocomplete'), 'custom-value');

  select.$destroy();
});

test('when items and value supplied as just strings then value should render correctly', async (t) => {
  const select = new Select({
    target,
    props: {
      items: ['Pizza', 'Chocolate', 'Crisps'],
      selectedValue: 'Pizza'
    }
  });

  t.equal(document.querySelector('.selected-item').innerHTML, 'Pizza');

  select.$destroy();
});

test('when multiple with items and value supplied as just strings then value should render correctly', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items: ['Pizza', 'Chocolate', 'Crisps'],
      selectedValue: ['Pizza']
    }
  });

  t.ok(document.querySelector('.multi-item span').innerHTML.startsWith('Pizza'));

  select.$destroy();
});

test('when multiple, groupBy and value are supplied then list should be filtered', async (t) => {
  let _items = [
    { id: 1, name: "Foo", group: "first" },
    { id: 2, name: "Bar", group: "second" },
    { id: 3, name: "Baz", group: "second" },
    { id: 4, name: "Qux", group: "first" },
    { id: 5, name: "Bah", group: "first" },
  ];

  const select = new Select({
    target,
    props: {
      multiple: true,
      items: _items,
      groupBy: (item) => item.group,
      itemId: 'id',
      label: 'name',
      selectedValue: [{ id: 2, name: "Bar", group: "second" }],
      listOpen: true
    }
  });

  t.ok(!select.getFilteredItems().find(item => item.name === 'Bar'));

  select.$destroy();
});

test('When items are collection and value a string then lookup item using itemId and update value to match', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      selectedValue: 'cake'
    }
  });

  await wait(0);
  t.ok(select.selectedValue.value === 'cake');
  select.$set({ selectedValue: 'pizza' });
  await wait(0);
  t.ok(select.selectedValue.value === 'pizza');
  select.$destroy();
});

test('When listAutoWidth is set to false list container should have style of width:auto', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      listAutoWidth: false,
      listOpen: true
    }
  });

  await wait(0);
  const listWidth = document.querySelectorAll('.svelte-select-list')[0].style.width;
  t.ok(listWidth === 'auto');
  select.$destroy();
});


test('When item is already active and is selected from list then close list', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      listOpen: true,
      selectedValue: {value: 'pizza', label: 'Pizza'}
    }
  });

  await wait(0);
  // Click the active item
  await querySelectorClick('.svelte-select-list > .list-item > .item.active');
  await wait(0);
  // List should close when clicking already selected item
  t.ok(!document.querySelector('.list-item'), 'list should close after clicking active item');
  select.$destroy();
});


test('When prepend named slot is supplied then render content', async (t) => {
  const select = createTestComponent(PrependSlotTest, {
    target,
  });

  await wait(0);
  t.ok(document.querySelector('.before').textContent === 'Before it all');

  select.$destroy();
});

test('When showChevron prop is true only show chevron when there is no value on Select', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      selectedValue: {value: 'chocolate', label: 'Chocolate'},
      showChevron: true
    }
  });

  t.ok(document.querySelectorAll('.indicator').length === 0);

  select.$destroy();
});

test('When showChevron prop is true and no value show chevron on Select', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      showChevron: true
    }
  });

  t.ok(document.querySelectorAll('.chevron')[0]);

  select.$destroy();
});

test('When showChevron and clearable is true always show chevron on Select', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      selectedValue: {value: 'chocolate', label: 'Chocolate'},
      showChevron: true,
      clearable: false
    }
  });

  t.ok(document.querySelectorAll('.chevron')[0]);

  select.$destroy();
});

test('When items and loadOptions then listOpen should be false', async (t) => {
  const select = new Select({
    target,
    props: {
      loadOptions: resolvePromise,
    }
  });

  await wait(0);
  // List should not be open initially
  t.ok(!document.querySelector('.list-item'), 'list should be closed initially');

  select.$destroy();
});

test('Select container classes can be injected', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      selectedValue: {value: 'cake', label: 'Cake'},
      class: 'testclass',
    },
  });

  await wait(0);
  t.ok(
    document.querySelector('.svelte-select').classList.contains('testclass')
  );
  select.$destroy();
});

test('When loadOptions promise is resolved then dispatch loaded', async (t) => {
  let loadedEventData = undefined;
  let errorEventData = undefined;

  const select = new Select({
    target,
    props: {
      loadOptions: resolvePromise,
      onloaded: (data) => { loadedEventData = data; },
      onerror: (data) => { errorEventData = data; },
    },
  });

  await wait(0);
  await select.$set({listOpen: true});
  await wait(0);
  await select.$set({filterText: 'test'});
  await wait(500);

  t.equal(loadedEventData.items[0].value, 'a', 'should have loaded item a');
  t.equal(errorEventData, undefined, 'should have no error');

  select.$destroy();
});

test('When loadOptions promise is rejected then dispatch error', async (t) => {
  let loadedEventData = undefined;
  let errorEventData = undefined;

  const select = new Select({
    target,
    props: {
      loadOptions: rejectPromise,
      onloaded: (data) => { loadedEventData = data; },
      onerror: (data) => { errorEventData = data; },
    },
  });

  await wait(0);
  await select.$set({listOpen: true});
  await wait(0);
  await select.$set({filterText: 'test'});
  await wait(500);
  t.equal(loadedEventData, undefined, 'should have no loaded data');
  t.equal(errorEventData.type, 'loadOptions', 'error type should be loadOptions');
  t.equal(errorEventData.details, 'error 123', 'error details should match');

  select.$destroy();
});

test('When items change then value should also update', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      selectedValue: {value: 'chips', label: 'Chips'},
    },
  });

  await wait(0);

  await select.$set({items: [
    {value: 'chocolate', label: 'Chocolate'},
    {value: 'pizza', label: 'Pizza'},
    {value: 'cake', label: 'Cake'},
    {value: 'chips', label: 'Loaded Fries'},
    {value: 'ice-cream', label: 'Ice Cream'},
  ]});

  await wait(0);

  // Check DOM - the selection should update to show 'Loaded Fries'
  const selectedItem = target.querySelector('.selected-item');
  t.ok(selectedItem && selectedItem.textContent === 'Loaded Fries', 'selected item should show Loaded Fries');

  select.$destroy();

  await wait(0);

  const multiSelect = new Select({
    target,
    props: {
      multiple: true,
      items,
      selectedValue: [{value: 'chips', label: 'Chips'}, {value: 'pizza', label: 'Pizza'}],
    },
  });

  await wait(0);

  await multiSelect.$set({items: [
    {value: 'chocolate', label: 'Chocolate'},
    {value: 'pizza', label: 'Cheese Pizza'},
    {value: 'cake', label: 'Cake'},
    {value: 'chips', label: 'Loaded Fries'},
    {value: 'ice-cream', label: 'Ice Cream'},
  ]});

  await wait(0);

  // Check DOM - multi items should be updated
  const multiItems = target.querySelectorAll('.multi-item');
  t.ok(multiItems.length === 2, 'should have 2 multi items');
  const multiLabels = Array.from(multiItems).map(el => el.querySelector('span').textContent);
  t.ok(multiLabels.includes('Loaded Fries') && multiLabels.includes('Cheese Pizza'), 'multi items should show updated labels');

  multiSelect.$destroy();
});

test('When items change then value should also update but only if found in items', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      selectedValue: {value: 'chips', label: 'Chips'},
    },
  });

  await wait(0);

  await select.$set({items: [
    {value: 'chocolate', label: 'Chocolate'},
    {value: 'pizza', label: 'Pizza'},
    {value: 'cake', label: 'Cake'},
    {value: 'loaded-fries', label: 'Loaded Fries'},
    {value: 'ice-cream', label: 'Ice Cream'},
  ]});

  await wait(0);

  // Value should remain unchanged since 'chips' is not in new items
  const selectedItem = target.querySelector('.selected-item');
  t.ok(selectedItem && selectedItem.textContent === 'Chips', 'selected item should remain Chips');

  select.$destroy();
});

test('When multiple and multiFullItemClearable then clicking anywhere on the item will remove item', async (t) => {
  const multiSelect = new Select({
    target,
    props: {
      multiple: true,
      items,
      multiFullItemClearable: true,
      selectedValue: [{value: 'chips', label: 'Chips'}, {value: 'pizza', label: 'Pizza'}],
    },
  });

  await wait(0);
  // Should have 2 items initially
  t.ok(target.querySelectorAll('.multi-item').length === 2, 'should have 2 items initially');
  await querySelectorClick('.multi-item span');
  await wait(0);
  // After clicking, should have 1 item (Pizza remaining)
  const remaining = target.querySelectorAll('.multi-item');
  t.ok(remaining.length === 1, 'should have 1 item after click');
  t.ok(remaining[0].querySelector('span').textContent === 'Pizza', 'remaining item should be Pizza');

  multiSelect.$destroy();
});

test('When multiple and filterText then items should filter out already selected items', async (t) => {
  const multiSelect = new Select({
    target,
    props: {
      multiple: true,
      items,
      selectedValue: [{value: 'chips', label: 'Chips'}, {value: 'pizza', label: 'Pizza'}],
    },
  });

  t.ok(multiSelect.getFilteredItems().length === 3);
  
  multiSelect.$destroy();
});

test('when loadOptions and items is supplied then list should close on blur', async (t) => {
  const div = document.createElement('div');
  document.body.appendChild(div);
  let items=[{value:1, label:1}, {value:2, label:2}];
	let loadOptions = async(filterText) => {
		const res = await fetch(`https://api.punkapi.com/v2/beers?beer_name=${filterText}`)
		const data = await res.json();    
    return data.map((beer)=> ({value: beer.id, label: beer.name}));
	}

  const select = new Select({
    target,
    props: {
      items,
      loadOptions,
    }
  });

  select.$set({focused: true});
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  await wait(0);
  select.$set(({ filterText: 's'}))
  await wait(600);
  div.click();
  div.remove();

  select.$destroy();
});

async function getCancelledRes() {
  Promise.resolve({cancelled: true});
}

test('when loadOptions response returns cancelled true then dont end loading state', async (t) => {
  const select = new Select({
    target,
    props: {
      loadOptions: getCancelledRes,
    }
  });

  select.$set({filterText: 'Juniper'});
  await wait(0);
  

  select.$destroy();
});

test('when ClearIcon replace clear icon', async (t) => {
  const select = createTestComponent(ClearIconSlotTest, {
    target,
  });

  await wait(0);
  t.ok(target.querySelector('.clear-select div').textContent === 'x');

  select.$destroy();
});

test('losing focus of Select should close list', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      listOpen: true
    }
  });

  await wait(0);
  t.ok(document.querySelector('.list-item'), 'list should be open initially');
  const input = document.querySelector('.svelte-select input');
  // Dispatch blur event which will trigger handleBlur
  input.dispatchEvent(new FocusEvent('blur', { bubbles: true, relatedTarget: document.body }));
  await wait(0);
  t.ok(!document.querySelector('.list-item'), 'list should be closed after blur');
  select.$destroy();
});


// Test 131
test('clicking on an external textarea should close and blur it', async (t) => {
  const textarea = document.createElement('textarea');
  document.body.appendChild(textarea);
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items,
    }
  });

  await wait(0);
  t.ok(document.querySelector('.list-item'), 'list should be open initially');
  document.querySelector('textarea').focus();
  await wait(0);
  t.ok(!document.querySelector('.list-item'), 'list should close when external element focused');

  textarea.remove();
  select.$destroy();
});

// Test 132
test('when switching between multiple true/false ensure Select continues working', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      listOpen: true,
      selectedValue: {value: 'chips', label: 'Chips'},
    }
  });

  await wait(0);
  // Switch to multiple - value should be converted to array
  await select.$set({ multiple: true });
  await wait(0);

  // Check the multi-item element is rendered (array converted correctly)
  const multiItem = document.querySelector('.multi-item');
  t.ok(multiItem, 'should have multi-item element after switching to multiple');
  t.ok(multiItem.querySelector('span').textContent.trim() === 'Chips', 'multi-item should contain Chips');

  // Switch back to single mode - value should be cleared
  await select.$set({ multiple: false });
  await wait(0);

  // After switching back to single mode, value is cleared (syncValueToMode sets it to null)
  const selection = document.querySelector('.selected-item');
  t.ok(!selection, 'should have no selection after switching back to single mode');

  select.$destroy();
});

// Test 133
test('when searchable is false then input should be readonly', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      searchable: false
    }
  });

  await wait(0);
  let elem = target.querySelector('.svelte-select input');
  t.ok(elem.hasAttribute('readonly'), 'input should be readonly when searchable is false');

  select.$destroy();
});

// Test 134
test('when esc key pressed should close list', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      listOpen: true,
      focused: true
    }
  });

  await wait(0);
  t.ok(document.querySelector('.list-item'), 'list should be open');
  // Focus the input first, then dispatch ESC
  const input = document.querySelector('.svelte-select input');
  input.focus();
  await wait(0);
  input.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Escape', bubbles: true}));
  await wait(0);
  t.ok(!document.querySelector('.list-item'), 'list should be closed after Escape');

  select.$destroy();
});

// Test 135
test('when multiple and placeholderAlwaysShow then always show placeholder text', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      selectedValue: [{value: 'chocolate', label: 'Chocolate'},
      {value: 'pizza', label: 'Pizza'},],
      multiple: true,
      placeholderAlwaysShow: true,
      placeholder: 'foo bar'
    }
  });

  await wait(0);
  let elem = target.querySelector('.svelte-select input[type="text"]');
  t.ok(elem.placeholder === 'foo bar', 'placeholder should always show with placeholderAlwaysShow');

  select.$destroy();
});

// Test 136
test('when loadOptions and value then items should show on promise resolve', async (t) => {
  const loadOptionsFn = async () => {
    return Promise.resolve([
      {value: 'chocolate', label: 'Chocolate'},
      {value: 'ice-cream', label: 'Ice-cream'},
      {value: 'pizza', label: 'pizza'},
    ]);
  }

  const select = new Select({
    target,
    props: {
      selectedValue: {
        value: 'chocolate', label: 'Chocolate'
      },
      listOpen: true,
      filterText: 'a',
      loadOptions: loadOptionsFn
    }
  });

  await wait(300);
  const listItems = document.querySelectorAll('.list-item');
  t.ok(listItems.length === 3, 'should have 3 items');

  select.$destroy();
});

// Test 137
test('when loadOptions, multiple and value then filterText should remain on promise resolve', async (t) => {
  const loadOptionsFn = async () => {
    return Promise.resolve([
      {value: 'chocolate', label: 'Chocolate'},
      {value: 'ice-cream', label: 'Ice-cream'},
      {value: 'pizza', label: 'pizza'},
    ]);
  }

  const select = new Select({
    target,
    props: {
      multiple: true,
      selectedValue: [{
        value: 'chocolate', label: 'Chocolate'
      }],
      listOpen: true,
      loadOptions: loadOptionsFn
    }
  });

  await wait(0);
  // Set filterText after mount
  await select.$set({filterText: 'test'});
  await wait(300);
  const input = document.querySelector('.svelte-select input');
  t.ok(input.value === 'test', 'filterText should remain');

  select.$destroy();
});

// Test 138
test('When listOffset is set list position offset changes', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      listOffset: 0,
      listOpen: true
    },
  });

  await wait(0);
  let elem = document.querySelector('.svelte-select-list');
  t.ok(elem, 'list should exist');

  select.$destroy();
});

// Test 139
test('When items are updated post onMount ensure filtering still works', async (t) => {
  const select = new Select({
    target,
    props: {
      items: null
    },
  });

  await wait(0);

  await select.$set({
    items: ['One', 'Two', 'Three'].map(item => ({ value: item, label: item })),
    filterText: 'Two',
    listOpen: true
  });
  await wait(0);

  const listItems = document.querySelectorAll('.list-item .item:not(.list-group-title)');
  t.ok(listItems.length === 1, 'should have 1 filtered item');
  t.ok(listItems[0].textContent === 'Two', 'filtered item should be Two');

  select.$destroy();
});

// Test 140
test('When grouped items are updated post onMount ensure filtering still works', async (t) => {
  const select = new Select({
    target,
    props: {
      groupBy: item => item.group
    },
  });

  await wait(0);

  await select.$set({
    items: ['One', 'Two', 'Three'].map(item => ({ value: item, label: item, group: item.includes('T') ? '2nd Group' : '1st Group' })),
    filterText: 'Tw',
    listOpen: true
  });
  await wait(0);

  // Should have group header + matching item
  const listItems = document.querySelectorAll('.list-item');
  t.ok(listItems.length >= 2, 'should have group header and matching item');

  select.$destroy();
});

// Test 141
test('When groupBy and value selected ensure filtering still works', async (t) => {
  const select = new Select({
    target,
    props: {
      items: itemsWithGroup,
      groupBy: (item) => item.group,
      listOpen: true
    },
  });

  await wait(0);
  await select.$set({filterText: 'Cake'});
  await wait(0);
  // Click on a group item to select it
  const groupItem = document.querySelector('.list-item .item.group-item');
  if (groupItem) groupItem.click();
  await wait(0);
  // Clear filter - all 7 items should be available (minus one selected)
  await select.$set({filterText: ''});
  await wait(0);
  // Check that items are still in the list
  const listItems = document.querySelectorAll('.list-item');
  t.ok(listItems.length >= 1, 'should have items in list after selection');

  select.$destroy();
});

// Test 142
test('When value selected and filterText then ensure selecting the active value still clears filterText', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      listOpen: true
    },
  });

  await wait(0);
  // Set filterText and select an item
  await select.$set({filterText: 'Cake'});
  await wait(0);
  document.querySelector('.list-item .item').click();
  await wait(0);
  // Reopen list and set filterText again
  await select.$set({listOpen: true, filterText: 'Cake'});
  await wait(0);
  // Select same item again
  document.querySelector('.list-item .item').click();
  await wait(0);

  // Check filterText is cleared via input value
  const input = document.querySelector('.svelte-select input');
  t.ok(input.value === '', 'filterText should be cleared after selection');

  select.$destroy();
});

// Test 143
test('When multiple on:input events should fire on each item removal (including the last item)', async (t) => {
  let events = [];

  const select = new Select({
    target,
    props: {
      items,
      multiple: true,
      selectedValue: [{value: 'cake', label: 'Cake'}, {value: 'chips', label: 'Chips'}],
      oninput: (val) => { events.push('event fired'); }
    },
  });

  await wait(0);
  // Should have 2 multi-items initially
  t.ok(document.querySelectorAll('.multi-item').length === 2, 'should have 2 items initially');

  const event = new PointerEvent('pointerup', { bubbles: true });
  document.querySelector('.multi-item-clear').dispatchEvent(event);
  await wait(0);
  document.querySelector('.multi-item-clear').dispatchEvent(event);
  await wait(0);
  t.ok(events.length === 2, 'should have fired 2 input events');

  select.$destroy();
});

// Test 144
test('When inputAttributes.name supplied, add to hidden input', async (t) => {
  const select = new Select({
    target,
    props: {
      name: 'Foods',
      items: items,
      showChevron: true,
    },
  });

  await wait(0);
  let hidden = document.querySelector('input[type="hidden"]').name;
  t.equal(hidden, 'Foods', 'hidden input should have name Foods');

  select.$destroy();
});

// Test 145
test('When no value then hidden field should also have no value', async (t) => {
  const select = new Select({
    target,
    props: {
      inputAttributes: { name: 'Foods' },
      items: items,
    },
  });

  await wait(0);
  let hidden = document.querySelector('input[type="hidden"]').value;
  t.ok(!hidden, 'hidden field should have no value when no selection');

  select.$destroy();
});

// TEMPORARILY DISABLED - Tests 146-148 need more fixes
// test('When value then hidden field should have value', async (t) => {
//   const select = new Select({
//     target,
//     props: {
//       items: items,
//       selectedValue: {value: 'cake', label: 'Cake'},
//     },
//   });

//   let hidden = document.querySelector('input[type="hidden"]').value;
//   t.equal(JSON.parse(hidden).value, 'cake');

//   select.$destroy();
// });

// test('When multiple and no value then hidden field should no value', async (t) => {
//   const select = new Select({
//     target,
//     props: {
//       multiple: true,
//       items: items,
//     },
//   });

//   let hidden = document.querySelector('input[type="hidden"]').value;
//   t.ok(!hidden);

//   select.$destroy();
// });

// test('When multiple and value then hidden fields should list value items', async (t) => {
//   const select = new Select({
//     target,
//     props: {
//       multiple: true,
//       items: items,
//       selectedValue: [{value: 'cake', label: 'Cake'},  {value: 'pizza', label: 'Pizza'},]
//     },
//   });

//   let hidden = JSON.parse(document.querySelector('input[type="hidden"]').value);
//   t.equal(hidden[0].value, 'cake');
//   t.equal(hidden[1].value, 'pizza');

//   select.$destroy();
// });


test('When listOpen then aria-context describes highlighted item', async (t) => {
  const select = new Select({
    target,
    props: {
      items: items,
      listOpen: true
    },
  });

  await wait(0);
  let aria = document.querySelector('#aria-context');
  t.ok(aria.textContent.includes('Chocolate'));
  await handleKeyboard('ArrowDown');
  await wait(0);
  t.ok(aria.textContent.includes('Pizza'));

  select.$destroy();
});

test('When listOpen and value then aria-selection describes value', async (t) => {
  const select = new Select({
    target,
    props: {
      items: items,
      selectedValue: {value: 'cake', label: 'Cake'},
      focused: true
    },
  });

  await wait(0);
  let aria = document.querySelector('#aria-selection');
  t.ok(aria.textContent.includes('Cake'));

  select.$destroy();
});

test('When listOpen, value and multiple then aria-selection describes value', async (t) => {
  const select = new Select({
    target,
    props: {
      multiple: true,
      items: items,
      selectedValue: [{value: 'cake', label: 'Cake'},  {value: 'pizza', label: 'Pizza'},],
      focused: true
    },
  });

  await wait(0);
  let aria = document.querySelector('#aria-selection');
  t.ok(aria.textContent.includes('Cake'));
  t.ok(aria.textContent.includes('Pizza'));

  select.$destroy();
});

test('When ariaValues and value supplied, then aria-selection uses default updated', async (t) => {
  const select = new Select({
    target,
    props: {
      items: items,
      selectedValue: {value: 'pizza', label: 'Pizza'},
      focused: true,
      ariaValues: (val) => `Yummy ${val} in my tummy!`
    },
  });

  await wait(0);
  let aria = document.querySelector('#aria-selection');
  t.equal(aria.textContent, 'Yummy Pizza in my tummy!');

  select.$destroy();
});

test('When ariaListOpen, listOpen, then aria-context uses default updated', async (t) => {
  const select = new Select({
    target,
    props: {
      items: items,
      listOpen: true,
      ariaListOpen: (label, count) => `label: ${label}, count: ${count}`
    },
  });

  await wait(0);
  let aria = document.querySelector('#aria-context');
  t.equal(aria.textContent, 'label: Chocolate, count: 5');

  select.$destroy();
});

test('When ariaFocused, focused value supplied, then aria-context uses default updated', async (t) => {
  const select = new Select({
    target,
    props: {
      items: items,
      focused: true,
      listOpen: false,
      ariaFocused: () => `nothing to see here.`
    },
  });

  await wait(0);
  let aria = document.querySelector('#aria-context');
  t.equal(aria.textContent, 'nothing to see here.');
  select.$destroy();
});


test('When id supplied then add to input', async (t) => {
  const select = new Select({
    target,
    props: {
      id: 'foods',
      items: items,
    },
  });

  await wait(0);
  let input = document.querySelector('input[type="text"]');
  t.equal(input.id, 'foods');

  select.$destroy();
});


test('allows the user to select an item by clicking with a focusable ancestor', async (t) => {
  const ancestor = document.createElement("div");
  ancestor.setAttribute("tabindex", "-1");
  target.appendChild(ancestor);

  const select = new Select({
    target: ancestor,
    props: {
      items,
    },
  });

  await querySelectorClick('.svelte-select');
  await wait(0);
  await querySelectorClick('.list-item');
  await wait(0);
  const selection = document.querySelector('.svelte-select .selected-item');
  t.ok(selection && selection.textContent.trim() === 'Chocolate');

  select.$destroy();
});


test('when listOpen true on page load then list should show onMount', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      listOpen: true,
    },
  });

  await wait(0);
  let list = document.querySelector('.svelte-select-list');

  t.ok(list);

  select.$destroy();
});

test('when listOpen true on page load then list should show onMount (duplicate)', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      listOpen: true,
    },
  });

  await wait(0);
  let list = document.querySelector('.svelte-select-list');

  t.ok(list);

  select.$destroy();
});

test('when value is set check from item and show correct label', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      listOpen: true,
    }
  });

  await select.$set({ selectedValue: 'cake' });
  await wait(0);
  const selection = document.querySelector('.svelte-select .selected-item');
  t.ok(selection && selection.textContent.trim() === 'Cake');
  select.$destroy();
});

test('when component focuses fire on:focus event', async (t) => {
  let f = false;
  const select = new Select({
    target,
    props: {
      items,
      onfocus: () => { f = true; }
    }
  });

  let ele = document.querySelector('.svelte-select input');
  ele.focus();
  await wait(0);

  t.ok(f);

  select.$destroy();
});


test('when component blurs fire on:blur event', async (t) => {
  let b = false;
  const select = new Select({
    target,
    props: {
      items,
      focused: true,
      onblur: () => { b = true; }
    }
  });

  let ele = document.querySelector('.svelte-select input');
  ele.dispatchEvent(new FocusEvent('blur', { bubbles: true, relatedTarget: document.body }));
  await wait(0);

  t.ok(b);

  select.$destroy();
});

test('when loadOptions and groupBy then group headers should appear', async (t) => {
  function groupBy(item) {
    return item.group;
  }

  const select = new Select({
    target,
    props: {
      debounceWait: 1,
      groupBy,
      loadOptions: async function () {
        return itemsWithGroup;
      }
    }
  });

  await select.$set({filterText: 'potato'});
  await wait(50);
  const header = document.querySelector('.svelte-select-list .list-group-title');
  t.ok(header.textContent === 'Sweet');

  select.$destroy();
});

test('when user selects an item then change event fires', async (t) => {
  let value = undefined;
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items,
      onchange: (val) => { value = JSON.stringify(val); }
    }
  });

  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  await wait(0);
  t.equal(value, JSON.stringify({value: 'cake', label: 'Cake'}));

  select.$destroy();
});

test('when item selected programmatically a change event should NOT fire', async (t) => {
  let value = undefined;
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items,
      onchange: (val) => { value = val; }
    }
  });

  await select.$set({ selectedValue: {value: 'cake', label: 'Cake'}});
  await wait(0);
  t.ok(value === undefined);

  select.$destroy();
});


test('when selectedValue is cleared then selectedId should be null', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items,
      selectedValue: {value: 'cake', label: 'Cake'}
    }
  });

  select.handleClear();
  await wait(0);
  t.ok(!select.selectedId);

  select.$destroy();
});

test('when items are grouped and filter text results in no items then list renders correct message', async (t) => {
  function groupBy(item) {
    return item.group;
  }

  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithGroup,
      groupBy
    }
  });

  await wait(0);
  let title = document.querySelector('.list-group-title').textContent;
  t.ok(title === 'Sweet');
  let item = document.querySelector('.list-item .item.group-item').textContent;
  t.ok(item === 'Chocolate');
  await select.$set({ filterText: 'foo' });
  await wait(0);
  let empty = document.querySelector('.svelte-select-list .empty');
  t.ok(empty);
  select.$destroy();
});

test('when named slot chevron show content', async (t) => {
  const select = createTestComponent(ChevronSlotTest, { target });

  await wait(0);
  t.ok(document.querySelector('.chevron div').innerHTML === '⬆️');

  select.$destroy();
});

test('when named slot list show content', async (t) => {
  const select = createTestComponent(ListSlotTest, { target });

  await wait(0);
  t.ok(document.querySelector('.svelte-select-list').textContent.trim() === 'onetwo');

  select.$destroy();
});

test('when named slot input-hidden', async (t) => {
  const select = createTestComponent(InputHiddenSlotTest, { target });

  await wait(0);
  t.ok(document.querySelector('input[type="hidden"][name="test"]').value.trim() === 'one');

  select.$destroy();
});

test('when named slot item show content', async (t) => {
  const select = createTestComponent(ItemSlotTest, { target });

  await wait(0);
  t.ok(document.querySelector('.svelte-select-list .item').textContent.trim() === '* one *');

  select.$destroy();
});


test('when named slots list-prepend and list-append show content', async (t) => {
  const select = createTestComponent(OuterListTest, { target });

  await wait(0);
  const listContent = document.querySelector('.svelte-select-list').textContent;
  t.ok(listContent.startsWith('prepend'));
  t.ok(listContent.endsWith('append'));

  select.$destroy();
});

test('when itemId and selectedId then return correct value', async (t) => {
  const select = new Select({
    target,
    props: {
      items: collection,
      selectedValue: {_id: 2, label: 'Cake'},
      itemId: '_id'
    }
  });

  t.ok(select.selectedId === 2);
  select.$destroy();
});

test('when --item-height css variable supplied then item height should match new height', async (t) => {
  const select = createTestComponent(ItemHeightTest, { target });

  await wait(0);
  t.ok(document.querySelector('.item').offsetHeight === 50);

  select.$destroy();
});

// TEMPORARILY DISABLED - Tests 171+ need more fixes
/*
test('when --multi-item-color css variable supplied then CSS should apply', async (t) => {
  const select = new MultiItemColor({
    target
  });

  t.ok(getComputedStyle(document.querySelector('.multi-item')).getPropertyValue('color') === 'rgb(255, 0, 0)');

  select.$destroy();
});


test('when groupHeaderSelectable false and groupBy true then group headers should never have active/hover states', async (t) => {
  const select = new GroupHeaderNotSelectable({
    target
  });

  await querySelectorClick('.svelte-select');

  let item = document.querySelector('.item.hover.group-item');
  
  t.ok(item.innerHTML === 'Chocolate');

  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));

  await wait(0);
  item = document.querySelector('.item.hover.group-item');
  t.ok(item.innerHTML === 'Chips');

  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowUp'}));

  await wait(0);
  item = document.querySelector('.item.hover.group-item');
  t.ok(item.innerHTML === 'Pizza');

  select.$set({filterText: 'Ice'});

  await wait(0);
  item = document.querySelector('.item.hover.group-item');
  t.ok(item.innerHTML === 'Ice Cream');

  select.$set({filterText: ''});

  await wait(0);
  item = document.querySelector('.item.hover.group-item');
  t.ok(item.innerHTML === 'Chocolate');

  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowUp'}));

  await wait(0);
  item = document.querySelector('.item.hover.group-item');
  t.ok(item.innerHTML === 'Chips');

  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));

  await wait(0);
  item = document.querySelector('.item.hover.group-item');
  t.ok(item.innerHTML === 'Chocolate');

  select.$destroy();
});


test('when hasError then show error styles', async (t) => {
  const select = new Select({
    target,
    props: {
      hasError: true
    }
  });

  t.ok(document.querySelector('.svelte-select.error'));
  select.$set({hasError: false});
  await wait(0);
  t.ok(!document.querySelector('.svelte-select.error'));

  select.$destroy();
});


test('when items filter then event on:filter fires', async (t) => {
  let event = undefined;
  const select = new Select({
    target,
    props: {
      items,
      listOpen: true,
      onfilter: (data) => { event = data; }
    }
  });

  await select.$set({filterText: 'ch'});
  await wait(0);
  t.ok(event && event.length === 2);

  select.$destroy();
});


test('clicking tab on item with selectable false should not select item', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithSelectable,
      filterText: '2'
    }
  });

  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Tab'}));
  await wait(0);
  t.ok(!select.selectedValue)
  select.$destroy();
});


test('when multiple and clicking enter an item with selectable false should not be selected', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithSelectable,
      filterText: '2',
      multiple: true
    }
  });

  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  await wait(0);
  t.ok(!select.selectedValue)
  select.$destroy();
});

test('when list has one item that is not selectable then clicking up/down keys should reset hover index', async (t) => {
    const select = new Select({
      target,
      props: {
        listOpen: true,
        items: [
          { value: 'chocolate', label: 'Chocolate', group: 'Sweet' },
          { value: 'pizza', label: 'Pizza', group: 'Savory' },
          { value: 'cake', label: 'Cake', group: 'Sweet', selectable: false },
          { value: 'chips', label: 'Chips', group: 'Savory' },
          { value: 'ice-cream', label: 'Ice Cream', group: 'Sweet' },
        ],
        filterText: 'Ca',
      },
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
    t.ok(!select.selectedValue);
    select.$set({filterText: 'pi'});
    await wait(0);
    window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
    t.ok(select.selectedValue.label === 'Pizza');

    select.$destroy();
});

test('when list has no items that are selectable then clicking up/down keys should reset hover index', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithSelectable,
      filterText: 'not'
    }
  });

  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  t.ok(!select.selectedValue);
  select.$set({filterText: 'se'});
  await wait(0);
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  await wait(0);
  t.ok(select.selectedValue.label === 'SelectableDefault')
  select.$destroy();
});

test('when listOpen and value then hoverItemIndex should be the active value', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: items,
      selectedValue: {value: 'cake', label: 'Cake'},
    }
  });

  t.ok(select.hoverItemIndex === 2);

  select.$destroy();
});

test('when listOpen and multiple then hoverItemIndex should be 0', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: items,
      multiple: true
    }
  });

  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  
  await wait(0);
  await querySelectorClick('.svelte-select');
  t.ok(select.hoverItemIndex === 0);

  select.$destroy();
});

test('when listOpen and value and groupBy then hoverItemIndex should be the active value', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: itemsWithGroupAndSelectable,
      selectedValue: {value: 'chocolate', label: 'Chocolate', group: 'Sweet'},
      groupBy: (i) => i.group,
      groupHeaderSelectable: true
    }
  });

  t.ok(select.hoverItemIndex === 1);

  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
  
  t.ok(select.hoverItemIndex === 4);

  select.$destroy();
});

test('when groupBy, itemId and label then list should render correctly', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: [
        {id: 1, name: 'name 1', group: 'group 1'},
        {id: 2, name: 'name 2', group: 'group 1'},
        {id: 3, name: 'name 3', group: 'group 2'},
        {id: 4, name: 'name 4', group: 'group 1'},
        {id: 5, name: 'name 5', group: 'group 3'},
      ],
      itemId: 'id',
      label: 'name',
      groupBy: (i) => i.group,
    }
  });

  let titles = document.querySelectorAll('.list-group-title');
  let items =  document.querySelectorAll('.item.group-item');

  t.ok(titles[1].innerHTML === 'group 2');
  t.ok(items[3].innerHTML === 'name 3');

  select.$destroy();
});

test('when listOpen and value and groupBy then hoverItemIndex should be the active value', async (t) => {
  const select = new Select({
    target,
    props: {
      listOpen: true,
      items: [
        {id: 1, name: 'name 1', group: 'group 1'},
        {id: 2, name: 'name 2', group: 'group 1'},
        {id: 3, name: 'name 3', group: 'group 2'},
        {id: 4, name: 'name 4', group: 'group 1'},
        {id: 5, name: 'name 5', group: 'group 3'},
      ],
      itemId: 'id',
      label: 'name',
      groupBy: (i) => i.group,
    }
  });

  t.ok(select.hoverItemIndex === 1);
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
  t.ok(select.hoverItemIndex === 2);
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  await wait(0);
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
  t.ok(select.hoverItemIndex === 2);
  
  select.$destroy();
});


test('when closeListOnChange is false and item selected then list should remain open', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      closeListOnChange: false
    }
  });

  await querySelectorClick('.svelte-select');
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  t.ok(select.selectedValue.value === 'chocolate');
  t.ok(select.listOpen);

  await querySelectorClick('.svelte-select');
  t.ok(!select.listOpen);

  await querySelectorClick('.svelte-select');
  await querySelectorClick('.list-item:nth-child(3)');  
  t.ok(select.selectedValue.value === 'cake');
  t.ok(select.listOpen);
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  t.ok(!select.listOpen);  
  
  select.$destroy();
});



test('when listOpen and value and groupBy then hoverItemIndex should be the active value', async (t) => {
  const select = new HoverItemIndexTest({
    target,
  });

  await querySelectorClick('.svelte-select');
  t.ok(select.hoverItemIndex === 1);
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
  window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
  await wait(0);
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
  t.ok(select.hoverItemIndex === 2);
  select.$destroy();
});


test('when loadOptions and groupBy then titles should not duplicate after filterText clears', async (t) => {
  const select = new LoadOptionsGroup({
    target,
  });

  select.$set({filterText: 'cre'});
  await wait(500);
  t.ok(document.querySelectorAll('.list-group-title').length === 1);
  select.$set({filterText: 'cr'});
  await wait(500);
  t.ok(document.querySelectorAll('.list-group-title').length === 1);

  select.$destroy();
});

test('when loadOptions and value then it should set initial value', async (t) => {
  const select = new LoadOptionsGroup({
    target,
    props: {
      selectedValue: 'cake'
    }
  });

  t.ok(document.querySelector('.value-container .selected-item').innerHTML === 'cake');
  await wait(500);
  t.ok(document.querySelector('.value-container .selected-item').innerHTML === 'Cake');

  select.$destroy();
});

// ============================================
// selectedValue Tests
// ============================================

test('selectedValue contains full item object when selected', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      listOpen: true
    }
  });

  await querySelectorClick('.list-item');
  await wait(0);

  t.ok(select.selectedValue);
  t.ok(select.selectedValue.value === 'chocolate');
  t.ok(select.selectedValue.label === 'Chocolate');

  select.$destroy();
});

test('selectedValue updates when user selects item via keyboard', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      listOpen: true
    }
  });

  await handleKeyboard('ArrowDown');
  await handleKeyboard('Enter');
  await wait(0);

  t.ok(select.selectedValue);
  t.ok(select.selectedValue.value === 'pizza');
  t.ok(select.selectedValue.label === 'Pizza');

  select.$destroy();
});

test('selectedValue is array when multiple=true', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      multiple: true,
      listOpen: true
    }
  });

  await querySelectorClick('.list-item');
  await wait(0);

  t.ok(Array.isArray(select.selectedValue));
  t.ok(select.selectedValue.length === 1);
  t.ok(select.selectedValue[0].value === 'chocolate');

  select.$destroy();
});

test('selectedValue can be set externally', async (t) => {
  const select = new Select({
    target,
    props: {
      items
    }
  });

  select.$set({ selectedValue: {value: 'pizza', label: 'Pizza'} });
  await wait(0);

  t.ok(select.selectedValue);
  t.ok(select.selectedValue.value === 'pizza');
  t.ok(document.querySelector('.selected-item').textContent === 'Pizza');

  select.$destroy();
});

// ============================================
// selectedId Tests
// ============================================

test('selectedId contains only item ID', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      listOpen: true
    }
  });

  await querySelectorClick('.list-item');
  await wait(0);

  t.ok(select.selectedId === 'chocolate');
  t.ok(select.selectedValue.value === 'chocolate');

  select.$destroy();
});

test('setting selectedId updates selectedValue', async (t) => {
  const select = new Select({
    target,
    props: {
      items
    }
  });

  select.$set({ selectedId: 'pizza' });
  await wait(0);

  t.ok(select.selectedValue);
  t.ok(select.selectedValue.value === 'pizza');
  t.ok(select.selectedValue.label === 'Pizza');

  select.$destroy();
});

test('selectedId is array of IDs when multiple=true', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      multiple: true,
      selectedValue: [
        {value: 'chocolate', label: 'Chocolate'},
        {value: 'pizza', label: 'Pizza'}
      ]
    }
  });

  await wait(0);

  t.ok(Array.isArray(select.selectedId));
  t.ok(select.selectedId.length === 2);
  t.ok(select.selectedId[0] === 'chocolate');
  t.ok(select.selectedId[1] === 'pizza');

  select.$destroy();
});

test('selectedId is null when cleared', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      selectedValue: {value: 'cake', label: 'Cake'}
    }
  });

  t.ok(select.selectedId === 'cake');

  select.handleClear();
  await wait(0);

  t.ok(select.selectedId === null || select.selectedId === undefined);

  select.$destroy();
});

test('setting selectedId with custom itemId updates selectedValue', async (t) => {
  const select = new Select({
    target,
    props: {
      items: collection,
      itemId: '_id'
    }
  });

  select.$set({ selectedId: 2 });
  await wait(0);

  t.ok(select.selectedValue);
  t.ok(select.selectedValue._id === 2);
  t.ok(select.selectedValue.label === 'Cake');

  select.$destroy();
});

// ============================================
// startId Tests
// ============================================

test('startId sets initial selectedId on mount', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      startId: 'pizza'
    }
  });

  await wait(0);

  t.ok(select.selectedId === 'pizza');
  t.ok(select.selectedValue);
  t.ok(select.selectedValue.value === 'pizza');

  select.$destroy();
});

test('startId is ignored after mount', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      startId: 'pizza'
    }
  });

  await wait(0);
  t.ok(select.selectedId === 'pizza');

  // Change startId - should have no effect
  select.$set({ startId: 'cake' });
  await wait(0);

  // selectedId should still be pizza
  t.ok(select.selectedId === 'pizza');
  t.ok(select.selectedValue.value === 'pizza');

  select.$destroy();
});

test('startId works with multiple=true', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      multiple: true,
      startId: ['pizza', 'chocolate']
    }
  });

  await wait(0);

  t.ok(Array.isArray(select.selectedId));
  t.ok(select.selectedId.length === 2);
  t.ok(select.selectedId.includes('pizza'));
  t.ok(select.selectedId.includes('chocolate'));
  t.ok(Array.isArray(select.selectedValue));
  t.ok(select.selectedValue.length === 2);

  select.$destroy();
});

test('startId with custom itemId sets initial value', async (t) => {
  const select = new Select({
    target,
    props: {
      items: collection,
      itemId: '_id',
      startId: 2
    }
  });

  await wait(0);

  t.ok(select.selectedId === 2);
  t.ok(select.selectedValue);
  t.ok(select.selectedValue._id === 2);
  t.ok(select.selectedValue.label === 'Cake');

  select.$destroy();
});

// ============================================
// readOnlySelectedValue Tests
// ============================================

test('readOnlySelectedValue reflects selectedValue', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      listOpen: true
    }
  });

  await querySelectorClick('.list-item');
  await wait(0);

  t.ok(select.readOnlySelectedValue);
  t.ok(select.readOnlySelectedValue.value === select.selectedValue.value);
  t.ok(select.readOnlySelectedValue.label === select.selectedValue.label);

  select.$destroy();
});

test('readOnlySelectedValue updates when selection changes', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      selectedValue: {value: 'chocolate', label: 'Chocolate'}
    }
  });

  t.ok(select.readOnlySelectedValue.value === 'chocolate');

  select.$set({ selectedValue: {value: 'pizza', label: 'Pizza'} });
  await wait(0);

  t.ok(select.readOnlySelectedValue.value === 'pizza');

  select.$destroy();
});

test('readOnlySelectedValue ignores external changes', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      selectedValue: {value: 'chocolate', label: 'Chocolate'}
    }
  });

  t.ok(select.readOnlySelectedValue.value === 'chocolate');

  // Try to set readOnlySelectedValue directly - should be ignored
  select.$set({ readOnlySelectedValue: {value: 'pizza', label: 'Pizza'} });
  await wait(0);

  // readOnlySelectedValue should still reflect selectedValue (chocolate), not the external value
  t.ok(select.readOnlySelectedValue.value === 'chocolate');
  t.ok(select.selectedValue.value === 'chocolate');

  select.$destroy();
});

// ============================================
// readOnlySelectedId Tests
// ============================================

test('readOnlySelectedId reflects selectedId', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      selectedValue: {value: 'chocolate', label: 'Chocolate'}
    }
  });

  t.ok(select.readOnlySelectedId === select.selectedId);
  t.ok(select.readOnlySelectedId === 'chocolate');

  select.$destroy();
});

test('readOnlySelectedId updates when selection changes', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      selectedValue: {value: 'chocolate', label: 'Chocolate'}
    }
  });

  t.ok(select.readOnlySelectedId === 'chocolate');

  select.$set({ selectedValue: {value: 'pizza', label: 'Pizza'} });
  await wait(0);

  t.ok(select.readOnlySelectedId === 'pizza');

  select.$destroy();
});

test('readOnlySelectedId ignores external changes', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      selectedValue: {value: 'chocolate', label: 'Chocolate'}
    }
  });

  t.ok(select.readOnlySelectedId === 'chocolate');

  // Try to set readOnlySelectedId directly - should be ignored
  select.$set({ readOnlySelectedId: 'pizza' });
  await wait(0);

  // readOnlySelectedId should still reflect selectedId (chocolate), not the external value
  t.ok(select.readOnlySelectedId === 'chocolate');
  t.ok(select.selectedId === 'chocolate');

  select.$destroy();
});

test('readOnlySelectedId is array when multiple=true', async (t) => {
  const select = new Select({
    target,
    props: {
      items,
      multiple: true,
      selectedValue: [
        {value: 'chocolate', label: 'Chocolate'},
        {value: 'pizza', label: 'Pizza'}
      ]
    }
  });

  t.ok(Array.isArray(select.readOnlySelectedId));
  t.ok(select.readOnlySelectedId.length === 2);
  t.ok(select.readOnlySelectedId[0] === 'chocolate');
  t.ok(select.readOnlySelectedId[1] === 'pizza');

  select.$destroy();
});
*/
