export interface ButtonAction {
  position: number
  cc: number;
  switch?: string;
  isShift?: boolean;
}

export type EncoderType = "CC" | "3FH/41H"

export interface EncoderAction extends ButtonAction {
  cc: number;
  encoder?: string;
  encoderShift?: string;
  encoderType: EncoderType;
  animation: number;
  min: number;
  max: number;
}

export interface Actions {
  encoder: EncoderAction[];
  leftSide: ButtonAction[];
  rightSide: ButtonAction[];
}

export interface ControllerData {
  title: string;
  bank: Actions[];
  shiftBank: Actions[];
}

export type MessageResponse = {response: number, checkboxChecked: boolean};