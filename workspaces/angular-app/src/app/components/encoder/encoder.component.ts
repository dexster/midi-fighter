import { CommonModule, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { EncoderAction } from 'shared-lib/models/controller';
import { MidiEvent, Mode } from 'src/app/models/controller';
import { AnimationService } from 'src/app/services/animation';
import { MidiService } from 'src/app/services/midi';

@Component({
  selector: 'app-encoder',
  standalone: true,
  imports: [CommonModule, FormsModule, JsonPipe],
  templateUrl: './encoder.component.html',
  styleUrl: './encoder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EncoderComponent {

  mode = input<Mode>();
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

  selected = false;

  midiService = inject(MidiService);
  animationService = inject(AnimationService);

  dashArray = signal('30 210');

  constructor() {
    this.midiService.message$.pipe(
      filter((message): message is MidiEvent => !!message))
      .subscribe(message => {
        if (message.channel !== 4 && message.cc === +this.encoder()!.cc) {
          this.showLighting(message);
        }
      });

    effect(() => {
      if (this.mode() === 'performance') {
        this.selected = false;
      } 
    });

    // if (this.encoder()!.animation !== 0) {
    //   this.saved.set(true);
    // }
  }

  setState() {
    // first set selected if encoder is in selectedEncoders
    // if not selected then check if encoder.isShift is true and set selected to true
    // shift and normal radio buttons can be removed. Either the encoder is selected or it is not when we save
    this.selected = this.selectedEncoders().some(encoder => encoder.position === this.position());
  }

  ngOnInit() {
    this.setState();
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
    console.log('setSelected: ', this.encoder()!.cc, this.selectedEncoders().map(encoder => encoder.cc));
    if (this.selected) {
      // selectedencoders must keep the list of clicked unselected encoders as well so we can set them to normal
      // just set the isShift to false
      this.selectedEncoders.set(this.selectedEncoders().filter(encoder => encoder !== this.encoder()!));
    } else {
      this.selectedEncoders.set([...this.selectedEncoders(), this.encoder()!]);
    }
    this.selected = !this.selected;
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
