import { mdiHelpCircle } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { load } from "js-yaml";
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
import { fireEvent } from "../../../common/dom/fire_event";
import { constructUrlCurrentPath } from "../../../common/url/construct-url";
import {
  extractSearchParam,
  removeSearchParam,
} from "../../../common/url/search-params";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-markdown";
import type { Action, Fields, ScriptConfig } from "../../../data/script";
import {
  getActionType,
  MODES,
  normalizeScriptConfig,
} from "../../../data/script";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import "../automation/action/ha-automation-action";
import type HaAutomationAction from "../automation/action/ha-automation-action";
import "./ha-script-fields";
import type HaScriptFields from "./ha-script-fields";
import { canOverrideAlphanumericInput } from "../../../common/dom/can-override-input";
import { showToast } from "../../../util/toast";
import { showPasteReplaceDialog } from "../automation/paste-replace-dialog/show-dialog-paste-replace";
import { ensureArray } from "../../../common/array/ensure-array";

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
export class HaManualScriptEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public config!: ScriptConfig;

  @property({ attribute: false }) public dirty = false;

  @query("ha-script-fields")
  private _scriptFields?: HaScriptFields;

  private _openFields = false;

  @state() private _pastedConfig?: ScriptConfig;

  private _previousConfig?: ScriptConfig;

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

  protected updated(changedProps) {
    if (this._openFields && changedProps.has("config")) {
      this._openFields = false;
      this._scriptFields?.updateComplete.then(() =>
        this._scriptFields?.focusLastField()
      );
    }
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    const expanded = extractSearchParam("expanded");
    if (expanded === "1") {
      this._clearParam("expanded");
      const items = this.shadowRoot!.querySelectorAll<HaAutomationAction>(
        "ha-automation-action"
      );

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

  protected render() {
    return html`
      ${this.config.description
        ? html`<ha-markdown
            class="description"
            breaks
            .content=${this.config.description}
          ></ha-markdown>`
        : nothing}
      ${this.config.fields
        ? html`<div class="header">
              <h2 id="fields-heading" class="name">
                ${this.hass.localize(
                  "ui.panel.config.script.editor.field.fields"
                )}
              </h2>
              <a
                href=${documentationUrl(
                  this.hass,
                  "/integrations/script/#fields"
                )}
                target="_blank"
                rel="noreferrer"
              >
                <ha-icon-button
                  .path=${mdiHelpCircle}
                  .label=${this.hass.localize(
                    "ui.panel.config.script.editor.field.link_help_fields"
                  )}
                ></ha-icon-button>
              </a>
            </div>

            <ha-script-fields
              role="region"
              aria-labelledby="fields-heading"
              .fields=${this.config.fields}
              .highlightedFields=${this._pastedConfig?.fields}
              @value-changed=${this._fieldsChanged}
              .hass=${this.hass}
              .disabled=${this.disabled}
            ></ha-script-fields>`
        : nothing}

      <div class="header">
        <h2 id="sequence-heading" class="name">
          ${this.hass.localize("ui.panel.config.script.editor.sequence")}
        </h2>
        <a
          href=${documentationUrl(this.hass, "/docs/scripts/")}
          target="_blank"
          rel="noreferrer"
        >
          <ha-icon-button
            .path=${mdiHelpCircle}
            .label=${this.hass.localize(
              "ui.panel.config.script.editor.link_available_actions"
            )}
          ></ha-icon-button>
        </a>
      </div>

      <ha-automation-action
        role="region"
        aria-labelledby="sequence-heading"
        .actions=${this.config.sequence || []}
        .highlightedActions=${this._pastedConfig?.sequence || []}
        .path=${["sequence"]}
        @value-changed=${this._sequenceChanged}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .disabled=${this.disabled}
      ></ha-automation-action>
    `;
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

  public connectedCallback() {
    super.connectedCallback();
    window.addEventListener("paste", this._handlePaste);
  }

  public disconnectedCallback() {
    window.removeEventListener("paste", this._handlePaste);
    super.disconnectedCallback();
  }

  private _handlePaste = async (ev: ClipboardEvent) => {
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
      showToast(this, {
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

    if (!["sequence", "unknown"].includes(getActionType(config))) {
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
      showToast(this, {
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

      if (this.dirty) {
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
      this._replaceExistingConfig(normalized);
    }
  };

  private _appendToExistingConfig(config: ScriptConfig) {
    // make a copy otherwise we will reference the original config
    this._previousConfig = { ...this.config } as ScriptConfig;
    this._pastedConfig = config;

    if (!this.config) {
      return;
    }

    if ("fields" in config) {
      this.config.fields = {
        ...this.config.fields,
        ...config.fields,
      };
    }
    if ("sequence" in config) {
      this.config.sequence = ensureArray(this.config.sequence || []).concat(
        ensureArray(config.sequence)
      ) as Action[];
    }

    this._showPastedToastWithUndo();

    fireEvent(this, "value-changed", {
      value: {
        ...this.config,
      },
    });
  }

  private _replaceExistingConfig(config: ScriptConfig) {
    // make a copy otherwise we will reference the original config
    this._previousConfig = { ...this.config } as ScriptConfig;
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
        "ui.panel.config.script.editor.paste_toast_message"
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
        ha-card {
          overflow: hidden;
        }
        .description {
          margin: 0;
        }
        p {
          margin-bottom: 0;
        }
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
        .header a {
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
