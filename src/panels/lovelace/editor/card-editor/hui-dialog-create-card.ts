import { mdiClose } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-tab-group";
import "../../../../components/ha-tab-group-tab";
import "../../../../components/ha-dialog";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { addCard } from "../config-util";
import { findLovelaceContainer } from "../lovelace-path";
import "./hui-card-picker";
import "./hui-suggestion-picker";
import type { CreateCardDialogParams } from "./show-create-card-dialog";
import { showEditCardDialog } from "./show-edit-card-dialog";

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

  @state() private _currTab: "card" | "entity" = "entity";

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
    this._currTab = "entity";
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

          ${!this._params.saveCard
            ? html`
                <ha-tab-group @wa-tab-show=${this._handleTabChanged}>
                  <ha-tab-group-tab
                    slot="nav"
                    .active=${this._currTab === "entity"}
                    panel="entity"
                    ?autofocus=${this._narrow}
                    >${this.hass!.localize(
                      "ui.panel.lovelace.editor.cardpicker.by_entity"
                    )}</ha-tab-group-tab
                  >
                  <ha-tab-group-tab
                    slot="nav"
                    .active=${this._currTab === "card"}
                    panel="card"
                  >
                    ${this.hass!.localize(
                      "ui.panel.lovelace.editor.cardpicker.by_card"
                    )}
                  </ha-tab-group-tab>
                </ha-tab-group>
              `
            : nothing}
        </ha-dialog-header>
        ${cache(
          this._currTab === "entity"
            ? html`
                <hui-suggestion-picker
                  .hass=${this.hass}
                  .prioritizedCardTypes=${this._params.suggestedCards}
                  @suggestion-picked=${this._handleSuggestionPicked}
                  @browse-cards=${this._handleBrowseCards}
                ></hui-suggestion-picker>
              `
            : html`
                <hui-card-picker
                  ?autofocus=${!this._narrow}
                  .suggestedCards=${this._params.suggestedCards}
                  .lovelace=${this._params.lovelaceConfig}
                  .hass=${this.hass}
                  @config-changed=${this._handleCardPicked}
                ></hui-card-picker>
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

        ha-dialog::part(body) {
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
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        hui-card-picker,
        hui-suggestion-picker {
          height: calc(100vh - 198px);
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          hui-card-picker,
          hui-suggestion-picker {
            height: calc(100vh - 158px);
          }
        }
      `,
    ];
  }

  private _handleBrowseCards(): void {
    this._currTab = "card";
  }

  private async _handleSuggestionPicked(
    ev: CustomEvent<{ config: LovelaceCardConfig }>
  ): Promise<void> {
    const config = ev.detail.config;
    if (this._params!.saveCard) {
      await this._params!.saveCard(config);
      this.closeDialog();
      return;
    }

    const lovelaceConfig = this._params!.lovelaceConfig;
    const containerPath = this._params!.path;
    const saveConfig = this._params!.saveConfig;
    const newConfig = addCard(lovelaceConfig, containerPath, config);
    await saveConfig(newConfig);
    this.closeDialog();
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

    if (this._params!.saveCard) {
      showEditCardDialog(this, {
        lovelaceConfig: this._params!.lovelaceConfig,
        saveCardConfig: this._params!.saveCard,
        cardConfig: config,
        isNew: true,
      });
      this.closeDialog();
      return;
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
    "hui-dialog-create-card": HuiCreateDialogCard;
  }
}
