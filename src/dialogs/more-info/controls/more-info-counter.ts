import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-button";
import { apiContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { HomeAssistantApi } from "../../../types";

@customElement("more-info-counter")
class MoreInfoCounter extends LitElement {
  @property({ attribute: false }) public stateObj?: HassEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  protected render() {
    if (!this._localize || !this.stateObj) {
      return nothing;
    }

    const disabled = this.stateObj.state === UNAVAILABLE;

    return html`
      <div class="actions">
        <ha-button
          appearance="plain"
          size="s"
          .action=${"increment"}
          @click=${this._handleActionClick}
          .disabled=${disabled ||
          Number(this.stateObj.state) === this.stateObj.attributes.maximum}
        >
          ${this._localize("ui.card.counter.actions.increment")}
        </ha-button>
        <ha-button
          appearance="plain"
          size="s"
          .action=${"decrement"}
          @click=${this._handleActionClick}
          .disabled=${disabled ||
          Number(this.stateObj.state) === this.stateObj.attributes.minimum}
        >
          ${this._localize("ui.card.counter.actions.decrement")}
        </ha-button>
        <ha-button
          appearance="plain"
          size="s"
          .action=${"reset"}
          @click=${this._handleActionClick}
          .disabled=${disabled}
        >
          ${this._localize("ui.card.counter.actions.reset")}
        </ha-button>
      </div>
    `;
  }

  private _handleActionClick(e: MouseEvent): void {
    const action = (e.currentTarget as any).action;
    this._api.callService("counter", action, {
      entity_id: this.stateObj!.entity_id,
    });
  }

  static styles = css`
    .actions {
      margin: var(--ha-space-2) 0;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-counter": MoreInfoCounter;
  }
}
