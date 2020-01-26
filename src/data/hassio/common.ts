export interface HassioResponse<T> {
  data: T;
  result: "ok";
}

export const hassioApiResultExtractor = <T>(response: HassioResponse<T>) =>
  response.data;
