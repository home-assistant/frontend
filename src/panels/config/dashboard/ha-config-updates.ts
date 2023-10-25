import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/state-badge";
import "../../../components/ha-alert";
import "../../../components/ha-circular-progress";
import "../../../components/ha-icon-next";
import "../../../components/ha-list-item";
import {
  computeDeviceName,
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import type { UpdateEntity } from "../../../data/update";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";

@customElement("ha-config-updates")
class HaConfigUpdates extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false })
  public updateEntities?: UpdateEntity[];

  @property({ attribute: false, type: Array })
  private devices?: DeviceRegistryEntry[];

  @property({ attribute: false, type: Array })
  private entities?: EntityRegistryEntry[];

  @property({ type: Number })
  public total?: number;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeDeviceRegistry(this.hass.connection, (entries) => {
        this.devices = entries;
      }),
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this.entities = entities.filter((entity) => entity.device_id !== null);
      }),
    ];
  }

  private getDeviceEntry = memoizeOne(
    (deviceId: string): DeviceRegistryEntry | undefined =>
      this.devices?.find((device) => device.id === deviceId)
  );

  private getEntityEntry = memoizeOne(
    (entityId: string): EntityRegistryEntry | undefined =>
      this.entities?.find((entity) => entity.entity_id === entityId)
  );

  protected render() {
    if (!this.updateEntities?.length) {
      return nothing;
    }

    const updates = this.updateEntities;

    return html`
      <div class="title">
        ${this.hass.localize("ui.panel.config.updates.title", {
          count: this.total || this.updateEntities.length,
        })}
      </div>
      <mwc-list>
        ${updates.map((entity) => {
          const entityEntry = this.getEntityEntry(entity.entity_id);
          const deviceEntry =
            entityEntry && entityEntry.device_id
              ? this.getDeviceEntry(entityEntry.device_id)
              : undefined;

          return html`
            <ha-list-item
              twoline
              graphic="medium"
              class=${ifDefined(
                entity.attributes.skipped_version ? "skipped" : undefined
              )}
              .entity_id=${entity.entity_id}
              .hasMeta=${!this.narrow}
              @click=${this._openMoreInfo}
            >
              <state-badge
                slot="graphic"
                .title=${entity.attributes.title ||
                entity.attributes.friendly_name}
                .stateObj=${entity}
                class=${ifDefined(
                  this.narrow && entity.attributes.in_progress
                    ? "updating"
                    : undefined
                )}
              ></state-badge>
              ${this.narrow && entity.attributes.in_progress
                ? html`<ha-circular-progress
                    active
                    size="small"
                    slot="graphic"
                    class="absolute"
                  ></ha-circular-progress>`
                : ""}
              <span
                >${deviceEntry
                  ? computeDeviceName(deviceEntry, this.hass)
                  : entity.attributes.friendly_name}</span
              >
              <span slot="secondary">
                ${entity.attributes.title} ${entity.attributes.latest_version}
                ${entity.attributes.skipped_version
                  ? `(${this.hass.localize("ui.panel.config.updates.skipped")})`
                  : ""}
              </span>
              ${!this.narrow
                ? entity.attributes.in_progress
                  ? html`<ha-circular-progress
                      active
                      size="small"
                      slot="meta"
                    ></ha-circular-progress>`
                  : html`<ha-icon-next slot="meta"></ha-icon-next>`
                : ""}
            </ha-list-item>
          `;
        })}
      </mwc-list>
    `;
  }

  private _openMoreInfo(ev: MouseEvent): void {
    fireEvent(this, "hass-more-info", {
      entityId: (ev.currentTarget as any).entity_id,
    });
  }

  static get styles(): CSSResultGroup[] {
    return [
      css`
        :host {
          --mdc-list-vertical-padding: 0;
        }
        .title {
          font-size: 16px;
          padding: 16px;
          padding-bottom: 0;
        }
        .skipped {
          background: var(--secondary-background-color);
        }
        ha-list-item {
          --mdc-list-item-graphic-size: 40px;
        }
        ha-icon-next {
          color: var(--secondary-text-color);
          height: 24px;
          width: 24px;
        }
        button.show-more {
          color: var(--primary-color);
          text-align: left;
          cursor: pointer;
          background: none;
          border-width: initial;
          border-style: none;
          border-color: initial;
          border-image: initial;
          padding: 16px;
          font: inherit;
        }
        button.show-more:focus {
          outline: none;
          text-decoration: underline;
        }
        ha-list-item {
          cursor: pointer;
          font-size: 16px;
        }
        ha-circular-progress.absolute {
          position: absolute;
        }
        state-badge.updating {
          opacity: 0.5;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-updates": HaConfigUpdates;
  }
}
