import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../../../common/entity/compute_device_name";
import { getDeviceContext } from "../../../common/entity/context/get_device_context";
import "../../../components/entity/state-badge";
import "../../../components/ha-alert";
import "../../../components/ha-icon-next";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import "../../../components/ha-spinner";
import type { DeviceRegistryEntry } from "../../../data/device_registry";
import { subscribeDeviceRegistry } from "../../../data/device_registry";
import type { EntityRegistryEntry } from "../../../data/entity_registry";
import { subscribeEntityRegistry } from "../../../data/entity_registry";
import type { UpdateEntity } from "../../../data/update";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";

@customElement("ha-config-updates")
class HaConfigUpdates extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public updateEntities?: UpdateEntity[];

  @property({ type: Number }) public total?: number;

  @state() private _devices?: DeviceRegistryEntry[];

  @state() private _entities?: EntityRegistryEntry[];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeDeviceRegistry(this.hass.connection, (entries) => {
        this._devices = entries;
      }),
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entities = entities.filter((entity) => entity.device_id !== null);
      }),
    ];
  }

  private getDeviceEntry = memoizeOne(
    (deviceId: string): DeviceRegistryEntry | undefined =>
      this._devices?.find((device) => device.id === deviceId)
  );

  private getEntityEntry = memoizeOne(
    (entityId: string): EntityRegistryEntry | undefined =>
      this._entities?.find((entity) => entity.entity_id === entityId)
  );

  protected render() {
    if (!this.updateEntities?.length) {
      return nothing;
    }

    const updates = this.updateEntities;

    return html`
      <div class="title" role="heading" aria-level="2">
        ${this.hass.localize("ui.panel.config.updates.title", {
          count: this.total || this.updateEntities.length,
        })}
      </div>
      <ha-md-list>
        ${updates.map((entity) => {
          const entityEntry = this.getEntityEntry(entity.entity_id);
          const deviceEntry =
            entityEntry && entityEntry.device_id
              ? this.getDeviceEntry(entityEntry.device_id)
              : undefined;

          const areaName =
            deviceEntry && deviceEntry.entry_type !== "service"
              ? getDeviceContext(deviceEntry, this.hass).area?.name ||
                this.hass.localize("ui.panel.config.updates.no_area")
              : undefined;

          return html`
            <ha-md-list-item
              class=${ifDefined(
                entity.attributes.skipped_version ? "skipped" : undefined
              )}
              .entity_id=${entity.entity_id}
              .hasMeta=${!this.narrow}
              type="button"
              @click=${this._openMoreInfo}
            >
              <div slot="start">
                <state-badge
                  .title=${entity.attributes.title ||
                  entity.attributes.friendly_name}
                  .hass=${this.hass}
                  .stateObj=${entity}
                  class=${ifDefined(
                    this.narrow && entity.attributes.in_progress
                      ? "updating"
                      : undefined
                  )}
                ></state-badge>
                ${this.narrow && entity.attributes.in_progress
                  ? html`<ha-spinner
                      class="absolute"
                      size="small"
                      .ariaLabel=${this.hass.localize(
                        "ui.panel.config.updates.update_in_progress"
                      )}
                    ></ha-spinner>`
                  : nothing}
              </div>
              <span slot="headline"
                >${deviceEntry
                  ? computeDeviceNameDisplay(deviceEntry, this.hass)
                  : entity.attributes.friendly_name}</span
              >
              <span slot="supporting-text">
                ${areaName ? html`${areaName} ⸱ ` : nothing}
                ${entity.attributes.title} ${entity.attributes.latest_version}
                ${entity.attributes.skipped_version
                  ? `(${this.hass.localize("ui.panel.config.updates.skipped")})`
                  : nothing}
              </span>
              ${!this.narrow
                ? entity.attributes.in_progress
                  ? html`<div slot="end">
                      <ha-spinner
                        size="small"
                        .ariaLabel=${this.hass.localize(
                          "ui.panel.config.updates.update_in_progress"
                        )}
                      ></ha-spinner>
                    </div>`
                  : html`<ha-icon-next slot="end"></ha-icon-next>`
                : nothing}
            </ha-md-list-item>
          `;
        })}
      </ha-md-list>
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
        .title {
          font-size: var(--ha-font-size-l);
          padding: 16px;
          padding-bottom: 0;
        }
        .skipped {
          background: var(--secondary-background-color);
        }
        ha-md-list-item {
          --md-list-item-leading-icon-size: 40px;
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
        ha-md-list-item {
          font-size: var(--ha-font-size-l);
        }
        div[slot="start"] {
          position: relative;
        }
        ha-spinner.absolute {
          position: absolute;
          left: 6px;
          top: 6px;
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
