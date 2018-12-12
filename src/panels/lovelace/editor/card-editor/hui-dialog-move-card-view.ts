import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
import "@polymer/paper-listbox/paper-listbox";

import { hassLocalizeLitMixin } from "../../../../mixins/lit-localize-mixin";
import { Lovelace } from "../../types";
import { moveCard } from "../config-util";

export class HuiDialogMoveCardView extends hassLocalizeLitMixin(LitElement) {
  private lovelace?: Lovelace;
  private path?: [number, number];
  private newView?: number;

  static get properties(): PropertyDeclarations {
    return {};
  }

  public async showDialog(params): Promise<void> {
    this.lovelace = params.lovelace;
    this.path = params.path;
    this.newView = this.path![0];
    await this.updateComplete;
  }

  protected render(): TemplateResult {
    return html`
      <style>
        paper-radio-button {
          display: block;
        }
        paper-listbox {
          background: var(
            --paper-dialog-background-color,
            var(--primary-background-color)
          );
        }
      </style>
      <paper-dialog with-backdrop opened>
        <h2>Move card to view</h2>
        <paper-listbox>
          <paper-radio-group
            @selected-changed="${this._updateNewView}"
            .selected="${this.path![0]}"
          >
            ${
              this.lovelace!.config.views.map((view, index) => {
                return html`
                  <paper-radio-button .name="${index}"
                    >${view.title}</paper-radio-button
                  >
                `;
              })
            }
          </paper-radio-group>
        </paper-listbox>
        <div class="paper-dialog-buttons">
          <paper-button dialog-confirm @click="${this._moveCard}"
            >Ok</paper-button
          >
        </div>
      </paper-dialog>
    `;
  }

  private _moveCard(): void {
    const lovelace = this.lovelace!;
    const path = this.path!;
    if (this.newView === this.path![0]) {
      return;
    }
    lovelace.saveConfig(moveCard(lovelace.config, path, [this.newView!]));
  }

  private _updateNewView(e: Event): void {
    this.newView = (e.currentTarget! as any).selected;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-move-card-view": HuiDialogMoveCardView;
  }
}

customElements.define("hui-dialog-move-card-view", HuiDialogMoveCardView);
