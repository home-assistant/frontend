import { LitElement, html, nothing, css } from "lit";
import { customElement, state } from "lit/decorators";
import type { TemplateResult } from "lit";
import type { ContextType } from "@lit/context";
import { consume } from "@lit/context";
import { dump } from "js-yaml";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-code-editor";
import "../../../../../components/ha-dialog";
import { internationalizationContext } from "../../../../../data/context";

export interface SSDPRawDataDialogParams {
  key: string;
  data: Record<string, unknown>;
}

@customElement("dialog-ssdp-raw-data")
class DialogSSDPRawData extends LitElement {
  @state() private _params?: SSDPRawDataDialogParams;

  @state() private _open = false;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  public async showDialog(params: SSDPRawDataDialogParams): Promise<void> {
    this._params = params;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${`${this._i18n.localize("ui.panel.config.ssdp.raw_data_title")}: ${this._params.key}`}
        @closed=${this._dialogClosed}
      >
        <ha-code-editor
          mode="yaml"
          .value=${dump(this._params.data)}
          read-only
          autofocus
        ></ha-code-editor>
      </ha-dialog>
    `;
  }

  static styles = css`
    ha-code-editor {
      --code-mirror-max-height: 60vh;
      --code-mirror-height: auto;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-ssdp-raw-data": DialogSSDPRawData;
  }
}
