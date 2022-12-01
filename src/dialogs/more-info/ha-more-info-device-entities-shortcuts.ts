import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeStateDisplay } from "../../common/entity/compute_state_display";
import { stateActive } from "../../common/entity/state_active";
import { stateColor } from "../../common/entity/state_color";
import { stateIconPath } from "../../common/entity/state_icon_path";
import "../../components/ha-chip";
import "../../components/ha-chip-set";
import "../../components/ha-icon";
import "../../components/ha-svg-icon";
import { HomeAssistant } from "../../types";

declare global {
  interface HASSDomEvents {
    "shortcut-clicked": { entityId: string };
  }
}

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
    const entityId = (ev.target as any).entityId as string;
    fireEvent(this, "shortcut-clicked", { entityId });
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

    const displayedEntities = deviceEntities.filter(
      (entity) => entity.entity_id !== this.stateObj!.entity_id
    );

    // Do not display device entities if the current entity is not inside
    if (displayedEntities.length === deviceEntities.length) {
      return null;
    }

    return html`
      <div class="container">
        ${displayedEntities.map((entry) => {
          const stateObj = this.hass!.states[entry.entity_id];

          const icon = stateObj.attributes.icon;
          const iconPath = stateIconPath(stateObj);

          const state = computeStateDisplay(
            this.hass!.localize,
            stateObj,
            this.hass!.locale,
            this.hass!.entities
          );
          const color = stateColor(stateObj);
          const active = stateActive(stateObj);

          const iconStyle = styleMap({
            "--ha-chip-icon-color":
              color && active
                ? `rgb(var(--rgb-state-${color}-color))`
                : undefined,
          });

          const name = stateObj.attributes.friendly_name ?? "";

          return html`
            <ha-chip
              outline
              role="button"
              type="button"
              @click=${this._handleChipClick}
              @keydown=${this._handleChipClick}
              .entityId=${stateObj.entity_id}
              aria-label=${name}
              .title=${name}
              style=${iconStyle}
              hasIcon
            >
              ${icon
                ? html`<ha-icon slot="icon" .icon=${icon}></ha-icon>`
                : html`
                    <ha-svg-icon slot="icon" .path=${iconPath}></ha-svg-icon>
                  `}
              ${state}
            </ha-chip>
          `;
        })}
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
      ha-chip {
        cursor: pointer;
        --ha-chip-icon-color: rgb(var(--rgb-state-default-color));
      }
      ha-chip ha-icon,
      ha-chip ha-svg-icon {
        pointer-events: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-device-entities-shortcuts": MoreInfoDevicesEntitiesShortcuts;
  }
}
