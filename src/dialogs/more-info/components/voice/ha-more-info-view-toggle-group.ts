import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeStateDomain } from "../../../../common/entity/compute_state_domain";
import { computeGroupEntitiesState } from "../../../../common/entity/group_entities";
import "../../../../components/ha-control-button";
import "../../../../components/ha-control-button-group";
import "../../../../components/ha-domain-icon";
import { isFullyClosed, isFullyOpen } from "../../../../data/cover";
import { OFF, ON, UNAVAILABLE } from "../../../../data/entity";
import { forwardHaptic } from "../../../../data/haptics";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import type { TileCardConfig } from "../../../../panels/lovelace/cards/types";
import "../../../../panels/lovelace/sections/hui-section";
import type { HomeAssistant } from "../../../../types";
import "../ha-more-info-state-header";

export interface GroupToggleDialogParams {
  entityIds: string[];
}

@customElement("ha-more-info-view-toggle-group")
class HaMoreInfoViewToggleGroup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public params?: GroupToggleDialogParams;

  private _sectionConfig = memoizeOne(
    (entities: string[]): LovelaceSectionConfig => ({
      type: "grid",
      cards: entities.map<TileCardConfig>((entity) => ({
        type: "tile",
        entity: entity,
        icon_tap_action: {
          action: "toggle",
        },
        tap_action: {
          action: "more-info",
        },
        grid_options: {
          columns: 12,
        },
      })),
    })
  );

  protected render() {
    if (!this.params) {
      return nothing;
    }

    const sectionConfig = this._sectionConfig(this.params.entityIds);

    const entities = this.params.entityIds
      .map((entityId) => this.hass!.states[entityId] as HassEntity | undefined)
      .filter((v): v is HassEntity => Boolean(v));

    const mainStateObj = entities[0];

    const groupState = computeGroupEntitiesState(entities);
    const formattedGroupState = this.hass.formatEntityState(
      mainStateObj,
      groupState
    );

    const domain = computeStateDomain(mainStateObj);

    const deviceClass = mainStateObj.attributes.device_class;

    const availableEntities = entities.filter(
      (entity) => entity.state !== UNAVAILABLE
    );

    const ON_STATE = domain === "cover" ? "open" : ON;
    const OFF_STATE = domain === "cover" ? "closed" : OFF;

    const isAllOn = availableEntities.every((entity) =>
      computeDomain(entity.entity_id) === "cover"
        ? isFullyOpen(entity)
        : entity.state === ON_STATE
    );
    const isAllOff = availableEntities.every((entity) =>
      computeDomain(entity.entity_id) === "cover"
        ? isFullyClosed(entity)
        : entity.state === OFF_STATE
    );

    const isMultiple = this.params.entityIds.length > 1;

    return html`
      <div class="content">
        <ha-more-info-state-header
          .hass=${this.hass}
          .stateObj=${mainStateObj}
          .stateOverride=${formattedGroupState}
        ></ha-more-info-state-header>
        <ha-control-button-group vertical>
          <ha-control-button
            vertical
            @click=${this._turnAllOn}
            .disabled=${isAllOn}
          >
            <ha-domain-icon
              .hass=${this.hass}
              .domain=${domain}
              .state=${ON_STATE}
              .deviceClass=${deviceClass}
            ></ha-domain-icon>
            <p>
              ${domain === "cover"
                ? isMultiple
                  ? this.hass.localize("ui.card.cover.open_all")
                  : this.hass.localize("ui.card.cover.open")
                : isMultiple
                  ? this.hass.localize("ui.card.common.turn_on_all")
                  : this.hass.localize("ui.card.common.turn_on")}
            </p>
          </ha-control-button>
          <ha-control-button
            vertical
            @click=${this._turnAllOff}
            .disabled=${isAllOff}
          >
            <ha-domain-icon
              .hass=${this.hass}
              .domain=${domain}
              .state=${OFF_STATE}
              .icon=${domain === "light" ? "mdi:lightbulb-off" : undefined}
            ></ha-domain-icon>

            <p>
              ${domain === "cover"
                ? isMultiple
                  ? this.hass.localize("ui.card.cover.close_all")
                  : this.hass.localize("ui.card.cover.close")
                : isMultiple
                  ? this.hass.localize("ui.card.common.turn_off_all")
                  : this.hass.localize("ui.card.common.turn_off")}
            </p>
          </ha-control-button>
        </ha-control-button-group>
        <hui-section .config=${sectionConfig} .hass=${this.hass}></hui-section>
      </div>
    `;
  }

  private _turnAllOff() {
    if (!this.params) {
      return;
    }

    forwardHaptic("light");
    const domain = computeDomain(this.params.entityIds[0]);
    if (domain === "cover") {
      this.hass.callService("cover", "close_cover", {
        entity_id: this.params.entityIds,
      });
      return;
    }
    this.hass.callService("homeassistant", "turn_off", {
      entity_id: this.params.entityIds,
    });
  }

  private _turnAllOn() {
    if (!this.params) {
      return;
    }

    forwardHaptic("light");
    const domain = computeDomain(this.params.entityIds[0]);
    if (domain === "cover") {
      this.hass.callService("cover", "open_cover", {
        entity_id: this.params.entityIds,
      });
      return;
    }
    this.hass.callService("homeassistant", "turn_on", {
      entity_id: this.params.entityIds,
    });
  }

  static styles = [
    css`
      .content {
        padding: 24px;
        padding-bottom: max(var(--safe-area-inset-bottom), 24px);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
      }
      ha-control-button-group {
        --control-button-group-spacing: 12px;
        --control-button-group-thickness: 130px;
        margin-bottom: 32px;
      }
      ha-control-button {
        --control-button-border-radius: 16px;
        --mdc-icon-size: 24px;
        --control-button-padding: 16px 8px;
        --control-button-background-opacity: 0.1;
      }
      ha-control-button p {
        margin: 0;
      }
      hui-section {
        width: 100%;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-view-toggle-group": HaMoreInfoViewToggleGroup;
  }
}
