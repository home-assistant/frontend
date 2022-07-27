import "@polymer/paper-item";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-icon-next";
import { localizeConfigFlowTitle } from "../../data/config_flow";
import { DataEntryFlowProgress } from "../../data/data_entry_flow";
import { domainToName } from "../../data/integration";
import { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import { FlowConfig } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";

@customElement("step-flow-pick-flow")
class StepFlowPickFlow extends LitElement {
  public flowConfig!: FlowConfig;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public flowsInProgress!: DataEntryFlowProgress[];

  @property() public handler!: string;

  protected render(): TemplateResult {
    return html`
      <h2>
        ${this.hass.localize(
          "ui.panel.config.integrations.config_flow.pick_flow_step.title"
        )}
      </h2>

      <div>
        ${this.flowsInProgress.map(
          (flow) => html` <paper-icon-item
            @click=${this._flowInProgressPicked}
            .flow=${flow}
          >
            <img
              slot="item-icon"
              loading="lazy"
              src=${brandsUrl({
                domain: flow.handler,
                type: "icon",
                useFallback: true,
                darkOptimized: this.hass.themes?.darkMode,
              })}
              referrerpolicy="no-referrer"
            />

            <paper-item-body>
              ${localizeConfigFlowTitle(this.hass.localize, flow)}
            </paper-item-body>
            <ha-icon-next></ha-icon-next>
          </paper-icon-item>`
        )}
        <paper-item @click=${this._startNewFlowPicked} .handler=${this.handler}>
          <paper-item-body>
            ${this.hass.localize(
              "ui.panel.config.integrations.config_flow.pick_flow_step.new_flow",
              "integration",
              domainToName(this.hass.localize, this.handler)
            )}
          </paper-item-body>
          <ha-icon-next></ha-icon-next>
        </paper-item>
      </div>
    `;
  }

  private _startNewFlowPicked(ev) {
    this._startFlow(ev.currentTarget.handler);
  }

  private _startFlow(handler: string) {
    fireEvent(this, "flow-update", {
      stepPromise: this.flowConfig.createFlow(this.hass, handler),
    });
  }

  private _flowInProgressPicked(ev) {
    const flow: DataEntryFlowProgress = ev.currentTarget.flow;
    fireEvent(this, "flow-update", {
      stepPromise: this.flowConfig.fetchFlow(this.hass, flow.flow_id),
    });
  }

  static get styles(): CSSResultGroup {
    return [
      configFlowContentStyles,
      css`
        img {
          width: 40px;
          height: 40px;
        }
        ha-icon-next {
          margin-right: 8px;
        }
        div {
          overflow: auto;
          max-height: 600px;
          margin: 16px 0;
        }
        h2 {
          padding-inline-end: 66px;
          direction: var(--direction);
        }
        @media all and (max-height: 900px) {
          div {
            max-height: calc(100vh - 134px);
          }
        }
        paper-icon-item,
        paper-item {
          cursor: pointer;
          margin-bottom: 4px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-pick-flow": StepFlowPickFlow;
  }
}
