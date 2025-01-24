import Ajv from "ajv";
import { Dialog } from "../chat_history";
import { Stage, StageContext, StageError } from "../core/stage";
import { OpenAiFunction } from "../core/connector";
import { Message } from "../lm_bridge/inputs/message";
import { LmBridge } from "../lm_bridge/lm_bridge";
import { buildUserPrompt } from "./connector_param_generator/user_prompt";
import { buildLangCodePrompt } from "./lang_code_prompt";
import { buildUserContextPrompt } from "./user_context_prompt";
import { JsonValue } from "../core/types";
import { AgentLogger } from "../logger";

const TEMPERATURE = 0.2;
const FREQUENCY_PENALTY = 0.1;
const MAX_RETRIES = 5;

export namespace ConnectorParamGenerator {
  export interface Input {
    connector: OpenAiFunction;
    purpose: string;
    histories: Dialog[];
  }

  export interface Output {
    thought: string;
    arguments: JsonValue[];
  }
}

function buildMessages(
  langCodePrompt: string,
  userPrompt: string,
  userContextPrompt: string,
  validationPrompt?: ValidationFailure
): Message[] {
  const messages: Message[] = [
    {
      role: "user",
      content: { type: "text", text: userPrompt },
    },
    {
      role: "system",
      content: { type: "text", text: userContextPrompt },
    },
    {
      role: "system",
      content: { type: "text", text: langCodePrompt },
    },
  ];
  if (validationPrompt != null) {
    messages.push(
      {
        role: "assistant",
        content: { type: "text", text: validationPrompt.assistantResponse },
      },
      {
        role: "user",
        content: { type: "text", text: validationPrompt.validationPrompt },
      },
      {
        role: "system",
        content: {
          type: "text",
          text: "your last response was not valid; read the instructions carefully and try again",
        },
      }
    );
  }
  return messages;
}

interface ValidationFailure {
  assistantResponse: string;
  validationPrompt: string;
}

export class ConnectorParamGenerator
  implements
    Stage<ConnectorParamGenerator.Input, ConnectorParamGenerator.Output>
{
  identifier: string = "connector_param_generator";

  private lmBridge: LmBridge;
  private ajv: Ajv;

  constructor(public readonly logger: AgentLogger) {
    this.lmBridge = new LmBridge(TEMPERATURE, true, [], logger);
    this.ajv = new Ajv();
  }

  async execute(
    input: ConnectorParamGenerator.Input,
    context: StageContext
  ): Promise<ConnectorParamGenerator.Output> {
    const langCodePrompt = buildLangCodePrompt(context.langCode);
    const userPrompt = buildUserPrompt(
      input.connector,
      input.purpose,
      input.histories
    );
    const userContextPrompt = buildUserContextPrompt(context.userContext);
    let validationPrompt: ValidationFailure | undefined;

    outer: for (let retryIndex = 0; retryIndex < MAX_RETRIES; retryIndex++) {
      this.logger.log(
        "connector param generator retry_index=%i, validation_prompt=%o",
        retryIndex,
        validationPrompt
      );

      const messages = buildMessages(
        langCodePrompt,
        userPrompt,
        userContextPrompt,
        validationPrompt
      );
      const response = await this.lmBridge.request({
        connection: context.llmConnection,
        sessionId: context.sessionId,
        stageName: this.identifier,
        messages,
        frequencyPenalty: FREQUENCY_PENALTY,
        signal: context.signal,
      });

      // TODO: implement this
      // context.accumulateUsage

      const message = response.messages.at(0);
      if (message == null) {
        this.logger.warn(
          "connector param generator response is empty; retrying"
        );

        validationPrompt = {
          assistantResponse: "<empty response>",
          validationPrompt: "You did not provide a valid response",
        };
        continue outer;
      }
      if (message.type !== "text") {
        this.logger.warn(
          "connector param generator response is not text; retrying"
        );

        validationPrompt = {
          assistantResponse: "<non-text response>",
          validationPrompt: "expected text message; got something else",
        };
        continue outer;
      }
      let output: unknown;
      try {
        output = JSON.parse(message.text);
        if (typeof output !== "object" || output == null) {
          throw new TypeError("expected an object");
        }
        if (!("thought" in output)) {
          throw new TypeError("expected 'thought' key in object");
        }
        if (!("arguments" in output)) {
          throw new TypeError("expected 'arguments' key in object");
        }
        if (typeof output.thought !== "string") {
          throw new TypeError("expected 'thought' to be a string");
        }
        if (!Array.isArray(output.arguments)) {
          throw new TypeError("expected 'arguments' to be an array");
        }
      } catch (err) {
        this.logger.warn(
          "connector param generator response is not valid JSON; retrying"
        );

        validationPrompt = {
          assistantResponse: message.text,
          validationPrompt: `expected valid valid JSON: ${err}`,
        };
        continue outer;
      }

      if (output.arguments.length !== input.connector.parameters.length) {
        this.logger.warn(
          "connector param generator response `arguments` length mismatch; retrying; arguments=%i parameters=%i",
          output.arguments.length,
          input.connector.parameters.length
        );

        validationPrompt = {
          assistantResponse: message.text,
          validationPrompt: `your response contains ${output.arguments.length} arguments, but the connector expects ${input.connector.parameters.length}`,
        };
        continue outer;
      }

      for (const [index, argument] of output.arguments.entries()) {
        const schema = input.connector.parameters[index]!;
        const validator = this.ajv.compile(schema);
        if (validator(argument)) {
          continue;
        }

        const errors = (validator.errors ?? [])
          .map((err) => `- ${err.instancePath}: ${err.message}`)
          .join("\n");

        this.logger.warn(
          "connector param generator response `arguments` validation failed; retrying; errors=%s",
          errors
        );

        validationPrompt = {
          assistantResponse: message.text,
          validationPrompt: `your response is invalid:\n\n${errors}`,
        };
        continue outer;
      }

      return {
        thought: output.thought,
        arguments: output.arguments,
      };
    }

    throw new StageError(
      `LLM returned invalid response: ${validationPrompt?.validationPrompt ?? ""}`
    );
  }
}
