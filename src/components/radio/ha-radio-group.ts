import RadioGroup from "@home-assistant/webawesome/dist/components/radio-group/radio-group";
import { css, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-radio-group")
export class HaRadioGroup extends RadioGroup {
  constructor() {
    super();

    this.radioTag = "ha-radio-option";
  }

  static get styles(): CSSResultGroup {
    return [
      RadioGroup.styles,
      css`
        :host {
          --wa-form-control-required-content: var(
            --ha-radio-group-required-marker,
            var(--ha-input-required-marker, "*")
          );
          --wa-form-control-required-content-offset: var(
            --ha-radio-group-required-marker-offset,
            0.1rem
          );
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-radio-group": HaRadioGroup;
  }
}
