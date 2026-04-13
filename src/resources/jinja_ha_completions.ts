import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";

function completions(words: string[], type: string): Completion[] {
  return words.map((label) => ({ label, type }));
}

// ---------------------------------------------------------------------------
// Standard Jinja2 completions (from @codemirror/lang-jinja internals).
// Replicated here so we can apply a strict Jinja-context guard, since
// jinjaCompletionSource()'s own fallback fires in plain YAML text too.
// ---------------------------------------------------------------------------

const JINJA_TAGS: Completion[] = completions(
  [
    "raw",
    "endraw",
    "filter",
    "endfilter",
    "trans",
    "pluralize",
    "endtrans",
    "with",
    "endwith",
    "autoescape",
    "endautoescape",
    "if",
    "elif",
    "else",
    "endif",
    "for",
    "endfor",
    "call",
    "endcall",
    "block",
    "endblock",
    "set",
    "endset",
    "macro",
    "endmacro",
    "import",
    "include",
    "break",
    "continue",
    "debug",
    "do",
    "extends",
  ],
  "keyword"
);

const JINJA_FILTERS: Completion[] = completions(
  [
    "abs",
    "attr",
    "batch",
    "capitalize",
    "center",
    "count",
    "default",
    "d",
    "dictsort",
    "e",
    "escape",
    "filesizeformat",
    "first",
    "float",
    "forceescape",
    "format",
    "groupby",
    "indent",
    "int",
    "items",
    "join",
    "last",
    "length",
    "list",
    "lower",
    "map",
    "max",
    "min",
    "pprint",
    "random",
    "reject",
    "rejectattr",
    "replace",
    "reverse",
    "round",
    "safe",
    "select",
    "selectattr",
    "slice",
    "sort",
    "string",
    "striptags",
    "sum",
    "title",
    "tojson",
    "trim",
    "truncate",
    "unique",
    "upper",
    "urlencode",
    "urlize",
    "wordcount",
    "wordwrap",
    "xmlattr",
  ],
  "function"
);

const JINJA_EXPRESSIONS: Completion[] = completions(
  [
    // Tests / functions
    "boolean",
    "callable",
    "defined",
    "divisibleby",
    "eq",
    "escaped",
    "even",
    "filter",
    "float",
    "ge",
    "gt",
    "in",
    "integer",
    "iterable",
    "le",
    "lower",
    "lt",
    "mapping",
    "ne",
    "none",
    "number",
    "odd",
    "sameas",
    "sequence",
    "string",
    "test",
    "undefined",
    "upper",
    // Globals
    "range",
    "lipsum",
    "dict",
    "joiner",
    "namespace",
    // Keywords
    "loop",
    "super",
    "self",
    "true",
    "false",
    "varargs",
    "kwargs",
    "caller",
    "name",
    "arguments",
    "catch_kwargs",
    "catch_varargs",
  ],
  "function"
);

// ---------------------------------------------------------------------------
// Home Assistant-specific additions
// ---------------------------------------------------------------------------

// HA-specific global functions (used in expression context: {{ ... }})
const HA_VARIABLES: Completion[] = completions(
  [
    // Areas
    "area_devices",
    "area_entities",
    "area_id",
    "area_name",
    "areas",
    // Devices
    "device_attr",
    "device_entities",
    "device_id",
    "device_name",
    // Entities
    "config_entry_attr",
    "config_entry_id",
    "entity_name",
    "integration_entities",
    // Floors
    "floor_areas",
    "floor_entities",
    "floor_id",
    "floor_name",
    "floors",
    // Labels
    "label_areas",
    "label_description",
    "label_devices",
    "label_entities",
    "label_id",
    "label_name",
    "labels",
    // States
    "closest",
    "distance",
    "expand",
    "is_state",
    "is_state_attr",
    "state_attr",
    "state_attr_translated",
    "state_translated",
    "states",
    // Date/Time
    "as_datetime",
    "as_local",
    "as_timedelta",
    "as_timestamp",
    "now",
    "strptime",
    "time_since",
    "time_until",
    "timedelta",
    "timestamp_custom",
    "timestamp_local",
    "timestamp_utc",
    "today_at",
    "utcnow",
    // Math
    "acos",
    "asin",
    "atan",
    "atan2",
    "average",
    "bitwise_and",
    "bitwise_or",
    "bitwise_xor",
    "clamp",
    "cos",
    "e",
    "log",
    "median",
    "pi",
    "remap",
    "sin",
    "sqrt",
    "statistical_mode",
    "tan",
    "tau",
    "wrap",
    // Encoding
    "base64_decode",
    "base64_encode",
    "from_hex",
    "md5",
    "pack",
    "sha1",
    "sha256",
    "sha512",
    "unpack",
    // Functional
    "apply",
    "as_function",
    "iif",
    "ord",
    "version",
    "zip",
    // Type conversion
    "bool",
    "float",
    "int",
    "is_number",
    "typeof",
    // Regex
    "regex_findall",
    "regex_findall_index",
    "regex_match",
    "regex_replace",
    "regex_search",
    // Collections
    "combine",
    "difference",
    "flatten",
    "from_json",
    "intersect",
    "merge_response",
    "shuffle",
    "symmetric_difference",
    "to_json",
    "union",
    // Repairs
    "issue",
    "issues",
    // Misc (deprecated but still valid)
    "relative_time",
  ],
  "function"
);

