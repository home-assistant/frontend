import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { mdiHelpCircle } from "@mdi/js";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import deepClone from "deep-clone-simple";
import {
  any,
  assert,
  boolean,
  nullable,
  object,
  optional,
  record,
  string,
  type,
  union,
} from "superstruct";
import { load } from "js-yaml";
import type { HomeAssistant, Route } from "../../../types";
import type {
  Blueprint,
  BlueprintDomain,
  BlueprintInput,
  BlueprintMetaDataEditorSchema,
} from "../../../data/blueprint";
import {
  BlueprintYamlSchema,
  DefaultBlueprintMetadata,
  normalizeBlueprint,
} from "../../../data/blueprint";
import { PreventUnsavedMixin } from "../../../mixins/prevent-unsaved-mixin";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { documentationUrl } from "../../../util/documentation-url";
import { haStyle } from "../../../resources/styles";
import { fireEvent } from "../../../common/dom/fire_event";
import { manualEditorStyles } from "../../config/automation/styles";
import type { SidebarConfig } from "../../../data/automation";
import { SIDEBAR_DEFAULT_WIDTH } from "../../config/automation/manual-automation-editor";
import { storage } from "../../../common/decorators/storage";
import type HaAutomationSidebar from "../../config/automation/ha-automation-sidebar";
import { canOverrideAlphanumericInput } from "../../../common/dom/can-override-input";
import { showToast } from "../../../util/toast";
import { ensureArray } from "../../../common/array/ensure-array";
import { showPasteReplaceDialog } from "../../config/automation/paste-replace-dialog/show-dialog-paste-replace";
import "../../../components/ha-button";
import "../../../components/ha-fab";
import "../../../components/ha-list-item";
import "../../../components/ha-yaml-editor";
import "../../../layouts/hass-subpage";
import "./input/ha-blueprint-input";
import "./blueprint-metadata-editor";
import "./double-sidebar-padding-fix";
import type { Action } from "../../../data/script";
import "../../config/script/manual-script-editor";

const blueprintInputStruct = object({
  name: nullable(string()),
  description: nullable(string()),
  selector: nullable(object()),
  default: nullable(any()),
});
const blueprintInputSectionStruct = object({
  name: nullable(string()),
  icon: nullable(string()),
  description: nullable(string()),
  collapsed: nullable(boolean()),
  input: record(string(), nullable(blueprintInputStruct)),
});
const blueprintMetadataStruct = object({
  input: optional(
    record(
      string(),
      union([
        nullable(blueprintInputStruct),
        nullable(blueprintInputSectionStruct),
      ])
    )
  ),
});

/*
 * Because of how the automation struct is defined as a union, it is not
 * possible to define a scriptBlueprintStruct or automationBlueprintStruct,
 * as nice as it would be.
 */
const baseBlueprintConfigStruct = type({
  blueprint: blueprintMetadataStruct,
});

