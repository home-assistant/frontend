import { consume } from "@lit/context";
import {
  mdiAppleKeyboardCommand,
  mdiArrowDown,
  mdiArrowUp,
  mdiContentCopy,
  mdiContentCut,
  mdiDelete,
  mdiDotsVertical,
  mdiInformation,
  mdiPlayCircleOutline,
  mdiPlaylistEdit,
  mdiPlusCircleMultipleOutline,
  mdiRenameBox,
  mdiStopCircleOutline,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { dump } from "js-yaml";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../../common/array/ensure-array";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import { preventDefaultStopPropagation } from "../../../../common/dom/prevent_default_stop_propagation";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import { handleStructError } from "../../../../common/structs/handle-errors";
import { copyToClipboard } from "../../../../common/util/copy-clipboard";
import { debounce } from "../../../../common/util/debounce";
import "../../../../components/ha-alert";
import "../../../../components/ha-automation-row";
import type { HaAutomationRow } from "../../../../components/ha-automation-row";
import "../../../../components/ha-card";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-button-menu";
import "../../../../components/ha-md-divider";
import "../../../../components/ha-md-menu-item";
import "../../../../components/ha-svg-icon";
import type {
  AutomationClipboard,
  Trigger,
  TriggerSidebarConfig,
} from "../../../../data/automation";
import { isTrigger, subscribeTrigger } from "../../../../data/automation";
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
import type { HomeAssistant } from "../../../../types";
import { isMac } from "../../../../util/is_mac";
import { showToast } from "../../../../util/toast";
import "../ha-automation-editor-warning";
import { overflowStyles, rowStyles } from "../styles";
import "./ha-automation-trigger-editor";
import type HaAutomationTriggerEditor from "./ha-automation-trigger-editor";
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

  @property({ type: Boolean }) public highlight?: boolean;

  @property({ type: Boolean, attribute: "sidebar" })
  public optionsInSidebar = false;

  @property({ type: Boolean, attribute: "sort-selected" })
  public sortSelected = false;

  @state() private _yamlMode = false;

  @state() private _triggered?: Record<string, unknown>;

  @state() private _triggerColor = false;

  @state() private _selected = false;

  @state() private _warnings?: string[];

  @property({ type: Boolean }) public narrow = false;

  @query("ha-automation-trigger-editor")
  public triggerEditor?: HaAutomationTriggerEditor;

  @query("ha-automation-row")
  private _automationRowElement?: HaAutomationRow;

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

  get selected() {
    return this._selected;
  }

  private _triggerUnsub?: Promise<UnsubscribeFunc>;

  private _renderOverflowLabel(label: string, shortcut?: TemplateResult) {
    return html`
      <div class="overflow-label">
        ${label}
        ${this.optionsInSidebar && !this.narrow
          ? shortcut ||
            html`<span
              class="shortcut-placeholder ${isMac ? "mac" : ""}"
            ></span>`
          : nothing}
      </div>
    `;
  }

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
        quick
        slot="icons"
        @click=${preventDefaultStopPropagation}
        @keydown=${stopPropagation}
        @closed=${stopPropagation}
        positioning="fixed"
        anchor-corner="end-end"
        menu-corner="start-end"
      >
        <ha-icon-button
          slot="trigger"
          .label=${this.hass.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>
        <ha-md-menu-item
          .clickAction=${this._renameTrigger}
          .disabled=${this.disabled || type === "list"}
        >
          <ha-svg-icon slot="start" .path=${mdiRenameBox}></ha-svg-icon>
          ${this._renderOverflowLabel(
            this.hass.localize(
              "ui.panel.config.automation.editor.triggers.rename"
            )
          )}
        </ha-md-menu-item>

        <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>

        <ha-md-menu-item
          .clickAction=${this._duplicateTrigger}
          .disabled=${this.disabled}
        >
          <ha-svg-icon
            slot="start"
            .path=${mdiPlusCircleMultipleOutline}
          ></ha-svg-icon>

          ${this._renderOverflowLabel(
            this.hass.localize(
              "ui.panel.config.automation.editor.actions.duplicate"
            )
          )}
        </ha-md-menu-item>

        <ha-md-menu-item
          .clickAction=${this._copyTrigger}
          .disabled=${this.disabled}
        >
          <ha-svg-icon slot="start" .path=${mdiContentCopy}></ha-svg-icon>
          ${this._renderOverflowLabel(
            this.hass.localize(
              "ui.panel.config.automation.editor.triggers.copy"
            ),
            html`<span class="shortcut">
              <span
                >${isMac
                  ? html`<ha-svg-icon
                      slot="start"
                      .path=${mdiAppleKeyboardCommand}
                    ></ha-svg-icon>`
                  : this.hass.localize(
                      "ui.panel.config.automation.editor.ctrl"
                    )}</span
              >
              <span>+</span>
              <span>C</span>
            </span>`
          )}
        </ha-md-menu-item>

        <ha-md-menu-item
          .clickAction=${this._cutTrigger}
          .disabled=${this.disabled}
        >
          <ha-svg-icon slot="start" .path=${mdiContentCut}></ha-svg-icon>
          ${this._renderOverflowLabel(
            this.hass.localize(
              "ui.panel.config.automation.editor.triggers.cut"
            ),
            html`<span class="shortcut">
              <span
                >${isMac
                  ? html`<ha-svg-icon
                      slot="start"
                      .path=${mdiAppleKeyboardCommand}
                    ></ha-svg-icon>`
                  : this.hass.localize(
                      "ui.panel.config.automation.editor.ctrl"
                    )}</span
              >
              <span>+</span>
              <span>X</span>
            </span>`
          )}
        </ha-md-menu-item>

        ${!this.optionsInSidebar
          ? html`
              <ha-md-menu-item
                .clickAction=${this._moveUp}
                .disabled=${this.disabled || !!this.first}
              >
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.move_up"
                )}
                <ha-svg-icon slot="start" .path=${mdiArrowUp}></ha-svg-icon
              ></ha-md-menu-item>
              <ha-md-menu-item
                .clickAction=${this._moveDown}
                .disabled=${this.disabled || !!this.last}
              >
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.move_down"
                )}
                <ha-svg-icon slot="start" .path=${mdiArrowDown}></ha-svg-icon
              ></ha-md-menu-item>
            `
          : nothing}

        <ha-md-menu-item
          .clickAction=${this._toggleYamlMode}
          .disabled=${!supported || !!this._warnings}
        >
          <ha-svg-icon slot="start" .path=${mdiPlaylistEdit}></ha-svg-icon>
          ${this._renderOverflowLabel(
            this.hass.localize(
              `ui.panel.config.automation.editor.edit_${!yamlMode ? "yaml" : "ui"}`
            )
          )}
        </ha-md-menu-item>

        <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>

        <ha-md-menu-item
          .clickAction=${this._onDisable}
          .disabled=${this.disabled || type === "list"}
        >
          <ha-svg-icon
            slot="start"
            .path=${"enabled" in this.trigger && this.trigger.enabled === false
              ? mdiPlayCircleOutline
              : mdiStopCircleOutline}
          ></ha-svg-icon>

          ${this._renderOverflowLabel(
            this.hass.localize(
              `ui.panel.config.automation.editor.actions.${"enabled" in this.trigger && this.trigger.enabled === false ? "enable" : "disable"}`
            )
          )}
        </ha-md-menu-item>
        <ha-md-menu-item
          .clickAction=${this._onDelete}
          class="warning"
          .disabled=${this.disabled}
        >
          <ha-svg-icon
            class="warning"
            slot="start"
            .path=${mdiDelete}
          ></ha-svg-icon>
          ${this._renderOverflowLabel(
            this.hass.localize(
              "ui.panel.config.automation.editor.actions.delete"
            ),
            html`<span class="shortcut">
              <span
                >${isMac
                  ? html`<ha-svg-icon
                      slot="start"
                      .path=${mdiAppleKeyboardCommand}
                    ></ha-svg-icon>`
                  : this.hass.localize(
                      "ui.panel.config.automation.editor.ctrl"
                    )}</span
              >
              <span>+</span>
              <span
                >${this.hass.localize(
                  "ui.panel.config.automation.editor.del"
                )}</span
              >
            </span>`
          )}
        </ha-md-menu-item>
      </ha-md-button-menu>
      ${!this.optionsInSidebar
        ? html`${this._warnings
              ? html`<ha-automation-editor-warning
                  .localize=${this.hass.localize}
                  .warnings=${this._warnings}
                >
                </ha-automation-editor-warning>`
              : nothing}
            <ha-automation-trigger-editor
              .hass=${this.hass}
              .trigger=${this.trigger}
              .disabled=${this.disabled}
              .yamlMode=${this._yamlMode}
              .uiSupported=${supported}
              @ui-mode-not-available=${this._handleUiModeNotAvailable}
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
          ? html`<ha-automation-row
              .disabled=${"enabled" in this.trigger &&
              this.trigger.enabled === false}
              .selected=${this._selected}
              .highlight=${this.highlight}
              .sortSelected=${this.sortSelected}
              @click=${this._toggleSidebar}
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
          <ha-svg-icon .path=${mdiInformation}></ha-svg-icon>
        </div>
      </ha-card>
    `;
  }

  protected willUpdate(changedProperties) {
    // on yaml toggle --> clear warnings
    if (changedProperties.has("yamlMode")) {
      this._warnings = undefined;
    }
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

  private _handleUiModeNotAvailable(ev: CustomEvent) {
    this._warnings = handleStructError(this.hass, ev.detail).warnings;
    if (!this._yamlMode) {
      this._yamlMode = true;
    }
  }

  private _toggleSidebar(ev: Event) {
    ev?.stopPropagation();

    if (this._selected) {
      fireEvent(this, "request-close-sidebar");
      return;
    }
    this.openSidebar();
  }

  public openSidebar(trigger?: Trigger): void {
    fireEvent(this, "open-sidebar", {
      save: (value) => {
        fireEvent(this, "value-changed", { value });
      },
      close: (focus?: boolean) => {
        this._selected = false;
        fireEvent(this, "close-sidebar");
        if (focus) {
          this.focus();
        }
      },
      rename: () => {
        this._renameTrigger();
      },
      toggleYamlMode: () => {
        this._toggleYamlMode();
        this.openSidebar();
      },
      disable: this._onDisable,
      delete: this._onDelete,
      copy: this._copyTrigger,
      duplicate: this._duplicateTrigger,
      cut: this._cutTrigger,
      insertAfter: this._insertAfter,
      config: trigger || this.trigger,
      uiSupported: this._uiSupported(this._getType(trigger || this.trigger)),
      yamlMode: this._yamlMode,
    } satisfies TriggerSidebarConfig);
    this._selected = true;

    if (this.narrow) {
      window.setTimeout(() => {
        this.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
      }, 180);
    }
  }

  private _setClipboard() {
    this._clipboard = {
      ...this._clipboard,
      trigger: this.trigger,
    };

    copyToClipboard(dump(this.trigger));
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

        if (this._selected) {
          fireEvent(this, "close-sidebar");
        }
      },
    });
  };

  private _onDisable = () => {
    if (isTriggerList(this.trigger)) return;
    const enabled = !(this.trigger.enabled ?? true);
    const value = { ...this.trigger, enabled };
    fireEvent(this, "value-changed", { value });

    if (this._selected && this.optionsInSidebar) {
      this.openSidebar(value); // refresh sidebar
    }

    if (this._yamlMode && !this.optionsInSidebar) {
      this.triggerEditor?.yamlEditor?.setValue(value);
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
          .yamlSchema=${this._yamlSchema ?? DEFAULT_SCHEMA}
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

      if (this._selected && this.optionsInSidebar) {
        this.openSidebar(value); // refresh sidebar
      } else if (this._yamlMode) {
        this.triggerEditor?.yamlEditor?.setValue(value);
      }
    }
  };

  private _duplicateTrigger = () => {
    fireEvent(this, "duplicate");
  };

  private _insertAfter = (value: Trigger | Trigger[]) => {
    if (ensureArray(value).some((val) => !isTrigger(val))) {
      return false;
    }
    fireEvent(this, "insert-after", { value });
    return true;
  };

  private _copyTrigger = () => {
    this._setClipboard();
    showToast(this, {
      message: this.hass.localize(
        "ui.panel.config.automation.editor.triggers.copied_to_clipboard"
      ),
      duration: 2000,
    });
  };

  private _cutTrigger = () => {
    this._setClipboard();
    fireEvent(this, "value-changed", { value: null });
    if (this._selected) {
      fireEvent(this, "close-sidebar");
    }
    showToast(this, {
      message: this.hass.localize(
        "ui.panel.config.automation.editor.triggers.cut_to_clipboard"
      ),
      duration: 2000,
    });
  };

  private _moveUp = () => {
    fireEvent(this, "move-up");
  };

  private _moveDown = () => {
    fireEvent(this, "move-down");
  };

  private _toggleYamlMode = (item?: HTMLElement) => {
    if (this._yamlMode) {
      this._switchUiMode();
    } else {
      this._switchYamlMode();
    }

    if (!this.optionsInSidebar) {
      this.expand();
    } else if (item) {
      this.openSidebar();
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

  public focus() {
    this._automationRowElement?.focus();
  }

  static get styles(): CSSResultGroup {
    return [
      rowStyles,
      overflowStyles,
      css`
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
          border-top-right-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
          border-top-left-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 4px;
          line-height: 1;
          padding: 0;
        }
        .triggered ha-svg-icon {
          --mdc-icon-size: 16px;
        }

        .triggered.active {
          max-height: 100px;
          padding: 4px;
        }
        .triggered:hover {
          opacity: 0.8;
        }
        .triggered.accent {
          background-color: var(--accent-color);
          color: var(--text-accent-color, var(--text-primary-color));
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
