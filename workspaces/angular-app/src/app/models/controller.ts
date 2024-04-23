export type Mode = 'performance' | 'edit' | 'lighting' | 'shift' | 'midi' | 'switchType';

export type Side = 'left' | 'right';

export type Actiontype = 'Note On' | 'Note Off' | 'CC rotary' | 'CC switch' | 'Unknown';

export interface MidiMessage {
    channel: number;
    cc: number;
    velocity: number;
}

export interface MidiEvent extends MidiMessage {
    actionType: Actiontype;
    message: any;
}

