import type { ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { consume } from "../../../../common/decorators/consume";
import type { HASSDomCurrentTargetEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import "../../../../components/ha-state-icon";
import {
  entitiesContext,
  formattersContext,
  statesContext,
} from "../../../../data/context";
import { UNAVAILABLE } from "../../../../data/entity/entity";
import { showMoreInfoDialog } from "../../show-ha-more-info-dialog";

/**
 * Shows what the camera detects, like motion, people, animals or a crying
 * baby: the binary sensors of its device.
 */
@customElement("ha-more-info-camera-sensors")
export class HaMoreInfoCameraSensors extends LitElement {
  @state()
  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: ContextType<typeof formattersContext>;

  @property({ attribute: false }) public deviceId?: string;

  private _sensorIds = memoizeOne(
    (
      deviceId: string | undefined,
      entities: ContextType<typeof entitiesContext>
    ): string[] =>
      deviceId
        ? Object.values(entities)
            .filter(
              (entity) =>
                entity.device_id === deviceId &&
                computeDomain(entity.entity_id) === "binary_sensor" &&
                !entity.entity_category &&
                !entity.hidden
            )
            .map((entity) => entity.entity_id)
        : []
  );

  protected render() {
    const sensors = this._sensorIds(this.deviceId, this._entities)
      .map((entityId) => this._states[entityId])
      .filter((stateObj): stateObj is HassEntity => Boolean(stateObj));
    if (!sensors.length) {
      return nothing;
    }
    return html`
      <div class="sensors">
        ${sensors.map((stateObj) => {
          const active = stateObj.state === "on";
          // Without its own name, an entity is named after the device
          const name =
            this._formatters.formatEntityName(stateObj, { type: "entity" }) ||
            this._formatters.formatEntityName(stateObj);
          return html`
            <button
              type="button"
              class=${classMap({
                sensor: true,
                active,
                unavailable: stateObj.state === UNAVAILABLE,
              })}
              title=${`${name}: ${this._formatters.formatEntityState(stateObj)}`}
              data-entity-id=${stateObj.entity_id}
              @click=${this._showMoreInfo}
            >
              <ha-state-icon .stateObj=${stateObj}></ha-state-icon>
              <span>${name}</span>
            </button>
          `;
        })}
      </div>
    `;
  }

  private _showMoreInfo(ev: HASSDomCurrentTargetEvent<HTMLButtonElement>) {
    showMoreInfoDialog(this, { entityId: ev.currentTarget.dataset.entityId! });
  }

  static styles = css`
    :host {
      display: block;
    }

    .sensors {
      display: flex;
      margin-top: var(--ha-space-4);
      gap: var(--ha-space-2);
      overflow-x: auto;
      padding: 0 var(--ha-space-4);
      scrollbar-width: none;
    }

    .sensor {
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: var(--ha-space-1);
      height: 32px;
      padding-inline: var(--ha-space-2) var(--ha-space-3);
      border: none;
      border-radius: var(--ha-border-radius-pill);
      background-color: var(--ha-color-fill-neutral-quiet-resting);
      color: var(--secondary-text-color);
      font-family: inherit;
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-medium);
      cursor: pointer;
      transition:
        background-color var(--ha-animation-duration-normal, 250ms) ease-in-out,
        color var(--ha-animation-duration-normal, 250ms) ease-in-out;
    }

    .sensor:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }

    .sensor.active {
      background-color: var(--ha-color-fill-warning-quiet-resting);
      color: var(--ha-color-on-warning-quiet);
    }

    .sensor.unavailable {
      opacity: 0.5;
    }

    ha-state-icon {
      --mdc-icon-size: 18px;
    }

    @media (prefers-reduced-motion: reduce) {
      .sensor {
        transition: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-camera-sensors": HaMoreInfoCameraSensors;
  }
}
