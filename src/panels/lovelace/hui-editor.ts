import { undoDepth } from "@codemirror/history";
import "@material/mwc-button";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import { safeDump, safeLoad } from "js-yaml";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { array, assert, object, optional, string, type } from "superstruct";
import { computeRTL } from "../../common/util/compute_rtl";
import { deepEqual } from "../../common/util/deep-equal";
import "../../components/ha-circular-progress";
import "../../components/ha-code-editor";
import type { HaCodeEditor } from "../../components/ha-code-editor";
import "../../components/ha-icon";
import "../../components/ha-icon-button";
import type { LovelaceConfig } from "../../data/lovelace";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../dialogs/generic/show-dialog-box";
import "../../layouts/ha-app-layout";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { showToast } from "../../util/toast";
import type { Lovelace } from "./types";

const lovelaceStruct = type({
  title: optional(string()),
  views: array(object()),
});

@customElement("hui-editor")
class LovelaceFullConfigEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property() public closeEditor?: () => void;

  @internalProperty() private _saving?: boolean;

  @internalProperty() private _changed?: boolean;

  protected render(): TemplateResult | void {
    return html`
      <ha-app-layout>
        <app-header slot="header">
          <app-toolbar>
            <ha-icon-button
              icon="hass:close"
              @click="${this._closeEditor}"
            ></ha-icon-button>
            <div main-title>
              ${this.hass!.localize(
                "ui.panel.lovelace.editor.raw_editor.header"
              )}
            </div>
            <div
              class="save-button
              ${classMap({
                saved: this._saving! === false || this._changed === true,
              })}"
            >
              ${this._changed
                ? this.hass!.localize(
                    "ui.panel.lovelace.editor.raw_editor.unsaved_changes"
                  )
                : this.hass!.localize(
                    "ui.panel.lovelace.editor.raw_editor.saved"
                  )}
            </div>
            <mwc-button
              raised
              @click=${this._handleSave}
              .disabled=${!this._changed}
              >${this.hass!.localize(
                "ui.panel.lovelace.editor.raw_editor.save"
              )}</mwc-button
            >
          </app-toolbar>
        </app-header>
        <div class="content">
          <ha-code-editor
            mode="yaml"
            autofocus
            .rtl=${computeRTL(this.hass)}
            .hass=${this.hass}
            @value-changed=${this._yamlChanged}
            @editor-save=${this._handleSave}
          >
          </ha-code-editor>
        </div>
      </ha-app-layout>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.yamlEditor.value = safeDump(this.lovelace!.config);
  }

  protected updated(changedProps: PropertyValues) {
    const oldLovelace = changedProps.get("lovelace") as Lovelace | undefined;
    if (
      !this._saving &&
      oldLovelace &&
      this.lovelace &&
      oldLovelace.config !== this.lovelace.config &&
      !deepEqual(oldLovelace.config, this.lovelace.config)
    ) {
      showToast(this, {
        message: this.hass!.localize(
          "ui.panel.lovelace.editor.raw_editor.lovelace_changed"
        ),
        action: {
          action: () => {
            this.yamlEditor.value = safeDump(this.lovelace!.config);
          },
          text: this.hass!.localize(
            "ui.panel.lovelace.editor.raw_editor.reload"
          ),
        },
        duration: 0,
        dismissable: false,
      });
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        :host {
          --code-mirror-height: 100%;
        }

        ha-app-layout {
          height: 100vh;
        }

        app-toolbar {
          background-color: var(--dark-background-color, #455a64);
          color: var(--dark-text-color);
        }

        mwc-button[disabled] {
          background-color: var(--mdc-theme-on-primary);
          border-radius: 4px;
        }

        .comments {
          font-size: 16px;
        }

        .content {
          height: calc(100vh - var(--header-height));
        }

        .save-button {
          opacity: 0;
          font-size: 14px;
          padding: 0px 10px;
        }

        .saved {
          opacity: 1;
        }
      `,
    ];
  }

  private _yamlChanged() {
    this._changed = undoDepth(this.yamlEditor.codemirror!.state) > 0;
    if (this._changed && !window.onbeforeunload) {
      window.onbeforeunload = () => {
        return true;
      };
    } else if (!this._changed && window.onbeforeunload) {
      window.onbeforeunload = null;
    }
  }

  private async _closeEditor() {
    if (
      this._changed &&
      !(await showConfirmationDialog(this, {
        text: this.hass.localize(
          "ui.panel.lovelace.editor.raw_editor.confirm_unsaved_changes"
        ),
        dismissText: this.hass!.localize("ui.common.stay"),
        confirmText: this.hass!.localize("ui.common.leave"),
      }))
    ) {
      return;
    }

    window.onbeforeunload = null;
    if (this.closeEditor) {
      this.closeEditor();
    }
  }

  private async _removeConfig() {
    try {
      await this.lovelace!.deleteConfig();
    } catch (err) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.lovelace.editor.raw_editor.error_remove",
          "error",
          err
        ),
      });
    }
    window.onbeforeunload = null;
    if (this.closeEditor) {
      this.closeEditor();
    }
  }

  private async _handleSave() {
    this._saving = true;

    const value = this.yamlEditor.value;

    if (!value) {
      showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.lovelace.editor.raw_editor.confirm_remove_config_title"
        ),
        text: this.hass.localize(
          "ui.panel.lovelace.editor.raw_editor.confirm_remove_config_text"
        ),
        confirmText: this.hass.localize("ui.common.remove"),
        dismissText: this.hass.localize("ui.common.cancel"),
        confirm: () => this._removeConfig(),
      });
      return;
    }

    if (this.yamlEditor.hasComments) {
      if (
        !confirm(
          this.hass.localize(
            "ui.panel.lovelace.editor.raw_editor.confirm_unsaved_comments"
          )
        )
      ) {
        return;
      }
    }

    let config: LovelaceConfig;
    try {
      config = safeLoad(value);
    } catch (err) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.lovelace.editor.raw_editor.error_parse_yaml",
          "error",
          err
        ),
      });
      this._saving = false;
      return;
    }
    try {
      assert(config, lovelaceStruct);
    } catch (err) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.lovelace.editor.raw_editor.error_invalid_config",
          "error",
          err
        ),
      });
      return;
    }
    // @ts-ignore
    if (config.resources) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.lovelace.editor.raw_editor.resources_moved"
        ),
      });
    }
    try {
      await this.lovelace!.saveConfig(config);
    } catch (err) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.lovelace.editor.raw_editor.error_save_yaml",
          "error",
          err
        ),
      });
    }
    window.onbeforeunload = null;
    this._changed = false;
    this._saving = false;
  }

  private get yamlEditor(): HaCodeEditor {
    return this.shadowRoot!.querySelector("ha-code-editor")! as HaCodeEditor;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-editor": LovelaceFullConfigEditor;
  }
}
