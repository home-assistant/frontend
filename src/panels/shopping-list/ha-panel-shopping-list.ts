import { mdiMicrophone } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import "../../components/ha-icon-button";
import "../../components/ha-menu-button";
import "../../components/ha-top-app-bar-fixed";
import { showVoiceCommandDialog } from "../../dialogs/voice-command-dialog/show-ha-voice-command-dialog";
import { haStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { HuiErrorCard } from "../lovelace/cards/hui-error-card";
import { createCardElement } from "../lovelace/create-element/create-card-element";
import { LovelaceCard } from "../lovelace/types";

@customElement("ha-panel-shopping-list")
class PanelShoppingList extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @state() private _card!: LovelaceCard | HuiErrorCard;

  private _conversation = memoizeOne((_components) =>
    isComponentLoaded(this.hass, "conversation")
  );

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);

    this._card = createCardElement({ type: "shopping-list" }) as LovelaceCard;
    this._card.hass = this.hass;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has("hass")) {
      this._card.hass = this.hass;
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-top-app-bar-fixed>
        <ha-menu-button
          slot="navigationIcon"
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></ha-menu-button>
        <div slot="title">${this.hass.localize("panel.todo")}</div>
        ${this._conversation(this.hass.config.components)
          ? html`
              <ha-icon-button
                slot="actionItems"
                .label=${this.hass!.localize(
                  "ui.panel.shopping_list.start_conversation"
                )}
                .path=${mdiMicrophone}
                @click=${this._showVoiceCommandDialog}
              ></ha-icon-button>
            `
          : ""}
        <div id="columns">
          <div class="column">${this._card}</div>
        </div>
      </ha-top-app-bar-fixed>
    `;
  }

  private _showVoiceCommandDialog(): void {
    showVoiceCommandDialog(this, this.hass, { pipeline_id: "last_used" });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        #columns {
          display: flex;
          flex-direction: row;
          justify-content: center;
          margin: 8px;
        }
        .column {
          flex: 1 0 0;
          max-width: 500px;
          min-width: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-shopping-list": PanelShoppingList;
  }
}
