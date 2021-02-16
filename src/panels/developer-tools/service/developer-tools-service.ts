import { css, CSSResultArray, html, LitElement, property } from "lit-element";
import { LocalStorage } from "../../../common/decorators/local-storage";
import "../../../components/buttons/ha-progress-button";
import "../../../components/entity/ha-entity-picker";
import "../../../components/ha-card";
import "../../../components/ha-yaml-editor";
import "../../../components/ha-service-picker";
import "../../../styles/polymer-ha-style";
import { HomeAssistant } from "../../../types";
import "../../../util/app-localstorage-document";
import "../../../components/ha-service-control";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeObjectId } from "../../../common/entity/compute_object_id";
import { haStyle } from "../../../resources/styles";
import memoizeOne from "memoize-one";
import "../../../components/ha-expansion-panel";

class HaPanelDevService extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @LocalStorage("panel-dev-service-state-service-data", true)
  private _serviceData;

  @LocalStorage("panel-dev-service-state-yaml-mode", true)
  private _yamlMode = false;

  protected render() {
    const fields = this._fields(
      this.hass.services,
      this._serviceData?.service,
      !this._yamlMode
    );

    return html`
      <div class="content">
        <p>
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.services.description"
          )}
        </p>

        ${this._yamlMode
          ? html` <ha-yaml-editor
              .defaultValue=${this._serviceData}
              @value-changed=${this._yamlChanged}
            ></ha-yaml-editor>`
          : html`<ha-service-control
              .hass=${this.hass}
              .value=${this._serviceData}
              @value-changed=${this._serviceChanged}
            ></ha-service-control>`}

        <div class="button-row">
          <mwc-button raised @click=${this._callService}
            >${this.hass.localize(
              "ui.panel.developer-tools.tabs.services.call_service"
            )}</mwc-button
          >
          <mwc-button @click=${this._toggleYaml}
            >${this._yamlMode
              ? "Go to UI mode"
              : "Toggle YAML mode"}</mwc-button
          >
        </div>

        ${fields.length
          ? html` <ha-expansion-panel
              .header=${this._yamlMode
                ? "All available parameters"
                : "Advanced parameters (only available in YAML mode)"}
              outlined
              .expanded=${this._yamlMode}
            >
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
                ${fields.map(
                  (field) => html` <tr>
                    <td><pre>${field.key}</pre></td>
                    <td>${field.description}</td>
                    <td>${field.example}</td>
                  </tr>`
                )}
              </table>
            </ha-expansion-panel>`
          : ""}
      </div>
    `;
  }

  private _fields = memoizeOne(
    (
      serviceDomains: HomeAssistant["services"],
      domainService: string,
      hideSelectorField: boolean
    ) => {
      const domain = computeDomain(domainService);
      const service = computeObjectId(domainService);
      if (!(domain in serviceDomains)) return [];
      if (!(service in serviceDomains[domain])) return [];

      const fields = serviceDomains[domain][service].fields;
      const result = Object.keys(fields).map((field) => {
        return { key: field, ...fields[field] };
      });

      if (hideSelectorField) {
        return result.filter((field) => !field.selector);
      }
      if ("target" in serviceDomains[domain][service]) {
        return [
          {
            key: "target",
            description:
              "Target for this call, can contain area_id, device_id and or entity_id. Should be used outside of `data`.",
            example: "{entity_id: [light.lamp, switch.toggle]}",
          },
          ...result,
        ];
      }
      return result;
    }
  );

  private _callService() {
    const domain = computeDomain(this._serviceData.service);
    const service = computeObjectId(this._serviceData.service);
    this.hass.callService(
      domain,
      service,
      this._serviceData.data,
      this._serviceData.target
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

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        .content {
          padding: 16px;
        }
        .button-row {
          margin: 8px 0;
        }
        .button-row mwc-button {
          padding-right: 8px;
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
