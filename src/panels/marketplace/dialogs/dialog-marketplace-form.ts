import { consume, type ContextType } from "@lit/context";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/progress/ha-progress-bar";
import { internationalizationContext } from "../../../data/context";
import { websocketErrorMessage } from "../../../data/marketplace/websocket";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import type { MarketplaceFormDialogParams } from "./show-dialog-marketplace";

@customElement("dialog-marketplace-form")
class DialogMarketplaceForm extends DialogMixin<MarketplaceFormDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state() private _waiting?: boolean;

  @state() private _error?: string;

  protected render() {
    if (!this.params) {
      return nothing;
    }
    return html`
      <ha-dialog open .headerTitle=${this.params.title}>
        <div>
          ${this.params.description || nothing}
          ${
            this._error
              ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
              : nothing
          }
          ${
            this._waiting
              ? html`<ha-progress-bar indeterminate></ha-progress-bar>`
              : nothing
          }
        </div>
        ${
          this.params.saveAction
            ? html`<ha-dialog-footer slot="footer">
                <ha-button
                  slot="secondaryAction"
                  appearance="plain"
                  @click=${this.closeDialog}
                >
                  ${this._i18n.localize("ui.panel.marketplace.common.cancel")}
                </ha-button>
                <ha-button
                  slot="primaryAction"
                  appearance="filled"
                  variant=${this.params.destructive ? "danger" : "brand"}
                  .disabled=${!!this._waiting}
                  @click=${this._saveClicked}
                >
                  ${
                    this.params.saveLabel ||
                    this._i18n.localize("ui.panel.marketplace.common.save")
                  }
                </ha-button>
              </ha-dialog-footer>`
            : nothing
        }
      </ha-dialog>
    `;
  }

  private async _saveClicked(): Promise<void> {
    if (!this.params?.saveAction) {
      return;
    }
    this._error = undefined;
    this._waiting = true;

    let error: string | undefined;
    try {
      await this.params.saveAction();
    } catch (err: unknown) {
      error =
        websocketErrorMessage(err) ||
        this._i18n.localize("ui.panel.marketplace.common.unknown_error");
    }

    // The dialog can be closed while the action runs.
    if (!this.isConnected) {
      return;
    }

    this._waiting = false;

    if (error) {
      this._error = error;
      return;
    }

    // Errors can also arrive through the error subscription meanwhile.
    if (!this._error) {
      this.closeDialog();
    }
  }

  static styles: CSSResultGroup = css`
    ha-alert {
      display: block;
      margin-top: var(--ha-space-2);
    }
    ha-progress-bar {
      margin-block-end: calc(-1 * var(--ha-space-2));
      margin-block-start: var(--ha-space-1);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-marketplace-form": DialogMarketplaceForm;
  }
}
