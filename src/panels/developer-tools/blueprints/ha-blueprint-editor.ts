import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { Blueprint, BlueprintDomain } from "../../../data/blueprint";
import "./ha-blueprint-automation-editor";
import "./ha-blueprint-script-editor";
import type { HomeAssistant, Route } from "../../../types";
import { dynamicElement } from "../../../common/dom/dynamic-element-directive";

@customElement("ha-blueprint-editor")
class HaBlueprintEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public narrow!: boolean;

  @property({ attribute: false }) public isWide!: boolean;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public blueprints!: Blueprint[];

  @property({ attribute: "blueprint-path" }) public blueprintPath?: string;

  @property({ attribute: false }) public domain?: BlueprintDomain;

  protected render() {
    return html`
      ${dynamicElement(`ha-blueprint-${this.domain}-editor`, {
        hass: this.hass,
        route: this.route,
        isWide: this.isWide,
        narrow: this.narrow,
        blueprints: this.blueprints,
        blueprintPath: this.blueprintPath,
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-editor": HaBlueprintEditor;
  }
}
