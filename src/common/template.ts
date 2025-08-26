import type { PropertyValues } from "lit";
import memoizeOne from "memoize-one";
import { Environment, Template as NunjucksTemplate } from "nunjucks";
import type { HomeAssistant } from "../types";

const env = new Environment();

// Add filters and globals that don't use hass
env.addFilter("min", (numbers: number[]) => Math.min(...numbers));
env.addFilter("max", (numbers: number[]) => Math.max(...numbers));

export class HaTemplate {
  private _njTemplate?: NunjucksTemplate;

  public hass?: HomeAssistant;

  public entityIds = new Set<string>();

  private context = {
    // functions that access the hass state have to dynamic
    states: (id: string) => {
      this.entityIds.add(id);
      return this.hass?.states[id]?.state;
    },
    state_attr: (id: string, attr: string) => {
      this.entityIds.add(id);
      return this.hass?.states[id]?.attributes[attr];
    },
    is_state: (id: string, value: string) => {
      this.entityIds.add(id);
      return this.hass?.states[id]?.state === value;
    },
    is_state_attr: (id: string, attr: string, value: string) => {
      this.entityIds.add(id);
      return this.hass?.states[id]?.attributes[attr] === value;
    },
  };

  public render(
    hass: HomeAssistant,
    content: string,
    customContext: Record<string, any> = {}
  ): string {
    this._njTemplate = this._createNunjucksTemplate(content);
    this.hass = hass;
    this.entityIds.clear();
    return this._njTemplate.render({ ...this.context, ...customContext });
  }

  public shouldUpdate(
    changedProps: PropertyValues,
    contentProperty?: string
  ): boolean {
    if (contentProperty && changedProps.has(contentProperty)) {
      return true;
    }
    if (!changedProps.has("hass")) {
      return false;
    }
    const newHass = changedProps.get("hass") as HomeAssistant;
    if (!this.hass !== !newHass) {
      return true;
    }

    if (this.hass) {
      for (const entityId of this.entityIds) {
        if (
          this.hass.states[entityId]?.state !== newHass.states[entityId]?.state
        ) {
          return true;
        }
      }
    }

    return false;
  }

  private _createNunjucksTemplate = memoizeOne(
    (content: string) => new NunjucksTemplate(content, env)
  );
}
