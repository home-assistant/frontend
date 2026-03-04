import {
  mdiLock,
  mdiLockOpen,
  mdiLockAlert,
  mdiAlertCircle,
  mdiKeyAlert,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../../components/ha-expansion-panel";
import "../../../../../../components/ha-svg-icon";
import type { DeviceRegistryEntry } from "../../../../../../data/device/device_registry";
import { haStyle } from "../../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../../types";

interface LockEvent {
  event_type: string;
  timestamp: Date;
  description: string;
}

const EVENT_ICONS: Record<string, string> = {
  lock: mdiLock,
  unlock: mdiLockOpen,
  lock_jammed: mdiLockAlert,
  lock_failure: mdiAlertCircle,
  invalid_pin: mdiKeyAlert,
};

@customElement("ha-device-info-matter-lock")
export class HaDeviceInfoMatterLock extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @state() private _events: LockEvent[] = [];

  @state() private _lockEntityId?: string;

  @state() private _isLock = false;

  private _prevLockState?: HassEntity;

  private _eventEntityIds?: string[];

  public willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties);
    if (changedProperties.has("device")) {
      this._findLockEntity();
    }
    if (changedProperties.has("hass") && this._lockEntityId) {
      const currentState = this.hass.states[this._lockEntityId];
      if (currentState !== this._prevLockState) {
        this._prevLockState = currentState;
        this._updateEvents();
      }
    }
  }

  private _findLockEntity(): void {
    if (!this.hass || !this.device) {
      return;
    }

    const entities = Object.values(this.hass.entities || {});
    const lockEntity = entities.find(
      (entity) =>
        entity.device_id === this.device.id &&
        entity.entity_id.startsWith("lock.")
    );

    this._lockEntityId = lockEntity?.entity_id;
    this._isLock = !!this._lockEntityId;

    // Cache event entity IDs for this device so we don't search on every update
    this._eventEntityIds = entities
      .filter(
        (entity) =>
          entity.device_id === this.device.id &&
          entity.entity_id.startsWith("event.")
      )
      .map((entity) => entity.entity_id);
  }

  private _updateEvents(): void {
    if (!this._lockEntityId || !this.hass.states[this._lockEntityId]) {
      return;
    }

    const lockState: HassEntity = this.hass.states[this._lockEntityId];
    const events: LockEvent[] = [];

    // Add current state as most recent event
    if (lockState.state === "locked") {
      events.push({
        event_type: "lock",
        timestamp: new Date(lockState.last_changed),
        description: this.hass.localize(
          "ui.panel.config.matter.lock.events.types.lock"
        ),
      });
    } else if (lockState.state === "unlocked") {
      events.push({
        event_type: "unlock",
        timestamp: new Date(lockState.last_changed),
        description: this.hass.localize(
          "ui.panel.config.matter.lock.events.types.unlock"
        ),
      });
    } else if (lockState.state === "jammed") {
      events.push({
        event_type: "lock_jammed",
        timestamp: new Date(lockState.last_changed),
        description: this.hass.localize(
          "ui.panel.config.matter.lock.events.types.lock_jammed"
        ),
      });
    }

    // Use cached event entity IDs instead of searching all entities
    for (const entityId of this._eventEntityIds || []) {
      const eventState = this.hass.states[entityId];
      if (eventState && eventState.attributes.event_type) {
        const eventType = eventState.attributes.event_type as string;
        if (EVENT_ICONS[eventType]) {
          events.push({
            event_type: eventType,
            timestamp: new Date(eventState.last_changed),
            description:
              this.hass.localize(
                `ui.panel.config.matter.lock.events.types.${eventType}`
              ) || eventType,
          });
        }
      }
    }

    // Sort by timestamp descending and take the first 10
    this._events = events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }

  protected render() {
    if (!this._isLock) {
      return nothing;
    }

    return html`
      <ha-expansion-panel
        .header=${this.hass.localize(
          "ui.panel.config.matter.lock.events.title"
        )}
      >
        ${this._events.length === 0
          ? html`<p class="empty">
              ${this.hass.localize(
                "ui.panel.config.matter.lock.events.no_events"
              )}
            </p>`
          : html`
              <div class="events-list">
                ${this._events.map(
                  (event) => html`
                    <div class="event-row">
                      <ha-svg-icon
                        .path=${EVENT_ICONS[event.event_type] || mdiLock}
                      ></ha-svg-icon>
                      <div class="event-details">
                        <span class="event-description"
                          >${event.description}</span
                        >
                        <span class="event-time">
                          ${this._formatTime(event.timestamp)}
                        </span>
                      </div>
                    </div>
                  `
                )}
              </div>
            `}
      </ha-expansion-panel>
    `;
  }

  private _formatTime(date: Date): string {
    return date.toLocaleString(this.hass.locale.language, {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-expansion-panel {
          margin: 8px -16px 0;
          --expansion-panel-summary-padding: 0 16px;
          --expansion-panel-content-padding: 0 16px;
          --ha-card-border-radius: var(--ha-border-radius-square);
        }
        .empty {
          text-align: center;
          color: var(--secondary-text-color);
          padding: 16px;
        }
        .events-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 8px 0;
        }
        .event-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .event-row ha-svg-icon {
          color: var(--secondary-text-color);
          --mdc-icon-size: 20px;
        }
        .event-details {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .event-description {
          font-weight: 500;
        }
        .event-time {
          font-size: 0.875em;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-info-matter-lock": HaDeviceInfoMatterLock;
  }
}
