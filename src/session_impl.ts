import * as uuid from "uuid";
import { ChatHistory, Speaker } from "./chat_history";
import { StageContext, StageError } from "./core/stage";
import { MetaAgentSessionDelegate } from "./delegate";
import { DialogEmitter } from "./dialog_emitter";
import { OpenAiFunctionSummary, OpenAiFunction } from "./core/connector";
import {
  buildDetailedFunctionCallResult,
  FunctionCallResult,
} from "./function_call_result";
import { Connection } from "./lm_bridge/backend";
import { CompletionToolUseMessage } from "./lm_bridge/outputs/completion";
import { PromptSet } from "./prompt_set";
import { InitialInformation, PlatformInfo } from "./session";
import {
  Agent,
  AgentAction,
  AgentLookupFunctionsAction,
  AgentRunFunctionsAction,
} from "./stages/agent";
import { ConnectorFinder } from "./stages/connector_finder";
import { ConnectorParamGenerator } from "./stages/connector_param_generator";
import { JsonValue } from "./core/types";

export interface SessionInput {
  connection: Connection;
  promptSet: PromptSet;
  delegate: MetaAgentSessionDelegate;
  sessionId: string;
  platformInfo: PlatformInfo;
  userContext: InitialInformation;
  initialHistory: ChatHistory;
}

export class StageGroup {
  agent = new Agent();
  connectorFinder = new ConnectorFinder();
  connectorParamGenerator = new ConnectorParamGenerator();

  async run(input: SessionInput, signal?: AbortSignal) {
    console.info("starting session...");
    input.initialHistory.rollbackToSafePoint();

    const dialogEmitter = new DialogEmitter(
      input.initialHistory.clone(),
      input.delegate
    );

    const state = new SessionState(
      this,
      input.connection,
      input.sessionId,
      input.platformInfo,
      input.userContext,
      input.promptSet,
      input.delegate,
      dialogEmitter,
      signal
    );

    let previousError: string | undefined;
    let userQuery: string | undefined;

    while (!signal?.aborted) {
      try {
        await state.step(previousError, userQuery);
      } catch (err) {
        if (err instanceof StageError) {
          previousError = err.message;
          continue;
        }
        if (err instanceof Error && err.name === "AbortError") {
          break;
        }
        const error = new Error("unexpected error", { cause: err });
        console.error("session ended with an error: %o", error);
        input.delegate.onError?.(error);
        break;
      }
    }
  }
}

const ASSISTANT_AGENT: Speaker = { type: "assistant", name: "agent" };

class SessionState implements StageContext {
  constructor(
    private _stages: StageGroup,
    private _connection: Connection,
    private _sessionId: string,
    private _platformInfo: PlatformInfo,
    private _userContext: InitialInformation,
    private _promptSet: PromptSet,
    private _delegate: MetaAgentSessionDelegate,
    private _dialogEmitter: DialogEmitter,
    private _signal?: AbortSignal
  ) {}

  // #group StageContext implementation

  get llmConnection(): Connection {
    return this._connection;
  }
  get sessionId(): string {
    return this._sessionId;
  }
  get langCode(): string {
    return this._userContext.lang_code ?? "en";
  }
  get userContext(): InitialInformation {
    return this._userContext;
  }
  get signal(): AbortSignal | undefined {
    return this._signal;
  }

  async getPrompt(
    name: string,
    context?: Record<string, JsonValue>
  ): Promise<string> {
    return await this._promptSet.getPrompt(name, context);
  }

  async allFunctions(): Promise<OpenAiFunctionSummary[]> {
    return await this._delegate.queryFunctions(
      {
        sessionId: this.sessionId,
      },
      { signal: this.signal }
    );
  }

  async findFunction(
    sessionId: string,
    name: string
  ): Promise<OpenAiFunction | undefined> {
    return await this._delegate.findFunction(sessionId, name, {
      signal: this.signal,
    });
  }

  // #end

