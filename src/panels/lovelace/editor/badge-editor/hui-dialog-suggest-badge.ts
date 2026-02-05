import deepFreeze from "deep-freeze";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-yaml-editor";
import "../../../../components/ha-button";

import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import type { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showSaveSuccessToast } from "../../../../util/toast-saved-success";
import "../../badges/hui-badge";
import { addBadges } from "../config-util";
import type { LovelaceContainerPath } from "../lovelace-path";
import { parseLovelaceContainerPath } from "../lovelace-path";
import type { SuggestBadgeDialogParams } from "./show-suggest-badge-dialog";

@customElement("hui-dialog-suggest-badge")
export class HuiDialogSuggestBadge extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: SuggestBadgeDialogParams;

  @state() private _badgeConfig?: LovelaceBadgeConfig[];

  @state() private _saving = false;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  public showDialog(params: SuggestBadgeDialogParams): void {
    this._params = params;
    this._badgeConfig = params.badgeConfig;
    if (!Object.isFrozen(this._badgeConfig)) {
      this._badgeConfig = deepFreeze(this._badgeConfig);
    }
    if (this._yamlEditor) {
      this._yamlEditor.setValue(this._badgeConfig);
    }
  }

  public closeDialog(): void {
    this._params = undefined;
    this._badgeConfig = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _renderPreview() {
    if (this._badgeConfig) {
      return html`
        <div class="element-preview">
          ${this._badgeConfig.map(
            (badgeConfig) => html`
              <hui-badge
                .hass=${this.hass}
                .config=${badgeConfig}
                preview
              ></hui-badge>
            `
          )}
        </div>
      `;
    }
    return nothing;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        scrimClickAction
        @closed=${this.closeDialog}
        .heading=${this.hass!.localize(
          "ui.panel.lovelace.editor.suggest_badge.header"
        )}
      >
        <div>
          ${this._renderPreview()}
          ${this._params.yaml && this._badgeConfig
            ? html`
                <div class="editor">
                  <ha-yaml-editor
                    .hass=${this.hass}
                    .defaultValue=${this._badgeConfig}
                  ></ha-yaml-editor>
                </div>
              `
            : nothing}
        </div>
        <ha-button
          appearance="plain"
          slot="primaryAction"
          @click=${this.closeDialog}
          dialogInitialFocus
        >
          ${this._params.yaml
            ? this.hass!.localize("ui.common.close")
            : this.hass!.localize("ui.common.cancel")}
        </ha-button>
        ${!this._params.yaml
          ? html`
              <ha-button
                slot="primaryAction"
                @click=${this._save}
                .loading=${this._saving}
              >
                ${this.hass!.localize(
                  "ui.panel.lovelace.editor.suggest_badge.add"
                )}
              </ha-button>
            `
          : nothing}
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        @media all and (max-width: 450px), all and (max-height: 500px) {
          /* overrule the ha-style-dialog max-height on small screens */
          ha-dialog {
            max-height: 100%;
            height: 100%;
          }
        }
        @media all and (min-width: 850px) {
          ha-dialog {
            width: 845px;
          }
        }
        ha-dialog {
          max-width: 845px;
          --dialog-z-index: 6;
        }
        .hidden {
          display: none;
        }
        .element-preview {
          position: relative;
          display: flex;
          align-items: flex-start;
          flex-wrap: wrap;
          justify-content: center;
          gap: var(--ha-space-2);
          margin: 0;
        }
        .editor {
          padding-top: 16px;
        }
      `,
    ];
  }

  private _computeNewConfig(
    config: LovelaceConfig,
    path: LovelaceContainerPath
  ): LovelaceConfig {
    const { viewIndex } = parseLovelaceContainerPath(path);

    const newBadges = this._badgeConfig!;
    return addBadges(config, [viewIndex], newBadges);
  }

  private async _save(): Promise<void> {
    if (
      !this._params?.lovelaceConfig ||
      !this._params?.path ||
      !this._params?.saveConfig ||
      !this._badgeConfig
    ) {
      return;
    }
    this._saving = true;

    const newConfig = this._computeNewConfig(
      this._params.lovelaceConfig,
      this._params.path
    );
    await this._params!.saveConfig(newConfig);
    this._saving = false;
    showSaveSuccessToast(this, this.hass);
    this.closeDialog();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-suggest-badge": HuiDialogSuggestBadge;
  }
}
