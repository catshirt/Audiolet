/*!
 * @depends ../core/AudioletGroup.js
 */

var MidiVoice = AudioletGroup.extend({

  constructor: function(audiolet, number, velocity) {
    AudioletGroup.apply(this, [audiolet, 0, 1]);
    this.key = MidiNotes[number];
    this.source = new Sine(audiolet, teoria.note(this.key).fq());
    this.gain = new Gain(audiolet, (1 / 127) * velocity);

    this.source.connect(this.gain);
    this.gain.connect(this.outputs[0]);
  }

});