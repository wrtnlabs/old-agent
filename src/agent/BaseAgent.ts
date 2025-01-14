import OpenAI from "openai";

export namespace BaseAgent {
  let agent: OpenAI;

  export const getAgent = (apiKey: string) => {
    if (!agent) {
      agent = new OpenAI({ apiKey });
    }
    return agent;
  };
}
