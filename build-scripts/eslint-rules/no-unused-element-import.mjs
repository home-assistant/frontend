// @ts-check

import fs from "node:fs";
import path from "node:path";

const TAG_PATTERN =
  /@customElement\(\s*["'`]([a-z0-9-]+)["'`]|customElements\.define\(\s*["'`]([a-z0-9-]+)["'`]/g;

const EXTENSIONS = /\.(ts|js)$/;

// Entry points register the root element that the served HTML renders.
const ENTRY_POINT = /(^|[\\/])(entrypoints[\\/]|entrypoint\.(ts|js)$)/;

// These resolve a tag from config at runtime, so they register every candidate
// they may be asked for.
const RUNTIME_REGISTRY =
  /[\\/]create-element[\\/]|createLovelaceElement\(|getLovelaceElementClass\(/;

/** @type {Map<string, string[]>} */
const tagCache = new Map();

/** Tags the module at `file` registers when imported. */
const registeredTags = (file) => {
  let tags = tagCache.get(file);
  if (!tags) {
    try {
      const source = fs.readFileSync(file, "utf8");
      tags = [...source.matchAll(TAG_PATTERN)].map((m) => m[1] || m[2]);
    } catch {
      tags = [];
    }
    tagCache.set(file, tags);
  }
  return tags;
};

const isFile = (candidate) => {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
};

const resolveModule = (fromFile, request) => {
  const base = path.resolve(path.dirname(fromFile), request);
  return [
    base,
    `${base}.ts`,
    `${base}.js`,
    base.replace(/\.js$/, ".ts"),
    path.join(base, "index.ts"),
    path.join(base, "index.js"),
  ].find((candidate) => EXTENSIONS.test(candidate) && isFile(candidate));
};

// `hui-${type}-card` or "state-card-" + domain never spell the tag out.
const buildsTagAtRuntime = (source, tag) => {
  const segments = tag.split("-");
  for (let end = 1; end < segments.length; end++) {
    const prefix = `${segments.slice(0, end).join("-")}-`;
    if (
      source.includes(`\`${prefix}\${`) ||
      source.includes(`"${prefix}" +`) ||
      source.includes(`'${prefix}' +`)
    ) {
      return true;
    }
  }
  return false;
};

// Plain substring matching, so <ha-icon-button> counts as a use of ha-icon.
// That direction is deliberate: it misses dead imports rather than asking for
// a removal that breaks registration.
const usesTag = (body, tag) => body.includes(tag);

// A gallery page registers the elements its sibling markdown demos render, so
// that markdown is part of what the module is used by.
const siblingMarkup = (file) => {
  const markdown = file.replace(EXTENSIONS, ".markdown");
  try {
    return fs.readFileSync(markdown, "utf8");
  } catch {
    return "";
  }
};

/** Blanks out the given ranges so an import path cannot count as a usage. */
const withoutRanges = (source, ranges) => {
  let result = source;
  for (const [start, end] of ranges) {
    result =
      result.slice(0, start) + " ".repeat(end - start) + result.slice(end);
  }
  return result;
};

/**
 * Side-effect imports register a custom element. ESLint's unused-import rules
 * cannot judge them — there is no binding to be unused — so a registration
 * outlives the template that needed it and nothing reports the dead import.
 *
 * Deliberately not fixable: removing the import is only safe once every file
 * that renders the element imports it itself, which this rule cannot see.
 *
 * Off in eslint.config.mjs while a backlog of those paired cases remains;
 * `yarn lint:element-imports` enables it as a warning to list them. Flip it to
 * "error" there once the list is empty.
 */
export const noUnusedElementImport = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow side-effect imports of a custom element the importing file never uses",
    },
    schema: [],
    messages: {
      unused:
        '"{{request}}" only registers <{{tags}}>, which this file never uses. Remove the import, or disable this rule with the reason the element must be registered here.',
    },
  },

  create(context) {
    const filename = context.filename;
    if (!EXTENSIONS.test(filename) || ENTRY_POINT.test(filename)) {
      return {};
    }

    return {
      Program(program) {
        const sideEffectImports = program.body.filter(
          (node) =>
            node.type === "ImportDeclaration" &&
            node.specifiers.length === 0 &&
            typeof node.source.value === "string" &&
            node.source.value.startsWith(".")
        );
        if (!sideEffectImports.length) {
          return;
        }

        const source = context.sourceCode.getText();
        if (RUNTIME_REGISTRY.test(filename) || RUNTIME_REGISTRY.test(source)) {
          return;
        }
        const body =
          withoutRanges(
            source,
            sideEffectImports.map((node) => node.range)
          ) + siblingMarkup(filename);

        for (const node of sideEffectImports) {
          const request = node.source.value;
          const target = resolveModule(filename, request);
          if (!target) {
            continue;
          }
          // No tags means no registration to judge: styles, polyfills, mocks.
          const tags = registeredTags(target);
          if (
            !tags.length ||
            tags.some(
              (tag) => usesTag(body, tag) || buildsTagAtRuntime(body, tag)
            )
          ) {
            continue;
          }
          context.report({
            node,
            messageId: "unused",
            data: { request, tags: tags.join(">, <") },
          });
        }
      },
    };
  },
};
