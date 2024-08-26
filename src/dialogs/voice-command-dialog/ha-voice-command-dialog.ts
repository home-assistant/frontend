import "@material/mwc-button/mwc-button";
import {
  mdiChevronDown,
  mdiClose,
  mdiHelpCircleOutline,
  mdiStar,
} from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { storage } from "../../common/decorators/storage";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import "../../components/ha-button";
import "../../components/ha-button-menu";
import "../../components/ha-dialog";
import "../../components/ha-dialog-header";
import "../../components/ha-icon-button";
import "../../components/ha-list-item";
import {
  AssistPipeline,
  getAssistPipeline,
  listAssistPipelines,
} from "../../data/assist_pipeline";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { AudioRecorder } from "../../util/audio-recorder";
import { documentationUrl } from "../../util/documentation-url";
import { VoiceCommandDialogParams } from "./show-ha-voice-command-dialog";
import { supportsFeature } from "../../common/entity/supports-feature";
import { ConversationEntityFeature } from "../../data/conversation";
import "./assist-chat";
import type { HaAssistChat } from "./assist-chat";

@customElement("ha-voice-command-dialog")
export class HaVoiceCommandDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @storage({
    key: "AssistPipelineId",
    state: true,
    subscribe: false,
  })
  private _pipelineId?: string;

  @state() private _pipeline?: AssistPipeline;

  @state() private _pipelines?: AssistPipeline[];

  @state() private _preferredPipeline?: string;

  @query("assist-chat") private _assistChat!: HaAssistChat;

  private _pipelinePromise?: Promise<AssistPipeline>;

  public async showDialog(
    params: Required<VoiceCommandDialogParams>
  ): Promise<void> {
    if (params.pipeline_id === "last_used") {
      // Do not set pipeline id (retrieve from storage)
    } else if (params.pipeline_id === "preferred") {
      await this._loadPipelines();
      this._pipelineId = this._preferredPipeline;
    } else {
      this._pipelineId = params.pipeline_id;
    }

    this._opened = true;
    await this.updateComplete;

    await this._pipelinePromise;
    if (
      params?.start_listening &&
      this._pipeline?.stt_engine &&
      AudioRecorder.isSupported
    ) {
      this._assistChat.toggleListening();
    }
  }

  public async closeDialog(): Promise<void> {
    this._opened = false;
    this._pipeline = undefined;
    this._pipelines = undefined;
    this._assistChat.stopListening();
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._opened) {
      return nothing;
    }

    const controlHA = !this._pipeline
      ? false
      : this.hass.states[this._pipeline?.conversation_engine]
        ? supportsFeature(
            this.hass.states[this._pipeline?.conversation_engine],
            ConversationEntityFeature.CONTROL
          )
        : true;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${this.hass.localize("ui.dialogs.voice_command.title")}
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
              <ha-button slot="trigger">
                ${this._pipeline?.name}
                <ha-svg-icon
                  slot="trailingIcon"
                  .path=${mdiChevronDown}
                ></ha-svg-icon>
              </ha-button>
              ${this._pipelines?.map(
                (pipeline) =>
                  html`<ha-list-item
                    ?selected=${pipeline.id === this._pipelineId ||
                    (!this._pipelineId &&
                      pipeline.id === this._preferredPipeline)}
                    .pipeline=${pipeline.id}
                    @click=${this._selectPipeline}
                    .hasMeta=${pipeline.id === this._preferredPipeline}
                  >
                    ${pipeline.name}${pipeline.id === this._preferredPipeline
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
                      ><ha-list-item @click=${this.closeDialog}
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
        ${controlHA
          ? nothing
          : html`
              <ha-alert>
                ${this.hass.localize(
                  "ui.dialogs.voice_command.conversation_no_control"
                )}
              </ha-alert>
            `}
        <assist-chat
          .hass=${this.hass}
          .pipelineId=${this._pipelineId}
        ></assist-chat>
      </ha-dialog>
    `;
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (
      changedProperties.has("_pipelineId") ||
      (changedProperties.has("_opened") && this._opened === true)
    ) {
      this._getPipeline();
    }
  }

  private async _getPipeline() {
    try {
      this._pipelinePromise = getAssistPipeline(this.hass, this._pipelineId);
      this._pipeline = await this._pipelinePromise;
    } catch (e: any) {
      if (e.code === "not_found") {
        this._pipelineId = undefined;
      }
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
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --primary-action-button-flex: 1;
          --secondary-action-button-flex: 0;
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
          --mdc-theme-primary: var(--secondary-text-color);
          --mdc-typography-button-text-transform: none;
          --mdc-typography-button-font-size: unset;
          --mdc-typography-button-font-weight: 400;
          --mdc-typography-button-letter-spacing: var(
            --mdc-typography-headline6-letter-spacing,
            0.0125em
          );
          --mdc-typography-button-line-height: var(
            --mdc-typography-headline6-line-height,
            2rem
          );
          --button-height: auto;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-command-dialog": HaVoiceCommandDialog;
  }
}
