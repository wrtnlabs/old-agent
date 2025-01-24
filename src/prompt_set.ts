import { Environment, type ILoaderAny, type ILoaderAsync } from "nunjucks";
import { JsonValue } from "./core/types";

export interface PromptSet {
  getPrompt(name: string, context?: Record<string, JsonValue>): Promise<string>;
}
@TODO migration file to inline text
export class NunjucksPromptSet implements PromptSet {
  private env: Environment;

  constructor(loader: ILoaderAny) {
    this.env = new Environment(loader);
  }

  static async default(): Promise<NunjucksPromptSet> {
    const { default: FileSystemAsyncLoader } = await import(
      "nunjucks-async-loader"
    );
    const searchPath = await lookupDir("prompts");
    const loader = new FileSystemAsyncLoader(searchPath) as ILoaderAsync;
    return new NunjucksPromptSet(loader);
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

/**
 * Find the nearest directory with the given name, starting from the given path.
 */
async function lookupDir(name: string, path = __dirname): Promise<string> {
  const { join, dirname } = await import("node:path");
  const { stat } = await import("node:fs/promises");

  while (true) {
    const filename = join(path, name);
    try {
      const s = await stat(filename);
      if (s.isDirectory()) {
        return filename;
      }
    } catch (e) {
      // pass
    }

    const parent = dirname(path);
    if (parent === path) {
      throw new Error("Could not find directory");
    }

    path = parent;
  }
}
