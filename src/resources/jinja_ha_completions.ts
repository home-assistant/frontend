import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import { snippetCompletion } from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";

// ---------------------------------------------------------------------------
// Standard Jinja2 completions (from @codemirror/lang-jinja internals).
// Replicated here so we can apply a strict Jinja-context guard, since
// jinjaCompletionSource()'s own fallback fires in plain YAML text too.
// ---------------------------------------------------------------------------

const JINJA_TAGS: Completion[] = [
  {
    label: "raw",
    type: "keyword",
    info: "Marks a block whose content is output as-is, without Jinja2 processing.",
  },
  {
    label: "endraw",
    type: "keyword",
    info: "Ends a {% raw %} block.",
  },
  {
    label: "filter",
    type: "keyword",
    detail: "filter_name",
    info: "Applies a filter to the content of the block.",
  },
  {
    label: "endfilter",
    type: "keyword",
    info: "Ends a {% filter %} block.",
  },
  {
    label: "trans",
    type: "keyword",
    info: "Marks a block for translation.",
  },
  {
    label: "pluralize",
    type: "keyword",
    info: "Provides plural and singular forms inside a {% trans %} block.",
  },
  {
    label: "endtrans",
    type: "keyword",
    info: "Ends a {% trans %} block.",
  },
  {
    label: "with",
    type: "keyword",
    info: "Creates a new inner scope where variables can be set.",
  },
  {
    label: "endwith",
    type: "keyword",
    info: "Ends a {% with %} block.",
  },
  {
    label: "autoescape",
    type: "keyword",
    detail: "true|false",
    info: "Enables or disables HTML autoescaping for the block.",
  },
  {
    label: "endautoescape",
    type: "keyword",
    info: "Ends an {% autoescape %} block.",
  },
  {
    label: "if",
    type: "keyword",
    detail: "condition",
    info: "Renders the block only when the condition is true.",
  },
  {
    label: "elif",
    type: "keyword",
    detail: "condition",
    info: "Alternative condition in an {% if %} block.",
  },
  {
    label: "else",
    type: "keyword",
    info: "Fallback branch in an {% if %} or {% for %} block.",
  },
  {
    label: "endif",
    type: "keyword",
    info: "Ends an {% if %} block.",
  },
  {
    label: "for",
    type: "keyword",
    detail: "variable in iterable",
    info: "Iterates over a list or other iterable. Provides loop.index, loop.first, loop.last, etc.",
  },
  {
    label: "endfor",
    type: "keyword",
    info: "Ends a {% for %} block.",
  },
  {
    label: "call",
    type: "keyword",
    detail: "macro_name(args)",
    info: "Calls a macro and passes the call block's content as caller().",
  },
  {
    label: "endcall",
    type: "keyword",
    info: "Ends a {% call %} block.",
  },
  {
    label: "block",
    type: "keyword",
    detail: "block_name",
    info: "Defines a named block that child templates can override.",
  },
  {
    label: "endblock",
    type: "keyword",
    info: "Ends a {% block %} definition.",
  },
  {
    label: "set",
    type: "keyword",
    detail: "variable = value",
    info: "Assigns a value to a variable in the current scope.",
  },
  {
    label: "endset",
    type: "keyword",
    info: "Ends a block {% set %} that captures rendered content.",
  },
  {
    label: "macro",
    type: "keyword",
    detail: "name(args)",
    info: "Defines a reusable template function (macro).",
  },
  {
    label: "endmacro",
    type: "keyword",
    info: "Ends a {% macro %} definition.",
  },
  {
    label: "import",
    type: "keyword",
    detail: "template as name",
    info: "Imports macros from another template.",
  },
  {
    label: "include",
    type: "keyword",
    detail: "template",
    info: "Inserts another template inline at this point.",
  },
  {
    label: "break",
    type: "keyword",
    info: "Exits the current {% for %} loop early.",
  },
  {
    label: "continue",
    type: "keyword",
    info: "Skips the rest of the current loop iteration and continues with the next.",
  },
  {
    label: "debug",
    type: "keyword",
    info: "Dumps debug information about the current context.",
  },
  {
    label: "do",
    type: "keyword",
    detail: "expression",
    info: "Evaluates an expression without printing its result.",
  },
  {
    label: "extends",
    type: "keyword",
    detail: "template",
    info: "Makes the current template extend a parent template.",
  },
];

