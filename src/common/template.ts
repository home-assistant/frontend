import { Environment, Template as NunjucksTemplate } from "nunjucks";
import type { HomeAssistant } from "../types";

const env = new Environment();

// Add filters and globals that don't use hass
env.addFilter("min", (numbers: number[]) => Math.min(...numbers));
env.addFilter("max", (numbers: number[]) => Math.max(...numbers));

export class HaTemplate {
  private _njTemplate?: NunjucksTemplate;

  private _hass?: HomeAssistant;

  private _content?: string;

  private _context?: Record<string, any>;

  public entityIds = new Set<string>();

  public shouldUpdate = false;

  private _defaultContext = {
    // functions that access the hass state have to dynamic
    states: (id: string) => {
      this.entityIds.add(id);
      return this._hass?.states[id]?.state;
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
  };

  public render(): string {
    if (!this.shouldUpdate) {
      return "";
    }
    this.shouldUpdate = false;
    this.entityIds.clear();
    return this._njTemplate!.render({
      ...this._defaultContext,
      ...this._context,
    });
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
