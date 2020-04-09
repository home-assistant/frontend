import { HassEntities } from "home-assistant-js-websocket";
import { customElement, property, PropertyValues } from "lit-element";
import memoizeOne from "memoize-one";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import { HomeAssistant } from "../../../types";
import "./ha-script-editor";
import "./ha-script-picker";

@customElement("ha-config-script")
class HaConfigScript extends HassRouterPage {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;
  @property() public isWide!: boolean;
  @property() public showAdvanced!: boolean;
  @property() public scripts: HassEntities = [];

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    routes: {
      dashboard: {
        tag: "ha-script-picker",
        cache: true,
      },
      edit: {
        tag: "ha-script-editor",
      },
    },
  };

  private _computeScripts = memoizeOne((states: HassEntities) => {
    const scripts: HassEntities = [];
    Object.values(states).forEach((state) => {
      if (computeStateDomain(state) === "script" && !state.attributes.hidden) {
        scripts.push(state);
      }
    });

    return scripts;
  });

  protected updatePageEl(pageEl, changedProps: PropertyValues) {
    pageEl.hass = this.hass;
    pageEl.narrow = this.narrow;
    pageEl.isWide = this.isWide;
    pageEl.route = this.routeTail;
    pageEl.showAdvanced = this.showAdvanced;

    if (this.hass) {
      pageEl.scripts = this._computeScripts(this.hass.states);
    }

    if (
      (!changedProps || changedProps.has("route")) &&
      this._currentPage === "edit"
    ) {
      pageEl.creatingNew = undefined;
      const scriptEntityId = this.routeTail.path.substr(1);
      pageEl.creatingNew = scriptEntityId === "new" ? true : false;
      pageEl.script =
        scriptEntityId === "new"
          ? undefined
          : pageEl.scripts.find(
              (entity: HassEntitity) => entity.entity_id === scriptEntityId
            );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-script": HaConfigScript;
  }
}
