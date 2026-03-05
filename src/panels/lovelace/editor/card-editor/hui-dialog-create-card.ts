import { mdiClose } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-tab-group";
import "../../../../components/ha-tab-group-tab";
import "../../../../components/ha-wa-dialog";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import { isStrategySection } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import {
  computeCards,
  computeSection,
} from "../../common/generate-lovelace-config";
import { addCard } from "../config-util";
import {
  findLovelaceContainer,
  parseLovelaceContainerPath,
} from "../lovelace-path";
import "./hui-card-picker";
import "./hui-entity-picker-table";
import type { CreateCardDialogParams } from "./show-create-card-dialog";
import { showEditCardDialog } from "./show-edit-card-dialog";
import { showSuggestCardDialog } from "./show-suggest-card-dialog";

declare global {
  interface HASSDomEvents {
    "selected-changed": SelectedChangedEvent;
  }
}

interface SelectedChangedEvent {
  selectedEntities: string[];
}

@customElement("hui-dialog-create-card")
export class HuiCreateDialogCard
  extends LitElement
  implements HassDialog<CreateCardDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: CreateCardDialogParams;

  @state() private _open = false;

  @state() private _containerConfig!:
    | LovelaceViewConfig
    | LovelaceSectionConfig;

  @state() private _selectedEntities: string[] = [];

  @state() private _currTab: "card" | "entity" = "card";

  @state() private _narrow = false;

  public async showDialog(params: CreateCardDialogParams): Promise<void> {
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
    this._currTab = "card";
    this._selectedEntities = [];
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const title = this._containerConfig.title
      ? this.hass!.localize(
          "ui.panel.lovelace.editor.edit_card.pick_card_title",
          { name: `"${this._containerConfig.title}"` }
        )
      : this.hass!.localize("ui.panel.lovelace.editor.edit_card.pick_card");

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        flexcontent
        width="large"
        @keydown=${this._ignoreKeydown}
        @closed=${this._dialogClosed}
        class=${classMap({ table: this._currTab === "entity" })}
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
              .active=${this._currTab === "card"}
              panel="card"
              ?autofocus=${this._narrow}
            >
              ${this.hass!.localize(
                "ui.panel.lovelace.editor.cardpicker.by_card"
              )}
            </ha-tab-group-tab>
            <ha-tab-group-tab
              slot="nav"
              .active=${this._currTab === "entity"}
              panel="entity"
              >${this.hass!.localize(
                "ui.panel.lovelace.editor.cardpicker.by_entity"
              )}</ha-tab-group-tab
            >
          </ha-tab-group>
        </ha-dialog-header>
        ${cache(
          this._currTab === "card"
            ? html`
                <hui-card-picker
                  ?autofocus=${!this._narrow}
                  .suggestedCards=${this._params.suggestedCards}
                  .lovelace=${this._params.lovelaceConfig}
                  .hass=${this.hass}
                  @config-changed=${this._handleCardPicked}
                ></hui-card-picker>
              `
            : html`
                <hui-entity-picker-table
                  no-label-float
                  .hass=${this.hass}
                  narrow
                  @selected-changed=${this._handleSelectedChanged}
                ></hui-entity-picker-table>
              `
        )}

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._cancel}
          >
            ${this.hass!.localize("ui.common.cancel")}
          </ha-button>
          ${this._selectedEntities.length
            ? html`
                <ha-button slot="primaryAction" @click=${this._suggestCards}>
                  ${this.hass!.localize("ui.common.continue")}
                </ha-button>
              `
            : ""}
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _ignoreKeydown(ev: KeyboardEvent) {
    ev.stopPropagation();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-wa-dialog {
          --dialog-content-padding: 0;
          --dialog-z-index: 6;
        }

        ha-wa-dialog.table {
          --dialog-content-padding: 0;
        }

        ha-wa-dialog::part(body) {
          overflow: hidden;
        }

        ha-tab-group-tab {
          flex: 1;
        }
        ha-tab-group-tab::part(base) {
          width: 100%;
          justify-content: center;
        }
        hui-card-picker {
          --card-picker-search-shape: 0;
          --card-picker-search-margin: 0;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        hui-card-picker,
        hui-entity-picker-table {
          height: calc(100vh - 198px);
        }

        hui-entity-picker-table {
          display: block;
          --mdc-shape-small: 0;
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          hui-card-picker,
          hui-entity-picker-table {
            height: calc(100vh - 158px);
          }
        }
      `,
    ];
  }

  private _handleCardPicked(ev) {
    const config = ev.detail.config;
    if (this._params!.entities && this._params!.entities.length) {
      if ("entities" in config) {
        config.entities = this._params!.entities;
      } else if ("entity" in config) {
        config.entity = this._params!.entities[0];
      }
    }

    const lovelaceConfig = this._params!.lovelaceConfig;
    const containerPath = this._params!.path;
    const saveConfig = this._params!.saveConfig;

    const sectionConfig =
      containerPath.length === 2
        ? findLovelaceContainer(lovelaceConfig, containerPath)
        : undefined;

    showEditCardDialog(this, {
      lovelaceConfig,
      saveCardConfig: async (newCardConfig) => {
        const newConfig = addCard(lovelaceConfig, containerPath, newCardConfig);
        await saveConfig(newConfig);
      },
      cardConfig: config,
      sectionConfig,
      isNew: true,
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

  private _suggestCards(): void {
    const cardConfig = computeCards(this.hass, this._selectedEntities, {});

    let sectionOptions: Partial<LovelaceSectionConfig> = {};

    const { viewIndex, sectionIndex } = parseLovelaceContainerPath(
      this._params!.path
    );
    const isSection = sectionIndex !== undefined;

    // If we are in a section, we want to keep the section options for the preview
    if (isSection) {
      const containerConfig = findLovelaceContainer(
        this._params!.lovelaceConfig!,
        [viewIndex, sectionIndex]
      );
      if (!isStrategySection(containerConfig)) {
        const { cards, title, ...rest } = containerConfig;
        sectionOptions = rest;
      }
    }

    const sectionConfig = computeSection(
      this._selectedEntities,
      sectionOptions
    );

    showSuggestCardDialog(this, {
      lovelaceConfig: this._params!.lovelaceConfig,
      saveConfig: this._params!.saveConfig,
      path: this._params!.path as [number],
      entities: this._selectedEntities,
      cardConfig,
      sectionConfig,
    });

    this.closeDialog();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-create-card": HuiCreateDialogCard;
  }
}
