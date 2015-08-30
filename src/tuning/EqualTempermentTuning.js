import { Tuning } from './Tuning';

/**
 * Equal temperament tuning.
 */
class EqualTemperamentTuning extends Tuning {

  /*
   * @constructor
   * @extends Tuning
   * @param {Number} pitchesPerOctave The number of notes in each octave.
   */
  constructor(pitchesPerOctave) {
    var semitones = [];
    for (var i = 0; i < pitchesPerOctave; i++) {
      semitones.push(i);
    }
    super(semitones, 2);
  }

}

export default { EqualTemperamentTuning };
