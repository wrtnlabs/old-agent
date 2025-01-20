import { BackendKind } from "./backend";

export interface LlmConnection {
  kind: BackendKind;
  apiKey: string;
}
