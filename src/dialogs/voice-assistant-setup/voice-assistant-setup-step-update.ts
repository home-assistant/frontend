import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-progress-ring";
import "../../components/ha-spinner";
import { ON, UNAVAILABLE } from "../../data/entity";
import {
  updateCanInstall,
  type UpdateEntity,
  updateIsInstalling,
  updateUsesProgress,
} from "../../data/update";
import type { HomeAssistant } from "../../types";
import { AssistantSetupStyles } from "./styles";

@customElement("ha-voice-assistant-setup-step-update")
export class HaVoiceAssistantSetupStepUpdate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public updateEntityId?: string;

  private _updated = false;

  private _refreshTimeout?: number;

  protected override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (!this.updateEntityId) {
      this._nextStep();
      return;
    }

    if (changedProperties.has("hass") && this.updateEntityId) {
      const oldHass = changedProperties.get("hass") as this["hass"] | undefined;
      if (oldHass) {
        const oldState = oldHass.states[this.updateEntityId];
        const newState = this.hass.states[this.updateEntityId];
        if (
          (oldState?.state === UNAVAILABLE &&
            newState?.state !== UNAVAILABLE) ||
          (oldState?.state !== ON && newState?.state === ON)
        ) {
          // Device is rebooted, let's move on
          this._tryUpdate(false);
          return;
        }
      }
    }

    if (changedProperties.has("updateEntityId")) {
      this._tryUpdate(true);
    }
  }

  protected override render() {
    if (!this.updateEntityId || !(this.updateEntityId in this.hass.states)) {
      return nothing;
    }

    const stateObj = this.hass.states[this.updateEntityId] as
      | UpdateEntity
      | undefined;

    const progressIsNumeric = stateObj && updateUsesProgress(stateObj);

    return html`<div class="content">
      <img
        src="/static/images/voice-assistant/update.png"
        alt="Casita Home Assistant loading logo"
      />
      <h1>
        ${stateObj &&
        (stateObj.state === "unavailable" || updateIsInstalling(stateObj))
          ? this.hass.localize(
              "ui.panel.config.voice_assistants.satellite_wizard.update.title"
            )
          : this.hass.localize(
              "ui.panel.config.voice_assistants.satellite_wizard.update.checking"
            )}
      </h1>
      <p class="secondary">
        ${this.hass.localize(
          "ui.panel.config.voice_assistants.satellite_wizard.update.secondary"
        )}
      </p>
      ${progressIsNumeric
        ? html`
            <ha-progress-ring
              .value=${stateObj.attributes.update_percentage as number}
            ></ha-progress-ring>
          `
        : html`<ha-spinner></ha-spinner>`}
      <p>
        ${stateObj?.state === UNAVAILABLE
          ? "Restarting voice assistant"
          : progressIsNumeric
            ? `Installing ${stateObj.attributes.update_percentage}%`
            : ""}
      </p>
    </div>`;
  }

  private async _tryUpdate(refreshUpdate: boolean) {
    clearTimeout(this._refreshTimeout);
    if (!this.updateEntityId) {
      return;
    }
    const updateEntity = this.hass.states[this.updateEntityId] as
      | UpdateEntity
      | undefined;
    if (
      updateEntity &&
      this.hass.states[updateEntity.entity_id].state === ON &&
      updateCanInstall(updateEntity)
    ) {
      this._updated = true;
      await this.hass.callService(
        "update",
        "install",
        {},
        { entity_id: updateEntity.entity_id }
      );
    } else if (refreshUpdate) {
      await this.hass.callService(
        "homeassistant",
        "update_entity",
        {},
        { entity_id: this.updateEntityId }
      );
      this._refreshTimeout = window.setTimeout(() => {
        this._nextStep();
      }, 10000);
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
      ha-progress-ring,
      ha-spinner {
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
