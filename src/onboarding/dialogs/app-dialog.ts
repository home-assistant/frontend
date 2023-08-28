import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { LocalizeFunc } from "../../common/translations/localize";
import "../../components/ha-dialog";
import { fireEvent } from "../../common/dom/fire_event";

@customElement("app-dialog")
class DialogApp extends LitElement {
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
    return html`<ha-dialog open @closed=${this.closeDialog}>
      <h1>Download app</h1>
      <p>Apps</p>
    </ha-dialog>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-dialog": DialogApp;
  }
}
