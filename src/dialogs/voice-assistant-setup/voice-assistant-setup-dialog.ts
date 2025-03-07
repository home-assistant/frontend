import "@material/mwc-button/mwc-button";
import { mdiChevronLeft, mdiClose } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import "../../components/ha-dialog";
import type { AssistSatelliteConfiguration } from "../../data/assist_satellite";
import { fetchAssistSatelliteConfiguration } from "../../data/assist_satellite";
import { UNAVAILABLE } from "../../data/entity";
import type { EntityRegistryDisplayEntry } from "../../data/entity_registry";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import type { VoiceAssistantSetupDialogParams } from "./show-voice-assistant-setup-dialog";
import "./voice-assistant-setup-step-area";
import "./voice-assistant-setup-step-change-wake-word";
import "./voice-assistant-setup-step-check";
import "./voice-assistant-setup-step-cloud";
import "./voice-assistant-setup-step-pipeline";
import "./voice-assistant-setup-step-success";
import "./voice-assistant-setup-step-update";
import "./voice-assistant-setup-step-wake-word";
import "./voice-assistant-setup-step-local";

export const enum STEP {
  INIT,
  UPDATE,
  CHECK,
  WAKEWORD,
  AREA,
  PIPELINE,
  SUCCESS,
  CLOUD,
  LOCAL,
  CHANGE_WAKEWORD,
}

