import { mdiPencil } from "@mdi/js";
import "@material/mwc-icon-button";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { property } from "lit/decorators";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { navigate } from "../../common/navigate";
import "../../components/ha-svg-icon";
import "../../components/ha-menu-button";
import "../../layouts/ha-app-layout";
import { HomeAssistant } from "../../types";
import "../../components/map/ha-map";
import { haStyle } from "../../resources/styles";

class HaPanelMap extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  private _entities: string[] = [];

  protected render() {
    return html`
      <ha-app-layout>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>${this.hass.localize("panel.map")}</div>
            ${!__DEMO__ && this.hass.user?.is_admin
              ? html`<mwc-icon-button @click=${this._openZonesEditor}
                  ><ha-svg-icon .path=${mdiPencil}></ha-svg-icon
                ></mwc-icon-button>`
              : ""}
          </app-toolbar>
        </app-header>
        <ha-map .hass=${this.hass} .entities=${this._entities} autoFit></ha-map>
      </ha-app-layout>
    `;
  }

  private _openZonesEditor() {
    navigate("/config/zone");
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

customElements.define("ha-panel-map", HaPanelMap);

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-map": HaPanelMap;
  }
}
