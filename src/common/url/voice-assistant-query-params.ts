import {
  createQueryString,
  decodeQueryParams,
  type QueryParamConfig,
  type QueryParamValues,
} from "./query-params";

export const voiceAssistantQueryParamConfig = {
  list: ["assistants"],
} as const satisfies QueryParamConfig;

export type VoiceAssistantQueryParams = QueryParamValues<
  typeof voiceAssistantQueryParamConfig
>;

export const decodeVoiceAssistantQueryParams = (
  searchParams: Record<string, string>
): VoiceAssistantQueryParams => {
  const params = decodeQueryParams(
    searchParams,
    voiceAssistantQueryParamConfig
  );
  // An explicit empty list must not fall back to all available assistants.
  if (searchParams.assistants === "") {
    params.assistants = [];
  }
  return params;
};

export const createVoiceAssistantQueryString = (
  values: VoiceAssistantQueryParams
): string =>
  values.assistants?.length === 0
    ? "assistants="
    : createQueryString(values, voiceAssistantQueryParamConfig);
