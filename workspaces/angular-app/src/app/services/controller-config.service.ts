import { Injectable, signal } from "@angular/core";
import { ControllerData, EncoderAction } from "shared-lib/models/controller";

@Injectable({
    providedIn: 'root'
})
export class ControllerConfigService {

    controllerData = signal<ControllerData>({} as ControllerData);
    ccConfig: Map<number, EncoderAction> = new Map();
    shiftButtons: {channel: number, cc: number}[] = [];

    setConfig(data: ControllerData = this.controllerData()) {
        this.controllerData.set(data);
        console.log('setConfig data: ', this.controllerData());
        this.createPerformantMap();
        this.storeShiftButtons();
    }

    createPerformantMap() {
        this.ccConfig.clear();
        for (let i = 0; i < 4; i++) {
            this.controllerData()?.bank[i].encoder.forEach(encoder => {
                this.ccConfig.set(encoder.cc, encoder);
            })
        }
    }

    storeShiftButtons() {
        this.shiftButtons = [];
        this.controllerData()?.bank.forEach((bank) => {
            this.shiftButtons = this.shiftButtons.concat(bank.encoder.filter(encoder => encoder.isShift).map(encoder => ({channel: 2, cc: +encoder.cc})));
            (['leftSide', 'rightSide'] as const).forEach(side =>
                this.shiftButtons = this.shiftButtons.concat(bank[side].filter(button => button.isShift).map(button => ({channel: 4, cc: +button.cc}))));
        });
        this.shiftButtons = [...new Set(this.shiftButtons)];
        // console.log('shiftButtons: ', this.shiftButtons);
    }
}