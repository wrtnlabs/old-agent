import { IChatGptSchema, IClaudeSchema } from "@samchon/openapi";

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
}

export interface ToolParameter {
  name: string;
  isRequired: boolean;
  schema: ToolParameterSchema;
}

export type ToolParameterSchema = IChatGptSchema | IClaudeSchema;

export type ToolChoice = ToolChoiceAny | ToolChoiceOne;

export type ToolChoiceBase<T extends string> = {
  type: T;
};

export interface ToolChoiceAny extends ToolChoiceBase<"any"> {}

export interface ToolChoiceOne extends ToolChoiceBase<"one"> {
  name: string;
}
