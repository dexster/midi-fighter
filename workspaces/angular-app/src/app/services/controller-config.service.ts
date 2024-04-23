import { Injectable, model, signal } from "@angular/core";
import { ControllerData, EncoderAction } from "shared-lib/models/controller";

@Injectable({
    providedIn: 'root'
})
export class ControllerConfigService {

    controllerData = signal<ControllerData>({} as ControllerData);
    ccConfig: Map<number, EncoderAction> = new Map();
    shiftButtons: number[] = [];

    setConfig(data: ControllerData) {
        this.controllerData.set(data);
        console.log('setConfig data: ', this.controllerData());
        this.createPerformantMap();
        this.storeShiftButtons();
    }

    createPerformantMap() {
        for (let i = 0; i < 4; i++) {
            this.controllerData()?.bank[i].encoder.forEach(encoder => {
                this.ccConfig.set(encoder.cc, encoder);
            })
        }
    }

    storeShiftButtons() {
        this.controllerData()?.bank.forEach((bank) => {
            this.shiftButtons = this.shiftButtons.concat(bank.encoder.filter(encoder => encoder.isShift).map(encoder => +encoder.cc));
            (['leftSide', 'rightSide'] as const).forEach(side =>
                this.shiftButtons = this.shiftButtons.concat(bank[side].filter(button => button.isShift).map(button => +button.cc)));
        });
        this.shiftButtons = [...new Set(this.shiftButtons)];
        // console.log('shiftButtons: ', this.shiftButtons);
    }
}