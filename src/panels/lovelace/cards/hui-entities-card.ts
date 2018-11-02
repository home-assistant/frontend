import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
} from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "../../../components/ha-card.js";
import "../components/hui-entities-toggle.js";

import { fireEvent } from "../../../common/dom/fire_event.js";
import { DOMAINS_HIDE_MORE_INFO } from "../../../common/const.js";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { LovelaceCard, LovelaceConfig } from "../types.js";
import createRowElement from "../common/create-row-element.js";
import computeDomain from "../../../common/entity/compute_domain.js";
import processConfigEntities from "../common/process-config-entities";
import { HomeAssistant } from "../../../types.js";
import { EntityConfig, EntityRow } from "../entity-rows/types.js";
import applyThemesOnElement from "../../../common/dom/apply_themes_on_element";

interface ConfigEntity extends EntityConfig {
  type?: string;
  secondary_info: "entity-id" | "last-changed";
  action_name?: string;
  service?: string;
  service_data?: object;
  url?: string;
}

interface Config extends LovelaceConfig {
  show_header_toggle?: boolean;
  title?: string;
  entities: ConfigEntity[];
  theme?: string;
}

class HuiEntitiesCard extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
  protected _hass?: HomeAssistant;
  protected _config?: Config;
  protected _configEntities?: ConfigEntity[];

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

  public setConfig(config: Config): void {
    const entities = processConfigEntities(config.entities);
    for (const entity of entities) {
      if (
        entity.type === "call-service" &&
        (!entity.service ||
          !entity.name ||
          !entity.icon ||
          !entity.service_data ||
          !entity.action_name)
      ) {
        throw new Error("Missing required property when type is call-service");
      } else if (
        entity.type === "weblink" &&
        (!entity.name || !entity.icon || !entity.url)
      ) {
        throw new Error("Missing required property when type is weblink");
      }
    }

    this._config = config;
    this._configEntities = entities;
  }

  protected updated(_changedProperties: PropertyValues): void {
    if (this._hass && this._config) {
      applyThemesOnElement(this, this._hass.themes, this._config.theme);
    }
  }

  protected render(): TemplateResult {
    if (!this._config || !this._hass) {
      return html``;
    }
    const { show_header_toggle, title } = this._config;

    return html`
      ${this.renderStyle()}
      <ha-card>
        ${
          !title && !show_header_toggle
            ? html``
            : html`
            <div class='header'>
              <div class="name">${title}</div>
              ${
                show_header_toggle === false
                  ? html``
                  : html`
                  <hui-entities-toggle
                    .hass="${this._hass}"
                    .entities="${this._configEntities!.map(
                      (conf) => conf.entity
                    )}"
                  ></hui-entities-toggle>`
              }
            </div>`
        }
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
          margin: 4px 0;
        }
        #states > * {
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

  private renderEntity(entityConf: ConfigEntity): TemplateResult {
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

    return element;
  }

  private _handleClick(entityConf: ConfigEntity): void {
    const entityId = entityConf.entity;
    fireEvent(this, "hass-more-info", { entityId });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entities-card": HuiEntitiesCard;
  }
}

customElements.define("hui-entities-card", HuiEntitiesCard);
