export type TEngineErrorCode =
  | "NOT_SETUP"
  | "NO_LIFTED"
  | "ALREADY_LIFTED"
  | "DECK_TOO_SMALL"
  | "HAND_EMPTY"
  | "EMPTY_ROUTINE"
  | "EMPTY_PHASE"
  | "UNKNOWN_ACTION"
  | "WRONG_SCENE"
  | "NO_PACKET";

export interface IEngineErrorInfo {
  code: TEngineErrorCode;
  message: string;
  phaseIndex: number | null;
  actionIndex: number | null;
}

export class EngineError extends Error {
  readonly code: TEngineErrorCode;
  phaseIndex: number | null = null;
  actionIndex: number | null = null;

  constructor(code: TEngineErrorCode, message: string) {
    super(message);
    this.name = "EngineError";
    this.code = code;
  }

  toInfo(): IEngineErrorInfo {
    return {
      code: this.code,
      message: this.message,
      phaseIndex: this.phaseIndex,
      actionIndex: this.actionIndex,
    };
  }
}
