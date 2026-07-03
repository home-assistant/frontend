import { mdiClose } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-tab-group";
import "../../../../components/ha-tab-group-tab";
import type { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { addBadge } from "../config-util";
import { findLovelaceContainer } from "../lovelace-path";
import "./hui-badge-picker";
import "./hui-badge-suggestion-picker";
import type { CreateBadgeDialogParams } from "./show-create-badge-dialog";
import { showEditBadgeDialog } from "./show-edit-badge-dialog";

@customElement("hui-dialog-create-badge")
export class HuiCreateDialogBadge
  extends LitElement
  implements HassDialog<CreateBadgeDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: CreateBadgeDialogParams;

  @state() private _open = false;

  @state() private _containerConfig!: LovelaceViewConfig;

  @state() private _currTab: "badge" | "entity" = "entity";

  @state() private _narrow = false;

  public async showDialog(params: CreateBadgeDialogParams): Promise<void> {
    this._params = params;

    this._narrow = matchMedia(
      "all and (max-width: 450px), all and (max-height: 500px)"
    ).matches;

    const containerConfig = findLovelaceContainer(
      params.lovelaceConfig,
      params.path
    );

    if ("strategy" in containerConfig) {
      throw new Error("Can't edit strategy");
    }

    this._containerConfig = containerConfig;
    this._open = true;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._open = false;
    this._params = undefined;
    this._currTab = "entity";
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const title = this._containerConfig.title
      ? this.hass!.localize(
          "ui.panel.lovelace.editor.edit_badge.pick_badge_title",
          { name: this._containerConfig.title }
        )
      : this.hass!.localize("ui.panel.lovelace.editor.edit_badge.pick_badge");

    return html`
      <ha-dialog
        .open=${this._open}
        flexcontent
        width="large"
        @keydown=${this._ignoreKeydown}
        @closed=${this._dialogClosed}
      >
        <ha-dialog-header show-border slot="header">
          <ha-icon-button
            slot="navigationIcon"
            @click=${this._cancel}
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title">${title}</span>
          <ha-tab-group @wa-tab-show=${this._handleTabChanged}>
            <ha-tab-group-tab
              slot="nav"
              .active=${this._currTab === "entity"}
              panel="entity"
              ?autofocus=${this._narrow}
              >${this.hass!.localize(
                "ui.panel.lovelace.editor.badge_picker.by_entity"
              )}</ha-tab-group-tab
            >
            <ha-tab-group-tab
              slot="nav"
              .active=${this._currTab === "badge"}
              panel="badge"
            >
              ${this.hass!.localize(
                "ui.panel.lovelace.editor.badge_picker.by_badge"
              )}
            </ha-tab-group-tab>
          </ha-tab-group>
        </ha-dialog-header>
        <div class="body">
          ${cache(
            this._currTab === "entity"
              ? html`
                  <hui-badge-suggestion-picker
                    ?autofocus=${!this._narrow}
                    .hass=${this.hass}
                    .prioritizedBadgeTypes=${this._params.suggestedBadges}
                    @badge-suggestion-picked=${this._handleSuggestionPicked}
                    @browse-badges=${this._handleBrowseBadges}
                  ></hui-badge-suggestion-picker>
                `
              : html`
                  <hui-badge-picker
                    ?autofocus=${!this._narrow}
                    .suggestedBadges=${this._params.suggestedBadges}
                    .lovelace=${this._params.lovelaceConfig}
                    .hass=${this.hass}
                    @config-changed=${this._handleBadgePicked}
                  ></hui-badge-picker>
                `
          )}
        </div>

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._cancel}
          >
            ${this.hass!.localize("ui.common.cancel")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _ignoreKeydown(ev: KeyboardEvent) {
    ev.stopPropagation();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
          --dialog-z-index: 6;
        }

        @media (min-width: 451px) and (min-height: 501px) {
          ha-dialog {
            --ha-dialog-min-height: min(900px, 80vh);
            --ha-dialog-max-height: var(--ha-dialog-min-height);
          }
        }

        ha-dialog::part(body) {
          overflow: hidden;
        }
        ha-dialog-footer {
          border-top: 1px solid var(--divider-color);
        }

        ha-tab-group-tab {
          flex: 1;
        }
        ha-tab-group-tab::part(base) {
          width: 100%;
          justify-content: center;
        }
        .body {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }
        hui-badge-picker,
        hui-badge-suggestion-picker {
          flex: 1;
          min-height: 0;
        }
        hui-badge-picker {
          --badge-picker-search-shape: 0;
          --badge-picker-search-margin: 0;
        }
      `,
    ];
  }

  private _handleBrowseBadges(): void {
    this._currTab = "badge";
  }

  private async _handleSuggestionPicked(
    ev: CustomEvent<{ config: LovelaceBadgeConfig }>
  ): Promise<void> {
    const config = ev.detail.config;
    const lovelaceConfig = this._params!.lovelaceConfig;
    const containerPath = this._params!.path;
    const saveConfig = this._params!.saveConfig;
    const newConfig = addBadge(lovelaceConfig, containerPath, config);
    await saveConfig(newConfig);
    this.closeDialog();
  }

  private _handleBadgePicked(ev) {
    const config = ev.detail.config;
    if (this._params!.entities && this._params!.entities.length) {
      if ("entities" in config) {
        config.entities = this._params!.entities;
      } else if ("entity" in config) {
        config.entity = this._params!.entities[0];
      }
    }

    showEditBadgeDialog(this, {
      lovelaceConfig: this._params!.lovelaceConfig,
      saveConfig: this._params!.saveConfig,
      path: this._params!.path,
      badgeConfig: config,
    });

    this.closeDialog();
  }

  private _handleTabChanged(ev: CustomEvent): void {
    const newTab = ev.detail.name;
    if (newTab === this._currTab) {
      return;
    }
    this._currTab = newTab;
  }

  private _cancel(ev?: Event) {
    if (ev) {
      ev.stopPropagation();
    }
    this.closeDialog();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-create-badge": HuiCreateDialogBadge;
  }
}
