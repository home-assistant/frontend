import "@material/mwc-button";
import "../ha-circular-progress";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";

class HaProgressButton extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          outline: none;
          display: inline-block;
        }
        .container {
          position: relative;
          display: inline-block;
        }

        mwc-button {
          transition: all 1s;
        }

        .success:not(.raised) mwc-button {
          --mdc-theme-primary: white;
          background-color: var(--success-color);
          transition: none;
        }

        .success.raised mwc-button {
          --mdc-theme-primary: var(--success-color);
          transition: none;
        }

        .error:not(.raised) mwc-button {
          --mdc-theme-primary: white;
          background-color: var(--error-color);
          transition: none;
        }

        .error.raised mwc-button {
          --mdc-theme-primary: var(--error-color);
          transition: none;
        }

        .progress {
          @apply --layout;
          @apply --layout-center-center;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }
      </style>
      <div class$="container [[computeClasses(raised)]]" id="container">
        <mwc-button
          id="button"
          disabled="[[computeDisabled(disabled, progress)]]"
          on-click="buttonTapped"
          raised="[[raised]]"
        >
          <slot></slot>
        </mwc-button>
        <template is="dom-if" if="[[progress]]">
          <div class="progress">
            <ha-circular-progress active size="small"></ha-circular-progress>
          </div>
        </template>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      progress: {
        type: Boolean,
        value: false,
      },

      disabled: {
        type: Boolean,
        value: false,
      },

      raised: {
        type: Boolean,
        value: false,
      },
    };
  }

  tempClass(className) {
    const classList = this.$.container.classList;
    classList.add(className);
    setTimeout(() => {
      classList.remove(className);
    }, 1000);
  }

  ready() {
    super.ready();
    this.addEventListener("click", (ev) => this.buttonTapped(ev));
  }

  buttonTapped(ev) {
    if (this.progress) ev.stopPropagation();
  }

  actionSuccess() {
    this.tempClass("success");
  }

  actionError() {
    this.tempClass("error");
  }

  computeDisabled(disabled, progress) {
    return disabled || progress;
  }

  computeClasses(raised) {
    return raised ? "raised" : "";
  }
}

customElements.define("ha-progress-button", HaProgressButton);
