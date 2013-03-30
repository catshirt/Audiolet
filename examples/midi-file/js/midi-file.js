function loadMidi(input) {

    var files = input.files,
        file = files[0],
        reader = new FileReader();

    reader.onload = function(load_e) {

        var midi = new MIDI(load_e.target.result),
            audiolet = new Audiolet(),
            midiPlayer = new MidiPlayer(audiolet, midi);

        for (var i = 0; i < midiPlayer.outputs.length; i++) {
            midiPlayer.outputs[i].connect(audiolet.output);
        };

        midiPlayer.play();

    };

    reader.readAsBinaryString(file);

};