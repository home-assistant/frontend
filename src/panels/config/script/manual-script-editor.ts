import { mdiContentSave, mdiHelpCircle } from "@mdi/js";
import { load } from "js-yaml";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import {
  customElement,
  property,
  query,
  queryAll,
  state,
} from "lit/decorators";
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
import { ensureArray } from "../../../common/array/ensure-array";
import { storage } from "../../../common/decorators/storage";
import { canOverrideAlphanumericInput } from "../../../common/dom/can-override-input";
import { fireEvent } from "../../../common/dom/fire_event";
import { constructUrlCurrentPath } from "../../../common/url/construct-url";
import {
  extractSearchParam,
  removeSearchParam,
} from "../../../common/url/search-params";
import "../../../components/ha-icon-button";
import "../../../components/ha-markdown";
import type {
  ActionSidebarConfig,
  SidebarConfig,
} from "../../../data/automation";
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
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import "../automation/action/ha-automation-action";
import type HaAutomationAction from "../automation/action/ha-automation-action";
import "../automation/ha-automation-sidebar";
import type HaAutomationSidebar from "../automation/ha-automation-sidebar";
import { SIDEBAR_DEFAULT_WIDTH } from "../automation/manual-automation-editor";
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
export class HaManualScriptEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public saving = false;

  @property({ attribute: false }) public config!: ScriptConfig;

  @property({ attribute: false }) public dirty = false;

  @state() private _pastedConfig?: ScriptConfig;

  @state() private _sidebarConfig?: SidebarConfig;

  @state() private _sidebarKey?: string;

  @storage({
    key: "automation-sidebar-width",
    state: false,
    subscribe: false,
  })
  private _sidebarWidthPx = SIDEBAR_DEFAULT_WIDTH;

  @query("ha-script-fields")
  private _scriptFields?: HaScriptFields;

  @query("ha-automation-sidebar") private _sidebarElement?: HaAutomationSidebar;

  @queryAll("ha-automation-action, ha-script-fields")
  private _collapsableElements?: NodeListOf<
    HaAutomationAction | HaScriptFields
  >;

  private _openFields = false;

  private _prevSidebarWidthPx?: number;

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
              @request-close-sidebar=${this.triggerCloseSidebar}
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
      .highlightedActions=${this._pastedConfig?.sequence}
      @value-changed=${this._sequenceChanged}
      @open-sidebar=${this._openSidebar}
      @request-close-sidebar=${this.triggerCloseSidebar}
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
          "has-sidebar": this._sidebarConfig && !this.narrow,
        })}
      >
        <div class="content-wrapper">
          <div
            class="content ${this._sidebarConfig && this.narrow
              ? "has-bottom-sheet"
              : ""}"
          >
            <slot name="alerts"></slot>
            ${this._renderContent()}
          </div>
          <div class="fab-positioner">
            <div class="fab-positioner">
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
          </div>
        </div>
        <div class="sidebar-positioner">
          <ha-automation-sidebar
            .sidebarKey=${this._sidebarKey}
            tabindex="-1"
            class=${classMap({ hidden: !this._sidebarConfig })}
            .narrow=${this.narrow}
            .isWide=${this.isWide}
            .hass=${this.hass}
            .config=${this._sidebarConfig}
            .disabled=${this.disabled}
            @value-changed=${this._sidebarConfigChanged}
            @sidebar-resized=${this._resizeSidebar}
            @sidebar-resizing-stopped=${this._stopResizeSidebar}
          ></ha-automation-sidebar>
        </div>
      </div>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);

    this.style.setProperty(
      "--sidebar-dynamic-width",
      `${this._sidebarWidthPx}px`
    );

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

      const keysPresent = Object.keys(normalized).filter(
        (key) => ensureArray(normalized[key]).length
      );

      if (keysPresent.length === 1 && ["sequence"].includes(keysPresent[0])) {
        // if only one type of element is pasted, insert under the currently active item
        if (this._tryInsertAfterSelected(normalized[keysPresent[0]])) {
          this._showPastedToastWithUndo();
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
      this._replaceExistingConfig(normalized);
    }
  };

  private _appendToExistingConfig(config: ScriptConfig) {
    this._pastedConfig = config;
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

    this._showPastedToastWithUndo();

    fireEvent(this, "value-changed", {
      value: {
        ...workingCopy,
      },
    });
  }

  private _replaceExistingConfig(config: ScriptConfig) {
    this._pastedConfig = config;

    this._showPastedToastWithUndo();

    fireEvent(this, "value-changed", {
      value: {
        ...config,
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
          fireEvent(this, "undo-change");

          this._pastedConfig = undefined;
        },
      },
    });
  }

  public resetPastedConfig() {
    this._pastedConfig = undefined;

    showToast(this, {
      message: "",
      duration: 0,
    });
  }

  private async _openSidebar(ev: CustomEvent<SidebarConfig>) {
    // deselect previous selected row
    this._sidebarConfig?.close?.();
    this._sidebarConfig = ev.detail;
    this._sidebarKey = JSON.stringify(this._sidebarConfig);

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

  public triggerCloseSidebar() {
    if (this._sidebarConfig) {
      if (this._sidebarElement) {
        this._sidebarElement.triggerCloseSidebar();
        return;
      }
      this._sidebarConfig?.close();
    }
  }

  private _handleCloseSidebar() {
    this._sidebarConfig = undefined;
  }

  private _saveScript() {
    this.triggerCloseSidebar();
    fireEvent(this, "save-script");
  }

  private _tryInsertAfterSelected(config: Action | Action[]): boolean {
    if (this._sidebarConfig && "insertAfter" in this._sidebarConfig) {
      return this._sidebarConfig.insertAfter(config as any);
    }
    return false;
  }

  public expandAll() {
    this._collapsableElements?.forEach((element) => {
      element.expandAll();
    });
  }

  public collapseAll() {
    this._collapsableElements?.forEach((element) => {
      element.collapseAll();
    });
  }

  public copySelectedRow() {
    if ((this._sidebarConfig as ActionSidebarConfig)?.copy) {
      (this._sidebarConfig as ActionSidebarConfig).copy();
    }
  }

  public cutSelectedRow() {
    if ((this._sidebarConfig as ActionSidebarConfig)?.cut) {
      (this._sidebarConfig as ActionSidebarConfig).cut();
    }
  }

  public deleteSelectedRow() {
    if ((this._sidebarConfig as ActionSidebarConfig)?.delete) {
      (this._sidebarConfig as ActionSidebarConfig).delete();
    }
  }

  private _resizeSidebar(ev) {
    ev.stopPropagation();
    const delta = ev.detail.deltaInPx as number;

    // set initial resize width to add / reduce delta from it
    if (!this._prevSidebarWidthPx) {
      this._prevSidebarWidthPx =
        this._sidebarElement?.clientWidth || SIDEBAR_DEFAULT_WIDTH;
    }

    const widthPx = delta + this._prevSidebarWidthPx;

    this._sidebarWidthPx = widthPx;

    this.style.setProperty(
      "--sidebar-dynamic-width",
      `${this._sidebarWidthPx}px`
    );
  }

  private _stopResizeSidebar(ev) {
    ev.stopPropagation();
    this._prevSidebarWidthPx = undefined;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "manual-script-editor": HaManualScriptEditor;
  }
}
