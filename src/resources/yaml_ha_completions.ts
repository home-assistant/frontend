/**
 * CodeMirror completion source and hover tooltip source for field-aware YAML
 * editing in the automation/script/card YAML editors.
 *
 * Given a `YamlFieldSchemaMap` describing the valid keys (and their selectors,
 * descriptions, etc.), this module provides:
 *
 *  - `haYamlCompletionSource`  — key completions at the current indent level
 *                                plus value completions driven by the selector.
 *  - `haYamlHoverSource`       — a `hoverTooltip` callback that shows field
 *                                description, required status and example on hover.
 *
 * The module is intentionally free of Lit/HA runtime imports so it can be
 * consumed in the same lazy code-split chunk as ha-code-editor.
 */

import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import type { EditorView, Tooltip } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import { NodeProp } from "@lezer/common";
import type { HassEntities } from "home-assistant-js-websocket";
import type { AreaRegistryEntry } from "../data/area/area_registry";
import type { DeviceRegistryEntry } from "../data/device/device_registry";
import type { FloorRegistryEntry } from "../data/floor_registry";
import type { LabelRegistryEntry } from "../data/label/label_registry";
import {
  buildAreaCompletions,
  buildDeviceCompletions,
  buildEntityCompletions,
  buildFloorCompletions,
  buildLabelCompletions,
} from "./ha_completion_items";
import {
  buildArgTooltipDom,
  type HassArgHoverContext,
} from "./jinja_ha_completions";
import "../components/ha-code-editor-jinja-arg-hover";
import type { YamlFieldSchema, YamlFieldSchemaMap } from "./yaml_field_schema";
import { hasAllowUnknownFields } from "./yaml_field_schema";

// ---------------------------------------------------------------------------
// Helpers – YAML syntax tree traversal
// ---------------------------------------------------------------------------

/**
 * Returns the text content of a syntax node.
 */
function nodeText(node: SyntaxNode, doc: string): string {
  return doc.slice(node.from, node.to);
}

/**
 * Resolve the field schema for a given key path through a nested schema map.
 * Returns `undefined` if the path is not found.
 */
function resolveFieldSchema(
  schema: YamlFieldSchemaMap,
  path: string[]
): YamlFieldSchema | undefined {
  if (path.length === 0) return undefined;
  const [head, ...rest] = path;
  const field = schema[head];
  if (!field) return undefined;
  if (rest.length === 0) return field;
  if (field.fields) return resolveFieldSchema(field.fields, rest);
  return undefined;
}

// ---------------------------------------------------------------------------
// Value completions driven by selector type
// ---------------------------------------------------------------------------

/** validFor pattern for value completions — matches any typed text. */
const VALUE_VALID_FOR = /^.*$/;

function valueCompletionsForSelector(
  field: YamlFieldSchema,
  ctx: HaYamlCompletionContext
): Completion[] | null {
  const { selector } = field;
  if (!selector) return null;
  const type = Object.keys(selector)[0] as string;

  if (type === "boolean") {
    return [
      { label: "true", type: "keyword" },
      { label: "false", type: "keyword" },
    ];
  }

  if (type === "select") {
    const opts = (selector as any).select?.options;
    if (Array.isArray(opts)) {
      return opts.map((o: any) => ({
        label: typeof o === "object" ? String(o.value ?? o) : String(o),
        type: "enum",
        detail: typeof o === "object" && o.label ? o.label : undefined,
      }));
    }
  }

  if (type === "entity" && ctx.states) {
    return buildEntityCompletions(ctx.states);
  }

  if (type === "device" && ctx.devices) {
    return buildDeviceCompletions(ctx.devices);
  }

  if (type === "area" && ctx.areas) {
    return buildAreaCompletions(ctx.areas);
  }

  if (type === "floor" && ctx.floors) {
    return buildFloorCompletions(ctx.floors);
  }

  if (type === "label" && ctx.labels) {
    return buildLabelCompletions(ctx.labels);
  }

  if (type === "template") {
    return [
      { label: "{{ }}", type: "text", detail: "Jinja2 template" },
      { label: "{% %}", type: "text", detail: "Jinja2 block" },
    ];
  }

  return null;
}

