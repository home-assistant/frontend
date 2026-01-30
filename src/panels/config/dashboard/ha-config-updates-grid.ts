import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../../../common/entity/compute_device_name";
import { getDeviceContext } from "../../../common/entity/context/get_device_context";
import "../../../components/chips/ha-assist-chip";
import "../../../components/entity/state-badge";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-progress-ring";
import "../../../components/ha-spinner";
import type { DeviceRegistryEntry } from "../../../data/device/device_registry";
import { subscribeDeviceRegistry } from "../../../data/device/device_registry";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import { subscribeEntityRegistry } from "../../../data/entity/entity_registry";
import type { UpdateEntity } from "../../../data/update";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";
import { supervisorAppsStyle } from "../apps/resources/supervisor-apps-style";

interface UpdateCardTarget extends HTMLElement {
  entityId?: string;
}

@customElement("ha-config-updates-grid")
class HaConfigUpdatesGrid extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public updateEntities?: UpdateEntity[];

  @property({ type: Number }) public total?: number;

  @property({ attribute: false }) public isInstallable = true;

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

  private _renderUpdateProgress(entity: UpdateEntity) {
    if (entity.attributes.update_percentage != null) {
      return html`<ha-progress-ring
        size="small"
        .value=${entity.attributes.update_percentage}
        .label=${this.hass.localize(
          "ui.panel.config.updates.update_in_progress"
        )}
      ></ha-progress-ring>`;
    }

    if (entity.attributes.in_progress) {
      return html`<ha-spinner
        size="small"
        .ariaLabel=${this.hass.localize(
          "ui.panel.config.updates.update_in_progress"
        )}
      ></ha-spinner>`;
    }

    return html`<ha-icon-next></ha-icon-next>`;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.updateEntities?.length) {
      return nothing;
    }

    const updates = this.updateEntities;
    const total = this.total ?? updates.length;
    const moreUpdates = total - updates.length;
    const title = this.isInstallable
      ? this.hass.localize("ui.panel.config.updates.title", {
          count: total,
        })
      : this.hass.localize("ui.panel.config.updates.title_not_installable", {
          count: total,
        });

    return html`
      <div class="content">
        <h2 class="heading">${title}</h2>
        <div class="card-group">
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
              <ha-card
                outlined
                class="update-card"
                .entityId=${entity.entity_id}
                tabindex="0"
                role="button"
                @click=${this._openMoreInfo}
                @keydown=${this._handleKeyDown}
              >
                <div class="card-content">
                  <div class="badge">
                    <state-badge
                      .title=${entity.attributes.title ||
                      entity.attributes.friendly_name}
                      .hass=${this.hass}
                      .stateObj=${entity}
                      class=${ifDefined(
                        entity.attributes.in_progress ? "updating" : undefined
                      )}
                    ></state-badge>
                    ${this.narrow && entity.attributes.in_progress
                      ? html`<div class="badge-progress">
                          ${this._renderUpdateProgress(entity)}
                        </div>`
                      : nothing}
                  </div>
                  <div class="text">
                    <div class="card-title">
                      ${deviceEntry
                        ? computeDeviceNameDisplay(deviceEntry, this.hass)
                        : entity.attributes.friendly_name}
                    </div>
                    <div class="card-description">
                      ${areaName ? html`${areaName} ⸱ ` : nothing}
                      ${entity.attributes.title}
                      ${entity.attributes.latest_version}
                      ${entity.attributes.skipped_version
                        ? `(${this.hass.localize(
                            "ui.panel.config.updates.skipped"
                          )})`
                        : nothing}
                    </div>
                  </div>
                  ${!this.narrow
                    ? html`<div class="end">
                        ${this._renderUpdateProgress(entity)}
                      </div>`
                    : nothing}
                </div>
              </ha-card>
            `;
          })}
        </div>
        ${moreUpdates > 0
          ? html`
              <ha-assist-chip
                class="more-updates"
                href="/config/updates"
                .label=${this.hass.localize(
                  "ui.panel.config.updates.more_updates",
                  {
                    count: moreUpdates,
                  }
                )}
              ></ha-assist-chip>
            `
          : nothing}
      </div>
    `;
  }

  private _handleKeyDown(ev: KeyboardEvent) {
    if (ev.key !== "Enter" && ev.key !== " ") {
      return;
    }
    ev.preventDefault();
    this._openMoreInfo(ev);
  }

  private _openMoreInfo(ev: Event): void {
    fireEvent(this, "hass-more-info", {
      entityId: (ev.currentTarget as UpdateCardTarget).entityId ?? null,
    });
  }

  static get styles(): CSSResultGroup[] {
    return [
      supervisorAppsStyle,
      css`
        :host {
          display: block;
        }

        .heading {
          font-size: var(--ha-font-size-2xl);
          margin-bottom: var(--ha-space-2);
          font-family: var(--ha-font-family-body);
          -webkit-font-smoothing: var(--ha-font-smoothing);
          -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          padding-left: var(--ha-space-2);
          padding-inline-start: var(--ha-space-2);
          padding-inline-end: initial;
        }

        .card-group {
          grid-template-columns: repeat(auto-fit, minmax(300px, 300px));
          justify-content: start;
        }

        @media (max-width: 623px) {
          .heading {
            text-align: center;
            padding-left: 0;
            padding-inline-start: 0;
          }
          .card-group {
            justify-content: center;
          }
        }

        ha-card {
          cursor: pointer;
          overflow: hidden;
        }

        .card-content {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: var(--ha-space-3);
          padding: var(--ha-space-4);
          align-items: center;
        }

        .text {
          min-width: 0;
        }

        .card-title {
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
          color: var(--primary-text-color);
          line-height: var(--ha-line-height-condensed);
        }

        .card-description {
          color: var(--secondary-text-color);
          line-height: var(--ha-line-height-condensed);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        ha-icon-next {
          color: var(--secondary-text-color);
          height: 24px;
          width: 24px;
        }

        .badge {
          position: relative;
        }

        .badge-progress {
          position: absolute;
          left: 6px;
          top: 6px;
        }

        state-badge.updating {
          opacity: 0.2;
        }

        .more-updates {
          margin: var(--ha-space-2);
          margin-top: var(--ha-space-3);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-updates-grid": HaConfigUpdatesGrid;
  }
}
