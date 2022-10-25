import { mdiHelp, mdiHome, mdiHomeExportOutline } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import "../../../../../components/tile/ha-tile-badge";
import { UNAVAILABLE_STATES } from "../../../../../data/entity";
import { HomeAssistant } from "../../../../../types";

function getZone(entity: HassEntity, hass: HomeAssistant) {
  const state = entity.state;
  if (state === "home" || state === "not_home") return undefined;

  const zones = Object.values(hass.states).filter((stateObj) =>
    stateObj.entity_id.startsWith("zone.")
  );

  return zones.find((z) => state === z.attributes.friendly_name);
}

function personBadgeIcon(entity: HassEntity) {
  const state = entity.state;
  if (UNAVAILABLE_STATES.includes(state)) {
    return mdiHelp;
  }
  return state === "not_home" ? mdiHomeExportOutline : mdiHome;
}

function personBadgeColor(entity: HassEntity, inZone?: boolean) {
  if (inZone) {
    return "person-zone";
  }
  const state = entity.state;
  return state === "not_home" ? "person-not-home" : "person-home";
}

@customElement("tile-badge-person")
export class TileBadgePerson extends LitElement {
  @property() public stateObj?: HassEntity;

  @property({ attribute: false }) public hass?: HomeAssistant;

  protected render(): TemplateResult {
    if (!this.stateObj || !this.hass) {
      return html``;
    }

    const zone = getZone(this.stateObj, this.hass);

    const iconPath = personBadgeIcon(this.stateObj);
    const icon = zone?.attributes.icon;
    const color = personBadgeColor(this.stateObj, Boolean(zone));

    const style = {
      "--badge-color": `var(--rgb-state-${color}-color)`,
    };

    return html`
      <ha-tile-badge
        style=${styleMap(style)}
        .iconPath=${iconPath}
        .icon=${icon}
      ></ha-tile-badge>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-tile-badge {
        --tile-badge-background-color: rgb(var(--badge-color));
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "tile-badge-person": TileBadgePerson;
  }
}
