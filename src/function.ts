export interface OpenAiFunction extends OpenAiFunctionSummary {
  // TODO
}

export interface OpenAiFunctionSummary {
  method: string;
  path: string;
  description?: string;
  prerequisites?: Prerequisite[];
}

export interface Prerequisite {
  method: string;
  path: string;
  jmesPath: string;
}
