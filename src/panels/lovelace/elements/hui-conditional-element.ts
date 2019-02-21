import { LovelaceElement, LovelaceElementConfig } from "./types";
import { Condition } from "../../../data/lovelace";
import { HuiConditional } from "../components/hui-conditional";
import { createHuiElement } from "../common/create-hui-element";

interface Config extends LovelaceElementConfig {
  conditions: Condition[];
  elements: LovelaceElementConfig[];
}

class HuiConditionalElement extends HuiConditional implements LovelaceElement {
  public setConfig(config: Config): void {
    super.setConditionalConfig(config);
  }

  protected getCustomStyle(): string {
    return `
        :host {
          position: absolute;
          left: 0px;
          top: 0px;
          width: 100%;
          height: 100%;
          transform: none !important;
        }

        .element {
          position: absolute;
          transform: translate(-50%, -50%);
        }
    `;
  }

  // this is here and not in hui-conditional because otherwise there is a circular reference (hui-conditional needs this
  // class to create sub elements but it is also needed to create the conditional element itself created by this class)
  protected _createHuiElement(
    elementConfig: LovelaceElementConfig
  ): LovelaceElement {
    const element = createHuiElement(elementConfig) as LovelaceElement;
    element.hass = this.hass;
    element.classList.add("element");

    Object.keys(elementConfig.style).forEach((prop) => {
      element.style.setProperty(prop, elementConfig.style[prop]);
    });

    return element;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-element": HuiConditionalElement;
  }
}

customElements.define("hui-conditional-element", HuiConditionalElement);
