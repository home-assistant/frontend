import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-circular-progress";
import { UNAVAILABLE } from "../../data/entity";
import { HomeAssistant } from "../../types";
import { AssistantSetupStyles } from "./styles";

@customElement("ha-voice-assistant-setup-step-update")
export class HaVoiceAssistantSetupStepUpdate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public updateEntityId?: string;

  private _updated = false;

  protected override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has("hass") && this.updateEntityId) {
      const oldHass = changedProperties.get("hass") as this["hass"] | undefined;
      if (oldHass) {
        const oldState = oldHass.states[this.updateEntityId];
        const newState = this.hass.states[this.updateEntityId];
        if (
          oldState?.state === UNAVAILABLE &&
          newState?.state !== UNAVAILABLE
        ) {
          // Device is rebooted, let's move on
          this._tryUpdate();
        }
      }
    }

    if (!changedProperties.has("updateEntityId")) {
      return;
    }

    if (!this.updateEntityId) {
      this._nextStep();
      return;
    }

    this._tryUpdate();
  }

  protected override render() {
    const stateObj = this.hass.states[this.updateEntityId!];

    const progressIsNumeric =
      typeof stateObj?.attributes.in_progress === "number";

    return html`<div class="content">
      <img src="/static/icons/casita/loading.png" />
      <h1>Updating your voice assistant</h1>
      <p class="secondary">
        We are making sure you have the latest and greatest version of your
        voice assistant. This may take a few minutes.
      </p>
      <ha-circular-progress
        .value=${progressIsNumeric
          ? stateObj.attributes.in_progress / 100
          : undefined}
        .indeterminate=${!progressIsNumeric}
      ></ha-circular-progress>
      <p>
        ${stateObj.state === "unavailable"
          ? "Restarting voice assistant"
          : progressIsNumeric
            ? `Installing ${stateObj.attributes.in_progress}%`
            : ""}
      </p>
    </div>`;
  }

  private async _tryUpdate() {
    if (!this.updateEntityId) {
      return;
    }
    const updateEntity = this.hass.states[this.updateEntityId];
    if (
      updateEntity &&
      this.hass.states[updateEntity.entity_id].state === "on"
    ) {
      this._updated = true;
      await this.hass.callService(
        "update",
        "install",
        {},
        { entity_id: updateEntity.entity_id }
      );
    } else {
      this._nextStep();
    }
  }

  private _nextStep() {
    fireEvent(this, "next-step", {
      noPrevious: true,
      updateConfig: this._updated,
    });
  }

  static styles = [
    AssistantSetupStyles,
    css`
      ha-circular-progress {
        margin-top: 24px;
        margin-bottom: 24px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-assistant-setup-step-update": HaVoiceAssistantSetupStepUpdate;
  }
}
