import { consume, type ContextType } from "@lit/context";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../../../common/entity/compute_device_name";
import { getDeviceArea } from "../../../common/entity/context/get_device_context";
import "../../../components/entity/state-badge";
import "../../../components/ha-alert";
import "../../../components/ha-icon-next";
import "../../../components/ha-spinner";
import "../../../components/item/ha-list-item-button";
import "../../../components/list/ha-list-base";
import "../../../components/progress/ha-progress-ring";
import {
  areasContext,
  devicesContext,
  fullEntitiesContext,
  statesContext,
} from "../../../data/context";
import { entityRegistryByEntityId } from "../../../data/entity/entity_registry";
import type { UpdateEntity } from "../../../data/update";
import type { LocalizeFunc } from "../../../common/translations/localize";

@customElement("ha-config-updates")
class HaConfigUpdates extends LitElement {
  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public updateEntities?: UpdateEntity[];

  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @consume({ context: devicesContext, subscribe: true })
  private _devices!: ContextType<typeof devicesContext>;

  @consume({ context: areasContext, subscribe: true })
  private _areas!: ContextType<typeof areasContext>;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  private _entities: ContextType<typeof fullEntitiesContext> = [];

  private _renderUpdateProgress(entity: UpdateEntity) {
    if (entity.attributes.update_percentage != null) {
      return html`<ha-progress-ring
        size="small"
        .value=${entity.attributes.update_percentage}
        .label=${this._localize("ui.panel.config.updates.update_in_progress")}
      ></ha-progress-ring>`;
    }

    if (entity.attributes.in_progress) {
      return html`<ha-spinner
        size="small"
        .ariaLabel=${this._localize(
          "ui.panel.config.updates.update_in_progress"
        )}
      ></ha-spinner>`;
    }

    return html`<ha-icon-next></ha-icon-next>`;
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
              ? getDeviceArea(deviceEntry, this._areas)?.name ||
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
                  ? html`<div class="absolute">
                      ${this._renderUpdateProgress(entity)}
                    </div>`
                  : nothing}
              </div>
              <span slot="headline"
                >${deviceEntry
                  ? computeDeviceNameDisplay(
                      deviceEntry,
                      this._localize,
                      this._states
                    )
                  : entity.attributes.friendly_name}</span
              >
              <span slot="supporting-text">
                ${areaName ? html`${areaName} ⸱ ` : nothing}
                ${entity.attributes.title} ${entity.attributes.latest_version}
                ${entity.attributes.skipped_version
                  ? `(${this._localize("ui.panel.config.updates.skipped")})`
                  : nothing}
              </span>
              ${!this.narrow
                ? html`<div slot="end">
                    ${this._renderUpdateProgress(entity)}
                  </div>`
                : nothing}
            </ha-list-item-button>
          `;
        })}
      </ha-list-base>
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
        ha-list-item-button {
          --md-list-item-leading-icon-size: 40px;
        }
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-updates": HaConfigUpdates;
  }
}
