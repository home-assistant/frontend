import "@polymer/iron-flex-layout/iron-flex-layout-classes.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

class MoreInfoScript extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-flex iron-flex-alignment"></style>

    <div class="layout vertical">
      <div class="data-entry layout justified horizontal">
        <div class="key">Last Action</div>
        <div class="value">[[stateObj.attributes.last_action]]</div>
      </div>
    </div>
`;
  }

  static get properties() {
    return {
      stateObj: {
        type: Object,
      },
    };
  }
}

customElements.define("more-info-script", MoreInfoScript);
