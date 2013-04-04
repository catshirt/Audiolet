/*!
 * @depends MIDIGroup.js
 */

/**
 * A MIDIInstrument is a MIDIGroup with a `midiIn` and
 * an audio out. It is mainly responsible for managing `noteOn` and `noteOff`
 * events, and creating new voices accordingly.
 */
var MIDIInstrument = MIDIGroup.extend({

  /*
   * Constructor
   *
   * @param {Audiolet} audiolet The audiolet object.
   * @param {Array} Voices An array of `MIDIVoice` options.
   */
  constructor: function(audiolet, Voices) {
    MIDIGroup.apply(this, [audiolet, 0, 1]);
    this.Voices = Voices;
    this.Voice = Voices[0];
    this.voices = {};
  },

  /**
   * If you are extending MIDIInstrument and intend
   * to route voices through additional nodes before the output,
   * override this method to specify where the voice should connect to.
   */
  connectVoice: function(voice) {
    voice.connect(this.outputs[0]);
  },

  /**
   * Creates a new voice and connects it to the MIDIInstrument's audio output,
   * playing the note. References to the voices are mapped by the note number
   * so NoteOff events can remove the proper voice.
   */
  noteOn: function(e) {
    var Voice = this.Voice,
      voice = new Voice(this.audiolet, e.number, e.velocity);
      voices_by_note = this.voices,
      voices = voices_by_note[e.number] = voices_by_note[e.number] || [];

    voices.push(voice);
    this.connectVoice(voice);
  },

  /**
   * Removes the currently playing voice whose note number matches
   * the noteOff event note number.
   */
  noteOff: function(e) {
    var voices = this.voices,
      note_voices = voices[e.number],
      voice = note_voices && note_voices.pop();
    
    voice && voice.remove();
  },

  /**
   * Changes the main Voice class used to create sound for the instrument,
   * based on the programChange event value and the Voice options passed
   * into the instruments constructor.
   */
  programChange: function(e) {
    var Voices = this.Voices,
      Voice = Voices[e.number];
      
    this.Voice = Voice;
  }

});