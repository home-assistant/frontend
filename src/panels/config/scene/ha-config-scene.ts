import type { HassEntities } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { debounce } from "../../../common/util/debounce";
import type { SceneEntity } from "../../../data/scene";
import type { RouterOptions } from "../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../layouts/hass-router-page";
import type { HomeAssistant } from "../../../types";
import "./ha-scene-dashboard";
import "./ha-scene-editor";

const equal = (a: SceneEntity[], b: SceneEntity[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((scene, index) => scene === b[index]);
};

@customElement("ha-config-scene")
class HaConfigScene extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public scenes: SceneEntity[] = [];

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

  private _debouncedUpdateScenes = debounce((pageEl) => {
    const newScenes = this._getScenes(this.hass.states);
    if (!equal(newScenes, pageEl.scenes)) {
      pageEl.scenes = newScenes;
    }
  }, 10);

  private _getScenes = memoizeOne(
    (states: HassEntities): SceneEntity[] =>
      Object.values(states).filter(
        (entity) => computeStateDomain(entity) === "scene"
      ) as SceneEntity[]
  );

  protected updatePageEl(pageEl, changedProps: PropertyValues) {
    pageEl.hass = this.hass;
    pageEl.narrow = this.narrow;
    pageEl.isWide = this.isWide;
    pageEl.route = this.routeTail;

    if (this.hass) {
      if (!pageEl.scenes || !changedProps) {
        pageEl.scenes = this._getScenes(this.hass.states);
      } else if (changedProps.has("hass")) {
        this._debouncedUpdateScenes(pageEl);
      }
    }

    if (
      (!changedProps || changedProps.has("route")) &&
      this._currentPage === "edit"
    ) {
      pageEl.creatingNew = undefined;
      const sceneId = this.routeTail.path.substr(1);
      pageEl.sceneId = sceneId === "new" ? null : sceneId;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-scene": HaConfigScene;
  }
}
