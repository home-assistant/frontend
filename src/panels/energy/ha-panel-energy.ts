import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import {
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-menu-button";
import "../../layouts/ha-app-layout";
import { haStyle } from "../../resources/styles";
import "../lovelace/views/hui-view";
import { HomeAssistant } from "../../types";
import { Lovelace } from "../lovelace/types";

@customElement("ha-panel-energy")
class PanelEnergy extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @state() private _lovelace?: Lovelace;

  public willUpdate(changedProps: PropertyValues) {
    if (!changedProps.has("hass")) {
      return;
    }
    const oldHass = changedProps.get("hass") as this["hass"];
    if (oldHass?.locale !== this.hass.locale) {
      this._setLovelace();
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
            <div main-title>${this.hass.localize("panel.energy")}</div>
          </app-toolbar>
        </app-header>
        ${this._lovelace
          ? html`<hui-view
              .hass=${this.hass}
              .narrow=${this.narrow}
              .lovelace=${this._lovelace}
              .index=${0}
            ></hui-view>`
          : ""}
      </ha-app-layout>
    `;
  }

  private _setLovelace() {
    const config = {
      views: [
        {
          title: this.hass.localize("panel.energy") || "Energy",
          path: "energy",
          strategy: {
            type: "energy",
          },
        },
      ],
    };

    this._lovelace = {
      config,
      rawConfig: config,
      editMode: false,
      urlPath: "energy",
      enableFullEditMode: () => undefined,
      mode: "generated",
      locale: this.hass.locale,
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: () => undefined,
    };
  }

  static get styles(): CSSResultGroup {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-energy": PanelEnergy;
  }
}
