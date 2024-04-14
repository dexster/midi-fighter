import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EncoderAction } from 'shared-lib/models/controller';
import { EncoderComponent } from '../encoder/encoder.component';

@Component({
  selector: 'app-encoder-container',
  standalone: true,
  imports: [CommonModule, FormsModule, EncoderComponent],
  templateUrl: './encoder-container.component.html',
  styleUrl: './encoder-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EncoderContainerComponent {

  activeBank = input<number>(0);
  mode = input<'performance' | 'edit' | 'lighting'>();
  encoder = model<EncoderAction>();
  rgbActive = model<boolean>();
  indicatorActive = model<boolean>();
  selected = model<boolean>();
  selectedEncoders = model<number[]>([]);

  setSelected() {
    if (this.selected()) {
      this.selectedEncoders.set(this.selectedEncoders().filter(encoder => encoder !== this.encoder()!.cc));
    } else {
      this.selectedEncoders.set([...this.selectedEncoders(), this.encoder()!.cc]);
    }
    this.selected.set(!this.selected());
  }
}
