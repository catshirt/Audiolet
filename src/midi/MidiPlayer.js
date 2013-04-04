/*!
 * @depends ../core/AudioletGroup.js
 */

var MidiPlayer = MidiGroup.extend({

  constructor: function(audiolet, midi) {
    var header = midi.header,
      track_count = header.trackCount,
      controller = new MidiGroup(audiolet);
    MidiGroup.apply(this, [audiolet, 1, 1]);
    this.midiFile = midi;
    this.instruments = [];

    for (var i = 0; i < midi.tracks.length; i++) {
      var instrument = new MidiInstrument(audiolet, [MidiVoice]);
      this.instruments[i] = instrument;
      this.midiIn.connect(instrument);
      instrument.connect(this.outputs[0]);
    }
  },

  play: function() {
    var midiFile = this.midiFile,
      tracks = midiFile.tracks,
      midi_clock = this.audiolet.midiClock,
      ticksPerBeat = midiFile.header.ticksPerBeat,
      midiOut = this.midiIn;
    for (var i = 0; i < tracks.length; i++) {
      midi_clock.sequence(tracks[i], function(e) {
        midiOut.send(e);
      }, ticksPerBeat);
    };
  }

});