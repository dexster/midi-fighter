import { Injectable, signal } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class StateService {

    selectedValue = signal<number | string>(-1);
}