/**
 * Test utilities for Svelte 5 component testing
 *
 * This module provides backward-compatible helpers for testing Svelte 5 components
 * using an API similar to Svelte 3/4.
 */

import { mount, unmount, flushSync } from 'svelte';

/**
 * Creates a test instance of a Svelte component with a backward-compatible API.
 *
 * In Svelte 5, components no longer have $set or direct property access.
 * This wrapper provides those capabilities for testing purposes.
 *
 * @param {Component} Component - The Svelte component to instantiate
 * @param {Object} options - Options for the component
 * @param {HTMLElement} options.target - The DOM element to mount the component in
 * @param {Object} options.props - Initial props for the component
 * @returns {Object} A wrapper object with $set, $destroy, and property access
 */
export function createTestComponent(Component, { target, props = {} } = {}) {
  let currentProps = { ...props };
  let instance = null;
  let eventHandlers = {};

  // Create a proxy to intercept property access
  const handler = {
    get(obj, prop) {
      if (prop === '$set') {
        return async function(newProps) {
          // Merge new props
          currentProps = { ...currentProps, ...newProps };

          // Unmount and remount with new props
          if (instance) {
            unmount(instance);
          }

          // Re-apply event handlers as callback props
          const propsWithEvents = { ...currentProps };
          for (const [event, handler] of Object.entries(eventHandlers)) {
            propsWithEvents[event] = handler;
          }

          instance = mount(Component, { target, props: propsWithEvents });
          flushSync();

          return new Promise(f => setTimeout(f, 0));
        };
      }

      if (prop === '$destroy') {
        return function() {
          if (instance) {
            unmount(instance);
            instance = null;
          }
        };
      }

      if (prop === '$on') {
        return function(eventName, handler) {
          // Store event handlers as callback props
          const callbackName = `on${eventName}`;
          eventHandlers[callbackName] = handler;

          // Re-mount with new event handler
          currentProps[callbackName] = (detail) => handler({ detail });
          if (instance) {
            unmount(instance);
          }
          instance = mount(Component, { target, props: currentProps });
          flushSync();
        };
      }

      // Check if instance has this property/method (exported functions and bindable props)
      if (instance) {
        flushSync(); // Ensure Svelte has processed all updates
        if (typeof instance[prop] === 'function') {
          return instance[prop].bind(instance);
        }
        // In Svelte 5, bindable props are accessible as properties on the mount result
        // Try to access directly - bindable props may use getters that don't show up in 'in' check
        try {
          const value = instance[prop];
          if (value !== undefined) {
            return value;
          }
        } catch (e) {
          // Property access failed, continue to other checks
        }
      }

      // Return current prop value
      if (prop in currentProps) {
        return currentProps[prop];
      }

      return undefined;
    },

    set(obj, prop, value) {
      // Update prop and re-mount
      currentProps[prop] = value;

      if (instance) {
        unmount(instance);
      }

      const propsWithEvents = { ...currentProps };
      for (const [event, handler] of Object.entries(eventHandlers)) {
        propsWithEvents[event] = handler;
      }

      instance = mount(Component, { target, props: propsWithEvents });
      flushSync();

      return true;
    }
  };

  // Initial mount
  const propsWithEvents = { ...currentProps };
  instance = mount(Component, { target, props: propsWithEvents });
  flushSync();

  return new Proxy({}, handler);
}

/**
 * Helper to wait for next tick
 */
export function tick() {
  return new Promise(f => setTimeout(f, 0));
}

/**
 * Helper to flush pending updates synchronously
 */
export { flushSync };
