import "@polymer/paper-styles/element-styles/paper-material-styles";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

class HaCard extends PolymerElement {
  static get template() {
    return html`
    <style include="paper-material-styles">
      :host {
        @apply --paper-material-elevation-1;
        display: block;
        border-radius: 2px;
        transition: all 0.30s ease-out;
        background-color: var(--paper-card-background-color, white);
      }
      .header {
        @apply --paper-font-headline;
        @apply --paper-font-common-expensive-kerning;
        opacity: var(--dark-primary-opacity);
        padding: 24px 16px 16px;
      }
    </style>

    <template is="dom-if" if="[[header]]">
      <div class="header">[[header]]</div>
    </template>
    <slot></slot>
`;
  }

  static get properties() {
    return {
      header: String,
    };
  }
}

customElements.define("ha-card", HaCard);
