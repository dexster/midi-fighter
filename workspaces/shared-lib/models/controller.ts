export interface ButtonAction {
  position: number
  cc: number;
  switch?: string;
  isShift?: boolean;
}

export interface EncoderAction extends ButtonAction {
  cc: number;
  encoder?: string;
  encoderShift?: string;
  encoderType?: 'CC' | '3FH/41H';
  animation?: number;
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
