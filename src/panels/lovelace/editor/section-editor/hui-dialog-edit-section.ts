import {
  mdiCellphone,
  mdiClose,
  mdiDotsVertical,
  mdiFileMoveOutline,
  mdiMonitor,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { cache } from "lit/directives/cache";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { withViewTransition } from "../../../../common/util/view-transition";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import "../../../../components/ha-tab-group";
import "../../../../components/ha-tab-group-tab";
import "../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import {
  DEFAULT_SECTION_COLUMN_SPAN,
  isStrategySection,
} from "../../../../data/lovelace/config/section";
import type { LovelaceStrategyConfig } from "../../../../data/lovelace/config/strategy";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import { saveConfig } from "../../../../data/lovelace/config/types";
import type { LovelaceViewRawConfig } from "../../../../data/lovelace/config/view";
import { isStrategyView } from "../../../../data/lovelace/config/view";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import {
  haStyleDialog,
  haStyleDialogFixedTop,
  haStyleScrollbar,
} from "../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import { cleanLegacyStrategyConfig } from "../../strategies/legacy-strategy";
import type { Lovelace } from "../../types";
import { addSection } from "../config-util";
import {
  deleteAtPath,
  getAtPath,
  getViewPath,
  insertAtPath,
  moveAtPath,
  setAtPath,
} from "../lovelace-path";
import { showSelectViewDialog } from "../select-view/show-select-view-dialog";
import "../../sections/hui-section";
import "../../sections/hui-section-background";
import "./hui-section-settings-editor";
import "./hui-section-visibility-editor";
import "./hui-section-strategy-element-editor";
import type { HuiSectionStrategyElementEditor } from "./hui-section-strategy-element-editor";
import type { ConfigChangedEvent } from "../hui-element-editor";
import type { EditSectionDialogParams } from "./show-edit-section-dialog";
import type { HaDropdownSelectEvent } from "../../../../components/ha-dropdown";
import { getViewType } from "../../views/get-view-type";
import { DEFAULT_MAX_COLUMNS, SECTIONS_VIEW_LAYOUT } from "../../views/const";
import { KeyboardShortcutMixin } from "../../../../mixins/keyboard-shortcut-mixin";
import { LOVELACE_EDIT_TOAST_ID } from "../../types";

const TABS = ["tab-strategy", "tab-appearance", "tab-visibility"] as const;

type PreviewMode = "desktop" | "mobile";

const PREVIEW_MODES: { mode: PreviewMode; iconPath: string }[] = [
  { mode: "mobile", iconPath: mdiCellphone },
  { mode: "desktop", iconPath: mdiMonitor },
];

const TWO_COLUMNS_MIN_WIDTH = 2 * 320 + 3 * 32;

