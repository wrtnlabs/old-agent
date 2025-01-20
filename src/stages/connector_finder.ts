import { Stage, StageContext } from "../core/stage";
import { OpenAiFunction } from "../function";
import { Message } from "../lm-bridge/inputs/message";
import { LmBridge } from "../lm-bridge/lm_bridge";
import { Completion } from "../lm-bridge/outputs/completion";

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

  #lmBridge: LmBridge;

  constructor() {
    this.#lmBridge = new LmBridge(TEMPERATURE, true, []);
  }

  async execute(
    input: ConnectorFinderInput,
    context: StageContext
  ): Promise<ConnectorFinderOutput> {
    const systemPrompt = await context.getPrompt("v2-connector-finder");
    const inputPrompt = `<request>\n${JSON.stringify(input)}\n</request>`;
    const connectorList = await context.allFunctions();
    const connectorListPrompt = `<connector-list>\n${JSON.stringify(connectorList)}</connector-list>`;
    let validationPrompt: ValidationFailure | undefined;

    outer: for (let retryIndex = 0; retryIndex < MAX_RETRIES; retryIndex++) {
      console.info(
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
      const response: Completion = await this.#lmBridge.request({
        connection: context.llmConnection,
        sessionId: context.sessionId,
        stageName: this.identifier,
        messages,
      });

      // context.accumulateUsage

      const message = response.messages.at(0);
      if (message == null) {
        console.warn("connector finder response is empty; retrying");

        validationPrompt = {
          assistantResponse: "<empty response>",
          validationPrompt: "you did not provide a valid response",
        };
        continue outer;
      }
      if (message.type !== "text") {
        console.warn("connector finder response is not text; retrying");

        validationPrompt = {
          assistantResponse: "<non-text response>",
          validationPrompt: "expected text message; got something else",
        };
        continue outer;
      }
      if (message.text.includes("\n")) {
        console.warn("connector finder response contains newline; retrying");

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

      console.info("connector finder output=%o", output);

      const connectors: OpenAiFunction[] = [];

      for (const id in output.connector_ids) {
        const connector = await context.findFunction(context.sessionId, id);
        if (connector == null) {
          console.warn(
            "connector finder response contains an invalid connector id `%s`; retrying",
            id
          );

          validationPrompt = {
            assistantResponse: message.text,
            validationPrompt: `your response is containing an invalid connector id \`${id}\`; which does not exist in the list of available connectors`,
          };
          continue outer;
        }
        connectors.push(connector);
      }
      return { connectors };
    }
    throw new Error(
      `LLM returned invalid response: ${validationPrompt?.validationPrompt ?? ""}`
    );
  }
}