  async step(
    previousError: string | undefined,
    previousUserQuery: string | undefined
  ): Promise<void> {
    const history = this._dialogEmitter.history();
    const lastDialog = history.lastDialog();
    const wasEndedByAgentText =
      lastDialog == null ||
      (lastDialog.speaker.type === "assistant" &&
        lastDialog.message.type !== "tool_use" &&
        lastDialog.message.type !== "tool_result");

    if (wasEndedByAgentText) {
      await this._dialogEmitter.commit();
    }

    let userQuery = previousUserQuery;
    if (wasEndedByAgentText) {
      const userResponse = await this._delegate.onRead({});
      await this._dialogEmitter.emit({
        speaker: { type: "user" },
        message: { type: "text", text: userResponse },
        visible: true,
      });
      await this._dialogEmitter.commit();
      userQuery = userResponse;
    }

    const output = await this._stages.agent.execute(
      {
        platformInfo: this._platformInfo,
        userQuery,
        lastFailure: previousError,
        histories: Array.from(history),
      },
      this
    );

    for (const action of output.actions) {
      await this.matchAgentAction(action);
    }

    await this._dialogEmitter.commit();
  }

  async matchAgentAction(action: AgentAction): Promise<void> {
    switch (action.type) {
      case "chat":
        await this.handleResponseText(action.message);
        break;
      case "lookup_functions":
        await this.handleLookupFunctions(action);
        break;
      case "run_functions":
        await this.handleRunFunctions(action);
        break;
    }
  }

  async handleResponseText(text: string) {
    await this._dialogEmitter.emit({
      speaker: ASSISTANT_AGENT,
      message: { type: "text", text },
      visible: true,
    });
  }

  async recordToolUse(toolUse: CompletionToolUseMessage): Promise<string> {
    await this._dialogEmitter.emit({
      speaker: ASSISTANT_AGENT,
      message: {
        type: "tool_use",
        tool_use_id: toolUse.toolUseId,
        name: toolUse.toolName,
        args: toolUse.arguments,
      },
      visible: true,
    });
    return toolUse.toolUseId;
  }

  async recordToolResult(
    toolUseId: string,
    isError: boolean,
    content: unknown
  ) {
    await this._dialogEmitter.emit({
      speaker: ASSISTANT_AGENT,
      message: {
        type: "tool_result",
        tool_use_id: toolUseId,
        is_error: isError,
        content,
      },
      visible: true,
    });
  }

  async handleLookupFunctions(action: AgentLookupFunctionsAction) {
    // TODO: emit finding connector event

    const toolUseId = await this.recordToolUse(action.functionCall);
    const functionLookupTasks = action.queries.map((query) =>
      this._stages.connectorFinder.execute(query, this)
    );
    const results = await Promise.allSettled(functionLookupTasks);
    const connectors = results
      .values()
      .filter((result) => result.status === "fulfilled")
      .flatMap(({ value }) => value.connectors as unknown[] as JsonValue[])
      .toArray();
    await this.recordToolResult(toolUseId, false, connectors);
  }

  async handleRunFunctions(action: AgentRunFunctionsAction) {
    const histories = Array.from(this._dialogEmitter.history());
    const paramGeneratorOutputTasks = action.items.map((item) =>
      this._stages.connectorParamGenerator.execute(
        {
          connector: item.function,
          purpose: item.purpose,
          histories,
        },
        this
      )
    );
    let paramGeneratorOutputs: ConnectorParamGenerator.Output[];
    try {
      paramGeneratorOutputs = await Promise.all(paramGeneratorOutputTasks);
    } catch (err) {
      // TODO: check if err instanceof StageError
      const toolUseId = await this.recordToolUse(action.functionCall);
      await this.recordToolResult(
        toolUseId,
        true,
        `SYSTEM FAILURE: something is wrong with the parameter generator:\n\n${err}`
      );
      return;
    }

    const toolUseId = await this.recordToolUse(action.functionCall);
    const responseTasks = paramGeneratorOutputs.map(async (output, index) => {
      const connector = action.items[index]?.function;
      if (connector == null) {
        throw new Error("connector is not found");
      }
      return await this._delegate.onConnectorCall({
        function: connector,
        args: output.arguments,
      });
    });
    const responses = await Promise.allSettled(responseTasks);

    try {
      const functionCallResult: FunctionCallResult = {
        id: uuid.v4(),
        items: action.items.map((item, index) => {
          const output = paramGeneratorOutputs[index]!;
          const result = responses[index]!;
          return {
            purpose: item.purpose,
            function: item.function,
            arguments: output.arguments,
            result,
          };
        }),
      };
      await this.recordToolResult(
        toolUseId,
        false,
        buildDetailedFunctionCallResult(functionCallResult)
      );
    } catch (err) {
      await this.recordToolResult(toolUseId, true, err);
    }
  }
}
