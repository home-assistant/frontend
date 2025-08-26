import type { PropertyValues } from "lit";
import { LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import nunjucks, { type Template as NunjucksTemplate } from "nunjucks";
import type { HomeAssistant } from "../types";

@customElement("ha-template")
export class HaTemplate extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public content!: string;

  private _template: NunjucksTemplate | undefined;

  private _accessedEntityIds: string[] = [];

  protected shouldUpdate(changedProperties: PropertyValues): boolean {
    return (
      super.shouldUpdate(changedProperties) &&
      changedProperties.has("hass") &&
      (!this._accessedEntityIds.length ||
        changedProperties.has("content") ||
        this._accessedEntityIds.some(
          (id) =>
            this.hass?.states[id].state !==
            changedProperties.get("hass")?.states[id].state
        ))
    );
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    this._accessedEntityIds = [];
    if (changedProperties.has("content")) {
      this._template = nunjucks.compile(this.content);
    }
  }

  public render() {
    try {
      return this._template!.render(this._getContext());
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug(`Error rendering template: ${error}`);
      return this.content;
    }
  }

  private _getContext() {
    return {
      hass: this.hass,
      states: (id: string) => {
        this._accessedEntityIds.push(id);
        return this.hass?.states[id]?.state;
      },
      state_attr: (id: string, attr: string) => {
        this._accessedEntityIds.push(id);
        return this.hass?.states[id]?.attributes[attr];
      },
      is_state: (id: string, value: string) => {
        this._accessedEntityIds.push(id);
        return this.hass?.states[id]?.state === value;
      },
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-template": HaTemplate;
  }
}
