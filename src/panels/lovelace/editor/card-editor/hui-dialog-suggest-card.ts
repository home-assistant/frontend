import deepFreeze from "deep-freeze";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-yaml-editor";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-dialog";

import "../../../../components/ha-spinner";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import { isStrategyView } from "../../../../data/lovelace/config/view";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showSaveSuccessToast } from "../../../../util/toast-saved-success";
import "../../cards/hui-card";
import "../../sections/hui-section";
import { getViewType } from "../../views/get-view-type";
import { addCards, addSection } from "../config-util";
import type { LovelaceContainerPath } from "../lovelace-path";
import { parseLovelaceContainerPath } from "../lovelace-path";
import { showCreateCardDialog } from "./show-create-card-dialog";
import type { SuggestCardDialogParams } from "./show-suggest-card-dialog";

@customElement("hui-dialog-suggest-card")
export class HuiDialogSuggestCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: SuggestCardDialogParams;

  @state() private _open = false;

  @state() private _cardConfig?: LovelaceCardConfig[];

  @state() private _sectionConfig?: LovelaceSectionConfig;

  @state() private _saving = false;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  public showDialog(params: SuggestCardDialogParams): void {
    this._params = params;
    this._cardConfig = params.cardConfig;
    this._sectionConfig = params.sectionConfig;
    this._open = true;
    if (!Object.isFrozen(this._cardConfig)) {
      this._cardConfig = deepFreeze(this._cardConfig);
    }
    if (!Object.isFrozen(this._sectionConfig)) {
      this._sectionConfig = deepFreeze(this._sectionConfig);
    }
    if (this._yamlEditor) {
      this._yamlEditor.setValue(this._cardConfig);
    }
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._open = false;
    this._params = undefined;
    this._cardConfig = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private get _viewSupportsSection(): boolean {
    if (!this._params?.lovelaceConfig || !this._params?.path) {
      return false;
    }

    const { viewIndex } = parseLovelaceContainerPath(this._params.path);
    const viewConfig = this._params!.lovelaceConfig.views[viewIndex];

    return (
      !isStrategyView(viewConfig) && getViewType(viewConfig) === "sections"
    );
  }

  private _renderPreview() {
    if (this._sectionConfig && this._viewSupportsSection) {
      return html`
        <div class="element-preview">
          <hui-section
            .hass=${this.hass}
            .config=${this._sectionConfig}
            preview
          ></hui-section>
        </div>
      `;
    }
    if (this._cardConfig) {
      return html`
        <div class="element-preview">
          ${this._cardConfig.map(
            (cardConfig) => html`
              <hui-card
                .hass=${this.hass}
                .config=${cardConfig}
                preview
              ></hui-card>
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
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass!.localize(
          "ui.panel.lovelace.editor.suggest_card.header"
        )}
        @closed=${this._dialogClosed}
      >
        <div>
          ${this._renderPreview()}
          ${this._params.yaml && this._cardConfig
            ? html`
                <div class="editor">
                  <ha-yaml-editor
                    .hass=${this.hass}
                    .defaultValue=${this._cardConfig}
                  ></ha-yaml-editor>
                </div>
              `
            : nothing}
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            @click=${this.closeDialog}
            appearance="plain"
            autofocus
          >
            ${this._params.yaml
              ? this.hass!.localize("ui.common.close")
              : this.hass!.localize("ui.common.cancel")}
          </ha-button>
          ${!this._params.yaml
            ? html`
                ${!(this._sectionConfig && this._viewSupportsSection)
                  ? html`
                      <ha-button
                        appearance="plain"
                        slot="secondaryAction"
                        @click=${this._pickCard}
                      >
                        ${this.hass!.localize(
                          "ui.panel.lovelace.editor.suggest_card.create_own"
                        )}
                      </ha-button>
                    `
                  : nothing}
                <ha-button
                  slot="primaryAction"
                  .disabled=${this._saving}
                  @click=${this._save}
                  .loading=${this._saving}
                >
                  ${this.hass!.localize(
                    "ui.panel.lovelace.editor.suggest_card.add"
                  )}
                </ha-button>
              `
            : nothing}
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-z-index: 6;
        }
        .hidden {
          display: none;
        }
        .element-preview {
          position: relative;
        }
        hui-card,
        hui-section {
          padding-top: 8px;
          margin: 4px auto;
          max-width: 390px;
          display: block;
          width: 100%;
        }
        .editor {
          padding-top: 16px;
        }
      `,
    ];
  }

  private _pickCard(): void {
    if (
      !this._params?.lovelaceConfig ||
      !this._params?.path ||
      !this._params?.saveConfig
    ) {
      return;
    }

    showCreateCardDialog(this, {
      lovelaceConfig: this._params!.lovelaceConfig,
      saveConfig: this._params!.saveConfig,
      path: this._params!.path,
      entities: this._params!.entities,
    });
    this.closeDialog();
  }

  private _computeNewConfig(
    config: LovelaceConfig,
    path: LovelaceContainerPath
  ): LovelaceConfig {
    if (!this._viewSupportsSection) {
      return addCards(config, path, this._cardConfig!);
    }

    const { viewIndex, sectionIndex } = parseLovelaceContainerPath(path);

    // If container is a view, add a section
    if (sectionIndex === undefined) {
      const newSection = this._sectionConfig ?? {
        type: "grid",
        cards: this._cardConfig,
      };
      return addSection(config, viewIndex, newSection);
    }

    // Else add cards to section
    const newCards = this._sectionConfig
      ? this._sectionConfig.cards || []
      : this._cardConfig!;
    return addCards(config, [viewIndex, sectionIndex], newCards);
  }

  private async _save(): Promise<void> {
    if (
      !this._params?.lovelaceConfig ||
      !this._params?.path ||
      !this._params?.saveConfig ||
      !this._cardConfig
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
    "hui-dialog-suggest-card": HuiDialogSuggestCard;
  }
}
