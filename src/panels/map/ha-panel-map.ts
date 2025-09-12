import { mdiPencil } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { navigate } from "../../common/navigate";
import "../../components/ha-icon-button";
import "../../components/ha-menu-button";
import "../../components/ha-top-app-bar-fixed";
import "../../components/map/ha-map";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";

@customElement("ha-panel-map")
class HaPanelMap extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  private _entities: string[] = [];

  protected render() {
    return html`
      <ha-top-app-bar-fixed .narrow=${this.narrow}>
        <ha-menu-button
          slot="navigationIcon"
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></ha-menu-button>
        <div slot="title">${this.hass.localize("panel.map")}</div>
        ${!__DEMO__ && this.hass.user?.is_admin
          ? html`<ha-icon-button
              slot="actionItems"
              .label=${this.hass!.localize("ui.panel.map.edit_zones")}
              .path=${mdiPencil}
              @click=${this._openZonesEditor}
            ></ha-icon-button>`
          : ""}
        <ha-map
          .hass=${this.hass}
          .entities=${this._entities}
          auto-fit
          interactive-zones
        ></ha-map>
      </ha-top-app-bar-fixed>
    `;
  }

  private _openZonesEditor() {
    navigate("/config/zone?historyBack=1");
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (!changedProps.has("hass")) {
      return;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    this._getStates(oldHass);
  }

  private _getStates(oldHass?: HomeAssistant) {
    let changed = false;
    const personSources = new Set<string>();
    const locationEntities: string[] = [];
    Object.values(this.hass!.states).forEach((entity) => {
      if (
        entity.state === "home" ||
        !("latitude" in entity.attributes) ||
        !("longitude" in entity.attributes)
      ) {
        return;
      }
      locationEntities.push(entity.entity_id);
      if (computeStateDomain(entity) === "person" && entity.attributes.source) {
        personSources.add(entity.attributes.source);
      }
      if (oldHass?.states[entity.entity_id] !== entity) {
        changed = true;
      }
    });

    if (changed) {
      this._entities = locationEntities.filter(
        (entity) => !personSources.has(entity)
      );
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-map {
          height: calc(100vh - var(--header-height));
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-map": HaPanelMap;
  }
}
