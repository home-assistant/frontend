import {
  mdiClose,
  mdiDotsVertical,
  mdiFileMoveOutline,
  mdiPlaylistEdit,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
import type { HaDropdownItem } from "../../../../components/ha-dropdown-item";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-tab-group";
import "../../../../components/ha-tab-group-tab";
import "../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import { saveConfig } from "../../../../data/lovelace/config/types";
import {
  isStrategyView,
  type LovelaceViewConfig,
} from "../../../../data/lovelace/config/view";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import {
  haStyleDialog,
  haStyleDialogFixedTop,
} from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { Lovelace } from "../../types";
import { addSection, deleteSection, moveSection } from "../config-util";
import {
  findLovelaceContainer,
  updateLovelaceContainer,
} from "../lovelace-path";
import { showSelectViewDialog } from "../select-view/show-select-view-dialog";
import "./hui-section-settings-editor";
import "./hui-section-visibility-editor";
import type { EditSectionDialogParams } from "./show-edit-section-dialog";

const TABS = ["tab-settings", "tab-visibility"] as const;

@customElement("hui-dialog-edit-section")
export class HuiDialogEditSection
  extends LitElement
  implements HassDialog<EditSectionDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @state() private _params?: EditSectionDialogParams;

  @state() private _config?: LovelaceSectionRawConfig;

  @state() private _viewConfig?: LovelaceViewConfig;

  @state() private _yamlMode = false;

  @state() private _currTab: (typeof TABS)[number] = TABS[0];

  @query("ha-yaml-editor") private _editor?: HaYamlEditor;

  protected updated(changedProperties: PropertyValues) {
    if (this._yamlMode && changedProperties.has("_yamlMode")) {
      const sectionConfig = {
        ...this._config,
      };
      this._editor?.setValue(sectionConfig);
    }
  }

  public async showDialog(params: EditSectionDialogParams): Promise<void> {
    this._params = params;

    this.lovelace = params.lovelace;

    this._config = findLovelaceContainer(this._params.lovelaceConfig, [
      this._params.viewIndex,
      this._params.sectionIndex,
    ]);
    this._viewConfig = findLovelaceContainer(this._params.lovelaceConfig, [
      this._params.viewIndex,
    ]);
  }

  public closeDialog() {
    this._params = undefined;
    this._yamlMode = false;
    this._config = undefined;
    this._currTab = TABS[0];
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
  }

  protected render() {
    if (!this._params || !this._config) {
      return nothing;
    }

    const heading = this.hass!.localize(
      "ui.panel.lovelace.editor.edit_section.header"
    );

    let content: TemplateResult<1> | typeof nothing = nothing;

    if (this._yamlMode) {
      content = html`
        <ha-yaml-editor
          .hass=${this.hass}
          dialogInitialFocus
          @value-changed=${this._viewYamlChanged}
        ></ha-yaml-editor>
      `;
    } else {
      switch (this._currTab) {
        case "tab-settings":
          content = html`
            <hui-section-settings-editor
              .hass=${this.hass}
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
      }
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        @keydown=${this._ignoreKeydown}
        @closed=${this._cancel}
        .heading=${heading}
        class=${classMap({
          "yaml-mode": this._yamlMode,
        })}
      >
        <ha-dialog-header show-border slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title">${heading}</span>
          <ha-dropdown
            slot="actionItems"
            placement="bottom-end"
            @closed=${stopPropagation}
            @wa-select=${this._handleAction}
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass!.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-dropdown-item value="toggle-yaml">
              <ha-svg-icon slot="icon" .path=${mdiPlaylistEdit}></ha-svg-icon>
              ${this.hass.localize(
                `ui.panel.lovelace.editor.edit_view.edit_${!this._yamlMode ? "yaml" : "ui"}`
              )}
            </ha-dropdown-item>
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
          ${!this._yamlMode
            ? html`
                <ha-tab-group @wa-tab-show=${this._handleTabChanged}>
                  ${TABS.map(
                    (tab) => html`
                      <ha-tab-group-tab
                        slot="nav"
                        .panel=${tab}
                        .active=${this._currTab === tab}
                      >
                        ${this.hass!.localize(
                          `ui.panel.lovelace.editor.edit_section.${tab.replace("-", "_")}`
                        )}
                      </ha-tab-group-tab>
                    `
                  )}
                </ha-tab-group>
              `
            : nothing}
        </ha-dialog-header>
        ${content}
        <ha-button
          appearance="plain"
          slot="secondaryAction"
          @click=${this._cancel}
        >
          ${this.hass!.localize("ui.common.cancel")}
        </ha-button>

        <ha-button slot="primaryAction" @click=${this._save}>
          ${this.hass!.localize("ui.common.save")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _configChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this._config = ev.detail.value;
  }

  private _handleTabChanged(ev: CustomEvent): void {
    const newTab = ev.detail.name;
    if (newTab === this._currTab) {
      return;
    }
    this._currTab = newTab;
  }

  private async _handleAction(ev: CustomEvent<{ item: HaDropdownItem }>) {
    const value = ev.detail.item.value;
    switch (value) {
      case "toggle-yaml":
        this._yamlMode = !this._yamlMode;
        break;
      case "move-to-view":
        this._openSelectView();
        break;
    }
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

    if (isStrategyView(toView)) {
      showAlertDialog(this, {
        title: this.hass!.localize(
          "ui.panel.lovelace.editor.move_section.error_title"
        ),
        text: this.hass!.localize(
          "ui.panel.lovelace.editor.move_section.error_text_strategy"
        ),
        warning: true,
      });
      return;
    }

    const fromViewIndex = this._params.viewIndex;
    const fromSectionIndex = this._params.sectionIndex;

    // Same dashboard
    if (urlPath === this.lovelace.urlPath) {
      const oldConfig = this.lovelace.config;
      const toIndex = toView.sections?.length ?? 0;
      try {
        await this.lovelace.saveConfig(
          moveSection(
            oldConfig,
            [fromViewIndex, fromSectionIndex],
            [viewIndex, toIndex]
          )
        );
        this.lovelace.showToast({
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
      const section = findLovelaceContainer(oldFromConfig, [
        fromViewIndex,
        fromSectionIndex,
      ]) as LovelaceSectionRawConfig;

      await saveConfig(
        this.hass!,
        urlPath,
        addSection(oldToConfig, viewIndex, section)
      );

      await this.lovelace.saveConfig(
        deleteSection(oldFromConfig, fromViewIndex, fromSectionIndex)
      );

      this.lovelace.showToast({
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
        message: this.hass!.localize(
          "ui.panel.lovelace.editor.move_section.error"
        ),
      });
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  private _viewYamlChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    this._config = ev.detail.value;
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
    if (!this._params || !this._config) {
      return;
    }
    const newConfig = updateLovelaceContainer(
      this._params.lovelaceConfig,
      [this._params.viewIndex, this._params.sectionIndex],
      this._config
    );

    this._params.saveConfig(newConfig);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      haStyleDialogFixedTop,
      css`
        ha-dialog.yaml-mode {
          --dialog-content-padding: 0;
        }
        ha-tab-group-tab {
          flex: 1;
        }
        ha-tab-group-tab::part(base) {
          width: 100%;
          justify-content: center;
        }
        @media all and (min-width: 600px) {
          ha-dialog {
            --mdc-dialog-min-width: 600px;
          }
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
