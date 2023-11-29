import "@material/mwc-button";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { componentsWithService } from "../../../common/config/components_with_service";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import { CheckConfigResult, checkCoreConfig } from "../../../data/core";
import { domainToName } from "../../../data/integration";
import { showRestartDialog } from "../../../dialogs/restart/show-dialog-restart";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route, TranslationDict } from "../../../types";

type ReloadableDomain = Exclude<
  keyof TranslationDict["ui"]["panel"]["developer-tools"]["tabs"]["yaml"]["section"]["reloading"],
  "heading" | "introduction" | "reload"
>;

@customElement("developer-yaml-config")
export class DeveloperYamlConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public showAdvanced!: boolean;

  @state() private _validating = false;

  @state() private _reloadableDomains: ReloadableDomain[] = [];

  @state() private _validateResult?: CheckConfigResult;

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._validateResult = undefined;
  }

  protected updated(changedProperties) {
    const oldHass = changedProperties.get("hass");
    if (
      changedProperties.has("hass") &&
      (!oldHass || oldHass.config.components !== this.hass.config.components)
    ) {
      this._reloadableDomains = componentsWithService(
        this.hass,
        "reload"
      ).sort() as ReloadableDomain[];
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="content">
        <ha-card
          outlined
          header=${this.hass.localize(
            "ui.panel.developer-tools.tabs.yaml.section.validation.heading"
          )}
        >
          <div class="card-content">
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.yaml.section.validation.introduction"
            )}
            ${!this._validateResult
              ? this._validating
                ? html`<div
                    class="validate-container layout vertical center-center"
                  >
                    <ha-circular-progress active></ha-circular-progress>
                  </div> `
                : nothing
              : html`
                    <div class="validate-result ${
                      this._validateResult.result === "invalid" ? "invalid" : ""
                    }">
                        ${
                          this._validateResult.result === "valid"
                            ? this.hass.localize(
                                "ui.panel.developer-tools.tabs.yaml.section.validation.valid"
                              )
                            : this.hass.localize(
                                "ui.panel.developer-tools.tabs.yaml.section.validation.invalid"
                              )
                        }
                    </div>
                  
                    ${
                      this._validateResult.errors
                        ? html`<ha-alert
                            alert-type="error"
                            .title=${this.hass.localize(
                              "ui.panel.developer-tools.tabs.yaml.section.validation.errors"
                            )}
                          >
                            <span class="validate-log"
                              >${this._validateResult.errors}</span
                            >
                          </ha-alert>`
                        : ""
                    }
                    ${
                      this._validateResult.warnings
                        ? html`<ha-alert
                            alert-type="warning"
                            .title=${this.hass.localize(
                              "ui.panel.developer-tools.tabs.yaml.section.validation.warnings"
                            )}
                          >
                            <span class="validate-log"
                              >${this._validateResult.warnings}</span
                            >
                          </ha-alert>`
                        : ""
                    }
                  </div>
                `}
          </div>
          <div class="card-actions">
            <mwc-button @click=${this._validateConfig}>
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.yaml.section.validation.check_config"
              )}
            </mwc-button>
            <mwc-button
              class="warning"
              @click=${this._restart}
              .disabled=${this._validateResult?.result === "invalid"}
            >
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.yaml.section.server_management.restart"
              )}
            </mwc-button>
          </div>
        </ha-card>
        <ha-card
          outlined
          header=${this.hass.localize(
            "ui.panel.developer-tools.tabs.yaml.section.reloading.heading"
          )}
        >
          <div class="card-content">
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.yaml.section.reloading.introduction"
            )}
          </div>
          <div class="card-actions">
            <ha-call-service-button
              .hass=${this.hass}
              domain="homeassistant"
              service="reload_all"
              >${this.hass.localize(
                "ui.panel.developer-tools.tabs.yaml.section.reloading.all"
              )}
            </ha-call-service-button>
          </div>
          <div class="card-actions">
            <ha-call-service-button
              .hass=${this.hass}
              domain="homeassistant"
              service="reload_core_config"
              >${this.hass.localize(
                "ui.panel.developer-tools.tabs.yaml.section.reloading.core"
              )}
            </ha-call-service-button>
          </div>
          ${this._reloadableDomains.map(
            (domain) => html`
              <div class="card-actions">
                <ha-call-service-button
                  .hass=${this.hass}
                  .domain=${domain}
                  service="reload"
                  >${this.hass.localize(
                    `ui.panel.developer-tools.tabs.yaml.section.reloading.${domain}`
                  ) ||
                  this.hass.localize(
                    "ui.panel.developer-tools.tabs.yaml.section.reloading.reload",
                    { domain: domainToName(this.hass.localize, domain) }
                  )}
                </ha-call-service-button>
              </div>
            `
          )}
        </ha-card>
      </div>
    `;
  }

  private async _validateConfig() {
    this._validating = true;
    this._validateResult = undefined;

    this._validateResult = await checkCoreConfig(this.hass);
    this._validating = false;
  }

  private async _restart() {
    await this._validateConfig();
    if (this._validateResult?.result === "invalid") {
      return;
    }
    showRestartDialog(this);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .validate-container {
          height: 60px;
        }

        .validate-result {
          color: var(--success-color);
          font-weight: 500;
          margin: 1em 0;
          text-align: center;
        }

        .validate-result.invalid {
          color: var(--error-color);
        }

        .validate-log {
          white-space: pre;
          direction: ltr;
        }

        .content {
          padding: 28px 20px 16px;
          padding: max(28px, calc(12px + env(safe-area-inset-top)))
            max(20px, calc(4px + env(safe-area-inset-right)))
            max(16px, env(safe-area-inset-bottom))
            max(20px, calc(4px + env(safe-area-inset-left)));
          max-width: 1040px;
          margin: 0 auto;
        }

        ha-card {
          margin-top: 24px;
        }

        .card-actions {
          display: flex;
          justify-content: space-between;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-yaml-config": DeveloperYamlConfig;
  }
}
