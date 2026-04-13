import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import { snippetCompletion } from "@codemirror/autocomplete";
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

// HA-specific global functions that take arguments — as rich snippet completions.
interface HaFunctionDef {
  /** The snippet template, e.g. 'states("${entity_id}")' */
  snippet: string;
  /** Short signature shown in the detail column */
  detail: string;
  /** Human-readable description shown in the info popup */
  info: string;
}

/* eslint-disable no-template-curly-in-string */
const HA_FUNCTION_DEFS: HaFunctionDef[] = [
  // --- States ---
  {
    snippet: 'states("${entity_id}")',
    detail: "entity_id, rounded?, with_unit?",
    info: "Returns the state of an entity as a string.",
  },
  {
    snippet: 'is_state("${entity_id}", "${value}")',
    detail: "entity_id, value",
    info: "Returns true if the entity state matches the given value (or one of the values in a list).",
  },
  {
    snippet: 'state_attr("${entity_id}", "${attribute}")',
    detail: "entity_id, attribute",
    info: "Returns the value of the given attribute for the entity, or None if it doesn't exist.",
  },
  {
    snippet: 'is_state_attr("${entity_id}", "${attribute}", ${value})',
    detail: "entity_id, attribute, value",
    info: "Returns true if the entity attribute matches the given value.",
  },
  {
    snippet: 'state_attr_translated("${entity_id}", "${attribute}")',
    detail: "entity_id, attribute",
    info: "Returns the translated value of the given attribute for the entity.",
  },
  {
    snippet: 'state_translated("${entity_id}")',
    detail: "entity_id",
    info: "Returns the translated state of an entity.",
  },
  {
    snippet: 'expand("${entity_id}")',
    detail: "entity_id, ...",
    info: "Expands groups and returns a list of all entities in the group and their states.",
  },
  // --- Areas ---
  {
    snippet: 'area_id("${entity_id_or_name}")',
    detail: "entity_id or area name",
    info: "Returns the area ID for a given entity ID or area name.",
  },
  {
    snippet: 'area_name("${area_id_or_entity}")',
    detail: "area_id or entity_id",
    info: "Returns the area name for a given area ID or entity ID.",
  },
  {
    snippet: 'area_entities("${area_id_or_name}")',
    detail: "area_id or area name",
    info: "Returns a list of entity IDs that belong to the given area.",
  },
  {
    snippet: 'area_devices("${area_id_or_name}")',
    detail: "area_id or area name",
    info: "Returns a list of device IDs that belong to the given area.",
  },
  // --- Devices ---
  {
    snippet: 'device_id("${entity_id}")',
    detail: "entity_id",
    info: "Returns the device ID for the given entity ID.",
  },
  {
    snippet: 'device_name("${device_id_or_entity}")',
    detail: "device_id or entity_id",
    info: "Returns the device name for the given device ID or entity ID.",
  },
  {
    snippet: 'device_attr("${device_id_or_entity}", "${attribute}")',
    detail: "device_id or entity_id, attribute",
    info: "Returns the value of the given attribute for the device.",
  },
  {
    snippet: 'device_entities("${device_id}")',
    detail: "device_id",
    info: "Returns a list of entity IDs for the given device.",
  },
  // --- Entities ---
  {
    snippet: 'entity_name("${entity_id}")',
    detail: "entity_id",
    info: "Returns the name of the entity.",
  },
  {
    snippet: 'config_entry_id("${entity_id}")',
    detail: "entity_id",
    info: "Returns the config entry ID associated with the entity.",
  },
  {
    snippet: 'config_entry_attr("${entity_id}", "${attribute}")',
    detail: "entity_id, attribute",
    info: "Returns the value of the given config entry attribute for the entity.",
  },
  {
    snippet: 'integration_entities("${integration}")',
    detail: "integration",
    info: "Returns a list of entity IDs belonging to the given integration.",
  },
  // --- Floors ---
  {
    snippet: 'floor_id("${area_id_or_name}")',
    detail: "area_id or area name",
    info: "Returns the floor ID for a given area.",
  },
  {
    snippet: 'floor_name("${floor_id}")',
    detail: "floor_id",
    info: "Returns the floor name for the given floor ID.",
  },
  {
    snippet: 'floor_areas("${floor_id}")',
    detail: "floor_id",
    info: "Returns a list of area IDs that belong to the given floor.",
  },
  {
    snippet: 'floor_entities("${floor_id}")',
    detail: "floor_id",
    info: "Returns a list of entity IDs that belong to the given floor.",
  },
  // --- Labels ---
  {
    snippet: 'label_id("${label_name}")',
    detail: "label name",
    info: "Returns the label ID for the given label name.",
  },
  {
    snippet: 'label_name("${label_id}")',
    detail: "label_id",
    info: "Returns the label name for the given label ID.",
  },
  {
    snippet: 'label_description("${label_id}")',
    detail: "label_id",
    info: "Returns the description of the given label.",
  },
  {
    snippet: 'label_areas("${label_id}")',
    detail: "label_id",
    info: "Returns a list of area IDs that have the given label.",
  },
  {
    snippet: 'label_devices("${label_id}")',
    detail: "label_id",
    info: "Returns a list of device IDs that have the given label.",
  },
  {
    snippet: 'label_entities("${label_id}")',
    detail: "label_id",
    info: "Returns a list of entity IDs that have the given label.",
  },
  // --- Date/Time ---
  {
    snippet: "now()",
    detail: "",
    info: "Returns the current local datetime.",
  },
  {
    snippet: "utcnow()",
    detail: "",
    info: "Returns the current UTC datetime.",
  },
  {
    snippet: 'today_at("${time_str}")',
    detail: "time_str",
    info: 'Returns a datetime object for the given time string (e.g. "08:00") today in local time.',
  },
  {
    snippet: "as_datetime(${value})",
    detail: "value",
    info: "Converts a timestamp or string to a datetime object.",
  },
  {
    snippet: "as_local(${datetime})",
    detail: "datetime",
    info: "Converts a UTC datetime to the local timezone.",
  },
  {
    snippet: 'as_timedelta("${string}")',
    detail: "string",
    info: "Parses an ISO 8601 duration string into a timedelta object.",
  },
  {
    snippet: "as_timestamp(${value})",
    detail: "value, default?",
    info: "Converts a datetime or string to a Unix timestamp.",
  },
  {
    snippet: 'strptime("${string}", "${format}")',
    detail: "string, format, default?",
    info: "Parses a date/time string using the given format.",
  },
  {
    snippet: "timedelta(${days})",
    detail:
      "days?, seconds?, microseconds?, milliseconds?, minutes?, hours?, weeks?",
    info: "Creates a timedelta object.",
  },
  {
    snippet: 'timestamp_custom(${timestamp}, "${format}")',
    detail: "timestamp, format, local_time?",
    info: "Formats a Unix timestamp using a custom strftime format string.",
  },
  {
    snippet: "timestamp_local(${timestamp})",
    detail: "timestamp, default?",
    info: "Converts a Unix timestamp to a local time string.",
  },
  {
    snippet: "timestamp_utc(${timestamp})",
    detail: "timestamp, default?",
    info: "Converts a Unix timestamp to a UTC time string.",
  },
  {
    snippet: "time_since(${datetime})",
    detail: "datetime",
    info: "Returns a human-readable string of how long ago the datetime was.",
  },
  {
    snippet: "time_until(${datetime})",
    detail: "datetime",
    info: "Returns a human-readable string of how long until the datetime.",
  },
  // --- Math ---
  {
    snippet: "log(${value})",
    detail: "value, base?",
    info: "Returns the logarithm of value. Defaults to natural log; optionally specify base.",
  },
  {
    snippet: "sin(${value})",
    detail: "value",
    info: "Returns the sine of value (in radians).",
  },
  {
    snippet: "cos(${value})",
    detail: "value",
    info: "Returns the cosine of value (in radians).",
  },
  {
    snippet: "tan(${value})",
    detail: "value",
    info: "Returns the tangent of value (in radians).",
  },
  {
    snippet: "asin(${value})",
    detail: "value",
    info: "Returns the arcsine of value in radians.",
  },
  {
    snippet: "acos(${value})",
    detail: "value",
    info: "Returns the arccosine of value in radians.",
  },
  {
    snippet: "atan(${value})",
    detail: "value",
    info: "Returns the arctangent of value in radians.",
  },
  {
    snippet: "atan2(${y}, ${x})",
    detail: "y, x",
    info: "Returns atan(y/x) in radians.",
  },
  {
    snippet: "sqrt(${value})",
    detail: "value",
    info: "Returns the square root of value.",
  },
  {
    snippet: "average(${value}, ${default})",
    detail: "value, ...",
    info: "Returns the average of a list of numbers.",
  },
  {
    snippet: "median(${value})",
    detail: "value, ...",
    info: "Returns the median of a list of numbers.",
  },
  {
    snippet: "statistical_mode(${value})",
    detail: "value, ...",
    info: "Returns the statistical mode (most common value) of a list.",
  },
  {
    snippet: "clamp(${value}, ${min}, ${max})",
    detail: "value, min, max",
    info: "Clamps value between min and max.",
  },
  {
    snippet: "remap(${value}, ${in_min}, ${in_max}, ${out_min}, ${out_max})",
    detail: "value, in_min, in_max, out_min, out_max",
    info: "Re-maps a number from one range to another.",
  },
  {
    snippet: "wrap(${value}, ${min}, ${max})",
    detail: "value, min, max",
    info: "Wraps value into the range [min, max).",
  },
  {
    snippet: "bitwise_and(${value}, ${mask})",
    detail: "value, mask",
    info: "Bitwise AND of two integers.",
  },
  {
    snippet: "bitwise_or(${value}, ${mask})",
    detail: "value, mask",
    info: "Bitwise OR of two integers.",
  },
  {
    snippet: "bitwise_xor(${value}, ${mask})",
    detail: "value, mask",
    info: "Bitwise XOR of two integers.",
  },
  // --- Type conversion ---
  {
    snippet: "int(${value})",
    detail: "value, default?",
    info: "Converts value to integer. Returns default (0) on error.",
  },
  {
    snippet: "float(${value})",
    detail: "value, default?",
    info: "Converts value to float. Returns default (0.0) on error.",
  },
  {
    snippet: "bool(${value})",
    detail: "value, default?",
    info: "Converts value to boolean. Returns default on error.",
  },
  {
    snippet: "is_number(${value})",
    detail: "value",
    info: "Returns true if value can be interpreted as a number.",
  },
  {
    snippet: "typeof(${value})",
    detail: "value",
    info: "Returns a string representing the type of value.",
  },
  // --- Regex ---
  {
    snippet: 'regex_search("${pattern}", "${string}")',
    detail: "pattern, string, ignorecase?",
    info: "Returns true if pattern matches anywhere in string.",
  },
  {
    snippet: 'regex_match("${pattern}", "${string}")',
    detail: "pattern, string, ignorecase?",
    info: "Returns true if pattern matches at the start of string.",
  },
  {
    snippet: 'regex_replace("${pattern}", "${replacement}", "${string}")',
    detail: "pattern, replacement, string, ignorecase?",
    info: "Replaces all matches of pattern in string with replacement.",
  },
  {
    snippet: 'regex_findall("${pattern}", "${string}")',
    detail: "pattern, string, ignorecase?",
    info: "Returns a list of all non-overlapping matches of pattern in string.",
  },
  {
    snippet: 'regex_findall_index("${pattern}", "${string}", ${index})',
    detail: "pattern, string, index, ignorecase?",
    info: "Returns the match at the given group index from regex_findall.",
  },
  // --- Collections ---
  {
    snippet: "combine(${dict1}, ${dict2})",
    detail: "dict, ..., recursive?, list_merge?",
    info: "Merges two or more dictionaries.",
  },
  {
    snippet: "flatten(${list})",
    detail: "list, levels?",
    info: "Flattens a nested list.",
  },
  {
    snippet: "intersect(${list1}, ${list2})",
    detail: "list1, list2",
    info: "Returns the intersection of two lists.",
  },
  {
    snippet: "union(${list1}, ${list2})",
    detail: "list1, list2",
    info: "Returns the union of two lists.",
  },
  {
    snippet: "difference(${list1}, ${list2})",
    detail: "list1, list2",
    info: "Returns elements in list1 that are not in list2.",
  },
  {
    snippet: "symmetric_difference(${list1}, ${list2})",
    detail: "list1, list2",
    info: "Returns elements in either list but not both.",
  },
  {
    snippet: 'from_json("${string}")',
    detail: "string",
    info: "Parses a JSON string into a Python object.",
  },
  {
    snippet: "to_json(${value})",
    detail: "value, ensure_ascii?, sort_keys?, indent?",
    info: "Serializes a value to a JSON string.",
  },
  {
    snippet: "merge_response(${response1}, ${response2})",
    detail: "response, ...",
    info: "Merges multiple service response dictionaries.",
  },
  {
    snippet: "shuffle(${list})",
    detail: "list",
    info: "Returns a copy of the list in a random order.",
  },
  // --- Encoding ---
  {
    snippet: 'base64_encode("${string}")',
    detail: "string",
    info: "Encodes a string using Base64.",
  },
  {
    snippet: 'base64_decode("${string}")',
    detail: "string",
    info: "Decodes a Base64-encoded string.",
  },
  {
    snippet: 'from_hex("${string}")',
    detail: "string",
    info: "Converts a hex string to an integer.",
  },
  {
    snippet: 'md5("${string}")',
    detail: "string",
    info: "Returns the MD5 hash of a string.",
  },
  {
    snippet: 'sha1("${string}")',
    detail: "string",
    info: "Returns the SHA-1 hash of a string.",
  },
  {
    snippet: 'sha256("${string}")',
    detail: "string",
    info: "Returns the SHA-256 hash of a string.",
  },
  {
    snippet: 'sha512("${string}")',
    detail: "string",
    info: "Returns the SHA-512 hash of a string.",
  },
  {
    snippet: 'pack("${format}", ${value})',
    detail: "format, value, ...",
    info: "Packs values into a bytes object using struct.pack format.",
  },
  {
    snippet: 'unpack("${format}", ${bytes})',
    detail: "format, bytes, offset?",
    info: "Unpacks values from a bytes object using struct.unpack format.",
  },
  // --- Functional ---
  {
    snippet: "iif(${condition}, ${if_true}, ${if_false})",
    detail: "condition, if_true, if_false?",
    info: "Inline if: returns if_true when condition is truthy, otherwise if_false.",
  },
  {
    snippet: "as_function(${value})",
    detail: "value",
    info: "Converts a value to a callable template function.",
  },
  {
    snippet: "apply(${function}, ${args})",
    detail: "function, args?, kwargs?",
    info: "Calls the given function with the provided arguments.",
  },
  {
    snippet: "zip(${list1}, ${list2})",
    detail: "list1, list2, ...",
    info: "Returns a list of tuples pairing elements from each list.",
  },
  {
    snippet: 'ord("${character}")',
    detail: "character",
    info: "Returns the Unicode code point for the given character.",
  },
  // --- Geometry ---
  {
    snippet: "closest(${lat}, ${lon}, ${entities})",
    detail: "lat, lon, entities",
    info: "Returns the closest entity to the given coordinates.",
  },
  {
    snippet: "distance(${lat1}, ${lon1}, ${lat2}, ${lon2})",
    detail: "lat1, lon1, lat2, lon2",
    info: "Returns the distance in kilometers between two points.",
  },
];
/* eslint-enable no-template-curly-in-string */

