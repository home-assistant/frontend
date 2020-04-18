import { HassEntities } from "home-assistant-js-websocket";
import { customElement, property, PropertyValues } from "lit-element";
import memoizeOne from "memoize-one";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { AutomationEntity } from "../../../data/automation";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import { HomeAssistant } from "../../../types";
import "./ha-automation-editor";
import "./ha-automation-picker";

@customElement("ha-config-automation")
class HaConfigAutomation extends HassRouterPage {
  @property() public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public showAdvanced!: boolean;

  @property() public automations: AutomationEntity[] = [];

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    routes: {
      dashboard: {
        tag: "ha-automation-picker",
        cache: true,
      },
      edit: {
        tag: "ha-automation-editor",
      },
    },
  };

  private _computeAutomations = memoizeOne((states: HassEntities) => {
    const automations: AutomationEntity[] = [];
    Object.values(states).forEach((state) => {
      if (
        computeStateDomain(state) === "automation" &&
        !state.attributes.hidden
      ) {
        automations.push(state as AutomationEntity);
      }
    });

    return automations;
  });

  protected updatePageEl(pageEl, changedProps: PropertyValues) {
    pageEl.hass = this.hass;
    pageEl.narrow = this.narrow;
    pageEl.isWide = this.isWide;
    pageEl.route = this.routeTail;
    pageEl.showAdvanced = this.showAdvanced;

    if (this.hass) {
      pageEl.automations = this._computeAutomations(this.hass.states);
    }

    if (
      (!changedProps || changedProps.has("route")) &&
      this._currentPage === "edit"
    ) {
      pageEl.creatingNew = undefined;
      const automationId = this.routeTail.path.substr(1);
      pageEl.creatingNew = automationId === "new";
      pageEl.automation =
        automationId === "new"
          ? undefined
          : pageEl.automations.find(
              (entity: AutomationEntity) =>
                entity.attributes.id === automationId
            );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-automation": HaConfigAutomation;
  }
}
