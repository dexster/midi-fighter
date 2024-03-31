import { sendMessageToMidiFighter, sendMidiMessageToDevice, setAnimation } from './midi.mjs'

let activeBank = 0;
let mfContainer;
let controller;
let shiftActive = false;

const animationRanges = [
    [0],
    [1, 8],
    [9, 16],
    [17, 47],
    [127, 127],
    [49, 56],
    [57, 64],
    [65, 95]
]

export const createAnimationValueOptions = (mfContainer, event) => {
    const animationType = +event.target.value;
    console.log(animationType);
    const animationSelect = mfContainer.querySelector('.animation-value');
    animationSelect.innerHTML = "";
    animationSelect.style.display = (!animationType) ? 'none' : 'inline';
    const animationRange = animationRanges[animationType];
    for (let i = animationRange[0]; i <= animationRange[1]; i++) {
        const animationOption = document.createElement('option');
        animationOption.innerHTML = i;
        animationSelect.appendChild(animationOption);
    }
    showLighting(animationType, mfContainer);
    // setAnimationValueOptions({ target: { value: animationRange[0] } });
}

function showLighting(animationType, mfContainer) {
    if (animationType > 0 && animationType < 5) {
        mfContainer.querySelector('.rgb').classList.add('active');
        mfContainer.querySelector('.indicator').classList.remove('active');
    } else if (animationType > 4 && animationType < 8) {
        mfContainer.querySelector('.rgb').classList.remove('active');
        mfContainer.querySelector('.indicator').classList.add('active');
    } else {
        mfContainer.querySelector('.rgb').classList.remove('active');
        mfContainer.querySelector('.indicator').classList.remove('active');
    }
}

export const setAnimationValueOptions = (event) => {
    sendMessageToMidiFighter([177, 0, event.target.value]);
}

export const checkShift = (message) => {
    shiftActive = message.velocity === 127;
    if (shiftActive) {
        setAnimation(11, controller.actions[activeBank].encoder.map(encoder => encoder.cc));
    } else {
        setAnimation(0, controller.actions[activeBank].encoder.map(encoder => encoder.cc));
    }
}

export const storeValues = () => {
    controller.title = mfContainer.querySelector('.title input').value;
    const buttonContainers = mfContainer.querySelectorAll(".button-container");
    const buttonActions = [];
    buttonContainers.forEach(buttonContainer => {
        const cc = buttonContainer.classList[1].slice(2);
        const knob = buttonContainer.querySelector(".switch-encoder").value;
        const rotary = buttonContainer.querySelector(".rotary-encoder").value;
        const rotarySwitch = buttonContainer.querySelector(".shift-encoder").value;
        buttonActions.push({ cc, knob, rotary, rotarySwitch });
    });
    let actionType = shiftActive ? 'shiftActions' : 'actions';
    controller[actionType][activeBank].encoder = buttonActions;

    const leftSide = mfContainer.querySelectorAll('.side.left > div');
    const leftSideActions = [];
    leftSide.forEach(button => {
        const cc = button.classList[0].slice(2);
        const action = button.querySelector("input").value;
        leftSideActions.push({ cc, action });
    })
    controller.actions[activeBank].leftSide = leftSideActions;

    const rightSide = mfContainer.querySelectorAll('.side.right > div');
    const rightSideActions = [];
    rightSide.forEach(button => {
        const cc = button.classList[0].slice(2);
        const action = button.querySelector("input").value;
        rightSideActions.push({ cc, action });
    })
    controller.actions[activeBank].rightSide = rightSideActions;
}

export const openFile = async () => {
    const filePath = await window.electronAPI.openFile('midi-actions.json');
    const data = await window.electronAPI.readData(filePath);
    initLayout(mfContainer, data);
    setPerformanceMode();
}

export const saveValues = async () => {
    storeValues();
    const filePath = await window.electronAPI.saveFile('midi-actions.json')
    const json = JSON.stringify(controller);
    if (filePath) {
        window.electronAPI.writeData(json, filePath);
        setPerformanceMode();
    }
}
