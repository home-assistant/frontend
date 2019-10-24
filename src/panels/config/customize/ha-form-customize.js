import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import hassAttributeUtil from "../../../util/hass-attributes-util";
import "./ha-form-customize-attributes";

import { computeStateDomain } from "../../../common/entity/compute_state_domain";

class HaFormCustomize extends PolymerElement {
  static get template() {
    return html`
      <style include="iron-flex ha-style ha-form-style">
        .warning {
          color: red;
        }

        .attributes-text {
          padding-left: 20px;
        }
      </style>
      <template
        is="dom-if"
        if="[[computeShowWarning(localConfig, globalConfig)]]"
      >
        <div class="warning">
          [[localize('ui.panel.config.customize.warning.include_sentence')]]
          <a
            href="https://www.home-assistant.io/docs/configuration/customizing-devices/#customization-using-the-ui"
            target="_blank"
            >[[localize('ui.panel.config.customize.warning.include_link')]]</a
          >.<br />
          [[localize('ui.panel.config.customize.warning.not_applied')]]
        </div>
      </template>
      <template is="dom-if" if="[[hasLocalAttributes]]">
        <h4 class="attributes-text">
          [[localize('ui.panel.config.customize.attributes_customize')]]<br />
        </h4>
        <ha-form-customize-attributes
          attributes="{{localAttributes}}"
        ></ha-form-customize-attributes>
      </template>
      <template is="dom-if" if="[[hasGlobalAttributes]]">
        <h4 class="attributes-text">
          [[localize('ui.panel.config.customize.attributes_outside')]]<br />
          [[localize('ui.panel.config.customize.different_include')]]
        </h4>
        <ha-form-customize-attributes
          attributes="{{globalAttributes}}"
        ></ha-form-customize-attributes>
      </template>
      <template is="dom-if" if="[[hasExistingAttributes]]">
        <h4 class="attributes-text">
          [[localize('ui.panel.config.customize.attributes_set')]]<br />
          [[localize('ui.panel.config.customize.attributes_override')]]
        </h4>
        <ha-form-customize-attributes
          attributes="{{existingAttributes}}"
        ></ha-form-customize-attributes>
      </template>
      <template is="dom-if" if="[[hasNewAttributes]]">
        <h4 class="attributes-text">
          [[localize('ui.panel.config.customize.attributes_not_set')]]
        </h4>
        <ha-form-customize-attributes
          attributes="{{newAttributes}}"
        ></ha-form-customize-attributes>
      </template>
      <div class="form-group">
        <paper-dropdown-menu
          label="[[localize('ui.panel.config.customize.pick_attribute')]]"
          class="flex"
          dynamic-align=""
        >
          <paper-listbox
            slot="dropdown-content"
            selected="{{selectedNewAttribute}}"
          >
            <template
              is="dom-repeat"
              items="[[newAttributesOptions]]"
              as="option"
            >
              <paper-item>[[option]]</paper-item>
            </template>
          </paper-listbox>
        </paper-dropdown-menu>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      entity: Object,

      localAttributes: {
        type: Array,
        computed: "computeLocalAttributes(localConfig)",
      },
      hasLocalAttributes: Boolean,

      globalAttributes: {
        type: Array,
        computed: "computeGlobalAttributes(localConfig, globalConfig)",
      },
      hasGlobalAttributes: Boolean,

      existingAttributes: {
        type: Array,
        computed:
          "computeExistingAttributes(localConfig, globalConfig, entity)",
      },
      hasExistingAttributes: Boolean,

      newAttributes: {
        type: Array,
        value: [],
      },
      hasNewAttributes: Boolean,

      newAttributesOptions: Array,
      selectedNewAttribute: {
        type: Number,
        value: -1,
        observer: "selectedNewAttributeObserver",
      },

      localConfig: Object,
      globalConfig: Object,
    };
  }

  static get observers() {
    return [
      "attributesObserver(localAttributes.*, globalAttributes.*, existingAttributes.*, newAttributes.*)",
    ];
  }

  _initOpenObject(key, value, secondary, config) {
    return {
      attribute: key,
      value: value,
      closed: false,
      domain: computeStateDomain(this.entity),
      secondary: secondary,
      description: key,
      ...config,
    };
  }

  loadEntity(entity) {
    this.entity = entity;
    return this.hass
      .callApi("GET", "config/customize/config/" + entity.entity_id)
      .then((data) => {
        this.localConfig = data.local;
        this.globalConfig = data.global;
        this.newAttributes = [];
      });
  }

  saveEntity() {
    const data = {};
    const attrs = this.localAttributes.concat(
      this.globalAttributes,
      this.existingAttributes,
      this.newAttributes
    );
    attrs.forEach((attr) => {
      if (attr.closed || attr.secondary || !attr.attribute || !attr.value)
        return;
      const value = attr.type === "json" ? JSON.parse(attr.value) : attr.value;
      if (!value) return;
      data[attr.attribute] = value;
    });

    const objectId = this.entity.entity_id;
    return this.hass.callApi(
      "POST",
      "config/customize/config/" + objectId,
      data
    );
  }

  _computeSingleAttribute(key, value, secondary) {
    const config = hassAttributeUtil.LOGIC_STATE_ATTRIBUTES[key] || {
      type: hassAttributeUtil.UNKNOWN_TYPE,
    };
    return this._initOpenObject(
      key,
      config.type === "json" ? JSON.stringify(value) : value,
      secondary,
      config
    );
  }

  _computeAttributes(config, keys, secondary) {
    return keys.map((key) =>
      this._computeSingleAttribute(key, config[key], secondary)
    );
  }

  computeLocalAttributes(localConfig) {
    if (!localConfig) return [];
    const localKeys = Object.keys(localConfig);
    const result = this._computeAttributes(localConfig, localKeys, false);
    return result;
  }

  computeGlobalAttributes(localConfig, globalConfig) {
    if (!localConfig || !globalConfig) return [];
    const localKeys = Object.keys(localConfig);
    const globalKeys = Object.keys(globalConfig).filter(
      (key) => !localKeys.includes(key)
    );
    return this._computeAttributes(globalConfig, globalKeys, true);
  }

  computeExistingAttributes(localConfig, globalConfig, entity) {
    if (!localConfig || !globalConfig || !entity) return [];
    const localKeys = Object.keys(localConfig);
    const globalKeys = Object.keys(globalConfig);
    const entityKeys = Object.keys(entity.attributes).filter(
      (key) => !localKeys.includes(key) && !globalKeys.includes(key)
    );
    return this._computeAttributes(entity.attributes, entityKeys, true);
  }

  computeShowWarning(localConfig, globalConfig) {
    if (!localConfig || !globalConfig) return false;
    return Object.keys(localConfig).some(
      (key) =>
        JSON.stringify(globalConfig[key]) !== JSON.stringify(localConfig[key])
    );
  }

  filterFromAttributes(attributes) {
    return (key) =>
      !attributes ||
      attributes.every((attr) => attr.attribute !== key || attr.closed);
  }

  getNewAttributesOptions(
    localAttributes,
    globalAttributes,
    existingAttributes,
    newAttributes
  ) {
    const knownKeys = Object.keys(hassAttributeUtil.LOGIC_STATE_ATTRIBUTES)
      .filter((key) => {
        const conf = hassAttributeUtil.LOGIC_STATE_ATTRIBUTES[key];
        return (
          conf &&
          (!conf.domains ||
            !this.entity ||
            conf.domains.includes(computeStateDomain(this.entity)))
        );
      })
      .filter(this.filterFromAttributes(localAttributes))
      .filter(this.filterFromAttributes(globalAttributes))
      .filter(this.filterFromAttributes(existingAttributes))
      .filter(this.filterFromAttributes(newAttributes));
    return knownKeys.sort().concat("Other");
  }

  selectedNewAttributeObserver(selected) {
    if (selected < 0) return;
    const option = this.newAttributesOptions[selected];
    if (selected === this.newAttributesOptions.length - 1) {
      // The "Other" option.
      const attr = this._initOpenObject("", "", false /* secondary */, {
        type: hassAttributeUtil.ADD_TYPE,
      });
      this.push("newAttributes", attr);
      this.selectedNewAttribute = -1;
      return;
    }
    let result = this.localAttributes.findIndex(
      (attr) => attr.attribute === option
    );
    if (result >= 0) {
      this.set("localAttributes." + result + ".closed", false);
      this.selectedNewAttribute = -1;
      return;
    }
    result = this.globalAttributes.findIndex(
      (attr) => attr.attribute === option
    );
    if (result >= 0) {
      this.set("globalAttributes." + result + ".closed", false);
      this.selectedNewAttribute = -1;
      return;
    }
    result = this.existingAttributes.findIndex(
      (attr) => attr.attribute === option
    );
    if (result >= 0) {
      this.set("existingAttributes." + result + ".closed", false);
      this.selectedNewAttribute = -1;
      return;
    }
    result = this.newAttributes.findIndex((attr) => attr.attribute === option);
    if (result >= 0) {
      this.set("newAttributes." + result + ".closed", false);
      this.selectedNewAttribute = -1;
      return;
    }
    const attr = this._computeSingleAttribute(
      option,
      "",
      false /* secondary */
    );
    this.push("newAttributes", attr);
    this.selectedNewAttribute = -1;
  }

  attributesObserver() {
    this.hasLocalAttributes =
      this.localAttributes && this.localAttributes.some((attr) => !attr.closed);
    this.hasGlobalAttributes =
      this.globalAttributes &&
      this.globalAttributes.some((attr) => !attr.closed);
    this.hasExistingAttributes =
      this.existingAttributes &&
      this.existingAttributes.some((attr) => !attr.closed);
    this.hasNewAttributes =
      this.newAttributes && this.newAttributes.some((attr) => !attr.closed);
    this.newAttributesOptions = this.getNewAttributesOptions(
      this.localAttributes,
      this.globalAttributes,
      this.existingAttributes,
      this.newAttributes
    );
  }
}
customElements.define("ha-form-customize", HaFormCustomize);
