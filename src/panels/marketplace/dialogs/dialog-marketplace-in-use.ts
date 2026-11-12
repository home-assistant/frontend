import type { ContextType } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/item/ha-list-item-base";
import "../../../components/list/ha-list-base";
import { internationalizationContext } from "../../../data/context";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type { MarketplaceInUseDialogParams } from "./show-dialog-marketplace-in-use";

@customElement("dialog-marketplace-in-use")
export class DialogMarketplaceInUse extends DialogMixin<MarketplaceInUseDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  protected render() {
    if (!this.params) {
      return nothing;
    }

    const { repository, entries } = this.params;
    const localize = this._i18n.localize;

    return html`
      <ha-dialog
        open
        .headerTitle=${localize("ui.panel.marketplace.dialog.in_use.title", {
          name: repository.name,
        })}
      >
        <p>
          ${localize("ui.panel.marketplace.dialog.in_use.message", {
            name: repository.name,
          })}
        </p>
        <ha-list-base>
          ${entries.map(
            (entry) => html`
              <ha-list-item-base>
                <span slot="headline">${entry.title || repository.name}</span>
                ${
                  entry.source === "ignore"
                    ? html`<span slot="supporting-text">
                        ${localize("ui.panel.marketplace.dialog.in_use.ignored")}
                      </span>`
                    : nothing
                }
              </ha-list-item-base>
            `
          )}
        </ha-list-base>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            href="/config/integrations/integration/${repository.domain}"
            @click=${this.closeDialog}
          >
            ${localize("ui.panel.marketplace.dialog.in_use.view_integration")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            variant="danger"
            @click=${this._confirmDeleteAndUninstall}
          >
            ${localize("ui.panel.marketplace.dialog.in_use.delete_and_uninstall")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private async _confirmDeleteAndUninstall() {
    const { repository, entries, deleteAndUninstall } = this.params!;
    const localize = this._i18n.localize;

    // Deleting the setup can not be undone, so it is asked once more
    const confirmed = await showConfirmationDialog(this, {
      title: localize("ui.panel.marketplace.dialog.in_use.confirm_title", {
        name: repository.name,
      }),
      text: localize("ui.panel.marketplace.dialog.in_use.confirm_message", {
        name: repository.name,
        count: entries.length,
      }),
      confirmText: localize(
        "ui.panel.marketplace.dialog.in_use.delete_and_uninstall"
      ),
      destructive: true,
      action: deleteAndUninstall,
    });

    if (confirmed) {
      this.closeDialog();
    }
  }

  static styles = css`
    p {
      margin-top: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-marketplace-in-use": DialogMarketplaceInUse;
  }
}
