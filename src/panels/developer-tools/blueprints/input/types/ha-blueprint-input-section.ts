import { customElement, property } from "lit/decorators";
import { css, type CSSResultGroup, html, LitElement } from "lit";
import type { HomeAssistant } from "../../../../../types";
import type { BlueprintInputSection } from "../../../../../data/blueprint";
import "../../../../../components/ha-textarea";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-select";
import "@material/mwc-list/mwc-list-item";
import "../../../../../components/ha-selector/ha-selector";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import { haStyle } from "../../../../../resources/styles";

import "../ha-blueprint-input";

@customElement("ha-blueprint-input-section")
export class HaBlueprintInputSection extends LitElement {
  public static get defaultConfig(): BlueprintInputSection {
    return {
      name: "",
      description: "",
      collapsed: false,
      icon: "",
      input: {},
    };
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) input!: BlueprintInputSection;

  @property({ type: Boolean }) public disabled = false;

  private _schema = [
    {
      name: "name",
      type: "string",
    },
    {
      name: "description",
      type: "string",
    },
    {
      name: "collapsed",
      type: "boolean",
    },
    {
      name: "icon",
      selector: { icon: {} },
    },
  ] as const;

  private _inputChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const input = ev.detail.value.reduce(
      (acc, [key, i]) => ({ ...acc, [key]: i }),
      {}
    );
    fireEvent(this, "value-changed", {
      value: { ...this.input, input },
    });
  }

  private _settingsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        ...ev.detail.value,
        input: this.input.input,
      },
    });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<typeof this._schema>
  ): string =>
    this.hass.localize(
      `ui.panel.developer-tools.tabs.blueprints.editor.inputs.type.section.${schema.name}`
    );

  protected render() {
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.input}
        .schema=${this._schema}
        .disabled=${this.disabled}
        @value-changed=${this._settingsChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
      <ha-blueprint-input
        .inputs=${Object.entries(this.input?.input || {})}
        @value-changed=${this._inputChanged}
        .hass=${this.hass}
        .disabled=${this.disabled}
      >
      </ha-blueprint-input>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-blueprint-input {
          display: block;
          margin-top: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-input-section": HaBlueprintInputSection;
  }
}
