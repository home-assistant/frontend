import type { SVGTemplateResult } from "lit";
import { html, LitElement, svg } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { SunCondition } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { ConditionElement } from "../ha-automation-condition-row";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";

function getSunPreviewSVG(condition: SunCondition): SVGTemplateResult {
  let bar1 = { start: 0, width: 0 };
  let bar2 = { start: 0, width: 0 };

  if (condition.before === "sunrise") {
    bar1.width = 25;
    if (condition.after === "sunset") {
      bar2 = { start: 75, width: 25 };
    } else if (condition.after === "sunrise") {
      // This makes no sense
      bar1.width = 0;
    }
  } else if (condition.before === "sunset") {
    bar2 = { start: 50, width: 25 };
    if (condition.after === "sunset") {
      // This makes no sense
      bar2 = { start: 0, width: 0 };
    } else if (condition.after === "sunrise") {
      bar1 = { start: 25, width: 25 };
    } else {
      bar1 = { start: 0, width: 50 };
    }
  } else if (condition.after === "sunrise") {
    bar1 = { start: 25, width: 25 };
    bar2 = { start: 50, width: 50 };
  } else if (condition.after === "sunset") {
    bar2 = { start: 75, width: 25 };
  }

  return svg`
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="30px" fill="none">
  <rect id="outline" x="0" y="5%" width="100%" height="85%" stroke="#000" fill="none"/>
  <line id="sun_up_line"   x1="25%" y1="2%" x2="25%" y2="93%" stroke="#000" fill="none"/>
  <line id="noon_line"     x1="50%" y1="2%" x2="50%" y2="93%" stroke="#000" fill="none"/>
  <line id="sun_down_line" x1="75%" y1="2%" x2="75%" y2="93%" stroke="#000" fill="none"/>
  <rect id="bar_1" x="${bar1.start}%" y="10%" width="${bar1.width}%" height="75%" stroke-opacity="0" stroke="#0f0f00" fill="#3f7f00"/>
  <rect id="bar_2" x="${bar2.start}%" y="10%" width="${bar2.width}%" height="75%" stroke-opacity="0" stroke="#0f0f00" fill="#3f7f00"/>
</svg>`;
}

@customElement("ha-automation-condition-sun")
export class HaSunCondition extends LitElement implements ConditionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: SunCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): SunCondition {
    return { condition: "sun" };
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "before",
          type: "select",
          required: true,
          options: [
            [
              "sunrise",
              localize(
                "ui.panel.config.automation.editor.conditions.type.sun.sunrise"
              ),
            ],
            [
              "sunset",
              localize(
                "ui.panel.config.automation.editor.conditions.type.sun.sunset"
              ),
            ],
          ],
        },
        { name: "before_offset", selector: { text: {} } },
        {
          name: "after",
          type: "select",
          required: true,
          options: [
            [
              "sunrise",
              localize(
                "ui.panel.config.automation.editor.conditions.type.sun.sunrise"
              ),
            ],
            [
              "sunset",
              localize(
                "ui.panel.config.automation.editor.conditions.type.sun.sunset"
              ),
            ],
          ],
        },
        { name: "after_offset", selector: { text: {} } },
      ] as const
  );

  protected render() {
    const schema = this._schema(this.hass.localize);
    return html`
      <ha-form
        .schema=${schema}
        .data=${this.condition}
        .hass=${this.hass}
        .disabled=${this.disabled}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      >
      </ha-form>
      ${getSunPreviewSVG(this.condition)}
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newTrigger = ev.detail.value;
    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      `ui.panel.config.automation.editor.conditions.type.sun.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-sun": HaSunCondition;
  }
}
