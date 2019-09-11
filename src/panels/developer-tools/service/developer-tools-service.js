import "@material/mwc-button";
import "@polymer/paper-input/paper-textarea";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import { ENTITY_COMPONENT_DOMAINS } from "../../../data/entity";
import "../../../components/entity/ha-entity-picker";
import "../../../components/ha-service-picker";
import "../../../resources/ha-style";
import "../../../util/app-localstorage-document";

const ERROR_SENTINEL = {};
class HaPanelDevService extends PolymerElement {
  static get template() {
    return html`
      <style include="ha-style">
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
          display: block;
          padding: 16px;
          direction: ltr;
        }

        .ha-form {
          margin-right: 16px;
          max-width: 400px;
        }

        .description {
          margin-top: 24px;
          white-space: pre-wrap;
        }

        .header {
          @apply --paper-font-title;
        }

        .attributes th {
          text-align: left;
        }

        .attributes tr {
          vertical-align: top;
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
        }

        h1 {
          white-space: normal;
        }

        td {
          padding: 4px;
        }

        .error {
          color: var(--google-red-500);
        }
      </style>

      <app-localstorage-document
        key="panel-dev-service-state-domain-service"
        data="{{domainService}}"
      >
      </app-localstorage-document>
      <app-localstorage-document
        key="[[_computeServicedataKey(domainService)]]"
        data="{{serviceData}}"
      >
      </app-localstorage-document>

      <div class="content">
        <p>
          The service dev tool allows you to call any available service in Home
          Assistant.
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
              domain-filter="[[_computeEntityDomainFilter(_domain)]]"
              allow-custom-entity
            ></ha-entity-picker>
          </template>
          <paper-textarea
            always-float-label
            label="Service Data (JSON, optional)"
            value="{{serviceData}}"
            autocapitalize="none"
            autocomplete="off"
            spellcheck="false"
          ></paper-textarea>
          <mwc-button on-click="_callService" raised disabled="[[!validJSON]]">
            Call Service
          </mwc-button>
          <template is="dom-if" if="[[!validJSON]]">
            <span class="error">Invalid JSON</span>
          </template>
        </div>

        <template is="dom-if" if="[[!domainService]]">
          <h1>Select a service to see the description</h1>
        </template>

        <template is="dom-if" if="[[domainService]]">
          <template is="dom-if" if="[[!_description]]">
            <h1>No description is available</h1>
          </template>
          <template is="dom-if" if="[[_description]]">
            <h3>[[_description]]</h3>

            <table class="attributes">
              <tr>
                <th>Parameter</th>
                <th>Description</th>
                <th>Example</th>
              </tr>
              <template is="dom-if" if="[[!_attributes.length]]">
                <tr>
                  <td colspan="3">This service takes no parameters.</td>
                </tr>
              </template>
              <template is="dom-repeat" items="[[_attributes]]" as="attribute">
                <tr>
                  <td><pre>[[attribute.key]]</pre></td>
                  <td>[[attribute.description]]</td>
                  <td>[[attribute.example]]</td>
                </tr>
              </template>
            </table>

            <template is="dom-if" if="[[_attributes.length]]">
              <mwc-button on-click="_fillExampleData">
                Fill Example Data
              </mwc-button>
            </template>
          </template>
        </template>
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
    return Object.keys(fields).map(function(field) {
      return { key: field, ...fields[field] };
    });
  }

  _computeDescription(hass, domain, service) {
    const serviceDomains = hass.services;
    if (!(domain in serviceDomains)) return undefined;
    if (!(service in serviceDomains[domain])) return undefined;
    return serviceDomains[domain][service].description;
  }

  _computeServicedataKey(domainService) {
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
      return serviceData ? JSON.parse(serviceData) : {};
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
    return ENTITY_COMPONENT_DOMAINS.includes(domain) ? domain : null;
  }

  _callService() {
    if (this.parsedJSON === ERROR_SENTINEL) {
      // eslint-disable-next-line
      alert(`Error parsing JSON: ${this.serviceData}`);
    }

    this.hass.callService(this._domain, this._service, this.parsedJSON);
  }

  _fillExampleData() {
    const example = {};
    this._attributes.forEach((attribute) => {
      example[attribute.key] = attribute.example;
    });
    this.serviceData = JSON.stringify(example, null, 2);
  }

  _entityPicked(ev) {
    this.serviceData = JSON.stringify(
      { ...this.parsedJSON, entity_id: ev.target.value },
      null,
      2
    );
  }
}

customElements.define("developer-tools-service", HaPanelDevService);
