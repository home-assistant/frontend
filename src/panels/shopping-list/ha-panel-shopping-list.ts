import { mdiMicrophone } from "@mdi/js";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
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
import { showVoiceCommandDialog } from "../../dialogs/voice-command-dialog/show-ha-voice-command-dialog";
import "../../layouts/ha-app-layout";
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
      <ha-app-layout>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>${this.hass.localize("panel.shopping_list")}</div>
            ${this._conversation(this.hass.config.components)
              ? html`
                  <ha-icon-button
                    .label=${this.hass!.localize(
                      "ui.panel.shopping_list.start_conversation"
                    )}
                    .path=${mdiMicrophone}
                    @click=${this._showVoiceCommandDialog}
                  ></ha-icon-button>
                `
              : ""}
          </app-toolbar>
        </app-header>
        <div id="columns">
          <div class="column">${this._card}</div>
        </div>
      </ha-app-layout>
    `;
  }

  private _showVoiceCommandDialog(): void {
    showVoiceCommandDialog(this);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
          height: 100%;
        }
        app-header {
          --mdc-theme-primary: var(--app-header-text-color);
        }
        :host([narrow]) app-toolbar mwc-button {
          width: 65px;
        }
        .heading {
          overflow: hidden;
          white-space: nowrap;
          margin-top: 4px;
        }
        #columns {
          display: flex;
          flex-direction: row;
          justify-content: center;
          margin-left: 4px;
          margin-right: 4px;
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
