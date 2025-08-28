import { mdiContentSave, mdiHelpCircle, mdiRobotConfused } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { load } from "js-yaml";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
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
import { computeRTL } from "../../../common/util/compute_rtl";
import "../../../components/ha-button";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-markdown";
import type {
  AutomationConfig,
  Condition,
  ManualAutomationConfig,
  SidebarConfig,
  Trigger,
} from "../../../data/automation";
import {
  isCondition,
  isTrigger,
  normalizeAutomationConfig,
} from "../../../data/automation";
import { getActionType, type Action } from "../../../data/script";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import "./action/ha-automation-action";
import type HaAutomationAction from "./action/ha-automation-action";
import "./condition/ha-automation-condition";
import type HaAutomationCondition from "./condition/ha-automation-condition";
import "./ha-automation-sidebar";
import type HaAutomationSidebar from "./ha-automation-sidebar";
import { showPasteReplaceDialog } from "./paste-replace-dialog/show-dialog-paste-replace";
import { manualEditorStyles, saveFabStyles } from "./styles";
import "./trigger/ha-automation-trigger";
import { UNAVAILABLE } from "../../../data/entity";

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

  @property({ type: Boolean }) public saving = false;

  @property({ attribute: false }) public config!: ManualAutomationConfig;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property({ attribute: false }) public dirty = false;

  @property({ attribute: false }) public errors?: string;

  @property({ attribute: false }) public hasBlueprintConfig = false;

  @property({ attribute: false })
  public validationErrors?: (string | TemplateResult)[];

  @state() private _pastedConfig?: ManualAutomationConfig;

  @state() private _sidebarConfig?: SidebarConfig;

  @query(".content")
  private _contentElement?: HTMLDivElement;

  @query("ha-automation-sidebar") private _sidebarElement?: HaAutomationSidebar;

  private _previousConfig?: ManualAutomationConfig;

  public connectedCallback() {
    super.connectedCallback();
    window.addEventListener("paste", this._handlePaste);
  }

  public disconnectedCallback() {
    window.removeEventListener("paste", this._handlePaste);
    super.disconnectedCallback();
  }

  private _renderContent() {
    return html`
      ${this.stateObj?.state === "off"
        ? html`
            <ha-alert alert-type="info">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.disabled"
              )}
              <ha-button size="small" slot="action" @click=${this._enable}>
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
        @value-changed=${this._triggerChanged}
        .hass=${this.hass}
        .disabled=${this.disabled || this.saving}
        .narrow=${this.narrow}
        @open-sidebar=${this._openSidebar}
        @request-close-sidebar=${this._closeSidebar}
        @close-sidebar=${this._handleCloseSidebar}
        root
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
        @value-changed=${this._conditionChanged}
        .hass=${this.hass}
        .disabled=${this.disabled || this.saving}
        .narrow=${this.narrow}
        @open-sidebar=${this._openSidebar}
        @request-close-sidebar=${this._closeSidebar}
        @close-sidebar=${this._handleCloseSidebar}
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
        @value-changed=${this._actionChanged}
        @open-sidebar=${this._openSidebar}
        @request-close-sidebar=${this._closeSidebar}
        @close-sidebar=${this._handleCloseSidebar}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .disabled=${this.disabled || this.saving}
        root
        sidebar
      ></ha-automation-action>
    `;
  }

  protected render() {
    return html`
      <div
        class=${classMap({
          "split-view": true,
          "sidebar-hidden": !this._sidebarConfig,
        })}
      >
        <div class="content-wrapper">
          <div class="content">
            <div class="error-wrapper">
              ${this.errors || this.stateObj?.state === UNAVAILABLE
                ? html`<ha-alert
                    alert-type="error"
                    .title=${this.stateObj?.state === UNAVAILABLE
                      ? this.hass.localize(
                          "ui.panel.config.automation.editor.unavailable"
                        )
                      : undefined}
                  >
                    ${this.errors || this.validationErrors}
                    ${this.stateObj?.state === UNAVAILABLE
                      ? html`<ha-svg-icon
                          slot="icon"
                          .path=${mdiRobotConfused}
                        ></ha-svg-icon>`
                      : nothing}
                  </ha-alert>`
                : ""}
              ${this.hasBlueprintConfig
                ? html`<ha-alert alert-type="info">
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.confirm_take_control"
                    )}
                    <div slot="action" style="display: flex;">
                      <ha-button
                        appearance="plain"
                        @click=${this._takeControlSave}
                        >${this.hass.localize("ui.common.yes")}</ha-button
                      >
                      <ha-button
                        appearance="plain"
                        @click=${this._revertBlueprint}
                        >${this.hass.localize("ui.common.no")}</ha-button
                      >
                    </div>
                  </ha-alert>`
                : this.disabled
                  ? html`<ha-alert alert-type="warning" dismissable
                      >${this.hass.localize(
                        "ui.panel.config.automation.editor.read_only"
                      )}
                      <ha-button
                        appearance="filled"
                        size="small"
                        variant="warning"
                        slot="action"
                        @click=${this._duplicate}
                      >
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.migrate"
                        )}
                      </ha-button>
                    </ha-alert>`
                  : nothing}
            </div>

            ${this._renderContent()}
          </div>
          <ha-fab
            slot="fab"
            class=${this.dirty ? "dirty" : ""}
            .label=${this.hass.localize("ui.common.save")}
            .disabled=${this.saving}
            extended
            @click=${this._saveAutomation}
          >
            <ha-svg-icon slot="icon" .path=${mdiContentSave}></ha-svg-icon>
          </ha-fab>
        </div>
        <ha-automation-sidebar
          tabindex="-1"
          class=${classMap({
            sidebar: true,
            overlay: !this.isWide && !this.narrow,
            rtl: computeRTL(this.hass),
          })}
          .isWide=${this.isWide}
          .hass=${this.hass}
          .narrow=${this.narrow}
          .config=${this._sidebarConfig}
          @value-changed=${this._sidebarConfigChanged}
          .disabled=${this.disabled}
        ></ha-automation-sidebar>
      </div>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    const expanded = extractSearchParam("expanded");
    if (expanded === "1") {
      this._clearParam("expanded");
      this.expandAll();
    }
  }

  private _clearParam(param: string) {
    window.history.replaceState(
      null,
      "",
      constructUrlCurrentPath(removeSearchParam(param))
    );
  }

  private async _openSidebar(ev: CustomEvent<SidebarConfig>) {
    // deselect previous selected row
    this._sidebarConfig?.close?.();
    this._sidebarConfig = ev.detail;

    await this._sidebarElement?.updateComplete;
    this._sidebarElement?.focus();
  }

  private _sidebarConfigChanged(ev: CustomEvent<{ value: SidebarConfig }>) {
    ev.stopPropagation();
    if (!this._sidebarConfig) {
      return;
    }

    this._sidebarConfig = {
      ...this._sidebarConfig,
      ...ev.detail.value,
    };
  }

  private _closeSidebar() {
    if (this._sidebarConfig) {
      this._sidebarConfig?.close();
    }
  }

  private _handleCloseSidebar() {
    this._sidebarConfig = undefined;
    // fix content shift when bottom rows are scrolled into view
    this._contentElement?.scrollIntoView();
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

  private _duplicate() {
    fireEvent(this, "duplicate-automation");
  }

  private _takeControlSave() {
    fireEvent(this, "take-control-save");
  }

  private _revertBlueprint() {
    fireEvent(this, "revert-blueprint");
  }

  private _saveAutomation() {
    this._closeSidebar();
    fireEvent(this, "save-automation");
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

  private _getCollapsableElements() {
    return this.shadowRoot!.querySelectorAll<
      HaAutomationAction | HaAutomationCondition
    >("ha-automation-action, ha-automation-condition");
  }

  public expandAll() {
    this._getCollapsableElements().forEach((element) => {
      element.expandAll();
    });
  }

  public collapseAll() {
    this._getCollapsableElements().forEach((element) => {
      element.collapseAll();
    });
  }

  static get styles(): CSSResultGroup {
    return [
      saveFabStyles,
      manualEditorStyles,
      css`
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
          margin-bottom: 8px;
        }
        .header .small {
          font-size: small;
          font-weight: var(--ha-font-weight-normal);
          line-height: 0;
        }

        .error-wrapper {
          position: sticky;
          top: -24px;
          margin-top: -24px;
          margin-bottom: -163px;
          z-index: 100;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .error-wrapper ha-alert {
          background-color: var(--card-background-color);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          border-radius: var(--ha-border-radius-sm);
          margin-bottom: 0;
        }

        ha-alert {
          display: block;
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "manual-automation-editor": HaManualAutomationEditor;
  }

  interface HASSDomEvents {
    "duplicate-automation": undefined;
    "close-sidebar": undefined;
    "open-sidebar": SidebarConfig;
    "request-close-sidebar": undefined;
    "revert-blueprint": undefined;
    "take-control-save": undefined;
  }
}
