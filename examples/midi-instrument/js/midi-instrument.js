function playVoice() {

    var audiolet = new Audiolet(),
        voice = new MidiVoice(audiolet, 60, 127);

    voice.connect(audiolet.output);

};

function playInstrument() {

    var audiolet = new Audiolet(),
        instrument = new MidiInstrument(audiolet, [MidiVoice]);

    instrument.connect(audiolet.output);
    instrument.noteOn(new MidiNoteOnEvent(0, 60, 127));

};

function playTrack() {

    var track = [
        new MIDI.Events.TrackName(''),
        new MIDI.Events.TimeSignature(4, 4, 36, 8),
        new MIDI.Events.NoteOn(65, 100),
        new MIDI.Events.NoteOff(65, 64, 24),
        new MIDI.Events.NoteOn(70, 100, 168),
        new MIDI.Events.NoteOff(70, 64, 24),
        new MIDI.Events.EndOfTrack()
    ];
    
    var audiolet = new Audiolet(),
        instrument = new MidiInstrument(audiolet, [MidiVoice]);

    instrument.connect(audiolet.output);
    instrument.play(track);

};

function playMidi() {

    var midi = new MIDI({
        formatType: 0,
        trackCount: 1,
        ticksPerBeat: 96
    }, [[
        new MIDI.Events.TrackName(''),
        new MIDI.Events.TimeSignature(4, 4, 36, 8),
        new MIDI.Events.NoteOn(65, 100),
        new MIDI.Events.NoteOff(65, 64, 24),
        new MIDI.Events.NoteOn(70, 100, 168),
        new MIDI.Events.NoteOff(70, 64, 24),
        new MIDI.Events.EndOfTrack()
    ]]);

    var audiolet = new Audiolet(),
        midiPlayer = new MidiPlayer(audiolet, midi);

    midiPlayer.connect(audiolet.output);
    midiPlayer.play();

    window.midi = midi;

};

function writeMidi() {

    var midi = new MIDI({
        formatType: 0,
        trackCount: 1,
        ticksPerBeat: 96
    }, [[
        new MIDI.Events.TrackName(''),
        new MIDI.Events.TimeSignature(4, 4, 36, 8),
        new MIDI.Events.NoteOn(65, 100),
        new MIDI.Events.NoteOff(65, 64, 24),
        new MIDI.Events.NoteOn(70, 100, 168),
        new MIDI.Events.NoteOff(70, 64, 24),
        new MIDI.Events.EndOfTrack()
    ]]);

    return midi.write();

};