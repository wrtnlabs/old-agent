export interface IAgentTokenUsage {
  total: number;
  prompt: IAgentTokenUsage.IPrompt;
  completion: IAgentTokenUsage.ICompletion;
}

export namespace IAgentTokenUsage {
  export interface IPrompt {
    total: number;
    audio: number;
    cached: number;
  }
  export interface ICompletion {
    total: number;
    accepted_prediction: number;
    audio: number;
    reasoning: number;
    rejected_prediction: number;
  }
}
