import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-attributes";
import type { HomeAssistant } from "../../../types";
import "../../../components/ha-assist-chat";
import "../../../components/ha-spinner";
import "../../../components/ha-alert";
import type { AssistPipeline } from "../../../data/assist_pipeline";
import { getAssistPipeline } from "../../../data/assist_pipeline";

@customElement("more-info-conversation")
class MoreInfoConversation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() public _pipeline?: AssistPipeline;

  @state() private _errorLoadAssist?: "not_found" | "unknown";

  protected willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (!changedProperties.has("stateObj") || !this.stateObj) {
      return;
    }

    const oldStateObj = changedProperties.get("stateObj") as
      | HassEntity
      | undefined;

    if (!oldStateObj || oldStateObj.entity_id !== this.stateObj.entity_id) {
      this._getPipeline();
    }
  }

  private async _getPipeline() {
    this._pipeline = undefined;
    this._errorLoadAssist = undefined;
    const pipelineId = this.stateObj!.entity_id;
    try {
      const pipeline = await getAssistPipeline(this.hass, pipelineId);
      // Verify the pipeline is still the same.
      if (this.stateObj && pipelineId === this.stateObj.entity_id) {
        this._pipeline = pipeline;
      }
    } catch (e: any) {
      if (this.stateObj && pipelineId !== this.stateObj.entity_id) {
        return;
      }

      if (e.code === "not_found") {
        this._errorLoadAssist = "not_found";
      } else {
        this._errorLoadAssist = "unknown";
        // eslint-disable-next-line no-console
        console.error(e);
      }
    }
  }

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    return html`
      ${this._errorLoadAssist
        ? html`<ha-alert alert-type="error">
            ${this.hass.localize(
              `ui.dialogs.voice_command.${this._errorLoadAssist}_error_load_assist`
            )}
          </ha-alert>`
        : this._pipeline
          ? html`
              <ha-assist-chat
                .hass=${this.hass}
                .pipeline=${this._pipeline}
                disable-speech
              ></ha-assist-chat>
            `
          : html`<div class="pipelines-loading">
              <ha-spinner size="large"></ha-spinner>
            </div>`}
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex: 1;
    }
    ha-assist-chat {
      flex: 1;
      min-height: 400px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-conversation": MoreInfoConversation;
  }
}
