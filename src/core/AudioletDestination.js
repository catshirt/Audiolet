import { AudioletGroup } from './AudioletGroup';
import { AudioletDevice } from './AudioletDevice';
import { Scheduler } from './Scheduler';
import { UpMixer } from '../dsp';

/**
 * Group containing all of the components for the Audiolet output chain.  The
 * chain consists of:
 *
 *     Input => Scheduler => UpMixer => Output
 *
 * **Inputs**
 *
 * - Audio
 */
class AudioletDestination extends AudioletGroup {

  /*
   * @constructor
   * @extends AudioletGroup
   * @param {Audiolet} audiolet The audiolet object.
   * @param {Number} [sampleRate=44100] The sample rate to run at.
   * @param {Number} [numberOfChannels=2] The number of output channels.
   * @param {Number} [bufferSize=8192] A fixed buffer size to use.
   */
  constructor(audiolet, sampleRate, numberOfChannels, bufferSize) {
    super(audiolet, 1, 0);

    this.device = new AudioletDevice(audiolet, sampleRate, numberOfChannels,
                                     bufferSize);
    audiolet.device = this.device; // Shortcut
    this.scheduler = new Scheduler(audiolet);
    audiolet.scheduler = this.scheduler; // Shortcut

    this.upMixer = new UpMixer(audiolet, this.device.numberOfChannels);

    this.inputs[0].connect(this.scheduler);
    this.scheduler.connect(this.upMixer);
    this.upMixer.connect(this.device);
  }

  /**
   * toString
   *
   * @return {String} String representation.
   */
  toString() {
    return 'Destination';
  }

}

export default { AudioletDestination };