const JINJA_FILTERS: Completion[] = [
  {
    label: "abs",
    type: "function",
    info: "Returns the absolute value of a number.",
  },
  {
    label: "attr",
    type: "function",
    detail: "name",
    info: "Returns an attribute of an object. Similar to getattr.",
  },
  {
    label: "batch",
    type: "function",
    detail: "linecount, fill_with?",
    info: "Collects items into batches of a given size, optionally filled with a placeholder.",
  },
  {
    label: "capitalize",
    type: "function",
    info: "Capitalizes the first character of a string and lowercases the rest.",
  },
  {
    label: "center",
    type: "function",
    detail: "width=80",
    info: "Centers a string in a field of a given width.",
  },
  {
    label: "count",
    type: "function",
    info: "Returns the number of items in a sequence or mapping. Alias for length.",
  },
  {
    label: "default",
    type: "function",
    detail: "value, boolean=false",
    info: "Returns the value if it is defined and not empty, otherwise returns the provided default.",
  },
  {
    label: "d",
    type: "function",
    detail: "value, boolean=false",
    info: "Shorthand alias for the default filter.",
  },
  {
    label: "dictsort",
    type: "function",
    detail: "case_sensitive=false, by='key', reverse=false",
    info: "Sorts a dictionary by key or value and returns a list of (key, value) pairs.",
  },
  {
    label: "e",
    type: "function",
    info: "Escapes HTML special characters. Shorthand alias for escape.",
  },
  {
    label: "escape",
    type: "function",
    info: "Escapes HTML special characters (<, >, &, ', \") in a string.",
  },
  {
    label: "filesizeformat",
    type: "function",
    detail: "binary=false",
    info: "Formats a byte count into a human-readable file size like '1.2 MB'.",
  },
  {
    label: "first",
    type: "function",
    info: "Returns the first item of a sequence.",
  },
  {
    label: "float",
    type: "function",
    detail: "default=0.0",
    info: "Converts a value to a floating-point number.",
  },
  {
    label: "forceescape",
    type: "function",
    info: "Enforces HTML escaping even on values already marked safe.",
  },
  {
    label: "format",
    type: "function",
    detail: "*args, **kwargs",
    info: "Applies Python's % string formatting using the given arguments.",
  },
  {
    label: "groupby",
    type: "function",
    detail: "attribute, default?, case_sensitive=false",
    info: "Groups a sequence of objects by a common attribute.",
  },
  {
    label: "indent",
    type: "function",
    detail: "width=4, first=false, blank=false",
    info: "Indents all lines of a string by the given number of spaces.",
  },
  {
    label: "int",
    type: "function",
    detail: "default=0, base=10",
    info: "Converts a value to an integer.",
  },
  {
    label: "items",
    type: "function",
    info: "Returns an iterable of (key, value) pairs for a dictionary.",
  },
  {
    label: "join",
    type: "function",
    detail: "d='', attribute?",
    info: "Joins elements of a sequence into a string with an optional separator.",
  },
  {
    label: "last",
    type: "function",
    info: "Returns the last item of a sequence.",
  },
  {
    label: "length",
    type: "function",
    info: "Returns the number of items in a sequence or mapping.",
  },
  {
    label: "list",
    type: "function",
    info: "Converts a value to a list. Useful to iterate over strings character by character.",
  },
  {
    label: "lower",
    type: "function",
    info: "Converts a string to lowercase.",
  },
  {
    label: "map",
    type: "function",
    detail: "attribute?, default?",
    info: "Applies a filter or looks up an attribute on each item of a sequence.",
  },
  {
    label: "max",
    type: "function",
    detail: "attribute?",
    info: "Returns the largest item in a sequence.",
  },
  {
    label: "min",
    type: "function",
    detail: "attribute?",
    info: "Returns the smallest item in a sequence.",
  },
  {
    label: "pprint",
    type: "function",
    info: "Pretty-prints a variable for debugging purposes.",
  },
  {
    label: "random",
    type: "function",
    info: "Returns a random item from a sequence.",
  },
  {
    label: "reject",
    type: "function",
    detail: "test, *args",
    info: "Filters a sequence by rejecting items for which a test returns true.",
  },
  {
    label: "rejectattr",
    type: "function",
    detail: "attribute, test?, *args",
    info: "Filters a sequence of objects by rejecting those where an attribute test passes.",
  },
  {
    label: "replace",
    type: "function",
    detail: "old, new, count?",
    info: "Replaces occurrences of a substring. Optionally limits the number of replacements.",
  },
  {
    label: "reverse",
    type: "function",
    info: "Reverses a sequence or string.",
  },
  {
    label: "round",
    type: "function",
    detail: "precision=0, method='common'",
    info: "Rounds a number to a given precision. Method can be 'common', 'ceil', or 'floor'.",
  },
  {
    label: "safe",
    type: "function",
    info: "Marks a string as safe HTML so it is not escaped on output.",
  },
  {
    label: "select",
    type: "function",
    detail: "test, *args",
    info: "Filters a sequence to include only items for which a test returns true.",
  },
  {
    label: "selectattr",
    type: "function",
    detail: "attribute, test?, *args",
    info: "Filters a sequence of objects to include only those where an attribute test passes.",
  },
  {
    label: "slice",
    type: "function",
    detail: "slices, fill_with?",
    info: "Slices a sequence into a given number of parts.",
  },
  {
    label: "sort",
    type: "function",
    detail: "reverse=false, case_sensitive=false, attribute?",
    info: "Sorts a sequence. Optionally in reverse, case-sensitive, or by an attribute.",
  },
  {
    label: "string",
    type: "function",
    info: "Converts an object to a string.",
  },
  {
    label: "striptags",
    type: "function",
    info: "Strips HTML/XML tags from a string and normalizes whitespace.",
  },
  {
    label: "sum",
    type: "function",
    detail: "attribute?, start=0",
    info: "Returns the sum of a sequence of numbers, optionally summing an attribute.",
  },
  {
    label: "title",
    type: "function",
    info: "Converts a string to title case.",
  },
  {
    label: "tojson",
    type: "function",
    detail: "indent?",
    info: "Serializes an object to a JSON string. Safe to use inside HTML.",
  },
  {
    label: "trim",
    type: "function",
    detail: "chars?",
    info: "Strips leading and trailing whitespace (or specified characters) from a string.",
  },
  {
    label: "truncate",
    type: "function",
    detail: "length=255, killwords=false, end='...', leeway?",
    info: "Truncates a string to the given length, appending an ellipsis.",
  },
  {
    label: "unique",
    type: "function",
    detail: "case_sensitive=false, attribute?",
    info: "Returns a sequence with duplicate items removed.",
  },
  {
    label: "upper",
    type: "function",
    info: "Converts a string to uppercase.",
  },
  {
    label: "urlencode",
    type: "function",
    info: "URL-encodes a string or a mapping.",
  },
  {
    label: "urlize",
    type: "function",
    detail: "trim_url_limit?, nofollow?, target?, rel?, extra_schemes?",
    info: "Converts URLs in plain text into clickable HTML links.",
  },
  {
    label: "wordcount",
    type: "function",
    info: "Counts the number of words in a string.",
  },
  {
    label: "wordwrap",
    type: "function",
    detail: "width=79, break_long_words=true, wrapstring?",
    info: "Wraps words in a string at the given column width.",
  },
  {
    label: "xmlattr",
    type: "function",
    detail: "autospace=true",
    info: "Builds an HTML attribute string from a dictionary of values.",
  },
];

