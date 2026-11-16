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
 * baby: the binary sensors of its device, as a row of icons.
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
          const label = `${name}: ${this._formatters.formatEntityState(stateObj)}`;
          return html`
            <button
              type="button"
              class=${classMap({
                sensor: true,
                active,
                unavailable: stateObj.state === UNAVAILABLE,
              })}
              title=${label}
              aria-label=${label}
              data-entity-id=${stateObj.entity_id}
              @click=${this._showMoreInfo}
            >
              <ha-state-icon .stateObj=${stateObj}></ha-state-icon>
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
      gap: var(--ha-space-2);
      padding: var(--ha-space-2) var(--ha-space-4);
      overflow-x: auto;
      scrollbar-width: none;
    }

    .sensor {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      padding: 0;
      border: none;
      border-radius: var(--ha-border-radius-circle);
      background-color: var(--ha-color-fill-neutral-quiet-resting);
      color: var(--secondary-text-color);
      cursor: pointer;
      transition:
        background-color var(--ha-animation-duration-normal, 250ms) ease-in-out,
        color var(--ha-animation-duration-normal, 250ms) ease-in-out;
    }

    .sensor:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }

    /* What the camera detects right now */
    .sensor.active {
      background-color: var(--ha-color-fill-warning-quiet-resting);
      color: var(--ha-color-on-warning-quiet);
    }

    .sensor.unavailable ha-state-icon {
      opacity: 0.5;
    }

    ha-state-icon {
      --mdc-icon-size: 20px;
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
