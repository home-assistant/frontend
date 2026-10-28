import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { computeLocalize } from "../../src/common/translations/localize";
import { localizedPhrases } from "../../src/resources/codemirror";

const createState = async (resources: Record<string, string>) => {
  const localize = await computeLocalize(document.createElement("div"), "de", {
    de: resources,
  });
  return EditorState.create({ extensions: [localizedPhrases(localize)] });
};

describe("localizedPhrases", () => {
  it("translates the phrases and keeps the CodeMirror $ placeholder", async () => {
    const state = await createState({
      "ui.components.yaml-editor.search.find": "Suchen",
      "ui.components.yaml-editor.search.replaced_matches":
        "{count} Treffer ersetzt",
    });

    expect(state.phrase("Find")).toBe("Suchen");
    expect(state.phrase("replaced $ matches", 3)).toBe("3 Treffer ersetzt");
  });

  it("falls back to the CodeMirror text when a translation is missing", async () => {
    const state = await createState({});

    expect(state.phrase("match case")).toBe("match case");
    expect(state.phrase("replaced match on line $", 7)).toBe(
      "replaced match on line 7"
    );
  });
});
