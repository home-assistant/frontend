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

import { fireEvent } from "../../../common/dom/fire_event";
import { DOMAINS_HIDE_MORE_INFO } from "../../../common/const";
import { HomeAssistant } from "../../../types";
import { EntityRow } from "../entity-rows/types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { processConfigEntities } from "../common/process-config-entities";
import { createRowElement } from "../common/create-row-element";
import { EntitiesCardConfig, EntitiesCardEntityConfig } from "./types";

import { computeDomain } from "../../../common/entity/compute_domain";
import applyThemesOnElement from "../../../common/dom/apply_themes_on_element";

@customElement("hui-entities-card")
class HuiEntitiesCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(/* webpackChunkName: "hui-entities-card-editor" */ "../editor/config-elements/hui-entities-card-editor");
    return document.createElement("hui-entities-card-editor");
  }

  public static getStubConfig(): object {
    return { entities: [] };
  }

  @property() protected _config?: EntitiesCardConfig;

  protected _hass?: HomeAssistant;

  protected _configEntities?: EntitiesCardEntityConfig[];

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this.shadowRoot!.querySelectorAll("#states > div > *").forEach(
      (element: unknown) => {
        (element as EntityRow).hass = hass;
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

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (this._hass && this._config) {
      applyThemesOnElement(this, this._hass.themes, this._config.theme);
    }
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this._hass) {
      return html``;
    }

    return html`
      <ha-card>
        ${!this._config.title &&
        !this._config.show_header_toggle &&
        !this._config.icon
          ? html``
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

      .card-header hui-entities-toggle {
        margin: -4px 0;
      }

      #states > * {
        margin: 8px 0;
      }

      #states > div > * {
        overflow: hidden;
      }

      .state-card-dialog {
        cursor: pointer;
      }

      .icon {
        padding: 0px 18px 0px 8px;
      }
    `;
  }

  private renderEntity(entityConf: EntitiesCardEntityConfig): TemplateResult {
    const element = createRowElement(entityConf);
    if (this._hass) {
      element.hass = this._hass;
    }
    if (
      entityConf.entity &&
      !DOMAINS_HIDE_MORE_INFO.includes(computeDomain(entityConf.entity))
    ) {
      element.classList.add("state-card-dialog");
      element.addEventListener("click", () => this._handleClick(entityConf));
    }

    return html`
      <div>${element}</div>
    `;
  }

  private _handleClick(entityConf: EntitiesCardEntityConfig): void {
    const entityId = entityConf.entity;
    fireEvent(this, "hass-more-info", { entityId });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entities-card": HuiEntitiesCard;
  }
}