// ---------------------------------------------------------------------------
// Completion source
// ---------------------------------------------------------------------------

export interface HaYamlCompletionContext {
  /** The current field schema map. */
  schema: YamlFieldSchemaMap;
  /** Optional entity states for EntitySelector completions. */
  states?: HassEntities;
  /** Optional device registry for DeviceSelector completions. */
  devices?: Record<string, DeviceRegistryEntry>;
  /** Optional area registry for AreaSelector completions. */
  areas?: Record<string, AreaRegistryEntry>;
  /** Optional floor registry for FloorSelector completions. */
  floors?: Record<string, FloorRegistryEntry>;
  /** Optional label registry for LabelSelector completions. */
  labels?: LabelRegistryEntry[];
}

/**
 * Returns a CodeMirror `CompletionSource` bound to the given field schema.
 *
 * Call this once per editor instance / schema change and pass the result to
 * `autocompletion({ override: [..., haYamlCompletionSource(ctx)] })`.
 */
export function haYamlCompletionSource(
  ctx: HaYamlCompletionContext
): (context: CompletionContext) => CompletionResult | null {
  return (context: CompletionContext): CompletionResult | null => {
    const { state, pos } = context;
    const doc = state.doc.toString();

    const tree = syntaxTree(state);
    const node = tree.resolveInner(pos, -1);

    // ---- SEQUENCE ITEM position: cursor is inside a list item ---------------
    // Lezer YAML: Pair → BlockSequence → Item → Literal
    if (
      node.name === "Literal" &&
      node.parent?.name === "Item" &&
      node.parent?.parent?.name === "BlockSequence"
    ) {
      const seqNode = node.parent.parent; // BlockSequence
      const pairNode = seqNode.parent; // Pair
      if (pairNode?.name === "Pair") {
        const keyNode = pairNode.getChild("Key");
        const keyLit = keyNode?.firstChild ?? keyNode;
        if (keyLit) {
          const keyText = nodeText(keyLit, doc);
          const ancestorPath = getAncestorKeyPath(pairNode.parent, doc);
          const fullPath = [...ancestorPath, keyText];
          const field = resolveFieldSchema(ctx.schema, fullPath);
          if (field) {
            const completions = valueCompletionsForSelector(field, ctx);
            if (completions) {
              return {
                options: completions,
                from: node.from,
                validFor: VALUE_VALID_FOR,
              };
            }
          }
        }
      }
      return null;
    }

    // ---- EMPTY SEQUENCE ITEM: cursor after "- " with no Literal yet ----------
    if (node.name === "-" && node.parent?.name === "BlockSequence") {
      // Only fire when cursor is strictly past the dash (space has been typed).
      if (pos <= node.to) return null;
      const seqNode = node.parent;
      const pairNode = seqNode.parent;
      if (pairNode?.name === "Pair") {
        const keyNode = pairNode.getChild("Key");
        const keyLit = keyNode?.firstChild ?? keyNode;
        if (keyLit) {
          const keyText = nodeText(keyLit, doc);
          const ancestorPath = getAncestorKeyPath(pairNode.parent, doc);
          const fullPath = [...ancestorPath, keyText];
          const field = resolveFieldSchema(ctx.schema, fullPath);
          if (field) {
            const completions = valueCompletionsForSelector(field, ctx);
            if (completions) {
              return {
                options: completions,
                from: pos,
                validFor: VALUE_VALID_FOR,
              };
            }
          }
        }
      }
      return null;
    }

    // ---- VALUE position: cursor is in a Literal value of a Pair --------------
    // Lezer YAML: Pair → Key, ":", Literal(value)
    if (node.name === "Literal" && node.parent?.name === "Pair") {
      const pair = node.parent;
      const keyNode = pair.getChild("Key");
      if (keyNode) {
        const keyLit = keyNode.firstChild ?? keyNode;
        const keyText = nodeText(keyLit, doc);
        const ancestorPath = getAncestorKeyPath(pair.parent, doc);
        const fullPath = [...ancestorPath, keyText];
        const field = resolveFieldSchema(ctx.schema, fullPath);
        if (field) {
          // If this field has sub-fields (nested mapping), the Literal is
          // actually the first key being typed — offer key completions from
          // the sub-schema rather than value completions.
          if (field.fields && Object.keys(field.fields).length > 0) {
            const word = context.matchBefore(/[\w_-]*/);
            const fromPos = word ? word.from : pos;
            const completions: Completion[] = Object.entries(field.fields).map(
              ([key, subField]) => ({
                label: key,
                type: "yaml-key",
                detail: subField.required ? "required" : undefined,
                info: subField.description,
                apply: buildKeyApply(key, subField),
                boost: subField.required ? 10 : 0,
              })
            );
            if (completions.length === 0) return null;
            return {
              options: completions,
              from: fromPos,
              validFor: /^[\w_-]*$/,
            };
          }

          const completions = valueCompletionsForSelector(field, ctx);
          if (completions) {
            const valueLiteral =
              pair
                .getChildren("Literal")
                .find((n) => n !== keyNode.firstChild && n !== keyNode) ?? null;
            const from = valueLiteral ? valueLiteral.from : pos;
            return { options: completions, from, validFor: VALUE_VALID_FOR };
          }
        }
      }
      return null;
    }

    // ---- EMPTY VALUE: cursor is right after "key: " with no value yet --------
    // When there's no value Literal, lezer puts the cursor on the ":" node
    // inside the Pair, or on the Pair itself just after the colon.
    if (node.name === ":" && node.parent?.name === "Pair") {
      const pair = node.parent;
      // Only fire when cursor is strictly past the colon (i.e. at least one
      // space has been typed), so we don't insert right after "key:".
      if (pos > node.to) {
        const keyNode = pair.getChild("Key");
        if (keyNode) {
          const keyLit = keyNode.firstChild ?? keyNode;
          const keyText = nodeText(keyLit, doc);
          const ancestorPath = getAncestorKeyPath(pair.parent, doc);
          const fullPath = [...ancestorPath, keyText];
          const field = resolveFieldSchema(ctx.schema, fullPath);
          if (field) {
            // Nested mapping field — offer key completions from sub-schema.
            if (field.fields && Object.keys(field.fields).length > 0) {
              const completions: Completion[] = Object.entries(
                field.fields
              ).map(([key, subField]) => ({
                label: key,
                type: "yaml-key",
                detail: subField.required ? "required" : undefined,
                info: subField.description,
                apply: buildKeyApply(key, subField),
                boost: subField.required ? 10 : 0,
              }));
              if (completions.length > 0) {
                return { options: completions, from: pos };
              }
            }
            const completions = valueCompletionsForSelector(field, ctx);
            if (completions) {
              return {
                options: completions,
                from: pos,
                validFor: VALUE_VALID_FOR,
              };
            }
          }
        }
      }
      return null;
    }

    // ---- KEY position: cursor is on a Key Literal or start of a new Pair ----
    // Determine which schema level to offer completions at.
    let schemaLevel: YamlFieldSchemaMap = ctx.schema;
    // Find the BlockMapping we are inside.
    let keyLiteralNode: SyntaxNode | null = null;

    // Are we inside a Key node?
    if (node.name === "Literal" && node.parent?.name === "Key") {
      keyLiteralNode = node;
    } else if (node.name === "Key") {
      // cursor is directly on a Key node, no literal node to pin
    }

    // Guard: walk up from the cursor node. If we pass through a node that is
    // a non-BlockMapping value child of a Pair (scalar Literal, FlowSequence,
    // FlowMapping, or a "," / "[" / "]" inside a flow node), the cursor is in
    // a value position — do not offer key completions.
    {
      let n: SyntaxNode | null = keyLiteralNode ?? node;
      while (n) {
        const p = n.parent;
        if (p?.name === "Pair") {
          // n is a direct child of a Pair. If it is NOT a Key, it is value-side.
          if (n.name !== "Key" && n.name !== ":") {
            // BlockMapping / BlockSequence as value means nested keys — OK.
            if (n.name !== "BlockMapping" && n.name !== "BlockSequence") {
              return null;
            }
          }
        }
        // Inside any flow node (FlowSequence, FlowMapping) → value position.
        if (
          n.name === "FlowSequence" ||
          n.name === "FlowMapping" ||
          n.name === "," ||
          n.name === "[" ||
          n.name === "]" ||
          n.name === "{" ||
          n.name === "}"
        ) {
          return null;
        }
        n = p;
      }
    }

    // Also guard: cursor is past end of an inner BlockMapping (e.g. "brightness: |"
    // where the inner BM ends at the colon). Find the deepest Pair whose ":"
    // is on the cursor line and which has no block value — that means cursor is
    // in a scalar value gap.
    // Also handles: empty sequence item "- |" where cursor is past the BlockSequence
    // end — find the "-" on the cursor line by text-scanning, then locate it in
    // the syntax tree to determine the field and return value completions.
    {
      const curLine = state.doc.lineAt(pos);
      const lineText = state.doc.sliceString(curLine.from, curLine.to);
      // Only proceed if the line looks like a sequence item (optional spaces + "- ")
      const dashMatch = /^(\s*)-(\s*)$/.exec(lineText);
      if (dashMatch && pos > curLine.from + dashMatch[1].length) {
        // Find the "-" node in the tree by resolving at its text position.
        const dashPos = curLine.from + dashMatch[1].length;
        const dashNode = syntaxTree(state).resolveInner(dashPos, 1);
        // Walk up to find the BlockSequence → Pair → field schema.
        let n: SyntaxNode | null = dashNode;
        while (n) {
          if (n.name === "BlockSequence") {
            const pairNode2 = n.parent;
            if (pairNode2?.name === "Pair") {
              const keyNode2 = pairNode2.getChild("Key");
              const keyLit2 = keyNode2?.firstChild ?? keyNode2;
              if (keyLit2) {
                const keyText2 = nodeText(keyLit2, doc);
                const ancestorPath2 = getAncestorKeyPath(pairNode2.parent, doc);
                const field2 = resolveFieldSchema(ctx.schema, [
                  ...ancestorPath2,
                  keyText2,
                ]);
                if (field2) {
                  const completions = valueCompletionsForSelector(field2, ctx);
                  if (completions) {
                    return {
                      options: completions,
                      from: pos,
                      validFor: VALUE_VALID_FOR,
                    };
                  }
                }
              }
            }
            return null;
          }
          n = n.parent;
        }
      }
    }

    // ---- SCALAR VALUE GAP: cursor is after "key: " but lezer has no Literal ----
    // Resolve from the start of the cursor line to find the Pair whose key
    // is on this line. Walking up from `pos` can land inside a sibling node's
    // BlockSequence when the previous field has list items, causing us to
    // miss the current Pair entirely.
    {
      const curLine2 = state.doc.lineAt(pos);
      const lineText2 = state.doc.sliceString(curLine2.from, curLine2.to);
      // Only proceed if line looks like "  key: " (optional spaces, a key, colon, optional space)
      // and NOT a sequence item ("- ").
      const keyColonMatch = /^(\s*)[\w_-]+\s*:\s*$/.test(lineText2);
      if (keyColonMatch) {
        // Resolve a node at the line start to find the Pair for this key.
        const lineStartNode = syntaxTree(state).resolveInner(
          curLine2.from + lineText2.search(/\S/),
          1
        );
        let n: SyntaxNode | null = lineStartNode;
        while (n) {
          if (n.name === "Pair") {
            const colon = n.getChild(":");
            if (
              colon &&
              state.doc.lineAt(colon.from).number === curLine2.number &&
              pos > colon.to
            ) {
              const hasBlockValue =
                n.getChild("BlockMapping") !== null ||
                n.getChild("BlockSequence") !== null ||
                n.getChild("FlowSequence") !== null ||
                n.getChild("FlowMapping") !== null;
              const hasScalarValue = n.getChildren("Literal").length > 1;
              if (!hasBlockValue && !hasScalarValue) {
                // Cursor is in scalar value gap (e.g. "area_id: |").
                const keyNode2 = n.getChild("Key");
                const keyLit2 = keyNode2?.firstChild ?? keyNode2;
                if (keyLit2) {
                  const keyText2 = nodeText(keyLit2, doc);
                  const ancestorPath2 = getAncestorKeyPath(n.parent, doc);
                  const field2 = resolveFieldSchema(ctx.schema, [
                    ...ancestorPath2,
                    keyText2,
                  ]);
                  if (field2) {
                    const completions2 = valueCompletionsForSelector(
                      field2,
                      ctx
                    );
                    if (completions2) {
                      return {
                        options: completions2,
                        from: pos,
                        validFor: VALUE_VALID_FOR,
                      };
                    }
                  }
                }
                return null;
              }
            }
            break; // found the Pair for this line, stop searching
          }
          n = n.parent;
        }
      }
    }

    // Walk up to find which BlockMapping this key belongs to.
    // When the cursor is on an empty/blank line, resolveInner returns a parent
    // BlockMapping rather than the inner one we're actually inside.
    // Strategy: find the indentation of the cursor line, then look backwards
    // for the nearest non-empty line at a *greater* indent — that line's first
    // char resolves into the inner BlockMapping we want.
    let bmNode: SyntaxNode | null = null;
    let pairNode: SyntaxNode | null = null;
    {
      const curLine = state.doc.lineAt(pos);
      const lineText = state.doc.sliceString(curLine.from, curLine.to);
      const curIndent = lineText.search(/\S/);

      let resolvePos: number;
      if (curIndent >= 0) {
        // Line has content — resolve from its first non-space char.
        resolvePos = curLine.from + curIndent;
      } else {
        // Empty/blank line — scan backwards for a line with greater indent
        // (i.e. a sibling or child line that's already inside the same block).
        resolvePos = pos; // fallback
        for (let ln = curLine.number - 1; ln >= 1; ln--) {
          const prevLine = state.doc.line(ln);
          const prevText = state.doc.sliceString(prevLine.from, prevLine.to);
          const prevIndent = prevText.search(/\S/);
          if (prevIndent < 0) continue; // skip blank lines
          // A line with more indentation is inside the same or deeper block.
          if (prevIndent > 0) {
            resolvePos = prevLine.from + prevIndent;
            break;
          }
          // Hit a root-level line — we're at root level.
          break;
        }
      }

      const resolveNode = syntaxTree(state).resolveInner(resolvePos, -1);
      let n: SyntaxNode | null = keyLiteralNode ?? resolveNode;
      while (n) {
        if (n.name === "Pair") pairNode = n;
        if (n.name === "BlockMapping") {
          bmNode = n;
          break;
        }
        n = n.parent;
      }
    }

    if (bmNode) {
      // Build the path of ancestor keys above this BlockMapping.
      const ancestorPath = getAncestorKeyPath(bmNode, doc);
      if (ancestorPath.length > 0) {
        const parentField = resolveFieldSchema(ctx.schema, ancestorPath);
        schemaLevel = parentField?.fields ?? {};
      }
    }

    if (Object.keys(schemaLevel).length === 0) return null;

    // Determine what has already been typed for this key.
    const word = context.matchBefore(/[\w_-]*/);
    if (!word && !context.explicit) return null;
    const fromPos = word ? word.from : pos;

    // Exclude keys already present in the current mapping.
    const alreadyUsed = new Set<string>();
    if (bmNode) {
      let c = bmNode.firstChild;
      while (c) {
        if (c.name === "Pair" && c !== pairNode) {
          const k = c.getChild("Key");
          const lit = k?.firstChild ?? k;
          if (lit) alreadyUsed.add(nodeText(lit, doc));
        }
        c = c.nextSibling;
      }
    }

    const completions: Completion[] = Object.entries(schemaLevel)
      .filter(([key]) => !alreadyUsed.has(key))
      .map(([key, field]) => ({
        label: key,
        type: "yaml-key",
        detail: field.required ? "required" : undefined,
        info: field.description,
        // Insert "key: " or "key:\n  " depending on selector type
        apply: buildKeyApply(key, field),
        boost: field.required ? 10 : 0,
      }));

    if (completions.length === 0) return null;
    return { options: completions, from: fromPos, validFor: /^[\w_-]*$/ };
  };
}

