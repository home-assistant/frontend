import { css } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceStrategyConfig } from "../../../../data/lovelace/config/strategy";
import { getLovelaceStrategy } from "../../strategies/get-strategy";
import type { LovelaceStrategyEditor } from "../../strategies/types";
import { HuiTypedElementEditor } from "../hui-typed-element-editor";

@customElement("hui-section-strategy-element-editor")
export class HuiSectionStrategyElementEditor extends HuiTypedElementEditor<LovelaceStrategyConfig> {
  static styles = [
    HuiTypedElementEditor.styles,
    css`
      .gui-editor,
      .yaml-editor {
        padding: 0;
      }
    `,
  ];

  protected async getConfigElement(): Promise<
    LovelaceStrategyEditor | undefined
  > {
    const strategy = await getLovelaceStrategy(
      "section",
      this.configElementType!
    );
    return strategy.getConfigElement?.();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section-strategy-element-editor": HuiSectionStrategyElementEditor;
  }
}
