import { Envelope } from './Envelope';

/**
 * Simple attack-release envelope
 *
 * **Inputs**
 *
 * - Gate
 *
 * **Outputs**
 *
 * - Envelope
 *
 * **Parameters**
 *
 * - gate The gate controlling the envelope.  Value changes from 0 -> 1
 * trigger the envelope.  Linked to input 0.
 */
class PercussiveEnvelope extends Envelope {

  /*
   * @constructor
   * @extends Envelope
   * @param {Audiolet} audiolet The audiolet object.
   * @param {Number} gate The initial gate value.
   * @param {Number} attack The attack time in seconds.
   * @param {Number} release The release time in seconds.
   * @param {Function} [onComplete] A function called after the release stage.
   */
  constructor(audiolet, gate, attack, release, onComplete) {
    var levels = [0, 1, 0];
    var times = [attack, release];
    super(audiolet, gate, levels, times, null, onComplete);

    this.attack = this.times[0];
    this.release = this.times[1];
  }

  /**
   * toString
   *
   * @return {String} String representation.
   */
  toString() {
    return 'Percussive Envelope';
  }

}

export default { PercussiveEnvelope };
