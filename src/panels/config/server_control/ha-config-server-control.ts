import "@material/mwc-button";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { isServiceLoaded } from "../../../common/config/is_service_loaded";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-card";
import { checkCoreConfig } from "../../../data/core";
import "../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";

const reloadableDomains = [
  "group",
  "automation",
  "script",
  "scene",
  "person",
  "zone",
  "input_boolean",
  "input_text",
  "input_number",
  "input_datetime",
  "input_select",
  "template",
  "universal",
  "rest",
  "command_line",
  "filter",
  "statistics",
  "generic",
  "generic_thermostat",
  "homekit",
  "min_max",
  "history_stats",
  "trend",
  "ping",
  "filesize",
];

@customElement("ha-config-server-control")
export class HaConfigServerControl extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean, attribute: "narrow", reflect: true })
  public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public showAdvanced!: boolean;

  @internalProperty() private _validating = false;

  private _validateLog = "";

  private _isValid: boolean | null = null;

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        back-path="/config"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${configSections.general}
        .showAdvanced=${this.showAdvanced}
      >
        <ha-config-section
          ?side-by-side=${!this.showAdvanced}
          .narrow=${this.narrow}
          .isWide=${this.isWide}
        >
          <div slot="header">
            ${this.hass.localize("ui.panel.config.server_control.caption")}
          </div>
          <div slot="introduction">
            ${this.hass.localize("ui.panel.config.server_control.description")}
          </div>
          <div class="content">
            ${this.showAdvanced
              ? html`
                  <ha-card
                    class="validate-card"
                    header=${this.hass.localize(
                      "ui.panel.config.server_control.section.validation.heading"
                    )}
                  >
                    <div class="card-content">
                      ${this.hass.localize(
                        "ui.panel.config.server_control.section.validation.introduction"
                      )}
                      ${!this._validateLog
                        ? html`
                            <div
                              class="validate-container layout vertical center-center"
                            >
                              ${!this._validating
                                ? html`
                                    ${this._isValid
                                      ? html` <div
                                          class="validate-result"
                                          id="result"
                                        >
                                          ${this.hass.localize(
                                            "ui.panel.config.server_control.section.validation.valid"
                                          )}
                                        </div>`
                                      : ""}
                                    <mwc-button
                                      raised
                                      @click=${this._validateConfig}
                                    >
                                      ${this.hass.localize(
                                        "ui.panel.config.server_control.section.validation.check_config"
                                      )}
                                    </mwc-button>
                                  `
                                : html`
                                    <ha-circular-progress
                                      active
                                    ></ha-circular-progress>
                                  `}
                            </div>
                          `
                        : html`
                            <div class="config-invalid">
                              <span class="text">
                                ${this.hass.localize(
                                  "ui.panel.config.server_control.section.validation.invalid"
                                )}
                              </span>
                              <mwc-button raised @click=${this._validateConfig}>
                                ${this.hass.localize(
                                  "ui.panel.config.server_control.section.validation.check_config"
                                )}
                              </mwc-button>
                            </div>
                            <div id="configLog" class="validate-log">
                              ${this._validateLog}
                            </div>
                          `}
                    </div>
                  </ha-card>
                `
              : ""}

            <ha-card
              class="server-management-card ${classMap({
                "no-advanced": !this.showAdvanced,
              })}"
              header=${this.hass.localize(
                "ui.panel.config.server_control.section.server_management.heading"
              )}
            >
              <div class="card-content">
                ${this.hass.localize(
                  "ui.panel.config.server_control.section.server_management.introduction"
                )}
              </div>
              <div
                class="server-management-container layout horizontal center-center warning"
              >
                <ha-call-service-button
                  raised
                  class="warning"
                  service="restart"
                  domain="homeassistant"
                  .hass=${this.hass}
                  .confirmation=${this.hass.localize(
                    "ui.panel.config.server_control.section.server_management.confirm_restart"
                  )}
                >
                  ${this.hass.localize(
                    "ui.panel.config.server_control.section.server_management.restart"
                  )}
                </ha-call-service-button>
                <ha-call-service-button
                  raised
                  class="warning"
                  .hass=${this.hass}
                  domain="homeassistant"
                  service="stop"
                  confirmation=${this.hass.localize(
                    "ui.panel.config.server_control.section.server_management.confirm_stop"
                  )}
                >
                  ${this.hass.localize(
                    "ui.panel.config.server_control.section.server_management.stop"
                  )}
                </ha-call-service-button>
              </div>
            </ha-card>
          </div>
        </ha-config-section>
        <ha-config-section
          no-header
          .narrow=${this.narrow}
          .isWide=${this.isWide}
        >
          <div class="content">
            ${this.showAdvanced
              ? html`
                  <ha-card
                    class="reload"
                    header=${this.hass.localize(
                      "ui.panel.config.server_control.section.reloading.heading"
                    )}
                  >
                    <div class="card-content">
                      ${this.hass.localize(
                        "ui.panel.config.server_control.section.reloading.introduction"
                      )}
                    </div>
                    <div class="actions">
                      <ha-call-service-button
                        outlined
                        domain="homeassistant"
                        service="reload_core_config"
                        .hass=${this.hass}
                      >
                        ${this.hass.localize(
                          "ui.panel.config.server_control.section.reloading.core"
                        )}
                      </ha-call-service-button>
                      ${reloadableDomains.map((domain) =>
                        isServiceLoaded(this.hass, domain, "reload")
                          ? html`
                              <ha-call-service-button
                                outlined
                                service="reload"
                                .hass=${this.hass}
                                .domain=${domain}
                              >
                                ${this.hass.localize(
                                  `ui.panel.config.server_control.section.reloading.${domain}`
                                )}
                              </ha-call-service-button>
                            `
                          : ""
                      )}
                    </div>
                  </ha-card>
                `
              : ""}
          </div>
        </ha-config-section>
      </hass-tabs-subpage>
    `;
  }

  private async _validateConfig() {
    this._validating = true;
    this._validateLog = "";
    this._isValid = null;

    const configCheck = await checkCoreConfig(this.hass);
    this._validating = false;
    this._isValid = configCheck.result === "valid";

    if (configCheck.errors) {
      this._validateLog = configCheck.errors;
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .heading {
          max-width: 1040px;
          margin: 0px auto;
        }

        .heading {
          padding: 28px 20px 0px;
        }

        .content {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
        }

        .validate-card,
        .server-management-card {
          width: calc(50% - 12px);
        }

        .header {
          font-size: 24px;
          line-height: 32px;
          padding-bottom: 8px;
          opacity: var(--dark-primary-opacity);
        }

        .description {
          opacity: var(--dark-primary-opacity);
          font-size: 14px;
          padding-bottom: 8px;
        }

        .validate-container,
        .server-management-container {
          height: 140px;
        }

        .server-management-container ha-call-service-button {
          padding-right: 16px;
        }

        .validate-result {
          color: var(--success-color);
          font-weight: 500;
          margin-bottom: 1em;
        }

        .config-invalid {
          margin: 1em 0;
        }

        .config-invalid .text {
          color: var(--error-color);
          font-weight: 500;
        }

        .config-invalid mwc-button {
          float: right;
        }

        .validate-log {
          white-space: pre-wrap;
          direction: ltr;
        }

        .warning {
          --mdc-theme-primary: var(--error-color);
        }

        .reload {
          margin-top: 24px;
        }

        .reload .actions {
          width: 100%;
          display: flex;
          flex-wrap: wrap;
          padding-bottom: 8px;
        }

        .reload ha-call-service-button {
          padding: 0 8px;
          display: inline-block;
          width: calc(33% - 24px);
          margin: 4px;
        }

        :host([narrow]) .validate-card,
        :host([narrow]) .server-management-card,
        .server-management-card.no-advanced {
          width: 100%;
        }

        :host([narrow]) .server-management-card {
          margin-top: 24px;
        }

        :host([narrow]) .reload ha-call-service-button {
          width: 100%;
          margin: 8px 0;
          border: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-server-control": HaConfigServerControl;
  }
}