const JINJA_EXPRESSIONS: Completion[] = [
  // Tests (used with `is`)
  {
    label: "boolean",
    type: "function",
    info: "Test: returns true if the value is a boolean.",
  },
  {
    label: "callable",
    type: "function",
    info: "Test: returns true if the value is callable (a function or macro).",
  },
  {
    label: "defined",
    type: "function",
    info: "Test: returns true if the variable is defined.",
  },
  {
    label: "divisibleby",
    type: "function",
    detail: "number",
    info: "Test: returns true if the value is divisible by the given number.",
  },
  {
    label: "eq",
    type: "function",
    detail: "other",
    info: "Test: returns true if the value equals other. Equivalent to ==.",
  },
  {
    label: "escaped",
    type: "function",
    info: "Test: returns true if the value has been marked as safe (escaped).",
  },
  {
    label: "even",
    type: "function",
    info: "Test: returns true if the value is an even number.",
  },
  {
    label: "filter",
    type: "function",
    detail: "name",
    info: "Test: returns true if a filter with the given name exists.",
  },
  {
    label: "float",
    type: "function",
    info: "Test: returns true if the value is a float.",
  },
  {
    label: "ge",
    type: "function",
    detail: "other",
    info: "Test: returns true if the value is greater than or equal to other.",
  },
  {
    label: "gt",
    type: "function",
    detail: "other",
    info: "Test: returns true if the value is greater than other.",
  },
  {
    label: "in",
    type: "function",
    detail: "sequence",
    info: "Test: returns true if the value is contained in the given sequence.",
  },
  {
    label: "integer",
    type: "function",
    info: "Test: returns true if the value is an integer.",
  },
  {
    label: "iterable",
    type: "function",
    info: "Test: returns true if the value can be iterated over.",
  },
  {
    label: "le",
    type: "function",
    detail: "other",
    info: "Test: returns true if the value is less than or equal to other.",
  },
  {
    label: "lower",
    type: "function",
    info: "Test: returns true if the value is a lowercase string.",
  },
  {
    label: "lt",
    type: "function",
    detail: "other",
    info: "Test: returns true if the value is less than other.",
  },
  {
    label: "mapping",
    type: "function",
    info: "Test: returns true if the value is a mapping (dictionary).",
  },
  {
    label: "ne",
    type: "function",
    detail: "other",
    info: "Test: returns true if the value is not equal to other.",
  },
  {
    label: "none",
    type: "function",
    info: "Test: returns true if the value is None.",
  },
  {
    label: "number",
    type: "function",
    info: "Test: returns true if the value is a number.",
  },
  {
    label: "odd",
    type: "function",
    info: "Test: returns true if the value is an odd number.",
  },
  {
    label: "sameas",
    type: "function",
    detail: "other",
    info: "Test: returns true if the value is the same object as other (identity check).",
  },
  {
    label: "sequence",
    type: "function",
    info: "Test: returns true if the value is a sequence (list, string, etc.).",
  },
  {
    label: "string",
    type: "function",
    info: "Test: returns true if the value is a string.",
  },
  {
    label: "test",
    type: "function",
    detail: "name",
    info: "Test: returns true if a test with the given name exists.",
  },
  {
    label: "undefined",
    type: "function",
    info: "Test: returns true if the variable is undefined.",
  },
  {
    label: "upper",
    type: "function",
    info: "Test: returns true if the value is an uppercase string.",
  },
  // Globals
  {
    label: "range",
    type: "function",
    detail: "start, stop?, step?",
    info: "Returns a list of numbers from start to stop (exclusive), similar to Python's range().",
  },
  {
    label: "lipsum",
    type: "function",
    detail: "n=5, html=true, min=20, max=100",
    info: "Generates n paragraphs of lorem ipsum placeholder text.",
  },
  {
    label: "dict",
    type: "function",
    detail: "**kwargs",
    info: "Creates a dictionary from keyword arguments. Useful when key names are not valid identifiers.",
  },
  {
    label: "joiner",
    type: "function",
    detail: "sep=', '",
    info: "Returns an empty string the first time it is called, then the separator on subsequent calls. Useful for joining in loops.",
  },
  {
    label: "namespace",
    type: "function",
    detail: "**kwargs",
    info: "Creates an object that allows variable assignment across scopes inside a loop.",
  },
  // Loop variable and block helpers
  {
    label: "loop",
    type: "variable",
    info: "Special variable inside a {% for %} block. Provides loop.index, loop.index0, loop.first, loop.last, loop.length, loop.depth, etc.",
  },
  {
    label: "super",
    type: "function",
    info: "Renders the contents of the parent block inside a {% block %} override.",
  },
  {
    label: "self",
    type: "variable",
    info: "Reference to the current template, allowing access to its block contents.",
  },
  {
    label: "true",
    type: "keyword",
    info: "Boolean true literal.",
  },
  {
    label: "false",
    type: "keyword",
    info: "Boolean false literal.",
  },
  {
    label: "varargs",
    type: "variable",
    info: "Inside a macro, holds extra positional arguments not explicitly declared.",
  },
  {
    label: "kwargs",
    type: "variable",
    info: "Inside a macro, holds extra keyword arguments not explicitly declared.",
  },
  {
    label: "caller",
    type: "function",
    info: "Inside a macro called via {% call %}, renders the body of the call block.",
  },
  {
    label: "name",
    type: "variable",
    info: "Inside a macro, holds the name of the macro itself.",
  },
  {
    label: "arguments",
    type: "variable",
    info: "Inside a macro, holds the declared argument names.",
  },
  {
    label: "catch_kwargs",
    type: "variable",
    info: "Inside a macro, indicates whether the macro accepts extra keyword arguments via kwargs.",
  },
  {
    label: "catch_varargs",
    type: "variable",
    info: "Inside a macro, indicates whether the macro accepts extra positional arguments via varargs.",
  },
];

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
const HA_PLAIN_VARIABLES: Completion[] = [
  {
    label: "areas",
    type: "variable",
    info: "A list of all area IDs in Home Assistant.",
  },
  {
    label: "floors",
    type: "variable",
    info: "A list of all floor IDs in Home Assistant.",
  },
  {
    label: "labels",
    type: "variable",
    info: "A list of all label IDs in Home Assistant.",
  },
  {
    label: "now",
    type: "variable",
    info: "The current local datetime object.",
  },
  {
    label: "utcnow",
    type: "variable",
    info: "The current UTC datetime object.",
  },
  {
    label: "e",
    type: "variable",
    info: "Euler's number (approximately 2.71828).",
  },
  {
    label: "pi",
    type: "variable",
    info: "The mathematical constant π (approximately 3.14159).",
  },
  {
    label: "tau",
    type: "variable",
    info: "The mathematical constant τ = 2π (approximately 6.28318).",
  },
  {
    label: "version",
    type: "variable",
    info: "The current Home Assistant version as a string.",
  },
  {
    label: "relative_time",
    type: "variable",
    info: "When used as a filter, converts a datetime to a human-readable relative string like '2 minutes ago'.",
  },
  {
    label: "issue",
    type: "variable",
    info: "The current repair issue object, available inside repair issue templates.",
  },
  {
    label: "issues",
    type: "variable",
    info: "A list of all active repair issues.",
  },
];

