import type { CSSResultGroup } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/ha-form/ha-form";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCardEditor } from "../../types";
import { configElementStyle } from "./config-elements-style";
import type { SchemaUnion } from "../../../../components/ha-form/types";

const SCHEMA = [
  {
    name: "description",
    type: "constant",
  },
] as const;

@customElement("hui-spacing-card-editor")
export class HuiSpacingCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  public setConfig(): void {
    // No config necessary
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${{}}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    if (schema.name === "description") {
      return this.hass!.localize(
        "ui.panel.lovelace.editor.card.spacing.no_config_options"
      );
    }
    return this.hass!.localize(
      `ui.panel.lovelace.editor.card.generic.${schema.name}`
    );
  };

  static styles: CSSResultGroup = configElementStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-spacing-card-editor": HuiSpacingCardEditor;
  }
}
