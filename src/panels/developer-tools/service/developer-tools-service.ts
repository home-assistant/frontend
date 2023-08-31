import { mdiHelpCircle } from "@mdi/js";
import { ERR_CONNECTION_LOST } from "home-assistant-js-websocket";
import { load } from "js-yaml";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { storage } from "../../../common/decorators/storage";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeObjectId } from "../../../common/entity/compute_object_id";
import { hasTemplate } from "../../../common/string/has-template";
import { extractSearchParam } from "../../../common/url/search-params";
import { HaProgressButton } from "../../../components/buttons/ha-progress-button";
import { LocalizeFunc } from "../../../common/translations/localize";

import "../../../components/entity/ha-entity-picker";
import "../../../components/ha-card";
import "../../../components/ha-alert";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-icon-button";
import "../../../components/ha-service-control";
import "../../../components/ha-service-picker";
import "../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../components/ha-yaml-editor";
import { forwardHaptic } from "../../../data/haptics";
import { Action, ServiceAction } from "../../../data/script";
import {
  callExecuteScript,
  serviceCallWillDisconnect,
} from "../../../data/service";
import { haStyle } from "../../../resources/styles";
import "../../../styles/polymer-ha-style";
import { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";

class HaPanelDevService extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _uiAvailable = true;

  @state() private _response?: Record<string, any>;

  @state() private _error?: string;

  private _yamlValid = true;

  @storage({
    key: "panel-dev-service-state-service-data",
    state: true,
    subscribe: false,
  })
  private _serviceData?: ServiceAction = { service: "", target: {}, data: {} };

  @storage({
    key: "panel-dev-service-state-yaml-mode",
    state: true,
    subscribe: false,
  })
  private _yamlMode = false;

  @query("#yaml-editor") private _yamlEditor?: HaYamlEditor;

  protected firstUpdated(params) {
    super.firstUpdated(params);
    this.hass.loadBackendTranslation("services");
    this.hass.loadBackendTranslation("selector");

    const serviceParam = extractSearchParam("service");
    if (serviceParam) {
      this._serviceData = {
        service: serviceParam,
        target: {},
        data: {},
      };
      if (this._yamlMode) {
        this.updateComplete.then(
          () => this._yamlEditor?.setValue(this._serviceData)
        );
      }
    } else if (!this._serviceData?.service) {
      const domain = Object.keys(this.hass.services).sort()[0];
      const service = Object.keys(this.hass.services[domain]).sort()[0];
      this._serviceData = {
        service: `${domain}.${service}`,
        target: {},
        data: {},
      };
      if (this._yamlMode) {
        this.updateComplete.then(
          () => this._yamlEditor?.setValue(this._serviceData)
        );
      }
    }
    this._checkUiSupported();
  }

  protected render() {
    const { target, fields } = this._fields(
      this.hass.services,
      this._serviceData?.service
    );

    const domain = this._serviceData?.service
      ? computeDomain(this._serviceData?.service)
      : undefined;

    const serviceName = this._serviceData?.service
      ? computeObjectId(this._serviceData?.service)
      : undefined;

    return html`
      <div class="content">
        <p>
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.services.description"
          )}
        </p>
        <ha-card>
          ${this._yamlMode
            ? html`<div class="card-content">
                <ha-service-picker
                  .hass=${this.hass}
                  .value=${this._serviceData?.service}
                  @value-changed=${this._serviceChanged}
                ></ha-service-picker>
                <ha-yaml-editor
                  id="yaml-editor"
                  .hass=${this.hass}
                  .defaultValue=${this._serviceData}
                  @value-changed=${this._yamlChanged}
                ></ha-yaml-editor>
              </div>`
            : html`
                <ha-service-control
                  .hass=${this.hass}
                  .value=${this._serviceData}
                  .narrow=${this.narrow}
                  showAdvanced
                  @value-changed=${this._serviceDataChanged}
                  class="card-content"
                ></ha-service-control>
              `}
          ${this._error !== undefined
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing}
        </ha-card>
      </div>
      <div class="button-row">
        <div class="buttons">
          <div class="switch-mode-container">
            <mwc-button
              @click=${this._toggleYaml}
              .disabled=${!this._uiAvailable}
            >
              ${this._yamlMode
                ? this.hass.localize(
                    "ui.panel.developer-tools.tabs.services.ui_mode"
                  )
                : this.hass.localize(
                    "ui.panel.developer-tools.tabs.services.yaml_mode"
                  )}
            </mwc-button>
            ${!this._uiAvailable
              ? html`<span class="error"
                  >${this.hass.localize(
                    "ui.panel.developer-tools.tabs.services.no_template_ui_support"
                  )}</span
                >`
              : ""}
          </div>
          <ha-progress-button raised @click=${this._callService}>
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.services.call_service"
            )}
          </ha-progress-button>
        </div>
      </div>
      ${this._response
        ? html`<div class="content">
            <ha-card
              .header=${this.hass.localize(
                "ui.panel.developer-tools.tabs.services.response"
              )}
            >
              <div class="card-content">
                <ha-yaml-editor
                  readOnly
                  autoUpdate
                  .value=${this._response}
                ></ha-yaml-editor>
              </div>
            </ha-card>
          </div>`
        : nothing}
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
              ${this._yamlMode
                ? html`<div class="description">
                    <h3>
                      ${target
                        ? html`
                            ${this.hass.localize(
                              "ui.panel.developer-tools.tabs.services.accepts_target"
                            )}
                          `
                        : ""}
                    </h3>
                    ${this._serviceData?.service
                      ? html` <a
                          href=${documentationUrl(
                            this.hass,
                            "/integrations/" +
                              computeDomain(this._serviceData?.service)
                          )}
                          title=${this.hass.localize(
                            "ui.components.service-control.integration_doc"
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ha-icon-button
                            class="help-icon"
                            .path=${mdiHelpCircle}
                            .label=${this.hass!.localize("ui.common.help")}
                          ></ha-icon-button>
                        </a>`
                      : ""}
                  </div>`
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
                  (field) =>
                    html` <tr>
                      <td><pre>${field.key}</pre></td>
                      <td>
                        ${this.hass.localize(
                          `component.${domain}.services.${serviceName}.fields.${field.key}.description`
                        ) || field.description}
                      </td>
                      <td>
                        ${this.hass.localize(
                          `component.${domain}.services.${serviceName}.fields.${field.key}.example`
                        ) || field.example}
                      </td>
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

  private _validateServiceData = (
    serviceData,
    fields,
    target,
    yamlMode: boolean,
    localize: LocalizeFunc
  ): string | undefined => {
    const errorCategory = yamlMode ? "yaml" : "ui";
    if (!serviceData?.service) {
      return localize(
        `ui.panel.developer-tools.tabs.services.errors.${errorCategory}.no_service`
      );
    }
    const domain = computeDomain(serviceData.service);
    const service = computeObjectId(serviceData.service);
    if (!domain || !service) {
      return localize(
        `ui.panel.developer-tools.tabs.services.errors.${errorCategory}.invalid_service`
      );
    }
    if (
      target &&
      !serviceData.target &&
      !serviceData.data?.entity_id &&
      !serviceData.data?.device_id &&
      !serviceData.data?.area_id
    ) {
      return localize(
        `ui.panel.developer-tools.tabs.services.errors.${errorCategory}.no_target`
      );
    }
    for (const field of fields) {
      if (
        field.required &&
        (!serviceData.data || serviceData.data[field.key] === undefined)
      ) {
        return localize(
          `ui.panel.developer-tools.tabs.services.errors.${errorCategory}.missing_required_field`,
          "key",
          field.key
        );
      }
    }
    return undefined;
  };

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
      const result = Object.keys(fields).map((field) => ({
        key: field,
        ...fields[field],
      }));

      return {
        target,
        fields: result,
      };
    }
  );

  private async _callService(ev) {
    const button = ev.currentTarget as HaProgressButton;

    if (this._yamlMode && !this._yamlValid) {
      forwardHaptic("failure");
      button.actionError();
      this._error = this.hass.localize(
        "ui.panel.developer-tools.tabs.services.errors.yaml.invalid_yaml"
      );
      return;
    }

    const { target, fields } = this._fields(
      this.hass.services,
      this._serviceData?.service
    );

    this._error = this._validateServiceData(
      this._serviceData,
      fields,
      target,
      this._yamlMode,
      this.hass.localize
    );

    if (this._error !== undefined) {
      forwardHaptic("failure");
      button.actionError();
      return;
    }
    const [domain, service] = this._serviceData!.service!.split(".", 2);
    const script: Action[] = [];
    if (
      this.hass.services?.[domain]?.[service] &&
      "response" in this.hass.services[domain][service]
    ) {
      script.push({
        ...this._serviceData!,
        response_variable: "service_result",
      });
      script.push({ stop: "done", response_variable: "service_result" });
    } else {
      script.push(this._serviceData!);
    }
    try {
      this._response = (await callExecuteScript(this.hass, script)).response;
    } catch (err: any) {
      if (
        err.error?.code === ERR_CONNECTION_LOST &&
        serviceCallWillDisconnect(domain, service)
      ) {
        return;
      }
      forwardHaptic("failure");
      button.actionError();
      this._error =
        this.hass.localize(
          "ui.notification_toast.service_call_failed",
          "service",
          this._serviceData!.service!
        ) + ` ${err.message}`;
      return;
    }
    button.actionSuccess();
  }

  private _toggleYaml() {
    this._yamlMode = !this._yamlMode;
    this._yamlValid = true;
    this._error = undefined;
  }

  private _yamlChanged(ev) {
    if (!ev.detail.isValid) {
      this._yamlValid = false;
      return;
    }
    this._yamlValid = true;
    this._serviceDataChanged(ev);
  }

  private _checkUiSupported() {
    const fields = this._fields(
      this.hass.services,
      this._serviceData?.service
    ).fields;
    if (
      this._serviceData &&
      (Object.entries(this._serviceData).some(
        ([key, val]) => key !== "data" && hasTemplate(val)
      ) ||
        (this._serviceData.data &&
          Object.entries(this._serviceData.data).some(([key, val]) => {
            const field = fields.find((f) => f.key === key);
            if (
              field?.selector &&
              ("template" in field.selector || "object" in field.selector)
            ) {
              return false;
            }
            return hasTemplate(val);
          })))
    ) {
      this._yamlMode = true;
      this._uiAvailable = false;
    } else {
      this._uiAvailable = true;
    }
  }

  private _serviceDataChanged(ev) {
    if (this._serviceData?.service !== ev.detail.value.service) {
      this._error = undefined;
    }
    this._serviceData = ev.detail.value;
    this._checkUiSupported();
  }

  private _serviceChanged(ev) {
    ev.stopPropagation();
    this._serviceData = { service: ev.detail.value || "", data: {} };
    this._response = undefined;
    this._error = undefined;
    this._yamlEditor?.setValue(this._serviceData);
    this._checkUiSupported();
  }

  private _fillExampleData() {
    const { fields } = this._fields(
      this.hass.services,
      this._serviceData?.service
    );
    const domain = this._serviceData?.service
      ? computeDomain(this._serviceData?.service)
      : undefined;

    const serviceName = this._serviceData?.service
      ? computeObjectId(this._serviceData?.service)
      : undefined;

    const example = {};
    fields.forEach((field) => {
      if (field.example) {
        let value: any = "";
        try {
          value = load(field.example);
        } catch (err: any) {
          value =
            this.hass.localize(
              `component.${domain}.services.${serviceName}.fields.${field.key}.example`
            ) || field.example;
        }
        example[field.key] = value;
      }
    });
    this._serviceData = { ...this._serviceData!, data: example };
    this._yamlEditor?.setValue(this._serviceData);
    this._checkUiSupported();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          padding: 16px;
          padding: max(16px, env(safe-area-inset-top))
            max(16px, env(safe-area-inset-right))
            max(16px, env(safe-area-inset-bottom))
            max(16px, env(safe-area-inset-left));
          max-width: 1200px;
          margin: auto;
        }
        .button-row {
          padding: 8px 16px;
          padding: max(8px, env(safe-area-inset-top))
            max(16px, env(safe-area-inset-right))
            max(8px, env(safe-area-inset-bottom))
            max(16px, env(safe-area-inset-left));
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
        .switch-mode-container {
          display: flex;
          align-items: center;
        }
        .switch-mode-container .error {
          margin-left: 8px;
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

        .help-icon {
          color: var(--secondary-text-color);
        }
        .description {
          justify-content: space-between;
          display: flex;
          align-items: center;
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
