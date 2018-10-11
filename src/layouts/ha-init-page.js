import "@polymer/iron-flex-layout/iron-flex-layout-classes.js";
import "@polymer/paper-button/paper-button.js";
import "@polymer/paper-spinner/paper-spinner.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import LocalizeMixin from "../mixins/localize-mixin.js";
import EventsMixin from "../mixins/events-mixin.js";

/*
 * @appliesMixin LocalizeMixin
 */
class HaInitPage extends EventsMixin(LocalizeMixin(PolymerElement)) {
  static get template() {
    return html`
    <style include="iron-flex iron-positioning"></style>
    <style>
      paper-spinner {
        margin-bottom: 10px;
      }
    </style>

    <div class="layout vertical center center-center fit">
      <img src="/static/icons/favicon-192x192.png" height="192">
      <paper-spinner active="[[!error]]"></paper-spinner>
      <template is='dom-if' if='[[error]]'>
        Unable to connect to Home Assistant.
        <paper-button on-click='_retry'>Retry</paper-button>
      </template>
      <template is='dom-if' if='[[!error]]'>
        Loading data
      </template>
    </div>
`;
  }

  static get properties() {
    return {
      error: Boolean,
    };
  }

  _retry() {
    location.reload();
  }
}

customElements.define("ha-init-page", HaInitPage);
