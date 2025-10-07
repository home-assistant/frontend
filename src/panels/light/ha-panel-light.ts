import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { goBack } from "../../common/navigate";
import "../../components/ha-icon-button-arrow-prev";
import "../../components/ha-menu-button";
import type { LovelaceConfig } from "../../data/lovelace/config/types";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import type { Lovelace } from "../lovelace/types";
import "../lovelace/views/hui-view";
import "../lovelace/views/hui-view-container";

const LIGHT_LOVELACE_CONFIG: LovelaceConfig = {
  views: [
    {
      strategy: {
        type: "light",
      },
    },
  ],
};

@customElement("ha-panel-light")
class PanelLight extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() private _viewIndex = 0;

  @state() private _lovelace?: Lovelace;

  @state() private _searchParms = new URLSearchParams(window.location.search);

  public willUpdate(changedProps: PropertyValues) {
    if (!this.hasUpdated) {
      this.hass.loadFragmentTranslation("lovelace");
    }
    if (!changedProps.has("hass")) {
      return;
    }
    const oldHass = changedProps.get("hass") as this["hass"];
    if (oldHass?.locale !== this.hass.locale) {
      this._setLovelace();
    }
  }

  private _back(ev) {
    ev.stopPropagation();
    goBack();
  }

  protected render(): TemplateResult {
    return html`
      <div class="header">
        <div class="toolbar">
          ${this._searchParms.has("historyBack")
            ? html`
                <ha-icon-button-arrow-prev
                  @click=${this._back}
                  slot="navigationIcon"
                ></ha-icon-button-arrow-prev>
              `
            : html`
                <ha-menu-button
                  slot="navigationIcon"
                  .hass=${this.hass}
                  .narrow=${this.narrow}
                ></ha-menu-button>
              `}
          <div class="main-title">${this.hass.localize("panel.light")}</div>
        </div>
      </div>

      <hui-view-container .hass=${this.hass}>
        <hui-view
          .hass=${this.hass}
          .narrow=${this.narrow}
          .lovelace=${this._lovelace}
          .index=${this._viewIndex}
        ></hui-view>
      </hui-view-container>
    `;
  }

  private _setLovelace() {
    this._lovelace = {
      config: LIGHT_LOVELACE_CONFIG,
      rawConfig: LIGHT_LOVELACE_CONFIG,
      editMode: false,
      urlPath: "light",
      mode: "generated",
      locale: this.hass.locale,
      enableFullEditMode: () => undefined,
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: () => undefined,
      showToast: () => undefined,
    };
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
        }
        .header {
          background-color: var(--app-header-background-color);
          color: var(--app-header-text-color, white);
          border-bottom: var(--app-header-border-bottom, none);
          position: fixed;
          top: 0;
          width: calc(
            var(--mdc-top-app-bar-width, 100%) - var(
                --safe-area-inset-right,
                0px
              )
          );
          padding-top: var(--safe-area-inset-top);
          z-index: 4;
          transition: box-shadow 200ms linear;
          display: flex;
          flex-direction: row;
          -webkit-backdrop-filter: var(--app-header-backdrop-filter, none);
          backdrop-filter: var(--app-header-backdrop-filter, none);
          padding-top: var(--safe-area-inset-top);
          padding-right: var(--safe-area-inset-right);
        }
        :host([narrow]) .header {
          width: calc(
            var(--mdc-top-app-bar-width, 100%) - var(
                --safe-area-inset-left,
                0px
              ) - var(--safe-area-inset-right, 0px)
          );
          padding-left: var(--safe-area-inset-left);
        }
        :host([scrolled]) .header {
          box-shadow: var(
            --mdc-top-app-bar-fixed-box-shadow,
            0px 2px 4px -1px rgba(0, 0, 0, 0.2),
            0px 4px 5px 0px rgba(0, 0, 0, 0.14),
            0px 1px 10px 0px rgba(0, 0, 0, 0.12)
          );
        }
        .toolbar {
          height: var(--header-height);
          display: flex;
          flex: 1;
          align-items: center;
          font-size: var(--ha-font-size-xl);
          padding: 0px 12px;
          font-weight: var(--ha-font-weight-normal);
          box-sizing: border-box;
        }
        :host([narrow]) .toolbar {
          padding: 0 4px;
        }
        .main-title {
          margin: var(--margin-title);
          line-height: var(--ha-line-height-normal);
          flex-grow: 1;
        }
        hui-view-container {
          position: relative;
          display: flex;
          min-height: 100vh;
          box-sizing: border-box;
          padding-top: calc(var(--header-height) + var(--safe-area-inset-top));
          padding-right: var(--safe-area-inset-right);
          padding-inline-end: var(--safe-area-inset-right);
          padding-bottom: var(--safe-area-inset-bottom);
        }
        :host([narrow]) hui-view-container {
          padding-left: var(--safe-area-inset-left);
          padding-inline-start: var(--safe-area-inset-left);
        }
        hui-view {
          flex: 1 1 100%;
          max-width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-light": PanelLight;
  }
}
