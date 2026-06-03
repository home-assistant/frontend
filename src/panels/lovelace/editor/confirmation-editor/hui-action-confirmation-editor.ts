import { css, html } from "lit";
import { customElement } from "lit/decorators";
import "../../../../components/ha-alert";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import type {
  ActionConfig,
  ConfirmationRestrictionConfig,
} from "../../../../data/lovelace/config/action";
import { getConfirmationDefaultText } from "../../common/confirmation-default-text";
import type { LovelaceConfigForm } from "../../types";
import { HuiElementEditor } from "../hui-element-editor";

interface ConfirmationEditorContext {
  label?: string;
  actionConfig?: ActionConfig;
}

@customElement("hui-action-confirmation-editor")
export class HuiActionConfirmationEditor extends HuiElementEditor<
  ConfirmationRestrictionConfig,
  ConfirmationEditorContext
> {
  protected async getConfigForm(): Promise<LovelaceConfigForm | undefined> {
    const localize = this.hass.localize.bind(this.hass);
    const actionConfig = this.context?.actionConfig;

    const textPlaceholder = actionConfig
      ? await getConfirmationDefaultText(this.hass, actionConfig)
      : undefined;

    return {
      schema: [
        {
          name: "title",
          selector: {
            text: {
              placeholder: localize(
                "ui.dialogs.generic.default_confirmation_title"
              ),
            },
          },
        },
        {
          name: "text",
          selector: {
            text: {
              ...(textPlaceholder ? { placeholder: textPlaceholder } : {}),
            },
          },
        },
        {
          name: "confirm_text",
          selector: {
            text: { placeholder: localize("ui.common.ok") },
          },
        },
        {
          name: "dismiss_text",
          selector: {
            text: { placeholder: localize("ui.common.cancel") },
          },
        },
      ] as HaFormSchema[],
      computeLabel: (schema) =>
        localize(
          `ui.panel.lovelace.editor.action-editor.confirmation.${schema.name}` as any
        ),
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
