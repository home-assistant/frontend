import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import LocalizeMixin from "../../../mixins/localize-mixin";

class MoreInfoScript extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="iron-flex iron-flex-alignment"></style>

      <div class="layout vertical">
        <div class="data-entry layout justified horizontal">
          <div class="key">
            [[localize('ui.dialogs.more_info_control.script.last_action')]]
          </div>
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
