import { AgentLogger, ConsoleLogger } from "@wrtnio/agent-os";

const ExceptionLogger: AgentLogger = {
  error: (message, ...args) => {
    ConsoleLogger.error(message, ...args);
  },
  log: (_message, ..._args) => {},
  warn: (message, ...args) => {
    ConsoleLogger.warn(message, ...args);
  },
  debug: (_message, ..._args) => {},
  verbose: (_message, ..._args) => {},
  fatal: (message, ...args) => {
    ConsoleLogger.error(message, ...args);
  },
};

export { ExceptionLogger };
