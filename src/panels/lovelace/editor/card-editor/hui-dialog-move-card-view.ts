import "@polymer/paper-item/paper-item";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  internalProperty,
  TemplateResult,
} from "lit-element";
import "../../components/hui-views-list";
import { moveCard } from "../config-util";
import type { MoveCardViewDialogParams } from "./show-move-card-view-dialog";
import { haStyleDialog } from "../../../../resources/styles";
import { createCloseHeading } from "../../../../components/ha-dialog";
import { HomeAssistant } from "../../../../types";

@customElement("hui-dialog-move-card-view")
export class HuiDialogMoveCardView extends LitElement {
  public hass!: HomeAssistant;

  @internalProperty() private _params?: MoveCardViewDialogParams;

  public showDialog(params: MoveCardViewDialogParams): void {
    this._params = params;
  }

  public closeDialog(): void {
    this._params = undefined;
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        hideActions
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.lovelace.editor.move_card.header")
        )}
      >
        <hui-views-list
          .lovelaceConfig=${this._params!.lovelace.config}
          .selected=${this._params!.path![0]}
          @view-selected=${this._moveCard}
        >
        </hui-views-list>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        paper-item {
          margin: 8px;
          cursor: pointer;
        }
        paper-item[active] {
          color: var(--primary-color);
        }
        paper-item[active]:before {
          border-radius: 4px;
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          pointer-events: none;
          content: "";
          background-color: var(--primary-color);
          opacity: 0.12;
          transition: opacity 15ms linear;
          will-change: opacity;
        }
      `,
    ];
  }

  private _moveCard(e: CustomEvent): void {
    const newView = e.detail.view;
    const path = this._params!.path!;
    if (newView === path[0]) {
      return;
    }

    const lovelace = this._params!.lovelace!;
    lovelace.saveConfig(moveCard(lovelace.config, path, [newView!]));
    this.closeDialog();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-move-card-view": HuiDialogMoveCardView;
  }
}