/**
 * Build the text to insert when a key completion is accepted.
 * For object/sequence selectors we add a newline; for simple values "key: ".
 */
function buildKeyApply(key: string, field: YamlFieldSchema): string {
  const type = field.selector ? Object.keys(field.selector)[0] : null;
  if (type === "object" || type === "action" || type === "condition") {
    return `${key}:\n  `;
  }
  if (field.fields && Object.keys(field.fields).length > 0) {
    return `${key}:\n  `;
  }
  return `${key}: `;
}

/**
 * Walk up from a node (expected to be a BlockMapping) and collect the
 * sequence of Pair keys that enclose it.
 */
function getAncestorKeyPath(bm: SyntaxNode | null, doc: string): string[] {
  const path: string[] = [];
  let cur: SyntaxNode | null = bm;
  while (cur) {
    if (cur.name === "Pair") {
      const keyNode = cur.getChild("Key");
      const lit = keyNode?.firstChild ?? keyNode;
      if (lit) path.unshift(nodeText(lit, doc));
    }
    cur = cur.parent;
  }
  return path.filter(Boolean);
}

// ---------------------------------------------------------------------------
// Hover tooltip source
// ---------------------------------------------------------------------------

export interface HaYamlHoverContext {
  /** The current field schema map. */
  schema: YamlFieldSchemaMap;
  /**
   * Optional localise callback used to translate field names/descriptions
   * that are i18n keys.  When absent, the raw string is displayed.
   */
  localize?: (key: string, ...args: unknown[]) => string;
  /** Optional HA context for rich entity/device/area value tooltips. */
  hassContext?: HassArgHoverContext;
}

