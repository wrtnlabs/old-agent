import OpenAI from "openai";

export type IAgentProvider = IAgentProvider.IChatGpt;
export namespace IAgentProvider {
  export interface IChatGpt {
    /**
     * Discriminator type.
     */
    type: "chatgpt";

    /**
     * OpenAI API instance.
     */
    api: OpenAI;

    /**
     * Chat model to be used.
     */
    model: OpenAI.ChatModel;

    /**
     * Options for the request.
     */
    options?: OpenAI.RequestOptions | undefined;
  }
}
