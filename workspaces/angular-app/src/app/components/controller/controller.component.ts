import { CommonModule, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, NgZone, Signal, computed, inject, model, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { ControllerData, EncoderAction } from 'shared-lib/models/controller';
import { MidiEvent, Mode } from '../../models/controller';
import { ControllerConfigService } from '../../services/controller-config.service';
import { MidiService } from '../../services/midi';
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
  // shiftButtons: number[] = [];
  shiftActive = model(false);
  actionType = computed(() => this.shiftActive() ? 'shiftBank' : 'bank');
  showMessage = false;
  rgbActive = model(false);
  indicatorActive = model(false);
  animationType = 0;
  message: Signal<MidiEvent | null | undefined>;
  selectedEncoders = signal([]);
  selectedButtons  = signal([]);

  midiService = inject(MidiService);
  controllerConfigService = inject(ControllerConfigService);
  ngZone = inject(NgZone);

  constructor() {
    this.message = toSignal(this.midiService.message$)
    this.midiService.message$.pipe(
      filter((message): message is MidiEvent => !!message))
      .subscribe((message) => {
        this.actionReceivedMessage(message);
      });
  }

  async ngOnInit() {
    let data = await window.api.readData();
    console.log('ngOnInit data:', data);
    if (!data) {
      console.log('no data found, creating template');
      data = this.createTemplate();
      window.api.writeData(data);
    }
    this.ngZone.run(async () => {
      this.controllerConfigService.setConfig(data);
    });
  }

  getCcValue(element: HTMLElement): number {
    return parseInt(Array.from(element.classList)?.find(className => className.includes('cc'))!.slice(2));
  }

  actionReceivedMessage(message: MidiEvent) {
    if (message.channel === 4 && message.cc < 4) {
      this.activeBank.set(message.cc);
    } else {
      this.midiService.sendMidiOutMessage(message, this.controllerConfigService.ccConfig.get(message.cc)!);
    }
    this.checkIfShiftMessage(message);
  }

  checkIfShiftMessage(message: MidiEvent) {
    if (message.actionType === 'CC switch' && this.controllerConfigService.shiftButtons.includes(message.cc)) {
      if (message.velocity === 127) {
        this.shiftActive.set(true);
        const animationCcs = this.controllerConfigService.controllerData()?.bank[this.activeBank()].encoder.filter((encoder): encoder is Required<EncoderAction> => encoder.animation != null).map(encoder => ({ animation: encoder.animation, cc: encoder.cc }));
        this.midiService.setAnimation(animationCcs!);
      } else {
        this.shiftActive.set(false);
        const animationCcs = this.controllerConfigService.controllerData()?.bank[this.activeBank()].encoder.filter((encoder): encoder is Required<EncoderAction> => encoder.animation != null).map(encoder => ({ animation: 0, cc: encoder.cc }));
        this.midiService.setAnimation(animationCcs!);
      }
    }
  }

  private createTemplate(): ControllerData {
    const banks = 4
    const encoderCcs = 16;
    const sideCcs = 3;
    const sideStartingCc = 8;
    return {
      title: '',
      bank: Array.from({ length: banks }, (_, bank) => ({
        leftSide: Array.from({ length: sideCcs }, (_, cc) => ({ position: cc, cc: cc + sideStartingCc })),
        rightSide: Array.from({ length: sideCcs }, (_, cc) => ({ position: cc, cc: cc + sideStartingCc + 3 })),
        encoder: Array.from({ length: encoderCcs }, (_, cc) => ({ min: 0, max: 127, position: cc, cc: cc + (bank * 16), encoderType: 'CC', animation: -1}))
      })),
      shiftBank: Array.from({ length: banks }, (_, bank) => ({
        leftSide: Array.from({ length: sideCcs }, (_, cc) => ({ position: cc, cc: cc + sideStartingCc })),
        rightSide: Array.from({ length: sideCcs }, (_, cc) => ({ position: cc, cc: cc + sideStartingCc + 3 })),
        encoder: Array.from({ length: encoderCcs }, (_, cc) => ({ min: 0, max: 127, position: cc, cc: cc + (bank * 16), encoderType: 'CC', animation: -1}))
      }))
    };
  }
}