/**
 * @vitest-environment node
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { afterAll, describe, it } from "vitest";
import { noUnusedElementImport } from "../../build-scripts/eslint-rules/no-unused-element-import.mjs";

// The rule resolves imports and reads the target from disk, so the fixtures
// have to be real files.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "element-import-"));
const write = (name, contents) => {
  fs.writeFileSync(path.join(dir, name), contents);
  return path.join(dir, name);
};

write("ha-thing.js", '@customElement("ha-thing")\nclass HaThing {}');
write("ha-thing-row.js", 'customElements.define("ha-thing-row", HaThingRow);');
write("styles.js", "export const styles = css``;");
write("gallery-page.js", 'import "./ha-thing";');
write("gallery-page.markdown", "# Thing\n\n<ha-thing></ha-thing>");

const file = (name) => path.join(dir, name);

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

// RuleTester needs the test hooks injected: vitest does not expose globals.
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

describe("no-unused-element-import", () => {
  ruleTester.run("no-unused-element-import", noUnusedElementImport, {
    valid: [
      {
        name: "element used in a template",
        filename: file("uses-it.js"),
        code: 'import "./ha-thing";\nhtml`<ha-thing></ha-thing>`;',
      },
      {
        name: "target registers no element",
        filename: file("imports-styles.js"),
        code: 'import "./styles";',
      },
      {
        name: "tag built at runtime from a literal prefix",
        filename: file("builds-tag.js"),
        code: `import "./ha-thing-row";\nconst tag = \`ha-thing-\${type}\`;`,
      },
      {
        name: "element rendered by the page's sibling markdown",
        filename: file("gallery-page.js"),
        code: 'import "./ha-thing";',
      },
      {
        name: "entry point mounting the root element",
        filename: file("entrypoint.js"),
        code: 'import "./ha-thing";',
      },
      {
        name: "runtime registry resolving tags from config",
        filename: file("create-row.js"),
        code: 'import "./ha-thing";\ncreateLovelaceElement("row", config, TYPES);',
      },
      {
        name: "import that does not resolve to a file",
        filename: file("unresolved.js"),
        code: 'import "./nope";',
      },
      {
        name: "bare package import",
        filename: file("package-import.js"),
        code: 'import "lit";',
      },
    ],
    invalid: [
      {
        name: "element never referenced",
        filename: file("never-uses-it.js"),
        code: 'import "./ha-thing";\nhtml`<div></div>`;',
        errors: [{ messageId: "unused" }],
      },
      {
        // An erased type import registers nothing, so the side-effect import is
        // still the only registration -- and still dead.
        name: "type import from the same module is not a usage",
        filename: file("type-import.ts"),
        code: 'import "./ha-thing";\nimport type { HaThing } from "./ha-thing";\nhtml`<div></div>`;',
        errors: [{ messageId: "unused" }],
      },
      {
        // Without blanking the import paths, "ha-thing-row" would look used.
        name: "tag mentioned only by its own import path",
        filename: file("only-path.js"),
        code: 'import "./ha-thing";\nimport "./ha-thing-row";\nhtml`<ha-thing></ha-thing>`;',
        errors: [{ messageId: "unused" }],
      },
    ],
  });
});
