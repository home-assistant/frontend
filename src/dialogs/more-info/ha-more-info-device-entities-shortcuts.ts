import { mdiDevices } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { SENSOR_ENTITIES } from "../../common/const";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateDisplay } from "../../common/entity/compute_state_display";
import { navigate } from "../../common/navigate";
import { groupBy } from "../../common/util/group-by";
import "../../components/ha-target-chip";
import { computeDeviceName } from "../../data/device_registry";
import { isUnavailableState } from "../../data/entity";
import { EntityRegistryEntry } from "../../data/entity_registry";
import { EntityRegistryStateEntry } from "../../panels/config/devices/ha-config-device-page";
import { HomeAssistant } from "../../types";

@customElement("ha-more-info-device-entities-shortcuts")
class MoreInfoDevicesEntitiesShortcuts extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  private _deviceEntityEntries = memoizeOne((deviceId: string) => {
    if (!deviceId) return [];

    return Object.values(this.hass!.entities).filter(
      (entity) =>
        entity.device_id === deviceId &&
        !entity.hidden_by &&
        !entity.disabled_by &&
        !entity.entity_category
    );
  });

  private _handleChipClick(ev) {
    if (ev.defaultPrevented) {
      return;
    }
    if (ev.type === "keydown" && ev.key !== "Enter" && ev.key !== " ") {
      return;
    }
    const entityId = (ev.target as any).id as string;
    fireEvent(this, "shortcut-clicked", { entityId });
  }

  private _handleDeviceChipClick(ev) {
    if (ev.defaultPrevented) {
      return;
    }
    if (ev.type === "keydown" && ev.key !== "Enter" && ev.key !== " ") {
      return;
    }
    const deviceId = (ev.target as any).id as string;
    fireEvent(this, "hass-more-info", { entityId: null });
    navigate(`/config/devices/device/${deviceId}`);
  }

  protected render(): TemplateResult | null {
    if (!this.hass || !this.stateObj) {
      return null;
    }
    const deviceId = this.hass!.entities[this.stateObj.entity_id].device_id;

    if (!deviceId) {
      return null;
    }

    const deviceEntities = this._deviceEntityEntries(deviceId).filter(
      (entry) => this.hass!.states[entry.entity_id]
    );

    let displayedEntities = deviceEntities.filter(
      (entity) => entity.entity_id !== this.stateObj!.entity_id
    );

    // Do not display device entities if the current entity is not inside
    if (
      !displayedEntities.length ||
      displayedEntities.length === deviceEntities.length
    ) {
      return null;
    }

    if (displayedEntities.length > 3) {
      const result = groupBy(displayedEntities, (entry) =>
        entry.entity_category
          ? entry.entity_category
          : SENSOR_ENTITIES.includes(computeDomain(entry.entity_id))
          ? "sensor"
          : "control"
      ) as Record<
        | "control"
        | "sensor"
        | NonNullable<EntityRegistryEntry["entity_category"]>,
        EntityRegistryStateEntry[]
      >;

      if (result.control?.length > 3) {
        displayedEntities = result.control.slice(0, 3);
      } else {
        displayedEntities = (result.control || [])
          .concat(result.sensor)
          .slice(0, 3);
      }
    }

    return html`
      <div class="container">
        ${displayedEntities.map((entry) => {
          const stateObj = this.hass!.states[entry.entity_id];

          const iconPath = "";

          const state = computeStateDisplay(
            this.hass!.localize,
            stateObj,
            this.hass!.locale,
            this.hass!.entities
          );

          const name = stateObj.attributes.friendly_name ?? "";

          return html`
            <ha-target-chip
              @click=${this._handleChipClick}
              @keydown=${this._handleChipClick}
              .entityState=${stateObj}
              .iconPath=${iconPath}
              type="entity_id"
              .id=${stateObj.entity_id}
              aria-label=${name}
              .title=${name}
              .name=${isUnavailableState(stateObj.state) ? name : state}
            >
            </ha-target-chip>
          `;
        })}
        <ha-target-chip
          @click=${this._handleDeviceChipClick}
          @keydown=${this._handleDeviceChipClick}
          .iconPath=${mdiDevices}
          type="device_id"
          .id=${deviceId}
          .name=${computeDeviceName(
            this.hass.devices[deviceId],
            this.hass,
            deviceEntities
          )}
        >
        </ha-target-chip>
      </div>
    `;
  }

  static get styles() {
    return css`
      .container {
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: row;
        flex-wrap: wrap;
      }
      .container > * {
        margin: 4px;
      }
    `;
  }
}

declare global {
  interface HASSDomEvents {
    "shortcut-clicked": { entityId: string };
  }
  interface HTMLElementTagNameMap {
    "ha-more-info-device-entities-shortcuts": MoreInfoDevicesEntitiesShortcuts;
  }
}
