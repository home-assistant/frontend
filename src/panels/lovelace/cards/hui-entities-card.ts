import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";

import "../../../components/ha-card";
import "../components/hui-entities-toggle";

import { HomeAssistant } from "../../../types";
import { LovelaceRow } from "../entity-rows/types";
import {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceHeaderFooter,
} from "../types";
import { processConfigEntities } from "../common/process-config-entities";
import { createRowElement } from "../create-element/create-row-element";
import { EntitiesCardConfig, EntitiesCardEntityConfig } from "./types";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { createHeaderFooterElement } from "../create-element/create-header-footer-element";
import { LovelaceHeaderFooterConfig } from "../header-footer/types";

@customElement("hui-entities-card")
class HuiEntitiesCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      /* webpackChunkName: "hui-entities-card-editor" */ "../editor/config-elements/hui-entities-card-editor"
    );
    return document.createElement("hui-entities-card-editor");
  }

  public static getStubConfig(): object {
    return { entities: [], state_color: false };
  }

  @property() private _config?: EntitiesCardConfig;

  private _hass?: HomeAssistant;

  private _configEntities?: EntitiesCardEntityConfig[];

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this.shadowRoot!.querySelectorAll("#states > div > *").forEach(
      (element: unknown) => {
        (element as LovelaceRow).hass = hass;
      }
    );
    this.shadowRoot!.querySelectorAll(".header-footer > *").forEach(
      (element: unknown) => {
        (element as LovelaceHeaderFooter).hass = hass;
      }
    );
    const entitiesToggle = this.shadowRoot!.querySelector(
      "hui-entities-toggle"
    );
    if (entitiesToggle) {
      (entitiesToggle as any).hass = hass;
    }
  }

  public getCardSize(): number {
    if (!this._config) {
      return 0;
    }
    // +1 for the header
    return (this._config.title ? 1 : 0) + this._config.entities.length;
  }

  public setConfig(config: EntitiesCardConfig): void {
    const entities = processConfigEntities(config.entities);

    this._config = { theme: "default", ...config };
    this._configEntities = entities;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this._hass) {
      return;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | EntitiesCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this._hass.themes, this._config.theme);
    }
  }

  protected render(): TemplateResult {
    if (!this._config || !this._hass) {
      return html``;
    }

    return html`
      <ha-card>
        ${this._config.header
          ? this.renderHeaderFooter(this._config.header, "header")
          : ""}
        ${!this._config.title &&
        !this._config.show_header_toggle &&
        !this._config.icon
          ? ""
          : html`
              <div class="card-header">
                <div class="name">
                  ${this._config.icon
                    ? html`
                        <ha-icon
                          class="icon"
                          .icon="${this._config.icon}"
                        ></ha-icon>
                      `
                    : ""}
                  ${this._config.title}
                </div>
                ${this._config.show_header_toggle === false
                  ? html``
                  : html`
                      <hui-entities-toggle
                        .hass="${this._hass}"
                        .entities="${this._configEntities!.map(
                          (conf) => conf.entity
                        )}"
                      ></hui-entities-toggle>
                    `}
              </div>
            `}
        <div id="states" class="card-content">
          ${this._configEntities!.map((entityConf) =>
            this.renderEntity(entityConf)
          )}
        </div>

        ${this._config.footer
          ? this.renderHeaderFooter(this._config.footer, "footer")
          : ""}
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .card-header {
        display: flex;
        justify-content: space-between;
      }

      .card-header .name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      #states > * {
        margin: 8px 0;
      }

      #states > div > * {
        overflow: hidden;
      }

      .icon {
        padding: 0px 18px 0px 8px;
      }

      .header {
        border-top-left-radius: var(--ha-card-border-radius, 2px);
        border-top-right-radius: var(--ha-card-border-radius, 2px);
        margin-bottom: 16px;
        overflow: hidden;
      }

      .footer {
        border-bottom-left-radius: var(--ha-card-border-radius, 2px);
        border-bottom-right-radius: var(--ha-card-border-radius, 2px);
        margin-top: -16px;
        overflow: hidden;
      }
    `;
  }

  private renderHeaderFooter(
    conf: LovelaceHeaderFooterConfig,
    className: string
  ): TemplateResult {
    const element = createHeaderFooterElement(conf);
    if (this._hass) {
      element.hass = this._hass;
    }
    return html`
      <div class=${"header-footer " + className}>${element}</div>
    `;
  }

  private renderEntity(entityConf: EntitiesCardEntityConfig): TemplateResult {
    const element = createRowElement(
      this._config!.state_color
        ? {
            state_color: true,
            ...entityConf,
          }
        : entityConf
    );
    if (this._hass) {
      element.hass = this._hass;
    }

    return html`
      <div>${element}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entities-card": HuiEntitiesCard;
  }
}
