import {
  mdiChevronDown,
  mdiClose,
  mdiHelpCircleOutline,
  mdiStar,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { storage } from "../../common/decorators/storage";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import "../../components/ha-alert";
import "../../components/ha-assist-chat";
import "../../components/ha-button";
import "../../components/ha-button-menu";
import "../../components/ha-dialog";
import "../../components/ha-dialog-header";
import "../../components/ha-icon-button";
import "../../components/ha-list-item";
import "../../components/ha-spinner";
import type { AssistPipeline } from "../../data/assist_pipeline";
import {
  getAssistPipeline,
  listAssistPipelines,
} from "../../data/assist_pipeline";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import type { VoiceCommandDialogParams } from "./show-ha-voice-command-dialog";

@customElement("ha-voice-command-dialog")
export class HaVoiceCommandDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state()
  @storage({
    key: "AssistPipelineId",
    state: true,
    subscribe: false,
  })
  private _pipelineId?: string;

  @state() private _pipeline?: AssistPipeline;

  @state() private _pipelines?: AssistPipeline[];

  @state() private _preferredPipeline?: string;

  @state() private _errorLoadAssist?: "not_found" | "unknown";

  private _startListening = false;

  public async showDialog(
    params: Required<VoiceCommandDialogParams>
  ): Promise<void> {
    await this._loadPipelines();
    const pipelinesIds = this._pipelines?.map((pipeline) => pipeline.id) || [];
    if (
      params.pipeline_id === "preferred" ||
      (params.pipeline_id === "last_used" && !this._pipelineId)
    ) {
      this._pipelineId = this._preferredPipeline;
    } else if (!["last_used", "preferred"].includes(params.pipeline_id)) {
      this._pipelineId = params.pipeline_id;
    }

    // If the pipeline id is not in the list of pipelines, set it to preferred
    if (this._pipelineId && !pipelinesIds.includes(this._pipelineId)) {
      this._pipelineId = this._preferredPipeline;
    }

    this._startListening = params.start_listening;
    this._opened = true;
  }

  public async closeDialog(): Promise<void> {
    this._opened = false;
    this._pipelines = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._opened) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${this.hass.localize("ui.dialogs.voice_command.title")}
        flexContent
        hideactions
      >
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <div slot="title">
            ${this.hass.localize("ui.dialogs.voice_command.title")}
            <ha-button-menu
              @opened=${this._loadPipelines}
              @closed=${stopPropagation}
              activatable
              fixed
            >
              <ha-button
                slot="trigger"
                appearance="plain"
                variant="neutral"
                size="small"
              >
                ${this._pipeline?.name}
                <ha-svg-icon slot="end" .path=${mdiChevronDown}></ha-svg-icon>
              </ha-button>
              ${!this._pipelines
                ? html`<div class="pipelines-loading">
                    <ha-spinner size="small"></ha-spinner>
                  </div>`
                : this._pipelines?.map(
                    (pipeline) =>
                      html`<ha-list-item
                        ?selected=${pipeline.id === this._pipelineId ||
                        (!this._pipelineId &&
                          pipeline.id === this._preferredPipeline)}
                        .pipeline=${pipeline.id}
                        @click=${this._selectPipeline}
                        .hasMeta=${pipeline.id === this._preferredPipeline}
                      >
                        ${pipeline.name}${pipeline.id ===
                        this._preferredPipeline
                          ? html`
                              <ha-svg-icon
                                slot="meta"
                                .path=${mdiStar}
                              ></ha-svg-icon>
                            `
                          : nothing}
                      </ha-list-item>`
                  )}
              ${this.hass.user?.is_admin
                ? html`<li divider role="separator"></li>
                    <a href="/config/voice-assistants/assistants"
                      ><ha-list-item
                        >${this.hass.localize(
                          "ui.dialogs.voice_command.manage_assistants"
                        )}</ha-list-item
                      ></a
                    >`
                : nothing}
            </ha-button-menu>
          </div>
          <a
            href=${documentationUrl(this.hass, "/docs/assist/")}
            slot="actionItems"
            target="_blank"
            rel="noopener noreferer"
          >
            <ha-icon-button
              .label=${this.hass.localize("ui.common.help")}
              .path=${mdiHelpCircleOutline}
            ></ha-icon-button>
          </a>
        </ha-dialog-header>

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
                  .startListening=${this._startListening}
                >
                </ha-assist-chat>
              `
            : html`<div class="pipelines-loading">
                <ha-spinner size="large"></ha-spinner>
              </div>`}
      </ha-dialog>
    `;
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (
      changedProperties.has("_pipelineId") ||
      (changedProperties.has("_opened") &&
        this._opened === true &&
        this._pipelineId)
    ) {
      this._getPipeline();
    }
  }

  private async _loadPipelines() {
    if (this._pipelines) {
      return;
    }
    const { pipelines, preferred_pipeline } = await listAssistPipelines(
      this.hass
    );
    this._pipelines = pipelines;
    this._preferredPipeline = preferred_pipeline || undefined;
  }

  private async _selectPipeline(ev: CustomEvent) {
    this._pipelineId = (ev.currentTarget as any).pipeline;
    await this.updateComplete;
  }

  private async _getPipeline() {
    this._pipeline = undefined;
    this._errorLoadAssist = undefined;
    const pipelineId = this._pipelineId!;
    try {
      const pipeline = await getAssistPipeline(this.hass, pipelineId);
      // Verify the pipeline is still the same.
      if (pipelineId === this._pipelineId) {
        this._pipeline = pipeline;
      }
    } catch (e: any) {
      if (pipelineId !== this._pipelineId) {
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

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-max-width: 500px;
          --mdc-dialog-max-height: 500px;
          --dialog-content-padding: 0;
        }
        ha-dialog-header a {
          color: var(--primary-text-color);
        }
        div[slot="title"] {
          display: flex;
          flex-direction: column;
          margin: -4px 0;
        }
        ha-button-menu {
          --mdc-theme-on-primary: var(--text-primary-color);
          --mdc-theme-primary: var(--primary-color);
          margin-top: -8px;
          margin-bottom: 0;
          margin-right: 0;
          margin-inline-end: 0;
          margin-left: -8px;
          margin-inline-start: -8px;
        }
        ha-button-menu ha-button {
          --ha-button-theme-color: transparent;
          --ha-button-text-color: var(--primary-text-color);
          --ha-button-padding-inline-start: 8px;
          --ha-button-font-weight: var(--ha-font-weight-normal);
          --ha-button-border-radius: 4px;
          --ha-button-theme-lighter-color: rgba(0, 0, 0, 0.1);
          --ha-button-height: 24px;
        }
        @media (prefers-color-scheme: dark) {
          ha-button-menu ha-button {
            --ha-button-theme-lighter-color: rgba(255, 255, 255, 0.1);
          }
        }
        ha-button-menu ha-button ha-svg-icon {
          height: 28px;
          margin-left: 4px;
          margin-inline-start: 4px;
          margin-inline-end: initial;
          direction: var(--direction);
        }
        ha-list-item {
          --mdc-list-item-meta-size: 16px;
        }
        ha-list-item ha-svg-icon {
          margin-left: 4px;
          margin-inline-start: 4px;
          margin-inline-end: initial;
          direction: var(--direction);
          display: block;
        }
        ha-button-menu a {
          text-decoration: none;
        }

        .pipelines-loading {
          display: flex;
          justify-content: center;
        }
        ha-assist-chat {
          margin: 0 24px 16px;
          min-height: 399px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-command-dialog": HaVoiceCommandDialog;
  }
}
