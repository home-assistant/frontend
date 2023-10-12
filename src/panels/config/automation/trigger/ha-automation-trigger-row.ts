import { consume } from "@lit-labs/context";
import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import {
  mdiCheck,
  mdiContentCopy,
  mdiContentCut,
  mdiContentDuplicate,
  mdiDelete,
  mdiDotsVertical,
  mdiIdentifier,
  mdiPlayCircleOutline,
  mdiRenameBox,
  mdiSort,
  mdiStopCircleOutline,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { CSSResultGroup, LitElement, PropertyValues, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { storage } from "../../../../common/decorators/storage";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import { handleStructError } from "../../../../common/structs/handle-errors";
import { debounce } from "../../../../common/util/debounce";
import "../../../../components/ha-alert";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-card";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-textfield";
import { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import type { AutomationClipboard } from "../../../../data/automation";
import { Trigger, subscribeTrigger } from "../../../../data/automation";
import { describeTrigger } from "../../../../data/automation_i18n";
import { validateConfig } from "../../../../data/config";
import { fullEntitiesContext } from "../../../../data/context";
import { EntityRegistryEntry } from "../../../../data/entity_registry";
import { TRIGGER_TYPES } from "../../../../data/trigger";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "./types/ha-automation-trigger-calendar";
import "./types/ha-automation-trigger-device";
import "./types/ha-automation-trigger-event";
import "./types/ha-automation-trigger-geo_location";
import "./types/ha-automation-trigger-homeassistant";
import "./types/ha-automation-trigger-mqtt";
import "./types/ha-automation-trigger-numeric_state";
import "./types/ha-automation-trigger-persistent_notification";
import "./types/ha-automation-trigger-conversation";
import "./types/ha-automation-trigger-state";
import "./types/ha-automation-trigger-sun";
import "./types/ha-automation-trigger-tag";
import "./types/ha-automation-trigger-template";
import "./types/ha-automation-trigger-time";
import "./types/ha-automation-trigger-time_pattern";
import "./types/ha-automation-trigger-webhook";
import "./types/ha-automation-trigger-zone";

export interface TriggerElement extends LitElement {
  trigger: Trigger;
}

export const handleChangeEvent = (element: TriggerElement, ev: CustomEvent) => {
  ev.stopPropagation();
  const name = (ev.currentTarget as any)?.name;
  if (!name) {
    return;
  }
  const newVal = (ev.target as any)?.value;

  if ((element.trigger[name] || "") === newVal) {
    return;
  }

  let newTrigger: Trigger;
  if (newVal === undefined || newVal === "") {
    newTrigger = { ...element.trigger };
    delete newTrigger[name];
  } else {
    newTrigger = { ...element.trigger, [name]: newVal };
  }
  fireEvent(element, "value-changed", { value: newTrigger });
};

const preventDefault = (ev) => ev.preventDefault();

@customElement("ha-automation-trigger-row")
export default class HaAutomationTriggerRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: Trigger;

  @property({ type: Boolean }) public hideMenu = false;

  @property({ type: Boolean }) public disabled = false;

  @state() private _warnings?: string[];

  @state() private _yamlMode = false;

  @state() private _requestShowId = false;

  @state() private _triggered?: Record<string, unknown>;

  @state() private _triggerColor = false;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  @storage({
    key: "automationClipboard",
    state: false,
    subscribe: true,
    storage: "sessionStorage",
  })
  public _clipboard?: AutomationClipboard;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  private _triggerUnsub?: Promise<UnsubscribeFunc>;

  protected render() {
    const supported =
      customElements.get(`ha-automation-trigger-${this.trigger.platform}`) !==
      undefined;
    const yamlMode = this._yamlMode || !supported;
    const showId = "id" in this.trigger || this._requestShowId;

    return html`
      <ha-card outlined>
        ${this.trigger.enabled === false
          ? html`
              <div class="disabled-bar">
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.actions.disabled"
                )}
              </div>
            `
          : ""}

        <ha-expansion-panel leftChevron>
          <h3 slot="header">
            <ha-svg-icon
              class="trigger-icon"
              .path=${TRIGGER_TYPES[this.trigger.platform]}
            ></ha-svg-icon>
            ${describeTrigger(this.trigger, this.hass, this._entityReg)}
          </h3>

          <slot name="icons" slot="icons"></slot>
          ${this.hideMenu
            ? ""
            : html`
                <ha-button-menu
                  slot="icons"
                  @action=${this._handleAction}
                  @click=${preventDefault}
                  fixed
                >
                  <ha-icon-button
                    slot="trigger"
                    .label=${this.hass.localize("ui.common.menu")}
                    .path=${mdiDotsVertical}
                  ></ha-icon-button>

                  <mwc-list-item graphic="icon" .disabled=${this.disabled}>
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.triggers.rename"
                    )}
                    <ha-svg-icon
                      slot="graphic"
                      .path=${mdiRenameBox}
                    ></ha-svg-icon>
                  </mwc-list-item>

                  <mwc-list-item graphic="icon" .disabled=${this.disabled}>
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.triggers.re_order"
                    )}
                    <ha-svg-icon slot="graphic" .path=${mdiSort}></ha-svg-icon>
                  </mwc-list-item>

                  <mwc-list-item graphic="icon" .disabled=${this.disabled}>
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.triggers.edit_id"
                    )}
                    <ha-svg-icon
                      slot="graphic"
                      .path=${mdiIdentifier}
                    ></ha-svg-icon>
                  </mwc-list-item>

                  <li divider role="separator"></li>

                  <mwc-list-item graphic="icon" .disabled=${this.disabled}>
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.triggers.duplicate"
                    )}
                    <ha-svg-icon
                      slot="graphic"
                      .path=${mdiContentDuplicate}
                    ></ha-svg-icon>
                  </mwc-list-item>

                  <mwc-list-item graphic="icon" .disabled=${this.disabled}>
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.triggers.copy"
                    )}
                    <ha-svg-icon
                      slot="graphic"
                      .path=${mdiContentCopy}
                    ></ha-svg-icon>
                  </mwc-list-item>

                  <mwc-list-item graphic="icon" .disabled=${this.disabled}>
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.triggers.cut"
                    )}
                    <ha-svg-icon
                      slot="graphic"
                      .path=${mdiContentCut}
                    ></ha-svg-icon>
                  </mwc-list-item>

                  <li divider role="separator"></li>

                  <mwc-list-item .disabled=${!supported} graphic="icon">
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.edit_ui"
                    )}
                    ${!yamlMode
                      ? html`<ha-svg-icon
                          class="selected_menu_item"
                          slot="graphic"
                          .path=${mdiCheck}
                        ></ha-svg-icon>`
                      : ``}
                  </mwc-list-item>

                  <mwc-list-item .disabled=${!supported} graphic="icon">
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.edit_yaml"
                    )}
                    ${yamlMode
                      ? html`<ha-svg-icon
                          class="selected_menu_item"
                          slot="graphic"
                          .path=${mdiCheck}
                        ></ha-svg-icon>`
                      : ``}
                  </mwc-list-item>

                  <li divider role="separator"></li>

                  <mwc-list-item graphic="icon" .disabled=${this.disabled}>
                    ${this.trigger.enabled === false
                      ? this.hass.localize(
                          "ui.panel.config.automation.editor.actions.enable"
                        )
                      : this.hass.localize(
                          "ui.panel.config.automation.editor.actions.disable"
                        )}
                    <ha-svg-icon
                      slot="graphic"
                      .path=${this.trigger.enabled === false
                        ? mdiPlayCircleOutline
                        : mdiStopCircleOutline}
                    ></ha-svg-icon>
                  </mwc-list-item>
                  <mwc-list-item
                    class="warning"
                    graphic="icon"
                    .disabled=${this.disabled}
                  >
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.actions.delete"
                    )}
                    <ha-svg-icon
                      class="warning"
                      slot="graphic"
                      .path=${mdiDelete}
                    ></ha-svg-icon>
                  </mwc-list-item>
                </ha-button-menu>
              `}
          <div
            class=${classMap({
              "card-content": true,
              disabled: this.trigger.enabled === false,
            })}
          >
            ${this._warnings
              ? html`<ha-alert
                  alert-type="warning"
                  .title=${this.hass.localize(
                    "ui.errors.config.editor_not_supported"
                  )}
                >
                  ${this._warnings.length && this._warnings[0] !== undefined
                    ? html` <ul>
                        ${this._warnings.map(
                          (warning) => html`<li>${warning}</li>`
                        )}
                      </ul>`
                    : ""}
                  ${this.hass.localize(
                    "ui.errors.config.edit_in_yaml_supported"
                  )}
                </ha-alert>`
              : ""}
            ${yamlMode
              ? html`
                  ${!supported
                    ? html`
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.triggers.unsupported_platform",
                          "platform",
                          this.trigger.platform
                        )}
                      `
                    : ""}
                  <ha-yaml-editor
                    .hass=${this.hass}
                    .defaultValue=${this.trigger}
                    .readOnly=${this.disabled}
                    @value-changed=${this._onYamlChange}
                  ></ha-yaml-editor>
                `
              : html`
                  ${showId
                    ? html`
                        <ha-textfield
                          .label=${this.hass.localize(
                            "ui.panel.config.automation.editor.triggers.id"
                          )}
                          .value=${this.trigger.id || ""}
                          .disabled=${this.disabled}
                          @change=${this._idChanged}
                        >
                        </ha-textfield>
                      `
                    : ""}
                  <div
                    @ui-mode-not-available=${this._handleUiModeNotAvailable}
                    @value-changed=${this._onUiChanged}
                  >
                    ${dynamicElement(
                      `ha-automation-trigger-${this.trigger.platform}`,
                      {
                        hass: this.hass,
                        trigger: this.trigger,
                        disabled: this.disabled,
                      }
                    )}
                  </div>
                `}
          </div>
        </ha-expansion-panel>

        <div
          class="triggered ${classMap({
            active: this._triggered !== undefined,
            accent: this._triggerColor,
          })}"
          @click=${this._showTriggeredInfo}
        >
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.triggered"
          )}
        </div>
      </ha-card>
    `;
  }

  protected override updated(changedProps: PropertyValues<this>): void {
    super.updated(changedProps);
    if (changedProps.has("trigger")) {
      this._subscribeTrigger();
    }
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated && this.trigger) {
      this._subscribeTrigger();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._triggerUnsub) {
      this._triggerUnsub.then((unsub) => unsub());
      this._triggerUnsub = undefined;
    }
    this._doSubscribeTrigger.cancel();
  }

  private _subscribeTrigger() {
    // Clean up old trigger subscription.
    if (this._triggerUnsub) {
      this._triggerUnsub.then((unsub) => unsub());
      this._triggerUnsub = undefined;
    }

    this._doSubscribeTrigger();
  }

  private _doSubscribeTrigger = debounce(async () => {
    let untriggerTimeout: number | undefined;
    const showTriggeredTime = 5000;
    const trigger = this.trigger;

    // Clean up old trigger subscription.
    if (this._triggerUnsub) {
      this._triggerUnsub.then((unsub) => unsub());
      this._triggerUnsub = undefined;
    }

    const validateResult = await validateConfig(this.hass, {
      trigger,
    });

    // Don't do anything if trigger not valid or if trigger changed.
    if (!validateResult.trigger.valid || this.trigger !== trigger) {
      return;
    }

    const triggerUnsub = subscribeTrigger(
      this.hass,
      (result) => {
        if (untriggerTimeout !== undefined) {
          clearTimeout(untriggerTimeout);
          this._triggerColor = !this._triggerColor;
        } else {
          this._triggerColor = false;
        }
        this._triggered = result;
        untriggerTimeout = window.setTimeout(() => {
          this._triggered = undefined;
          untriggerTimeout = undefined;
        }, showTriggeredTime);
      },
      trigger
    );
    triggerUnsub.catch(() => {
      if (this._triggerUnsub === triggerUnsub) {
        this._triggerUnsub = undefined;
      }
    });
    this._triggerUnsub = triggerUnsub;
  }, 5000);

  private _handleUiModeNotAvailable(ev: CustomEvent) {
    this._warnings = handleStructError(this.hass, ev.detail).warnings;
    if (!this._yamlMode) {
      this._yamlMode = true;
    }
  }

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        await this._renameTrigger();
        break;
      case 1:
        fireEvent(this, "re-order");
        break;
      case 2:
        this._requestShowId = true;
        this.expand();
        break;
      case 3:
        fireEvent(this, "duplicate");
        break;
      case 4:
        this._setClipboard();
        break;
      case 5:
        this._setClipboard();
        fireEvent(this, "value-changed", { value: null });
        break;
      case 6:
        this._switchUiMode();
        this.expand();
        break;
      case 7:
        this._switchYamlMode();
        this.expand();
        break;
      case 8:
        this._onDisable();
        break;
      case 9:
        this._onDelete();
        break;
    }
  }

  private _setClipboard() {
    this._clipboard = {
      ...this._clipboard,
      trigger: this.trigger,
    };
  }

  private _onDelete() {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.triggers.delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.automation.editor.triggers.delete_confirm_text"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
      confirm: () => {
        fireEvent(this, "value-changed", { value: null });
      },
    });
  }

  private _onDisable() {
    const enabled = !(this.trigger.enabled ?? true);
    const value = { ...this.trigger, enabled };
    fireEvent(this, "value-changed", { value });
    if (this._yamlMode) {
      this._yamlEditor?.setValue(value);
    }
  }

  private _idChanged(ev: CustomEvent) {
    const newId = (ev.target as any).value;
    if (newId === (this.trigger.id ?? "")) {
      return;
    }
    this._requestShowId = true;
    const value = { ...this.trigger };
    if (!newId) {
      delete value.id;
    } else {
      value.id = newId;
    }
    fireEvent(this, "value-changed", {
      value,
    });
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    this._warnings = undefined;
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }

  private _onUiChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = {
      ...(this.trigger.alias ? { alias: this.trigger.alias } : {}),
      ...ev.detail.value,
    };
    fireEvent(this, "value-changed", { value });
  }

  private _switchUiMode() {
    this._warnings = undefined;
    this._yamlMode = false;
  }

  private _switchYamlMode() {
    this._warnings = undefined;
    this._yamlMode = true;
  }

  private _showTriggeredInfo() {
    showAlertDialog(this, {
      text: html`
        <ha-yaml-editor
          readOnly
          .hass=${this.hass}
          .defaultValue=${this._triggered}
        ></ha-yaml-editor>
      `,
    });
  }

  private async _renameTrigger(): Promise<void> {
    const alias = await showPromptDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.triggers.change_alias"
      ),
      inputLabel: this.hass.localize(
        "ui.panel.config.automation.editor.triggers.alias"
      ),
      inputType: "string",
      placeholder: capitalizeFirstLetter(
        describeTrigger(this.trigger, this.hass, this._entityReg, true)
      ),
      defaultValue: this.trigger.alias,
      confirmText: this.hass.localize("ui.common.submit"),
    });

    if (alias !== null) {
      const value = { ...this.trigger };
      if (alias === "") {
        delete value.alias;
      } else {
        value.alias = alias;
      }
      fireEvent(this, "value-changed", {
        value,
      });
      if (this._yamlMode) {
        this._yamlEditor?.setValue(value);
      }
    }
  }

  public expand() {
    this.updateComplete.then(() => {
      this.shadowRoot!.querySelector("ha-expansion-panel")!.expanded = true;
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-button-menu {
          --mdc-theme-text-primary-on-background: var(--primary-text-color);
        }
        .disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        ha-expansion-panel {
          --expansion-panel-summary-padding: 0 0 0 8px;
          --expansion-panel-content-padding: 0;
        }
        h3 {
          margin: 0;
          font-size: inherit;
          font-weight: inherit;
        }
        .trigger-icon {
          display: none;
        }
        @media (min-width: 870px) {
          .trigger-icon {
            display: inline-block;
            color: var(--secondary-text-color);
            opacity: 0.9;
            margin-right: 8px;
          }
        }
        .card-content {
          padding: 16px;
        }
        .disabled-bar {
          background: var(--divider-color, #e0e0e0);
          text-align: center;
          border-top-right-radius: var(--ha-card-border-radius);
          border-top-left-radius: var(--ha-card-border-radius);
        }
        .triggered {
          cursor: pointer;
          position: absolute;
          top: 0px;
          right: 0px;
          left: 0px;
          text-transform: uppercase;
          font-weight: bold;
          font-size: 14px;
          background-color: var(--primary-color);
          color: var(--text-primary-color);
          max-height: 0px;
          overflow: hidden;
          transition: max-height 0.3s;
          text-align: center;
          border-top-right-radius: var(--ha-card-border-radius, 12px);
          border-top-left-radius: var(--ha-card-border-radius, 12px);
        }
        .triggered.active {
          max-height: 100px;
        }
        .triggered:hover {
          opacity: 0.8;
        }
        .triggered.accent {
          background-color: var(--accent-color);
          color: var(--text-accent-color, var(--text-primary-color));
        }
        mwc-list-item[disabled] {
          --mdc-theme-text-primary-on-background: var(--disabled-text-color);
        }
        ha-textfield {
          display: block;
          margin-bottom: 24px;
        }
        .selected_menu_item {
          color: var(--primary-color);
        }
        li[role="separator"] {
          border-bottom-color: var(--divider-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-row": HaAutomationTriggerRow;
  }
}
