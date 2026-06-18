import type { RuntimeRequest, RuntimeResponse } from "./types";

export const sendMessage = async <T>(request: RuntimeRequest): Promise<T> => {
  const response = (await chrome.runtime.sendMessage(request)) as RuntimeResponse<T> | undefined;
  if (!response) throw new Error("No response from Amazing Translate background service.");
  if (!response.ok) throw new Error(response.error);
  return response.data;
};
