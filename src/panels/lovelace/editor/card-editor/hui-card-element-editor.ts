import { customElement } from "lit-element";
import { handleStructError } from "../../common/structs/handle-errors";
import { getCardElementClass } from "../../create-element/create-card-element";
import { LovelaceCardEditor } from "../../types";
import { GUISupportError } from "../gui-support-error";
import { HuiElementEditor, UIConfigChangedEvent } from "../hui-element-editor";

@customElement("hui-card-element-editor")
export class HuiCardElementEditor extends HuiElementEditor {
  public async getConfigElement(): Promise<LovelaceCardEditor | undefined> {
    let configElement: LovelaceCardEditor | undefined;

    const cardType = this.value!.type;

    try {
      this._error = undefined;
      this._warnings = undefined;

      if (this._configElType !== cardType) {
        // If the type has changed, we need to load a new GUI editor
        if (!cardType) {
          throw new Error(`No card type defined`);
        }

        const elClass = await getCardElementClass(cardType);

        this._loading = true;
        // Check if a GUI editor exists
        if (elClass && elClass.getConfigElement) {
          configElement = await elClass.getConfigElement();
        } else {
          configElement = undefined;
          throw new GUISupportError(
            `No visual editor available for: ${cardType}`
          );
        }

        this._configElType = cardType;

        // Perform final setup
        configElement.hass = this.hass;
        if ("lovelace" in configElement) {
          configElement.lovelace = this.lovelace;
        }
        configElement.addEventListener("config-changed", (ev) =>
          this._handleUIConfigChanged(ev as UIConfigChangedEvent)
        );
      }

      // Setup GUI editor and check that it can handle the current config
      try {
        // @ts-ignore
        configElement!.setConfig(this.value);
      } catch (err) {
        throw new GUISupportError(
          "Config is not supported",
          handleStructError(err)
        );
      }
    } catch (err) {
      if (err instanceof GUISupportError) {
        this._warnings = err.warnings ?? [err.message];
      } else {
        this._error = err;
      }
      this.GUImode = false;
    } finally {
      this._loading = false;
    }

    return configElement;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-element-editor": HuiCardElementEditor;
  }
}
