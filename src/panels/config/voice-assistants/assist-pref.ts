import "@home-assistant/webawesome/dist/components/divider/divider";
import {
  mdiBug,
  mdiCommentProcessingOutline,
  mdiContentDuplicate,
  mdiDotsVertical,
  mdiHelpCircle,
  mdiPlus,
  mdiStar,
  mdiTrashCan,
} from "@mdi/js";
import type { PropertyValues } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { computeDomain } from "../../../common/entity/compute_domain";
import { formatLanguageCode } from "../../../common/language/format_language";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import type { HaDropdownItem } from "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-list";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import "../../../components/ha-switch";
import type { HaSwitch } from "../../../components/ha-switch";
import "../../../components/voice-assistant-brand-icon";
import type { AssistPipeline } from "../../../data/assist_pipeline";
import {
  createAssistPipeline,
  deleteAssistPipeline,
  listAssistPipelines,
  setAssistPipelinePreferred,
  updateAssistPipeline,
} from "../../../data/assist_pipeline";
import type { CloudStatus } from "../../../data/cloud";
import type { ExposeEntitySettings } from "../../../data/expose";
import {
  getExposeNewEntities,
  setExposeNewEntities,
} from "../../../data/expose";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { showVoiceCommandDialog } from "../../../dialogs/voice-command-dialog/show-ha-voice-command-dialog";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showVoiceAssistantPipelineDetailDialog } from "./show-dialog-voice-assistant-pipeline-detail";

