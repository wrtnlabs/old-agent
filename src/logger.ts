export interface AgentLogger {
  /**
   * Write an 'error' level log.
   */
  error(message: any, stack?: string, context?: string): void;
  error(message: any, ...optionalParams: [...any, string?, string?]): void;
  /**
   * Write a 'log' level log.
   */
  log(message: any, context?: string): void;
  log(message: any, ...optionalParams: [...any, string?]): void;
  /**
   * Write a 'warn' level log.
   */
  warn(message: any, context?: string): void;
  warn(message: any, ...optionalParams: [...any, string?]): void;
  /**
   * Write a 'debug' level log.
   */
  debug(message: any, context?: string): void;
  debug(message: any, ...optionalParams: [...any, string?]): void;
  /**
   * Write a 'verbose' level log.
   */
  verbose(message: any, context?: string): void;
  verbose(message: any, ...optionalParams: [...any, string?]): void;
  /**
   * Write a 'fatal' level log.
   */
  fatal(message: any, context?: string): void;
  fatal(message: any, ...optionalParams: [...any, string?]): void;
}

const consoleLoggerWrapper = <Level extends keyof AgentLogger>(
  level: Level,
  func:
    | typeof console.error
    | typeof console.log
    | typeof console.warn
    | typeof console.debug,
  ...args: Parameters<AgentLogger[Level]>
) => {
  func(JSON.stringify({ level, message: args[0] }), ...args.slice(1));
};

export const ConsoleLogger: AgentLogger = {
  error: (message, ...args) =>
    consoleLoggerWrapper("error", console.error, message, ...args),
  log: (message, ...args) =>
    consoleLoggerWrapper("log", console.log, message, ...args),
  warn: (message, ...args) =>
    consoleLoggerWrapper("warn", console.warn, message, ...args),
  debug: (message, ...args) =>
    consoleLoggerWrapper("debug", console.debug, message, ...args),
  verbose: (message, ...args) =>
    consoleLoggerWrapper("verbose", console.log, message, ...args),
  fatal: (message, ...args) =>
    consoleLoggerWrapper("fatal", console.error, message, ...args),
};
