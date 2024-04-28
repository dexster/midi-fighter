import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, NgZone, effect, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonAction, ControllerData, EncoderAction, EncoderType, MessageResponse } from 'shared-lib/models/controller';
import { Mode, Side } from 'src/app/models/controller';
import { AnimationService } from 'src/app/services/animation';
import { ControllerConfigService } from 'src/app/services/controller-config.service';
import { MidiService } from 'src/app/services/midi';
import { StateService } from 'src/app/services/state';

export enum ConfirmOption {
  'Continue editing',
  'Save changes',
  'Discard changes'
}

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
  activeBank = input.required<number>();
  controllerDataOriginal: ControllerData;
  showMessage = signal(false);
  animationType = 0;
  encoderType: EncoderType = 'CC';
  rgbActive = model<boolean>();
  indicatorActive = model<boolean>();
  showMessageInfo = signal<boolean>(false);
  selectedEncoders = input<EncoderAction[]>([]);
  isShift = false;

  midiService = inject(MidiService);
  animationService = inject(AnimationService);
  controllerConfigService = inject(ControllerConfigService);
  stateService = inject(StateService);
  ngZone = inject(NgZone);

  constructor() {
    window.api.onFile(fileAction => {
      console.log('fileAction:', fileAction);
      this.ngZone.run(() => {
        switch (fileAction) {
          case ('open'):
            this.openFile();
            break;
          case ('save'):
            this.saveFile(true);
            break;
          case ('save-as'):
            this.saveFile(false);
            break;
        }
      });
    });

    window.api.onEdit(editAction => {
      console.log('editAction:', editAction);
      this.ngZone.run(() => {
        switch (editAction) {
          case ('label'):
            this.mode.set('edit');
            break;
          case ('led'):
            this.mode.set('lighting');
            break;
          case ('switch-type'):
            this.mode.set('switchType');
            break;
          case ('shift'):
            this.mode.set('shift');
            break;
          case ('midi'):
            this.mode.set('midi');
            break;
          case ('cancel'):
            this.cancelEdit();
            break;
        }
        if (editAction !== 'cancel') { window.api.updateMenu('edit') }
      });
    });

    window.api.onTools(toolsAction => {
      console.log('toolsAction:', toolsAction);
      this.ngZone.run(() => {
        switch (toolsAction) {
          case ('refresh'):
            this.refresh();
            break;
          case ('midi-values'):
            this.toggleMessageDisplay();
            window.api.updateMenu(toolsAction);
            break;
        }
      });
    });

    effect(() => {
      if (this.mode() !== 'performance') {
        this.controllerDataOriginal = JSON.parse(JSON.stringify(this.controllerConfigService.controllerData()));
        console.log('controllerDataOriginal:', this.controllerDataOriginal);
        if (this.mode() === 'switchType') {
          this.stateService.selectedValue.set('CC');
        }
      }
    }, { allowSignalWrites: true });
  }

  async openFile() {
    const filePath = await window.api.openFileDialog('midi-actions.json');
    console.log('openFile filePath:', filePath);
    const data = await window.api.readData(filePath);
    console.log('openFile data:', data);
    this.ngZone.run(async () => {
      this.controllerConfigService.setConfig(data);
    });
  }

  async saveFile(overwrite: boolean) {
    if (overwrite) {
      this.saveValues();
    } else {
      const filePath = await window.api.saveFileDialog('midi-actions.json')
      if (filePath) { // only used to check if cancel was clicked
        this.saveValues();
      }
    }
  }

  toggleMessageDisplay() {
    this.showMessage.set(!this.showMessage());
  }

  refresh() {
    this.cancelEdit();
    this.midiService.initMidi();
  }

  async cancelEdit() {
    console.log('cancelEdit');
    if (this.controllerDataOriginal) {
      if (JSON.stringify(this.controllerConfigService.controllerData()) != JSON.stringify(this.controllerDataOriginal)) {
        const messageResponse: MessageResponse = await window.api.showMessageBoxDialog({
          message: 'Unsaved changes will be lost',
          type: 'warning',
          buttons: ['Continue editing', 'Save changes', 'Discard changes'],
          defaultId: 0,
          icon: 'icons/hide-icon.png'
        });
        console.log('messageResponse:', messageResponse);
        if (messageResponse.response !== ConfirmOption['Continue editing']) {
          if (messageResponse.response === ConfirmOption['Save changes']) {
            console.log('saveValues')
            this.saveValues();
          } else if (messageResponse.response === ConfirmOption['Discard changes']) {
            console.log('cancelling')
            this.controllerConfigService.controllerData.set(this.controllerDataOriginal);
          }
          this.mode.set('performance');
          window.api.updateMenu('cancel');
        }
      } else {
        this.mode.set('performance');
        window.api.updateMenu('cancel');
      }
    }
  }

  setAnimationValueOptions(event: Event) {
    this.stateService.selectedValue.set(this.animationService.animationTypes[this.animationType].range[0]);
    this.showLighting();
  }

  showLighting() {
    this.midiService.setAnimation(this.selectedEncoders().map(encoder => ({ animation: +this.stateService.selectedValue(), cc: encoder.cc })));
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

  modifyJsonFormat() {
    for (const bank of (['bank', 'shiftBank'] as const)) {
      for (let i = 0; i < 4; i++) {
        for (const encoder of this.controllerConfigService.controllerData()![bank][i].encoder) {
          encoder.animation = -1;
          // encoder.cc = parseInt(''+encoder.cc);
          // encoder.position = parseInt(''+encoder.cc);
          // encoder.encoderType = 'CC';
          // encoder.min = 0;
          // encoder.max = 127;
        }
      }
    }
  }

  async saveValues() {
    // this.modifyJsonFormat();
    const encoders = this.controllerConfigService.controllerData()!.bank.flatMap(bank => bank.encoder);
    if (this.mode() === 'lighting') {
      for (const encoder of this.selectedEncoders()) {
        encoders.find(enc => enc.position === encoder.position)!.animation = +this.stateService.selectedValue();
      }
    }

    this.controllerDataOriginal = JSON.parse(JSON.stringify(this.controllerConfigService.controllerData()));
    window.api.writeData(this.controllerConfigService.controllerData());
  }
}
