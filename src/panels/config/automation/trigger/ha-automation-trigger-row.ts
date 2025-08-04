import { consume } from "@lit/context";
import {
  mdiArrowDown,
  mdiArrowUp,
  mdiContentCopy,
  mdiContentCut,
  mdiContentDuplicate,
  mdiDelete,
  mdiDotsVertical,
  mdiIdentifier,
  mdiPlayCircleOutline,
  mdiPlaylistEdit,
  mdiRenameBox,
  mdiStopCircleOutline,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import { preventDefaultStopPropagation } from "../../../../common/dom/prevent_default_stop_propagation";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import { debounce } from "../../../../common/util/debounce";
import "../../../../components/ha-alert";
import "../../../../components/ha-automation-row";
import "../../../../components/ha-card";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-button-menu";
import "../../../../components/ha-md-divider";
import "../../../../components/ha-md-menu-item";
import type { AutomationClipboard, Trigger } from "../../../../data/automation";
import { subscribeTrigger } from "../../../../data/automation";
import { describeTrigger } from "../../../../data/automation_i18n";
import { validateConfig } from "../../../../data/config";
import { fullEntitiesContext } from "../../../../data/context";
import type { EntityRegistryEntry } from "../../../../data/entity_registry";
import { TRIGGER_ICONS, isTriggerList } from "../../../../data/trigger";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "./ha-automation-trigger-editor";
import type HaAutomationTriggerContent from "./ha-automation-trigger-editor";
import "./types/ha-automation-trigger-calendar";
import "./types/ha-automation-trigger-conversation";
import "./types/ha-automation-trigger-device";
import "./types/ha-automation-trigger-event";
import "./types/ha-automation-trigger-geo_location";
import "./types/ha-automation-trigger-homeassistant";
import "./types/ha-automation-trigger-list";
import "./types/ha-automation-trigger-mqtt";
import "./types/ha-automation-trigger-numeric_state";
import "./types/ha-automation-trigger-persistent_notification";
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
  const newVal = ev.detail?.value || (ev.currentTarget as any)?.value;

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

@customElement("ha-automation-trigger-row")
export default class HaAutomationTriggerRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: Trigger;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public first?: boolean;

  @property({ type: Boolean }) public last?: boolean;

  @property({ type: Boolean, attribute: "sidebar" })
  public optionsInSidebar = false;

  @state() private _yamlMode = false;

  @state() private _triggered?: Record<string, unknown>;

  @state() private _triggerColor = false;

  @state() private _selected = false;

  @state() private _requestShowId = false;

  @query("ha-automation-trigger-editor")
  public triggerContent?: HaAutomationTriggerContent;

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

  private _renderRow() {
    const type = this._getType(this.trigger);

    const supported = this._uiSupported(type);

    const yamlMode = this._yamlMode || !supported;

    return html`
      <ha-svg-icon
        slot="leading-icon"
        class="trigger-icon"
        .path=${TRIGGER_ICONS[type]}
      ></ha-svg-icon>
      <h3 slot="header">
        ${describeTrigger(this.trigger, this.hass, this._entityReg)}
      </h3>

      <slot name="icons" slot="icons"></slot>

      <ha-md-button-menu
        slot="icons"
        @click=${preventDefaultStopPropagation}
        @keydown=${stopPropagation}
        @closed=${stopPropagation}
        positioning="fixed"
      >
        <ha-icon-button
          slot="trigger"
          .label=${this.hass.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>

        ${!this.optionsInSidebar
          ? html` <ha-md-menu-item
                .clickAction=${this._renameTrigger}
                .disabled=${this.disabled || type === "list"}
              >
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.triggers.rename"
                )}
                <ha-svg-icon slot="start" .path=${mdiRenameBox}></ha-svg-icon>
              </ha-md-menu-item>

              <ha-md-menu-item
                .clickAction=${this._showTriggerId}
                .disabled=${this.disabled || type === "list"}
              >
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.triggers.edit_id"
                )}
                <ha-svg-icon slot="start" .path=${mdiIdentifier}></ha-svg-icon>
              </ha-md-menu-item>

              <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>`
          : nothing}

        <ha-md-menu-item
          .clickAction=${this._duplicateTrigger}
          .disabled=${this.disabled}
        >
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.duplicate"
          )}
          <ha-svg-icon slot="start" .path=${mdiContentDuplicate}></ha-svg-icon>
        </ha-md-menu-item>

        <ha-md-menu-item
          .clickAction=${this._copyTrigger}
          .disabled=${this.disabled}
        >
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.copy"
          )}
          <ha-svg-icon slot="start" .path=${mdiContentCopy}></ha-svg-icon>
        </ha-md-menu-item>

        <ha-md-menu-item
          .clickAction=${this._cutTrigger}
          .disabled=${this.disabled}
        >
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.cut"
          )}
          <ha-svg-icon slot="start" .path=${mdiContentCut}></ha-svg-icon>
        </ha-md-menu-item>

        <ha-md-menu-item
          .clickAction=${this._moveUp}
          .disabled=${this.disabled || this.first}
        >
          ${this.hass.localize("ui.panel.config.automation.editor.move_up")}
          <ha-svg-icon slot="start" .path=${mdiArrowUp}></ha-svg-icon
        ></ha-md-menu-item>

        <ha-md-menu-item
          .clickAction=${this._moveDown}
          .disabled=${this.disabled || this.last}
        >
          ${this.hass.localize("ui.panel.config.automation.editor.move_down")}
          <ha-svg-icon slot="start" .path=${mdiArrowDown}></ha-svg-icon
        ></ha-md-menu-item>

        ${!this.optionsInSidebar
          ? html`
              <ha-md-menu-item
                .clickAction=${this._toggleYamlMode}
                .disabled=${!supported}
              >
                ${this.hass.localize(
                  `ui.panel.config.automation.editor.edit_${!yamlMode ? "yaml" : "ui"}`
                )}
                <ha-svg-icon
                  slot="start"
                  .path=${mdiPlaylistEdit}
                ></ha-svg-icon>
              </ha-md-menu-item>
            `
          : nothing}

        <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>

        <ha-md-menu-item
          .clickAction=${this._onDisable}
          .disabled=${this.disabled || type === "list"}
        >
          ${"enabled" in this.trigger && this.trigger.enabled === false
            ? this.hass.localize(
                "ui.panel.config.automation.editor.actions.enable"
              )
            : this.hass.localize(
                "ui.panel.config.automation.editor.actions.disable"
              )}
          <ha-svg-icon
            slot="start"
            .path=${"enabled" in this.trigger && this.trigger.enabled === false
              ? mdiPlayCircleOutline
              : mdiStopCircleOutline}
          ></ha-svg-icon>
        </ha-md-menu-item>
        <ha-md-menu-item
          .clickAction=${this._onDelete}
          class="warning"
          .disabled=${this.disabled}
        >
          ${this.hass.localize(
            "ui.panel.config.automation.editor.actions.delete"
          )}
          <ha-svg-icon
            class="warning"
            slot="start"
            .path=${mdiDelete}
          ></ha-svg-icon>
        </ha-md-menu-item>
      </ha-md-button-menu>

      ${!this.optionsInSidebar
        ? html`<ha-automation-trigger-editor
            .hass=${this.hass}
            .trigger=${this.trigger}
            .disabled=${this.disabled}
            .yamlMode=${this._yamlMode}
            .showId=${this._requestShowId}
            .uiSupported=${supported}
          ></ha-automation-trigger-editor>`
        : nothing}
    `;
  }

  protected render() {
    if (!this.trigger) return nothing;

    return html`
      <ha-card outlined class=${this._selected ? "selected" : ""}>
        ${"enabled" in this.trigger && this.trigger.enabled === false
          ? html`
              <div class="disabled-bar">
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.actions.disabled"
                )}
              </div>
            `
          : nothing}
        ${this.optionsInSidebar
          ? html`<ha-automation-row @click=${this.openSidebar}
              >${this._selected
                ? "selected"
                : nothing}${this._renderRow()}</ha-automation-row
            >`
          : html`
              <ha-expansion-panel left-chevron>
                ${this._renderRow()}
              </ha-expansion-panel>
            `}
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
      triggers: trigger,
    });

    // Don't do anything if trigger not valid or if trigger changed.
    if (!validateResult.triggers.valid || this.trigger !== trigger) {
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

  public openSidebar(ev?: CustomEvent, trigger?: Trigger): void {
    ev?.stopPropagation();
    // TODO on click it's called twice, should be just once
    fireEvent(this, "open-sidebar", {
      save: (value) => {
        fireEvent(this, "value-changed", { value });
      },
      close: () => {
        this._selected = false;
        fireEvent(this, "close-sidebar");
      },
      rename: () => {
        this._renameTrigger();
      },
      toggleYamlMode: () => {
        this._toggleYamlMode();
        return this._yamlMode;
      },
      disable: this._onDisable,
      delete: this._onDelete,
      config: trigger || this.trigger,
      type: "trigger",
      uiSupported: this._uiSupported(this._getType(trigger || this.trigger)),
      yamlMode: this._yamlMode,
    });
    this._selected = true;
  }

  private _setClipboard() {
    this._clipboard = {
      ...this._clipboard,
      trigger: this.trigger,
    };
  }

  private _onDelete = () => {
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
        fireEvent(this, "close-sidebar");
      },
    });
  };

  private _onDisable = () => {
    if (isTriggerList(this.trigger)) return;
    const enabled = !(this.trigger.enabled ?? true);
    const value = { ...this.trigger, enabled };
    fireEvent(this, "value-changed", { value });
    this.openSidebar(undefined, value); // refresh sidebar

    if (this._yamlMode && !this.optionsInSidebar) {
      this.triggerContent?.yamlEditor?.setValue(value);
    }
  };

  private _switchUiMode() {
    this._yamlMode = false;
  }

  private _switchYamlMode() {
    this._yamlMode = true;
  }

  private _showTriggeredInfo() {
    showAlertDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.triggers.triggering_event_detail"
      ),
      text: html`
        <ha-yaml-editor
          read-only
          disable-fullscreen
          .hass=${this.hass}
          .defaultValue=${this._triggered}
        ></ha-yaml-editor>
      `,
    });
  }

  private _renameTrigger = async (): Promise<void> => {
    if (isTriggerList(this.trigger)) return;
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
        if (this.openSidebar) {
          this.openSidebar(undefined, value); // refresh sidebar
        } else {
          this.triggerContent?.yamlEditor?.setValue(value);
        }
      }
    }
  };

  private _showTriggerId = () => {
    this._requestShowId = true;

    if (!this.optionsInSidebar) {
      this.expand();
    }
  };

  private _duplicateTrigger = () => {
    fireEvent(this, "duplicate");
  };

  private _copyTrigger = () => {
    this._setClipboard();
  };

  private _cutTrigger = () => {
    this._setClipboard();
    fireEvent(this, "value-changed", { value: null });
    fireEvent(this, "close-sidebar");
  };

  private _moveUp = () => {
    fireEvent(this, "move-up");
  };

  private _moveDown = () => {
    fireEvent(this, "move-down");
  };

  private _toggleYamlMode = () => {
    if (this._yamlMode) {
      this._switchUiMode();
    } else {
      this._switchYamlMode();
    }

    if (!this.optionsInSidebar) {
      this.expand();
    }
  };

  public expand() {
    this.updateComplete.then(() => {
      this.shadowRoot!.querySelector("ha-expansion-panel")!.expanded = true;
    });
  }

  private _getType = memoizeOne((trigger: Trigger) =>
    isTriggerList(trigger) ? "list" : trigger.trigger
  );

  private _uiSupported = memoizeOne(
    (type: string) =>
      customElements.get(`ha-automation-trigger-${type}`) !== undefined
  );

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
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
          }
        }

        ha-card {
          transition: outline 0.2s;
        }

        ha-card.selected {
          outline: solid;
          outline-color: var(--primary-color);
          outline-offset: -2px;
          outline-width: 2px;
        }
        .disabled-bar {
          background: var(--divider-color, #e0e0e0);
          text-align: center;
          border-top-right-radius: calc(
            var(--ha-card-border-radius, 12px) - var(
                --ha-card-border-width,
                1px
              )
          );
          border-top-left-radius: calc(
            var(--ha-card-border-radius, 12px) - var(
                --ha-card-border-width,
                1px
              )
          );
        }
        .triggered {
          cursor: pointer;
          position: absolute;
          top: 0px;
          right: 0px;
          left: 0px;
          text-transform: uppercase;
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-bold);
          background-color: var(--primary-color);
          color: var(--text-primary-color);
          max-height: 0px;
          overflow: hidden;
          transition: max-height 0.3s;
          text-align: center;
          border-top-right-radius: calc(
            var(--ha-card-border-radius, 12px) - var(
                --ha-card-border-width,
                1px
              )
          );
          border-top-left-radius: calc(
            var(--ha-card-border-radius, 12px) - var(
                --ha-card-border-width,
                1px
              )
          );
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
        ha-md-menu-item > ha-svg-icon {
          --mdc-icon-size: 24px;
        }
        :host([highlight]) ha-card {
          --shadow-default: var(--ha-card-box-shadow, 0 0 0 0 transparent);
          --shadow-focus: 0 0 0 1px var(--state-inactive-color);
          border-color: var(--state-inactive-color);
          box-shadow: var(--shadow-default), var(--shadow-focus);
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
