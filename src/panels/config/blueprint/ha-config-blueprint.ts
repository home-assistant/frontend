import { PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { Blueprints, fetchBlueprints } from "../../../data/blueprint";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import { HomeAssistant } from "../../../types";
import "./ha-blueprint-overview";

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

  @property() public blueprints: Record<string, Blueprints> = {};

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
    const [automation, script] = await Promise.all([
      fetchBlueprints(this.hass, "automation"),
      fetchBlueprints(this.hass, "script"),
    ]);
    this.blueprints = { automation, script };
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
