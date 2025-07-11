import type { PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import type { Blueprints } from "../../../data/blueprint";
import { fetchBlueprints } from "../../../data/blueprint";
import type { RouterOptions } from "../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../layouts/hass-router-page";
import type { HomeAssistant } from "../../../types";
import "./ha-blueprint-overview";
import "../../developer-tools/blueprints/ha-blueprint-editor";

declare global {
  // for fire event
  interface HASSDomEvents {
    "reload-blueprints": undefined;
  }
}

@customElement("ha-config-blueprint")
class HaConfigBlueprint extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public showAdvanced = false;

  @property({ attribute: false })
  public blueprints: Record<string, Blueprints> = {};

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
      const blueprintFullPath = this.routeTail.path.substring(1);
      const firstSlash = blueprintFullPath.indexOf("/");
      const domain = blueprintFullPath.substring(0, firstSlash);
      const blueprintPath = blueprintFullPath.substring(firstSlash + 1);

      pageEl.domain = domain;
      pageEl.blueprintPath = blueprintPath === "new" ? "" : blueprintPath;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-blueprint": HaConfigBlueprint;
  }
}
