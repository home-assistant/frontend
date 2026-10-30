import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { consume } from "../../common/decorators/consume";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import { transform } from "../../common/decorators/transform";
import type { LocalizeFunc } from "../../common/translations/localize";
import { formattersContext } from "../../data/context";
import type { HomeAssistantFormatters } from "../../types";
import "../ha-relative-time";
import "../ha-tooltip";
import "./state-badge";

@customElement("state-info")
class StateInfo extends LitElement {
  @property({ attribute: false }) public stateObj?: HassEntity;

  @property({ attribute: "in-dialog", type: Boolean }) public inDialog = false;

  @property() public color?: string;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  @transform<
    HomeAssistantFormatters,
    HomeAssistantFormatters["formatEntityName"] | undefined
  >({
    transformer: (formatters) => formatters?.formatEntityName,
  })
  private _formatEntityName?: HomeAssistantFormatters["formatEntityName"];

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  protected render() {
    if (!this.stateObj || !this._formatEntityName) {
      return nothing;
    }

    const name = this._formatEntityName(this.stateObj, { type: "entity" });

    // Inline style because the state-badge color API only colors active entities
    return html`<state-badge
        .stateObj=${this.stateObj}
        .stateColor=${!this.color}
        style=${styleMap({ color: this.color })}
      ></state-badge>
      <div class="info">
        <div class="name ${this.inDialog ? "in-dialog" : ""}" .title=${name}>
          ${name}
        </div>
        ${
          this.inDialog
            ? html`<div class="time-ago">
                <ha-tooltip for="relative-time">
                  <div class="row">
                    <span class="column-name">
                      ${this._localize(
                        "ui.dialogs.more_info_control.last_changed"
                      )}:
                    </span>
                    <ha-relative-time
                      .datetime=${this.stateObj.last_changed}
                      capitalize
                    ></ha-relative-time>
                  </div>
                  <div class="row">
                    <span>
                      ${this._localize(
                        "ui.dialogs.more_info_control.last_updated"
                      )}:
                    </span>
                    <ha-relative-time
                      .datetime=${this.stateObj.last_updated}
                      capitalize
                    ></ha-relative-time>
                  </div>
                </ha-tooltip>
                <ha-relative-time
                  id="relative-time"
                  .datetime=${this.stateObj.last_changed}
                  capitalize
                ></ha-relative-time>
              </div>`
            : html`<div class="extra-info"><slot></slot></div>`
        }
      </div>`;
  }

  static styles = css`
    :host {
      min-width: 120px;
      white-space: nowrap;
      display: flex;
      align-items: center;
    }

    state-badge {
      flex: none;
    }

    .info {
      margin-left: 8px;
      margin-inline-start: 8px;
      margin-inline-end: initial;
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 100%;
      min-width: 0;
      text-align: var(--float-start);
      position: relative;
    }

    .name {
      color: var(--primary-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .name.in-dialog,
    :host([secondary-line]) .name {
      line-height: var(--ha-line-height-condensed);
    }

    .time-ago,
    .extra-info,
    .extra-info > * {
      color: var(--secondary-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .row {
      display: flex;
      flex-direction: row;
      flex-wrap: no-wrap;
      width: 100%;
      justify-content: space-between;
      margin: 0 2px 4px 0;
    }

    .row:last-child {
      margin-bottom: 0px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "state-info": StateInfo;
  }
}
