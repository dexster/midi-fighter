let midiAccess;
let midiAvailable = false;

let midiFighter = {
    inputId: '',
    outputId: '',
    inputs: null,
    outputs: null
}

let midiFighterDex = {
    inputId: '',
    outputId: '',
    inputs: null,
    outputs: null
}

let shiftActive = false;

export const initMidi = () => {
    navigator.permissions.query({ name: "midi", sysex: true }).then((result) => {
        if (result.state === "granted") {
            console.log('granted')
        } else if (result.state === "prompt") {
            console.log('prompt')
        }
        console.log('denied')
    });

    function onMIDISuccess(midiAcs) {
        console.log("MIDI ready: ", midiAcs);
        midiAccess = midiAcs;
        midiAvailable = midiAcs.inputs.size > 0;
        setInputsAndOutputs();
        startLoggingMIDIInput();
        changeBank();
    }

    function onMIDIFailure(msg) {
        console.error(`Failed to get MIDI access - ${msg}`);
    }

    return navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
}

export const startLoggingMIDIInput = () => {
    if (midiFighter.inputs) {
        midiFighter.inputs.onmidimessage = onMIDIMessage;
    }
}

export const changeBank = (bank = 0) => {
    if (midiFighter.outputs) {
        const message = [0xb3, bank, 0x7f];
        midiFighter.outputs.send(message);
    }
}
let velocity = 0x0;
export const sendMidiMessageToDevice = (message) => {
    if (midiAvailable) {
        velocity = velocity === 0x0 ? 0x7f : 0x0;
        const output = midiFighterDex.outputs;
        output.send(message);
    }
}

export const sendMessageToMidiFighter = (midiDetails) => {
    if (midiAvailable) {
        const output = midiFighter.outputs;
        output.send(toMessage(midiDetails));
    }
}

export const setAnimation = (animation, ccs) => {
    ccs.forEach(cc => {
        sendMessageToMidiFighter([177, cc, animation]);
    });
}

function setInputsAndOutputs() {
    for (const entry of midiAccess.inputs) {
        const input = entry[1];
        if (input.name.includes('Midi Fighter Twister')) {
            midiFighter.id = input.id;
            midiFighter.inputs = entry[1];
        }
        if (input.name.includes('Midi Fighter Dex')) {
            midiFighterDex.id = input.id;
            midiFighterDex.inputs = entry[1];
        }
        console.log(
            `Input port [type:'${input.type}'] id:'${input.id}' manufacturer:'${input.manufacturer}' name:'${input.name}' version:'${input.version}'`,
        );
    }

    for (const entry of midiAccess.outputs) {
        const output = entry[1];
        if (output.name.includes('Midi Fighter Twister')) {
            midiFighter.id = output.id;
            midiFighter.outputs = entry[1];
        }
        if (output.name.includes('Midi Fighter Dex')) {
            midiFighterDex.id = output.id;
            midiFighterDex.outputs = entry[1];
        }

        console.log(
            `Output port [type:'${output.type}'] id:'${output.id}' manufacturer:'${output.manufacturer}' name:'${output.name}' version:'${output.version}'`,
        );
    }
}

export const fromMessage = (message) => {
    let actionType = '';
    switch (message[0]) { // bitwise AND with 11110000 to get the type of message
        case 8:
            actionType = "Note Off";
            break;
        case 9:
            if (message[2] > 0) { // if velocity=0, this is a noteOff disguised as a noteOn
                actionType = "Note On";
            } else {
                actionType = "Note Off";
            }
            break;
        case 176:
            actionType = "CC rotary";
            break;
        case 177:
            actionType = "CC switch";
            break;
        default:
            actionType = "Unknown";
    }

    return {
        actionType: actionType,
        status: message[0] >> 4,
        channel: 1 + message[0] & 0x0F,
        cc: message[1],
        velocity: message[2]

    }
}

export const toMessage = (data) => {
    return Array.from(data).map((d, i) => {
        d = (i === 0) ? d + 1 : d;
        return `0x${parseInt(d).toString(16)}`
    }
    );
}

function onMIDIMessage(event) {
    console.log('onMIDIMessage: ', event)
    let messageDetails = fromMessage(event.data);
    let message = toMessage(event.data);

    let midiEvent = new CustomEvent("midiMessageReceived", {
        detail: {
            actionType: messageDetails.actionType,
            channel: messageDetails.channel,
            cc: messageDetails.cc,
            velocity: messageDetails.velocity,
            message: message
        }
    });
    window.dispatchEvent(midiEvent);
}

// switch (status >> 4) { // bitwise AND with 11110000 to get the type of message
//     case 8:
//         console.log('Note Off')
//         actionType = "Note Off";
//         break;
//     case 9:
//         if (event.data[2] > 0) { // if velocity=0, this is a noteOff disguised as a noteOn
//             actionType = "Note On";
//         } else {
//             actionType = "Note Off";
//         }
//         break;
//     case 11:
//         actionType = "Control Change";
//         break;
//     default:
//         actionType = "Unknown";
// }