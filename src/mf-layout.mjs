import { changeBank, sendMessageToMidiFighter } from './midi.mjs'
import { saveValues, openFile, createAnimationValueOptions, setAnimationValueOptions, checkShift, storeValues } from './settings.mjs'

let activeBank = 0;
let mfContainer;
let controller;
let mode = 'performance';
let shiftMessage = { channel: 4, cc: 10 };
let shiftActive = false;

export const initLayout = (container = mfContainer, data) => {
    mfContainer = container;
    controller = data;
    createLayout();
    addListeners();
    setControllerListeners(true, true);
}

export const actionReceivedMessage = (message) => {
    mfContainer.querySelector('.message').innerHTML = JSON.stringify(message);
    if (message.channel === 4) {
        if (message.cc < 4) {
            console.log('Changing bank from midi: ', message.cc, activeBank)
            if (message.cc < activeBank) {
                changeBankLayout.bind(-1, message)();
            } else {
                changeBankLayout.bind(1, message)();
            }

        } else {
            highlightActiveButton('.side', message);
        }
    } else {
        highlightActiveButton('.encoders', message);
    }
}

function addListeners() {
    mfContainer.querySelector('.test').addEventListener('click', () => {
        sendMidiMessageToDevice();
    });
    mfContainer.querySelector('.colour').addEventListener('click', () => {
        sendMessageToMidiFighter([177, 0, 11]);
    });
    mfContainer.querySelector('.refresh').addEventListener('click', () => {
        location.reload();
    });
    mfContainer.querySelector('.info').addEventListener('click', () => {
        mfContainer.querySelector('.message').classList.toggle('active');
    });
    mfContainer.querySelector('#update').addEventListener('click', saveValues);
    mfContainer.querySelector('#cancel').addEventListener('click', setPerformanceMode);
    mfContainer.querySelector('#edit').addEventListener('click', setEditMode);
    mfContainer.querySelector('#open').addEventListener('click', openFile);
    mfContainer.querySelector('.animation-type').addEventListener('change', createAnimationValueOptions.bind(undefined, mfContainer));
    mfContainer.querySelector('.animation-value').addEventListener('change', setAnimationValueOptions);
}

function reset() {
    mfContainer.querySelector('.title').innerHTML = "";
    mfContainer.querySelector('.encoders').innerHTML = "";
    mfContainer.querySelector('.left').innerHTML = "";
    mfContainer.querySelector('.right').innerHTML = "";
}

function createLayout() {
    reset();
    const channel = activeBank * 16;
    const template = mode === 'performance' ? tmplEncoder : tmplEncoderInput;;

    const title = document.createElement(mode === 'performance' ? 'div' : 'input');
    mfContainer.querySelector('.title').appendChild(title);

    const encoders = mfContainer.querySelector('.encoders');
    for (let i = 0; i < 16; i++) {
        let encoderNode = template.content.cloneNode(true);
        encoderNode.querySelector('.button-container').classList.add(`cc${channel + i}`);
        encoders.appendChild(encoderNode);
    }

    createSideButtons();
    populateValuesInLayout(mode === 'edit');
}

function createSideButtons() {
    const channel = 8;
    const template = mode === 'performance' ? tmplSide : tmplSideInput;

    const leftSide = mfContainer.querySelector('.side.left');
    const rightSide = mfContainer.querySelector('.side.right');
    for (let i = 0; i < 6; i++) {
        let sideNode = template.content.cloneNode(true);

        if (i < 3) {
            if ((channel + i) % 3 === 0) {
                sideNode.querySelector('div:first-child').classList.add(`cc${activeBank}`, "prev");
            } else {
                sideNode.querySelector('div:first-child').classList.add(`cc${channel + i}`);
            }
            leftSide.appendChild(sideNode);
        } else {
            if ((channel + i) % 3 === 0) {
                sideNode.querySelector('div:first-child').classList.add(`cc${activeBank + 1}`, "next");
            } else {
                sideNode.querySelector('div:first-child').classList.add(`cc${channel + i}`);
            }
            rightSide.appendChild(sideNode);
        }
    }
}

