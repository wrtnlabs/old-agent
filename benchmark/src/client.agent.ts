import { Dialog } from "@wrtnio/agent-os";
import { BenchmarkEnvironment } from "./environment";
import OpenAI from "openai";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import typia from "typia";
import { FunctionParameters } from "openai/resources/shared";

interface FinishEvaluateMessageType {
  /**
   * @title type
   * @description tool names
   */
  type: "finish_evaluation";
  /**
   * @title reasoning
   * @description the reason why you evaluate the agent's performance
   */
  reasoning: string;
  /**
   * @title evaluations
   * @description the evaluations of the agent's performance
   */
  evaluations: {
    /**
     * @title criteria
     * @description the criteria to be evaluated
     */
    criteria: string;
    /**
     * @title evaluation
     * @description the evaluation of the criteria
     * @enum yes, no
     */
    evaluation: "yes" | "no";
  }[];
  /**
   * @title final_decision
   * @description the final decision of the evaluation
   */
  final_decision: string;
  /**
   * @title score
   * @description the score of the evaluation
   */
  score: number;
}
export type FinishEvaluationResult = Exclude<FinishEvaluateMessageType, "type">;

const tools: ChatCompletionTool[] = typia.llm
  .applicationOfValidate<
    {
      call(input: FinishEvaluateMessageType): void;
    },
    "chatgpt"
  >()
  .functions.map(
    (func): ChatCompletionTool => ({
      type: "function",
      function: {
        name: func.name,
        description: func.description,
        parameters: func.parameters as unknown as FunctionParameters,
      },
    })
  );

export interface IScenario {
  name: string;
  connector_base_url?: string;
  platform: {
    prompt: string;
  };
  customer: {
    user_context: {
      email: string;
      username: string;
      job: string;
      gender: string;
      timezone: string;
      birth_year: number;
    };
    persona: {
      backgrounds: string[];
      issues: string[];
      knowledge: string[];
      expectation: string[];
    };
  };
  criteria: string[];
}

export const getClientAgent = (apiKey: string, scenario: IScenario) => {
  const llm = new OpenAI({ apiKey });
  const baseHistories = [
    {
      role: "system",
      content: getGeneralPrompt(scenario),
    },
    {
      role: "system",
      content: getToolsPrompt(),
    },
  ] satisfies ChatCompletionMessageParam[];

  const askToLlm = (dialogs: Dialog[]) =>
    llm.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        ...baseHistories,
        ...dialogs.map((v) => ({
          role: v.speaker.type,
          content: JSON.stringify(v.message),
        })),
      ],
      tools,
    });

  return async function* (
    _sessionId: string,
    dialogs: Dialog[]
  ): AsyncGenerator<
    BenchmarkEnvironment.ClientMessageType,
    BenchmarkEnvironment.ClientMessageType,
    void
  > {
    while (true) {
      const response = await askToLlm(dialogs);
      const chosen = response.choices[0].message;

      const maybeTranlated = ((): FinishEvaluationResult | undefined => {
        try {
          const validTool = typia.json.isParse<FinishEvaluateMessageType>(
            chosen.tool_calls?.at(0)?.function.arguments ?? "{}"
          );
          if (!!validTool) {
            return validTool;
          }

          const response =
            chosen.content === null
              ? null
              : typia.json.isParse<FinishEvaluationResult>(chosen.content);
          if (!!response) {
            return response;
          }
        } catch {}
        return undefined;
      })();

      if (maybeTranlated) {
        return { type: "finish", message: maybeTranlated };
      }

      yield { type: "ask", message: chosen.content! };
    }
  };
};

const getGeneralPrompt = (scenario: IScenario) => {
  return [
    "You are an expert evaluator. You are tasked with evaluating a virtual customer service agent, by communicating with the agent to solve the issue of your persona.",
    "",
    "You are given a list of criteria as below:",
    "",
    "<criteria>",
    JSON.stringify(scenario.criteria, null, 2),
    "</criteria>",
    "",
    "Now, act as an customer, to interact with the customer service agent. Here are your persona:",
    "",
    "<persona>",
    JSON.stringify(scenario.customer.persona, null, 2),
    "</persona>",
    "",
    "Your goal is to try to solve the issue of your persona, and then evaluate the agent's performance.",
    "",
    "After some conversations with the agent, finish the evaluation with the criteria and corresponding evaluations, by calling the tool \`finish_evaluation\`. Interact with the agent enough to solve the issue of your persona, but if you think the agent is not able to solve the issue, you should stop the conversation and call the tool \`finish_evaluation\`.",
    "",
    "When evaluating, you should refer the above criteria and provide your evaluation (yes or no) for each criteria.",
    "",
    "For score, you should provide a score between 0 and 100. If all criteria are met, you should provide a score of 100. If none of the criteria are met, you should provide a score of 0. If some of the criteria are met, you should provide a score between 0 and 100 based on the degree of the criteria being met.",
    "",
    "When generating your response, do not include too much information, as typically human conversation is not like this.",
    "",
    "Start conversation with the virtual customer service agent, by describing your persona's issue. After then, continue the conversation to solve the issue of your persona.",
  ].join("\n");
};

const getToolsPrompt = () => `
<tool>
Name: finish_evaluation
Example Arguments:
{
  "reasoning": "[Your reasoning process of your pre-evaluation. Explain your evaluations plan and provide reasoning process of your pre-evaluation.]",
  "evaluations": [
    {
      "criteria": "[The criteria to be evaluated.]",
      "evaluation": "[The evaluation of the criteria.]"
    },
    {
      "criteria": "[The criteria to be evaluated.]",
      "evaluation": "[The evaluation of the criteria.]"
    },
    ...
  ],
  "final_decision": "[The final decision of the evaluation.]",
  "score": "[The score of the evaluation, between 0 and 100.]"
}
</tool>
`;
