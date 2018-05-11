import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-material/paper-material.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

class HaCard extends PolymerElement {
  static get template() {
    return html`
    <style include="paper-material">
      :host {
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
        text-transform: capitalize;
      }
    </style>

    <template is="dom-if" if="[[header]]">
      <div class="header">[[header]]</div>
    </template>
    <slot></slot>
`;
  }

  static get is() { return 'ha-card'; }

  static get properties() {
    return {
      header: {
        type: String,
      },
      /**
       * The z-depth of the card, from 0-5.
       */
      elevation: {
        type: Number,
        value: 1,
        reflectToAttribute: true,
      },
    };
  }
}

customElements.define(HaCard.is, HaCard);
