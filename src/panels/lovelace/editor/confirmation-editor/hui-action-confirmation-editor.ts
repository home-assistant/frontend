import { css, html } from "lit";
import { customElement } from "lit/decorators";
import "../../../../components/ha-alert";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import type { ConfirmationRestrictionConfig } from "../../../../data/lovelace/config/action";
import type { LovelaceConfigForm } from "../../types";
import { HuiElementEditor } from "../hui-element-editor";

const CONFIRMATION_SCHEMA = [
  {
    name: "title",
    selector: { text: {} },
  },
  {
    name: "text",
    selector: { text: {} },
  },
  {
    name: "confirm_text",
    selector: { text: {} },
  },
  {
    name: "dismiss_text",
    selector: { text: {} },
  },
] as const satisfies readonly HaFormSchema[];

@customElement("hui-action-confirmation-editor")
export class HuiActionConfirmationEditor extends HuiElementEditor<ConfirmationRestrictionConfig> {
  protected async getConfigForm(): Promise<LovelaceConfigForm | undefined> {
    return {
      schema: CONFIRMATION_SCHEMA as unknown as HaFormSchema[],
      computeLabel: (schema, localize) =>
        localize(
          `ui.panel.lovelace.editor.action-editor.confirmation.${schema.name}` as any
        ),
      computeHelper: (schema, localize) => {
        const key = `ui.panel.lovelace.editor.action-editor.confirmation.${schema.name}_placeholder`;
        const translated = localize(key as any);
        return translated !== key ? translated : undefined;
      },
    };
  }

  protected override renderConfigElement() {
    return html`
      ${super.renderConfigElement()}
      <ha-alert alert-type="info">
        ${this.hass?.localize(
          "ui.panel.lovelace.editor.action-editor.confirmation.exemptions_hint"
        )}
      </ha-alert>
    `;
  }

  static override styles = [
    HuiElementEditor.styles,
    css`
      ha-alert {
        display: block;
        margin-top: var(--ha-space-2);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-action-confirmation-editor": HuiActionConfirmationEditor;
  }
}
