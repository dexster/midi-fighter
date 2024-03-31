import './style.css';
import { initMidi } from './midi.mjs'
import { initLayout, actionReceivedMessage } from './mf-layout.mjs'

const init = async () => {
    const response = await window.electronAPI.readData()
    console.log('data: ', response)

    const mf = document.querySelector('.mf-container');
    initLayout(mf, response);
    startMidi();

    function startMidi() {
        initMidi().then(() => {
            window.addEventListener('midiMessageReceived', function (e) {
                actionReceivedMessage(e.detail);
            });
        })
    }
}

init()
