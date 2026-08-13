import { jinja } from "@codemirror/lang-jinja";
import { yaml } from "@codemirror/lang-yaml";
import { EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { describe, expect, test } from "vitest";

import { haYamlLintSource } from "../../src/resources/yaml_ha_completions";
import type { YamlFieldSchemaMap } from "../../src/resources/yaml_field_schema";
import { allowUnknownFields } from "../../src/resources/yaml_field_schema";

// haYamlLintSource only reads `view.state`, so a state-only stub is enough.
const viewFor = (doc: string, language = jinja({ base: yaml() })) =>
  ({
    state: EditorState.create({ doc, extensions: [language] }),
  }) as EditorView;

const SCHEMA: YamlFieldSchemaMap = {
  trigger: { required: true, selector: { text: null } },
  entity_id: { selector: { entity: null } },
  options: {
    selector: { object: null },
    fields: {
      above: { required: true, selector: { number: {} } },
      below: { selector: { number: {} } },
    },
  },
};

describe("haYamlLintSource", () => {
  test("accepts a document that matches the schema", () => {
    expect(
      haYamlLintSource(
        viewFor("trigger: state\nentity_id: light.kitchen\n"),
        SCHEMA
      )
    ).toEqual([]);
  });

  test("warns about a key the schema doesn't know", () => {
    const diagnostics = haYamlLintSource(
      viewFor("trigger: state\nnot_a_field: 1\n"),
      SCHEMA
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe("warning");
    expect(diagnostics[0].message).toContain("not_a_field");
  });

  test("errors when a required key is missing", () => {
    const diagnostics = haYamlLintSource(
      viewFor("entity_id: light.kitchen\n"),
      SCHEMA
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe("error");
    expect(diagnostics[0].message).toContain("trigger");
  });

  test("checks nested mappings against the nested schema", () => {
    const diagnostics = haYamlLintSource(
      viewFor("trigger: numeric_state\noptions:\n  bogus: 1\n"),
      SCHEMA
    );

    expect(diagnostics.map((d) => d.severity).sort()).toEqual([
      "error",
      "warning",
    ]);
    expect(
      diagnostics.find((d) => d.severity === "warning")!.message
    ).toContain("bogus");
    // "above" is required inside options.
    expect(diagnostics.find((d) => d.severity === "error")!.message).toContain(
      "above"
    );
  });

  test("stays quiet about unknown keys on a map marked allowUnknownFields", () => {
    const schema = allowUnknownFields({
      trigger: { required: true, selector: { text: null } },
    });

    expect(
      haYamlLintSource(
        viewFor("trigger: device\ndomain: zha\nintegration_specific: 1\n"),
        schema
      )
    ).toEqual([]);
  });

  test("localizes diagnostics when a localize callback is given", () => {
    const diagnostics = haYamlLintSource(
      viewFor("trigger: state\nnot_a_field: 1\n"),
      SCHEMA,
      ((key: string, values?: Record<string, string>) =>
        `${key}|${values?.field}`) as any
    );

    expect(diagnostics[0].message).toBe(
      "ui.components.yaml-editor.schema.unknown_field|not_a_field"
    );
  });

  test("finds the mapping through a plain yaml() tree too", () => {
    const diagnostics = haYamlLintSource(
      viewFor("trigger: state\nnot_a_field: 1\n", yaml()),
      SCHEMA
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("not_a_field");
  });

  test("reports nothing for an empty document", () => {
    expect(haYamlLintSource(viewFor(""), SCHEMA)).toEqual([]);
  });
});
