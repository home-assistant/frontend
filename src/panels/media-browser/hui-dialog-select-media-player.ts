import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { computeStateName } from "../../common/entity/compute_state_name";
import { stringCompare } from "../../common/string/compare";
import { createCloseHeading } from "../../components/ha-dialog";
import { UNAVAILABLE_STATES } from "../../data/entity";
import { BROWSER_PLAYER } from "../../data/media-player";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import type { SelectMediaPlayerDialogParams } from "./show-select-media-source-dialog";

@customElement("hui-dialog-select-media-player")
export class HuiDialogSelectMediaPlayer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  private _params?: SelectMediaPlayerDialogParams;

  public showDialog(params: SelectMediaPlayerDialogParams): void {
    this._params = params;
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        hideActions
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(`ui.components.media-browser.choose_player`)
        )}
        @closed=${this.closeDialog}
      >
        <mwc-list>
          <mwc-list-item .player=${BROWSER_PLAYER} @click=${this._selectPlayer}
            >${this.hass.localize(
              "ui.components.media-browser.web-browser"
            )}</mwc-list-item
          >
          ${this._params.mediaSources
            .sort((a, b) =>
              stringCompare(computeStateName(a), computeStateName(b))
            )
            .map(
              (source) => html`
                <mwc-list-item
                  .disabled=${UNAVAILABLE_STATES.includes(source.state)}
                  .player=${source.entity_id}
                  @click=${this._selectPlayer}
                  >${computeStateName(source)}</mwc-list-item
                >
              `
            )}
        </mwc-list>
      </ha-dialog>
    `;
  }

  private _selectPlayer(ev: CustomEvent): void {
    const entityId = (ev.currentTarget as any).player;
    this._params!.sourceSelectedCallback(entityId);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0 24px 20px;
        }
        mwc-list-item[disabled] {
          --mdc-theme-text-primary-on-background: var(--disabled-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-select-media-player": HuiDialogSelectMediaPlayer;
  }
}
