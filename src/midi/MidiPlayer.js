/*!
 * @depends ../core/AudioletGroup.js
 */

var MIDIPlayer = MIDIGroup.extend({

  constructor: function(audiolet, midi) {
    var header = midi.header,
      track_count = header.trackCount,
      controller = new MIDIGroup(audiolet);
    MIDIGroup.apply(this, [audiolet, 1, 1]);
    this.midiFile = midi;
    this.instruments = [];

    for (var i = 0; i < midi.tracks.length; i++) {
      var instrument = new MIDIInstrument(audiolet, [MIDIVoice]);
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