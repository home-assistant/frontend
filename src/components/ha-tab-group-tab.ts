import Tab from "@home-assistant/webawesome/dist/components/tab/tab";
import { css, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-tab-group-tab")
// @ts-ignore
export class HaTabGroupTab extends Tab {
  static get styles(): CSSResultGroup {
    return [
      Tab.styles,
      css`
        :host {
          font-size: var(--ha-font-size-m);
          --wa-color-brand-on-quiet: var(
            --ha-tab-active-text-color,
            var(--primary-color)
          );
2
          --wa-color-neutral-on-quiet: var(--wa-color-brand-on-quiet);
          opacity: 0.8;

          color: inherit;
        }

        :host([active]:not([disabled])) {
          opacity: 1;
        }

        @media (hover: hover) {
          :host(:hover:not([disabled]):not([active])) .tab {
            color: var(--wa-color-brand-on-quiet);
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    // @ts-ignore
    "ha-tab-group-tab": HaTabGroupTab;
  }
}
