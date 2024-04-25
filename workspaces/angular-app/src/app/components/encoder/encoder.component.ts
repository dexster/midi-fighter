import { CommonModule, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Signal, computed, effect, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { EncoderAction, EncoderType } from 'shared-lib/models/controller';
import { MidiEvent, Mode } from 'src/app/models/controller';
import { AnimationService } from 'src/app/services/animation';
import { MidiService } from 'src/app/services/midi';
import { StateService } from 'src/app/services/state';

@Component({
  selector: 'app-encoder',
  standalone: true,
  imports: [CommonModule, FormsModule, JsonPipe],
  templateUrl: './encoder.component.html',
  styleUrl: './encoder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EncoderComponent {

  mode = input.required<Mode>();
  encoder = input.required<EncoderAction>();
  rgbActive = input<boolean>();
  indicatorActive = input<boolean>();
  activeBank = input<number>(0);
  index = input<number>(0);
  position = computed(() => this.index() + (this.activeBank()! * 16));

  selectedEncoders = model<EncoderAction[]>([]);

  switchActive = signal(false);
  endlessActive = signal(false);
  anmation = signal(0);

  midiService = inject(MidiService);
  animationService = inject(AnimationService);
  stateService = inject(StateService);

  dashArray = signal('30 210');

  selected$: Signal<boolean> = signal<boolean>(false);

  constructor() {
    this.midiService.message$.pipe(
      filter((message): message is MidiEvent => !!message))
      .subscribe(message => {
        if (message.channel !== 4 && message.cc === +this.encoder()!.cc) {
          this.showLighting(message);
        }
      });

    this.selected$ = computed(() => {
      if (this.mode() === 'shift') {
        const found = this.selectedEncoders().find(encoder => encoder.position === this.position());
        if (found) {
          return !!found.isShift;
        }
        return !!found;
      }
      return false;
    })
  }

  setState() {
    const found = this.selectedEncoders().find(encoder => encoder.position === this.position());
    if (found) {
      return !!found.isShift;
    }
    return !!found;
  }

  timeoutId: any;

  showLighting(message: MidiEvent) {
    if (this.mode() === 'performance') {
      switch (message.actionType) {
        case 'CC switch':
          this.switchActive.set(message.velocity > 0 && this.mode() === 'performance');
          break;
        case 'CC rotary':
          if (this.mode() === 'performance') {
            if (this.encoder()!.encoderType === 'CC') {
              let highlightedLEDs = Math.ceil(message.velocity / (127 / 11));
              let dashArray = '30';
              for (let i = 1; i <= highlightedLEDs; i++) {
                dashArray += ` 16.9 0`;
              }
              dashArray += ' 210';
              this.dashArray.set(dashArray);
            }
            else {
              clearTimeout(this.timeoutId);
              this.endlessActive.set(true);
              this.dashArray.set(message.velocity === 63
                ? '30 84 0 16.9 0 120'
                : '30 101 0 16.9 0 100');
            }
            this.timeoutId = setTimeout(() => {
              this.endlessActive.set(false);
            }, 100);

            break;
          }
      }
    }
  }

  setSelected() {
    if (['shift', 'switchType', 'lighting'].includes(this.mode())) {
      if (this.mode() === 'shift') {
        this.encoder()!.isShift = !this.selected$();
        const selectedEncs = this.selectedEncoders().filter(encoder => encoder.position !== this.encoder().position);
        if (!this.selected$()) {
          this.selectedEncoders.set([...selectedEncs, this.encoder()!]);
        } else {
          this.selectedEncoders.set(selectedEncs);
        }
      } else if (this.mode() === 'switchType') {
        this.encoder()!.encoderType = this.stateService.selectedValue() as EncoderType;
      } else if (this.mode() === 'lighting') {
        this.encoder()!.animation = +this.stateService.selectedValue();
      }
    }
  }
  // modeChanged() {
  //   const savedEncoders = this.controllerData()![this.actionType()][this.activeBank()!].encoder
  //     .filter(encoder => encoder.animation === +this.animationValue)
  //     .map(encoder => {
  //       const container = this.mfContainer.nativeElement.querySelector(`.button-container.cc${encoder.cc}`)
  //       container.classList.add('saved');
  //       return container;
  //     });

  //   console.log('savedEncoders: ', savedEncoders)
  // }
}
