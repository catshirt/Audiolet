function playVoice() {

    var audiolet = new Audiolet(),
        voice = new MIDIVoice(audiolet, 60, 127);

    voice.connect(audiolet.output);

};

function playInstrument() {

    var audiolet = new Audiolet(),
        instrument = new MIDIInstrument(audiolet, [MIDIVoice]);

    instrument.connect(audiolet.output);

    instrument.noteOn(new MIDI.Events.NoteOn(60, 127));

};

function playArpeggiator() {

    var audiolet = new Audiolet(),
        arpeggiator = new MIDIArpeggiator(audiolet),
        instrument = new MIDIInstrument(audiolet, [MIDIVoice]);

    arpeggiator.midiOut.connect(instrument.midiIn);
    instrument.connect(audiolet.output);

    var mid_c_on = new MIDI.Events.NoteOn(60, 127);
    arpeggiator.midiIn.send(mid_c_on);

};

function playKeyboard() {

    var audiolet = new Audiolet(),
        keyboard = new MIDIKeyboard(audiolet),
        arpeggiator = new MIDIArpeggiator(audiolet),
        instrument = new MIDIInstrument(audiolet, [MIDIVoice]);

    keyboard.midiOut.connect(arpeggiator.midiIn);
    arpeggiator.midiOut.connect(instrument.midiIn);
    instrument.connect(audiolet.output);

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
        instrument = new MIDIInstrument(audiolet, [MIDIVoice]);

    instrument.connect(audiolet.output);
    instrument.play(track);

};

function playMidi() {

    var header = {
        formatType: 0,
        trackCount: 1,
        ticksPerBeat: 96
    };

    var track = [
        new MIDI.Events.TrackName(''),
        new MIDI.Events.TimeSignature(4, 4, 36, 8),
        new MIDI.Events.NoteOn(65, 100),
        new MIDI.Events.NoteOff(65, 64, 24),
        new MIDI.Events.NoteOn(70, 100, 168),
        new MIDI.Events.NoteOff(70, 64, 24),
        new MIDI.Events.EndOfTrack()
    ];

    var midi = new MIDI(header, [track]),
        audiolet = new Audiolet(),
        MIDIPlayer = new MIDIPlayer(audiolet, midi);

    MIDIPlayer.connect(audiolet.output);
    MIDIPlayer.play();

};

function writeMidi() {

    var header = {
        formatType: 0,
        trackCount: 1,
        ticksPerBeat: 96
    };

    var track = [
        new MIDI.Events.TrackName(''),
        new MIDI.Events.TimeSignature(4, 4, 36, 8),
        new MIDI.Events.NoteOn(65, 100),
        new MIDI.Events.NoteOff(65, 64, 24),
        new MIDI.Events.NoteOn(70, 100, 168),
        new MIDI.Events.NoteOff(70, 64, 24),
        new MIDI.Events.EndOfTrack()
    ];

    var midi = new MIDI(header, [track]);

    console.log(midi.write());

};