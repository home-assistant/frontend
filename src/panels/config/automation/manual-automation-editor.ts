import type { HassEntity } from "home-assistant-js-websocket";
import { load } from "js-yaml";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, queryAll } from "lit/decorators";
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
import "../../../components/ha-button";
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
import { showToast } from "../../../util/toast";
import "./action/ha-automation-action";
import type HaAutomationAction from "./action/ha-automation-action";
import "./condition/ha-automation-condition";
import type HaAutomationCondition from "./condition/ha-automation-condition";
import { ManualEditorMixin } from "./ha-manual-editor-mixin";
import { showPasteReplaceDialog } from "./paste-replace-dialog/show-dialog-paste-replace";
import { manualEditorStyles, saveFabStyles } from "./styles";
import "./trigger/ha-automation-trigger";

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
export class HaManualAutomationEditor extends ManualEditorMixin<ManualAutomationConfig>(
  LitElement
) {
  @property({ attribute: false }) public stateObj?: HassEntity;

  @queryAll("ha-automation-action, ha-automation-condition")
  protected collapsableElements?: NodeListOf<
    HaAutomationAction | HaAutomationCondition
  >;

  protected renderContent() {
    return html`
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
        .highlightedTriggers=${this.pastedConfig?.triggers}
        @value-changed=${this._triggerChanged}
        .hass=${this.hass}
        .disabled=${this.disabled || this.saving}
        .narrow=${this.narrow}
        @open-sidebar=${this.openSidebar}
        @request-close-sidebar=${this.triggerCloseSidebar}
        @close-sidebar=${this.handleCloseSidebar}
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
        .highlightedConditions=${this.pastedConfig?.conditions}
        @value-changed=${this._conditionChanged}
        .hass=${this.hass}
        .disabled=${this.disabled || this.saving}
        .narrow=${this.narrow}
        @open-sidebar=${this.openSidebar}
        @request-close-sidebar=${this.triggerCloseSidebar}
        @close-sidebar=${this.handleCloseSidebar}
        root
        sidebar
      ></ha-automation-condition>

      <div class="header">
        <h2 id="actions-heading" class="name">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.actions.header"
          )}
        </h2>
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
        .highlightedActions=${this.pastedConfig?.actions}
        @value-changed=${this._actionChanged}
        @open-sidebar=${this.openSidebar}
        @request-close-sidebar=${this.triggerCloseSidebar}
        @close-sidebar=${this.handleCloseSidebar}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .disabled=${this.disabled || this.saving}
        root
        sidebar
      ></ha-automation-action>
    `;
  }

  protected saveConfig() {
    fireEvent(this, "save-automation");
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

  protected handlePaste = async (ev: ClipboardEvent) => {
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

      const keysPresent = Object.keys(normalized).filter(
        (key) => ensureArray(normalized[key]).length
      );

      if (
        keysPresent.length === 1 &&
        ["triggers", "conditions", "actions"].includes(keysPresent[0])
      ) {
        // if only one type of element is pasted, insert under the currently active item
        if (this.tryInsertAfterSelected(normalized[keysPresent[0]])) {
          this.showPastedToastWithUndo();
          return;
        }
      }

      if (
        this.dirty ||
        ensureArray(this.config.triggers)?.length ||
        ensureArray(this.config.conditions)?.length ||
        ensureArray(this.config.actions)?.length
      ) {
        // ask if they want to append or replace if we have existing config or there are unsaved changes
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
      this.replaceExistingConfig(normalized);
    }
  };

  private _appendToExistingConfig(config: ManualAutomationConfig) {
    this.pastedConfig = config;
    // make a copy otherwise we will modify the original config
    // which breaks the (referenced) config used for storing in undo stack
    const workingCopy: ManualAutomationConfig = { ...this.config };

    if (!workingCopy) {
      return;
    }

    if ("triggers" in config) {
      workingCopy.triggers = ensureArray(workingCopy.triggers || []).concat(
        ensureArray(config.triggers)
      );
    }
    if ("conditions" in config) {
      workingCopy.conditions = ensureArray(workingCopy.conditions || []).concat(
        ensureArray(config.conditions)
      );
    }
    if ("actions" in config) {
      workingCopy.actions = ensureArray(workingCopy.actions || []).concat(
        ensureArray(config.actions)
      ) as Action[];
    }

    this.showPastedToastWithUndo();

    fireEvent(this, "value-changed", {
      value: {
        ...workingCopy!,
      },
    });
  }

  protected showPastedToastWithUndo() {
    showToast(this, {
      message: this.hass.localize(
        "ui.panel.config.automation.editor.paste_toast_message"
      ),
      duration: 4000,
      action: {
        text: this.hass.localize("ui.common.undo"),
        action: () => {
          fireEvent(this, "undo-change");

          this.pastedConfig = undefined;
        },
      },
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

        .description {
          margin-top: 16px;
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
    "open-sidebar": SidebarConfig;
    "request-close-sidebar": undefined;
    "close-sidebar": undefined;
  }
}
