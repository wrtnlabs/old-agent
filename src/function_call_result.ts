import { JsonValue } from "./core/types";
import { OpenAiFunction, stringifyConnectorKey } from "./function";

export interface FunctionCallResult {
  id: string;
  items: FunctionCallResultItem[];
}

export interface FunctionCallResultItem {
  purpose: string;
  function: OpenAiFunction;
  arguments: JsonValue[];
  result: PromiseSettledResult<JsonValue>;
}

export function buildDetailedFunctionCallResult({
  id,
  items,
}: FunctionCallResult) {
  return {
    id,
    items: items.map((item) => ({
      purpose: item.purpose,
      function_id: stringifyConnectorKey(item.function),
      arguments: item.arguments,
      is_success: item.result.status === "fulfilled",
      ...(item.result.status === "fulfilled"
        ? {
            result: JSON.stringify(item.result.value), // TODO: retain last 64KiB of the result
          }
        : {
            error: item.result.reason,
          }),
    })),
  };
}