@customElement("ha-voice-assistant-setup-dialog")
export class HaVoiceAssistantSetupDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: VoiceAssistantSetupDialogParams;

  @state() private _step: STEP = STEP.INIT;

  @state() private _assistConfiguration?: AssistSatelliteConfiguration;

  @state() private _error?: string;

  private _previousSteps: STEP[] = [];

  private _nextStep?: STEP;

  public async showDialog(
    params: VoiceAssistantSetupDialogParams
  ): Promise<void> {
    this._params = params;

    await this._fetchAssistConfiguration();

    this._step = STEP.UPDATE;
  }

  public async closeDialog(): Promise<void> {
    this.renderRoot.querySelector("ha-dialog")?.close();
  }

  private _dialogClosed() {
    this._params = undefined;
    this._assistConfiguration = undefined;
    this._previousSteps = [];
    this._nextStep = undefined;
    this._step = STEP.INIT;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _deviceEntities = memoizeOne(
    (
      deviceId: string,
      entities: HomeAssistant["entities"]
    ): EntityRegistryDisplayEntry[] =>
      Object.values(entities).filter((entity) => entity.device_id === deviceId)
  );

  private _findDomainEntityId = memoizeOne(
    (
      deviceId: string,
      entities: HomeAssistant["entities"],
      domain: string
    ): string | undefined => {
      const deviceEntities = this._deviceEntities(deviceId, entities);
      return deviceEntities.find(
        (ent) => computeDomain(ent.entity_id) === domain
      )?.entity_id;
    }
  );

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const assistSatelliteEntityId = this._findDomainEntityId(
      this._params.deviceId,
      this.hass.entities,
      "assist_satellite"
    );

    const assistEntityState = assistSatelliteEntityId
      ? this.hass.states[assistSatelliteEntityId]
      : undefined;

    return html`
      <ha-dialog
        open
        @closed=${this._dialogClosed}
        .heading=${"Voice Satellite setup"}
        hideActions
        escapeKeyAction
        scrimClickAction
      >
        <ha-dialog-header slot="heading">
          ${this._step === STEP.LOCAL
            ? nothing
            : this._previousSteps.length
              ? html`<ha-icon-button
                  slot="navigationIcon"
                  .label=${this.hass.localize("ui.common.back") ?? "Back"}
                  .path=${mdiChevronLeft}
                  @click=${this._goToPreviousStep}
                ></ha-icon-button>`
              : this._step !== STEP.UPDATE
                ? html`<ha-icon-button
                    slot="navigationIcon"
                    .label=${this.hass.localize("ui.common.close") ?? "Close"}
                    .path=${mdiClose}
                    @click=${this.closeDialog}
                  ></ha-icon-button>`
                : nothing}
          ${this._step === STEP.WAKEWORD ||
          this._step === STEP.AREA ||
          this._step === STEP.PIPELINE
            ? html`<ha-button
                @click=${this._goToNextStep}
                class="skip-btn"
                slot="actionItems"
                >${this.hass.localize(
                  "ui.panel.config.voice_assistants.satellite_wizard.skip"
                )}</ha-button
              >`
            : nothing}
        </ha-dialog-header>
        <div
          class="content"
          @next-step=${this._goToNextStep}
          @prev-step=${this._goToPreviousStep}
        >
          ${this._step === STEP.UPDATE
            ? html`<ha-voice-assistant-setup-step-update
                .hass=${this.hass}
                .updateEntityId=${this._findDomainEntityId(
                  this._params.deviceId,
                  this.hass.entities,
                  "update"
                )}
              ></ha-voice-assistant-setup-step-update>`
            : this._error
              ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
              : assistEntityState?.state === UNAVAILABLE
                ? html`<ha-alert alert-type="error"
                    >${this.hass.localize(
                      "ui.panel.config.voice_assistants.satellite_wizard.not_available"
                    )}</ha-alert
                  >`
                : this._step === STEP.CHECK
                  ? html`<ha-voice-assistant-setup-step-check
                      .hass=${this.hass}
                      .assistEntityId=${assistSatelliteEntityId}
                    ></ha-voice-assistant-setup-step-check>`
                  : this._step === STEP.WAKEWORD
                    ? html`<ha-voice-assistant-setup-step-wake-word
                        .hass=${this.hass}
                        .assistConfiguration=${this._assistConfiguration}
                        .assistEntityId=${assistSatelliteEntityId}
                        .deviceEntities=${this._deviceEntities(
                          this._params.deviceId,
                          this.hass.entities
                        )}
                      ></ha-voice-assistant-setup-step-wake-word>`
                    : this._step === STEP.CHANGE_WAKEWORD
                      ? html`
                          <ha-voice-assistant-setup-step-change-wake-word
                            .hass=${this.hass}
                            .assistConfiguration=${this._assistConfiguration}
                            .assistEntityId=${assistSatelliteEntityId}
                          ></ha-voice-assistant-setup-step-change-wake-word>
                        `
                      : this._step === STEP.AREA
                        ? html`
                            <ha-voice-assistant-setup-step-area
                              .hass=${this.hass}
                              .deviceId=${this._params.deviceId}
                            ></ha-voice-assistant-setup-step-area>
                          `
                        : this._step === STEP.PIPELINE
                          ? html`<ha-voice-assistant-setup-step-pipeline
                              .hass=${this.hass}
                              .assistConfiguration=${this._assistConfiguration}
                              .assistEntityId=${assistSatelliteEntityId}
                            ></ha-voice-assistant-setup-step-pipeline>`
                          : this._step === STEP.CLOUD
                            ? html`<ha-voice-assistant-setup-step-cloud
                                .hass=${this.hass}
                              ></ha-voice-assistant-setup-step-cloud>`
                            : this._step === STEP.LOCAL
                              ? html`<ha-voice-assistant-setup-step-local
                                  .hass=${this.hass}
                                  .assistConfiguration=${this
                                    ._assistConfiguration}
                                ></ha-voice-assistant-setup-step-local>`
                              : this._step === STEP.SUCCESS
                                ? html`<ha-voice-assistant-setup-step-success
                                    .hass=${this.hass}
                                    .assistConfiguration=${this
                                      ._assistConfiguration}
                                    .assistEntityId=${assistSatelliteEntityId}
                                  ></ha-voice-assistant-setup-step-success>`
                                : nothing}
        </div>
      </ha-dialog>
    `;
  }

  private async _fetchAssistConfiguration() {
    try {
      this._assistConfiguration = await fetchAssistSatelliteConfiguration(
        this.hass,
        this._findDomainEntityId(
          this._params!.deviceId,
          this.hass.entities,
          "assist_satellite"
        )!
      );
    } catch (err: any) {
      this._error = err.message;
    }
  }

  private _goToPreviousStep() {
    if (!this._previousSteps.length) {
      return;
    }
    this._step = this._previousSteps.pop()!;
  }

  private _goToNextStep(ev?: CustomEvent) {
    if (ev?.detail?.updateConfig) {
      this._fetchAssistConfiguration();
    }
    if (ev?.detail?.nextStep) {
      this._nextStep = ev.detail.nextStep;
    }
    if (!ev?.detail?.noPrevious) {
      this._previousSteps.push(this._step);
    }
    if (ev?.detail?.step) {
      this._step = ev.detail.step;
    } else if (this._nextStep) {
      this._step = this._nextStep;
      this._nextStep = undefined;
    } else {
      this._step += 1;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
        }
        @media all and (min-width: 450px) and (min-height: 500px) {
          ha-dialog {
            --mdc-dialog-min-width: 560px;
            --mdc-dialog-max-width: 560px;
            --mdc-dialog-min-width: min(560px, 95vw);
            --mdc-dialog-max-width: min(560px, 95vw);
          }
        }
        ha-dialog-header {
          height: 56px;
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          .content {
            height: calc(100vh - 56px);
          }
        }
        .skip-btn {
          margin-top: 6px;
        }
        ha-alert {
          margin: 24px;
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-assistant-setup-dialog": HaVoiceAssistantSetupDialog;
  }

  interface HASSDomEvents {
    "next-step":
      | {
          step?: STEP;
          updateConfig?: boolean;
          noPrevious?: boolean;
          nextStep?: STEP;
        }
      | undefined;
    "prev-step": undefined;
  }
}