// HA-specific tests (used after `is` keyword)
const HA_TESTS: Completion[] = completions(
  [
    "contains",
    "false",
    "has_value",
    "is_device_attr",
    "is_hidden_entity",
    "is_number",
    "is_state",
    "is_state_attr",
    "match",
    "search",
    "true",
  ],
  "function"
);

// HA-specific filters (used after `|` pipe)
const HA_FILTERS: Completion[] = completions(
  [
    "as_datetime",
    "as_local",
    "as_timedelta",
    "as_timestamp",
    "base64_decode",
    "base64_encode",
    "bool",
    "combine",
    "difference",
    "expand",
    "flatten",
    "from_hex",
    "from_json",
    "iif",
    "intersect",
    "is_defined",
    "is_number",
    "log",
    "md5",
    "multiply",
    "ordinal",
    "pack",
    "regex_findall",
    "regex_findall_index",
    "regex_replace",
    "regex_search",
    "relative_time",
    "sha256",
    "shuffle",
    "slugify",
    "sqrt",
    "symmetric_difference",
    "time_since",
    "time_until",
    "timestamp_custom",
    "timestamp_local",
    "timestamp_utc",
    "to_json",
    "typeof",
    "union",
    "unpack",
    "version",
  ],
  "function"
);

// Combined lists for each context
const ALL_FILTERS: Completion[] = [...JINJA_FILTERS, ...HA_FILTERS];
const ALL_EXPRESSIONS: Completion[] = [
  ...JINJA_EXPRESSIONS,
  ...HA_VARIABLES,
  ...HA_TESTS,
];
const ALL_TAGS: Completion[] = JINJA_TAGS;

// ---------------------------------------------------------------------------
// Context detection
// ---------------------------------------------------------------------------

const VALID_FOR = /^[\w\u00c0-\uffff]*$/;

// Node names that only appear inside Jinja delimiters ({{ }}, {% %}, {# #}).
const JINJA_NODES = new Set([
  "Interpolation",
  "VariableName",
  "MemberExpression",
  "CallExpression",
  "FilterExpression",
  "BinaryExpression",
  "NotExpression",
  "ConditionalExpression",
  "ArrayExpression",
  "TupleExpression",
  "ParenthesizedExpression",
  "DictExpression",
  "ArgumentList",
  "NamedArgument",
  "IfStatement",
  "ForStatement",
  "SetStatement",
  "BlockStatement",
  "MacroStatement",
  "CallStatement",
  "FilterStatement",
  "WithStatement",
  "TransStatement",
  "AutoescapeStatement",
  "Tag",
]);

function isInsideJinja(node: SyntaxNode): boolean {
  let cur: SyntaxNode | null = node;
  while (cur) {
    if (JINJA_NODES.has(cur.name)) return true;
    cur = cur.parent;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Completion source
// ---------------------------------------------------------------------------

/**
 * A single CodeMirror CompletionSource covering all Jinja2 completions
 * (standard + HA-specific) with a strict Jinja-context guard.
 *
 * Replaces jinjaCompletionSource() entirely. The built-in source has a
 * word-match fallback that fires on plain YAML text ("Text" nodes are not
 * excluded by its guard), causing completions to appear outside {{ }}/{% %}.
 * This source uses isInsideJinja() to prevent that.
 */
export function haJinjaCompletionSource(
  context: CompletionContext
): CompletionResult | null {
  const { state, pos } = context;
  const node = syntaxTree(state)
    .resolveInner(pos, -1)
    .enterUnfinishedNodesBefore(pos);
  const before = node.childBefore(pos)?.name ?? node.name;

  // Filter context: after `|`
  if (node.name === "FilterName") {
    return { options: ALL_FILTERS, from: node.from, validFor: VALID_FOR };
  }
  if (context.explicit && (before === "FilterOp" || before === "filter")) {
    return { options: ALL_FILTERS, from: pos, validFor: VALID_FOR };
  }

  // Tag context: inside {% ... %}
  if (node.name === "TagName") {
    return { options: ALL_TAGS, from: node.from, validFor: VALID_FOR };
  }
  if (context.explicit && before === "{%") {
    return { options: ALL_TAGS, from: pos, validFor: VALID_FOR };
  }

  // Expression context: {{ ... }}, after `is`, function args, etc.
  // VariableName is grammar-constrained to Jinja, no extra guard needed.
  if (node.name === "VariableName") {
    return { options: ALL_EXPRESSIONS, from: node.from, validFor: VALID_FOR };
  }

  // Fallback for partially-typed words — guard strictly to Jinja context.
  const word = context.matchBefore(/[\w\u00c0-\uffff]+$/);
  if (!word || !isInsideJinja(node)) return null;
  return { options: ALL_EXPRESSIONS, from: word.from, validFor: VALID_FOR };
}
