import { mainWindow } from "../dom/get_main_window";

export const extractSearchParamsObject = (): Record<string, string> => {
  const query = {};
  const searchParams = new URLSearchParams(mainWindow.location.search);
  for (const [key, value] of searchParams.entries()) {
    query[key] = value;
  }
  return query;
};

export const extractSearchParam = (param: string): string | null => {
  const urlParams = new URLSearchParams(mainWindow.location.search);
  return urlParams.get(param);
};

export const createSearchParam = (params: Record<string, string>): string => {
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    urlParams.append(key, value);
  });
  return urlParams.toString();
};

export const addSearchParam = (params: Record<string, string>): string => {
  const urlParams = new URLSearchParams(mainWindow.location.search);
  Object.entries(params).forEach(([key, value]) => {
    urlParams.set(key, value);
  });
  return urlParams.toString();
};

export const removeSearchParam = (param: string): string => {
  const urlParams = new URLSearchParams(mainWindow.location.search);
  urlParams.delete(param);
  return urlParams.toString();
};
