import { Cost } from "./core/cost_detail";
import { BackendKind } from "./lm_bridge/backend";

export class CostCalculator {
  constructor(private readonly kind: BackendKind) {}

  static fromBackendKind(backendKind: BackendKind) {
    return new CostCalculator(backendKind);
  }

  costPerMillionInputTokens(): number {
    switch (this.kind.model) {
      case "gpt-4o-2024-11-20":
        return 2.5;
      case "gpt-4o-mini-2024-07-18":
        return 0.15;
      case "claude-3-5-sonnet-20241022":
        return 3.0;
      case "claude-3-5-haiku-20241022":
        return 1.0;
    }
  }

  costPerMillionOutputTokens(): number {
    switch (this.kind.model) {
      case "gpt-4o-2024-11-20":
        return 10.0;
      case "gpt-4o-mini-2024-07-18":
        return 0.6;
      case "claude-3-5-sonnet-20241022":
        return 15.0;
      case "claude-3-5-haiku-20241022":
        return 5.0;
    }
  }

  toString(): string {
    return this.kind.toString();
  }

  toJSON(): string {
    return this.toString();
  }

  computeCost({
    inputTokens,
    outputTokens,
  }: {
    inputTokens: number;
    outputTokens: number;
  }): Cost {
    const costPerMillionInputTokens = this.costPerMillionInputTokens();
    const costPerMillionOutputTokens = this.costPerMillionOutputTokens();

    const cost = Math.max(
      (inputTokens / 1_000_000.0) * costPerMillionInputTokens +
        (outputTokens / 1_000_000.0) * costPerMillionOutputTokens,
      0.0
    );

    return {
      inputTokens,
      outputTokens,
      cost,
    };
  }
}
