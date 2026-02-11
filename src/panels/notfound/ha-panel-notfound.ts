import type { PropertyValues } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { LovelaceConfig } from "../../data/lovelace/config/types";
import { NOT_FOUND_PANEL } from "../../data/panel";
import type { HomeAssistant, PanelInfo, Route } from "../../types";
import type { EmptyStateCardConfig } from "../lovelace/cards/types";
import "../lovelace/hui-root";
import type { Lovelace } from "../lovelace/types";

@customElement("ha-panel-notfound")
class HaPanelNotFound extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route?: Route;

  @property({ attribute: false }) public panel?: PanelInfo;

  @state() private _lovelace?: Lovelace;

  public willUpdate(changedProps: PropertyValues) {
    if (!this.hasUpdated) {
      this._setup();
      return;
    }

    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as this["hass"];
      if (oldHass && oldHass.localize !== this.hass.localize) {
        this._setLovelace();
      }
    }
  }

  private async _setup() {
    await this.hass.loadFragmentTranslation("lovelace");
    this._setLovelace();
  }

  protected render() {
    if (!this._lovelace) {
      return nothing;
    }

    return html`
      <hui-root
        .hass=${this.hass}
        .narrow=${this.narrow}
        .lovelace=${this._lovelace}
        .route=${this.route}
        .panel=${this.panel}
        no-edit
      ></hui-root>
    `;
  }

  private _setLovelace() {
    const config: LovelaceConfig = {
      views: [
        {
          type: "panel",
          cards: [
            {
              type: "empty-state",
              content_only: true,
              icon: "mdi:lock",
              title: this.hass.localize("ui.panel.notfound.no_access_title"),
              content: this.hass.localize(
                "ui.panel.notfound.no_access_content"
              ),
              buttons: [
                {
                  text: this.hass.localize(
                    "ui.panel.notfound.no_access_go_to_profile"
                  ),
                  tap_action: {
                    action: "navigate",
                    navigation_path: "/profile/general",
                  },
                },
              ],
            } as EmptyStateCardConfig,
          ],
        },
      ],
    };

    this._lovelace = {
      config: config,
      rawConfig: config,
      editMode: false,
      urlPath: NOT_FOUND_PANEL,
      mode: "generated",
      locale: this.hass.locale,
      enableFullEditMode: () => undefined,
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: () => undefined,
      showToast: () => undefined,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-notfound": HaPanelNotFound;
  }
}
