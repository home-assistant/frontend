/**
@license
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
import "@polymer/polymer/polymer-legacy.js";
import "@polymer/iron-flex-layout/iron-flex-layout.js";
import "@polymer/iron-icon/iron-icon.js";
import "@polymer/paper-icon-button/paper-icon-button.js";
import "@polymer/paper-styles/color.js";
import "@polymer/paper-tabs/paper-tabs-icons.js";
import "@polymer/paper-tabs/paper-tab.js";

import { IronMenuBehaviorImpl } from "@polymer/iron-menu-behavior/iron-menu-behavior.js";
import { IronMenubarBehavior } from "@polymer/iron-menu-behavior/iron-menubar-behavior.js";
import { IronResizableBehavior } from "@polymer/iron-resizable-behavior/iron-resizable-behavior.js";
import { Polymer } from "@polymer/polymer/lib/legacy/polymer-fn.js";
import { dom } from "@polymer/polymer/lib/legacy/polymer.dom.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";

/**
Material design: [Tabs](https://www.google.com/design/spec/components/tabs.html)

`paper-tabs` makes it easy to explore and switch between different views or
functional aspects of an app, or to browse categorized data sets.

Use `selected` property to get or set the selected tab.

Example:

    <paper-tabs selected="0">
      <paper-tab>TAB 1</paper-tab>
      <paper-tab>TAB 2</paper-tab>
      <paper-tab>TAB 3</paper-tab>
    </paper-tabs>

See <a href="?active=paper-tab">paper-tab</a> for more information about
`paper-tab`.

A common usage for `paper-tabs` is to use it along with `iron-pages` to switch
between different views.

    <paper-tabs selected="{{selected}}">
      <paper-tab>Tab 1</paper-tab>
      <paper-tab>Tab 2</paper-tab>
      <paper-tab>Tab 3</paper-tab>
    </paper-tabs>

    <iron-pages selected="{{selected}}">
      <div>Page 1</div>
      <div>Page 2</div>
      <div>Page 3</div>
    </iron-pages>

To use links in tabs, add `link` attribute to `paper-tab` and put an `<a>`
element in `paper-tab` with a `tabindex` of -1.

Example:

<pre><code>
&lt;style is="custom-style">
  .link {
    &#64;apply --layout-horizontal;
    &#64;apply --layout-center-center;
  }
&lt;/style>

&lt;paper-tabs selected="0">
  &lt;paper-tab link>
    &lt;a href="#link1" class="link" tabindex="-1">TAB ONE&lt;/a>
  &lt;/paper-tab>
  &lt;paper-tab link>
    &lt;a href="#link2" class="link" tabindex="-1">TAB TWO&lt;/a>
  &lt;/paper-tab>
  &lt;paper-tab link>
    &lt;a href="#link3" class="link" tabindex="-1">TAB THREE&lt;/a>
  &lt;/paper-tab>
&lt;/paper-tabs>
</code></pre>

### Styling

The following custom properties and mixins are available for styling:

Custom property | Description | Default
----------------|-------------|----------
`--paper-tabs-selection-bar-color` | Color for the selection bar | `--paper-yellow-a100`
`--paper-tabs-selection-bar` | Mixin applied to the selection bar | `{}`
`--paper-tabs` | Mixin applied to the tabs | `{}`
`--paper-tabs-content` | Mixin applied to the content container of tabs | `{}`
`--paper-tabs-container` | Mixin applied to the layout container of tabs | `{}`

@demo demo/index.html
*/
Polymer({
  /** @override */
  _template: html`
    <style>
      :host {
        @apply --layout;
        @apply --layout-center;

        height: 48px;
        font-size: 14px;
        font-weight: 500;
        overflow: hidden;
        -moz-user-select: none;
        -ms-user-select: none;
        -webkit-user-select: none;
        user-select: none;

        /* NOTE: Both values are needed, since some phones require the value to be \`transparent\`. */
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
        -webkit-tap-highlight-color: transparent;

        @apply --paper-tabs;
      }

      :host(:dir(rtl)) {
        @apply --layout-horizontal-reverse;
      }

      #tabsContainer {
        position: relative;
        height: 100%;
        white-space: nowrap;
        overflow: hidden;
        @apply --layout-flex-auto;
        @apply --paper-tabs-container;
      }

      #tabsContent {
        height: 100%;
        -moz-flex-basis: auto;
        -ms-flex-basis: auto;
        flex-basis: auto;
        @apply --paper-tabs-content;
      }

      #tabsContent.scrollable {
        position: absolute;
        white-space: nowrap;
      }

      #tabsContent:not(.scrollable),
      #tabsContent.scrollable.fit-container {
        @apply --layout-horizontal;
      }

      #tabsContent.scrollable.fit-container {
        min-width: 100%;
      }

      #tabsContent.scrollable.fit-container > ::slotted(*) {
        /* IE - prevent tabs from compressing when they should scroll. */
        -ms-flex: 1 0 auto;
        -webkit-flex: 1 0 auto;
        flex: 1 0 auto;
      }

      .hidden,
      .not-visible {
        display: none;
      }

      paper-icon-button {
        width: 48px;
        height: 48px;
        padding: 12px;
        margin: 0 4px;
      }

      #selectionBar {
        position: absolute;
        height: 0;
        bottom: 0;
        left: 0;
        right: 0;
        border-bottom: 2px solid
          var(--paper-tabs-selection-bar-color, var(--paper-yellow-a100));
        -webkit-transform: scale(0);
        transform: scale(0);
        -webkit-transform-origin: left center;
        transform-origin: left center;
        transition: -webkit-transform;
        transition: transform;

        @apply --paper-tabs-selection-bar;
      }

      #selectionBar.align-bottom {
        top: 0;
        bottom: auto;
      }

      #selectionBar.expand {
        transition-duration: 0.15s;
        transition-timing-function: cubic-bezier(0.4, 0, 1, 1);
      }

      #selectionBar.contract {
        transition-duration: 0.18s;
        transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
      }

      #tabsContent > ::slotted(:not(#selectionBar)) {
        height: 100%;
      }
    </style>

    <paper-icon-button
      icon="paper-tabs:chevron-left"
      class$="[[_computeScrollButtonClass(_leftHidden, scrollable, hideScrollButtons)]]"
      on-up="_onScrollButtonUp"
      on-down="_onLeftScrollButtonDown"
      tabindex="-1"
    ></paper-icon-button>

    <div id="tabsContainer" on-track="_scroll" on-down="_down">
      <div
        id="tabsContent"
        class$="[[_computeTabsContentClass(scrollable, fitContainer)]]"
      >
        <div
          id="selectionBar"
          class$="[[_computeSelectionBarClass(noBar, alignBottom)]]"
          on-transitionend="_onBarTransitionEnd"
        ></div>
        <slot></slot>
      </div>
    </div>

    <paper-icon-button
      icon="paper-tabs:chevron-right"
      class$="[[_computeScrollButtonClass(_rightHidden, scrollable, hideScrollButtons)]]"
      on-up="_onScrollButtonUp"
      on-down="_onRightScrollButtonDown"
      tabindex="-1"
    ></paper-icon-button>
  `,

  is: "paper-tabs",
  behaviors: [IronResizableBehavior, IronMenubarBehavior],

  properties: {
    /**
     * If true, ink ripple effect is disabled. When this property is changed,
     * all descendant `<paper-tab>` elements have their `noink` property
     * changed to the new value as well.
     */
    noink: { type: Boolean, value: false, observer: "_noinkChanged" },

    /**
     * If true, the bottom bar to indicate the selected tab will not be shown.
     */
    noBar: { type: Boolean, value: false },

    /**
     * If true, the slide effect for the bottom bar is disabled.
     */
    noSlide: { type: Boolean, value: false },

    /**
     * If true, tabs are scrollable and the tab width is based on the label
     * width.
     */
    scrollable: { type: Boolean, value: false },

    /**
     * If true, tabs expand to fit their container. This currently only applies
     * when scrollable is true.
     */
    fitContainer: { type: Boolean, value: false },

    /**
     * If true, dragging on the tabs to scroll is disabled.
     */
    disableDrag: { type: Boolean, value: false },

    /**
     * If true, scroll buttons (left/right arrow) will be hidden for scrollable
     * tabs.
     */
    hideScrollButtons: { type: Boolean, value: false },

    /**
     * If true, the tabs are aligned to bottom (the selection bar appears at the
     * top).
     */
    alignBottom: { type: Boolean, value: false },

    selectable: { type: String, value: "paper-tab" },

    /**
     * If true, tabs are automatically selected when focused using the
     * keyboard.
     */
    autoselect: { type: Boolean, value: false },

    /**
     * The delay (in milliseconds) between when the user stops interacting
     * with the tabs through the keyboard and when the focused item is
     * automatically selected (if `autoselect` is true).
     */
    autoselectDelay: { type: Number, value: 0 },

    _step: { type: Number, value: 10 },

    _holdDelay: { type: Number, value: 1 },

    _leftHidden: { type: Boolean, value: false },

    _rightHidden: { type: Boolean, value: false },

    _previousTab: { type: Object },
  },

  /** @private */
  hostAttributes: { role: "tablist" },

  listeners: {
    "iron-resize": "_onTabSizingChanged",
    "iron-items-changed": "_onTabSizingChanged",
    "iron-select": "_onIronSelect",
    "iron-deselect": "_onIronDeselect",
  },

  /**
   * @type {!Object}
   */
  keyBindings: { "left:keyup right:keyup": "_onArrowKeyup" },

  /** @override */
  created: function () {
    this._holdJob = null;
    this._pendingActivationItem = undefined;
    this._pendingActivationTimeout = undefined;
    this._bindDelayedActivationHandler = this._delayedActivationHandler.bind(
      this
    );
    this.addEventListener("blur", this._onBlurCapture.bind(this), true);
  },

  /** @override */
  ready: function () {
    this.setScrollDirection("y", this.$.tabsContainer);
  },

  /** @override */
  detached: function () {
    this._cancelPendingActivation();
  },

  _noinkChanged: function (noink) {
    var childTabs = dom(this).querySelectorAll("paper-tab");
    childTabs.forEach(
      noink ? this._setNoinkAttribute : this._removeNoinkAttribute
    );
  },

  _setNoinkAttribute: function (element) {
    element.setAttribute("noink", "");
  },

  _removeNoinkAttribute: function (element) {
    element.removeAttribute("noink");
  },

  _computeScrollButtonClass: function (
    hideThisButton,
    scrollable,
    hideScrollButtons
  ) {
    if (!scrollable || hideScrollButtons) {
      return "hidden";
    }

    if (hideThisButton) {
      return "not-visible";
    }

    return "";
  },

  _computeTabsContentClass: function (scrollable, fitContainer) {
    return scrollable
      ? "scrollable" + (fitContainer ? " fit-container" : "")
      : " fit-container";
  },

  _computeSelectionBarClass: function (noBar, alignBottom) {
    if (noBar) {
      return "hidden";
    } else if (alignBottom) {
      return "align-bottom";
    }

    return "";
  },

  // TODO(cdata): Add `track` response back in when gesture lands.

  _onTabSizingChanged: function () {
    this.debounce(
      "_onTabSizingChanged",
      function () {
        this._scroll();
        this._tabChanged(this.selectedItem);
      },
      10
    );
  },

  _onIronSelect: function (event) {
    this._tabChanged(event.detail.item, this._previousTab);
    this._previousTab = event.detail.item;
    this.cancelDebouncer("tab-changed");
  },

  _onIronDeselect: function (event) {
    this.debounce(
      "tab-changed",
      function () {
        this._tabChanged(null, this._previousTab);
        this._previousTab = null;
        // See polymer/polymer#1305
      },
      1
    );
  },

  _activateHandler: function () {
    // Cancel item activations scheduled by keyboard events when any other
    // action causes an item to be activated (e.g. clicks).
    this._cancelPendingActivation();

    IronMenuBehaviorImpl._activateHandler.apply(this, arguments);
  },

  /**
   * Activates an item after a delay (in milliseconds).
   */
  _scheduleActivation: function (item, delay) {
    this._pendingActivationItem = item;
    this._pendingActivationTimeout = this.async(
      this._bindDelayedActivationHandler,
      delay
    );
  },

  /**
   * Activates the last item given to `_scheduleActivation`.
   */
  _delayedActivationHandler: function () {
    var item = this._pendingActivationItem;
    this._pendingActivationItem = undefined;
    this._pendingActivationTimeout = undefined;
    item.fire(this.activateEvent, null, { bubbles: true, cancelable: true });
  },

  /**
   * Cancels a previously scheduled item activation made with
   * `_scheduleActivation`.
   */
  _cancelPendingActivation: function () {
    if (this._pendingActivationTimeout !== undefined) {
      this.cancelAsync(this._pendingActivationTimeout);
      this._pendingActivationItem = undefined;
      this._pendingActivationTimeout = undefined;
    }
  },

  _onArrowKeyup: function (event) {
    if (this.autoselect) {
      this._scheduleActivation(this.focusedItem, this.autoselectDelay);
    }
  },

  _onBlurCapture: function (event) {
    // Cancel a scheduled item activation (if any) when that item is
    // blurred.
    if (event.target === this._pendingActivationItem) {
      this._cancelPendingActivation();
    }
  },

  get _tabContainerScrollSize() {
    return Math.max(
      0,
      this.$.tabsContainer.scrollWidth - this.$.tabsContainer.offsetWidth
    );
  },

  _scroll: function (e, detail) {
    if (!this.scrollable) {
      return;
    }

    var ddx = (detail && -detail.ddx) || 0;
    this._affectScroll(ddx);
  },

  _down: function (e) {
    // go one beat async to defeat IronMenuBehavior
    // autorefocus-on-no-selection timeout
    this.async(function () {
      if (this._defaultFocusAsync) {
        this.cancelAsync(this._defaultFocusAsync);
        this._defaultFocusAsync = null;
      }
    }, 1);
  },

  _affectScroll: function (dx) {
    this.$.tabsContainer.scrollLeft += dx;

    var scrollLeft = this.$.tabsContainer.scrollLeft;

    this._leftHidden = scrollLeft - this.firstElementChild.clientWidth < 0;
    this._rightHidden =
      scrollLeft + this.lastElementChild.clientWidth >
      this._tabContainerScrollSize;

    if (this._lastLeftHiddenState != this._leftHidden) {
      this._lastLeftHiddenState = this._leftHidden;
      this.$.tabsContainer.scrollLeft += this._leftHidden ? -54 : 54;
    }
  },

  _onLeftScrollButtonDown: function () {
    this._scrollToLeft();
    this._holdJob = setInterval(this._scrollToLeft.bind(this), this._holdDelay);
  },

  _onRightScrollButtonDown: function () {
    this._scrollToRight();
    this._holdJob = setInterval(
      this._scrollToRight.bind(this),
      this._holdDelay
    );
  },

  _onScrollButtonUp: function () {
    clearInterval(this._holdJob);
    this._holdJob = null;
  },

  _scrollToLeft: function () {
    this._affectScroll(-this._step);
  },

  _scrollToRight: function () {
    this._affectScroll(this._step);
  },

  _tabChanged: function (tab, old) {
    if (!tab) {
      // Remove the bar without animation.
      this.$.selectionBar.classList.remove("expand");
      this.$.selectionBar.classList.remove("contract");
      this._positionBar(0, 0);
      return;
    }

    var r = this.$.tabsContent.getBoundingClientRect();
    var w = r.width;
    var tabRect = tab.getBoundingClientRect();
    var tabOffsetLeft = tabRect.left - r.left;

    this._pos = {
      width: this._calcPercent(tabRect.width, w),
      left: this._calcPercent(tabOffsetLeft, w),
    };

    if (this.noSlide || old == null) {
      // Position the bar without animation.
      this.$.selectionBar.classList.remove("expand");
      this.$.selectionBar.classList.remove("contract");
      this._positionBar(this._pos.width, this._pos.left);
      return;
    }

    var oldRect = old.getBoundingClientRect();
    var oldIndex = this.items.indexOf(old);
    var index = this.items.indexOf(tab);
    var m = 5;

    // bar animation: expand
    this.$.selectionBar.classList.add("expand");

    var moveRight = oldIndex < index;
    var isRTL = this._isRTL;
    if (isRTL) {
      moveRight = !moveRight;
    }

    if (moveRight) {
      this._positionBar(
        this._calcPercent(tabRect.left + tabRect.width - oldRect.left, w) - m,
        this._left
      );
    } else {
      this._positionBar(
        this._calcPercent(oldRect.left + oldRect.width - tabRect.left, w) - m,
        this._calcPercent(tabOffsetLeft, w) + m
      );
    }

    if (this.scrollable) {
      this._scrollToSelectedIfNeeded(tabRect.width, tabOffsetLeft);
    }
  },

  _scrollToSelectedIfNeeded: function (tabWidth, tabOffsetLeft) {
    var l = tabOffsetLeft - this.$.tabsContainer.scrollLeft;
    if (l < 0) {
      this.$.tabsContainer.scrollLeft += l;
    } else {
      l += tabWidth - this.$.tabsContainer.offsetWidth;
      if (l > 0) {
        this.$.tabsContainer.scrollLeft += l;
      }
    }
  },

  _calcPercent: function (w, w0) {
    return (100 * w) / w0;
  },

  _positionBar: function (width, left) {
    width = width || 0;
    left = left || 0;

    this._width = width;
    this._left = left;
    this.transform(
      "translateX(" + left + "%) scaleX(" + width / 100 + ")",
      this.$.selectionBar
    );
  },

  _onBarTransitionEnd: function (e) {
    var cl = this.$.selectionBar.classList;
    // bar animation: expand -> contract
    if (cl.contains("expand")) {
      cl.remove("expand");
      cl.add("contract");
      this._positionBar(this._pos.width, this._pos.left);
      // bar animation done
    } else if (cl.contains("contract")) {
      cl.remove("contract");
    }
  },
});
