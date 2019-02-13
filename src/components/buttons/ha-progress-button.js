import "@material/mwc-button";
import "@polymer/paper-spinner/paper-spinner";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

class HaProgressButton extends PolymerElement {
  static get template() {
    return html`
      <style>
        .container {
          position: relative;
          display: inline-block;
        }

        mwc-button {
          transition: all 1s;
        }

        .success mwc-button {
          --mdc-theme-primary: white;
          background-color: var(--google-green-500);
          transition: none;
        }

        .error mwc-button {
          --mdc-theme-primary: white;
          background-color: var(--google-red-500);
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
      <div class="container" id="container">
        <mwc-button
          id="button"
          disabled="[[computeDisabled(disabled, progress)]]"
          on-click="buttonTapped"
        >
          <slot></slot>
        </mwc-button>
        <template is="dom-if" if="[[progress]]">
          <div class="progress"><paper-spinner active=""></paper-spinner></div>
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
    };
  }

  tempClass(className) {
    var classList = this.$.container.classList;
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
}

customElements.define("ha-progress-button", HaProgressButton);
