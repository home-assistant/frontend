import { HassEntities } from "home-assistant-js-websocket";
import { PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { debounce } from "../../../common/util/debounce";
import { ScriptEntity } from "../../../data/script";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import { HomeAssistant } from "../../../types";
import "./ha-script-editor";
import "./ha-script-picker";

const equal = (a: ScriptEntity[], b: ScriptEntity[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((enityA, index) => enityA === b[index]);
};

@customElement("ha-config-script")
class HaConfigScript extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public showAdvanced!: boolean;

  @property() public scripts: ScriptEntity[] = [];

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
      trace: {
        tag: "ha-script-trace",
        load: () => import("./ha-script-trace"),
      },
    },
  };

  private _debouncedUpdateScripts = debounce((pageEl) => {
    const newScript = this._getScripts(this.hass.states);
    if (!equal(newScript, pageEl.scripts)) {
      pageEl.scripts = newScript;
    }
  }, 10);

  private _getScripts = memoizeOne(
    (states: HassEntities): ScriptEntity[] =>
      Object.values(states).filter(
        (entity) => computeStateDomain(entity) === "script"
      ) as ScriptEntity[]
  );

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("device_automation");
  }

  protected updatePageEl(pageEl, changedProps: PropertyValues) {
    pageEl.hass = this.hass;
    pageEl.narrow = this.narrow;
    pageEl.isWide = this.isWide;
    pageEl.route = this.routeTail;
    pageEl.showAdvanced = this.showAdvanced;

    if (this.hass) {
      if (!pageEl.scripts || !changedProps) {
        pageEl.scripts = this._getScripts(this.hass.states);
      } else if (changedProps.has("hass")) {
        this._debouncedUpdateScripts(pageEl);
      }
    }

    if (
      (!changedProps || changedProps.has("route")) &&
      this._currentPage !== "dashboard"
    ) {
      pageEl.creatingNew = undefined;
      const scriptEntityId = this.routeTail.path.substr(1);
      pageEl.scriptEntityId = scriptEntityId === "new" ? null : scriptEntityId;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-script": HaConfigScript;
  }
}
