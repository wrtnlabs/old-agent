import { stringify } from "typia/lib/json";
import { OpenAiFunction } from "./connector";

// @TODO we will define mediate interface and implement, but we don't have to touch it until the performance degradation is confirmed
export const stringifyConnector = (func: OpenAiFunction) => {
  return stringify(func);
};
