import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { safeDump, safeLoad } from "js-yaml";
import { computeRTL } from "../../../common/util/compute_rtl";
import "../../../components/buttons/ha-progress-button";
import "../../../components/entity/ha-entity-picker";
import "../../../components/ha-code-editor";
import "../../../components/ha-service-picker";
import "../../../components/ha-card";
import { ENTITY_COMPONENT_DOMAINS } from "../../../data/entity";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import LocalizeMixin from "../../../mixins/localize-mixin";
import "../../../styles/polymer-ha-style";
import "../../../util/app-localstorage-document";

const ERROR_SENTINEL = {};
/*
 * @appliesMixin LocalizeMixin
 */
class HaPanelDevService extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="ha-style">
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
          display: block;
          padding: 16px;
        }

        .ha-form {
          margin-right: 16px;
          max-width: 400px;
        }

        ha-progress-button {
          margin-top: 8px;
        }

        ha-card {
          margin-top: 12px;
        }

        .description {
          margin-top: 12px;
          white-space: pre-wrap;
        }

        .attributes th {
          text-align: left;
          background-color: var(--card-background-color);
          border-bottom: 1px solid var(--primary-text-color);
        }

        :host([rtl]) .attributes th {
          text-align: right;
        }

        .attributes tr {
          vertical-align: top;
          direction: ltr;
        }

        .attributes tr:nth-child(odd) {
          background-color: var(--table-row-background-color, #eee);
        }

        .attributes tr:nth-child(even) {
          background-color: var(--table-row-alternative-background-color, #eee);
        }

        .attributes td:nth-child(3) {
          white-space: pre-wrap;
          word-break: break-word;
        }

        pre {
          margin: 0;
          font-family: var(--code-font-family, monospace);
        }

        td {
          padding: 4px;
        }

        .error {
          color: var(--error-color);
        }

        :host([rtl]) .desc-container {
          text-align: right;
        }

        :host([rtl]) .desc-container h3 {
          direction: ltr;
        }
      </style>

      <app-localstorage-document
        key="panel-dev-service-state-domain-service"
        data="{{domainService}}"
      >
      </app-localstorage-document>
      <app-localstorage-document
        key="[[_computeServiceDataKey(domainService)]]"
        data="{{serviceData}}"
      >
      </app-localstorage-document>

      <div class="content">
        <p>
          [[localize('ui.panel.developer-tools.tabs.services.description')]]
        </p>

        <div class="ha-form">
          <ha-service-picker
            hass="[[hass]]"
            value="{{domainService}}"
          ></ha-service-picker>
          <template is="dom-if" if="[[_computeHasEntity(_attributes)]]">
            <ha-entity-picker
              hass="[[hass]]"
              value="[[_computeEntityValue(parsedJSON)]]"
              on-change="_entityPicked"
              disabled="[[!validJSON]]"
              include-domains="[[_computeEntityDomainFilter(_domain)]]"
              allow-custom-entity
            ></ha-entity-picker>
          </template>
          <p>[[localize('ui.panel.developer-tools.tabs.services.data')]]</p>
          <ha-code-editor
            mode="yaml"
            value="[[serviceData]]"
            error="[[!validJSON]]"
            on-value-changed="_yamlChanged"
          ></ha-code-editor>
          <ha-progress-button
            on-click="_callService"
            raised
            disabled="[[!validJSON]]"
          >
            [[localize('ui.panel.developer-tools.tabs.services.call_service')]]
          </ha-progress-button>
        </div>

        <ha-card>
          <div class="card-header">
            <template is="dom-if" if="[[!domainService]]">
                [[localize('ui.panel.developer-tools.tabs.services.select_service')]]
            </template>

            <template is="dom-if" if="[[domainService]]">
              <template is="dom-if" if="[[!_description]]">
                [[localize('ui.panel.developer-tools.tabs.services.no_description')]]
              </template>
              <template is="dom-if" if="[[_description]]">
                [[_description]]
              </template>
            </template>
          </div>
          <div class="card-content">
            <template is="dom-if" if="[[_description]]">
              <template is="dom-if" if="[[!_attributes.length]]">
                [[localize('ui.panel.developer-tools.tabs.services.no_parameters')]]
              </template>

              <template is="dom-if" if="[[_attributes.length]]">
                <table class="attributes">
                  <tr>
                    <th>
                      [[localize('ui.panel.developer-tools.tabs.services.column_parameter')]]
                    </th>
                    <th>
                      [[localize('ui.panel.developer-tools.tabs.services.column_description')]]
                    </th>
                    <th>
                      [[localize('ui.panel.developer-tools.tabs.services.column_example')]]
                    </th>
                  </tr>
                  <template is="dom-repeat" items="[[_attributes]]" as="attribute">
                    <tr>
                      <td><pre>[[attribute.key]]</pre></td>
                      <td>[[attribute.description]]</td>
                      <td>[[attribute.example]]</td>
                    </tr>
                  </template>
                </table>
              </template>

              <template is="dom-if" if="[[_attributes.length]]">
                <mwc-button on-click="_fillExampleData">
                  [[localize('ui.panel.developer-tools.tabs.services.fill_example_data')]]
                </mwc-button>
              </template>
            </template>
          </template>
          </div>
        </ha-card>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      domainService: {
        type: String,
        observer: "_domainServiceChanged",
      },

      _domain: {
        type: String,
        computed: "_computeDomain(domainService)",
      },

      _service: {
        type: String,
        computed: "_computeService(domainService)",
      },

      serviceData: {
        type: String,
        value: "",
      },

      parsedJSON: {
        type: Object,
        computed: "_computeParsedServiceData(serviceData)",
      },

      validJSON: {
        type: Boolean,
        computed: "_computeValidJSON(parsedJSON)",
      },

      _attributes: {
        type: Array,
        computed: "_computeAttributesArray(hass, _domain, _service)",
      },

      _description: {
        type: String,
        computed: "_computeDescription(hass, _domain, _service)",
      },

      rtl: {
        reflectToAttribute: true,
        computed: "_computeRTL(hass)",
      },
    };
  }

  _domainServiceChanged() {
    this.serviceData = "";
  }

  _computeAttributesArray(hass, domain, service) {
    const serviceDomains = hass.services;
    if (!(domain in serviceDomains)) return [];
    if (!(service in serviceDomains[domain])) return [];

    const fields = serviceDomains[domain][service].fields;
    return Object.keys(fields).map(function (field) {
      return { key: field, ...fields[field] };
    });
  }

  _computeDescription(hass, domain, service) {
    const serviceDomains = hass.services;
    if (!(domain in serviceDomains)) return undefined;
    if (!(service in serviceDomains[domain])) return undefined;
    return serviceDomains[domain][service].description;
  }

  _computeServiceDataKey(domainService) {
    return `panel-dev-service-state-servicedata.${domainService}`;
  }

  _computeDomain(domainService) {
    return domainService.split(".", 1)[0];
  }

  _computeService(domainService) {
    return domainService.split(".", 2)[1] || null;
  }

  _computeParsedServiceData(serviceData) {
    try {
      return serviceData.trim() ? safeLoad(serviceData) : {};
    } catch (err) {
      return ERROR_SENTINEL;
    }
  }

  _computeValidJSON(parsedJSON) {
    return parsedJSON !== ERROR_SENTINEL;
  }

  _computeHasEntity(attributes) {
    return attributes.some((attr) => attr.key === "entity_id");
  }

  _computeEntityValue(parsedJSON) {
    return parsedJSON === ERROR_SENTINEL ? "" : parsedJSON.entity_id;
  }

  _computeEntityDomainFilter(domain) {
    return ENTITY_COMPONENT_DOMAINS.includes(domain) ? [domain] : null;
  }

  _callService(ev) {
    const button = ev.target;
    if (this.parsedJSON === ERROR_SENTINEL) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.developer-tools.tabs.services.alert_parsing_yaml",
          "data",
          this.serviceData
        ),
      });
      button.actionError();
      return;
    }
    this.hass
      .callService(this._domain, this._service, this.parsedJSON)
      .then(() => {
        button.actionSuccess();
      })
      .catch(() => {
        button.actionError();
      });
  }

  _fillExampleData() {
    const example = {};
    this._attributes.forEach((attribute) => {
      if (attribute.example) {
        let value = "";
        try {
          value = safeLoad(attribute.example);
        } catch (err) {
          value = attribute.example;
        }
        example[attribute.key] = value;
      }
    });
    this.serviceData = safeDump(example);
  }

  _entityPicked(ev) {
    this.serviceData = safeDump({
      ...this.parsedJSON,
      entity_id: ev.target.value,
    });
  }

  _yamlChanged(ev) {
    this.serviceData = ev.detail.value;
  }

  _computeRTL(hass) {
    return computeRTL(hass);
  }
}

customElements.define("developer-tools-service", HaPanelDevService);
