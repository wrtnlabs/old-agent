export type IExecutionResult<T> =
  | IExecutionResult.ISuccess<T>
  | IExecutionResult.IFailure;
export namespace IExecutionResult {
  export interface ISuccess<T> {
    success: true;
    value: T;
  }
  export interface IFailure {
    success: false;
    error: any;
  }

  export const tryExecute = <T>(fn: () => T): IExecutionResult<T> => {
    try {
      return { success: true, value: fn() };
    } catch (e) {
      return { success: false, error: e };
    }
  };
}
