import "@material/mwc-fab";
import { mdiContentDuplicate, mdiContentSave, mdiDelete } from "@mdi/js";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-input/paper-textarea";
import { PaperListboxElement } from "@polymer/paper-listbox";
import {
  css,
  CSSResult,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import {
  AutomationConfig,
  AutomationEntity,
  Condition,
  deleteAutomation,
  getAutomationEditorInitData,
  showAutomationEditor,
  Trigger,
  triggerAutomation,
} from "../../../data/automation";
import { Action } from "../../../data/script";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/ha-app-layout";
import "../../../layouts/hass-tabs-subpage";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import "./action/ha-automation-action";
import { HaDeviceAction } from "./action/types/ha-automation-action-device_id";
import "./condition/ha-automation-condition";
import "./trigger/ha-automation-trigger";
import { HaDeviceTrigger } from "./trigger/types/ha-automation-trigger-device";

const MODES = ["single", "restart", "queued", "parallel"];
const MODES_MAX = ["queued", "parallel"];

declare global {
  // for fire event
  interface HASSDomEvents {
    "ui-mode-not-available": Error;
    duplicate: undefined;
  }
}

export class HaAutomationEditor extends KeyboardShortcutMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public automationId!: string;

  @property() public automations!: AutomationEntity[];

  @property() public isWide?: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @internalProperty() private _config?: AutomationConfig;

  @internalProperty() private _dirty = false;

  @internalProperty() private _errors?: string;

  @internalProperty() private _entityId?: string;

  protected render(): TemplateResult {
    const stateObj = this._entityId
      ? this.hass.states[this._entityId]
      : undefined;
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .backCallback=${() => this._backTapped()}
        .tabs=${configSections.automation}
      >
        ${!this.automationId
          ? ""
          : html`
              <mwc-icon-button
                slot="toolbar-icon"
                title="${this.hass.localize(
                  "ui.panel.config.automation.picker.duplicate_automation"
                )}"
                @click=${this._duplicate}
              >
                <ha-svg-icon .path=${mdiContentDuplicate}></ha-svg-icon>
              </mwc-icon-button>
              <mwc-icon-button
                class="warning"
                slot="toolbar-icon"
                title="${this.hass.localize(
                  "ui.panel.config.automation.picker.delete_automation"
                )}"
                @click=${this._deleteConfirm}
              >
                <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
              </mwc-icon-button>
            `}
        ${this._config
          ? html`
              ${this.narrow
                ? html` <span slot="header">${this._config?.alias}</span> `
                : ""}
              <div class="content">
                ${this._errors
                  ? html` <div class="errors">${this._errors}</div> `
                  : ""}
                <ha-config-section .isWide=${this.isWide}>
                  ${!this.narrow
                    ? html` <span slot="header">${this._config.alias}</span> `
                    : ""}
                  <span slot="introduction">
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.introduction"
                    )}
                  </span>
                  <ha-card>
                    <div class="card-content">
                      <paper-input
                        .label=${this.hass.localize(
                          "ui.panel.config.automation.editor.alias"
                        )}
                        name="alias"
                        .value=${this._config.alias}
                        @value-changed=${this._valueChanged}
                      >
                      </paper-input>
                      <paper-textarea
                        .label=${this.hass.localize(
                          "ui.panel.config.automation.editor.description.label"
                        )}
                        .placeholder=${this.hass.localize(
                          "ui.panel.config.automation.editor.description.placeholder"
                        )}
                        name="description"
                        .value=${this._config.description}
                        @value-changed=${this._valueChanged}
                      ></paper-textarea>
                      <p>
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.modes.description",
                          "documentation_link",
                          html`<a
                            href="${documentationUrl(
                              this.hass,
                              "/integrations/automation/#automation-modes"
                            )}"
                            target="_blank"
                            rel="noreferrer"
                            >${this.hass.localize(
                              "ui.panel.config.automation.editor.modes.documentation"
                            )}</a
                          >`
                        )}
                      </p>
                      <paper-dropdown-menu-light
                        .label=${this.hass.localize(
                          "ui.panel.config.automation.editor.modes.label"
                        )}
                        no-animations
                      >
                        <paper-listbox
                          slot="dropdown-content"
                          .selected=${this._config.mode
                            ? MODES.indexOf(this._config.mode)
                            : 0}
                          @iron-select=${this._modeChanged}
                        >
                          ${MODES.map(
                            (mode) => html`
                              <paper-item .mode=${mode}>
                                ${this.hass.localize(
                                  `ui.panel.config.automation.editor.modes.${mode}`
                                ) || mode}
                              </paper-item>
                            `
                          )}
                        </paper-listbox>
                      </paper-dropdown-menu-light>
                      ${this._config.mode &&
                      MODES_MAX.includes(this._config.mode)
                        ? html` <paper-input
                            .label=${this.hass.localize(
                              `ui.panel.config.automation.editor.max.${this._config.mode}`
                            )}
                            type="number"
                            name="max"
                            .value=${this._config.max || "10"}
                            @value-changed=${this._valueChanged}
                          >
                          </paper-input>`
                        : html``}
                    </div>
                    ${stateObj
                      ? html`
                          <div
                            class="card-actions layout horizontal justified center"
                          >
                            <div class="layout horizontal center">
                              <ha-entity-toggle
                                .hass=${this.hass}
                                .stateObj=${stateObj}
                              ></ha-entity-toggle>
                              ${this.hass.localize(
                                "ui.panel.config.automation.editor.enable_disable"
                              )}
                            </div>
                            <mwc-button
                              @click=${this._excuteAutomation}
                              .stateObj=${stateObj}
                            >
                              ${this.hass.localize(
                                "ui.card.automation.trigger"
                              )}
                            </mwc-button>
                          </div>
                        `
                      : ""}
                  </ha-card>
                </ha-config-section>

                <ha-config-section .isWide=${this.isWide}>
                  <span slot="header">
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.triggers.header"
                    )}
                  </span>
                  <span slot="introduction">
                    <p>
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.triggers.introduction"
                      )}
                    </p>
                    <a
                      href="${documentationUrl(
                        this.hass,
                        "/docs/automation/trigger/"
                      )}"
                      target="_blank"
                      rel="noreferrer"
                    >
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.triggers.learn_more"
                      )}
                    </a>
                  </span>
                  <ha-automation-trigger
                    .triggers=${this._config.trigger}
                    @value-changed=${this._triggerChanged}
                    .hass=${this.hass}
                  ></ha-automation-trigger>
                </ha-config-section>

                <ha-config-section .isWide=${this.isWide}>
                  <span slot="header">
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.conditions.header"
                    )}
                  </span>
                  <span slot="introduction">
                    <p>
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.conditions.introduction"
                      )}
                    </p>
                    <a
                      href="${documentationUrl(
                        this.hass,
                        "/docs/scripts/conditions/"
                      )}"
                      target="_blank"
                      rel="noreferrer"
                    >
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.conditions.learn_more"
                      )}
                    </a>
                  </span>
                  <ha-automation-condition
                    .conditions=${this._config.condition || []}
                    @value-changed=${this._conditionChanged}
                    .hass=${this.hass}
                  ></ha-automation-condition>
                </ha-config-section>

                <ha-config-section .isWide=${this.isWide}>
                  <span slot="header">
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.actions.header"
                    )}
                  </span>
                  <span slot="introduction">
                    <p>
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.actions.introduction"
                      )}
                    </p>
                    <a
                      href="${documentationUrl(
                        this.hass,
                        "/docs/automation/action/"
                      )}"
                      target="_blank"
                      rel="noreferrer"
                    >
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.actions.learn_more"
                      )}
                    </a>
                  </span>
                  <ha-automation-action
                    .actions=${this._config.action}
                    @value-changed=${this._actionChanged}
                    .hass=${this.hass}
                  ></ha-automation-action>
                </ha-config-section>
              </div>
            `
          : ""}
        <mwc-fab
          slot="fab"
          class=${classMap({ dirty: this._dirty })}
          .title=${this.hass.localize("ui.panel.config.automation.editor.save")}
          @click=${this._saveAutomation}
        >
          <ha-svg-icon slot="icon" .path=${mdiContentSave}></ha-svg-icon>
        </mwc-fab>
      </hass-tabs-subpage>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    const oldAutomationId = changedProps.get("automationId");
    if (
      changedProps.has("automationId") &&
      this.automationId &&
      this.hass &&
      // Only refresh config if we picked a new automation. If same ID, don't fetch it.
      oldAutomationId !== this.automationId
    ) {
      this._setEntityId();
      this.hass
        .callApi<AutomationConfig>(
          "GET",
          `config/automation/config/${this.automationId}`
        )
        .then(
          (config) => {
            // Normalize data: ensure trigger, action and condition are lists
            // Happens when people copy paste their automations into the config
            for (const key of ["trigger", "condition", "action"]) {
              const value = config[key];
              if (value && !Array.isArray(value)) {
                config[key] = [value];
              }
            }
            this._dirty = false;
            this._config = config;
          },
          (resp) => {
            showAlertDialog(this, {
              text:
                resp.status_code === 404
                  ? this.hass.localize(
                      "ui.panel.config.automation.editor.load_error_not_editable"
                    )
                  : this.hass.localize(
                      "ui.panel.config.automation.editor.load_error_unknown",
                      "err_no",
                      resp.status_code
                    ),
            }).then(() => history.back());
          }
        );
    }

    if (changedProps.has("automationId") && !this.automationId && this.hass) {
      const initData = getAutomationEditorInitData();
      this._dirty = !!initData;
      this._config = {
        alias: this.hass.localize(
          "ui.panel.config.automation.editor.default_name"
        ),
        description: "",
        trigger: [{ platform: "device", ...HaDeviceTrigger.defaultConfig }],
        condition: [],
        action: [{ ...HaDeviceAction.defaultConfig }],
        ...initData,
      };
    }

    if (
      changedProps.has("automations") &&
      this.automationId &&
      !this._entityId
    ) {
      this._setEntityId();
    }
  }

  private _setEntityId() {
    const automation = this.automations.find(
      (entity: AutomationEntity) => entity.attributes.id === this.automationId
    );
    this._entityId = automation?.entity_id;
  }

  private _modeChanged(ev: CustomEvent) {
    const mode = ((ev.target as PaperListboxElement)?.selectedItem as any)
      ?.mode;

    if (mode === this._config!.mode) {
      return;
    }

    this._config = { ...this._config!, mode };
    if (!MODES_MAX.includes(mode)) {
      delete this._config.max;
    }
    this._dirty = true;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const target = ev.target as any;
    const name = target.name;
    if (!name) {
      return;
    }
    let newVal = ev.detail.value;
    if (target.type === "number") {
      newVal = Number(newVal);
    }
    if ((this._config![name] || "") === newVal) {
      return;
    }
    this._config = { ...this._config!, [name]: newVal };
    this._dirty = true;
  }

  private _triggerChanged(ev: CustomEvent): void {
    this._config = { ...this._config!, trigger: ev.detail.value as Trigger[] };
    this._errors = undefined;
    this._dirty = true;
  }

  private _conditionChanged(ev: CustomEvent): void {
    this._config = {
      ...this._config!,
      condition: ev.detail.value as Condition[],
    };
    this._errors = undefined;
    this._dirty = true;
  }

  private _actionChanged(ev: CustomEvent): void {
    this._config = { ...this._config!, action: ev.detail.value as Action[] };
    this._errors = undefined;
    this._dirty = true;
  }

  private _excuteAutomation(ev: Event) {
    triggerAutomation(this.hass, (ev.target as any).stateObj.entity_id);
  }

  private _backTapped(): void {
    if (this._dirty) {
      showConfirmationDialog(this, {
        text: this.hass!.localize(
          "ui.panel.config.automation.editor.unsaved_confirm"
        ),
        confirmText: this.hass!.localize("ui.common.yes"),
        dismissText: this.hass!.localize("ui.common.no"),
        confirm: () => history.back(),
      });
    } else {
      history.back();
    }
  }

  private async _duplicate() {
    if (this._dirty) {
      if (
        !(await showConfirmationDialog(this, {
          text: this.hass!.localize(
            "ui.panel.config.automation.editor.unsaved_confirm"
          ),
          confirmText: this.hass!.localize("ui.common.yes"),
          dismissText: this.hass!.localize("ui.common.no"),
        }))
      ) {
        return;
      }
      // Wait for dialog to complate closing
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    showAutomationEditor(this, {
      ...this._config,
      id: undefined,
      alias: `${this._config?.alias} (${this.hass.localize(
        "ui.panel.config.automation.picker.duplicate"
      )})`,
    });
  }

  private async _deleteConfirm() {
    showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.automation.picker.delete_confirm"
      ),
      confirmText: this.hass!.localize("ui.common.yes"),
      dismissText: this.hass!.localize("ui.common.no"),
      confirm: () => this._delete(),
    });
  }

  private async _delete() {
    await deleteAutomation(this.hass, this.automationId);
    history.back();
  }

  private _saveAutomation(): void {
    const id = this.automationId || String(Date.now());
    this.hass!.callApi(
      "POST",
      "config/automation/config/" + id,
      this._config
    ).then(
      () => {
        this._dirty = false;

        if (!this.automationId) {
          navigate(this, `/config/automation/edit/${id}`, true);
        }
      },
      (errors) => {
        this._errors = errors.body.message;
        throw errors;
      }
    );
  }

  protected handleKeyboardSave() {
    this._saveAutomation();
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        ha-card {
          overflow: hidden;
        }
        .errors {
          padding: 20px;
          font-weight: bold;
          color: var(--error-color);
        }
        .content {
          padding-bottom: 20px;
        }
        span[slot="introduction"] a {
          color: var(--primary-color);
        }
        p {
          margin-bottom: 0;
        }
        ha-entity-toggle {
          margin-right: 8px;
        }
        mwc-fab {
          position: relative;
          bottom: calc(-80px - env(safe-area-inset-bottom));
          transition: bottom 0.3s;
        }
        mwc-fab.dirty {
          bottom: 0;
        }
      `,
    ];
  }
}

customElements.define("ha-automation-editor", HaAutomationEditor);
