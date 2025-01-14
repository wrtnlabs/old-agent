import { IAgentPrompt } from "./structures/IAgentPrompt";
import { IAgentTokenUsage } from "./structures/IAgentTokenUsage";
import { IAgentEvent } from "./structures/IAgentEvent";
import { IAgentProps } from "./structures/IAgentProps";

export class MetaAgent {
  /* -----------------------------------------------------------
      CONSTRUCTOR
    ----------------------------------------------------------- */
  /**
   * Initializer constructor.
   *
   * @param props Properties to construct the agent
   */
  public constructor(private readonly props: IAgentProps) {
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
  public async conversate(content: string): Promise<IAgentPrompt[]> {
    throw Error("Not implemented");
  }

  /**
   * Get the chatbot's prompt histories.
   *
   * Get list of chat prompts that the chatbot has been conversated.
   *
   * @returns List of chat prompts
   */
  public getPromptHistories(): IAgentPrompt[] {
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
  public getTokenUsage(): IAgentTokenUsage {
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