// HA-specific tests (used after `is` keyword)
const HA_TESTS: Completion[] = [
  {
    label: "contains",
    type: "function",
    detail: "value",
    info: "Test: returns true if the sequence contains the given value.",
  },
  {
    label: "false",
    type: "function",
    info: "Test: returns true if the value is boolean false.",
  },
  {
    label: "has_value",
    type: "function",
    info: "Test: returns true if the entity exists and does not have an unknown or unavailable state.",
  },
  {
    label: "is_device_attr",
    type: "function",
    detail: "device_id, attribute, value",
    info: "Test: returns true if the device attribute matches the given value.",
  },
  {
    label: "is_hidden_entity",
    type: "function",
    info: "Test: returns true if the entity is hidden.",
  },
  {
    label: "is_number",
    type: "function",
    info: "Test: returns true if the value can be interpreted as a number.",
  },
  {
    label: "is_state",
    type: "function",
    detail: "entity_id, state",
    info: "Test: returns true if the entity's state matches the given value.",
  },
  {
    label: "is_state_attr",
    type: "function",
    detail: "entity_id, attribute, value",
    info: "Test: returns true if the entity attribute matches the given value.",
  },
  {
    label: "match",
    type: "function",
    detail: "pattern",
    info: "Test: returns true if the value matches the given regular expression pattern.",
  },
  {
    label: "search",
    type: "function",
    detail: "pattern",
    info: "Test: returns true if the pattern is found anywhere in the value.",
  },
  {
    label: "true",
    type: "function",
    info: "Test: returns true if the value is boolean true.",
  },
];

