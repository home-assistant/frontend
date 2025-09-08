import TabGroup from "@home-assistant/webawesome/dist/components/tab-group/tab-group";
import { css, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-tab-group")
export class HaTabGroup extends TabGroup {
  @property({ attribute: "tab-tag" }) override tabTag = "ha-tab-group-tab";

  static get styles(): CSSResultGroup {
    return [
      TabGroup.styles,
      css`
        :host {
          --track-width: 2px;
          --track-color: var(--ha-tab-track-color, var(--divider-color));
          --indicator-color: var(
            --ha-tab-indicator-color,
            var(--primary-color)
          );
        }

        .tab-group-top ::slotted(ha-tab-group-tab[active]) {
          border-block-end: solid var(--track-width) var(--indicator-color);
          margin-block-end: calc(-1 * var(--track-width));
        }

        .tab-group-start ::slotted(ha-tab-group-tab[active]) {
          border-inline-end: solid var(--track-width) var(--indicator-color);
          margin-inline-end: calc(-1 * var(--track-width));
        }

        .tab-group-end ::slotted(ha-tab-group-tab[active]) {
          border-inline-start: solid var(--track-width) var(--indicator-color);
          margin-inline-start: calc(-1 * var(--track-width));
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    // @ts-ignore
    "ha-tab-group": HaTabGroup;
  }
}