// ---------------------------------------------------------------------------
// Argument type map — derived from snippet placeholder names
// ---------------------------------------------------------------------------

/**
 * Semantic completion type for a string argument in a Jinja function call.
 * Add new values here as completion sources are implemented.
 */
export type JinjaArgType =
  | "entity_id"
  | "area_id"
  | "device_id"
  | "floor_id"
  | "label_id"
  | "integration"
  | "attribute";

// Maps each placeholder name (as it appears in snippets) to a JinjaArgType.
// Placeholders not listed here produce no string autocompletion.
/* eslint-disable no-template-curly-in-string */
const PLACEHOLDER_TYPES: Record<string, JinjaArgType> = {
  "${entity_id}": "entity_id",
  "${entity_id_or_name}": "entity_id",
  "${area_id_or_name}": "area_id",
  "${area_id_or_entity}": "area_id",
  "${device_id}": "device_id",
  "${device_id_or_entity}": "device_id",
  "${floor_id}": "floor_id",
  "${label_id}": "label_id",
  "${integration}": "integration",
  "${attribute}": "attribute",
};
/* eslint-enable no-template-curly-in-string */

/**
 * For every HA function that has at least one typed string argument, maps
 * the function name to a Map of (zero-based arg index → JinjaArgType).
 *
 * Built by scanning snippet placeholders so it stays in sync automatically
 * when new functions are added to HA_FUNCTION_DEFS.
 */
