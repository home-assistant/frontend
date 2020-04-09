import "./ha-scene-editor";
import "./ha-scene-dashboard";

import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import { property, customElement, PropertyValues } from "lit-element";
import { HomeAssistant } from "../../../types";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { SceneEntity } from "../../../data/scene";
import memoizeOne from "memoize-one";
import { HassEntities } from "home-assistant-js-websocket";

@customElement("ha-config-scene")
class HaConfigScene extends HassRouterPage {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;
  @property() public isWide!: boolean;
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

  private _computeScenes = memoizeOne((states: HassEntities) => {
    const scenes: SceneEntity[] = [];
    Object.values(states).forEach((state) => {
      if (computeStateDomain(state) === "scene" && !state.attributes.hidden) {
        scenes.push(state as SceneEntity);
      }
    });

    return scenes;
  });

  protected updatePageEl(pageEl, changedProps: PropertyValues) {
    pageEl.hass = this.hass;
    pageEl.narrow = this.narrow;
    pageEl.isWide = this.isWide;
    pageEl.route = this.routeTail;
    pageEl.showAdvanced = this.showAdvanced;

    if (this.hass) {
      pageEl.scenes = this._computeScenes(this.hass.states);
    }

    if (
      (!changedProps || changedProps.has("route")) &&
      this._currentPage === "edit"
    ) {
      pageEl.creatingNew = undefined;
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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-scene": HaConfigScene;
  }
}