@customElement("assist-pref")
export class AssistPref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public exposedEntities?: Record<
    string,
    ExposeEntitySettings
  >;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @state() private _pipelines: AssistPipeline[] = [];

  @state() private _preferred: string | null = null;

  @state() private _pipelineEntitiesCount = 0;

  @state() private _exposeNew?: boolean;

  protected willUpdate() {
    if (!this.hasUpdated) {
      getExposeNewEntities(this.hass, "conversation").then((value) => {
        this._exposeNew = value.expose_new;
      });
    }
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    listAssistPipelines(this.hass).then((pipelines) => {
      this._pipelines = pipelines.pipelines;
      this._preferred = pipelines.preferred_pipeline;
    });
    this._pipelineEntitiesCount = Object.values(this.hass.entities).filter(
      (entity) =>
        computeDomain(entity.entity_id) === "assist_satellite" &&
        this.hass.states[entity.entity_id].state !== "unavailable"
    ).length;
  }

  private _exposedEntitiesCount = memoizeOne(
    (exposedEntities: Record<string, ExposeEntitySettings>) =>
      Object.entries(exposedEntities).filter(
        ([entityId, expose]) =>
          expose.conversation && entityId in this.hass.states
      ).length
  );

  protected render() {
    return html`
      <ha-card outlined>
        <h1 class="card-header">
          <voice-assistant-brand-icon
            .voiceAssistantId=${"conversation"}
            .hass=${this.hass}
          >
          </voice-assistant-brand-icon
          >Assist
        </h1>
        <div class="header-actions">
          <a
            href=${documentationUrl(this.hass, "/docs/assist/")}
            target="_blank"
            rel="noreferrer noopener"
            class="icon-link"
          >
            <ha-icon-button
              .label=${this.hass.localize(
                "ui.panel.config.voice_assistants.assistants.pipeline.link_learn_how_it_works"
              )}
              .path=${mdiHelpCircle}
            ></ha-icon-button>
          </a>
        </div>
        <ha-list>
          ${this._pipelines.map(
            (pipeline) => html`
              <ha-list-item
                twoline
                hasMeta
                role="button"
                .id=${pipeline.id}
                @click=${this._editPipeline}
              >
                <span>
                  ${pipeline.name}
                  ${this._preferred === pipeline.id
                    ? html`<ha-svg-icon .path=${mdiStar}></ha-svg-icon>`
                    : ""}
                </span>
                <span slot="secondary">
                  ${formatLanguageCode(pipeline.language, this.hass.locale)}
                </span>
                <ha-dropdown
                  slot="meta"
                  placement="bottom-end"
                  @click=${stopPropagation}
                  @wa-select=${this._handlePipelineMenuAction}
                >
                  <ha-icon-button
                    slot="trigger"
                    .label=${this.hass!.localize(
                      "ui.panel.lovelace.editor.menu.open"
                    )}
                    .path=${mdiDotsVertical}
                  ></ha-icon-button>
                  <ha-dropdown-item value="talk" .data=${pipeline.id}>
                    ${this.hass!.localize(
                      "ui.panel.config.voice_assistants.assistants.pipeline.start_conversation"
                    )}
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiCommentProcessingOutline}
                    ></ha-svg-icon>
                  </ha-dropdown-item>
                  <ha-dropdown-item
                    value="set-preferred"
                    .data=${pipeline.id}
                    .disabled=${this._preferred === pipeline.id}
                  >
                    ${this.hass.localize(
                      "ui.panel.config.voice_assistants.assistants.pipeline.detail.set_as_preferred"
                    )}
                    <ha-svg-icon slot="icon" .path=${mdiStar}></ha-svg-icon>
                  </ha-dropdown-item>
                  <ha-dropdown-item value="debug" .data=${pipeline.id}>
                    ${this.hass.localize(
                      "ui.panel.config.voice_assistants.assistants.pipeline.detail.debug"
                    )}
                    <ha-svg-icon slot="icon" .path=${mdiBug}></ha-svg-icon>
                  </ha-dropdown-item>
                  <ha-dropdown-item value="duplicate" .data=${pipeline.id}>
                    ${this.hass.localize("ui.common.duplicate")}
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiContentDuplicate}
                    ></ha-svg-icon>
                  </ha-dropdown-item>
                  <wa-divider></wa-divider>
                  <ha-dropdown-item
                    variant="danger"
                    value="delete"
                    .data=${pipeline.id}
                  >
                    ${this.hass.localize("ui.common.delete")}
                    <ha-svg-icon slot="icon" .path=${mdiTrashCan}></ha-svg-icon>
                  </ha-dropdown-item>
                </ha-dropdown>
              </ha-list-item>
            `
          )}
        </ha-list>
        <ha-button
          appearance="filled"
          @click=${this._addPipeline}
          class="add"
          size="small"
        >
          ${this.hass.localize(
            "ui.panel.config.voice_assistants.assistants.pipeline.add_assistant"
          )}
          <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
        </ha-button>
        <ha-settings-row>
          <span slot="heading">
            ${this.hass!.localize(
              "ui.panel.config.voice_assistants.expose.expose_new_entities"
            )}
          </span>
          <span slot="description">
            ${this.hass!.localize(
              "ui.panel.config.voice_assistants.expose.expose_new_entities_info"
            )}
          </span>
          <ha-switch
            .checked=${this._exposeNew}
            .disabled=${this._exposeNew === undefined}
            @change=${this._exposeNewToggleChanged}
          ></ha-switch>
        </ha-settings-row>
        <div class="card-actions">
          <ha-button
            appearance="plain"
            href="/config/voice-assistants/expose?assistants=conversation&historyBack"
          >
            ${this.hass.localize(
              "ui.panel.config.voice_assistants.assistants.pipeline.exposed_entities",
              {
                number: this.exposedEntities
                  ? this._exposedEntitiesCount(this.exposedEntities)
                  : 0,
              }
            )}
          </ha-button>
          ${this._pipelineEntitiesCount > 0
            ? html`
                <ha-button
                  appearance="plain"
                  href="/config/voice-assistants/assist/devices"
                >
                  ${this.hass.localize(
                    "ui.panel.config.voice_assistants.assistants.pipeline.assist_devices",
                    { number: this._pipelineEntitiesCount }
                  )}
                </ha-button>
              `
            : ""}
        </div>
      </ha-card>
    `;
  }

  private async _exposeNewToggleChanged(ev) {
    const toggle = ev.target as HaSwitch;
    if (this._exposeNew === undefined || this._exposeNew === toggle.checked) {
      return;
    }
    try {
      await setExposeNewEntities(this.hass, "conversation", toggle.checked);
    } catch (_err: any) {
      toggle.checked = !toggle.checked;
    }
  }

  private _handlePipelineMenuAction(ev: CustomEvent<{ item: HaDropdownItem }>) {
    const value = ev.detail.item.value;
    const id = (ev.detail.item as any).data as string;
    switch (value) {
      case "talk":
        this._talkWithPipeline(id);
        break;
      case "set-preferred":
        this._setPreferredPipeline(id);
        break;
      case "debug":
        this._debugPipeline(id);
        break;
      case "duplicate":
        this._duplicatePipeline(id);
        break;
      case "delete":
        this._deletePipeline(id);
        break;
    }
  }

  private _talkWithPipeline(id: string) {
    showVoiceCommandDialog(this, this.hass, { pipeline_id: id });
  }

  private async _setPreferredPipeline(id: string) {
    await setAssistPipelinePreferred(this.hass!, id);
    this._preferred = id;
  }

  private async _debugPipeline(id: string) {
    navigate(`/config/voice-assistants/debug/${id}`);
  }

  private async _duplicatePipeline(id: string) {
    const pipeline = this._pipelines.find((res) => res.id === id);
    if (!pipeline) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.voice_assistants.assistants.pipeline.duplicate.error_pipeline_not_found"
        ),
      });
      return;
    }

    const { id: _id, ...pipelineWithoutId } = pipeline;
    const newPipeline = {
      ...pipelineWithoutId,
      name: this.hass.localize(
        "ui.panel.config.voice_assistants.assistants.pipeline.duplicate.name",
        { name: pipeline.name }
      ),
    };

    this._openDialog(newPipeline);
  }

  private async _deletePipeline(id: string) {
    if (this._preferred === id) {
      showAlertDialog(this, {
        text: this.hass!.localize(
          "ui.panel.config.voice_assistants.assistants.pipeline.delete.error_preferred"
        ),
      });
      return;
    }
    const pipeline = this._pipelines.find((res) => res.id === id);
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass!.localize(
          "ui.panel.config.voice_assistants.assistants.pipeline.delete.confirm_title",
          { name: pipeline!.name }
        ),
        text: this.hass!.localize(
          "ui.panel.config.voice_assistants.assistants.pipeline.delete.confirm_text",
          { name: pipeline!.name }
        ),
        confirmText: this.hass!.localize("ui.common.delete"),
        destructive: true,
      }))
    ) {
      return;
    }

    await deleteAssistPipeline(this.hass!, pipeline!.id);
    this._pipelines = this._pipelines!.filter((res) => res !== pipeline);
  }

  private _editPipeline(ev) {
    const id = ev.currentTarget.id as string;

    const pipeline = this._pipelines.find((res) => res.id === id);
    this._openDialog(pipeline);
  }

  private _addPipeline() {
    this._openDialog();
  }

  private async _openDialog(
    pipeline?: AssistPipeline | Omit<AssistPipeline, "id">
  ): Promise<void> {
    showVoiceAssistantPipelineDetailDialog(this, {
      cloudActiveSubscription:
        this.cloudStatus?.logged_in && this.cloudStatus.active_subscription,
      pipeline,
      createPipeline: async (values) => {
        const created = await createAssistPipeline(this.hass!, values);
        this._pipelines = this._pipelines!.concat(created);
      },
      ...(pipeline && "id" in pipeline
        ? {
            updatePipeline: async (values) => {
              const updated = await updateAssistPipeline(
                this.hass,
                pipeline.id,
                values
              );
              const pipelineToUpdate = pipeline as AssistPipeline;
              this._pipelines = this._pipelines!.map((res) =>
                res.id === pipelineToUpdate.id ? updated : res
              );
            },
          }
        : {}),
    });
  }

  static styles = css`
    a {
      color: var(--primary-color);
    }
    .header-actions {
      position: absolute;
      right: 0px;
      inset-inline-end: 0px;
      inset-inline-start: initial;
      top: 24px;
      display: flex;
      flex-direction: row;
    }
    .header-actions .icon-link {
      margin-top: -16px;
      margin-right: 8px;
      margin-inline-end: 8px;
      margin-inline-start: initial;
      direction: var(--direction);
      color: var(--secondary-text-color);
    }
    ha-list-item {
      --mdc-list-item-meta-size: auto;
      --mdc-list-item-meta-display: flex;
      --mdc-list-side-padding-right: 8px;
      --mdc-list-side-padding-left: 16px;
    }

    ha-list-item span ha-svg-icon {
      color: currentColor;
      width: 16px;
    }

    .add {
      margin: 0 16px 16px;
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
      padding-bottom: 0;
    }
    img {
      height: 28px;
      margin-right: 16px;
      margin-inline-end: 16px;
      margin-inline-start: initial;
    }

    ha-dropdown {
      font-size: var(--ha-font-size-m);
      font-family: var(--ha-font-family-body);
      letter-spacing: normal;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-pref": AssistPref;
  }
}
