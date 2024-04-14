import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonAction, ControllerData, EncoderAction } from 'shared-lib/models/controller';
import { Mode, Side } from 'src/app/models/controller';
import { AnimationService } from 'src/app/services/animation';
import { MidiDevice, MidiService } from 'src/app/services/midi';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {

  mode = model<Mode>();
  buttons = input<ButtonAction[]>();
  side = input<Side>();
  shiftActive = model<boolean>();
  actionType = computed(() => this.shiftActive() ? 'shiftBank' : 'bank');
  activeBank = input.required<number>();
  controllerData = model<ControllerData>();
  controllerDataOriginal: ControllerData;
  showMessage = signal(false);
  animationType = 0;
  animationValue = 0;
  rgbActive = model<boolean>();
  indicatorActive = model<boolean>();
  showMessageInfo = signal<boolean>(false);
  selectedEncoders = input<EncoderAction[]>([]);
  selectedButtons = input<ButtonAction[]>([]);
  isShift = false;

  midiService = inject(MidiService);
  animationService = inject(AnimationService);

  toggleMessageDisplay() {
    this.showMessage.set(!this.showMessage());
  }

  refresh() {
    location.reload();
  }

  cancelEdit() {
    this.controllerData.set(this.controllerDataOriginal);
    this.mode.set('performance');
  }

  setMode(mode: Mode) {
    this.mode.set(mode);
    // deep clone the controllerdata in edit mode
    if (mode === 'edit') {
      this.controllerDataOriginal = JSON.parse(JSON.stringify(this.controllerData()));
    }
  }

  setAnimationValueOptions(event: Event) {
    this.animationValue = this.animationService.animationTypes[this.animationType].range[0];
    this.showLighting();
  }

  showLighting() {
    this.midiService.setAnimation(this.selectedEncoders().map(encoder => ({ animation: +this.animationValue, cc: encoder.cc })));
    if (this.animationType > 0 && this.animationType < 5) {
      this.rgbActive.set(true);
      this.indicatorActive.set(false);
    } else if (this.animationType > 4 && this.animationType < 8) {
      this.rgbActive.set(false);
      this.indicatorActive.set(true);
    } else {
      this.rgbActive.set(false);
      this.indicatorActive.set(false);
    }
  }

  async openFile() {
    const filePath = await window.api.openFile('midi-actions.json');
    const data = await window.api.readData(filePath);
  }

  modifyJsonFormat() {
    (['bank', 'shiftBank'] as const).forEach(bank => {
      for (let i = 0; i < 4; i++) {
        this.controllerData()![bank][i].encoder.forEach(encoder => {
          // encoder.cc = parseInt(''+encoder.cc);
          // encoder.position = parseInt(''+encoder.cc);
          // encoder.encoderType = 'CC';
          // encoder.min = 0;
          // encoder.max = 127;
        });
      }
    });
  }

  async saveValues() {
    // this.modifyJsonFormat();
    if (this.mode() === 'edit') {
      this.selectedEncoders().forEach(encoder => {
        this.controllerData()!.bank[this.activeBank()].encoder.find(e => e.cc === encoder.cc)!.animation = +this.animationValue;
      });
    }

    if (this.mode() === 'shift') {
      (['leftSide', 'rightSide'] as const).forEach(side => {
        this.selectedButtons().forEach(button => {
          const found = this.controllerData()!.bank[this.activeBank()][side].find(e => e.cc === button.cc);
          if (found) { found.isShift = this.isShift; }
        })
      });
    }

    const filePath = await window.api.saveFile('midi-actions.json')
    const json = JSON.stringify(this.controllerData());
    console.log('this.controllerData(): ', this.controllerData());
    if (filePath) {
      window.api.writeData(json, filePath);
      this.setMode('performance');
      this.shiftActive.set(false);
    }
  }
}
