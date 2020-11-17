import { customElement, property, PropertyValues } from "lit-element";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import "./ha-blueprint-overview";
import { HomeAssistant } from "../../../types";
import { Blueprints, fetchBlueprints } from "../../../data/blueprint";

declare global {
  // for fire event
  interface HASSDomEvents {
    "reload-blueprints": undefined;
  }
}

@customElement("ha-config-blueprint")
class HaConfigBlueprint extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public showAdvanced!: boolean;

  @property() public blueprints: Blueprints = {};

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    routes: {
      dashboard: {
        tag: "ha-blueprint-overview",
        cache: true,
      },
      edit: {
        tag: "ha-blueprint-editor",
      },
    },
  };

  private async _getBlueprints() {
    this.blueprints = await fetchBlueprints(this.hass, "automation");
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.addEventListener("reload-blueprints", () => {
      this._getBlueprints();
    });
    this._getBlueprints();
  }

  protected updatePageEl(pageEl, changedProps: PropertyValues) {
    pageEl.hass = this.hass;
    pageEl.narrow = this.narrow;
    pageEl.isWide = this.isWide;
    pageEl.route = this.routeTail;
    pageEl.showAdvanced = this.showAdvanced;
    pageEl.blueprints = this.blueprints;

    if (
      (!changedProps || changedProps.has("route")) &&
      this._currentPage === "edit"
    ) {
      const blueprintId = this.routeTail.path.substr(1);
      pageEl.blueprintId = blueprintId === "new" ? null : blueprintId;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-blueprint": HaConfigBlueprint;
  }
}
