import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeStateDisplay } from "../../common/entity/compute_state_display";
import { stateColor } from "../../common/entity/state_color";
import { stateIconPath } from "../../common/entity/state_icon_path";
import "../../components/ha-chip";
import "../../components/ha-chip-set";
import "../../components/ha-icon";
import { HomeAssistant } from "../../types";

declare global {
  interface HASSDomEvents {
    "related-entity": { entityId: string };
  }
}

@customElement("more-info-related-info")
class MoreInfoContent extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  private _relatedEntities = memoizeOne((entityId: string) => {
    const deviceId = this.hass!.entities[entityId].device_id;

    if (!deviceId) return [];

    return Object.values(this.hass!.entities).filter(
      (entity) =>
        entity.device_id === deviceId &&
        entity.entity_id !== entityId &&
        !entity.hidden_by &&
        !entity.disabled_by
    );
  });

  private _handleChipClick(ev: Event) {
    const entityId = (ev.target as any).entityId as string;
    fireEvent(this, "related-entity", { entityId });
  }

  protected render(): TemplateResult | null {
    if (!this.hass || !this.stateObj) {
      return null;
    }

    const relatedEntities = this._relatedEntities(this.stateObj.entity_id);

    return html`
      <div class="container">
        ${relatedEntities.map((entry) => {
          const entity = this.hass!.states[entry.entity_id];

          const icon = entity.attributes.icon;
          const iconPath = stateIconPath(entity);
          const state = computeStateDisplay(
            this.hass!.localize,
            entity,
            this.hass!.locale
          );
          const color = stateColor(entity);

          return html`
            <button
              type="button"
              class="chip"
              @click=${this._handleChipClick}
              .entityId=${entity.entity_id}
              .title=${entity.attributes.friendly_name}
              style=${styleMap({
                "--icon-color": color
                  ? `rgb(var(--rgb-state-${color}-color))`
                  : undefined,
              })}
            >
              ${icon
                ? html`<ha-icon slot="icon" icon=${icon}></ha-icon>`
                : html`
                    <ha-svg-icon slot="icon" path=${iconPath}></ha-svg-icon>
                  `}
              ${state}
            </button>
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
      .chip {
        border: 1px solid var(--secondary-text-color);
        border-radius: 8px;
        cursor: pointer;
        background: none;
        color: var(--primary-text-color);
        padding: 6px 16px 6px 8px;
        font-weight: 500;
        font-size: 14px;
        line-height: 20px;
        --icon-color: rgb(var(--rgb-state-default-color));
      }
      .chip ha-icon,
      .chip ha-svg-icon {
        color: var(--icon-color);
        pointer-events: none;
        --mdc-icon-size: 18px;
        color: var(--icon-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-related-info": MoreInfoContent;
  }
}
