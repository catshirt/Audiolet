/**
 *  Representation of a generic musical tuning.  Can be subclassed to produce
 * specific tunings.
 */
 class Tuning {

  /*
   * @constructor
   * @param {Number[]} semitones Array of semitone values for the tuning.
   * @param {Number} [octaveRatio=2] Frequency ratio for notes an octave apart.
   */
  constructor(semitones, octaveRatio) {
    this.semitones = semitones;
    this.octaveRatio = octaveRatio || 2;
    this.ratios = [];
    var tuningLength = this.semitones.length;
    for (var i = 0; i < tuningLength; i++) {
      this.ratios.push(Math.pow(2, this.semitones[i] / tuningLength));
    }
  }

}

export default { Tuning };
