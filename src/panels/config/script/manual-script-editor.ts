import { mdiHelpCircleOutline } from "@mdi/js";
import { load } from "js-yaml";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, query, queryAll } from "lit/decorators";
import {
  any,
  array,
  assert,
  enums,
  number,
  object,
  optional,
  string,
} from "superstruct";
import { ensureArray } from "../../../common/array/ensure-array";
import { canOverrideAlphanumericInput } from "../../../common/dom/can-override-input";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-icon-button";
import "../../../components/ha-markdown";
import type {
  Action,
  Fields,
  ManualScriptConfig,
  ScriptConfig,
} from "../../../data/script";
import {
  getActionType,
  MODES,
  normalizeScriptConfig,
} from "../../../data/script";
import { documentationUrl } from "../../../util/documentation-url";
import { showEditorToast } from "../automation/editor-toast";
import "../automation/action/ha-automation-action";
import type HaAutomationAction from "../automation/action/ha-automation-action";
import { ManualEditorMixin } from "../automation/ha-manual-editor-mixin";
import { showPasteReplaceDialog } from "../automation/paste-replace-dialog/show-dialog-paste-replace";
import { manualEditorStyles, saveFabStyles } from "../automation/styles";
import "./ha-script-fields";
import type HaScriptFields from "./ha-script-fields";

const scriptConfigStruct = object({
  alias: optional(string()),
  description: optional(string()),
  sequence: optional(array(any())),
  icon: optional(string()),
  mode: optional(enums([typeof MODES])),
  max: optional(number()),
  fields: optional(object()),
});

