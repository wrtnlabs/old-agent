import {
  IHttpOpenAiFunction,
  ISwaggerSchemaCommonPlugin,
} from "@wrtnio/schema";

export interface OpenAiFunction extends IHttpOpenAiFunction {}

export interface OpenAiFunctionSummary
  extends Pick<OpenAiFunction, "method" | "path" | "description"> {
  prerequisites?: ISwaggerSchemaCommonPlugin.IPrerequisite[];
}
