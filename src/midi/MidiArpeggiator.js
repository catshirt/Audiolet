/*!
 * @depends MIDIGroup.js
 */

/**
 * A MIDIArpeggiator is a MIDIGroup with only a midiIn and midiOut.
 * when it's `midiIn` receives a `NoteOn` event, it will schedule arpeggiated
 * sequences of the original `NoteOn`, and send the modified `NoteOn` events
 * on it's `midiOut`.
 */
var MIDIArpeggiator = MIDIGroup.extend({

    /*
     * Constructor
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Float} frequency Number of beats per measure to arpeggiate.
     * @param {Number} The amount of upper octaves to arpeggiate.
     * @param {String} pattern The name of the pattern method to use.
     */
    constructor: function(audiolet, frequency, octaves, pattern) {
        MIDIGroup.call(this, audiolet);
        this.frequency = 1/frequency || 1/8;
        this.octaves = octaves || 1;
        this.pattern = pattern || 'up';
        this._notesOn = [];
        this._pattern = new PProxy([], Infinity);
        this._lastE = null;
    },

    
    /**
     * Add an event to the list of active events,
     * and augment the current playing pattern accordingly.
     */
    noteOn: function(e) { 
        if (!this._notesOn.length) {
            this._playing = this.arpeggiate(e);
        }
        this._notesOn.push(e);
        this._pattern.pattern = this[this.pattern]();
    },

    /**
     * Remove an event to the list of active events,
     * and augment the current playing pattern accordingly.
     */
    noteOff: function(e) {
        // remove associated noteOn event
        for (var i = 0; i < this._notesOn.length; i++) {
            if (this._notesOn[i].number == e.number) {
                this._notesOn.splice(i);
                break;
            }
        }

        // if there are no remaining notes, stop the scheduling 
        if (!this._notesOn.length) {
            this.stop();

        // if there are still events to be arpeggiated, update the pattern
        } else {
            this._pattern.pattern = this[this.pattern]();
        }
    },

    /**
     * Takes a `NoteOn` event and schedules new events on `midiOut`.
     */
    arpeggiate: function(e) {
        var self = this,
            pattern = this._pattern,
            scheduler = this.audiolet.scheduler,
            frequency = this.frequency,
            midiOut = this.midiOut;

        // start a tick based on the `MIDIArpeggiator` `frequency`. although it
        // is called only when the initial note starts, the pattern is hotswapped
        // in `noteOn` and `noteOff` as other notes are received.
        return scheduler.play([pattern], 4 * frequency, function(cur_num) {
            var vel = (self._lastE || e).velocity;

            // turn off the previous noteOn
            if (self._lastE) {
                var last_num = self._lastE.number;
                midiOut.send(new MIDI.Events.NoteOff(last_num, vel));
            }

            // send a new noteOn
            self._lastE = new MIDI.Events.NoteOn(cur_num, vel);
            midiOut.send(self._lastE);  
        });
    },

    /**
     * Stop the scheduler sequence and turn off the last sent noteOn.
     */
    stop: function() {
        var scheduler = this.audiolet.scheduler,
            e = this._lastE,
            playing = this._playing,
            midiOut = this.midiOut;

        scheduler.stop(playing);
        midiOut.send(new MIDI.Events.NoteOff(e.number, e.velocity));
    },

    /**
     * Returns a PSequence representing the arpeggiated output,
     * given it's current `_notesOn`.
     */
    up: function() {
        var notesOn = this._notesOn,
            pattern = new PSequence([], Infinity),
            noteOn;

        // create an additional octave sequence for each current NoteOn event
        for (var i = 0; i < notesOn.length; i++) {
            noteOn = notesOn[i];
            for (var j = 0; j < this.octaves + 1; j++) {
                pattern.list.push(noteOn.number + (12 * (j + 1)));
            }
        }

        pattern.list.sort();
        return pattern;
    },
    
    /**
     * Returns a reversed modification of the `up` sequence.
     */
    down: function() {
        var pattern = this.up();
        pattern.list.reverse();
        return pattern;
    },
    
    
    /**
     * Returns a concatenated modification of the
     * `up` and `down` sequences (exclusive).
     */
    excl: function() {
        var up = this.up().list,
            down = this.down().list;
        up.pop();
        down.pop();
        return new PSequence(up.concat(down), Infinity);
    },
    
    /**
     * Returns a concatenated modification of the
     * `up` and `down` sequences (inclusive).
     */
    incl: function() {  
        var up = this.up().list,
            down = this.down().list;
        return new PSequence(up.concat(down), Infinity);
    },

    /**
     * Returns some sort of ordered version of the up sequence.
     */
    order: function(e) {
        // todo
    },
    
    /**
     * Returns a random sequence of all the possible arpeggiated values.
     */
    random: function(e) {
        // todo
    }

});