import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
  TemplateResult,
  customElement,
} from "lit-element";

import "../../../components/ha-card";
import "../components/hui-entities-toggle";

import { HomeAssistant } from "../../../types";
import { EntityConfig, EntityRow } from "../entity-rows/types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { LovelaceCardConfig, ActionConfig } from "../../../data/lovelace";
import { processConfigEntities } from "../common/process-config-entities";
import { createRowElement } from "../common/create-row-element";
import applyThemesOnElement from "../../../common/dom/apply_themes_on_element";
import { DOMAINS_HIDE_MORE_INFO } from "../../../common/const";
import computeDomain from "../../../common/entity/compute_domain";

export interface EntitiesCardEntityConfig extends EntityConfig {
  type?: string;
  secondary_info?: "entity-id" | "last-changed";
  action_name?: string;
  service?: string;
  service_data?: object;
  url?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
}

export interface EntitiesCardConfig extends LovelaceCardConfig {
  show_header_toggle?: boolean;
  title?: string;
  entities: EntitiesCardEntityConfig[];
  theme?: string;
}

@customElement("hui-entities-card")
class HuiEntitiesCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(/* webpackChunkName: "hui-entities-card-editor" */ "../editor/config-elements/hui-entities-card-editor");
    return document.createElement("hui-entities-card-editor");
  }

  public static getStubConfig(): object {
    return { entities: [] };
  }

  protected _hass?: HomeAssistant;
  protected _config?: EntitiesCardConfig;
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

  static get properties(): PropertyDeclarations {
    return {
      _config: {},
    };
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
      ${this.renderStyle()}
      <ha-card>
        ${!title && !show_header_toggle
          ? html``
          : html`
              <div class="header">
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

  private renderStyle(): TemplateResult {
    return html`
      <style>
        ha-card {
          padding: 16px;
        }
        #states {
          margin: -4px 0;
        }
        #states > * {
          margin: 8px 0;
        }
        #states > div > * {
          overflow: hidden;
        }
        .header {
          @apply --paper-font-headline;
          /* overwriting line-height +8 because entity-toggle can be 40px height,
            compensating this with reduced padding */
          line-height: 40px;
          color: var(--primary-text-color);
          padding: 4px 0 12px;
          display: flex;
          justify-content: space-between;
        }
        .header .name {
          @apply --paper-font-common-nowrap;
        }
        .state-card-dialog {
          cursor: pointer;
        }
      </style>
    `;
  }

  private renderEntity(entityConf: EntitiesCardEntityConfig): TemplateResult {
    const element = createRowElement(entityConf);
    if (this._hass) {
      element.hass = this._hass;
    }

    if (
      ((!entityConf.tap_action ||
        entityConf.tap_action.action === "more-info") &&
        !DOMAINS_HIDE_MORE_INFO.includes(computeDomain(entityConf.entity))) ||
      (entityConf.tap_action && entityConf.tap_action.action !== "none")
    ) {
      element.classList.add("state-card-dialog");
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
