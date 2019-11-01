import "@polymer/app-route/app-route";

import "./ha-scene-editor";
import "./ha-scene-dashboard";

import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import { property, customElement, PropertyValues } from "lit-element";
import { HomeAssistant } from "../../../types";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { compare } from "../../../common/string/compare";
import { SceneEntity } from "../../../data/scene";

@customElement("ha-config-scene")
class HaConfigScene extends HassRouterPage {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;
  @property() public showAdvanced!: boolean;
  @property() public scenes: SceneEntity[] = [];

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    routes: {
      dashboard: {
        tag: "ha-scene-dashboard",
        cache: true,
      },
      edit: {
        tag: "ha-scene-editor",
      },
    },
  };

  protected updatePageEl(pageEl, changedProps: PropertyValues) {
    pageEl.hass = this.hass;
    pageEl.narrow = this.narrow;
    pageEl.showAdvanced = this.showAdvanced;
    const oldHass = changedProps
      ? (changedProps.get("hass") as HomeAssistant | undefined)
      : undefined;
    if (
      this.hass &&
      (!changedProps || !oldHass || this.hass.states !== oldHass.states)
    ) {
      pageEl.scenes = this._computeScenes(this.hass);
    }

    if (
      (!changedProps || changedProps.has("route")) &&
      this._currentPage === "edit"
    ) {
      const sceneId = this.routeTail.path.substr(1);
      pageEl.creatingNew = sceneId === "new" ? true : false;
      pageEl.scene =
        sceneId === "new"
          ? undefined
          : pageEl.scenes.find(
              (entity: SceneEntity) => entity.attributes.id === sceneId
            );
    }
  }

  private _computeScenes(hass: HomeAssistant) {
    const scenes: SceneEntity[] = [];
    Object.keys(hass.states).forEach((entityId) => {
      if (computeDomain(entityId) === "scene") {
        scenes.push(hass.states[entityId] as SceneEntity);
      }
    });

    return scenes.sort((a, b) => {
      return compare(computeStateName(a), computeStateName(b));
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-scene": HaConfigScene;
  }
}
