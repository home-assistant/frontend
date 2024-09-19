import { state } from "lit/decorators";
import { HuiElementEditor } from "./hui-element-editor";

export abstract class HuiElementTypeEditor<
  T extends object,
  C = any,
> extends HuiElementEditor<T, C> {
  @state() private _configElementType?: string;

  protected get configElementType(): string | undefined {
    return this.value ? (this.value as any).type : undefined;
  }

  protected async loadConfigElement(): Promise<void> {
    // If the type has changed, we need to unload the current editor and load the new one
    if (this._configElementType !== this.configElementType) {
      this.unloadConfigElement();

      if (!this.configElementType) {
        throw new Error(
          this.hass.localize("ui.errors.config.no_type_provided")
        );
      }

      this._configElementType = this.configElementType;
    }

    return super.loadConfigElement();
  }
}
