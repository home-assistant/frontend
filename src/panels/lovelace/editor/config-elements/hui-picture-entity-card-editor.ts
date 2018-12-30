import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-toggle-button/paper-toggle-button";

import { struct } from "../../common/structs/struct";
import {
  EntitiesEditorEvent,
  EditorTarget,
  actionConfigStruct,
} from "../types";
import { hassLocalizeLitMixin } from "../../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardEditor } from "../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { Config } from "../../cards/hui-picture-entity-card";
import { configElementStyle } from "./config-elements-style";
import { ActionConfig } from "../../../../data/lovelace";

import "../../components/hui-image-editor";
import "../../../../components/entity/ha-entity-picker";
import "../../components/hui-action-editor";

const cardConfigStruct = struct({
  type: "string",
  entity: "string?",
  image: "string?",
  camera_image: "string?",
  state_image: "object?",
  aspect_ratio: "string?",
  tap_action: actionConfigStruct,
  hold_action: actionConfigStruct,
  show_name: "boolean?",
  show_state: "boolean?",
});

export class HuiPictureEntityCardEditor extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCardEditor {
  public hass?: HomeAssistant;
  private _config?: Config;

  public setConfig(config: Config): void {
    config = cardConfigStruct(config);
    this._config = config;
  }

  static get properties(): PropertyDeclarations {
    return { hass: {}, _config: {} };
  }

  get _entity(): string {
    return this._config!.entity || "";
  }

  get _image(): string {
    return this._config!.image || "";
  }

  get _camera_image(): string {
    return this._config!.camera_image || "";
  }

  get _state_image(): { [key: string]: string } {
    return this._config!.state_image || {};
  }

  get _aspect_ratio(): string {
    return this._config!.aspect_ratio || "";
  }

  get _tap_action(): ActionConfig {
    return this._config!.tap_action || { action: "more-info" };
  }

  get _hold_action(): ActionConfig {
    return this._config!.hold_action || { action: "none" };
  }

  get _show_name(): boolean {
    return this._config!.show_name || true;
  }

  get _show_state(): boolean {
    return this._config!.show_state || true;
  }

  get _image_type(): string {
    let type = "image";
    if (this._config) {
      if (this._config.image) {
        type = "image";
      }
      if (this._config.camera_image) {
        type = "camera_image";
      }
      if (this._config.state_image) {
        type = "state_image";
      }
    }
    return type;
  }

  get _image_value(): string | { [key: string]: string } {
    return (
      this._config!.image ||
      this._config!.camera_image ||
      this._config!.state_image ||
      ""
    );
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }
    const actions = ["more-info", "toggle", "navigate", "call-service", "none"];
    const images = ["image", "camera_image", "state_image"];
    return html`
      ${configElementStyle}
      <div class="card-config">
        <div class="side-by-side">
          <ha-entity-picker
            .hass="${this.hass}"
            .value="${this._entity}"
            .configValue=${"entity"}
            @change="${this._valueChanged}"
            allow-custom-entity
          ></ha-entity-picker>
          <paper-input
            label="Aspect Ratio (Optional)"
            .value="${this._aspect_ratio}"
            .configValue="${"aspect_ratio"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
        </div>
        <hui-image-editor
          .hass="${this.hass}"
          .images="${images}"
          .configValue="${this._image_type}"
          .value="${this._image_value}"
          @value-changed="${this._valueChanged}"
        ></hui-image-editor>
        <div class="side-by-side">
          <hui-action-editor
            label="Tap Action"
            .hass="${this.hass}"
            .config="${this._tap_action}"
            .actions="${actions}"
            .configValue="${"tap_action"}"
            @action-changed="${this._valueChanged}"
          ></hui-action-editor>
          <hui-action-editor
            label="Hold Action"
            .hass="${this.hass}"
            .config="${this._hold_action}"
            .actions="${actions}"
            .configValue="${"hold_action"}"
            @action-changed="${this._valueChanged}"
          ></hui-action-editor>
        </div>
        <div class="side-by-side">
          <paper-toggle-button
            ?checked="${this._show_name !== false}"
            .configValue="${"show_name"}"
            @change="${this._valueChanged}"
            >Show Name?</paper-toggle-button
          >
          <paper-toggle-button
            ?checked="${this._show_state !== false}"
            .configValue="${"show_state"}"
            @change="${this._valueChanged}"
            >Show State?</paper-toggle-button
          >
        </div>
      </div>
    `;
  }

  private _valueChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    if (this[`_${target.configValue}`] === target.config) {
      return;
    }
    console.log("value-changed {} {}", target.configValue, target.value);
    if (
      target.configValue === "image" ||
      target.configValue === "camera_image" ||
      target.configValue === "state_image"
    ) {
      delete this._config.image;
      delete this._config.camera_image;
      delete this._config.state_image;
    }
    if (target.configValue) {
      if (target.value === "") {
        delete this._config[target.configValue!];
      } else {
        this._config = {
          ...this._config,
          [target.configValue!]: target.value ? target.value : target.config,
        };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-entity-card-editor": HuiPictureEntityCardEditor;
  }
}

customElements.define(
  "hui-picture-entity-card-editor",
  HuiPictureEntityCardEditor
);
