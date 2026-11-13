import type { LocalizeFunc } from "./localize";

const YAML_ERROR_REASON_KEYS = new Map(
  Object.entries({
    "duplicated mapping key": "duplicated_mapping_key",
    "bad indentation of a mapping entry": "bad_mapping_indentation",
    "bad indentation of a sequence entry": "bad_sequence_indentation",
    "deficient indentation": "deficient_indentation",
    "tab characters must not be used in indentation": "tab_indentation",
    "can not read a block mapping entry; a multiline key may not be an implicit key":
      "multiline_implicit_key",
    "a whitespace character is expected after the key-value separator within a block mapping":
      "missing_key_value_space",
    "expected ':' after a mapping key": "missing_colon",
    "missed comma between flow collection entries": "missing_comma",
    "unexpected end of the stream within a flow collection":
      "unterminated_flow_collection",
    "unexpected end of the stream within a single quoted scalar":
      "unterminated_single_quote",
    "unexpected end of the stream within a double quoted scalar":
      "unterminated_double_quote",
    "end of the stream or a document separator is expected":
      "unexpected_content",
  } as const)
);

export const localizeYamlErrorReason = (
  localize: LocalizeFunc,
  reason: string | undefined
): string | undefined => {
  const key = reason ? YAML_ERROR_REASON_KEYS.get(reason) : undefined;
  return key ? localize(`ui.components.yaml-editor.reasons.${key}`) : reason;
};
