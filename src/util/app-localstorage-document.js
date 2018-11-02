/* Forked because it contained an import.meta which webpack doesn't support. */
/* eslint-disable */
/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
import { AppStorageBehavior } from "@polymer/app-storage/app-storage-behavior";
import { Polymer } from "@polymer/polymer/lib/legacy/polymer-fn";
import "@polymer/polymer/polymer-legacy";

/**
 * app-localstorage-document synchronizes storage between an in-memory
 * value and a location in the browser's localStorage system.
 *
 * localStorage is a simple and widely supported storage API that provides both
 * permanent and session-based storage options. Using app-localstorage-document
 * you can easily integrate localStorage into your app via normal Polymer
 * databinding.
 *
 * app-localstorage-document is the reference implementation of an element
 * that uses `AppStorageBehavior`. Reading its code is a good way to get
 * started writing your own storage element.
 *
 * Example use:
 *
 *     <paper-input value="{{search}}"></paper-input>
 *     <app-localstorage-document key="search" data="{{search}}">
 *     </app-localstorage-document>
 *
 * app-localstorage-document automatically synchronizes changes to the
 * same key across multiple tabs.
 *
 * Only supports storing JSON-serializable values.
 */
Polymer({
  is: "app-localstorage-document",
  behaviors: [AppStorageBehavior],

  properties: {
    /**
     * Defines the logical location to store the data.
     *
     * @type{String}
     */
    key: { type: String, notify: true },

    /**
     * If true, the data will automatically be cleared from storage when
     * the page session ends (i.e. when the user has navigated away from
     * the page).
     */
    sessionOnly: { type: Boolean, value: false },

    /**
     * Either `window.localStorage` or `window.sessionStorage`, depending on
     * `this.sessionOnly`.
     */
    storage: { type: Object, computed: "__computeStorage(sessionOnly)" },
  },

  observers: ["__storageSourceChanged(storage, key)"],

  attached: function() {
    this.listen(window, "storage", "__onStorage");
    this.listen(
      window.top,
      "app-local-storage-changed",
      "__onAppLocalStorageChanged"
    );
  },

  detached: function() {
    this.unlisten(window, "storage", "__onStorage");
    this.unlisten(
      window.top,
      "app-local-storage-changed",
      "__onAppLocalStorageChanged"
    );
  },

  get isNew() {
    return !this.key;
  },

  /**
   * Stores a value at the given key, and if successful, updates this.key.
   *
   * @param {*} key The new key to use.
   * @return {Promise}
   */
  saveValue: function(key) {
    try {
      this.__setStorageValue(/*{@type if (key ty){String}}*/ key, this.data);
    } catch (e) {
      return Promise.reject(e);
    }

    this.key = /** @type {String} */ (key);

    return Promise.resolve();
  },

  reset: function() {
    this.key = null;
    this.data = this.zeroValue;
  },

  destroy: function() {
    try {
      this.storage.removeItem(this.key);
      this.reset();
    } catch (e) {
      return Promise.reject(e);
    }

    return Promise.resolve();
  },

  getStoredValue: function(path) {
    var value;

    if (this.key != null) {
      try {
        value = this.__parseValueFromStorage();

        if (value != null) {
          value = this.get(path, { data: value });
        } else {
          value = undefined;
        }
      } catch (e) {
        return Promise.reject(e);
      }
    }

    return Promise.resolve(value);
  },

  setStoredValue: function(path, value) {
    if (this.key != null) {
      try {
        this.__setStorageValue(this.key, this.data);
      } catch (e) {
        return Promise.reject(e);
      }

      this.fire("app-local-storage-changed", this, { node: window.top });
    }

    return Promise.resolve(value);
  },

  __computeStorage: function(sessionOnly) {
    return sessionOnly ? window.sessionStorage : window.localStorage;
  },

  __storageSourceChanged: function(storage, key) {
    this._initializeStoredValue();
  },

  __onStorage: function(event) {
    if (event.key !== this.key || event.storageArea !== this.storage) {
      return;
    }

    this.syncToMemory(function() {
      this.set("data", this.__parseValueFromStorage());
    });
  },

  __onAppLocalStorageChanged: function(event) {
    if (
      event.detail === this ||
      event.detail.key !== this.key ||
      event.detail.storage !== this.storage
    ) {
      return;
    }
    this.syncToMemory(function() {
      this.set("data", event.detail.data);
    });
  },

  __parseValueFromStorage: function() {
    try {
      return JSON.parse(this.storage.getItem(this.key));
    } catch (e) {
      console.error("Failed to parse value from storage for", this.key);
    }
  },

  __setStorageValue: function(key, value) {
    if (typeof value === "undefined") value = null;
    this.storage.setItem(key, JSON.stringify(value));
  },
});
