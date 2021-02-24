import { safeLoad } from "js-yaml";
import {
  css,
  CSSResultArray,
  html,
  LitElement,
  property,
  query,
} from "lit-element";
import memoizeOne from "memoize-one";
import { LocalStorage } from "../../../common/decorators/local-storage";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeObjectId } from "../../../common/entity/compute_object_id";
import { extractSearchParam } from "../../../common/url/search-params";
import "../../../components/buttons/ha-progress-button";
import "../../../components/entity/ha-entity-picker";
import "../../../components/ha-card";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-service-control";
import "../../../components/ha-service-picker";
import "../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../components/ha-yaml-editor";
import { ServiceAction } from "../../../data/script";
import { haStyle } from "../../../resources/styles";
import "../../../styles/polymer-ha-style";
import { HomeAssistant } from "../../../types";
import "../../../util/app-localstorage-document";

class HaPanelDevService extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @LocalStorage("panel-dev-service-state-service-data", true)
  private _serviceData?: ServiceAction = { service: "", target: {}, data: {} };

  @LocalStorage("panel-dev-service-state-yaml-mode", true)
  private _yamlMode = false;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  protected firstUpdated(params) {
    super.firstUpdated(params);
    const serviceParam = extractSearchParam("service");
    if (serviceParam) {
      this._serviceData = {
        service: serviceParam,
        target: {},
        data: {},
      };
    } else if (!this._serviceData?.service) {
      const domain = Object.keys(this.hass.services).sort()[0];
      const service = Object.keys(this.hass.services[domain]).sort()[0];
      this._serviceData = {
        service: `${domain}.${service}`,
        target: {},
        data: {},
      };
    }
  }

  protected render() {
    const { target, fields } = this._fields(
      this.hass.services,
      this._serviceData?.service
    );

    const isValid = this._isValid(this._serviceData, fields, target);

    return html`
      <div class="content">
        <p>
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.services.description"
          )}
        </p>

        ${this._yamlMode
          ? html`<ha-yaml-editor
              .defaultValue=${this._serviceData}
              @value-changed=${this._yamlChanged}
            ></ha-yaml-editor>`
          : html`<ha-card
              ><div>
                <ha-service-control
                  .hass=${this.hass}
                  .value=${this._serviceData}
                  .narrow=${this.narrow}
                  showAdvanced
                  @value-changed=${this._serviceChanged}
                ></ha-service-control></div
            ></ha-card>`}
      </div>
      <div class="button-row">
        <div class="buttons">
          <mwc-button @click=${this._toggleYaml}>
            ${this._yamlMode
              ? this.hass.localize(
                  "ui.panel.developer-tools.tabs.services.ui_mode"
                )
              : this.hass.localize(
                  "ui.panel.developer-tools.tabs.services.yaml_mode"
                )}
          </mwc-button>
          <mwc-button .disabled=${!isValid} raised @click=${this._callService}>
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.services.call_service"
            )}
          </mwc-button>
        </div>
      </div>

      ${(this._yamlMode ? fields : this._filterSelectorFields(fields)).length
        ? html`<div class="content">
            <ha-expansion-panel
              .header=${this._yamlMode
                ? this.hass.localize(
                    "ui.panel.developer-tools.tabs.services.all_parameters"
                  )
                : this.hass.localize(
                    "ui.panel.developer-tools.tabs.services.yaml_parameters"
                  )}
              outlined
              .expanded=${this._yamlMode}
            >
              ${this._yamlMode && target
                ? html`<h3>
                    ${this.hass.localize(
                      "ui.panel.developer-tools.tabs.services.accepts_target"
                    )}
                  </h3>`
                : ""}
              <table class="attributes">
                <tr>
                  <th>
                    ${this.hass.localize(
                      "ui.panel.developer-tools.tabs.services.column_parameter"
                    )}
                  </th>
                  <th>
                    ${this.hass.localize(
                      "ui.panel.developer-tools.tabs.services.column_description"
                    )}
                  </th>
                  <th>
                    ${this.hass.localize(
                      "ui.panel.developer-tools.tabs.services.column_example"
                    )}
                  </th>
                </tr>
                ${(this._yamlMode
                  ? fields
                  : this._filterSelectorFields(fields)
                ).map(
                  (field) => html` <tr>
                    <td><pre>${field.key}</pre></td>
                    <td>${field.description}</td>
                    <td>${field.example}</td>
                  </tr>`
                )}
              </table>
              ${this._yamlMode
                ? html`<mwc-button @click=${this._fillExampleData}
                    >${this.hass.localize(
                      "ui.panel.developer-tools.tabs.services.fill_example_data"
                    )}</mwc-button
                  >`
                : ""}
            </ha-expansion-panel>
          </div>`
        : ""}
    `;
  }

  private _filterSelectorFields = memoizeOne((fields) =>
    fields.filter((field) => !field.selector)
  );

  private _isValid = memoizeOne((serviceData, fields, target): boolean => {
    if (!serviceData?.service) {
      return false;
    }
    const domain = computeDomain(serviceData.service);
    const service = computeObjectId(serviceData.service);
    if (!domain || !service) {
      return false;
    }
    if (
      target &&
      !serviceData.target &&
      !serviceData.data?.entity_id &&
      !serviceData.data?.device_id &&
      !serviceData.data?.area_id
    ) {
      return false;
    }
    for (const field of fields) {
      if (
        field.required &&
        (!serviceData.data || serviceData.data[field.key] === undefined)
      ) {
        return false;
      }
    }
    return true;
  });

  private _fields = memoizeOne(
    (
      serviceDomains: HomeAssistant["services"],
      domainService: string | undefined
    ): { target: boolean; fields: any[] } => {
      if (!domainService) {
        return { target: false, fields: [] };
      }
      const domain = computeDomain(domainService);
      const service = computeObjectId(domainService);
      if (!(domain in serviceDomains)) {
        return { target: false, fields: [] };
      }
      if (!(service in serviceDomains[domain])) {
        return { target: false, fields: [] };
      }
      const target = "target" in serviceDomains[domain][service];
      const fields = serviceDomains[domain][service].fields;
      const result = Object.keys(fields).map((field) => {
        return { key: field, ...fields[field] };
      });

      return {
        target,
        fields: result,
      };
    }
  );

  private _callService() {
    const domain = computeDomain(this._serviceData!.service);
    const service = computeObjectId(this._serviceData!.service);
    if (!domain || !service) {
      return;
    }
    this.hass.callService(
      domain,
      service,
      this._serviceData!.data,
      this._serviceData!.target
    );
  }

  private _toggleYaml() {
    this._yamlMode = !this._yamlMode;
  }

  private _yamlChanged(ev) {
    if (!ev.detail.isValid) {
      return;
    }
    this._serviceChanged(ev);
  }

  private _serviceChanged(ev) {
    this._serviceData = ev.detail.value;
  }

  private _fillExampleData() {
    const { fields } = this._fields(
      this.hass.services,
      this._serviceData?.service
    );
    const example = {};
    fields.forEach((field) => {
      if (field.example) {
        let value = "";
        try {
          value = safeLoad(field.example);
        } catch (err) {
          value = field.example;
        }
        example[field.key] = value;
      }
    });
    this._serviceData = { ...this._serviceData!, data: example };
    this._yamlEditor?.setValue(this._serviceData);
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        .content {
          padding: 16px;
          max-width: 1200px;
          margin: auto;
        }
        .button-row {
          padding: 8px 16px;
          border-top: 1px solid var(--divider-color);
          border-bottom: 1px solid var(--divider-color);
          background: var(--card-background-color);
          position: sticky;
          bottom: 0;
          box-sizing: border-box;
          width: 100%;
        }

        .button-row .buttons {
          display: flex;
          justify-content: space-between;
          max-width: 1200px;
          margin: auto;
        }

        .attributes {
          width: 100%;
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

        .attributes td {
          padding: 4px;
          vertical-align: middle;
        }
      `,
    ];
  }
}

customElements.define("developer-tools-service", HaPanelDevService);

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-service": HaPanelDevService;
  }
}
