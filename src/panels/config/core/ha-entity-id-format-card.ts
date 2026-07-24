import { consume, type ContextType } from "@lit/context";
import { mdiRestore } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import { computeEntityIdFormatExample } from "../../../common/entity/compute_entity_id_format_example";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type { HaProgressButton } from "../../../components/buttons/ha-progress-button";
import "../../../components/buttons/ha-progress-button";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-svg-icon";
import { apiContext, configContext } from "../../../data/context";
import {
  DEFAULT_ENTITY_ID_FORMAT,
  fetchEntityRegistrySettings,
  isDefaultEntityIdFormat,
  updateEntityRegistrySettings,
  type EntityIdFormat,
  type EntityIdPart,
} from "../../../data/entity_id_format";
import { haStyle } from "../../../resources/styles";
import { documentationUrl } from "../../../util/documentation-url";
import "./ha-entity-id-format-editor";

const EXAMPLE_DOMAIN = "sensor";

@customElement("ha-entity-id-format-card")
export class HaEntityIdFormatCard extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _config!: ContextType<typeof configContext>;

  @state() private _format?: EntityIdFormat;

  @state() private _error?: string;

  protected async firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    try {
      const settings = await fetchEntityRegistrySettings(this._api);
      this._format = settings.entity_id_parts ?? DEFAULT_ENTITY_ID_FORMAT;
    } catch (err: any) {
      this._error = err.message;
    }
  }

  private _examples = memoizeOne(
    (localize: LocalizeFunc): Record<EntityIdPart, string> => ({
      area: localize(
        "ui.panel.config.entity_id_format.card.editor.examples.area"
      ),
      device: localize(
        "ui.panel.config.entity_id_format.card.editor.examples.device"
      ),
      entity: localize(
        "ui.panel.config.entity_id_format.card.editor.examples.entity"
      ),
      floor: localize(
        "ui.panel.config.entity_id_format.card.editor.examples.floor"
      ),
    })
  );

  protected render() {
    return html`
      <ha-card
        outlined
        .header=${this._localize(
          "ui.panel.config.entity_id_format.card.header"
        )}
      >
        <div class="card-content">
          ${
            this._error
              ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
              : nothing
          }
          <p class="description">
            ${this._localize(
              "ui.panel.config.entity_id_format.card.description"
            )}
            <a
              href=${documentationUrl(
                this._config,
                "/docs/configuration/customizing-devices/"
              )}
              target="_blank"
              rel="noreferrer"
              >${this._localize(
                "ui.panel.config.entity_id_format.card.learn_more"
              )}</a
            >
          </p>
          ${
            this._format
              ? html`
                  <ha-entity-id-format-editor
                    .value=${this._format}
                    .label=${this._localize(
                      "ui.panel.config.entity_id_format.card.editor.label"
                    )}
                    @value-changed=${this._formatChanged}
                  ></ha-entity-id-format-editor>
                  ${this._renderPreview()}
                `
              : nothing
          }
        </div>
        <div class="card-actions">
          <ha-button
            appearance="plain"
            @click=${this._reset}
            .disabled=${!this._format || isDefaultEntityIdFormat(this._format)}
          >
            <ha-svg-icon slot="start" .path=${mdiRestore}></ha-svg-icon>
            ${this._localize("ui.panel.config.entity_id_format.card.reset")}
          </ha-button>
          <ha-progress-button
            appearance="filled"
            @click=${this._save}
            .disabled=${!this._format}
          >
            ${this._localize("ui.common.save")}
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  private _renderPreview() {
    const example = computeEntityIdFormatExample(
      this._format!,
      this._examples(this._localize)
    );
    return html`
      <div class="preview">
        <span class="preview-label">
          ${this._localize("ui.panel.config.entity_id_format.card.preview")}
        </span>
        <code>${EXAMPLE_DOMAIN}.${example}</code>
      </div>
    `;
  }

  private _formatChanged(ev: CustomEvent) {
    this._format = ev.detail.value;
  }

  private _reset() {
    this._format = [...DEFAULT_ENTITY_ID_FORMAT];
  }

  private async _save(ev: Event) {
    const button = ev.currentTarget as HaProgressButton;
    if (button.progress) {
      return;
    }
    button.progress = true;
    this._error = undefined;
    try {
      const format = this._format!;
      const settings = await updateEntityRegistrySettings(this._api, {
        entity_id_parts: isDefaultEntityIdFormat(format) ? null : format,
      });
      this._format = settings.entity_id_parts ?? DEFAULT_ENTITY_ID_FORMAT;
      button.actionSuccess();
    } catch (err: any) {
      button.actionError();
      this._error = err.message;
    } finally {
      button.progress = false;
    }
  }

  static styles = [
    haStyle,
    css`
      :host {
        display: block;
      }
      .description {
        margin-top: 0;
        color: var(--secondary-text-color);
      }
      .preview {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-1);
        margin-top: var(--ha-space-5);
      }
      .preview-label {
        font-weight: 500;
      }
      .preview code {
        display: block;
        padding: var(--ha-space-3);
        border-radius: var(--ha-border-radius-md);
        background-color: var(--secondary-background-color);
        font-family: var(--ha-font-family-code);
        overflow-wrap: anywhere;
      }
      .card-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-id-format-card": HaEntityIdFormatCard;
  }
}
