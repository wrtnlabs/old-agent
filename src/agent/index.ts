import { IAgentPrompt } from "./prompt";
import { IController } from "./controller";
import { IProvider } from "./provider";
import { IAgentTokenUsage } from "./token_usage";
import { IAgentEvent } from "./event";

export namespace MetaAgent {
  export type Source =
    | "initialize"
    | "select"
    | "cancel"
    | "execute"
    | "describe";
  export type IProps = {
    controllers: IController[];
    provider: IProvider;
    config?: IConfig;
    histories?: [];
  };

  export interface IConfig {
    /**
     * Locale of the A.I. chatbot.
     *
     * If you configure this property, the A.I. chatbot will conversate with
     * the given locale. You can get the locale value by
     *
     * - Browser: `navigator.language`
     * - NodeJS: `process.env.LANG.split(".")[0]`
     *
     * @default your_locale
     */
    locale?: string;

    /**
     * Timezone of the A.I. chatbot.
     *
     * If you configure this property, the A.I. chatbot will consider the
     * given timezone. You can get the timezone value by
     * `Intl.DateTimeFormat().resolvedOptions().timeZone`.
     *
     * @default your_timezone
     */
    timezone?: string;

    /**
     * Retry count.
     *
     * If LLM function calling composed arguments are invalid,
     * the A.I. chatbot will retry to call the function with
     * the modified arguments.
     *
     * By the way, if you configure it to 0 or 1, the A.I. chatbot
     * will not retry the LLM function calling for correcting the
     * arguments.
     *
     * @default 3
     */
    retry?: number;

    /**
     * Capacity of the LLM function selecting.
     *
     * When the A.I. chatbot selects a proper function to call, if the
     * number of functions registered in the
     * {@link INestiaAgentProps.applications} is too much greater,
     * the A.I. chatbot often fallen into the hallucination.
     *
     * In that case, if you configure this property value, `NestiaChatAgent`
     * will divide the functions into the several groups with the configured
     * capacity and select proper functions to call by operating the multiple
     * LLM function selecting agents parallelly.
     *
     * @default 0
     */
    capacity?: number;

    /**
     * Eliticism for the LLM function selecting.
     *
     * If you configure {@link capacity}, the A.I. chatbot will complete
     * the candidate functions to call which are selected by the multiple
     * LLM function selecting agents.
     *
     * Otherwise you configure this property as `false`, the A.I. chatbot
     * will not complete the candidate functions to call and just accept
     * every candidate functions to call which are selected by the multiple
     * LLM function selecting agents.
     *
     * @default true
     */
    eliticism?: boolean;

    /**
     * System prompt messages.
     *
     * System prompt messages if you want to customize the system prompt
     * messages for each situation.
     */
    systemPrompt?: {
      common?: (config?: IConfig) => string;
      initialize?: (histories: MetaAgent.IPrompt[]) => string;
      select?: (histories: MetaAgent.IPrompt[]) => string;
      cancel?: (histories: MetaAgent.IPrompt[]) => string;
      execute?: (histories: MetaAgent.IPrompt[]) => string;
      describe?: (histories: IAgentPrompt.IExecute[]) => string;
    };
  }

  export type IPrompt = IAgentPrompt;
  export type IController = IController.IHttp | IController.IClass;
  export type IProvider = IProvider.IChatGpt;
  export type ITokenUsage = IAgentTokenUsage;
  export type IEvent = IAgentEvent;
}

export class MetaAgent {
  /* -----------------------------------------------------------
      CONSTRUCTOR
    ----------------------------------------------------------- */
  /**
   * Initializer constructor.
   *
   * @param props Properties to construct the agent
   */
  public constructor(private readonly props: MetaAgent.IProps) {
    throw Error("Not implemented");
  }

  /* -----------------------------------------------------------
      ACCESSORS
    ----------------------------------------------------------- */
  /**
   * Conversate with the A.I. chatbot.
   *
   * User talks to the A.I. chatbot with the content.
   *
   * When the user's conversation implies the A.I. chatbot to execute a
   * function calling, the returned chat prompts will contain the
   * function calling information
   *
   * @param content The content to talk
   * @returns List of newly created chat prompts
   */
  public async conversate(content: string): Promise<MetaAgent.IPrompt[]> {
    throw Error("Not implemented");
  }

  /**
   * Get the chatbot's prompt histories.
   *
   * Get list of chat prompts that the chatbot has been conversated.
   *
   * @returns List of chat prompts
   */
  public getPromptHistories(): MetaAgent.IPrompt[] {
    throw Error("Not implemented");
  }

  /**
   * Get token usage of the A.I. chatbot.
   *
   * Entire token usage of the A.I. chatbot during the conversating
   * with the user by {@link conversate} method callings.
   *
   * @returns Cost of the A.I. chatbot
   */
  public getTokenUsage(): MetaAgent.ITokenUsage {
    throw Error("Not implemented");
  }

  /* -----------------------------------------------------------
      EVENT HANDLERS
    ----------------------------------------------------------- */
  /**
   * Add an event listener.
   *
   * Add an event listener to be called whenever the event is emitted.
   *
   * @param type Type of event
   * @param listener Callback function to be called whenever the event is emitted
   */
  public on<Type extends IAgentEvent.Type>(
    type: Type,
    listener: (event: IAgentEvent.Mapper[Type]) => void | Promise<void>
  ): void {
    throw Error("Not implemented");
  }

  /**
   * Erase an event listener.
   *
   * Erase an event listener to stop calling the callback function.
   *
   * @param type Type of event
   * @param listener Callback function to erase
   */
  public off<Type extends IAgentEvent.Type>(
    type: Type,
    listener: (event: IAgentEvent.Mapper[Type]) => void | Promise<void>
  ): void {
    throw Error("Not implemented");
  }
}
