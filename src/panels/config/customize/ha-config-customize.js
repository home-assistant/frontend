import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { sortStatesByName } from "../../../common/entity/states_sort_by_name";
import "../../../layouts/hass-tabs-subpage";
import LocalizeMixin from "../../../mixins/localize-mixin";
import "../../../styles/polymer-ha-style";
import { documentationUrl } from "../../../util/documentation-url";
import "../ha-config-section";
import "../ha-entity-config";
import { configSections } from "../ha-panel-config";
import "./ha-form-customize";

/*
 * @appliesMixin LocalizeMixin
 */
class HaConfigCustomize extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="ha-style"></style>
      <hass-tabs-subpage
        hass="[[hass]]"
        narrow="[[narrow]]"
        route="[[route]]"
        back-path="/config"
        tabs="[[_computeTabs()]]"
        show-advanced="[[showAdvanced]]"
      >
        <div class$="[[computeClasses(isWide)]]">
          <ha-config-section is-wide="[[isWide]]">
            <span slot="header">
              [[localize('ui.panel.config.customize.picker.header')]]
            </span>
            <span slot="introduction">
              [[localize('ui.panel.config.customize.picker.introduction')]]
              <br />
              <a
                href="[[_computeDocumentationUrl(hass)]]"
                target="_blank"
                rel="noreferrer"
              >
                [[localize("ui.panel.config.customize.picker.documentation")]]
              </a>
            </span>
            <ha-entity-config
              hass="[[hass]]"
              label="[[localize('ui.panel.config.customize.picker.entity')]]"
              entities="[[entities]]"
              config="[[entityConfig]]"
            >
            </ha-entity-config>
          </ha-config-section>
        </div>
      </hass-tabs-subpage>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,
      narrow: Boolean,
      route: Object,
      showAdvanced: Boolean,
      entities: {
        type: Array,
        computed: "computeEntities(hass)",
      },

      entityConfig: {
        type: Object,
        value: {
          component: "ha-form-customize",
          computeSelectCaption: (stateObj) =>
            computeStateName(stateObj) +
            " (" +
            computeStateDomain(stateObj) +
            ")",
        },
      },
    };
  }

  computeClasses(isWide) {
    return isWide ? "content" : "content narrow";
  }

  _backTapped() {
    history.back();
  }

  _computeTabs() {
    return configSections.advanced;
  }

  computeEntities(hass) {
    return Object.keys(hass.states)
      .map((key) => hass.states[key])
      .sort(sortStatesByName);
  }

  _computeDocumentationUrl(hass) {
    return documentationUrl(
      hass,
      "/docs/configuration/customizing-devices/#customization-using-the-ui"
    );
  }
}
customElements.define("ha-config-customize", HaConfigCustomize);
