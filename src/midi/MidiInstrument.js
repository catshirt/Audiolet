/*!
 * @depends MidiGroup.js
 */

// a group that creates voices based on midi messages
var MidiInstrument = MidiGroup.extend({

  constructor: function(audiolet, Voices) {
    MidiGroup.apply(this, [audiolet, 1, 1]);
    this.Voices = Voices;
    this.Voice = Voices[0];
    this.voices = {};
  },

  connectVoice: function(voice) {
    voice.connect(this.outputs[0]);
  },

  noteOn: function(e) {
    var Voice = this.Voice,
      voice = new Voice(this.audiolet, e.number, e.velocity);
      voices_by_note = this.voices,
      voices = voices_by_note[e.number] = voices_by_note[e.number] || [];

    voices.push(voice);
    this.connectVoice(voice);
  },

  noteOff: function(e) {
    var voices = this.voices,
      note_voices = voices[e.number],
      voice = note_voices && note_voices.pop();
    
    voice && voice.remove();
  },

  programChange: function(e) {
    var Voices = this.Voices,
      Voice = Voices[e.number];
      
    this.Voice = Voice;
  }

});