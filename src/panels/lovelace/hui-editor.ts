import { undoDepth } from "@codemirror/commands";
import { mdiClose } from "@mdi/js";
import { dump, load } from "js-yaml";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { array, assert, object, optional, string, type } from "superstruct";
import { deepEqual } from "../../common/util/deep-equal";
import "../../components/ha-code-editor";
import type { HaCodeEditor } from "../../components/ha-code-editor";
import "../../components/ha-icon-button";
import "../../components/ha-button";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { showToast } from "../../util/toast";
import type { Lovelace } from "./types";
import "../../components/ha-top-app-bar-fixed";
import type { LovelaceRawConfig } from "../../data/lovelace/config/types";
import { isStrategyDashboard } from "../../data/lovelace/config/types";

const lovelaceStruct = type({
  title: optional(string()),
  views: array(object()),
});

const strategyStruct = type({
  strategy: type({
    type: string(),
  }),
});

@customElement("hui-editor")
class LovelaceFullConfigEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ attribute: false }) public closeEditor?: () => void;

  @state() private _saving?: boolean;

  @state() private _changed?: boolean;

  protected render(): TemplateResult | undefined {
    return html`
      <ha-top-app-bar-fixed>
        <ha-icon-button
          slot="navigationIcon"
          .path=${mdiClose}
          @click=${this._closeEditor}
          .label=${this.hass!.localize("ui.common.close")}
        ></ha-icon-button>
        <div slot="title">
          ${this.hass!.localize("ui.panel.lovelace.editor.raw_editor.header")}
        </div>
        <div
          slot="actionItems"
          class="save-button
              ${classMap({
            saved: this._saving === false || this._changed === true,
          })}"
        >
          ${this._changed
            ? this.hass!.localize(
                "ui.panel.lovelace.editor.raw_editor.unsaved_changes"
              )
            : this.hass!.localize("ui.panel.lovelace.editor.raw_editor.saved")}
        </div>
        <ha-button
          slot="actionItems"
          @click=${this._handleSave}
          .disabled=${!this._changed}
          >${this.hass!.localize(
            "ui.panel.lovelace.editor.raw_editor.save"
          )}</ha-button
        >
        <div class="content">
          <ha-code-editor
            mode="yaml"
            autofocus
            autocomplete-entities
            autocomplete-icons
            .hass=${this.hass}
            @value-changed=${this._yamlChanged}
            @editor-save=${this._handleSave}
            disable-fullscreen
            dir="ltr"
          >
          </ha-code-editor>
        </div>
      </ha-top-app-bar-fixed>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.yamlEditor.value = dump(this.lovelace!.rawConfig);
  }

  protected updated(changedProps: PropertyValues) {
    const oldLovelace = changedProps.get("lovelace") as Lovelace | undefined;
    if (
      !this._saving &&
      oldLovelace &&
      this.lovelace &&
      oldLovelace.rawConfig !== this.lovelace.rawConfig &&
      !deepEqual(oldLovelace.rawConfig, this.lovelace.rawConfig)
    ) {
      showToast(this, {
        message: this.hass!.localize(
          "ui.panel.lovelace.editor.raw_editor.lovelace_changed"
        ),
        action: {
          action: () => {
            this.yamlEditor.value = dump(this.lovelace!.rawConfig);
          },
          text: this.hass!.localize(
            "ui.panel.lovelace.editor.raw_editor.reload"
          ),
        },
        duration: -1,
        dismissable: false,
      });
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          --code-mirror-height: 100%;
          --app-header-background-color: var(
            --app-header-edit-background-color,
            #455a64
          );
          --app-header-text-color: var(--app-header-edit-text-color, #fff);
        }

        .content {
          height: calc(100vh - var(--header-height));
        }

        .comments {
          font-size: var(--ha-font-size-l);
        }

        .save-button {
          opacity: 0;
          font-size: var(--ha-font-size-m);
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
      window.onbeforeunload = () => true;
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
    } catch (err: any) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.lovelace.editor.raw_editor.error_remove",
          { error: err }
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
          "ui.panel.lovelace.editor.raw_editor.confirm_delete_config_title"
        ),
        text: this.hass.localize(
          "ui.panel.lovelace.editor.raw_editor.confirm_delete_config_text"
        ),
        confirmText: this.hass.localize("ui.common.delete"),
        dismissText: this.hass.localize("ui.common.cancel"),
        confirm: () => this._removeConfig(),
        destructive: true,
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

    let config: LovelaceRawConfig;
    try {
      config = load(value) as LovelaceRawConfig;
    } catch (err: any) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.lovelace.editor.raw_editor.error_parse_yaml",
          { error: err }
        ),
      });
      this._saving = false;
      return;
    }
    try {
      if (isStrategyDashboard(config)) {
        assert(config, strategyStruct);
      } else {
        assert(config, lovelaceStruct);
      }
    } catch (err: any) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.lovelace.editor.raw_editor.error_invalid_config",
          { error: err }
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
    } catch (err: any) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.lovelace.editor.raw_editor.error_save_yaml",
          { error: err }
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
