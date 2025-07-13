import { nothing, LitElement, html, type CSSResultGroup, css } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-yaml-editor";
import "../../../components/ha-textfield";
import "../../../components/ha-button";
import "../../../components/ha-card";
import type { HomeAssistant } from "../../../types";
import "./ha-blueprint-editor";
import type { Blueprint } from "../../../data/blueprint";
import type { SchemaUnion } from "../../../components/ha-form/types";
import { haStyle } from "../../../resources/styles";

const SCHEMA = [
  {
    name: "name",
    type: "string",
    required: true,
  },
  {
    name: "path",
    type: "string",
    required: true,
  },
  {
    name: "description",
    type: "string",
  },
  {
    name: "author",
    type: "string",
  },
  {
    name: "minimum_version",
    type: "string",
  },
] as const;

@customElement("blueprint-metadata-editor")
class BlueprintMetadataEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public metadata?: Blueprint["metadata"];

  private _computeLabel(step: SchemaUnion<typeof SCHEMA>) {
    return this.hass.localize(
      `ui.panel.developer-tools.tabs.blueprints.editor.${step.name}.label`
    );
  }

  protected render() {
    if (!this.metadata) {
      return nothing;
    }

    return html`
      <h2>
        ${this.hass.localize(
          "ui.panel.developer-tools.tabs.blueprints.editor.metadata"
        )}
      </h2>
      <div>
        <ha-form
          .hass=${this.hass}
          .data=${this.metadata}
          .schema=${SCHEMA}
          .computeLabel=${this._computeLabel}
        ></ha-form>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        div {
          margin: 0 20px;
        }

        h2 {
          margin: 16px 20px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "blueprint-metadata-editor": BlueprintMetadataEditor;
  }
}
