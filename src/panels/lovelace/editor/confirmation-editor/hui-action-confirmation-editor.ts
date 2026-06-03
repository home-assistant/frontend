import { css, html } from "lit";
import { customElement } from "lit/decorators";
import "../../../../components/ha-alert";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import "../../../../components/user/ha-users-picker";
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

    const defaultText = actionConfig
      ? await getConfirmationDefaultText(this.hass, actionConfig)
      : undefined;

    const defaultTitle = localize(
      "ui.dialogs.generic.default_confirmation_title"
    );

    const helpers: Record<string, string | undefined> = {
      title: defaultTitle,
      text: defaultText,
      confirm_text: localize("ui.common.ok"),
      dismiss_text: localize("ui.common.cancel"),
    };

    return {
      schema: [
        { name: "title", selector: { text: {} } },
        { name: "text", selector: { text: {} } },
        { name: "confirm_text", selector: { text: {} } },
        { name: "dismiss_text", selector: { text: {} } },
      ] as HaFormSchema[],
      computeLabel: (schema) =>
        localize(
          `ui.panel.lovelace.editor.action-editor.confirmation.${schema.name}` as any
        ),
      computeHelper: (schema) => {
        const value = helpers[schema.name];
        if (!value) return undefined;
        return localize(
          "ui.panel.lovelace.editor.action-editor.confirmation.default_value" as any,
          { value }
        );
      },
    };
  }

  protected override renderConfigElement() {
    const exemptionIds = this.value?.exemptions?.map((e) => e.user) ?? [];

    return html`
      ${super.renderConfigElement()}
      <div class="exemptions">
        <ha-users-picker
          .hass=${this.hass}
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.action-editor.confirmation.exemptions"
          )}
          .value=${exemptionIds}
          @value-changed=${this._exemptionsChanged}
        ></ha-users-picker>
      </div>
    `;
  }

  private _exemptionsChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const ids: string[] = ev.detail.value;
    const exemptions = ids.length ? ids.map((id) => ({ user: id })) : undefined;
    this.value = { ...this.value, exemptions } as ConfirmationRestrictionConfig;
  }

  static override styles = [
    HuiElementEditor.styles,
    css`
      .exemptions {
        margin-top: var(--ha-space-4);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-action-confirmation-editor": HuiActionConfirmationEditor;
  }
}
