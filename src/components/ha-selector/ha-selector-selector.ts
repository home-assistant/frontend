import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../common/translations/localize";
import type { HomeAssistant } from "../../types";
import "../ha-alert";
import "../ha-form/ha-form";

const SELECTOR_DEFAULTS = {
  number: {
    min: 1,
    max: 100,
  },
};

const SELECTOR_SCHEMAS = {
  action: [] as const,
  area: [
    {
      name: "multiple",
      selector: { boolean: {} },
    },
  ] as const,
  attribute: [
    {
      name: "entity_id",
      selector: { entity: {} },
    },
  ] as const,
  boolean: [] as const,
  color_temp: [
    {
      name: "unit",
      selector: { select: { options: ["kelvin", "mired"] } },
    },
    {
      name: "min",
      selector: { number: { mode: "box" } },
    },
    {
      name: "max",
      selector: { number: { mode: "box" } },
    },
  ] as const,
  condition: [] as const,
  date: [] as const,
  datetime: [] as const,
  device: [
    {
      name: "multiple",
      selector: { boolean: {} },
    },
  ] as const,
  duration: [
    {
      name: "enable_day",
      selector: { boolean: {} },
    },
    {
      name: "enable_millisecond",
      selector: { boolean: {} },
    },
  ] as const,
  entity: [
    {
      name: "multiple",
      selector: { boolean: {} },
    },
  ] as const,
  floor: [
    {
      name: "multiple",
      selector: { boolean: {} },
    },
  ] as const,
  icon: [] as const,
  location: [] as const,
  media: [
    {
      name: "accept",
      selector: {
        text: {
          multiple: true,
        },
      },
    },
  ] as const,
  number: [
    {
      name: "min",
      selector: { number: { mode: "box", step: "any" } },
    },
    {
      name: "max",
      selector: { number: { mode: "box", step: "any" } },
    },
    {
      name: "step",
      selector: { number: { mode: "box", step: "any" } },
    },
  ] as const,
  object: [] as const,
  color_rgb: [] as const,
  select: [
    {
      name: "options",
      selector: { object: {} },
    },
    {
      name: "multiple",
      selector: { boolean: {} },
    },
  ] as const,
  state: [
    {
      name: "entity_id",
      selector: { entity: {} },
    },
  ] as const,
  target: [] as const,
  template: [] as const,
  text: [
    {
      name: "multiple",
      selector: { boolean: {} },
    },
    {
      name: "multiline",
      selector: { boolean: {} },
    },
    { name: "prefix", selector: { text: {} } },
    { name: "suffix", selector: { text: {} } },
  ] as const,
  theme: [] as const,
  time: [] as const,
};

@customElement("ha-selector-selector")
export class HaSelectorSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean, reflect: true }) public required = true;

  private _yamlMode = false;

  protected shouldUpdate(changedProps: PropertyValues) {
    if (changedProps.size === 1 && changedProps.has("hass")) {
      return false;
    }
    return true;
  }

  private _schema = memoizeOne(
    (choice: string, localize: LocalizeFunc) =>
      [
        {
          name: "type",
          selector: {
            select: {
              mode: "dropdown",
              required: true,
              options: Object.keys(SELECTOR_SCHEMAS)
                .concat("manual")
                .map((key) => ({
                  label:
                    localize(
                      `ui.components.selectors.selector.types.${key}` as LocalizeKeys
                    ) || key,
                  value: key,
                })),
            },
          },
        },
        ...(choice === "manual"
          ? ([
              {
                name: "manual",
                selector: { object: {} },
              },
            ] as const)
          : []),
        ...(SELECTOR_SCHEMAS[choice]
          ? SELECTOR_SCHEMAS[choice].length > 1
            ? [
                {
                  name: "",
                  type: "expandable",
                  title: localize("ui.components.selectors.selector.options"),
                  schema: SELECTOR_SCHEMAS[choice],
                },
              ]
            : SELECTOR_SCHEMAS[choice]
          : []),
      ] as const
  );

  protected render() {
    let data;
    let type;
    if (this._yamlMode) {
      type = "manual";
      data = { type, manual: this.value };
    } else {
      type = Object.keys(this.value)[0];
      const value0 = Object.values(this.value)[0];
      data = {
        type,
        ...(typeof value0 === "object" ? value0 : []),
      };
    }

    const schema = this._schema(type, this.hass.localize);

    return html`<ha-card>
      <div class="card-content">
        <p>${this.label ? this.label : ""}</p>
        <ha-form
          .hass=${this.hass}
          .data=${data}
          .schema=${schema}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._valueChanged}
        ></ha-form></div
    ></ha-card>`;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;

    const type = value.type;
    if (!type || typeof value !== "object" || Object.keys(value).length === 0) {
      // not sure how this happens, but reject it
      return;
    }

    const oldType = Object.keys(this.value)[0];
    if (type === "manual" && !this._yamlMode) {
      this._yamlMode = true;
      this.requestUpdate();
      return;
    }
    if (type === "manual" && value.manual === undefined) {
      return;
    }
    if (type !== "manual") {
      this._yamlMode = false;
    }
    delete value.type;

    let newValue;
    if (type === "manual") {
      newValue = value.manual;
    } else if (type === oldType) {
      newValue = {
        [type]: { ...(value.manual ? value.manual[oldType] : value) },
      };
    } else {
      newValue = { [type]: { ...SELECTOR_DEFAULTS[type] } };
    }

    fireEvent(this, "value-changed", { value: newValue });
  }

  private _computeLabelCallback = (schema: any): string =>
    this.hass.localize(
      `ui.components.selectors.selector.${schema.name}` as LocalizeKeys
    ) || schema.name;

  static styles = css`
    :host {
      --expansion-panel-summary-padding: 0 16px;
    }
    ha-alert {
      display: block;
      margin-bottom: 16px;
    }
    ha-card {
      margin: 0 0 16px 0;
    }
    ha-card.disabled {
      pointer-events: none;
      color: var(--disabled-text-color);
    }
    .card-content {
      padding: 0px 16px 16px 16px;
    }
    .title {
      font-size: var(--ha-font-size-l);
      padding-top: 16px;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 16px;
      padding-left: 16px;
      padding-right: 4px;
      padding-inline-start: 16px;
      padding-inline-end: 4px;
      white-space: nowrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-selector": HaSelectorSelector;
  }
}
