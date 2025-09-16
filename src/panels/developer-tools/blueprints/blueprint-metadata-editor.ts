import { nothing, LitElement, html, type CSSResultGroup, css } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-yaml-editor";
import "../../../components/ha-textfield";
import "../../../components/ha-button";
import "../../../components/ha-card";
import type { HomeAssistant } from "../../../types";
import "./ha-blueprint-editor";
import type {
  BlueprintMetaDataEditorSchema,
} from "../../../data/blueprint";
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

  @property({ attribute: false }) public metadata?: BlueprintMetaDataEditorSchema;

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
      <div class="container">
        <div class="header">
          <h2 class="name">
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.blueprints.editor.metadata"
            )}
          </h2>
        </div>
        <div class="content">
          <ha-form
            .hass=${this.hass}
            .data=${this.metadata}
            .schema=${SCHEMA}
            .computeLabel=${this._computeLabel}
          ></ha-form>
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          margin: 0 auto;
          max-width: 1040px;
          padding: 28px 20px 0;
        }

        .header {
          margin-top: 16px;
          display: flex;
          align-items: center;
        }

        .header:first-child {
          margin-top: -16px;
        }

        .header .name {
          font-weight: var(--ha-font-weight-normal);
          flex: 1;
          margin-bottom: 8px;
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