@customElement("hui-dialog-edit-section")
export class HuiDialogEditSection
  extends DirtyStateProviderMixin<LovelaceSectionRawConfig>()(
    KeyboardShortcutMixin(LitElement)
  )
  implements HassDialog<EditSectionDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Boolean, reflect: true }) public large = false;

  @state() private _params?: EditSectionDialogParams;

  @state() private _config?: LovelaceSectionRawConfig;

  @state() private _viewConfig?: LovelaceViewRawConfig;

  @state() private _yamlMode = false;

  @state() private _currTab: (typeof TABS)[number] = TABS[0];

  @state() private _open = false;

  @state() private _strategyError = false;

  @state() private _yamlError = false;

  @storage({
    key: "dashboardSectionPreviewMode",
    state: true,
    subscribe: false,
  })
  private _storedPreviewMode?: PreviewMode;

  @state() private _defaultPreviewMode: PreviewMode = "mobile";

  @query("ha-yaml-editor") private _editor?: HaYamlEditor;

  @query("hui-section-strategy-element-editor")
  private _strategyEditor?: HuiSectionStrategyElementEditor;

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (this._yamlMode && changedProperties.has("_yamlMode")) {
      const sectionConfig = {
        ...this._config,
      };
      this._editor?.setValue(sectionConfig);
    }
  }

  public async showDialog(params: EditSectionDialogParams): Promise<void> {
    this._params = params;
    this._open = true;

    this.lovelace = params.lovelace;

    this._config =
      params.newSection ??
      getAtPath<LovelaceSectionRawConfig>(params.lovelaceConfig, params.path);
    this._currTab =
      this._config && isStrategySection(this._config)
        ? "tab-strategy"
        : "tab-appearance";
    const viewPath = getViewPath(params.path);
    this._viewConfig = getAtPath<LovelaceViewRawConfig>(
      params.lovelaceConfig,
      viewPath
    );
    if (params.newSection) {
      this._initDirtyTracking({ type: "deep" }, {});
      this._updateDirtyState(params.newSection);
    } else {
      this._initDirtyTracking({ type: "deep" }, this._config);
    }
    this._defaultPreviewMode =
      window.innerWidth >= TWO_COLUMNS_MIN_WIDTH ? "desktop" : "mobile";
  }

  private get _previewMode(): PreviewMode {
    return this._storedPreviewMode ?? this._defaultPreviewMode;
  }

  public closeDialog() {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this.large = false;
    this._yamlMode = false;
    this._config = undefined;
    this._currTab = TABS[0];
    this._strategyError = false;
    this._yamlError = false;
    this._discardDirtyStateChanges();
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._config) {
      return nothing;
    }

    const strategy = isStrategySection(this._config)
      ? cleanLegacyStrategyConfig(this._config.strategy)
      : undefined;
    const heading = this._computeHeading(strategy);
    const tabs = strategy ? TABS : TABS.filter((tab) => tab !== "tab-strategy");
    const currentTab =
      !strategy && this._currTab === "tab-strategy"
        ? "tab-appearance"
        : this._currTab;

    const columnSpan = Math.min(
      this._config.column_span ?? DEFAULT_SECTION_COLUMN_SPAN,
      this._viewConfig?.max_columns || DEFAULT_MAX_COLUMNS
    );
    const singleColumn = columnSpan === 1;
    const previewColumnSpan = this._previewMode === "desktop" ? columnSpan : 1;

    let content: TemplateResult<1> | typeof nothing = nothing;

    if (this._yamlMode) {
      content = html`
        <ha-yaml-editor
          in-dialog
          @value-changed=${this._viewYamlChanged}
        ></ha-yaml-editor>
      `;
    } else {
      switch (currentTab) {
        case "tab-appearance":
          content = html`
            <hui-section-settings-editor
              .config=${this._config}
              .viewConfig=${this._viewConfig}
              @value-changed=${this._configChanged}
            >
            </hui-section-settings-editor>
          `;
          break;
        case "tab-visibility":
          content = html`
            <hui-section-visibility-editor
              .hass=${this.hass}
              .config=${this._config}
              @value-changed=${this._configChanged}
            >
            </hui-section-visibility-editor>
          `;
          break;
        case "tab-strategy":
          content = html`
            <hui-section-strategy-element-editor
              .hass=${this.hass}
              .lovelace=${this._params.lovelaceConfig}
              .value=${strategy}
              in-dialog
              @config-changed=${this._strategyConfigChanged}
            ></hui-section-strategy-element-editor>
          `;
          break;
      }
    }

    return html`
      <ha-dialog
        .open=${this._open}
        .width=${this.large ? "full" : "large"}
        .preventScrimClose=${this.isDirtyState}
        @keydown=${this._ignoreKeydown}
        @closed=${this._dialogClosed}
      >
        <ha-icon-button
          slot="headerNavigationIcon"
          @click=${this._cancel}
          .label=${this.hass.localize("ui.common.close")}
          .path=${mdiClose}
        ></ha-icon-button>
        <span
          slot="headerTitle"
          class="title-enlargeable"
          @click=${this._enlarge}
          >${heading}</span
        >
        ${
          this._params.newSection
            ? nothing
            : html`
                <ha-dropdown
                  slot="headerActionItems"
                  placement="bottom-end"
                  @closed=${stopPropagation}
                  @wa-select=${this._handleAction}
                >
                  <ha-icon-button
                    slot="trigger"
                    .label=${this.hass!.localize("ui.common.menu")}
                    .path=${mdiDotsVertical}
                  ></ha-icon-button>
                  <ha-dropdown-item value="move-to-view">
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiFileMoveOutline}
                    ></ha-svg-icon>
                    ${this.hass!.localize(
                      "ui.panel.lovelace.editor.edit_view.move_to_view"
                    )}
                  </ha-dropdown-item>
                </ha-dropdown>
              `
        }
        <div class="content">
          <div class="element-editor ha-scrollbar">
            ${
              !this._yamlMode
                ? html`
                    <ha-tab-group @wa-tab-show=${this._handleTabChanged}>
                      ${tabs.map(
                        (tab) => html`
                          <ha-tab-group-tab
                            slot="nav"
                            .panel=${tab}
                            .active=${currentTab === tab}
                          >
                            ${this.hass!.localize(
                              `ui.panel.lovelace.editor.edit_section.${tab.replace("-", "_")}`
                            )}
                          </ha-tab-group-tab>
                        `
                      )}
                    </ha-tab-group>
                  `
                : nothing
            }
            ${this._yamlMode ? content : cache(content)}
          </div>
          <div class="element-preview ha-scrollbar">
            <div class="preview-header">
              <span id="preview-label">
                ${this.hass.localize(
                  "ui.panel.lovelace.editor.edit_section.preview"
                )}
              </span>
              ${
                singleColumn
                  ? nothing
                  : html`
                      <div
                        class="preview-modes"
                        role="group"
                        aria-labelledby="preview-label"
                      >
                        ${PREVIEW_MODES.map(
                          ({ mode, iconPath }) => html`
                            <button
                              id="preview-mode-${mode}"
                              class=${classMap({
                                "preview-mode": true,
                                active: this._previewMode === mode,
                              })}
                              aria-pressed=${this._previewMode === mode}
                              aria-label=${this.hass.localize(
                                `ui.panel.lovelace.editor.edit_section.preview_${mode}`
                              )}
                              .mode=${mode}
                              @click=${this._previewModeClicked}
                            >
                              <ha-svg-icon .path=${iconPath}></ha-svg-icon>
                            </button>
                            <ha-tooltip
                              for="preview-mode-${mode}"
                              placement="bottom"
                            >
                              ${this.hass.localize(
                                `ui.panel.lovelace.editor.edit_section.preview_${mode}`
                              )}
                            </ha-tooltip>
                          `
                        )}
                      </div>
                    `
              }
            </div>
            <div class="preview-frame">
              <div
                class=${classMap({
                  "section-preview": true,
                  wide: previewColumnSpan > 1,
                })}
                style=${styleMap({
                  "--column-span": previewColumnSpan,
                })}
              >
                <div
                  class=${classMap({
                    "section-container": true,
                    "has-background": this._config.background !== undefined,
                    blur: this._yamlError || this._strategyError,
                  })}
                >
                  ${
                    this._config.background !== undefined
                      ? html`
                          <hui-section-background
                            .hass=${this.hass}
                            .background=${this._config.background}
                            .theme=${this._config.theme}
                          ></hui-section-background>
                        `
                      : nothing
                  }
                  <hui-section
                    .hass=${this.hass}
                    .config=${this._config}
                    preview
                  ></hui-section>
                </div>
              </div>
            </div>
          </div>
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            class="gui-mode-button"
            appearance="plain"
            @click=${this._toggleMode}
            .disabled=${this._yamlMode && this._yamlError}
          >
            ${this.hass.localize(
              this._yamlMode
                ? "ui.panel.lovelace.editor.edit_card.show_visual_editor"
                : "ui.panel.lovelace.editor.edit_card.show_code_editor"
            )}
          </ha-button>
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._cancel}
          >
            ${this.hass!.localize("ui.common.cancel")}
          </ha-button>

          <ha-button
            slot="primaryAction"
            @click=${this._save}
            ?disabled=${!this.isDirtyState || this._yamlError || this._strategyError}
          >
            ${this.hass!.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _configChanged(
    ev: ValueChangedEvent<LovelaceSectionRawConfig>
  ): void {
    ev.stopPropagation();
    this._config = ev.detail.value;
    this._updateDirtyState(this._config!);
  }

  private _strategyConfigChanged(
    ev: HASSDomEvent<ConfigChangedEvent<LovelaceStrategyConfig>>
  ): void {
    ev.stopPropagation();
    if (!this._config || !isStrategySection(this._config)) return;
    this._strategyError = Boolean(
      this._strategyEditor?.hasError ||
      ev.detail.error ||
      typeof ev.detail.config?.type !== "string" ||
      !ev.detail.config.type
    );
    if (this._strategyError) return;
    this._config = { ...this._config, strategy: ev.detail.config };
    this._updateDirtyState(this._config);
  }

  private _computeHeading(strategy?: LovelaceStrategyConfig) {
    const header = this.hass.localize(
      "ui.panel.lovelace.editor.edit_section.header"
    );
    if (!strategy) {
      return header;
    }
    const strategyName = this.hass.localize(
      `ui.panel.lovelace.editor.section_strategy.${strategy.type}.name`
    );
    if (!strategyName) {
      return header;
    }
    return this.hass.localize(
      "ui.panel.lovelace.editor.edit_section.typed_header",
      { type: strategyName }
    );
  }

  private _previewModeClicked(ev: Event) {
    this._storedPreviewMode = (
      ev.currentTarget as HTMLElement & { mode: PreviewMode }
    ).mode;
  }

  private _enlarge() {
    withViewTransition(() => {
      this.large = !this.large;
    });
  }

  private _handleTabChanged(ev: CustomEvent): void {
    const newTab = ev.detail.name;
    if (newTab === this._currTab) {
      return;
    }
    this._currTab = newTab;
  }

  private async _handleAction(ev: HaDropdownSelectEvent) {
    const value = ev.detail.item.value;
    switch (value) {
      case "move-to-view":
        this._openSelectView();
        break;
    }
  }

  private async _toggleMode(): Promise<void> {
    if (this._yamlMode && this._yamlError) return;
    await withViewTransition(() => {
      this._yamlMode = !this._yamlMode;
    });
    if (this._yamlMode) {
      await this.updateComplete;
      this._editor?.focus();
    }
  }

  protected supportedShortcutsInInput(): SupportedShortcuts {
    return this._params && !(this._yamlMode && this._yamlError)
      ? { Y: () => this._toggleMode() }
      : {};
  }

  private _openSelectView(): void {
    if (!this._params || !this.lovelace) {
      return;
    }

    showSelectViewDialog(this, {
      lovelaceConfig: this._params.lovelaceConfig,
      urlPath: this.lovelace.urlPath,
      allowDashboardChange: true,
      header: this.hass!.localize(
        "ui.panel.lovelace.editor.move_section.header"
      ),
      viewSelectedCallback: this._moveSectionToView,
    });
  }

  private _moveSectionToView = async (
    urlPath: string | null,
    selectedDashConfig: LovelaceConfig,
    viewIndex: number
  ) => {
    if (!this._params || !this.lovelace) {
      return;
    }

    const toView = selectedDashConfig.views[viewIndex];

    if (
      isStrategyView(toView) ||
      getViewType(toView) !== SECTIONS_VIEW_LAYOUT
    ) {
      showAlertDialog(this, {
        title: this.hass!.localize(
          "ui.panel.lovelace.editor.move_section.error_title"
        ),
        text: this.hass!.localize(
          "ui.panel.lovelace.editor.move_section.error_text"
        ),
        warning: true,
      });
      return;
    }

    const fromPath = this._params.path;

    // Same dashboard
    if (urlPath === this.lovelace.urlPath) {
      const oldConfig = this.lovelace.config;
      const toIndex = toView.sections?.length ?? 0;
      try {
        await this.lovelace.saveConfig(
          moveAtPath(oldConfig, fromPath, [
            "views",
            viewIndex,
            "sections",
            toIndex,
          ])
        );
        this.lovelace.showToast({
          id: LOVELACE_EDIT_TOAST_ID,
          message: this.hass!.localize(
            "ui.panel.lovelace.editor.move_section.success"
          ),
          duration: 4000,
          action: {
            action: async () => {
              await this.lovelace!.saveConfig(oldConfig);
            },
            text: this.hass!.localize("ui.common.undo"),
          },
        });

        this.closeDialog();
      } catch (err: any) {
        this.lovelace.showToast({
          id: LOVELACE_EDIT_TOAST_ID,
          message: this.hass!.localize(
            "ui.panel.lovelace.editor.move_section.error"
          ),
        });
        // eslint-disable-next-line no-console
        console.error(err);
      }
      return;
    }

    // Cross dashboard
    const oldFromConfig = this.lovelace.config;
    const oldToConfig = selectedDashConfig;
    try {
      const section = getAtPath<LovelaceSectionRawConfig>(
        oldFromConfig,
        fromPath
      )!;

      await saveConfig(
        this.hass!,
        urlPath,
        addSection(oldToConfig, ["views", viewIndex], section)
      );

      await this.lovelace.saveConfig(deleteAtPath(oldFromConfig, fromPath));

      this.lovelace.showToast({
        id: LOVELACE_EDIT_TOAST_ID,
        message: this.hass!.localize(
          "ui.panel.lovelace.editor.move_section.success"
        ),
        duration: 4000,
        action: {
          action: async () => {
            await saveConfig(this.hass!, urlPath, oldToConfig);
            await this.lovelace!.saveConfig(oldFromConfig);
          },
          text: this.hass!.localize("ui.common.undo"),
        },
      });

      this.closeDialog();
    } catch (err: any) {
      this.lovelace.showToast({
        id: LOVELACE_EDIT_TOAST_ID,
        message: this.hass!.localize(
          "ui.panel.lovelace.editor.move_section.error"
        ),
      });
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  private _viewYamlChanged(
    ev: ValueChangedEvent<LovelaceSectionRawConfig> &
      HASSDomEvent<{ isValid: boolean }>
  ) {
    ev.stopPropagation();
    this._yamlError =
      !ev.detail.isValid ||
      !ev.detail.value ||
      typeof ev.detail.value !== "object" ||
      Array.isArray(ev.detail.value) ||
      ("strategy" in ev.detail.value &&
        (!ev.detail.value.strategy ||
          typeof ev.detail.value.strategy !== "object" ||
          Array.isArray(ev.detail.value.strategy)));
    if (this._yamlError) {
      return;
    }
    this._config = ev.detail.value;
    this._strategyError = false;
    this._updateDirtyState(this._config!);
  }

  private _ignoreKeydown(ev: KeyboardEvent) {
    ev.stopPropagation();
  }

  private _cancel(ev?: Event) {
    if (ev) {
      ev.stopPropagation();
    }
    this.closeDialog();
  }

  private async _save(): Promise<void> {
    if (
      !this._params ||
      !this._config ||
      this._yamlError ||
      this._strategyError
    ) {
      return;
    }
    const newConfig = this._params.newSection
      ? insertAtPath(
          this._params.lovelaceConfig,
          this._params.path,
          this._config
        )
      : setAtPath(this._params.lovelaceConfig, this._params.path, this._config);

    this._params.saveConfig(newConfig);
    this._markDirtyStateClean();
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      haStyleDialogFixedTop,
      haStyleScrollbar,
      css`
        :host {
          --code-mirror-max-height: calc(100vh - 209px);
        }

        ha-dialog {
          --dialog-content-padding: var(--ha-space-2);
        }

        .content {
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 100%;
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          .content {
            gap: var(--ha-space-3);
          }
        }

        @media all and (min-width: 451px) and (min-height: 501px) {
          :host([large]) .content {
            max-width: none;
          }
        }

        .content .preview-frame {
          padding: 4px;
          overflow-x: auto;
        }
        .content .section-preview {
          --preview-column-width: 390px;
          display: block;
          margin: 0 auto;
          max-width: var(--preview-column-width);
        }
        .content .section-preview.wide {
          max-width: none;
          width: calc(
            var(--column-span) * var(--preview-column-width) +
              (var(--column-span) - 1) *
              var(--ha-view-sections-column-gap, 32px)
          );
        }
        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--ha-space-2);
          min-height: 32px;
          padding: var(--ha-space-1) var(--ha-space-2);
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
          font-weight: var(--ha-font-weight-medium);
        }
        .preview-modes {
          display: flex;
          gap: 2px;
          padding: 2px;
          border-radius: var(--ha-border-radius-pill);
          background: var(--ha-color-fill-neutral-normal-resting);
        }
        .preview-mode {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 28px;
          padding: 0;
          border: none;
          border-radius: var(--ha-border-radius-pill);
          background: none;
          color: var(--secondary-text-color);
          cursor: pointer;
          --mdc-icon-size: 18px;
        }
        .preview-mode:hover {
          color: var(--primary-text-color);
        }

        .preview-mode.active {
          color: var(--primary-text-color);
          background: var(--card-background-color);
          box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
        }
        .preview-mode:focus-visible {
          outline: 2px solid var(--primary-color);
          outline-offset: 2px;
        }
        .content .element-editor {
          padding-inline-start: var(--ha-space-1);
          padding-inline-end: var(--ha-space-2);
          margin-bottom: 0;
        }

        @media (min-width: 1000px) {
          .content {
            flex-direction: row;
            max-height: var(--code-mirror-max-height);
          }
          .content > .element-editor {
            padding-inline-end: var(--ha-space-4);
            max-width: 500px;
          }
          .content > .element-editor,
          .content > .element-preview {
            flex-basis: 0;
            flex-grow: 1;
            flex-shrink: 1;
            min-width: 0;
            height: auto;
          }
          .content .preview-frame {
            padding: 8px 10px;
          }
        }
        .element-editor {
          margin-bottom: 8px;
        }
        .blur {
          filter: blur(2px) grayscale(100%);
        }
        .element-preview {
          position: relative;
          height: max-content;
          background: var(--primary-background-color);
          padding: 4px;
          border-radius: var(--ha-border-radius-sm);
        }
        .section-container {
          position: relative;
        }
        .section-container.has-background {
          padding: var(--ha-space-2);
          border-radius: var(
            --ha-section-border-radius,
            var(--ha-border-radius-xl)
          );
        }
        .section-container hui-section {
          display: block;
        }
        ha-tab-group {
          margin-bottom: 16px;
        }
        ha-tab-group-tab {
          flex: 1;
        }
        ha-tab-group-tab::part(base) {
          width: 100%;
          justify-content: center;
        }
        .gui-mode-button {
          margin-right: auto;
          margin-inline-end: auto;
          margin-inline-start: initial;
        }
        .title-enlargeable {
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-section": HuiDialogEditSection;
  }
}
