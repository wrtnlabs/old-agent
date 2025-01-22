import {
  IHttpOpenAiFunction,
  ISwaggerSchemaCommonPlugin,
} from "@wrtnio/schema";

export interface OpenAiFunction extends IHttpOpenAiFunction {}

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
