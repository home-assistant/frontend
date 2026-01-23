import type { CSSResultGroup } from "lit";
import { html, css, nothing, LitElement } from "lit";
import { mdiHelpCircle } from "@mdi/js";
import { property, state, customElement } from "lit/decorators";
import "../../../layouts/hass-subpage";
import { classMap } from "lit/directives/class-map";
import type { HomeAssistant, Route } from "../../../types";
import "../../../components/ha-fab";
import "../../../components/ha-list-item";
import type {
  Blueprint,
  BlueprintDomain,
  BlueprintInput,
  BlueprintMetaDataEditorSchema,
} from "../../../data/blueprint";
import {
  DefaultBlueprintMetadata,
  isValidBlueprint,
} from "../../../data/blueprint";
import { PreventUnsavedMixin } from "../../../mixins/prevent-unsaved-mixin";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { documentationUrl } from "../../../util/documentation-url";
import { haStyle } from "../../../resources/styles";
import { fireEvent } from "../../../common/dom/fire_event";
import { manualEditorStyles } from "../../config/automation/styles";
import type { SidebarConfig } from "../../../data/automation";
import "../../../components/ha-button";
import { SIDEBAR_DEFAULT_WIDTH } from "../../config/automation/manual-automation-editor";
import "../../config/script/manual-script-editor";
import "./input/ha-blueprint-input";
import "./blueprint-metadata-editor";
import "./double-sidebar-padding-fix";
import { storage } from "../../../common/decorators/storage";

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

  @state() private _sidebarConfig?: SidebarConfig;

  @state() private _sidebarKey = 0;

  @storage({
    key: "automation-sidebar-width",
    state: false,
    subscribe: false,
  })
  private _sidebarWidthPx = SIDEBAR_DEFAULT_WIDTH;

  private _prevSidebarWidthPx?: number;

  protected _valueChanged(ev: CustomEvent<{ value: Blueprint }>) {
    ev.stopPropagation();

    this._updateInputsInHass();
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }

  private _inputChanged(
    ev: CustomEvent<{ value: [string, BlueprintInput][] }>
  ) {
    ev.stopPropagation();
    const input = ev.detail.value.reduce(
      (acc, [key, i]) => ({ ...acc, [key]: i }),
      {}
    );
    const blueprint = {
      ...this.blueprint,
      metadata: {
        ...this.blueprint.metadata,
        input,
      },
    };
    fireEvent(this, "value-changed", { value: blueprint });
  }

  private async _resetBlueprint() {
    const shouldReset = await showConfirmationDialog(this, {});
    if (!shouldReset) {
      return;
    }

    fireEvent(this, "reset");
  }

  private _onBlueprintMetadataChanged(
    ev: CustomEvent<{ value: BlueprintMetaDataEditorSchema }>
  ) {
    ev.stopPropagation();
    if (!this.blueprint || !isValidBlueprint(this.blueprint)) {
      return;
    }

    const blueprint = {
      ...this.blueprint,
      metadata: {
        ...this.blueprint.metadata,
        domain: this.domain,
        name: ev.detail.value.name,
        author: ev.detail.value.author,
        description: ev.detail.value.description,
        homeassistant: {
          min_version: ev.detail.value.min_version,
        },
      },
      blueprint: {
        ...this.blueprint.metadata,
        domain: this.domain,
        name: ev.detail.value.name,
        author: ev.detail.value.author,
        description: ev.detail.value.description,
        homeassistant: {
          min_version: ev.detail.value.min_version,
        },
      },
    };

    fireEvent(this, "value-changed", { value: blueprint });
    fireEvent(this, "path-changed", { value: ev.detail.value.path });
  }

  protected _resizeSidebar(ev: CustomEvent<string>) {
    this.style.setProperty("--sidebar-dynamic-width", ev.detail);
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

  protected async _openSidebar(ev: CustomEvent<SidebarConfig>) {
    this._sidebarConfig = ev.detail;
    this._sidebarKey++;
  }

  protected async _closeSidebar() {
    this._sidebarConfig = undefined;
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

  protected render() {
    const blueprintMetadata =
      !this.blueprint || !isValidBlueprint(this.blueprint)
        ? DefaultBlueprintMetadata
        : ({
            name: this.blueprint.metadata.name,
            description: this.blueprint.metadata.description,
            min_version: this.blueprint.metadata.homeassistant?.min_version,
            path: this.blueprintPath,
            author: this.blueprint.metadata.author,
          } as BlueprintMetaDataEditorSchema);

    return html`
      <div
        class=${classMap({
          "has-sidebar": this._sidebarConfig && !this.narrow,
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
          ${!Object.entries(this.blueprint?.metadata?.input || {})?.length
            ? html`<p class="section-description">
                ${this.hass.localize(
                  "ui.panel.developer-tools.tabs.blueprints.editor.inputs.section_description"
                )}
              </p>`
            : nothing}

          <ha-blueprint-input
            role="region"
            aria-labelledby="inputs-heading"
            .inputs=${Object.entries(this.blueprint.metadata?.input || {})}
            @value-changed=${this._inputChanged}
            .hass=${this.hass}
          ></ha-blueprint-input>

          <double-sidebar-padding-fix .hasSidebar=${!!this._sidebarConfig}>
            ${this.domain === "automation"
              ? html`
                  <manual-automation-editor
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                    .isWide=${this.isWide}
                    .config=${this.blueprint}
                    @value-changed=${this._valueChanged}
                    @resize-sidebar=${this._resizeSidebar}
                    @open-sidebar=${this._openSidebar}
                    @close-sidebar=${this._closeSidebar}
                  ></manual-automation-editor>
                `
              : html`
                  <manual-script-editor
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                    .isWide=${this.isWide}
                    .config=${this.blueprint}
                    @value-changed=${this._valueChanged}
                    @resize-sidebar=${this._resizeSidebar}
                    @open-sidebar=${this._openSidebar}
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

  public disconnectedCallback(): void {
    super.disconnectedCallback();
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

        .has-sidebar manual-automation-editor,
        .has-sidebar manual-script-editor {
          margin-right: calc(
            var(--sidebar-width) * -1 + var(--sidebar-gap) * -1
          );
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
