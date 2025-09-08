import Drawer from "@awesome.me/webawesome/dist/components/drawer/drawer";
import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-bottom-sheet")
export class HaBottomSheet extends Drawer {
  @property({ type: Boolean, attribute: "without-header" })
  public withoutHeader = true;

  @property({ type: String })
  public placement: "top" | "end" | "bottom" | "start" = "bottom";

  static get styles(): CSSResultGroup {
    return [
      Drawer.styles,
      css`
        :host {
          --wa-color-surface-raised: var(
            --ha-dialog-surface-background,
            var(--mdc-theme-surface, #fff)
          );
          --spacing: 0;
          --size: auto;
          --show-duration: 180ms;
          --hide-duration: 180ms;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bottom-sheet": HaBottomSheet;
  }
}