// HA-specific filters (used after `|` pipe).
// Derived automatically from HA_FUNCTION_DEFS (every function that takes at
// least one argument can be used as a filter) plus a small set of HA-specific
// filters that exist only as filters (no function form in HA_FUNCTION_DEFS).
const HA_FILTER_ONLY: Completion[] = [
  // These exist as HA filters but have no entry in HA_FUNCTION_DEFS.
  {
    label: "is_defined",
    type: "function",
    info: "Returns true if the value is defined (not undefined or None).",
  },
  {
    label: "multiply",
    type: "function",
    detail: "factor",
    info: "Multiplies the value by the given factor.",
  },
  {
    label: "ordinal",
    type: "function",
    info: "Converts an integer to its ordinal string representation (e.g. 1 → '1st', 2 → '2nd').",
  },
  {
    label: "relative_time",
    type: "function",
    info: "Converts a datetime to a human-readable relative time string like '2 minutes ago'.",
  },
  {
    label: "slugify",
    type: "function",
    detail: "separator='-'",
    info: "Converts a string to a URL-friendly slug.",
  },
  {
    label: "version",
    type: "function",
    info: "Converts a version string to a comparable version object.",
  },
];

// Zero-argument functions from HA_FUNCTION_DEFS that don't make sense as
// filters (nothing to pipe into them).
const _FILTER_EXCLUDES = new Set(["now", "utcnow"]);

const HA_FILTERS: Completion[] = [
  ...HA_FILTER_ONLY,
  ...HA_FUNCTION_DEFS.filter((d) => {
    const fnName = d.snippet.split("(")[0];
    return !_FILTER_EXCLUDES.has(fnName);
  }).map((d) => ({
    label: d.snippet.split("(")[0],
    type: "function" as const,
    detail: d.detail || undefined,
    info: d.info,
  })),
];

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
