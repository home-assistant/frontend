import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { LocalizeFunc } from "../../common/translations/localize";
import { fireEvent } from "../../common/dom/fire_event";
import { createCloseHeading } from "../../components/ha-dialog";

@customElement("community-dialog")
class DialogCommunity extends LitElement {
  @property({ attribute: false }) public localize?: LocalizeFunc;

  public async showDialog(params): Promise<void> {
    this.localize = params.localize;
  }

  public async closeDialog(): Promise<void> {
    this.localize = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this.localize) {
      return nothing;
    }
    return html`<ha-dialog
      open
      @closed=${this.closeDialog}
      .heading=${createCloseHeading(
        undefined,
        this.localize("ui.panel.page-onboarding.welcome.community")
      )}
    >
    </ha-dialog>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "community-dialog": DialogCommunity;
  }
}
