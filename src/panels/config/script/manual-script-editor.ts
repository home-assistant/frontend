import { mdiContentSave, mdiHelpCircle, mdiRobotConfused } from "@mdi/js";
import { load } from "js-yaml";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
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
import type { HassEntity } from "home-assistant-js-websocket";
import { ensureArray } from "../../../common/array/ensure-array";
import { canOverrideAlphanumericInput } from "../../../common/dom/can-override-input";
import { fireEvent } from "../../../common/dom/fire_event";
import { constructUrlCurrentPath } from "../../../common/url/construct-url";
import {
  extractSearchParam,
  removeSearchParam,
} from "../../../common/url/search-params";
import { computeRTL } from "../../../common/util/compute_rtl";
import "../../../components/ha-icon-button";
import "../../../components/ha-markdown";
import type { SidebarConfig } from "../../../data/automation";
import type { Action, Fields, ScriptConfig } from "../../../data/script";
import {
  getActionType,
  MODES,
  normalizeScriptConfig,
} from "../../../data/script";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import "../automation/action/ha-automation-action";
import type HaAutomationAction from "../automation/action/ha-automation-action";
import "../automation/ha-automation-sidebar";
import { showPasteReplaceDialog } from "../automation/paste-replace-dialog/show-dialog-paste-replace";
import { manualEditorStyles, saveFabStyles } from "../automation/styles";
import "./ha-script-fields";
import type HaScriptFields from "./ha-script-fields";
import { UNAVAILABLE } from "../../../data/entity";

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

  @property({ type: Boolean }) public saving = false;

  @property({ attribute: false }) public config!: ScriptConfig;

  @property({ attribute: false }) public dirty = false;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property({ attribute: false }) public errors?: string;

  @property({ attribute: false }) public hasBlueprintConfig = false;

  @property({ attribute: false }) public validationErrors?: (
    | string
    | TemplateResult
  )[];

  @query("ha-script-fields")
  private _scriptFields?: HaScriptFields;

  private _openFields = false;

  @state() private _pastedConfig?: ScriptConfig;

  @state() private _sidebarConfig?: SidebarConfig;

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

  private _renderContent() {
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
              .narrow=${this.narrow}
              @open-sidebar=${this._openSidebar}
              @close-sidebar=${this._handleCloseSidebar}
            ></ha-script-fields>`
        : nothing
    }

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
      @value-changed=${this._sequenceChanged}
      @open-sidebar=${this._openSidebar}
      @close-sidebar=${this._handleCloseSidebar}
      .hass=${this.hass}
      .narrow=${this.narrow}
      .disabled=${this.disabled || this.saving}
      root
      sidebar
    ></ha-automation-action>
  </div>`;
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
            <div class="alert-wrapper">
              ${this.errors || this.stateObj?.state === UNAVAILABLE
                ? html`<ha-alert
                    alert-type="error"
                    .title=${this.stateObj?.state === UNAVAILABLE
                      ? this.hass.localize(
                          "ui.panel.config.script.editor.unavailable"
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
                : nothing}
              ${this.hasBlueprintConfig
                ? html`<ha-alert alert-type="info">
                    ${this.hass.localize(
                      "ui.panel.config.script.editor.confirm_take_control"
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
                        "ui.panel.config.script.editor.read_only"
                      )}
                      <ha-button
                        appearance="plain"
                        slot="action"
                        @click=${this._duplicate}
                      >
                        ${this.hass.localize(
                          "ui.panel.config.script.editor.migrate"
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
            @click=${this._saveScript}
          >
            <ha-svg-icon slot="icon" .path=${mdiContentSave}></ha-svg-icon>
          </ha-fab>
        </div>
        <ha-automation-sidebar
          class=${classMap({
            sidebar: true,
            overlay: !this.isWide,
            rtl: computeRTL(this.hass),
          })}
          .narrow=${this.narrow}
          .isWide=${this.isWide}
          .hass=${this.hass}
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

  private _duplicate() {
    fireEvent(this, "duplicate-script");
  }

  private _takeControlSave() {
    fireEvent(this, "take-control-save");
  }

  private _revertBlueprint() {
    fireEvent(this, "revert-blueprint");
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

  private _openSidebar(ev: CustomEvent<SidebarConfig>) {
    // deselect previous selected row
    this._sidebarConfig?.close?.();
    this._sidebarConfig = ev.detail;
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
      const closeRow = this._sidebarConfig?.close;
      this._sidebarConfig = undefined;
      closeRow?.();
    }
  }

  private _handleCloseSidebar() {
    this._sidebarConfig = undefined;
  }

  private _saveScript() {
    this._closeSidebar();
    fireEvent(this, "save-script");
  }

  private _getCollapsableElements() {
    return this.shadowRoot!.querySelectorAll<
      HaAutomationAction | HaScriptFields
    >("ha-automation-action, ha-script-fields");
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

        .alert-wrapper {
          position: sticky;
          top: -24px;
          margin-top: -24px;
          margin-bottom: 16px;
          z-index: 100;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .alert-wrapper ha-alert {
          background-color: var(--card-background-color);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          border-radius: var(--ha-border-radius-sm);
          margin-bottom: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "manual-script-editor": HaManualScriptEditor;
  }

  interface HASSDomEvents {
    "duplicate-script": undefined;
    "take-control-save": undefined;
    "revert-blueprint": undefined;
    "save-script": undefined;
  }
}
