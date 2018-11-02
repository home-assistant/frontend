import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

class HaSettingsRow extends PolymerElement {
  static get template() {
    return html`
    <style>
      :host {
        display: flex;
        padding: 0 16px;
        align-content: normal;
        align-self: auto;
        align-items: center;
      }
      :host([narrow]) {
        align-items: normal;
        flex-direction: column;
        border-top: 1px solid var(--divider-color);
        padding-bottom: 8px;
      }
      paper-item-body {
        padding-right: 16px;
      }
    </style>
    <paper-item-body two-line$='[[!threeLine]]' three-line$='[[threeLine]]'>
      <slot name="heading"></slot>
      <div secondary><slot name="description"></slot></div>
    </paper-item-body>
    <slot></slot>
    `;
  }

  static get properties() {
    return {
      narrow: {
        type: Boolean,
        reflectToAttribute: true,
      },
      threeLine: {
        type: Boolean,
        value: false,
      },
    };
  }
}

customElements.define("ha-settings-row", HaSettingsRow);
