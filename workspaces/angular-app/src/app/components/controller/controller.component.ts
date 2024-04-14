import { CommonModule, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Signal, WritableSignal, computed, inject, model, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { ControllerData, EncoderAction, ButtonAction } from 'shared-lib/models/controller';
import { MidiDevice, MidiService } from 'src/app/services/midi';
import { MidiEvent, Mode } from '../../models/controller';
import { EncoderComponent } from '../encoder/encoder.component';
import { SettingsComponent } from "../settings/settings.component";
import { SideComponent } from "../side/side.component";

@Component({
  selector: 'app-controller',
  standalone: true,
  templateUrl: './controller.component.html',
  styleUrl: './controller.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, JsonPipe, FormsModule, SideComponent, SettingsComponent, EncoderComponent]
})
export class ControllerComponent {

  activeBank = model(0);
  mode = model<Mode>('performance');
  shiftButtons: number[] = [];
  shiftActive = model(false);
  actionType = computed(() => this.shiftActive() ? 'shiftBank' : 'bank');
  controllerData: WritableSignal<ControllerData | undefined> = signal(undefined);;
  showMessage = false;
  rgbActive = model(false);
  indicatorActive = model(false);
  animationType = 0;
  message: Signal<MidiEvent | null | undefined>;
  selectedEncoders: WritableSignal<EncoderAction[]> = signal([]);
  selectedButtons: WritableSignal<ButtonAction[]> = signal([]);

  ccConfig: Map<number, EncoderAction>  = new Map();

  midiService = inject(MidiService);

  constructor() {
    this.message = toSignal(this.midiService.message$)
    this.midiService.message$.pipe(
      filter((message): message is MidiEvent => !!message))
      .subscribe((message) => {
        this.actionReceivedMessage(message);
      });
  }

  async ngOnInit() {
    const data = await window.api.readData()
    if (!data) {
      this.createTemplate();
    }

    this.controllerData.set(data);
    this.createPerformantMap();
    this.storeShiftButtons();
    console.log('data: ', this.controllerData());
  }

  private createPerformantMap() {
    for (let i = 0; i < 4; i++) {
      this.controllerData()?.bank[i].encoder.forEach(encoder => {
        this.ccConfig.set(encoder.cc, encoder);
      })
    }
  }

  getCcValue(element: HTMLElement): number {
    return parseInt(Array.from(element.classList)?.find(className => className.includes('cc'))!.slice(2));
  }

  actionReceivedMessage(message: MidiEvent) {
    if (message.channel === 4 && message.cc < 4) {
      this.activeBank.set(message.cc);
    } else {
      this.midiService.sendMidiOutMessage(message, this.ccConfig.get(message.cc)!);
    }
    this.checkIfShiftMessage(message);
  }

  checkIfShiftMessage(message: MidiEvent) {
    if (message.actionType === 'CC switch' && this.shiftButtons.includes(message.cc)) {
      if (message.velocity === 127) {
        this.shiftActive.set(true);
        const animationCcs = this.controllerData()?.bank[this.activeBank()].encoder.filter((encoder): encoder is Required<EncoderAction> => encoder.animation != null).map(encoder => ({ animation: encoder.animation, cc: encoder.cc }));
        this.midiService.setAnimation(animationCcs!);
      } else {
        this.shiftActive.set(false);
        const animationCcs = this.controllerData()?.bank[this.activeBank()].encoder.filter((encoder): encoder is Required<EncoderAction> => encoder.animation != null).map(encoder => ({ animation: 0, cc: encoder.cc }));
        this.midiService.setAnimation(animationCcs!);
      }
    }
  }

  private createTemplate() {
    const banks = 4
    const encoderCcs = 16;
    const sideCcs = 3;
    const sideStartingCc = 8;
    const template: ControllerData = {
      title: '',
      bank: Array.from({ length: banks }, (_, bank) => ({
        leftSide: Array.from({ length: sideCcs }, (_, cc) => ({ position: cc, cc: cc + sideStartingCc })),
        rightSide: Array.from({ length: sideCcs }, (_, cc) => ({ position: cc, cc: cc + sideStartingCc + 3 })),
        encoder: Array.from({ length: encoderCcs }, (_, cc) => ({ min: 0, max: 127, position: cc, cc: cc + (bank * 16) }))
      })),
      shiftBank: Array.from({ length: banks }, (_, bank) => ({
        leftSide: Array.from({ length: sideCcs }, (_, cc) => ({ position: cc, cc: cc + sideStartingCc })),
        rightSide: Array.from({ length: sideCcs }, (_, cc) => ({ position: cc, cc: cc + sideStartingCc + 3 })),
        encoder: Array.from({ length: encoderCcs }, (_, cc) => ({ min: 0, max: 127, position: cc, cc: cc + (bank * 16) }))
      }))
    };

    console.log('template: ', template);
  }

  private storeShiftButtons() {
    this.controllerData()?.bank.forEach((bank) => {
      this.shiftButtons = this.shiftButtons.concat(bank.encoder.filter(encoder => encoder.isShift).map(encoder => +encoder.cc));
      (['leftSide', 'rightSide'] as const).forEach(side =>
        this.shiftButtons = this.shiftButtons.concat(bank[side].filter(button => button.isShift).map(button => +button.cc)));
    });
    this.shiftButtons = [...new Set(this.shiftButtons)];
    console.log('shiftButtons: ', this.shiftButtons);
  }
}