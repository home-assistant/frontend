import deepFreeze from "deep-freeze";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-yaml-editor";

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
import { addCards, addSection } from "../config-util";
import type { LovelaceContainerPath } from "../lovelace-path";
import { parseLovelaceContainerPath } from "../lovelace-path";
import { showCreateCardDialog } from "./show-create-card-dialog";
import type { SuggestCardDialogParams } from "./show-suggest-card-dialog";

@customElement("hui-dialog-suggest-card")
export class HuiDialogSuggestCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: SuggestCardDialogParams;

  @state() private _cardConfig?: LovelaceCardConfig[];

  @state() private _sectionConfig?: LovelaceSectionConfig;

  @state() private _saving = false;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  public showDialog(params: SuggestCardDialogParams): void {
    this._params = params;
    this._cardConfig = params.cardConfig;
    this._sectionConfig = params.sectionConfig;
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

    return !isStrategyView(viewConfig) && viewConfig.type === "sections";
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
        open
        scrimClickAction
        @closed=${this.closeDialog}
        .heading=${this.hass!.localize(
          "ui.panel.lovelace.editor.suggest_card.header"
        )}
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
        <ha-button
          slot="secondaryAction"
          @click=${this.closeDialog}
          appearance="plain"
          dialogInitialFocus
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
                      slot="primaryAction"
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
