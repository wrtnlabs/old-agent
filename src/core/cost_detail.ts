export type CostDetail = { total: Cost } & Record<string, Cost>;

export type Cost = {
  cost: number;
  inputTokens: number;
  outputTokens: number;
};