function changeBankLayout(message) {
    console.log('Changing bank: ', message);
    if (message.velocity == null || message.velocity === 127) {
        if (mode === 'edit') {
            storeValues();
        }
        console.log('Changing bank: ', activeBank, this);
        activeBank += this;
        changeBank(activeBank);
        mfContainer.querySelector('.encoders').innerHTML = "";
        mfContainer.querySelectorAll('.side').forEach(side => side.innerHTML = "");
        createLayout();
        setControllerListeners(activeBank !== 0, activeBank !== 3);
        populateValuesInLayout();
    }
}

function highlightActiveButton(buttonType, message) {
    if (message.channel === shiftMessage.channel && message.cc === shiftMessage.cc) {
        if (mode === 'edit') {
            storeValues();
        }

        checkShift(message);
        populateValuesInLayout();
    }
    if (buttonType === '.side' || message.actionType === 'CC switch') {
        console.log('removing active class: ', message.cc)
        if (message.velocity === 127) {
            mfContainer.querySelector(`${buttonType} .cc${message.cc} .button`).classList.add("active");
        } else {
            console.log('removing active class: ', message.cc)
            mfContainer.querySelector(`${buttonType} .cc${message.cc} .button`).classList.remove("active");
        }
    } else {
        // mfContainer.querySelector(`${buttonType} .cc${message.cc} .button`).classList.remove("active");
        // setTimeout(() => {
        //     mfContainer.querySelector(`${buttonType} .cc${message.cc} .button`).classList.add("active");
        // }, 10);
    }
}

function setControllerListeners(prev, next) {
    prev && mfContainer.querySelector('.prev').addEventListener('click', changeBankLayout.bind(-1));
    next && mfContainer.querySelector('.next').addEventListener('click', changeBankLayout.bind(1));
}

function setPerformanceMode() {
    mfContainer.querySelector('.edit-mode').classList.remove('active');
    mfContainer.querySelector('.performance-mode').classList.add('active');
    mode = 'performance';
    createLayout();
    setControllerListeners(activeBank !== 0, activeBank !== 3);
}

function setEditMode() {
    mfContainer.querySelector('.edit-mode').classList.add('active');
    mfContainer.querySelector('.performance-mode').classList.remove('active');
    mode = 'edit';
    createLayout();
    createAnimationValueOptions(mfContainer, {target: {value: 0}});
    setControllerListeners(activeBank !== 0, activeBank !== 3);
}

function populateValuesInLayout(isEdit = false) {
    const textType = isEdit ? 'value' : 'innerHTML';
    let actionType = shiftActive ? 'shiftActions' : 'actions';
    console.log('Populating values: ', actionType);

    mfContainer.querySelector('.title :first-child')[textType] = controller.title;
    mfContainer.querySelector('.page').innerHTML = activeBank + 1;

    if (controller[actionType][activeBank]) {
        const encoders = mfContainer.querySelector('.encoders');
        const sideEl = {
            leftSide: mfContainer.querySelectorAll('.side')[0],
            rightSide: mfContainer.querySelectorAll('.side')[1]
        }

        controller[actionType][activeBank].encoder?.forEach(encoder => {
            const { cc, knob, rotary, rotarySwitch } = encoder;
            encoders.querySelector(`.button-container.cc${cc} .switch-encoder`)[textType] = knob;
            encoders.querySelector(`.button-container.cc${cc} .rotary-encoder`)[textType] = rotary;
            encoders.querySelector(`.button-container.cc${cc} .shift-encoder`)[textType] = rotarySwitch;
        })

        const sides = ['leftSide', 'rightSide'];

        sides.forEach(side => {
            controller[actionType][activeBank][side]?.forEach(sideButton => {
                const { cc, action } = sideButton;
                sideEl[side].querySelector(`.cc${cc} div:first-child *`)[textType] = action;
            })
        })
    }
}
