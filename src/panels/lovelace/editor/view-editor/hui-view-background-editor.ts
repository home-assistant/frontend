import "@material/mwc-list/mwc-list-item";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import "../../../../components/ha-selector/ha-selector-image";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";

const SCHEMA = [
  {
    name: "backgroundUrl",
    selector: { image: { original: true } },
  },
  {
    name: "settings",
    flatten: true,
    expanded: true,
    type: "expandable" as const,
    schema: [
      {
        name: "tile",
        selector: { boolean: {} },
      },
    ],
  },
];

@customElement("hui-view-background-editor")
export class HuiViewBackgroundEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config!: LovelaceViewConfig;

  set config(config: LovelaceViewConfig) {
    this._config = config;
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const background = this._config?.background;
    const backgroundUrl =
      typeof background === "string"
        ? background.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1]
        : background?.image;

    const tile = typeof background === "string" ? false : background?.tile;

    const data = { backgroundUrl, tile };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const backgroundUrl = ev.detail.value.backgroundUrl;
    const config = {
      ...this._config,
      background: {
        ...(typeof this._config.background === "string"
          ? {}
          : this._config.background),
        image: backgroundUrl || undefined,
        tile: ev.detail.value.tile,
      },
    };
    fireEvent(this, "view-config-changed", { config });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    switch (schema.name) {
      case "backgroundUrl":
        return this.hass.localize(
          "ui.panel.lovelace.editor.edit_view.background.image"
        );
      default:
        return this.hass.localize(
          `ui.panel.lovelace.editor.edit_view.background.${schema.name}`
        );
    }
  };

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-background-editor": HuiViewBackgroundEditor;
  }
}
