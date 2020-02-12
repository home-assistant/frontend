import {
  LitElement,
  TemplateResult,
  html,
  CSSResultArray,
  css,
  property,
  customElement,
} from "lit-element";
import { ifDefined } from "lit-html/directives/if-defined";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-tooltip/paper-tooltip";
import "../../../layouts/hass-tabs-subpage";

import "../../../components/ha-card";
import "../../../components/ha-fab";
import "../../../components/entity/ha-entity-toggle";

import "../ha-config-section";

import { computeStateName } from "../../../common/entity/compute_state_name";
import { computeRTL } from "../../../common/util/compute_rtl";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import {
  AutomationEntity,
  showAutomationEditor,
  AutomationConfig,
} from "../../../data/automation";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import { fireEvent } from "../../../common/dom/fire_event";
import { showThingtalkDialog } from "./show-dialog-thingtalk";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { configSections } from "../ha-panel-config";

@customElement("ha-automation-picker")
class HaAutomationPicker extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public isWide!: boolean;
  @property() public narrow!: boolean;
  @property() public route!: Route;
  @property() public automations!: AutomationEntity[];

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.automation}
      >
        <ha-config-section .isWide=${this.isWide}>
          <div slot="header">
            ${this.hass.localize("ui.panel.config.automation.picker.header")}
          </div>
          <div slot="introduction">
            ${this.hass.localize(
              "ui.panel.config.automation.picker.introduction"
            )}
            <p>
              <a
                href="https://home-assistant.io/docs/automation/editor/"
                target="_blank"
              >
                ${this.hass.localize(
                  "ui.panel.config.automation.picker.learn_more"
                )}
              </a>
            </p>
          </div>

          <ha-card
            .heading=${this.hass.localize(
              "ui.panel.config.automation.picker.pick_automation"
            )}
          >
            ${this.automations.length === 0
              ? html`
                  <div class="card-content">
                    <p>
                      ${this.hass.localize(
                        "ui.panel.config.automation.picker.no_automations"
                      )}
                    </p>
                  </div>
                `
              : this.automations.map(
                  (automation) => html`

                      <div class='automation'>
                        <ha-entity-toggle
                          .hass=${this.hass}
                          .stateObj=${automation}
                        ></ha-entity-toggle>

                        <paper-item-body two-line>
                          <div>${computeStateName(automation)}</div>
                          <div secondary>
                            ${this.hass.localize(
                              "ui.card.automation.last_triggered"
                            )}: ${
                    automation.attributes.last_triggered
                      ? formatDateTime(
                          new Date(automation.attributes.last_triggered),
                          this.hass.language
                        )
                      : this.hass.localize("ui.components.relative_time.never")
                  }
                          </div>
                        </paper-item-body>
                        <div class='actions'>
                          <paper-icon-button
                            .automation=${automation}
                            @click=${this._showInfo}
                            icon="hass:information-outline"
                            title="${this.hass.localize(
                              "ui.panel.config.automation.picker.show_info_automation"
                            )}"
                          ></paper-icon-button>
                          <a
                            href=${ifDefined(
                              automation.attributes.id
                                ? `/config/automation/edit/${automation.attributes.id}`
                                : undefined
                            )}
                          >
                            <paper-icon-button
                              title="${this.hass.localize(
                                "ui.panel.config.automation.picker.edit_automation"
                              )}"
                              icon="hass:pencil"
                              .disabled=${!automation.attributes.id}
                            ></paper-icon-button>
                            ${
                              !automation.attributes.id
                                ? html`
                                    <paper-tooltip position="left">
                                      ${this.hass.localize(
                                        "ui.panel.config.automation.picker.only_editable"
                                      )}
                                    </paper-tooltip>
                                  `
                                : ""
                            }
                          </a>
                        </div>
                      </div>
                    </a>
                  `
                )}
          </ha-card>
        </ha-config-section>
        <div>
          <ha-fab
            slot="fab"
            ?is-wide=${this.isWide}
            ?narrow=${this.narrow}
            icon="hass:plus"
            title=${this.hass.localize(
              "ui.panel.config.automation.picker.add_automation"
            )}
            ?rtl=${computeRTL(this.hass)}
            @click=${this._createNew}
          ></ha-fab>
        </div>
      </hass-tabs-subpage>
    `;
  }

  private _showInfo(ev) {
    const entityId = ev.currentTarget.automation.entity_id;
    fireEvent(this, "hass-more-info", { entityId });
  }

  private _createNew() {
    if (!isComponentLoaded(this.hass, "cloud")) {
      showAutomationEditor(this);
      return;
    }
    showThingtalkDialog(this, {
      callback: (config: Partial<AutomationConfig> | undefined) =>
        showAutomationEditor(this, config),
    });
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }

        ha-card {
          margin-bottom: 56px;
        }

        .automation {
          display: flex;
          flex-direction: horizontal;
          align-items: center;
          padding: 0 8px 0 16px;
        }

        .automation a[href] {
          color: var(--primary-text-color);
        }

        ha-entity-toggle {
          margin-right: 16px;
        }

        .actions {
          display: flex;
        }

        ha-fab {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 1;
          cursor: pointer;
        }

        ha-fab[is-wide] {
          bottom: 24px;
          right: 24px;
        }
        ha-fab[narrow] {
          bottom: 84px;
        }
        ha-fab[rtl] {
          right: auto;
          left: 16px;
        }

        ha-fab[rtl][is-wide] {
          bottom: 24px;
          right: auto;
          left: 24px;
        }

        a {
          color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-picker": HaAutomationPicker;
  }
}
