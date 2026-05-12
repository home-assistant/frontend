import { consume, type ContextType } from "@lit/context";
import { html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import { internationalizationContext } from "../../../data/context";
import { domainToName } from "../../../data/integration";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import type { SingleConfigEntryWarningDialogParams } from "./show-single-config-entry-warning";

@customElement("dialog-single-config-entry-warning")
class DialogShortcuts extends DialogMixin<SingleConfigEntryWarningDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state() private _backendLocalize?: LocalizeFunc;

  connectedCallback() {
    super.connectedCallback();
    this._loadBackendLocalize();
  }

  protected render() {
    if (!this.params || !this._backendLocalize) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        .headerTitle=${this._i18n.localize(
          "ui.panel.config.integrations.config_flow.single_config_entry_title"
        )}
      >
        ${this._i18n.localize(
          "ui.panel.config.integrations.config_flow.single_config_entry",
          {
            integration_name: html`<b
              >${domainToName(this._backendLocalize, this.params.domain)}</b
            >`,
          }
        )}

        <ha-dialog-footer slot="footer">
          <ha-button
            appearance="plain"
            slot="secondaryAction"
            @click=${this.closeDialog}
          >
            ${this._i18n.localize("ui.common.close")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            .href=${`/config/integrations/integration/${this.params.domain}`}
          >
            ${this._i18n.localize(
              "ui.panel.config.integrations.config_flow.show_integration"
            )}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private async _loadBackendLocalize() {
    if (!this.params) {
      return;
    }

    this._backendLocalize = await this._i18n.loadBackendTranslation(
      "title",
      this.params.domain
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-single-config-entry-warning": DialogShortcuts;
  }
}
