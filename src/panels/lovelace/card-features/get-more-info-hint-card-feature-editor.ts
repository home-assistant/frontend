import type { LovelaceCardFeatureEditor } from "../types";

export async function getMoreInfoHintCardFeatureEditor(): Promise<LovelaceCardFeatureEditor> {
  await import("../editor/config-elements/hui-card-feature-more-info-hint-editor");
  return document.createElement(
    "hui-card-feature-more-info-hint-editor"
  ) as LovelaceCardFeatureEditor;
}
