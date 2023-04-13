import "@material/mwc-button";
import "@material/mwc-list/mwc-list";
import { mdiHelpCircle, mdiPlus } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { property, state } from "lit/decorators";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-list-item";
import "../../../components/ha-settings-row";
import "../../../components/ha-switch";
import {
  fetchVoiceAssistantPipelines,
  VoiceAssistantPipeline,
} from "../../../data/voice_assistant";
import type { HomeAssistant } from "../../../types";

export class AssistPref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _exposeNew?: boolean;

  @state() private _pipelines: VoiceAssistantPipeline[] = [];

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    fetchVoiceAssistantPipelines(this.hass).then((pipelines) => {
      this._pipelines = pipelines;
    });
  }

  protected render() {
    return html`
      <ha-card outlined>
        <h1 class="card-header">Assist</h1>
        <div class="header-actions">
          <a
            href="https://www.home-assistant.io/docs/assist/"
            target="_blank"
            rel="noreferrer"
            class="icon-link"
          >
            <ha-icon-button
              label="Learn how it works"
              .path=${mdiHelpCircle}
            ></ha-icon-button>
          </a>
        </div>
        <div class="card-content">
          <p>[Explanation that you can use multiple backends.]</p>
          <mwc-list>
            ${this._pipelines.map(
              (pipeline) => html`
                <ha-list-item twoline hasMeta role="button">
                  ${pipeline.name}
                  <span slot="secondary">${pipeline.language}</span>
                  <ha-icon-next slot="meta"></ha-icon-next>
                </ha-list-item>
              `
            )}
          </mwc-list>
          <div class="layout horizontal">
            <mwc-button>
              Add assistant
              <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
            </mwc-button>
          </div>
        </div>
        <div class="card-actions">
          <a
            href="/config/voice-assistants/expose?assistants=conversation&historyBack"
          >
            <mwc-button>Manage entities</mwc-button>
          </a>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      a {
        color: var(--primary-color);
      }
      ha-settings-row {
        padding: 0;
      }
      .header-actions {
        position: absolute;
        right: 24px;
        top: 24px;
        display: flex;
        flex-direction: row;
      }
      :host([dir="rtl"]) .header-actions {
        right: auto;
        left: 24px;
      }
      .header-actions .icon-link {
        margin-top: -16px;
        margin-inline-end: 8px;
        margin-right: 8px;
        direction: var(--direction);
        color: var(--secondary-text-color);
      }
      .card-actions {
        display: flex;
      }
      .card-actions a {
        text-decoration: none;
      }
      .card-header {
        display: flex;
        align-items: center;
      }
      img {
        height: 28px;
        margin-right: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-pref": AssistPref;
  }
}

customElements.define("assist-pref", AssistPref);
