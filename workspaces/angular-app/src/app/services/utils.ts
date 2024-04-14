import { Injectable } from "@angular/core";
import { MidiEvent } from "../models/controller";
import { ControllerData } from "shared-lib/models/controller";

@Injectable({
    providedIn: 'root'
})
export class UtilsService {

    // check if the cc pressed is has the isShift property in the json file
    isShift(midiEvent: MidiEvent, data: ControllerData, actionType: string, activeBank: number) {
        const items = ['encoder', 'leftSide', 'rightSide'] as const;
        items.forEach(item => {
            data.bank[activeBank][item].forEach(button => {
                return button.cc === midiEvent.cc && button.isShift;
            });
        });
    } 
}