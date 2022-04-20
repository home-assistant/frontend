import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "../../../layouts/hass-subpage";
import LocalizeMixin from "../../../mixins/localize-mixin";
import "../../../styles/polymer-ha-style";
import "./ha-config-core-form";
import "./ha-config-name-form";

/*
 * @appliesMixin LocalizeMixin
 */
class HaConfigCore extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="iron-flex ha-style">
        .content {
          padding: 28px 20px 0;
          max-width: 1040px;
          margin: 0 auto;
        }

        ha-config-name-form,
        ha-config-core-form {
          display: block;
          margin-top: 24px;
        }
      </style>

      <hass-subpage
        hass="[[hass]]"
        narrow="[[narrow]]"
        header="[[localize('ui.panel.config.core.caption')]]"
        back-path="/config/system"
      >
        <div class="content">
          <ha-config-name-form hass="[[hass]]"></ha-config-name-form>
          <ha-config-core-form hass="[[hass]]"></ha-config-core-form>
        </div>
      </hass-subpage>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,
      narrow: Boolean,
      showAdvanced: Boolean,
      route: Object,
    };
  }
}

customElements.define("ha-config-core", HaConfigCore);