/**
 * Returns a `hoverTooltip` callback.  Register it via:
 *
 *   hoverTooltip((view, pos) => haYamlHoverSource(view, pos, ctx))
 */
export function haYamlHoverSource(
  view: EditorView,
  pos: number,
  ctx: HaYamlHoverContext
): Tooltip | null {
  const doc = view.state.doc.toString();
  const tree = syntaxTree(view.state);
  const node = tree.resolveInner(pos, -1);

  // ---- Value hover: entity/device/area Literal in a Pair value or list item --
  if (ctx.hassContext && node.name === "Literal") {
    // Resolve the Pair that owns this value — either directly (scalar value)
    // or via BlockSequence → Item (list item).
    let pair: SyntaxNode | null = null;
    if (node.parent?.name === "Pair") {
      // scalar value: Literal is a direct child of Pair (not the Key)
      const keyNode = node.parent.getChild("Key");
      const keyLit2 = keyNode?.firstChild ?? keyNode;
      if (keyLit2 && node !== keyLit2 && node.from !== keyLit2.from) {
        pair = node.parent;
      }
    } else if (
      node.parent?.name === "Item" &&
      node.parent.parent?.name === "BlockSequence" &&
      node.parent.parent.parent?.name === "Pair"
    ) {
      // list item: Literal → Item → BlockSequence → Pair
      pair = node.parent.parent.parent;
    }

    if (pair) {
      const keyNode = pair.getChild("Key");
      const keyLit2 = keyNode?.firstChild ?? keyNode;
      if (keyLit2) {
        const keyText2 = nodeText(keyLit2, doc);
        const ancestorPath2 = getAncestorKeyPath(pair.parent, doc);
        const field2 = resolveFieldSchema(ctx.schema, [
          ...ancestorPath2,
          keyText2,
        ]);
        if (field2?.selector) {
          const selectorType = Object.keys(field2.selector)[0];
          const argType =
            selectorType === "entity"
              ? "entity_id"
              : selectorType === "device"
                ? "device_id"
                : selectorType === "area"
                  ? "area_id"
                  : selectorType === "floor"
                    ? "floor_id"
                    : selectorType === "label"
                      ? "label_id"
                      : null;
          if (argType) {
            const value = nodeText(node, doc);
            const dom = buildArgTooltipDom(
              argType as any,
              value,
              ctx.hassContext
            );
            if (dom) {
              return {
                pos: node.from,
                end: node.to,
                above: true,
                create: () => ({ dom }),
              };
            }
          }
        }
      }
    }
  }

  // ---- Key hover: show field name, description, type, example, default ----
  let keyLit: SyntaxNode | null = null;
  if (node.name === "Literal" && node.parent?.name === "Key") {
    keyLit = node;
  } else if (node.name === "Key") {
    keyLit = node.firstChild;
  }
  if (!keyLit) return null;

  const keyText = nodeText(keyLit, doc);
  if (!keyText) return null;

  // Build the path from ancestor BlockMappings.
  const pairNode = keyLit.parent?.parent; // Literal → Key → Pair
  const bmNode = pairNode?.parent; // Pair → BlockMapping
  const ancestorPath = getAncestorKeyPath(bmNode ?? null, doc);
  const fullPath = [...ancestorPath, keyText];

  const field = resolveFieldSchema(ctx.schema, fullPath);
  if (!field) return null;

  return {
    pos: keyLit.from,
    end: keyLit.to,
    above: true,
    create() {
      const dom = document.createElement("ha-code-editor-yaml-hover");
      (dom as any).fieldName = keyText;
      (dom as any).fieldSchema = field;
      if (ctx.localize) (dom as any).localize = ctx.localize;
      return { dom };
    },
  };
}