export const JINJA_FUNCTION_ARG_TYPES = new Map<
  string,
  Map<number, JinjaArgType>
>(
  HA_FUNCTION_DEFS.flatMap((d) => {
    const fnName = d.snippet.split("(")[0];
    const argsStr = d.snippet.slice(
      d.snippet.indexOf("(") + 1,
      d.snippet.lastIndexOf(")")
    );
    // Split on top-level commas (no nested parens in these snippets).
    const args = argsStr.split(",").map((a) => a.trim());
    const argTypeMap = new Map<number, JinjaArgType>();
    args.forEach((arg, idx) => {
      // Find the first placeholder token in this arg slot.
      const match = arg.match(/\$\{[^}]+\}/);
      if (match) {
        const type = PLACEHOLDER_TYPES[match[0]];
        if (type) argTypeMap.set(idx, type);
      }
    });
    return argTypeMap.size > 0 ? [[fnName, argTypeMap] as const] : [];
  })
);

// Build Completion objects from the definitions.
// snippetCompletion is used for functions so the cursor jumps into arg1.
const HA_FUNCTION_COMPLETIONS: Completion[] = HA_FUNCTION_DEFS.map((def) =>
  snippetCompletion(def.snippet, {
    label: def.snippet.split("(")[0],
    detail: def.detail,
    info: def.info,
    type: "function",
  })
);

// HA-specific plain variables / constants (no arguments)
const HA_PLAIN_VARIABLES: Completion[] = completions(
  [
    "areas",
    "floors",
    "labels",
    "now",
    "utcnow",
    "e",
    "pi",
    "tau",
    "version",
    "relative_time",
    "issue",
    "issues",
  ],
  "variable"
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
  ...HA_FUNCTION_COMPLETIONS,
  ...HA_PLAIN_VARIABLES,
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

  // Never offer expression completions inside a string literal — those are
  // handled by the context-aware string-arg completion source in ha-code-editor.
  if (node.name === "StringLiteral" || node.parent?.name === "StringLiteral") {
    return null;
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
