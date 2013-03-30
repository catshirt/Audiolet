/*!
 * @depends ../core/AudioletGroup.js
 */

var MidiInstrument = AudioletGroup.extend({

  constructor: function(audiolet, Voices) {
    AudioletGroup.apply(this, [audiolet, 0, 1]);
    this.Voices = Voices;
    this.Voice = Voices[0];
    this.voices = {};
  },

  noteOn: function(e) {
    var Voice = this.Voice,
      voice = new Voice(this.audiolet, e.number, e.velocity);
      voices_by_note = this.voices,
      voices = voices_by_note[e.number] = voices_by_note[e.number] || [];

    voices.push(voice);
    voice.connect(this.outputs[0]);
  },

  noteOff: function(e) {
    var voices = this.voices,
      note_voices = voices[e.number],
      voice = note_voices.pop();
    
    voice.remove();
  },

  programChange: function(e) {
    var Voices = this.Voices,
      Voice = Voices[e.number];
      
    this.Voice = Voice;
  },

  play: function(track, ticksPerBeat) {
    var self = this,
      audiolet = this.audiolet,
      midi_clock = audiolet.midiClock;
    midi_clock.sequence(track, function(e) {
      var name = e.name || e.type,
        cb = self[name];
      cb && cb.apply(self, [e]);
    }, ticksPerBeat);
  }

});