import {
  Environment,
  Template as NunjucksTemplate,
  installJinjaCompat,
} from "nunjucks";
import type { HomeAssistant } from "../types";

installJinjaCompat();

const env = new Environment();

// Add filters and globals that don't use hass
env.addFilter("min", (numbers: number[]) => Math.min(...numbers));
env.addFilter("max", (numbers: number[]) => Math.max(...numbers));

export class HaTemplate {
  private _njTemplate?: NunjucksTemplate;

  private _hass?: HomeAssistant;

  private _content?: string;

  private _context?: Record<string, any>;

  private _value = "";

  public entityIds = new Set<string>();

  public shouldUpdate = false;

  private _defaultContext = {
    // functions that access the hass state have to be dynamic
    // in order to track which entities are used in the template
    states: (id: string, round = false, withUnit = false): string => {
      this.entityIds.add(id);
      if (!this._hass?.states[id]) {
        return "unknown";
      }
      const state = this._hass?.states[id]?.state;
      if (state == null) {
        return "unavailable";
      }
      if (round) {
        return String(Math.round(Number(state)));
      }
      if (withUnit) {
        return `${state} ${this._hass?.states[id]?.attributes.unit_of_measurement}`;
      }
      return state;
    },
    state_attr: (id: string, attr: string) => {
      this.entityIds.add(id);
      return this._hass?.states[id]?.attributes[attr];
    },
    is_state: (id: string, value: string) => {
      this.entityIds.add(id);
      return this._hass?.states[id]?.state === value;
    },
    is_state_attr: (id: string, attr: string, value: string) => {
      this.entityIds.add(id);
      return this._hass?.states[id]?.attributes[attr] === value;
    },
    has_value: (id: string) => {
      this.entityIds.add(id);
      return this._hass?.states[id]?.state != null;
    },

    state_translated: (id: string) => {
      this.entityIds.add(id);
      try {
        return this._hass?.formatEntityState(
          this._hass?.states[id],
          this._hass?.states[id]?.state
        );
      } catch {
        return this._hass?.states[id]?.state ?? undefined;
      }
    },
  };

  public render(): string {
    if (this.shouldUpdate) {
      this.shouldUpdate = false;
      this.entityIds.clear();
      this._value = this._njTemplate!.render({
        ...this._defaultContext,
        ...this._context,
      });
    }
    return this._value;
  }

  public set content(content: string) {
    if (this._content !== content) {
      this._content = content;
      this._njTemplate = new NunjucksTemplate(content, env);
      this.shouldUpdate = true;
    }
  }

  public set context(context: Record<string, any>) {
    if (this._context !== context) {
      this._context = context;
      this.shouldUpdate = true;
    }
  }

  public set hass(hass: HomeAssistant) {
    if (this._hass !== hass) {
      if (!this.shouldUpdate) {
        this.shouldUpdate =
          !this._hass !== !hass ||
          Array.from(this.entityIds).some(
            (id) => this._hass?.states[id]?.state !== hass.states[id]?.state
          );
      }
      this._hass = hass;
    }
  }
}
