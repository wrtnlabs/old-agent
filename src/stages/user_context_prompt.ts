import { InitialInformation } from "../session";

export function buildUserContextPrompt(initialInformation: InitialInformation) {
  const userContext = ``; // TODO
  const sessionContext = ``; // TODO
  return `${userContext}\n\n${sessionContext}`;
}