// ---------------------------------------------------------------------------
// Linting
// ---------------------------------------------------------------------------

export interface Diagnostic {
  from: number;
  to: number;
  severity: "error" | "warning" | "info";
  message: string;
}

/**
 * Produces lint diagnostics for a YAML document given a field schema.
 *
 * Currently checks:
 *   - Unknown keys (warning)
 *   - Required keys that are missing (error — at document level only for now)
 */
export function haYamlLintSource(
  view: EditorView,
  schema: YamlFieldSchemaMap
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const doc = view.state.doc.toString();
  function lintMapping(
    bmNode: SyntaxNode,
    schemaLevel: YamlFieldSchemaMap
  ): void {
    const presentKeys = new Set<string>();

    let child = bmNode.firstChild;
    while (child) {
      if (child.name === "Pair") {
        const keyNode = child.getChild("Key");
        const lit = keyNode?.firstChild ?? keyNode;
        if (lit) {
          const key = nodeText(lit, doc);
          presentKeys.add(key);

          if (!(key in schemaLevel)) {
            if (!hasAllowUnknownFields(schemaLevel)) {
              diagnostics.push({
                from: lit.from,
                to: lit.to,
                severity: "warning",
                message: `Unknown field: "${key}"`,
              });
            }
          } else {
            // Recurse into nested mappings.
            const fieldDef = schemaLevel[key];
            if (fieldDef.fields) {
              const valueNode = child.getChildren("BlockMapping").find(Boolean);
              if (valueNode) lintMapping(valueNode, fieldDef.fields);
            }
          }
        }
      }
      child = child.nextSibling;
    }

    // Check for missing required fields (top-level only to avoid noise).
    for (const [key, fieldDef] of Object.entries(schemaLevel)) {
      if (fieldDef.required && !presentKeys.has(key)) {
        // Point to start of document if we have no better location.
        const docNode = bmNode.parent;
        const from = docNode?.from ?? 0;
        diagnostics.push({
          from,
          to: from + 1,
          severity: "error",
          message: `Required field missing: "${key}"`,
        });
      }
    }
  }

  // Find the root BlockMapping.
  // With jinja({ base: yaml() }) the outer tree is Template → Text, and the
  // YAML parse is mounted on the Text node via NodeProp.mounted. With plain
  // yaml() the tree is Stream → Document → BlockMapping directly.
  let bm: SyntaxNode | null = null;

  const outerTree = syntaxTree(view.state);
  // Try plain yaml() path first: walk down until BlockMapping.
  let cur: SyntaxNode | null = outerTree.topNode;
  while (cur && cur.name !== "BlockMapping") {
    // If this node has a mounted subtree (jinja wrapper), use that tree instead.
    const mounted = cur.node?.tree
      ? cur.node.tree.prop(NodeProp.mounted)
      : null;
    if (mounted) {
      // The mounted tree root — walk down into it.
      cur = mounted.tree.topNode;
      continue;
    }
    cur = cur.firstChild;
  }
  if (cur?.name === "BlockMapping") {
    bm = cur;
  }

  if (bm) {
    lintMapping(bm, schema);
  }

  return diagnostics;
}
