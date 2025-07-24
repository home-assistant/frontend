import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HomeAssistant } from "../../../types";
import "../../../components/ha-card";
import "../../../components/ha-icon";

interface ActiveEntity {
  entity_id: string;
  state: string;
  domain: string;
  name: string;
  icon?: string;
  last_changed?: string;
}

@customElement("hui-active-alerts-card")
export class HuiActiveAlertsCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _entities: ActiveEntity[] = [];

  private _config: any;

  private _unsubscribe?: () => void;

  setConfig(config: any) {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = {
      title: config.title || "",
      entities: config.entities || [],
    };
    this._updateEntities();
  }

  async connectedCallback() {
    super.connectedCallback();
    await this._subscribe();
    this._updateEntities();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = undefined;
    }
  }

  hassChanged(_hass: HomeAssistant) {
    this._updateEntities();
  }

  private async _subscribe() {
    if (!this.hass) return;
    this._unsubscribe = await this.hass.connection.subscribeEvents(() => {
      this._updateEntities();
    }, "state_changed");
  }

  private _updateEntities() {
    if (!this.hass) return;
    const entities: ActiveEntity[] = [];
    const targetEntities =
      this._config && this._config.entities && this._config.entities.length > 0
        ? this._config.entities
        : Object.keys(this.hass.states).filter(
            (entity_id) => entity_id.split(".")[0] === "alert"
          );
    for (const entity_id of targetEntities) {
      const stateObj = this.hass.states[entity_id];
      if (stateObj) {
        const domain = entity_id.split(".")[0];
        if (domain === "alert" && stateObj.state === "on") {
          entities.push({
            entity_id,
            state: stateObj.state,
            domain,
            name: stateObj.attributes.friendly_name || entity_id,
            icon: stateObj.attributes.icon,
            last_changed: stateObj.last_changed,
          });
        }
      }
    }
    this._entities = entities;
  }

  private async _dismissByEvent(e: Event) {
    const entityId = (e.currentTarget as HTMLElement).getAttribute(
      "data-entity-id"
    );
    const entity = this._entities.find((ent) => ent.entity_id === entityId);
    if (!entity) return;
    await this.hass.callService("alert", "turn_off", {
      entity_id: entity.entity_id,
    });
    setTimeout(() => this._updateEntities(), 1000);
  }

  render() {
    return html`
      <ha-card>
        <div class="card-header">Active Alerts & Sensors</div>
        <div class="entity-list">
          ${this._entities.length === 0
            ? html`<span>No active alerts or sensors</span>`
            : this._entities.map(
                (entity) => html`
                  <div class="entity-row">
                    <ha-icon
                      .icon=${entity.icon ||
                      (entity.domain === "alert"
                        ? "mdi:alert"
                        : "mdi:alert-octagon")}
                    ></ha-icon>
                    <span class="entity-name">${entity.name}</span>
                    <span class="entity-timestamp">
                      ${entity.last_changed
                        ? new Date(entity.last_changed).toLocaleString()
                        : ""}
                    </span>
                    <button
                      class="dismiss"
                      data-entity-id=${entity.entity_id}
                      @click=${this._dismissByEvent}
                    >
                      Dismiss
                    </button>
                  </div>
                `
              )}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    .card-header {
      padding: 16px;
      font-size: 18px;
      color: var(--primary-text-color);
    }
    ha-card {
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
      border-radius: var(--ha-card-border-radius, 12px);
    }
    .entity-list {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .entity-row {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(
        --chip-background,
        var(--secondary-background-color, #eee)
      );
      border-radius: var(--ha-card-border-radius, 12px);
      padding: 4px 12px;
    }
    .entity-name {
      font-weight: 500;
      flex: 1;
      color: var(--primary-text-color);
    }
    .entity-timestamp {
      color: var(--secondary-text-color);
      font-size: 12px;
      margin-right: 8px;
    }
    .dismiss {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border: none;
      border-radius: 6px;
      cursor: pointer;
      padding: 4px 12px;
      font-size: 14px;
      transition:
        background 0.2s,
        color 0.2s;
    }
    .dismiss:hover {
      opacity: 0.9;
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
  `;

  static getConfigElement() {
    return document.createElement("hui-active-alerts-card-editor");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-active-alerts-card": HuiActiveAlertsCard;
  }
}
