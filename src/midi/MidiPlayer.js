/*!
 * @depends ../core/AudioletGroup.js
 */

var MidiPlayer = AudioletGroup.extend({

  constructor: function(audiolet, midi) {
    var header = midi.header,
      track_count = header.trackCount;
    AudioletGroup.apply(this, [audiolet, 0, track_count]);
    this.midi = midi;
    this.instruments = [];

    for (var i = 0; i < this.outputs.length; i++) {
      var instrument = new MidiInstrument(audiolet, [MidiVoice]);
      this.instruments[i] = instrument;
      instrument.connect(this.outputs[i]);
    }
  },

  play: function() {
    var midi = this.midi,
      tracks = midi.tracks,
      instruments = this.instruments,
      ticksPerBeat = midi.header.ticksPerBeat,
      track, instrument;
    for (var i = 0; i < tracks.length; i++) {
      track = tracks[i];
      instrument = instruments[i];
      instrument.play(track, ticksPerBeat);
    };
  }

});