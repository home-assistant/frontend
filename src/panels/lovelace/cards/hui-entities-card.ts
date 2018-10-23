import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";

import "../../../components/ha-card.js";
import "../components/hui-entities-toggle.js";

import { fireEvent } from "../../../common/dom/fire_event.js";
import { DOMAINS_HIDE_MORE_INFO } from "../../../common/const.js";
import { HassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { LovelaceCard, LovelaceConfig } from "../types.js";
import createRowElement from "../common/create-row-element.js";
import computeDomain from "../../../common/entity/compute_domain.js";
import processConfigEntities from "../common/process-config-entities";
import { HomeAssistant } from "../../../types.js";
import { EntityConfig, EntityRow } from "../entity-rows/types.js";

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
}

class HuiEntitiesCard extends HassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
  protected _hass?: HomeAssistant;
  protected config?: Config;
  protected configEntities?: ConfigEntity[];

  set hass(hass) {
    this._hass = hass;
    if (this.shadowRoot) {
      this.shadowRoot
        .querySelectorAll("#states > *")
        .forEach((element: unknown) => {
          (element as EntityRow).hass = hass;
        });
    }
  }

  static get properties(): PropertyDeclarations {
    return {
      config: {},
    };
  }

  public getCardSize() {
    if (!this.config) {
      return 0;
    }
    // +1 for the header
    return (this.config.title ? 1 : 0) + this.config.entities.length;
  }

  public setConfig(config: Config) {
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

    this.config = config;
    this.configEntities = entities;
  }

  protected render() {
    if (!this.config || !this._hass) {
      return html``;
    }
    const { show_header_toggle, title } = this.config;

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
                    .entities="${this.configEntities!.map(
                      (conf) => conf.entity
                    )}"
                  >
                  </hui-entities-toggle>`
              }
            </div>`
        }
        <div id="states">
          ${this.configEntities!.map((entityConf) =>
            this.renderEntity(entityConf)
          )}
        </div>
      </ha-card>
    `;
  }

  private renderStyle() {
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

  private renderEntity(entityConf) {
    const element = createRowElement(entityConf);
    element.hass = this._hass;
    element.entityConf = entityConf;
    if (
      entityConf.entity &&
      !DOMAINS_HIDE_MORE_INFO.includes(computeDomain(entityConf.entity))
    ) {
      element.classList.add("state-card-dialog");
      // element.onclick = this.handleClick;
      element.addEventListener("click", this.handleClick);
    }

    return html`
      ${element}
    `;
  }

  private handleClick(ev: MouseEvent) {
    const config = (ev.currentTarget as any).entityConf as ConfigEntity;
    const entityId = config.entity;

    fireEvent(this, "hass-more-info", { entityId });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entities-card": HuiEntitiesCard;
  }
}

customElements.define("hui-entities-card", HuiEntitiesCard);
