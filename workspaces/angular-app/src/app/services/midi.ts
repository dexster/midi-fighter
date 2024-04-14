import { Injectable, NgZone, inject, model, output, signal } from "@angular/core";
import { Subject } from "rxjs";
import { EncoderAction } from "shared-lib/models/controller";
import { Actiontype, MidiEvent, MidiMessage } from "../models/controller";

export interface MidiDevice {
    name: string;
    inputId: any;
    outputId: any;
    input: any;
    output: any;
}

@Injectable({
    providedIn: 'root'
})
export class MidiService {

    ngZone = inject(NgZone);
    midiAccess: MIDIAccess;
    midiFighterAvailable = signal(false);
    midiDevices: MidiDevice[] = [];
    midiOutMessage = signal<MidiMessage | null>(null);

    midiFighter: MidiDevice = {
        name: '',
        inputId: '',
        outputId: '',
        input: null,
        output: null
    }

    selectedOutputDevice = model<MidiDevice | undefined>({
        name: '',
        inputId: '',
        outputId: '',
        input: null,
        output: null
    });

    shiftActive = false;
    intervalId: any;

    message$: Subject<MidiEvent | null> = new Subject<MidiEvent | null>();

    constructor() {
        this.initMidi();
    }

    initMidi() {
        // this.intervalId = setInterval(() => {
        navigator.permissions.query({ name: "midi" as PermissionName }).then((result) => {
            console.log(result.state);
        });

        navigator.requestMIDIAccess().then(
            midiAcs => {
                console.log("MIDI ready: ", midiAcs);
                this.midiAccess = midiAcs;
                this.setInputsAndOutputs();
                this.startLoggingMIDIInput();
                this.changeBank();
            }), (msg: any) => {
                console.error(`Failed to get MIDI access - ${msg}`);
            };
        // }, 1000)
    }

    startLoggingMIDIInput() {
        if (this.midiFighter.input) {
            this.midiFighter.input.onmidimessage = this.onMIDIMessage.bind(this);
        }
    }

    changeBank(bank = 0) {
        if (this.midiFighter.output) {
            const message = [0xb3, bank, 0x7f];
            this.midiFighter.output.send(message);
        }
    }

    sendMidiOutMessage(message: MidiEvent, ccConfig: EncoderAction) {
        if (this.selectedOutputDevice()) {
            let velocity = Math.round(((ccConfig.max - ccConfig.min) / 127) * message.velocity + ccConfig.min);
            const output = this.selectedOutputDevice()!.output;
            output!.send([177, message.cc, velocity]);
            this.midiOutMessage.set({channel: message.channel, cc: message.cc, velocity: velocity});
        }
    }

    sendMessageToMidiFighter(midiDetails: any) {
        if (this.midiFighterAvailable()) {
            const output = this.midiFighter.output;
            output.send(this.toMessage(midiDetails));
        }
    }

    setAnimation(animations: { animation: number, cc: number }[]) {
        animations.forEach(animation => {
            this.sendMessageToMidiFighter([177, animation.cc, animation.animation]);
        });
    }

    private setInputsAndOutputs() {
        // @ts-ignore
        for (const entry of this.midiAccess.inputs) {
            const input = entry[1];

            if (!input.name.includes('Midi Fighter Twister')) {
                this.midiDevices.push({
                    name: input.name,
                    inputId: input.id,
                    outputId: '',
                    input: entry[1],
                    output: null
                });
            } else {
                if (input.name.includes('Midi Fighter Twister')) {
                    // clearInterval(this.intervalId);
                    this.midiFighterAvailable.set(true);
                    this.midiFighter = {
                        name: input.name,
                        inputId: input.id,
                        outputId: '',
                        input: entry[1],
                        output: null
                    };
                }
                console.log(
                    `Input port [type:'${input.type}'] id:'${input.id}' manufacturer:'${input.manufacturer}' name:'${input.name}' version:'${input.version}'`,
                );
            }
        }

        let count = 0;
        // @ts-ignore
        for (const entry of this.midiAccess.outputs) {
            const output = entry[1];

            if (output.name === 'Midi Fighter Twister') {
                this.midiFighter.outputId = output.id.toString();
                this.midiFighter.output = entry[1];
            } else {
                const device = this.midiDevices.find(dvc => dvc.name === output.name);
                if (device) {
                    device.outputId = output.id.toString();
                    device.output = entry[1];
                }
            }

            this.selectedOutputDevice.set(this.midiDevices[0]);

            console.log(
                `Output port [type:'${output.type}'] id:'${output.id}' manufacturer:'${output.manufacturer}' name:'${output.name}' version:'${output.version}'`,
            );
        }
    }

    fromMessage(message: any): Omit<MidiEvent, 'message'> {
        let actionType = '';
        switch (message[0] >> 4) { // bitwise AND with 11110000 to get the type of message
            case 11:
                actionType = message[0] === 176 ? 'CC rotary' : "CC switch";
                break;
            case 8:
                actionType = 'Note Off';
                break;
            case 9:
                if (message[2] > 0) { // if velocity=0, this is a noteOff disguised as a noteOn
                    actionType = 'Note On';
                } else {
                    actionType = 'Note Off';
                }
                break;
            default:
                actionType = 'Unknown';
        }

        return {
            actionType: (actionType as Actiontype),
            channel: 1 + message[0] & 0x0F,
            cc: +message[1],
            velocity: +message[2]
        }
    }

    // @ts-ignore
    toMessage(data): number[] {
        // @ts-ignore
        return Array.from(data).map((d, i) => {
            // @ts-ignore
            d = (i === 0) ? d + 1 : d;
            // @ts-ignore
            return `0x${parseInt(d).toString(16)}`
        }
        );
    }

    onMIDIMessage(event: any) {
        this.ngZone.run(() => {
            let messageDetails = this.fromMessage(event.data);
            let receivedMessage = this.toMessage(event.data);

            let midiEvent: MidiEvent = {
                actionType: messageDetails.actionType,
                channel: messageDetails.channel,
                cc: messageDetails.cc,
                velocity: messageDetails.velocity,
                message: receivedMessage
            }

            console.log('onMIDIMessage: ', event)
            this.message$.next(midiEvent);
        })
    }
}
