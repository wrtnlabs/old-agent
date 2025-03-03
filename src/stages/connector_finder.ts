import { Stage, StageContext, StageError } from "../core/stage";
import { OpenAiFunction } from "../core/connector";
import { Message } from "../lm_bridge/inputs/message";
import { LmBridge } from "../lm_bridge/lm_bridge";
import { Completion } from "../lm_bridge/outputs/completion";

const TEMPERATURE = 0.2;
const MAX_RETRIES = 5;

export interface ConnectorFinderInput {
  query: string;
  specifications?: string;
}

export interface ConnectorFinderOutput {
  connectors: OpenAiFunction[];
}

function buildMessages(
  systemPrompt: string,
  inputPrompt: string,
  connectorListPrompt: string,
  validationPrompt?: ValidationFailure
): Message[] {
  const messages: Message[] = [
    {
      role: "system",
      content: { type: "text", text: systemPrompt },
    },
    {
      role: "system",
      content: { type: "text", text: connectorListPrompt },
    },
    {
      role: "user",
      content: { type: "text", text: inputPrompt },
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

export class ConnectorFinder
  implements Stage<ConnectorFinderInput, ConnectorFinderOutput>
{
  identifier: string = "connector_finder";

  constructor() {}

  async execute(
    input: ConnectorFinderInput,
    context: StageContext
  ): Promise<ConnectorFinderOutput> {
    const lmBridge = new LmBridge({
      temperature: TEMPERATURE,
      jsonMode: true,
      tools: [],
      logger: context.logger,
    });
    const systemPrompt = await context.getPrompt("v2-connector-finder");
    const inputPrompt = `<request>\n${JSON.stringify(input)}\n</request>`;
    const connectorList = await context.allFunctions();
    const connectorListPrompt = `<connector-list>\n${JSON.stringify(connectorList)}\n</connector-list>`;
    let validationPrompt: ValidationFailure | undefined;

    outer: for (let retryIndex = 0; retryIndex < MAX_RETRIES; retryIndex++) {
      context.logger.log(
        `connector finder retryIndex: %i, validationPrompt: %o`,
        retryIndex,
        validationPrompt
      );

      const messages = buildMessages(
        systemPrompt,
        inputPrompt,
        connectorListPrompt,
        validationPrompt
      );
      const response: Completion = await lmBridge.request({
        connection: context.llmConnection,
        sessionId: context.sessionId,
        stageName: this.identifier,
        messages,
        signal: context.signal,
      });

      // context.accumulateUsage

      const message = response.messages.at(0);
      if (message == null) {
        context.logger.warn("connector finder response is empty; retrying");

        validationPrompt = {
          assistantResponse: "<empty response>",
          validationPrompt: "you did not provide a valid response",
        };
        continue outer;
      }
      if (message.type !== "text") {
        context.logger.warn("connector finder response is not text; retrying");

        validationPrompt = {
          assistantResponse: "<non-text response>",
          validationPrompt: "expected text message; got something else",
        };
        continue outer;
      }
      if (message.text.includes("\n")) {
        context.logger.warn(
          "connector finder response contains newline; retrying"
        );

        validationPrompt = {
          assistantResponse: message.text,
          validationPrompt:
            "you didn't escape the response correctly; please correctly escape all strings in the response",
        };
        continue outer;
      }
      let output;
      try {
        output = JSON.parse(message.text);
      } catch (err) {
        validationPrompt = {
          assistantResponse: message.text,
          validationPrompt: `"your response is invalid JSON: ${err}"`,
        };
        continue outer;
      }

      context.logger.log("connector finder output=%o", output);

      const connectors: OpenAiFunction[] = [];

      for (const connector of output.connectors) {
        const func = await context.findFunction(
          context.sessionId,
          `${connector.method}:${connector.path}`
        );
        if (func == null) {
          context.logger.warn(
            "connector finder response contains an invalid connector `%o`; retrying",
            connector
          );

          validationPrompt = {
            assistantResponse: message.text,
            validationPrompt: `your response is containing an invalid connector \`${connector}\`; which does not exist in the list of available connectors`,
          };
          continue outer;
        }
        connectors.push(connector);
      }
      return { connectors };
    }
    throw new StageError(
      `LLM returned invalid response: ${validationPrompt?.validationPrompt ?? ""}`
    );
  }
}
