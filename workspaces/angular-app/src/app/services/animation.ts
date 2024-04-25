import { Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class AnimationService {

    selectedValue = -1;

    animationTypes = [
        {
            name: 'Off',
            range: [0, 0]
        },
        {
            name: 'RGB Strobe',
            range: [1, 8]
        },
        {
            name: 'RGB Pulse',
            range: [9, 16]
        },
        {
            name: 'RGB Brightness',
            range: [17, 47]
        },
        {
            name: 'RGB Rainbow',
            range: [127, 127]
        },
        {
            name: 'Indicator Strobe',
            range: [49, 56]
        },
        {
            name: 'Indicator Pulse',
            range: [57, 64]
        },
        {
            name: 'Indicator Brightness',
            range: [65, 95]
        }
    ]

    range(start: number, stop: number): number[] {
        return Array.from({ length: stop - start + 1 }, (_, i) => start + i)
    }

    getAnimationType(value: number) {
        return this.animationTypes.find(animation => this.range(animation.range[0], animation.range[1]).includes(value))?.name;
    }

    setSelecteValue(value: number) {
        this.selectedValue = value;
    }
}