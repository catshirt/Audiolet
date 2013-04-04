/*!
 * @depends MIDIGroup.js
 */

/**
 * A MIDIKeyboard send MIDI noteOn and noteOff events
 * based on keys pressed on the users keyboard.
 */
var MIDIKeyboard = MIDIGroup.extend({

    /*
     * Constructor
     *
     * @param {Audiolet} audiolet The audiolet object.
     */
    constructor: function(audiolet) {
        MIDIGroup.call(this, audiolet);
        this._pressed = {};
        document.addEventListener('keydown', this.tryNoteOn.bind(this));
        document.addEventListener('keyup', this.tryNoteOff.bind(this));
    },

    /**
     * This maps e.which values to midi note values.
     * For instance, 'G' on the keyboard is `70`,
     * which maps to midi key `71`, or, middle C.
     */
    MIDINotesByChar: {
        65: 64,
        87: 65,
        83: 67,
        69: 68,
        68: 69,
        82: 70,
        70: 71,
        71: 72,
        89: 73,
        72: 74,
        85: 75,
        74: 76,
        75: 78,
        79: 79,
        76: 80,
        80: 81
    },

    /**
     * Triggered on keydown, tryNoteOn sends a NoteOn
     * event on midiOut if the note isn't already on,
     * and the key pressed is in our scale.
     */
    tryNoteOn: function(e) {
        var char = e.which,
            midiKey = this.MIDINotesByChar[char];
        if (!this._pressed[char] && midiKey) {
            this._pressed[char] = true;
            this.midiOut.send(new MIDI.Events.NoteOn(midiKey, 127));
        }
    },

    /**
     * Triggered on keyup, tryNoteOff sends a NoteOff
     * event on midiOut if the note is on.
     */
    tryNoteOff: function(e) {
        var char = e.which,
            midiKey = this.MIDINotesByChar[char];
        if (this._pressed[char]) {
            this._pressed[char] = false;
            this.midiOut.send(new MIDI.Events.NoteOff(midiKey, 127));
        }
    }

});