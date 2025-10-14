import { mdiClose } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-tab-group";
import "../../../../components/ha-tab-group-tab";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { computeBadges } from "../../common/generate-lovelace-config";
import "../card-editor/hui-entity-picker-table";
import { findLovelaceContainer } from "../lovelace-path";
import "./hui-badge-picker";
import type { CreateBadgeDialogParams } from "./show-create-badge-dialog";
import { showEditBadgeDialog } from "./show-edit-badge-dialog";
import { showSuggestBadgeDialog } from "./show-suggest-badge-dialog";

declare global {
  interface HASSDomEvents {
    "selected-changed": SelectedChangedEvent;
  }
}

interface SelectedChangedEvent {
  selectedEntities: string[];
}

@customElement("hui-dialog-create-badge")
export class HuiCreateDialogBadge
  extends LitElement
  implements HassDialog<CreateBadgeDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: CreateBadgeDialogParams;

  @state() private _containerConfig!: LovelaceViewConfig;

  @state() private _selectedEntities: string[] = [];

  @state() private _currTab: "badge" | "entity" = "badge";

  public async showDialog(params: CreateBadgeDialogParams): Promise<void> {
    this._params = params;

    const containerConfig = findLovelaceContainer(
      params.lovelaceConfig,
      params.path
    );

    if ("strategy" in containerConfig) {
      throw new Error("Can't edit strategy");
    }

    this._containerConfig = containerConfig;
  }

  public closeDialog(): boolean {
    this._params = undefined;
    this._currTab = "badge";
    this._selectedEntities = [];
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
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
        open
        scrimClickAction
        @keydown=${this._ignoreKeydown}
        @closed=${this._cancel}
        .heading=${title}
        class=${classMap({ table: this._currTab === "entity" })}
      >
        <ha-dialog-header show-border slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title">${title}</span>
          <ha-tab-group @wa-tab-show=${this._handleTabChanged}>
            <ha-tab-group-tab
              slot="nav"
              .active=${this._currTab === "badge"}
              panel="badge"
              dialogInitialFocus
            >
              ${this.hass!.localize(
                "ui.panel.lovelace.editor.badge_picker.by_badge"
              )}
            </ha-tab-group-tab>
            <ha-tab-group-tab
              slot="nav"
              .active=${this._currTab === "entity"}
              panel="entity"
              >${this.hass!.localize(
                "ui.panel.lovelace.editor.badge_picker.by_entity"
              )}</ha-tab-group-tab
            >
          </ha-tab-group>
        </ha-dialog-header>
        ${cache(
          this._currTab === "badge"
            ? html`
                <hui-badge-picker
                  .suggestedBadges=${this._params.suggestedBadges}
                  .lovelace=${this._params.lovelaceConfig}
                  .hass=${this.hass}
                  @config-changed=${this._handleBadgePicked}
                ></hui-badge-picker>
              `
            : html`
                <hui-entity-picker-table
                  no-label-float
                  .hass=${this.hass}
                  .narrow=${true}
                  @selected-changed=${this._handleSelectedChanged}
                ></hui-entity-picker-table>
              `
        )}

        <div slot="primaryAction">
          <ha-button appearance="plain" @click=${this._cancel}>
            ${this.hass!.localize("ui.common.cancel")}
          </ha-button>
          ${this._selectedEntities.length
            ? html`
                <ha-button @click=${this._suggestBadges}>
                  ${this.hass!.localize("ui.common.continue")}
                </ha-button>
              `
            : ""}
        </div>
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
        @media all and (max-width: 450px), all and (max-height: 500px) {
          /* overrule the ha-style-dialog max-height on small screens */
          ha-dialog {
            --mdc-dialog-max-height: 100%;
            height: 100%;
          }
        }

        @media all and (min-width: 850px) {
          ha-dialog {
            --mdc-dialog-min-width: 845px;
          }
        }

        ha-dialog {
          --mdc-dialog-max-width: 845px;
          --dialog-content-padding: 2px 24px 20px 24px;
          --dialog-z-index: 6;
        }

        ha-dialog.table {
          --dialog-content-padding: 0;
        }

        @media (min-width: 1200px) {
          ha-dialog {
            --mdc-dialog-max-width: calc(100vw - 32px);
            --mdc-dialog-min-width: 1000px;
          }
        }
        ha-tab-group-tab {
          flex: 1;
        }
        ha-tab-group-tab::part(base) {
          width: 100%;
          justify-content: center;
        }
        hui-badge-picker {
          --badge-picker-search-shape: 0;
          --badge-picker-search-margin: -2px -24px 0;
        }
        hui-entity-picker-table {
          display: block;
          height: calc(100vh - 198px);
          --mdc-shape-small: 0;
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          hui-entity-picker-table {
            height: calc(100vh - 158px);
          }
        }
      `,
    ];
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
    this._selectedEntities = [];
  }

  private _handleSelectedChanged(ev: CustomEvent): void {
    this._selectedEntities = ev.detail.selectedEntities;
  }

  private _cancel(ev?: Event) {
    if (ev) {
      ev.stopPropagation();
    }
    this.closeDialog();
  }

  private _suggestBadges(): void {
    const badgeConfig = computeBadges(this.hass.states, this._selectedEntities);

    showSuggestBadgeDialog(this, {
      lovelaceConfig: this._params!.lovelaceConfig,
      saveConfig: this._params!.saveConfig,
      path: this._params!.path as [number],
      entities: this._selectedEntities,
      badgeConfig,
    });

    this.closeDialog();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-create-badge": HuiCreateDialogBadge;
  }
}
