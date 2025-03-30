import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type {
  BlueprintConfig,
  BlueprintDomain,
  BlueprintUrlSearchParams,
} from "../../../data/blueprint";
import { extractSearchParamsObject } from "../../../common/url/search-params";
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

  @property({ attribute: false }) public blueprints!: BlueprintConfig[];

  @state() public domain?: BlueprintDomain;

  constructor() {
    super();
    const query = extractSearchParamsObject() as BlueprintUrlSearchParams;
    if (!query.domain) {
      return;
    }

    this.domain = query.domain;
  }

  protected render() {
    return html`
      ${dynamicElement(`ha-blueprint-${this.domain}-editor`, {
        hass: this.hass,
        route: this.route,
        isWide: this.isWide,
        narrow: this.narrow,
        blueprints: this.blueprints,
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-editor": HaBlueprintEditor;
  }
}
