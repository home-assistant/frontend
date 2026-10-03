import RadioGroup from "@home-assistant/webawesome/dist/components/radio-group/radio-group";
import { css, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators";

/**
 * Home Assistant radio group component
 *
 * @element ha-radio-group
 * @extends {RadioGroup}
 *
 * @summary
 * A Home Assistant themed radio group built on top of the Web Awesome radio group.
 * Groups `ha-radio-option` children so they behave as a single form control.
 *
 * @slot - The default slot where `ha-radio-option` elements are placed.
 * @slot label - The radio group's label. Required for accessibility. Alternatively, use the `label` attribute.
 * @slot hint - Text that describes how to use the radio group. Alternatively, use the `hint` attribute.
 *
 * @csspart form-control - The form control that wraps the label, input, and hint.
 * @csspart form-control-label - The label's wrapper.
 * @csspart form-control-input - The input's wrapper.
 * @csspart radios - The wrapper around the radio items, styled as a flex container by default.
 * @csspart hint - The hint's wrapper.
 *
 * @cssprop --ha-radio-group-required-marker - Marker shown after the label for required fields. Defaults to `--ha-input-required-marker`, then `"*"`.
 * @cssprop --ha-radio-group-required-marker-offset - Offset of the required marker. Defaults to `0.1rem`.
 *
 * @attr {string} label - The radio group's label.
 * @attr {string} hint - The radio group's hint text.
 * @attr {string} name - The name of the radio group, submitted as a name/value pair with form data.
 * @attr {("horizontal"|"vertical")} orientation - The orientation in which to show radio items.
 * @attr {boolean} disabled - Disables the radio group and all child radios.
 * @attr {boolean} required - Ensures a child radio is checked before allowing the containing form to submit.
 *
 * @fires change - Emitted when the radio group's selected value changes.
 * @fires input - Emitted when the radio group receives user input.
 * @fires wa-invalid - Emitted when the form control has been checked for validity and its constraints aren't satisfied.
 */
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
