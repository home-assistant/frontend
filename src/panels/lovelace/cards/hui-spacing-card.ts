import type { PropertyValues } from "lit";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators";
import "../../../components/ha-card";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import type { LovelaceCard, LovelaceCardEditor } from "../types";

@customElement("hui-spacing-card")
export class HuiSpacingCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-spacing-card-editor");
    return document.createElement("hui-spacing-card-editor");
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  public getCardSize(): number {
    return 1;
  }

  public setConfig(): void {
    // No config necessary
  }

  protected render() {
    return html`<ha-card></ha-card>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-spacing-card": HuiSpacingCard;
  }
}
