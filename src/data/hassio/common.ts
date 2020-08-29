export interface HassioResponse<T> {
  data: T;
  result: "ok";
}

export const hassioApiResultExtractor = <T>(response: HassioResponse<T>) =>
  response.data;

export const extractApiErrorMessage = (error: any): string => {
  return typeof error === "object"
    ? typeof error.body === "object"
      ? error.body.message
      : error.body || "Unkown error"
    : error;
};