@customElement("ha-blueprint-editor")
export class HaBlueprintEditor extends PreventUnsavedMixin(
  KeyboardShortcutMixin(LitElement)
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: "blueprint-path" }) public blueprintPath!: string;

  @property({ attribute: false }) public blueprint!: Blueprint;

  @property({ attribute: false }) public domain?: BlueprintDomain;

  @property({ attribute: false }) public dirty!: boolean;

  @property({ attribute: false }) public yamlMode = false;

  @state() private _sidebarConfig?: SidebarConfig;

  @state() private _pastedConfig?: Blueprint;

  @state() private _manualEditorSidebarConfig?: SidebarConfig;

  @state() private _sidebarKey = 0;

  @query("ha-automation-sidebar") private _sidebarElement?: HaAutomationSidebar;

  @storage({
    key: "automation-sidebar-width",
    state: false,
    subscribe: false,
  })
  private _sidebarWidthPx = SIDEBAR_DEFAULT_WIDTH;

  private _prevSidebarWidthPx?: number;

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);

    this.style.setProperty(
      "--sidebar-dynamic-width",
      `${this._sidebarWidthPx}px`
    );
    fireEvent(this, "resize-sidebar", `${this._sidebarWidthPx}px`);
  }

  protected _valueChanged(ev: CustomEvent<{ value: Blueprint }>) {
    ev.stopPropagation();

    this._updateInputsInHass();
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }

  private _inputChanged(
    ev: CustomEvent<{ value: [string, BlueprintInput][] }>
  ) {
    ev.stopPropagation();
    this.resetPastedConfig();
    const input = ev.detail.value.reduce(
      (acc, [key, i]) => ({ ...acc, [key]: i }),
      {}
    );
    const blueprint = {
      ...this.blueprint,
      blueprint: {
        ...this.blueprint.blueprint,
        input,
      },
    } satisfies Blueprint;
    fireEvent(this, "value-changed", { value: blueprint });
  }

  private async _resetBlueprint() {
    const shouldReset = await showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.developer-tools.tabs.blueprints.editor.reset_text"
      ),
      destructive: true,
    });
    if (!shouldReset) {
      return;
    }

    fireEvent(this, "reset");
  }

  private _onBlueprintMetadataChanged(
    ev: CustomEvent<{ value: BlueprintMetaDataEditorSchema }>
  ) {
    ev.stopPropagation();
    if (!this.blueprint) {
      return;
    }

    const metadata = {
      ...this.blueprint.blueprint,
      domain: this.domain,
      name: ev.detail.value.name,
      author: ev.detail.value.author,
      description: ev.detail.value.description,
      homeassistant: {
        min_version: ev.detail.value.min_version,
      },
    };
    const blueprint = {
      ...this.blueprint,
      blueprint: metadata,
    };

    if (
      !this.blueprintPath ||
      this.blueprintPath === this.blueprint.blueprint.name
    ) {
      fireEvent(this, "path-changed", { value: ev.detail.value.name });
    } else {
      fireEvent(this, "path-changed", { value: ev.detail.value.path });
    }
    fireEvent(this, "value-changed", { value: blueprint });
  }

  protected _resizeSidebar(ev: CustomEvent) {
    ev.stopPropagation();

    if (typeof ev.detail === "string") {
      this.style.setProperty("--sidebar-dynamic-width", ev.detail);
      return;
    }

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
    fireEvent(this, "resize-sidebar", `${this._sidebarWidthPx}px`);
  }

  private _stopResizeSidebar(ev) {
    ev.stopPropagation();
    this._prevSidebarWidthPx = undefined;
  }

  private _resetSidebarWidth(ev: Event) {
    ev.stopPropagation();
    this._prevSidebarWidthPx = undefined;
    this._sidebarWidthPx = SIDEBAR_DEFAULT_WIDTH;
    this.style.setProperty(
      "--sidebar-dynamic-width",
      `${this._sidebarWidthPx}px`
    );
  }

  protected async _openBlueprintSidebar(ev: CustomEvent<SidebarConfig>) {
    // deselect previous selected row
    this._manualEditorSidebarConfig = undefined;
    this._sidebarConfig?.close?.();
    this._sidebarConfig = ev.detail;

    // be sure the sidebar editor is recreated
    this._sidebarKey++;

    await this._sidebarElement?.updateComplete;
    this._sidebarElement?.focus();
  }

  protected _openManualEditorSidebar(ev: CustomEvent<SidebarConfig>) {
    this._closeSidebar();
    this._manualEditorSidebarConfig = ev.detail;
  }

  protected _closeSidebar() {
    this._sidebarConfig = undefined;
    this._manualEditorSidebarConfig = undefined;
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

  private _handlePaste = async (ev: ClipboardEvent) => {
    ev.stopPropagation();

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
          "ui.panel.developer-tools.tabs.blueprints.paste_invalid_config"
        ),
        duration: 4000,
        dismissable: true,
      });
      return;
    }

    if (!loaded || typeof loaded !== "object") {
      return;
    }

    let normalized: Blueprint | undefined;
    try {
      normalized = normalizeBlueprint(loaded);
    } catch (_err: any) {
      return;
    }

    try {
      assert(normalized, baseBlueprintConfigStruct);
    } catch (_err: any) {
      showToast(this, {
        message: this.hass.localize(
          "ui.panel.developer-tools.tabs.blueprints.paste_invalid_config"
        ),
        duration: 4000,
        dismissable: true,
      });
      return;
    }

    if (!normalized) {
      return;
    }
    ev.preventDefault();

    const keysPresent = Object.keys(normalized).filter(
      (key) => ensureArray(normalized[key]).length
    );

    if (
      keysPresent.length === 1 &&
      ["input", "triggers", "conditions", "actions", "sequence"].includes(
        keysPresent[0]
      )
    ) {
      // if only one type of element is pasted, insert under the currently active item
      if (this._tryInsertAfterSelected(normalized[keysPresent[0]])) {
        this._showPastedToastWithUndo();
        return;
      }
    }

    const result = await new Promise<boolean>((resolve) => {
      showPasteReplaceDialog(this, {
        domain: "blueprint",
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

    // replace the config completely
    this._replaceExistingConfig(normalized);
  };

  private _appendToExistingConfig(config: Blueprint) {
    this._pastedConfig = config;
    // make a copy otherwise we will modify the original config
    // which breaks the (referenced) config used for storing in undo stack
    const workingCopy: Blueprint = deepClone(this.blueprint);

    // Blueprint fields
    if (config.blueprint.input) {
      const workingCopyInput = workingCopy.blueprint.input || {};
      for (const key of Object.keys(config.blueprint.input)) {
        if (!(key in workingCopyInput)) {
          continue;
        }

        config.blueprint.input[`${key}_copy`] = config.blueprint.input[key];
        delete config.blueprint.input[key];
      }
      workingCopy.blueprint.input = {
        ...workingCopy.blueprint.input,
        ...config.blueprint.input,
      };
    }

    // Automation fields
    if ("triggers" in config && "triggers" in workingCopy) {
      workingCopy.triggers = ensureArray(workingCopy.triggers || []).concat(
        ensureArray(config.triggers)
      );
    }
    if ("conditions" in config && "conditions" in workingCopy) {
      workingCopy.conditions = ensureArray(workingCopy.conditions || []).concat(
        ensureArray(config.conditions)
      );
    }
    if ("actions" in config && "actions" in workingCopy) {
      workingCopy.actions = ensureArray(workingCopy.actions || []).concat(
        ensureArray(config.actions)
      ) as Action[];
    }

    // Script fields
    if ("fields" in config && "fields" in workingCopy) {
      workingCopy.fields = {
        ...workingCopy.fields,
        ...config.fields,
      };
    }
    if ("sequence" in config && "sequence" in workingCopy) {
      workingCopy.sequence = ensureArray(workingCopy.sequence || []).concat(
        ensureArray(config.sequence)
      ) as Action[];
    }

    this._showPastedToastWithUndo();
    fireEvent(this, "value-changed", {
      value: { ...workingCopy },
    });
  }

  private _replaceExistingConfig(config: Blueprint) {
    this._pastedConfig = config;

    this._showPastedToastWithUndo();

    fireEvent(this, "value-changed", {
      value: {
        ...config,
      },
    });
  }

  private _tryInsertAfterSelected(config: any): boolean {
    const sidebarConfig =
      this._sidebarConfig ?? this._manualEditorSidebarConfig;
    if (!sidebarConfig) {
      return false;
    }

    if (!("insertAfter" in sidebarConfig)) {
      return false;
    }

    return sidebarConfig.insertAfter(config);
  }

  private _showPastedToastWithUndo() {
    showToast(this, {
      message: this.hass.localize(
        "ui.panel.developer-tools.tabs.blueprints.paste_toast_message"
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

  protected render() {
    if (this.yamlMode) {
      return html`
        <ha-yaml-editor
          .hass=${this.hass}
          .yamlSchema=${BlueprintYamlSchema}
          .defaultValue=${this.blueprint}
        >
        </ha-yaml-editor>
      `;
    }

    const blueprintMetadata = !this.blueprint
      ? DefaultBlueprintMetadata
      : ({
          name: this.blueprint.blueprint.name,
          description: this.blueprint.blueprint.description,
          min_version: this.blueprint.blueprint.homeassistant?.min_version,
          path: this.blueprintPath,
          author: this.blueprint.blueprint.author,
        } as BlueprintMetaDataEditorSchema);

    return html`
      <div
        class=${classMap({
          "has-sidebar":
            (this._manualEditorSidebarConfig || this._sidebarConfig) &&
            !this.narrow,
          "editor-content": true,
        })}
      >
        <div class="content-wrapper">
          <blueprint-metadata-editor
            .hass=${this.hass}
            .metadata=${blueprintMetadata}
            @value-changed=${this._onBlueprintMetadataChanged}
          ></blueprint-metadata-editor>
          <div class="header">
            <h2 id="variables-heading" class="name">
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.inputs.header"
              )}
            </h2>
            <a
              href=${documentationUrl(this.hass, "/docs/blueprint/variable/")}
              target="_blank"
              rel="noreferrer"
            >
              <ha-icon-button
                .path=${mdiHelpCircle}
                .label=${this.hass.localize(
                  "ui.panel.developer-tools.tabs.blueprints.editor.inputs.learn_more"
                )}
              ></ha-icon-button>
            </a>
          </div>
          ${!Object.entries(this.blueprint?.blueprint?.input || {})?.length
            ? html`<p class="section-description">
                ${this.hass.localize(
                  "ui.panel.developer-tools.tabs.blueprints.editor.inputs.section_description"
                )}
              </p>`
            : nothing}

          <ha-blueprint-input
            role="region"
            aria-labelledby="inputs-heading"
            .hass=${this.hass}
            .inputs=${Object.entries(this.blueprint.blueprint?.input || {})}
            .highlightedInputs=${Object.entries(
              this._pastedConfig?.blueprint.input || {}
            )}
            @value-changed=${this._inputChanged}
            @resize-sidebar=${this._resizeSidebar}
            @open-sidebar=${this._openBlueprintSidebar}
            @close-sidebar=${this._closeSidebar}
          ></ha-blueprint-input>

          <double-sidebar-padding-fix
            .fixSidebar=${!!this._manualEditorSidebarConfig}
          >
            ${this.domain === "automation"
              ? html`
                  <manual-automation-editor
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                    .isWide=${this.isWide}
                    .config=${this.blueprint}
                    .listenForPasteEvents=${false}
                    @value-changed=${this._valueChanged}
                    @resize-sidebar=${this._resizeSidebar}
                    @open-sidebar=${this._openManualEditorSidebar}
                    @close-sidebar=${this._closeSidebar}
                  ></manual-automation-editor>
                `
              : html`
                  <manual-script-editor
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                    .isWide=${this.isWide}
                    .config=${this.blueprint}
                    .listenForPasteEvents=${false}
                    @value-changed=${this._valueChanged}
                    @resize-sidebar=${this._resizeSidebar}
                    @open-sidebar=${this._openManualEditorSidebar}
                    @close-sidebar=${this._closeSidebar}
                  ></manual-script-editor>
                `}
          </double-sidebar-padding-fix>

          <div class="actions">
            <ha-button
              appearance="plain"
              @click=${this._resetBlueprint}
              .disabled=${!this.dirty}
            >
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.actions.reset"
              )}
            </ha-button>
          </div>
        </div>
        <div class="sidebar-positioner">
          <ha-automation-sidebar
            tabindex="-1"
            class=${classMap({ hidden: !this._sidebarConfig })}
            .isWide=${this.isWide}
            .hass=${this.hass}
            .narrow=${this.narrow}
            .config=${this._sidebarConfig}
            .sidebarKey=${this._sidebarKey}
            @value-changed=${this._sidebarConfigChanged}
            @sidebar-resized=${this._resizeSidebar}
            @sidebar-resizing-stopped=${this._stopResizeSidebar}
            @sidebar-reset-size=${this._resetSidebarWidth}
          ></ha-automation-sidebar>
        </div>
      </div>
    `;
  }

  private _updateInputsInHass() {
    // TODO: Add temporary inputs to HASS object to be consumed by pickers
  }

  public connectedCallback() {
    super.connectedCallback();
    window.addEventListener("paste", this._handlePaste);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("paste", this._handlePaste);
    // TODO: Remove temporary inputs from HASS object
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      manualEditorStyles,
      css`
        .editor-content {
          margin: 0 auto;
          max-width: 1040px;
          padding: var(--ha-space-7) var(--ha-space-5) 0;
          display: block;
        }
        p {
          margin-top: 0;
          margin-bottom: 0;
        }
        .header {
          margin-top: var(--ha-space-4);
          display: flex;
          align-items: center;
        }
        .header:first-child {
          margin-top: calc(--ha-space-4 * -1);
        }
        .header .name {
          font-weight: 400;
          flex: 1;
          margin-bottom: var(--ha-space-2);
        }
        .header a {
          color: var(--secondary-text-color);
        }
        .section-description {
          margin-bottom: var(--ha-space-4);
        }

        ha-blueprint-input {
          display: block;
          margin-bottom: var(--ha-space-4);
        }

        manual-automation-editor,
        manual-script-editor {
          margin-top: calc(var(--ha-space-12) * -1);
        }

        .actions {
          display: flex;
          flex-direction: row-reverse;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-editor": HaBlueprintEditor;
  }

  // for fire event
  interface HASSDomEvents {
    "path-changed": { value: string };
    reset: {};
  }
}
