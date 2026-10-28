import type { HassEntity } from "home-assistant-js-websocket";
import "../components/entity/state-info";
import "../components/ha-button";
import { customElement, property, state } from "lit/decorators";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import type { HomeAssistantFormatters } from "../types";
import { haStyle } from "../resources/styles";
import { consume } from "../common/decorators/consume";
import { transform } from "../common/decorators/transform";
import { formattersContext } from "../data/context";

@customElement("state-card-configurator")
class StateCardConfigurator extends LitElement {
  @state()
  @consume({ context: formattersContext, subscribe: true })
  @transform<
    HomeAssistantFormatters,
    HomeAssistantFormatters["formatEntityState"] | undefined
  >({
    transformer: (formatters) => formatters?.formatEntityState,
  })
  private _formatEntityState?: HomeAssistantFormatters["formatEntityState"];

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: "in-dialog", type: Boolean }) public inDialog = false;

  protected render(): TemplateResult {
    return html`
      <div class="horizontal justified layout">
        <state-info
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        ${
          this.inDialog
            ? html`<ha-button appearance="plain" size="s"
                >${this._formatEntityState?.(this.stateObj)}</ha-button
              >`
            : nothing
        }
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-button {
          top: 3px;
          height: 37px;
          margin-right: -0.57em;
          margin-inline-end: -0.57em;
          margin-inline-start: initial;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-configurator": StateCardConfigurator;
  }
}
