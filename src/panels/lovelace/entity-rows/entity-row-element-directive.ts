import { Directive, directive } from "lit/directive";
import type { HomeAssistant } from "../../../types";
import type { HuiErrorCard } from "../cards/hui-error-card";
import { createRowElement } from "../create-element/create-row-element";
import type { LovelaceRow, LovelaceRowConfig } from "./types";

class EntityRowDirective extends Directive {
  private _element?: LovelaceRow | HuiErrorCard;

  private _name?: string;

  render(entityId: string, name: string, hass: HomeAssistant) {
    if (!this._element) {
      this._element = createRowElement({
        entity: entityId,
        name,
      } as LovelaceRowConfig);
    } else if (this._name !== name) {
      (this._element as LovelaceRow).setConfig?.({
        entity: entityId,
        name,
      } as LovelaceRowConfig);
    }
    this._name = name;
    this._element.hass = hass;
    return this._element;
  }
}

export const entityRowElement = directive(EntityRowDirective);
