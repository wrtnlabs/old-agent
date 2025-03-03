import {
  IHttpOpenAiFunction,
  ISwaggerSchemaCommonPlugin,
} from "@wrtnio/schema";

export type OpenAiFunction = Omit<IHttpOpenAiFunction, "operation" | "route">;

export interface OpenAiFunctionSummary
  extends Pick<OpenAiFunction, "method" | "path" | "description"> {
  prerequisites?: ISwaggerSchemaCommonPlugin.IPrerequisite[];
}

export function stringifyConnectorKey(connector: OpenAiFunction): string {
  return `${connector.method}:${connector.path}`;
}

export function stringifyConnector(
  _connector: OpenAiFunction,
  _includeReturnType: boolean
): string {
  throw new Error("TODO");
}
