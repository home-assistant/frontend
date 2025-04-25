import type { ActionDetail } from "@material/mwc-list";
import { mdiClose, mdiDotsVertical, mdiPlaylistEdit } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-button";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-list-item";
import "../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import "../../../../components/sl-tab-group";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import {
  findLovelaceContainer,
  updateLovelaceContainer,
} from "../lovelace-path";
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
          <ha-button-menu
            slot="actionItems"
            fixed
            corner="BOTTOM_END"
            menu-corner="END"
            @closed=${stopPropagation}
            @action=${this._handleAction}
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass!.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-list-item graphic="icon">
              ${this.hass.localize(
                `ui.panel.lovelace.editor.edit_view.edit_${!this._yamlMode ? "yaml" : "ui"}`
              )}
              <ha-svg-icon
                slot="graphic"
                .path=${mdiPlaylistEdit}
              ></ha-svg-icon>
            </ha-list-item>
          </ha-button-menu>
          ${!this._yamlMode
            ? html`
                <sl-tab-group @sl-tab-show=${this._handleTabChanged}>
                  ${TABS.map(
                    (tab) => html`
                      <sl-tab
                        slot="nav"
                        .panel=${tab}
                        .active=${this._currTab === tab}
                      >
                        ${this.hass!.localize(
                          `ui.panel.lovelace.editor.edit_section.${tab.replace("-", "_")}`
                        )}
                      </sl-tab>
                    `
                  )}
                </sl-tab-group>
              `
            : nothing}
        </ha-dialog-header>
        ${content}
        <ha-button slot="secondaryAction" @click=${this._cancel}>
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

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    ev.stopPropagation();
    ev.preventDefault();
    switch (ev.detail.index) {
      case 0:
        this._yamlMode = !this._yamlMode;
        break;
    }
  }

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
      css`
        ha-dialog {
          /* Set the top top of the dialog to a fixed position, so it doesnt jump when the content changes size */
          --vertical-align-dialog: flex-start;
          --dialog-surface-margin-top: 40px;
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          /* When in fullscreen dialog should be attached to top */
          ha-dialog {
            --dialog-surface-margin-top: 0px;
          }
        }
        ha-dialog.yaml-mode {
          --dialog-content-padding: 0;
        }
        sl-tab {
          flex: 1;
        }
        sl-tab::part(base) {
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
