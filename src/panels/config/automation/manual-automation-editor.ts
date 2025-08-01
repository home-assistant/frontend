import { mdiHelpCircle } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { load } from "js-yaml";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import {
  any,
  array,
  assert,
  assign,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { ensureArray } from "../../../common/array/ensure-array";
import { canOverrideAlphanumericInput } from "../../../common/dom/can-override-input";
import { fireEvent } from "../../../common/dom/fire_event";
import { constructUrlCurrentPath } from "../../../common/url/construct-url";
import {
  extractSearchParam,
  removeSearchParam,
} from "../../../common/url/search-params";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-markdown";
import type {
  AutomationConfig,
  Condition,
  ManualAutomationConfig,
  Trigger,
} from "../../../data/automation";
import {
  isCondition,
  isTrigger,
  normalizeAutomationConfig,
} from "../../../data/automation";
import { getActionType, type Action } from "../../../data/script";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import "./action/ha-automation-action";
import type HaAutomationAction from "./action/ha-automation-action";
import "./condition/ha-automation-condition";
import type HaAutomationCondition from "./condition/ha-automation-condition";
import "./ha-automation-sidebar";
import type { OpenSidebarConfig } from "./ha-automation-sidebar";
import { showPasteReplaceDialog } from "./paste-replace-dialog/show-dialog-paste-replace";
import "./trigger/ha-automation-trigger";
import type HaAutomationTrigger from "./trigger/ha-automation-trigger";

const baseConfigStruct = object({
  alias: optional(string()),
  description: optional(string()),
  triggers: optional(array(any())),
  conditions: optional(array(any())),
  actions: optional(array(any())),
  mode: optional(string()),
  max_exceeded: optional(string()),
  id: optional(string()),
});

const automationConfigStruct = union([
  assign(baseConfigStruct, object({ triggers: array(any()) })),
  assign(baseConfigStruct, object({ conditions: array(any()) })),
  assign(baseConfigStruct, object({ actions: array(any()) })),
]);

@customElement("manual-automation-editor")
export class HaManualAutomationEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public config!: ManualAutomationConfig;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property({ attribute: false }) public dirty = false;

  @state() private _pastedConfig?: ManualAutomationConfig;

  @state() private _sidebarConfig?: OpenSidebarConfig;

  private _previousConfig?: ManualAutomationConfig;

  public connectedCallback() {
    super.connectedCallback();
    window.addEventListener("paste", this._handlePaste);
  }

  public disconnectedCallback() {
    window.removeEventListener("paste", this._handlePaste);
    super.disconnectedCallback();
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    const expanded = extractSearchParam("expanded");
    if (expanded === "1") {
      this._clearParam("expanded");
      const items = this.shadowRoot!.querySelectorAll<
        HaAutomationTrigger | HaAutomationCondition | HaAutomationAction
      >("ha-automation-trigger, ha-automation-condition, ha-automation-action");

      items.forEach((el) => {
        el.updateComplete.then(() => {
          el.expandAll();
        });
      });
    }
  }

  private _clearParam(param: string) {
    window.history.replaceState(
      null,
      "",
      constructUrlCurrentPath(removeSearchParam(param))
    );
  }

  private _renderContent() {
    return html`
      ${this.stateObj?.state === "off"
        ? html`
            <ha-alert alert-type="info">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.disabled"
              )}
              <ha-button
                size="small"
                appearance="filled"
                slot="action"
                @click=${this._enable}
              >
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.enable"
                )}
              </ha-button>
            </ha-alert>
          `
        : nothing}
      ${this.config.description
        ? html`<ha-markdown
            class="description"
            breaks
            .content=${this.config.description}
          ></ha-markdown>`
        : nothing}
      <div class="header">
        <h2 id="triggers-heading" class="name">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.header"
          )}
        </h2>
        <a
          href=${documentationUrl(this.hass, "/docs/automation/trigger/")}
          target="_blank"
          rel="noreferrer"
        >
          <ha-icon-button
            .path=${mdiHelpCircle}
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.triggers.learn_more"
            )}
          ></ha-icon-button>
        </a>
      </div>
      ${!ensureArray(this.config.triggers)?.length
        ? html`<p>
            ${this.hass.localize(
              "ui.panel.config.automation.editor.triggers.description"
            )}
          </p>`
        : nothing}

      <ha-automation-trigger
        role="region"
        aria-labelledby="triggers-heading"
        .triggers=${this.config.triggers || []}
        .highlightedTriggers=${this._pastedConfig?.triggers || []}
        .path=${["triggers"]}
        @value-changed=${this._triggerChanged}
        .hass=${this.hass}
        .disabled=${this.disabled}
        @open-sidebar=${this._openSidebar}
        @close-sidebar=${this._closeSidebar}
        sidebar
      ></ha-automation-trigger>

      <div class="header">
        <h2 id="conditions-heading" class="name">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.conditions.header"
          )}
          <span class="small"
            >(${this.hass.localize("ui.common.optional")})</span
          >
        </h2>
        <a
          href=${documentationUrl(this.hass, "/docs/automation/condition/")}
          target="_blank"
          rel="noreferrer"
        >
          <ha-icon-button
            .path=${mdiHelpCircle}
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.conditions.learn_more"
            )}
          ></ha-icon-button>
        </a>
      </div>
      ${!ensureArray(this.config.conditions)?.length
        ? html`<p>
            ${this.hass.localize(
              "ui.panel.config.automation.editor.conditions.description",
              { user: this.hass.user?.name || "Alice" }
            )}
          </p>`
        : nothing}

      <ha-automation-condition
        role="region"
        aria-labelledby="conditions-heading"
        .conditions=${this.config.conditions || []}
        .highlightedConditions=${this._pastedConfig?.conditions || []}
        .path=${["conditions"]}
        @value-changed=${this._conditionChanged}
        .hass=${this.hass}
        .disabled=${this.disabled}
        @open-sidebar=${this._openSidebar}
        @close-sidebar=${this._closeSidebar}
        root
        sidebar
      ></ha-automation-condition>

      <div class="header">
        <h2 id="actions-heading" class="name">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.actions.header"
          )}
        </h2>
        <div>
          <a
            href=${documentationUrl(this.hass, "/docs/automation/action/")}
            target="_blank"
            rel="noreferrer"
          >
            <ha-icon-button
              .path=${mdiHelpCircle}
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.actions.learn_more"
              )}
            ></ha-icon-button>
          </a>
        </div>
      </div>
      ${!ensureArray(this.config.actions)?.length
        ? html`<p>
            ${this.hass.localize(
              "ui.panel.config.automation.editor.actions.description"
            )}
          </p>`
        : nothing}

      <ha-automation-action
        role="region"
        aria-labelledby="actions-heading"
        .actions=${this.config.actions || []}
        .highlightedActions=${this._pastedConfig?.actions || []}
        .path=${["actions"]}
        @value-changed=${this._actionChanged}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .disabled=${this.disabled}
        root
      ></ha-automation-action>
    `;
  }

  protected render() {
    return html`
      <div class="split-view">
        <div class="content">${this._renderContent()}</div>
        <ha-automation-sidebar
          class=${classMap({
            sidebar: true,
            hidden: !this._sidebarConfig,
            overlay: !this.isWide,
          })}
          .isWide=${this.isWide}
          .hass=${this.hass}
          .config=${this._sidebarConfig}
        ></ha-automation-sidebar>
      </div>
    `;
  }

  private _openSidebar(ev: CustomEvent<OpenSidebarConfig>) {
    // deselect previous selected row
    this._sidebarConfig?.close?.();
    this._sidebarConfig = ev.detail;
  }

  private _closeSidebar() {
    this._sidebarConfig = undefined;
  }

  private _triggerChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this.resetPastedConfig();
    fireEvent(this, "value-changed", {
      value: { ...this.config!, triggers: ev.detail.value as Trigger[] },
    });
  }

  private _conditionChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this.resetPastedConfig();
    fireEvent(this, "value-changed", {
      value: {
        ...this.config!,
        conditions: ev.detail.value as Condition[],
      },
    });
  }

  private _actionChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this.resetPastedConfig();
    fireEvent(this, "value-changed", {
      value: { ...this.config!, actions: ev.detail.value as Action[] },
    });
  }

  private async _enable(): Promise<void> {
    if (!this.hass || !this.stateObj) {
      return;
    }
    await this.hass.callService("automation", "turn_on", {
      entity_id: this.stateObj.entity_id,
    });
  }

  private _handlePaste = async (ev: ClipboardEvent) => {
    if (!canOverrideAlphanumericInput(ev.composedPath())) {
      return;
    }

    const paste = ev.clipboardData?.getData("text");
    if (!paste) {
      return;
    }

    let loaded: any;
    try {
      loaded = load(paste);
    } catch (_err: any) {
      showToast(this, {
        message: this.hass.localize(
          "ui.panel.config.automation.editor.paste_invalid_yaml"
        ),
        duration: 4000,
        dismissable: true,
      });
      return;
    }

    if (!loaded || typeof loaded !== "object") {
      return;
    }

    let config = loaded;

    if ("automation" in config) {
      config = config.automation;
      if (Array.isArray(config)) {
        config = config[0];
      }
    }

    if (Array.isArray(config)) {
      if (config.length === 1) {
        config = config[0];
      } else {
        const newConfig: AutomationConfig = {
          triggers: [],
          conditions: [],
          actions: [],
        };
        let found = false;
        config.forEach((cfg: any) => {
          if (isTrigger(cfg)) {
            found = true;
            (newConfig.triggers as Trigger[]).push(cfg);
          }
          if (isCondition(cfg)) {
            found = true;
            (newConfig.conditions as Condition[]).push(cfg);
          }
          if (getActionType(cfg) !== "unknown") {
            found = true;
            (newConfig.actions as Action[]).push(cfg);
          }
        });
        if (found) {
          config = newConfig;
        }
      }
    }

    if (isTrigger(config)) {
      config = { triggers: [config] };
    }
    if (isCondition(config)) {
      config = { conditions: [config] };
    }
    if (getActionType(config) !== "unknown") {
      config = { actions: [config] };
    }

    let normalized: AutomationConfig;

    try {
      normalized = normalizeAutomationConfig(config);
    } catch (_err: any) {
      return;
    }

    try {
      assert(normalized, automationConfigStruct);
    } catch (_err: any) {
      showToast(this, {
        message: this.hass.localize(
          "ui.panel.config.automation.editor.paste_invalid_config"
        ),
        duration: 4000,
        dismissable: true,
      });
      return;
    }

    if (normalized) {
      ev.preventDefault();

      if (this.dirty) {
        const result = await new Promise<boolean>((resolve) => {
          showPasteReplaceDialog(this, {
            domain: "automation",
            pastedConfig: normalized,
            onClose: () => resolve(false),
            onAppend: () => {
              this._appendToExistingConfig(normalized);
              resolve(false);
            },
            onReplace: () => resolve(true),
          });
        });

        if (!result) {
          return;
        }
      }

      // replace the config completely
      this._replaceExistingConfig(normalized);
    }
  };

  private _appendToExistingConfig(config: ManualAutomationConfig) {
    // make a copy otherwise we will reference the original config
    this._previousConfig = { ...this.config } as ManualAutomationConfig;
    this._pastedConfig = config;

    if (!this.config) {
      return;
    }

    if ("triggers" in config) {
      this.config.triggers = ensureArray(this.config.triggers || []).concat(
        ensureArray(config.triggers)
      );
    }
    if ("conditions" in config) {
      this.config.conditions = ensureArray(this.config.conditions || []).concat(
        ensureArray(config.conditions)
      );
    }
    if ("actions" in config) {
      this.config.actions = ensureArray(this.config.actions || []).concat(
        ensureArray(config.actions)
      ) as Action[];
    }

    this._showPastedToastWithUndo();

    fireEvent(this, "value-changed", {
      value: {
        ...this.config!,
      },
    });
  }

  private _replaceExistingConfig(config: ManualAutomationConfig) {
    // make a copy otherwise we will reference the original config
    this._previousConfig = { ...this.config } as ManualAutomationConfig;
    this._pastedConfig = config;
    this.config = config;

    this._showPastedToastWithUndo();

    fireEvent(this, "value-changed", {
      value: {
        ...this.config,
      },
    });
  }

  private _showPastedToastWithUndo() {
    showToast(this, {
      message: this.hass.localize(
        "ui.panel.config.automation.editor.paste_toast_message"
      ),
      duration: 4000,
      action: {
        text: this.hass.localize("ui.common.undo"),
        action: () => {
          fireEvent(this, "value-changed", {
            value: {
              ...this._previousConfig!,
            },
          });

          this._previousConfig = undefined;
          this._pastedConfig = undefined;
        },
      },
    });
  }

  public resetPastedConfig() {
    if (!this._previousConfig) {
      return;
    }

    this._pastedConfig = undefined;
    this._previousConfig = undefined;

    showToast(this, {
      message: "",
      duration: 0,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }

        .split-view {
          display: flex;
          flex-direction: row;
          height: 100%;
          gap: 32px;
          position: relative;
        }

        .content.full {
          flex: 10;
        }

        .content {
          flex: 6;
        }

        .sidebar {
          transition:
            height 0.3s ease-out,
            flex 0.3s ease-out;
          flex: 4;
          height: calc(100vh - 110px);
        }
        .sidebar.hidden {
          border-color: transparent;
          border-width: 0;
          overflow: hidden;
          flex: 0;
        }

        .sidebar.overlay {
          position: fixed;
          bottom: 0;
          right: 0;
          height: calc(100% - 64px);
          width: 40%;
        }

        @media all and (max-width: 870px) {
          .sidebar.overlay {
            height: 80vh;
            width: 100%;
          }
        }

        @media all and (max-width: 870px) {
          .sidebar.overlay.hidden {
            height: 0;
          }
        }

        .sidebar.overlay.hidden {
          width: 0;
        }

        ha-card {
          overflow: hidden;
        }
        .description {
          margin: 0;
        }
        p {
          margin-top: 0;
        }
        .header {
          margin-top: 16px;

          display: flex;
          align-items: center;
        }
        .header:first-child {
          margin-top: -16px;
        }
        .header .name {
          font-weight: var(--ha-font-weight-normal);
          flex: 1;
          margin-bottom: 16px;
        }
        .header a {
          color: var(--secondary-text-color);
        }
        .header .small {
          font-size: small;
          font-weight: var(--ha-font-weight-normal);
          line-height: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "manual-automation-editor": HaManualAutomationEditor;
  }

  // custom event open-sidebar
  interface HASSDomEvents {
    "open-sidebar": OpenSidebarConfig;
    "close-sidebar": undefined;
  }
}