@customElement("manual-script-editor")
export class HaManualScriptEditor extends ManualEditorMixin<ScriptConfig>(
  LitElement
) {
  @query("ha-script-fields")
  private _scriptFields?: HaScriptFields;

  @queryAll("ha-automation-action, ha-script-fields")
  protected collapsableElements?: NodeListOf<
    HaAutomationAction | HaScriptFields
  >;

  private _openFields = false;

  public addFields() {
    this._openFields = true;
    fireEvent(this, "value-changed", {
      value: {
        ...this.config,
        fields: {
          [this.hass.localize("ui.panel.config.script.editor.field.field") ||
          "field"]: {
            selector: {
              text: null,
            },
          },
        },
      },
    });
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (this._openFields && changedProps.has("config")) {
      this._openFields = false;
      this._scriptFields?.updateComplete.then(() =>
        this._scriptFields?.focusLastField()
      );
    }
  }

  protected renderContent() {
    return html`
      ${
        this.config.description
          ? html`<ha-markdown
              class="description"
              breaks
              .content=${this.config.description}
            ></ha-markdown>`
          : nothing
      }
    ${
      this.config.fields
        ? html`<div class="header">
              <h2 id="fields-heading" class="name">
                ${this.hass.localize(
                  "ui.panel.config.script.editor.field.fields"
                )}
              </h2>
              <ha-icon-button
                .path=${mdiHelpCircleOutline}
                .label=${this.hass.localize(
                  "ui.panel.config.script.editor.field.link_help_fields"
                )}
                href=${documentationUrl(
                  this.hass,
                  "/integrations/script/#fields"
                )}
                target="_blank"
                rel="noreferrer"
              ></ha-icon-button>
            </div>

            <ha-script-fields
              role="region"
              aria-labelledby="fields-heading"
              .fields=${this.config.fields}
              .highlightedFields=${this.pastedConfig?.fields}
              @value-changed=${this._fieldsChanged}
              .hass=${this.hass}
              .disabled=${this.disabled}
              .narrow=${this.narrow}
              @open-sidebar=${this.openSidebar}
              @request-close-sidebar=${this.triggerCloseSidebar}
              @close-sidebar=${this.handleCloseSidebar}
            ></ha-script-fields>`
        : nothing
    }

    <div class="header">
      <h2 id="sequence-heading" class="name">
        ${this.hass.localize("ui.panel.config.script.editor.sequence")}
      </h2>
    </div>

    <ha-automation-action
      role="region"
      aria-labelledby="sequence-heading"
      .actions=${this.config.sequence || []}
      .highlightedActions=${this.pastedConfig?.sequence}
      @value-changed=${this._sequenceChanged}
      @open-sidebar=${this.openSidebar}
      @request-close-sidebar=${this.triggerCloseSidebar}
      @close-sidebar=${this.handleCloseSidebar}
      .hass=${this.hass}
      .editorDirty=${this.dirty}
      .narrow=${this.narrow}
      .disabled=${this.disabled || this.saving}
      root
      sidebar
    ></ha-automation-action>
  </div>`;
  }

  protected saveConfig() {
    fireEvent(this, "save-script");
  }

  private _fieldsChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this.resetPastedConfig();
    fireEvent(this, "value-changed", {
      value: { ...this.config!, fields: ev.detail.value as Fields },
    });
  }

  private _sequenceChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this.resetPastedConfig();
    fireEvent(this, "value-changed", {
      value: { ...this.config!, sequence: ev.detail.value as Action[] },
    });
  }

  protected handlePaste = async (ev: ClipboardEvent) => {
    // Ignore events on inputs/textareas
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
      showEditorToast(this, {
        message: this.hass.localize(
          "ui.panel.config.script.editor.paste_invalid_config"
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

    if ("script" in config) {
      config = config.script;
      if (Object.keys(config).length) {
        config = config[Object.keys(config)[0]];
      }
    }

    if (Array.isArray(config)) {
      if (config.length === 1) {
        config = config[0];
      } else {
        config = { sequence: config };
      }
    }

    const actionType = getActionType(config);
    if (
      !["sequence", "unknown"].includes(actionType) ||
      (actionType === "sequence" && "metadata" in config)
    ) {
      config = { sequence: [config] };
    }

    let normalized: ScriptConfig | undefined;

    try {
      normalized = normalizeScriptConfig(config);
    } catch (_err: any) {
      return;
    }

    try {
      assert(normalized, scriptConfigStruct);
    } catch (_err: any) {
      showEditorToast(this, {
        message: this.hass.localize(
          "ui.panel.config.script.editor.paste_invalid_config"
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

      if (keysPresent.length === 1 && ["sequence"].includes(keysPresent[0])) {
        // if only one type of element is pasted, insert under the currently active item
        if (this.tryInsertAfterSelected(normalized[keysPresent[0]])) {
          this.showPastedToastWithUndo();
          return;
        }
      }

      if (
        this.dirty ||
        ensureArray(this.config.sequence)?.length ||
        Object.keys(this.config.fields || {}).length
      ) {
        const result = await new Promise<boolean>((resolve) => {
          showPasteReplaceDialog(this, {
            domain: "script",
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

  private _appendToExistingConfig(config: ScriptConfig) {
    this.pastedConfig = config;
    // make a copy otherwise we will modify the original config
    // which breaks the (referenced) config used for storing in undo stack
    const workingCopy: ManualScriptConfig = { ...this.config };

    if (!workingCopy) {
      return;
    }

    if ("fields" in config) {
      workingCopy.fields = {
        ...workingCopy.fields,
        ...config.fields,
      };
    }
    if ("sequence" in config) {
      workingCopy.sequence = ensureArray(workingCopy.sequence || []).concat(
        ensureArray(config.sequence)
      ) as Action[];
    }

    this.showPastedToastWithUndo();

    fireEvent(this, "value-changed", {
      value: {
        ...workingCopy,
      },
    });
  }

  protected showPastedToastWithUndo() {
    showEditorToast(this, {
      message: this.hass.localize(
        "ui.panel.config.script.editor.paste_toast_message"
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
        .header {
          display: flex;
          align-items: center;
        }
        .header:first-child {
          margin-top: -16px;
        }
        .header .name {
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-normal);
          flex: 1;
        }

        .description {
          margin-top: 16px;
        }

        ha-icon-button {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "manual-script-editor": HaManualScriptEditor;
  }
}
