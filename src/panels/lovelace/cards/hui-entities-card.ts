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

import computeDomain from "../../../common/entity/compute_domain";
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
    const { show_header_toggle, title } = this._config;

    return html`
      <ha-card>
        ${!title && !show_header_toggle
          ? html``
          : html`
              <div class="header" slot="header">
                <div class="name">${title}</div>
                ${show_header_toggle === false
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
        <div id="states">
          ${this._configEntities!.map((entityConf) =>
            this.renderEntity(entityConf)
          )}
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
      #states {
        padding: 12px 16px;
      }

      #states > * {
        margin: 8px 0;
      }

      #states > div > * {
        overflow: hidden;
      }

      .header {
        margin-bottom: -8px;
        padding-bottom: 0px;
        display: flex;
        justify-content: space-between;
      }

      .header .name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .state-card-dialog {
        cursor: pointer;
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
