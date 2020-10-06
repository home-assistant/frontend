import {
  customElement,
  internalProperty,
  LitElement,
  property,
  query,
} from "lit-element";

import { fireEvent, HASSDomEvent } from "../../../../common/dom/fire_event";
import { ActionConfig } from "../../../../data/lovelace";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardEditor } from "../../types";
import { EditorTarget, GUIModeChangedEvent } from "../types";
// eslint-disable-next-line import/no-duplicates
import { HuiElementEditor } from "../hui-element-editor";
// eslint-disable-next-line import/no-duplicates
import { EditActionEvent } from "../../components/hui-actions-editor";

// eslint-disable-next-line import/no-duplicates
import "../hui-element-editor";

@customElement("hui-action-base-card-editor")
export class HuiActionBaseCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() protected _config?: any;

  @internalProperty() protected _editActionConfig?: ActionConfig;

  @internalProperty() protected _editActionType?: string;

  @internalProperty() protected _editActionGuiModeAvailable? = true;

  @internalProperty() protected _editActionGuiMode? = true;

  @query("hui-element-editor") private _cardEditorEl?: HuiElementEditor;

  public setConfig(config: any): void {
    this._config = config;
  }

  protected _handleGUIModeChanged(ev: HASSDomEvent<GUIModeChangedEvent>): void {
    ev.stopPropagation();
    this._editActionGuiMode = ev.detail.guiMode;
    this._editActionGuiModeAvailable = ev.detail.guiModeAvailable;
  }

  protected _toggleMode(): void {
    this._cardEditorEl?.toggleMode();
  }

  protected _editAction(ev: HASSDomEvent<EditActionEvent>): void {
    this._editActionType = ev.detail.type;
    this._editActionConfig = this[`_${this._editActionType}`];
  }

  protected _goBack(): void {
    this._editActionConfig = undefined;
    this._editActionType = undefined;
    this._editActionGuiModeAvailable = true;
    this._editActionGuiMode = true;
  }

  protected _handleActionConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();

    const config = ev.detail.config as ActionConfig;
    this._editActionGuiModeAvailable = ev.detail.guiModeAvailable;

    if (this[`_${this._editActionType}`] === config) {
      return;
    }

    this._editActionConfig = config;

    this._config = {
      ...this._config!,
      [this._editActionType!]: this._editActionConfig,
    };

    fireEvent(this, "config-changed", { config: this._config! });
  }

  protected _clearAction(ev: CustomEvent): void {
    const target = ev.target! as EditorTarget;

    fireEvent(this, "config-changed", {
      config: {
        ...this._config!,
        [target.type!]: { action: "none" },
      },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-action-base-card-editor": HuiActionBaseCardEditor;
  }
}
