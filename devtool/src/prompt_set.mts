import type { JsonValue, PromptSet } from "@wrtnio/agent-os";
import { Environment, type ILoaderAsync } from "nunjucks";
import FileSystemAsyncLoader from "nunjucks-async-loader";

export class NunjucksPromptSet implements PromptSet {
  private env: Environment;

  constructor() {
    const loader = new FileSystemAsyncLoader("../prompts") as ILoaderAsync;
    this.env = new Environment(loader);
  }

  getPrompt(
    name: string,
    context?: Record<string, JsonValue>
  ): Promise<string> {
    return new Promise((resolve, reject) =>
      this.env.render(`${name}.tera`, context, (err, res) => {
        if (err != null) {
          reject(err);
        } else if (res != null) {
          resolve(res);
        } else {
          reject();
        }
      })
    );
  }
}
