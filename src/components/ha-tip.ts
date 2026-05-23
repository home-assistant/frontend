import { consume } from "@lit/context";
import { mdiLightbulbOutline } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { transform } from "../common/decorators/transform";
import type { LocalizeFunc } from "../common/translations/localize";
import { internationalizationContext } from "../data/context";
import type { HomeAssistantInternationalization } from "../types";

import "./ha-svg-icon";

@customElement("ha-tip")
class HaTip extends LitElement {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, LocalizeFunc>({
    transformer: ({ localize }) => localize,
  })
  private _localize!: LocalizeFunc;

  public render() {
    if (!this._localize) {
      return nothing;
    }

    return html`
      <ha-svg-icon .path=${mdiLightbulbOutline}></ha-svg-icon>
      <span class="prefix">${this._localize("ui.panel.config.tips.tip")}</span>
      <span class="text"><slot></slot></span>
    `;
  }

  static styles = css`
    :host {
      display: block;
      text-align: center;
    }

    .text {
      direction: var(--direction);
      margin-left: 2px;
      margin-inline-start: 2px;
      margin-inline-end: initial;
      color: var(--secondary-text-color);
    }

    .prefix {
      font-weight: var(--ha-font-weight-medium);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tip": HaTip;
  }
}
