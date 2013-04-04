/*!
 * @depends ../core/AudioletGroup.js
 */

/**
 * A MIDIVoice is an AudioletGroup which generates tones
 * on it's output by default. MIDIVoices are typically managed by MIDIInstruments.
 */
var MIDIVoice = AudioletGroup.extend({

  /*
   * Constructor
   *
   * @param {Audiolet} audiolet The audiolet object.
   * @param {Number} number A MIDI note number to be mapped to a note.
   * @param {Number} velocity A MIDI velocity, representing gain output level.
   */
  constructor: function(audiolet, number, velocity) {
    AudioletGroup.apply(this, [audiolet, 0, 1]);
    this.key = MIDINotes[number];
    this.source = new Sine(audiolet, teoria.note(this.key).fq());
    this.gain = new Gain(audiolet, (1 / 127) * velocity);

    this.source.connect(this.gain);
    this.gain.connect(this.outputs[0]);
  }

});