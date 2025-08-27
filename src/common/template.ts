import nunjucks, { Environment, Template as NunjucksTemplate } from "nunjucks";
import type { HomeAssistant } from "../types";

nunjucks.installJinjaCompat();

function createEnv() {
  const env = new Environment();
  // Add filters and globals that don't use hass
  env.addFilter("min", (numbers: number[]) => Math.min(...numbers));
  env.addFilter("max", (numbers: number[]) => Math.max(...numbers));

  env.addGlobal(
    "states",
    (
      hass: HomeAssistant,
      id: string,
      round = false,
      withUnit = false
    ): string => {
      if (!hass?.states[id]) {
        return "unknown";
      }
      const state = hass?.states[id]?.state;
      if (state == null) {
        return "unavailable";
      }
      if (round) {
        return String(Math.round(Number(state)));
      }
      if (withUnit) {
        return `${state} ${hass?.states[id]?.attributes.unit_of_measurement}`;
      }
      return state;
    }
  );
  env.addGlobal(
    "state_attr",
    (hass: HomeAssistant, id: string, attr: string) =>
      hass?.states[id]?.attributes[attr]
  );
  env.addGlobal(
    "is_state",
    (hass: HomeAssistant, id: string, value: string) =>
      hass?.states[id]?.state === value
  );
  env.addGlobal(
    "is_state_attr",
    (hass: HomeAssistant, id: string, attr: string, value: string) =>
      hass?.states[id]?.attributes[attr] === value
  );
  env.addGlobal(
    "has_value",
    (hass: HomeAssistant, id: string) => hass?.states[id]?.state != null
  );
  env.addGlobal("state_translated", (hass: HomeAssistant, id: string) => {
    try {
      return hass?.formatEntityState(hass?.states[id], hass?.states[id]?.state);
    } catch {
      return hass?.states[id]?.state ?? undefined;
    }
  });
  return env;
}

export class HaTemplate {
  private _njTemplate?: NunjucksTemplate;

  private _hass?: HomeAssistant;

  private _content?: string;

  private _context?: Record<string, any>;

  private _value = "";

  public entityIds = new Set<string>();

  public shouldUpdate = false;

  private _env = createEnv();

  constructor() {
    // functions that access the hass state have to be dynamic
    // in order to track which entities are used in the template
    [
      "states",
      "state_attr",
      "is_state",
      "is_state_attr",
      "has_value",
      "state_translated",
    ].forEach((func) => {
      const original = this._env.getGlobal(func);
      this._env.addGlobal(func, (id: string, ...args: any[]): string => {
        this.entityIds.add(id);
        return original(this._hass, id, ...args);
      });
    });
  }

  public render(): string {
    if (this.shouldUpdate) {
      this.shouldUpdate = false;
      this.entityIds.clear();
      this._value = this._njTemplate!.render(this._context);
    }
    return this._value;
  }

  public set content(content: string) {
    if (this._content !== content) {
      this._content = content;
      this._njTemplate = new NunjucksTemplate(content, this._env);
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
