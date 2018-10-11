import "@polymer/app-layout/app-header-layout/app-header-layout.js";
import "@polymer/app-layout/app-header/app-header.js";
import "@polymer/app-layout/app-toolbar/app-toolbar.js";
import "@polymer/paper-card/paper-card.js";
import "@polymer/paper-checkbox/paper-checkbox.js";
import "@polymer/paper-icon-button/paper-icon-button.js";
import "@polymer/paper-input/paper-input.js";
import "@polymer/paper-item/paper-icon-item.js";
import "@polymer/paper-item/paper-item-body.js";
import "@polymer/paper-item/paper-item.js";
import "@polymer/paper-listbox/paper-listbox.js";
import "@polymer/paper-menu-button/paper-menu-button.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../components/ha-menu-button.js";
import "../../components/ha-start-voice-button.js";
import LocalizeMixin from "../../mixins/localize-mixin.js";

/*
 * @appliesMixin LocalizeMixin
 */
class HaPanelShoppingList extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="ha-style">
      :host {
        height: 100%;
      }
      app-toolbar paper-listbox {
        width: 150px;
      }
      app-toolbar paper-item {
        cursor: pointer;
      }
      .content {
        padding-bottom: 32px;
        max-width: 600px;
        margin: 0 auto;
      }
      paper-card {
        display: block;
      }
      paper-icon-item {
        border-top: 1px solid var(--divider-color);
      }
      paper-icon-item:first-child {
        border-top: 0;
      }
      paper-checkbox {
        padding: 11px;
      }
      paper-input {
        --paper-input-container-underline: {
          display: none;
        }
        --paper-input-container-underline-focus: {
          display: none;
        }
        position: relative;
        top: 1px;
      }
      .tip {
        padding: 24px;
        text-align: center;
        color: var(--secondary-text-color);
      }
    </style>

    <app-header-layout has-scrolling-region>
      <app-header slot="header" fixed>
        <app-toolbar>
          <ha-menu-button narrow='[[narrow]]' show-menu='[[showMenu]]'></ha-menu-button>
          <div main-title>[[localize('panel.shopping_list')]]</div>
          <ha-start-voice-button hass='[[hass]]' can-listen='{{canListen}}'></ha-start-voice-button>
          <paper-menu-button
            horizontal-align="right"
            horizontal-offset="-5"
            vertical-offset="-5"
          >
            <paper-icon-button
              icon="hass:dots-vertical"
              slot="dropdown-trigger"
            ></paper-icon-button>
            <paper-listbox slot="dropdown-content">
              <paper-item
                on-click="_clearCompleted"
              >[[localize('ui.panel.shopping-list.clear_completed')]]</paper-item>
            </paper-listbox>
          </paper-menu-button>
        </app-toolbar>
      </app-header>

      <div class='content'>
        <paper-card>
          <paper-icon-item on-focus='_focusRowInput'>
            <paper-icon-button
              slot="item-icon"
              icon="hass:plus"
              on-click='_addItem'
            ></paper-icon-button>
            <paper-item-body>
              <paper-input
                id='addBox'
                placeholder="[[localize('ui.panel.shopping-list.add_item')]]"
                on-keydown='_addKeyPress'
                no-label-float
              ></paper-input>
            </paper-item-body>
          </paper-icon-item>

          <template is='dom-repeat' items='[[items]]'>
            <paper-icon-item>
                <paper-checkbox
                  slot="item-icon"
                  checked='{{item.complete}}'
                  on-click='_itemCompleteTapped'
                  tabindex='0'
                ></paper-checkbox>
              <paper-item-body>
                <paper-input
                  id='editBox'
                  no-label-float
                  value='[[item.name]]'
                  on-change='_saveEdit'
                ></paper-input>
              </paper-item-body>
            </paper-icon-item>
          </template>
        </paper-card>
        <div class='tip' hidden$='[[!canListen]]'>
          [[localize('ui.panel.shopping-list.microphone_tip')]]
        </div>
      </div>
    </app-header-layout>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,
      showMenu: Boolean,
      canListen: Boolean,
      items: {
        type: Array,
        value: [],
      },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._fetchData = this._fetchData.bind(this);

    this.hass.connection
      .subscribeEvents(this._fetchData, "shopping_list_updated")
      .then(
        function(unsub) {
          this._unsubEvents = unsub;
        }.bind(this)
      );
    this._fetchData();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubEvents) this._unsubEvents();
  }

  _fetchData() {
    this.hass.callApi("get", "shopping_list").then(
      function(items) {
        items.reverse();
        this.items = items;
      }.bind(this)
    );
  }

  _itemCompleteTapped(ev) {
    ev.stopPropagation();
    this.hass
      .callApi("post", "shopping_list/item/" + ev.model.item.id, {
        complete: ev.target.checked,
      })
      .catch(() => this._fetchData());
  }

  _addItem(ev) {
    this.hass
      .callApi("post", "shopping_list/item", {
        name: this.$.addBox.value,
      })
      .catch(() => this._fetchData());
    this.$.addBox.value = "";
    // Presence of 'ev' means tap on "add" button.
    if (ev) {
      setTimeout(() => this.$.addBox.focus(), 10);
    }
  }

  _addKeyPress(ev) {
    if (ev.keyCode === 13) {
      this._addItem();
    }
  }

  _saveEdit(ev) {
    const { index, item } = ev.model;
    const name = ev.target.value;

    if (name === item.name) {
      return;
    }

    this.set(["items", index, "name"], name);
    this.hass
      .callApi("post", "shopping_list/item/" + item.id, {
        name: name,
      })
      .catch(() => this._fetchData());
  }

  _clearCompleted() {
    this.hass.callApi("POST", "shopping_list/clear_completed");
  }
}

customElements.define("ha-panel-shopping-list", HaPanelShoppingList);
