function loadMidi(input) {

    var files = input.files,
        file = files[0],
        reader = new FileReader();

    reader.onload = function(load_e) {

        var midi = new MIDI(load_e.target.result),
            audiolet = new Audiolet(),
            MIDIPlayer = new MIDIPlayer(audiolet, midi);

        for (var i = 0; i < MIDIPlayer.outputs.length; i++) {
            MIDIPlayer.outputs[i].connect(audiolet.output);
        };

        MIDIPlayer.play();

    };

    reader.readAsBinaryString(file);

};