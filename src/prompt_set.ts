import { JsonValue } from "./core/types";

export interface PromptSet {
  getPrompt(name: string, context?: Record<string, JsonValue>): Promise<string>;
}
