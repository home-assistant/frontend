import { mdiDotsHorizontal } from "@mdi/js";
import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-card";
import "../../../components/ha-svg-icon";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceLayoutOptions,
} from "../types";

@customElement("hui-spacing-card")
export class HuiSpacingCard extends LitElement implements LovelaceCard {
  @property({ type: Boolean }) public preview = false;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-spacing-card-editor");
    return document.createElement("hui-spacing-card-editor");
  }

  public getCardSize(): number {
    return 1;
  }

  public getLayoutOptions(): LovelaceLayoutOptions {
    return {
      grid_columns: 1,
      grid_rows: 1,
    };
  }

  public setConfig(): void {
    // No config necessary
  }

  protected render() {
    if (!this.preview) {
      return nothing;
    }

    return html`<ha-card>
      <ha-svg-icon path=${mdiDotsHorizontal}></ha-svg-icon>
    </ha-card>`;
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }

    ha-card {
      background: none;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      --mdc-icon-size: 40px;
      --icon-primary-color: var(--divider-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-spacing-card": HuiSpacingCard;
  }
}
