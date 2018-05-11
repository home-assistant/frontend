import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

class MoreInfoScript extends PolymerElement {
  static get template() {
    return html`
    <style is="custom-style" include="iron-flex iron-flex-alignment"></style>

    <div class="layout vertical">
      <div class="data-entry layout justified horizontal">
        <div class="key">Last Action</div>
        <div class="value">[[stateObj.attributes.last_action]]</div>
      </div>
    </div>
`;
  }

  static get is() { return 'more-info-script'; }

  static get properties() {
    return {
      stateObj: {
        type: Object,
      },
    };
  }
}

customElements.define(MoreInfoScript.is, MoreInfoScript);
