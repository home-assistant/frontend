import type { ContextType } from "@lit/context";
import { mdiAccountAlert } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { consume } from "../../../common/decorators/consume";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../../../common/entity/compute_device_name";
import { getDeviceArea } from "../../../common/entity/context/get_device_context";
import "../../../components/entity/state-badge";
import "../../../components/ha-alert";
import "../../../components/ha-icon-next";
import "../../../components/ha-spinner";
import "../../../components/ha-svg-icon";
import type { HaListItemButton } from "../../../components/item/ha-list-item-button";
import "../../../components/item/ha-list-item-button";
import "../../../components/list/ha-list-base";
import "../../../components/progress/ha-progress-ring";
import {
  areasContext,
  devicesContext,
  formattersContext,
  fullEntitiesContext,
} from "../../../data/context";
import { entityRegistryByEntityId } from "../../../data/entity/entity_registry";
import type { UpdateEntity } from "../../../data/update";
import {
  localizeUpdateInstallPhase,
  localizeUpdateManualAction,
} from "../../../data/update";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type { HomeAssistantFormatters } from "../../../types";

@customElement("ha-config-updates")
class HaConfigUpdates extends LitElement {
  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public updateEntities?: UpdateEntity[];

  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: devicesContext, subscribe: true })
  private _devices!: ContextType<typeof devicesContext>;

  @state()
  @consume({ context: areasContext, subscribe: true })
  private _areas!: ContextType<typeof areasContext>;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  private _entities: ContextType<typeof fullEntitiesContext> = [];

  @state()
  @consume({ context: formattersContext, subscribe: true })
  @transform<
    HomeAssistantFormatters,
    HomeAssistantFormatters["formatEntityName"]
  >({
    transformer: ({ formatEntityName }) => formatEntityName,
  })
  private _formatEntityName!: HomeAssistantFormatters["formatEntityName"];

  private _renderUpdateProgress(entity: UpdateEntity, slot?: string) {
    if (entity.attributes.install_phase === "waiting_for_user") {
      return html`<ha-svg-icon
        slot=${ifDefined(slot)}
        class="waiting-for-user"
        role="img"
        aria-label=${this._localize("ui.card.update.action_required")}
        .path=${mdiAccountAlert}
      ></ha-svg-icon>`;
    }

    if (entity.attributes.update_percentage != null) {
      return html`<ha-progress-ring
        slot=${ifDefined(slot)}
        size="small"
        .value=${entity.attributes.update_percentage}
        .label=${this._localize("ui.panel.config.updates.update_in_progress")}
      ></ha-progress-ring>`;
    }

    if (entity.attributes.in_progress) {
      return html`<ha-spinner
        slot=${ifDefined(slot)}
        size="small"
        .accessibleLabel=${this._localize(
          "ui.panel.config.updates.update_in_progress"
        )}
      ></ha-spinner>`;
    }

    return html`<ha-icon-next slot=${ifDefined(slot)}></ha-icon-next>`;
  }

  protected render() {
    if (!this.updateEntities?.length) {
      return nothing;
    }

    const updates = this.updateEntities;
    const entities = entityRegistryByEntityId(this._entities);

    return html`
      <ha-list-base
        aria-label=${this._localize("ui.panel.config.updates.caption")}
      >
        ${updates.map((entity) => {
          const entityEntry = entities[entity.entity_id];
          const deviceEntry =
            entityEntry && entityEntry.device_id
              ? this._devices[entityEntry.device_id]
              : undefined;

          const areaName =
            deviceEntry && deviceEntry.entry_type !== "service"
              ? getDeviceArea(deviceEntry, this._areas, this._devices)?.name ||
                this._localize("ui.panel.config.updates.no_area")
              : undefined;

          return html`
            <ha-list-item-button
              .entity_id=${entity.entity_id}
              .hasMeta=${!this.narrow}
              @click=${this._openMoreInfo}
            >
              <div slot="start">
                <state-badge
                  .title=${
                    entity.attributes.title || this._formatEntityName(entity)
                  }
                  .stateObj=${entity}
                  class=${ifDefined(
                    this.narrow && entity.attributes.in_progress
                      ? "updating"
                      : undefined
                  )}
                ></state-badge>
                ${
                  this.narrow && entity.attributes.in_progress
                    ? html`<div class="absolute">
                        ${this._renderUpdateProgress(entity)}
                      </div>`
                    : nothing
                }
              </div>
              <span slot="headline"
                >${
                  deviceEntry
                    ? computeDeviceNameDisplay(deviceEntry, this._localize)
                    : this._formatEntityName(entity)
                }</span
              >
              <span slot="supporting-text">
                ${areaName ? html`${areaName} ⸱ ` : nothing}
                ${entity.attributes.title} ${entity.attributes.latest_version}
                ${
                  entity.attributes.skipped_version
                    ? `(${this._localize("ui.panel.config.updates.skipped")})`
                    : nothing
                }
                ${
                  entity.attributes.install_phase
                    ? html`⸱
                      ${localizeUpdateInstallPhase(
                        this._localize,
                        entity.attributes.install_phase
                      )}`
                    : nothing
                }
                ${
                  entity.attributes.manual_action
                    ? html`<span
                        class=${classMap({
                          "manual-action": true,
                          // Quiet while other install phases run.
                          warning:
                            !entity.attributes.in_progress ||
                            entity.attributes.install_phase ===
                              "waiting_for_user",
                        })}
                        >${localizeUpdateManualAction(
                          this._localize,
                          entity.attributes.manual_action
                        )}</span
                      >`
                    : nothing
                }
              </span>
              ${
                !this.narrow
                  ? this._renderUpdateProgress(entity, "end")
                  : nothing
              }
            </ha-list-item-button>
          `;
        })}
      </ha-list-base>
    `;
  }

  private _openMoreInfo(
    ev: HASSDomCurrentTargetEvent<
      HaListItemButton & { entity_id: UpdateEntity["entity_id"] }
    >
  ): void {
    fireEvent(this, "hass-more-info", {
      entityId: ev.currentTarget.entity_id,
    });
  }

  static get styles(): CSSResultGroup[] {
    return [
      css`
        ha-list-item-button ha-icon-next {
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
        div[slot="start"] {
          position: relative;
        }
        div.absolute {
          position: absolute;
          left: 6px;
          top: 6px;
        }
        state-badge.updating {
          opacity: 0.2;
        }
        .manual-action {
          display: block;
          white-space: normal;
        }
        ha-svg-icon.waiting-for-user,
        .manual-action.warning {
          color: var(--ha-color-on-warning-normal);
        }
        ha-svg-icon.waiting-for-user {
          --mdc-icon-size: 28px;
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
