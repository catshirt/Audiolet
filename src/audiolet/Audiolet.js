/**
 * A base Audiolet class exposing `extends`
 */
var AudioletClass = function() {

};

/**
 * Create a class method for extending objects.
 */
AudioletClass.extend = function(protoProps) {

  var parent = this,
    child;

  // The constructor function for the new subclass is either defined by you
  // (the "constructor" property in your `extend` definition), or defaulted
  // by us to simply call the parent's constructor.
  if (protoProps && protoProps.hasOwnProperty('constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){ parent.apply(this, arguments); };
  }

  // Set the prototype chain to inherit from `parent`, without calling
  // `parent`'s constructor function.
  var ctor = function(){};
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();

  // Add prototype properties (instance properties) to the subclass,
  // if supplied.
  for (var key in protoProps) {
    if (protoProps.hasOwnProperty(key)) {
      child.prototype[key] = protoProps[key];
    }
  }

  // Correctly set child's `prototype.constructor`.
  child.prototype.constructor = child;

  // Expose `extend` method.
  child.extend = this.extend;

  return child;

};
/*!
 * @depends AudioletClass.js
 */

/**
 * The base audiolet object.  Contains an output node which pulls data from
 * connected nodes.
 */
var Audiolet = AudioletClass.extend({

    /**
     * Constructor
     *
     * @param {Number} [sampleRate=44100] The sample rate to run at.
     * @param {Number} [numberOfChannels=2] The number of output channels.
     * @param {Number} [bufferSize] Block size.  If undefined uses a sane default.
     */
    constructor: function(sampleRate, numberOfChannels, bufferSize) {
        AudioletClass.call(this);
        this.output = new AudioletDestination(this, sampleRate,
                                              numberOfChannels, bufferSize);
    }

});
/*!
 * @depends AudioletClass.js
 */

/**
 * A variable size multi-channel audio buffer.
 */
var AudioletBuffer = AudioletClass.extend({

     /**
      * Constructor
      *
      * @param {Number} numberOfChannels The initial number of channels.
      * @param {Number} length The length in samples of each channel.
      */
    constructor: function(numberOfChannels, length) {
        AudioletClass.call(this);
        this.numberOfChannels = numberOfChannels;
        this.length = length;

        this.channels = [];
        for (var i = 0; i < this.numberOfChannels; i++) {
            this.channels.push(new Float32Array(length));
        }

        this.unslicedChannels = [];
        for (var i = 0; i < this.numberOfChannels; i++) {
            this.unslicedChannels.push(this.channels[i]);
        }

        this.isEmpty = false;
        this.channelOffset = 0;
    },

    /**
     * Get a single channel of data
     *
     * @param {Number} channel The index of the channel.
     * @return {Float32Array} The requested channel.
     */
    getChannelData: function(channel) {
        return (this.channels[channel]);
    },

    /**
     * Set the data in the buffer by copying data from a second buffer
     *
     * @param {AudioletBuffer} buffer The buffer to copy data from.
     */
    set: function(buffer) {
        var numberOfChannels = buffer.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            this.channels[i].set(buffer.getChannelData(i));
        }
    },

    /**
     * Set the data in a section of the buffer by copying data from a second buffer
     *
     * @param {AudioletBuffer} buffer The buffer to copy data from.
     * @param {Number} length The number of samples to copy.
     * @param {Number} [inputOffset=0] An offset to read data from.
     * @param {Number} [outputOffset=0] An offset to write data to.
     */
    setSection: function(buffer, length, inputOffset,
                                                   outputOffset) {
        inputOffset = inputOffset || 0;
        outputOffset = outputOffset || 0;
        var numberOfChannels = buffer.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            // Begin subarray-of-subarray fix
            inputOffset += buffer.channelOffset;
            outputOffset += this.channelOffset;
            var channel1 = this.unslicedChannels[i].subarray(outputOffset,
                    outputOffset +
                    length);
            var channel2 = buffer.unslicedChannels[i].subarray(inputOffset,
                    inputOffset +
                    length);
            // End subarray-of-subarray fix
            // Uncomment the following lines when subarray-of-subarray is fixed
            /*!
               var channel1 = this.getChannelData(i).subarray(outputOffset,
               outputOffset +
               length);
               var channel2 = buffer.getChannelData(i).subarray(inputOffset,
               inputOffset +
               length);
             */
            channel1.set(channel2);
        }
    },

    /**
     * Add the data from a second buffer to the data in this buffer
     *
     * @param {AudioletBuffer} buffer The buffer to add data from.
     */
    add: function(buffer) {
        var length = this.length;
        var numberOfChannels = buffer.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            var channel1 = this.getChannelData(i);
            var channel2 = buffer.getChannelData(i);
            for (var j = 0; j < length; j++) {
                channel1[j] += channel2[j];
            }
        }
    },

    /**
     * Add the data from a section of a second buffer to the data in this buffer
     *
     * @param {AudioletBuffer} buffer The buffer to add data from.
     * @param {Number} length The number of samples to add.
     * @param {Number} [inputOffset=0] An offset to read data from.
     * @param {Number} [outputOffset=0] An offset to write data to.
     */
    addSection: function(buffer, length, inputOffset,
                                                   outputOffset) {
        inputOffset = inputOffset || 0;
        outputOffset = outputOffset || 0;
        var numberOfChannels = buffer.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            var channel1 = this.getChannelData(i);
            var channel2 = buffer.getChannelData(i);
            for (var j = 0; j < length; j++) {
                channel1[j + outputOffset] += channel2[j + inputOffset];
            }
        }
    },

    /**
     * Resize the buffer.  This operation can optionally be lazy, which is
     * generally faster but doesn't necessarily result in an empty buffer.
     *
     * @param {Number} numberOfChannel The new number of channels.
     * @param {Number} length The new length of each channel.
     * @param {Boolean} [lazy=false] If true a resized buffer may not be empty.
     * @param {Number} [offset=0] An offset to resize from.
     */
    resize: function(numberOfChannels, length, lazy,
                                               offset) {
        offset = offset || 0;
        // Local variables
        var channels = this.channels;
        var unslicedChannels = this.unslicedChannels;

        var oldLength = this.length;
        var channelOffset = this.channelOffset + offset;

        for (var i = 0; i < numberOfChannels; i++) {
            // Get the current channels
            var channel = channels[i];
            var unslicedChannel = unslicedChannels[i];

            if (length > oldLength) {
                // We are increasing the size of the buffer
                var oldChannel = channel;

                if (!lazy ||
                    !unslicedChannel ||
                    unslicedChannel.length < length) {
                    // Unsliced channel is not empty when it needs to be,
                    // does not exist, or is not large enough, so needs to be
                    // (re)created
                    unslicedChannel = new Float32Array(length);
                }

                channel = unslicedChannel.subarray(0, length);

                if (!lazy && oldChannel) {
                    channel.set(oldChannel, offset);
                }

                channelOffset = 0;
            }
            else {
                // We are decreasing the size of the buffer
                if (!unslicedChannel) {
                    // Unsliced channel does not exist
                    // We can assume that we always have at least one unsliced
                    // channel, so we can copy its length
                    var unslicedLength = unslicedChannels[0].length;
                    unslicedChannel = new Float32Array(unslicedLength);
                }
                // Begin subarray-of-subarray fix
                offset = channelOffset;
                channel = unslicedChannel.subarray(offset, offset + length);
                // End subarray-of-subarray fix
                // Uncomment the following lines when subarray-of-subarray is
                // fixed.
                // TODO: Write version where subarray-of-subarray is used
            }
            channels[i] = channel;
            unslicedChannels[i] = unslicedChannel;
        }

        this.channels = channels.slice(0, numberOfChannels);
        this.unslicedChannels = unslicedChannels.slice(0, numberOfChannels);
        this.length = length;
        this.numberOfChannels = numberOfChannels;
        this.channelOffset = channelOffset;
    },

    /**
     * Append the data from a second buffer to the end of the buffer
     *
     * @param {AudioletBuffer} buffer The buffer to append to this buffer.
     */
    push: function(buffer) {
        var bufferLength = buffer.length;
        this.resize(this.numberOfChannels, this.length + bufferLength);
        this.setSection(buffer, bufferLength, 0, this.length - bufferLength);
    },

    /**
     * Remove data from the end of the buffer, placing it in a second buffer.
     *
     * @param {AudioletBuffer} buffer The buffer to move data into.
     */
    pop: function(buffer) {
        var bufferLength = buffer.length;
        var offset = this.length - bufferLength;
        buffer.setSection(this, bufferLength, offset, 0);
        this.resize(this.numberOfChannels, offset);
    },

    /**
     * Prepend data from a second buffer to the beginning of the buffer.
     *
     * @param {AudioletBuffer} buffer The buffer to prepend to this buffer.
     */
    unshift: function(buffer) {
        var bufferLength = buffer.length;
        this.resize(this.numberOfChannels, this.length + bufferLength, false,
                bufferLength);
        this.setSection(buffer, bufferLength, 0, 0);
    },

    /**
     * Remove data from the beginning of the buffer, placing it in a second buffer.
     *
     * @param {AudioletBuffer} buffer The buffer to move data into.
     */
    shift: function(buffer) {
        var bufferLength = buffer.length;
        buffer.setSection(this, bufferLength, 0, 0);
        this.resize(this.numberOfChannels, this.length - bufferLength,
                false, bufferLength);
    },

    /**
     * Make all values in the buffer 0
     */
    zero: function() {
        var numberOfChannels = this.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            var channel = this.getChannelData(i);
            var length = this.length;
            for (var j = 0; j < length; j++) {
                channel[j] = 0;
            }
        }
    },

    /**
     * Copy the buffer into a single Float32Array, with each channel appended to
     * the end of the previous one.
     *
     * @return {Float32Array} The combined array of data.
     */
    combined: function() {
        var channels = this.channels;
        var numberOfChannels = this.numberOfChannels;
        var length = this.length;
        var combined = new Float32Array(numberOfChannels * length);
        for (var i = 0; i < numberOfChannels; i++) {
            combined.set(channels[i], i * length);
        }
        return combined;
    },

    /**
     * Copy the buffer into a single Float32Array, with the channels interleaved.
     *
     * @return {Float32Array} The interleaved array of data.
     */
    interleaved: function() {
        var channels = this.channels;
        var numberOfChannels = this.numberOfChannels;
        var length = this.length;
        var interleaved = new Float32Array(numberOfChannels * length);
        for (var i = 0; i < length; i++) {
            for (var j = 0; j < numberOfChannels; j++) {
                interleaved[numberOfChannels * i + j] = channels[j][i];
            }
        }
        return interleaved;
    },

    /**
     * Return a new copy of the buffer.
     *
     * @return {AudioletBuffer} The copy of the buffer.
     */
    copy: function() {
        var buffer = new AudioletBuffer(this.numberOfChannels, this.length);
        buffer.set(this);
        return buffer;
    },

    /**
     * Load a .wav or .aiff file into the buffer using audiofile.js
     *
     * @param {String} path The path to the file.
     * @param {Boolean} [async=true] Whether to load the file asynchronously.
     * @param {Function} [callback] Function called if the file loaded sucessfully.
     */
    load: function(path, async, callback) {
        var request = new AudioFileRequest(path, async);
        request.onSuccess = function(decoded) {
            this.length = decoded.length;
            this.numberOfChannels = decoded.channels.length;
            this.unslicedChannels = decoded.channels;
            this.channels = decoded.channels;
            this.channelOffset = 0;
            if (callback) {
                callback();
            }
        }.bind(this);

        request.onFailure = function() {
            console.error('Could not load', path);
        }.bind(this);

        request.send();
    }

});
/*!
 * @depends AudioletClass.js
 */

/**
 * A container for collections of connected AudioletNodes.  Groups make it
 * possible to create multiple copies of predefined networks of nodes,
 * without having to manually create and connect up each individual node.
 *
 * From the outside groups look and behave exactly the same as nodes.
 * Internally you can connect nodes directly to the group's inputs and
 * outputs, allowing connection to nodes outside of the group.
 */
var AudioletGroup = AudioletClass.extend({

    /**
     * Constructor

     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} numberOfInputs The number of inputs.
     * @param {Number} numberOfOutputs The number of outputs.
     */
    constructor: function(audiolet, numberOfInputs, numberOfOutputs) {
        AudioletClass.call(this);
        this.audiolet = audiolet;

        this.inputs = [];
        for (var i = 0; i < numberOfInputs; i++) {
            this.inputs.push(new PassThroughNode(this.audiolet, 1, 1));
        }

        this.outputs = [];
        for (var i = 0; i < numberOfOutputs; i++) {
            this.outputs.push(new PassThroughNode(this.audiolet, 1, 1));
        }
    },

    /**
     * Connect the group to another node or group
     *
     * @param {AudioletNode|AudioletGroup} node The node to connect to.
     * @param {Number} [output=0] The index of the output to connect from.
     * @param {Number} [input=0] The index of the input to connect to.
     */
    connect: function(node, output, input) {
        this.outputs[output || 0].connect(node, 0, input);
    },

    /**
     * Disconnect the group from another node or group
     *
     * @param {AudioletNode|AudioletGroup} node The node to disconnect from.
     * @param {Number} [output=0] The index of the output to disconnect.
     * @param {Number} [input=0] The index of the input to disconnect.
     */
    disconnect: function(node, output, input) {
        this.outputs[output || 0].disconnect(node, 0, input);
    },

    /**
     * Remove the group completely from the processing graph, disconnecting all
     * of its inputs and outputs
     */
    remove: function() {
        var numberOfInputs = this.inputs.length;
        for (var i = 0; i < numberOfInputs; i++) {
            this.inputs[i].remove();
        }

        var numberOfOutputs = this.outputs.length;
        for (var i = 0; i < numberOfOutputs; i++) {
            this.outputs[i].remove();
        }
    }

});
/*!
 * @depends AudioletGroup.js
 */

/**
 * Group containing all of the components for the Audiolet output chain.  The
 * chain consists of:
 *
 *     Input => Scheduler => UpMixer => Output
 *
 * **Inputs**
 *
 * - Audio
 */
var AudioletDestination = AudioletGroup.extend({
    
    /**
     * Constructor
     *
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [sampleRate=44100] The sample rate to run at.
     * @param {Number} [numberOfChannels=2] The number of output channels.
     * @param {Number} [bufferSize=8192] A fixed buffer size to use.
     */
    constructor: function(audiolet, sampleRate, numberOfChannels,
                                        bufferSize) {
        AudioletGroup.call(this, audiolet, 1, 0);

        this.device = new AudioletDevice(audiolet, sampleRate,
                numberOfChannels, bufferSize);
        audiolet.device = this.device; // Shortcut
        this.scheduler = new Scheduler(audiolet);
        audiolet.scheduler = this.scheduler; // Shortcut
        this.midiClock = new MidiClock(this.scheduler);
        audiolet.midiClock = this.midiClock; // Shortcut

        this.upMixer = new UpMixer(audiolet, this.device.numberOfChannels);

        this.inputs[0].connect(this.scheduler);
        this.scheduler.connect(this.upMixer);
        this.upMixer.connect(this.device);
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Destination';
    }

});
/*!
 * @depends AudioletClass.js
 */

/**
 * The basic building block of Audiolet applications.  Nodes are connected
 * together to create a processing graph which governs the flow of audio data.
 * AudioletNodes can contain any number of inputs and outputs which send and
 * receive one or more channels of audio data.  Audio data is created and
 * processed using the generate function, which is called whenever new data is
 * needed.
 */
var AudioletNode = AudioletClass.extend({


    /**
     * Constructor
     *
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} numberOfInputs The number of inputs.
     * @param {Number} numberOfOutputs The number of outputs.
     * @param {Function} [generate] A replacement for the generate function.
     */
    constructor: function(audiolet, numberOfInputs, numberOfOutputs,
                            generate) {
        AudioletClass.call(this);
        this.audiolet = audiolet;

        this.inputs = [];
        for (var i = 0; i < numberOfInputs; i++) {
            this.inputs.push(new AudioletInput(this, i));
        }

        this.outputs = [];
        for (var i = 0; i < numberOfOutputs; i++) {
            this.outputs.push(new AudioletOutput(this, i));
        }

        if (generate) {
            this.generate = generate;
        }
    },

    /**
     * Connect the node to another node or group.
     *
     * @param {AudioletNode|AudioletGroup} node The node to connect to.
     * @param {Number} [output=0] The index of the output to connect from.
     * @param {Number} [input=0] The index of the input to connect to.
     */
    connect: function(node, output, input) {
        if (node instanceof AudioletGroup) {
            // Connect to the pass-through node rather than the group
            node = node.inputs[input || 0];
            input = 0;
        }
        var outputPin = this.outputs[output || 0];
        var inputPin = node.inputs[input || 0];
        outputPin.connect(inputPin);
        inputPin.connect(outputPin);

        this.audiolet.device.needTraverse = true;
    },

    /**
     * Disconnect the node from another node or group
     *
     * @param {AudioletNode|AudioletGroup} node The node to disconnect from.
     * @param {Number} [output=0] The index of the output to disconnect.
     * @param {Number} [input=0] The index of the input to disconnect.
     */
    disconnect: function(node, output, input) {
        if (node instanceof AudioletGroup) {
            node = node.inputs[input || 0];
            input = 0;
        }

        var outputPin = this.outputs[output || 0];
        var inputPin = node.inputs[input || 0];
        inputPin.disconnect(outputPin);
        outputPin.disconnect(inputPin);

        this.audiolet.device.needTraverse = true;
    },

    /**
     * Force an output to contain a fixed number of channels.
     *
     * @param {Number} output The index of the output.
     * @param {Number} numberOfChannels The number of channels.
     */
    setNumberOfOutputChannels: function(output,
                                                                numberOfChannels) {
        this.outputs[output].numberOfChannels = numberOfChannels;
    },

    /**
     * Link an output to an input, forcing the output to always contain the
     * same number of channels as the input.
     *
     * @param {Number} output The index of the output.
     * @param {Number} input The index of the input.
     */
    linkNumberOfOutputChannels: function(output, input) {
        this.outputs[output].linkNumberOfChannels(this.inputs[input]);
    },

    /**
     * Process samples a from each channel. This function should not be called
     * manually by users, who should instead rely on automatic ticking from
     * connections to the AudioletDevice.
     */
    tick: function() {
        this.createInputSamples();
        this.createOutputSamples();

        this.generate();
    },

    /**
     * Traverse the audio graph, adding this and any parent nodes to the nodes
     * array.
     *
     * @param {AudioletNode[]} nodes Array to add nodes to.
     */
    traverse: function(nodes) {
        if (nodes.indexOf(this) == -1) {
            nodes.push(this);
            nodes = this.traverseParents(nodes);
        }
        return nodes;
    },

    /**
     * Call the traverse function on nodes which are connected to the inputs.
     */
    traverseParents: function(nodes) {
        var numberOfInputs = this.inputs.length;
        for (var i = 0; i < numberOfInputs; i++) {
            var input = this.inputs[i];
            var numberOfStreams = input.connectedFrom.length;
            for (var j = 0; j < numberOfStreams; j++) {
                nodes = input.connectedFrom[j].node.traverse(nodes);
            }
        }
        return nodes;
    },

    /**
     * Process a sample for each channel, reading from the inputs and putting new
     * values into the outputs.  Override me!
     */
    generate: function() {
    },

    /**
     * Create the input samples by grabbing data from the outputs of connected
     * nodes and summing it.  If no nodes are connected to an input, then
     * give an empty array
     */
    createInputSamples: function() {
        var numberOfInputs = this.inputs.length;
        for (var i = 0; i < numberOfInputs; i++) {
            var input = this.inputs[i];

            var numberOfInputChannels = 0;

            for (var j = 0; j < input.connectedFrom.length; j++) {
                var output = input.connectedFrom[j];
                for (var k = 0; k < output.samples.length; k++) {
                    var sample = output.samples[k];
                    if (k < numberOfInputChannels) {
                        input.samples[k] += sample;
                    }
                    else {
                        input.samples[k] = sample;
                        numberOfInputChannels += 1;
                    }
                }
            }

            if (input.samples.length > numberOfInputChannels) {
                input.samples = input.samples.slice(0, numberOfInputChannels);
            }
        }
    },


    /**
    * Create output samples for each channel.
    */
    createOutputSamples: function() {
        var numberOfOutputs = this.outputs.length;
        for (var i = 0; i < numberOfOutputs; i++) {
            var output = this.outputs[i];
            var numberOfChannels = output.getNumberOfChannels();
            if (output.samples.length == numberOfChannels) {
                continue;
            }
            else if (output.samples.length > numberOfChannels) {
                output.samples = output.samples.slice(0, numberOfChannels);
                continue;
            }

            for (var j = output.samples.length; j < numberOfChannels; j++) {
                output.samples[j] = 0;
            }
        }
    },

    /**
     * Remove the node completely from the processing graph, disconnecting all
     * of its inputs and outputs.
     */
    remove: function() {
        // Disconnect inputs
        var numberOfInputs = this.inputs.length;
        for (var i = 0; i < numberOfInputs; i++) {
            var input = this.inputs[i];
            var numberOfStreams = input.connectedFrom.length;
            for (var j = 0; j < numberOfStreams; j++) {
                var outputPin = input.connectedFrom[j];
                var output = outputPin.node;
                output.disconnect(this, outputPin.index, i);
            }
        }

        // Disconnect outputs
        var numberOfOutputs = this.outputs.length;
        for (var i = 0; i < numberOfOutputs; i++) {
            var output = this.outputs[i];
            var numberOfStreams = output.connectedTo.length;
            for (var j = 0; j < numberOfStreams; j++) {
                var inputPin = output.connectedTo[j];
                var input = inputPin.node;
                this.disconnect(input, i, inputPin.index);
            }
        }
    }

});
/*!
 * @depends AudioletNode.js
 */

/**
 * Audio output device.  Uses sink.js to output to a range of APIs.
 */
var AudioletDevice = AudioletNode.extend({

    /**
     * Constructor
     *
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [sampleRate=44100] The sample rate to run at.
     * @param {Number} [numberOfChannels=2] The number of output channels.
     * @param {Number} [bufferSize=8192] A fixed buffer size to use.
     */
    constructor: function(audiolet, sampleRate, numberOfChannels, bufferSize) {
        AudioletNode.call(this, audiolet, 1, 0);

        this.sink = Sink(this.tick.bind(this), numberOfChannels, bufferSize,
                         sampleRate);

        // Re-read the actual values from the sink.  Sample rate especially is
        // liable to change depending on what the soundcard allows.
        this.sampleRate = this.sink.sampleRate;
        this.numberOfChannels = this.sink.channelCount;
        this.bufferSize = this.sink.preBufferSize;

        this.writePosition = 0;
        this.buffer = null;
        this.paused = false;

        this.needTraverse = true;
        this.nodes = [];
    },

    /**
     * Overridden tick function. Pulls data from the input and writes it to the
     * device.
     *
     * @param {Float32Array} buffer Buffer to write data to.
     * @param {Number} numberOfChannels Number of channels in the buffer.
     */
    tick: function(buffer, numberOfChannels) {
        if (!this.paused) {
            var input = this.inputs[0];

            var samplesNeeded = buffer.length / numberOfChannels;
            for (var i = 0; i < samplesNeeded; i++) {
                if (this.needTraverse) {
                    this.nodes = this.traverse([]);
                    this.needTraverse = false;
                }

                // Tick in reverse order up to, but not including this node
                for (var j = this.nodes.length - 1; j > 0; j--) {
                    this.nodes[j].tick();
                }
                // Cut down tick to just sum the input samples 
                this.createInputSamples();

                for (var j = 0; j < numberOfChannels; j++) {
                    buffer[i * numberOfChannels + j] = input.samples[j];
                }

                this.writePosition += 1;
            }
        }
    },

    /**
     * Get the current output position
     *
     * @return {Number} Output position in samples.
     */
    getPlaybackTime: function() {
        return this.sink.getPlaybackTime();
    },

    /**
     * Get the current write position
     *
     * @return {Number} Write position in samples.
     */
    getWriteTime: function() {
        return this.writePosition;
    },

    /**
     * Pause the output stream, and stop everything from ticking.  The playback
     * time will continue to increase, but the write time will be paused.
     */
    pause: function() {
        this.paused = true;
    },

    /**
     * Restart the output stream.
     */
    play: function() {
       this.paused = false; 
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Audio Output Device';
    }

});
/*!
 * @depends AudioletClass.js
 */

/**
 * Class representing a single input of an AudioletNode
 */
var AudioletInput = AudioletClass.extend({

    /**
     * Constructor
     *
     * @param {AudioletNode} node The node which the input belongs to.
     * @param {Number} index The index of the input.
     */
    constructor: function(node, index) {
        AudioletClass.call(this);
        this.node = node;
        this.index = index;
        this.connectedFrom = [];
        // Minimum sized buffer, which we can resize from accordingly
        this.samples = [];
    },

    /**
     * Connect the input to an output
     *
     * @param {AudioletOutput} output The output to connect to.
     */
    connect: function(output) {
        this.connectedFrom.push(output);
    },

    /**
     * Disconnect the input from an output
     *
     * @param {AudioletOutput} output The output to disconnect from.
     */
    disconnect: function(output) {
        var numberOfStreams = this.connectedFrom.length;
        for (var i = 0; i < numberOfStreams; i++) {
            if (output == this.connectedFrom[i]) {
                this.connectedFrom.splice(i, 1);
                break;
            }
        }
        if (this.connectedFrom.length == 0) {
            this.samples = [];
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return this.node.toString() + 'Input #' + this.index;
    }

});
/*!
 * @depends AudioletClass.js
 */

/**
 * Class representing a single output of an AudioletNode
 */
var AudioletOutput = AudioletClass.extend({

    /**
     * Constructor
     *
     * @param {AudioletNode} node The node which the input belongs to.
     * @param {Number} index The index of the input.
     */
    constructor: function(node, index) {
        AudioletClass.call(this);
        this.node = node;
        this.index = index;
        this.connectedTo = [];
        this.samples = [];

        this.linkedInput = null;
        this.numberOfChannels = 1;
    },

    /**
     * Connect the output to an input
     *
     * @param {AudioletInput} input The input to connect to.
     */
    connect: function(input) {
        this.connectedTo.push(input);
    },

    /**
     * Disconnect the output from an input
     *
     * @param {AudioletInput} input The input to disconnect from.
     */
    disconnect: function(input) {
        var numberOfStreams = this.connectedTo.length;
        for (var i = 0; i < numberOfStreams; i++) {
            if (input == this.connectedTo[i]) {
                this.connectedTo.splice(i, 1);
                break;
            }
        }
    },

    /**
     * Link the output to an input, forcing the output to always contain the
     * same number of channels as the input.
     *
     * @param {AudioletInput} input The input to link to.
     */
    linkNumberOfChannels: function(input) {
        this.linkedInput = input;
    },

    /**
     * Unlink the output from its linked input
     */
    unlinkNumberOfChannels: function() {
        this.linkedInput = null;
    },

    /**
     * Get the number of output channels, taking the value from the input if the
     * output is linked.
     *
     * @return {Number} The number of output channels.
     */
    getNumberOfChannels: function() {
        if (this.linkedInput && this.linkedInput.connectedFrom.length) {
            return (this.linkedInput.samples.length);
        }
        return (this.numberOfChannels);
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return this.node.toString() + 'Output #' + this.index + ' - ';
    }

});
/*!
 * @depends AudioletClass.js
 */

/**
 * AudioletParameters are used to provide either constant or varying values to
 * be used inside AudioletNodes.  AudioletParameters hold a static value, and
 * can also be linked to an AudioletInput.  If a node or group is connected to
 * the linked input, then the dynamic value taken from the node should be
 * prioritised over the stored static value.  If no node is connected then the
 * static value should be used.
 */
var AudioletParameter = AudioletClass.extend({

    /**
     * Constructor
     *
     * @param {AudioletNode} node The node which the parameter is associated with.
     * @param {Number} [inputIndex] The index of the AudioletInput to link to.
     * @param {Number} [value=0] The initial static value to store.
     */
    constructor: function(node, inputIndex, value) {
        AudioletClass.call(this);
        this.node = node;
        if (typeof inputIndex != 'undefined' && inputIndex != null) {
            this.input = node.inputs[inputIndex];
        }
        else {
            this.input = null;
        }
        this.value = value || 0;
    },

    /**
     * Check whether the static value should be used.
     *
     * @return {Boolean} True if the static value should be used.
     */
    isStatic: function() {
        return (this.input.samples.length == 0);
    },

    /**
     * Check whether the dynamic values should be used.
     *
     * @return {Boolean} True if the dynamic values should be used.
     */
    isDynamic: function() {
        return (this.input.samples.length > 0);
    },

    /**
     * Set the stored static value
     *
     * @param {Number} value The value to store.
     */
    setValue: function(value) {
        this.value = value;
    },

    /**
     * Get the stored static value
     *
     * @return {Number} The stored static value.
     */
    getValue: function() {
        if (this.input != null && this.input.samples.length > 0) {
            return this.input.samples[0];
        }
        else {
            return this.value;
        }
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * A type of AudioletNode designed to allow AudioletGroups to exactly replicate
 * the behaviour of AudioletParameters.  By linking one of the group's inputs
 * to the ParameterNode's input, and calling `this.parameterName =
 * parameterNode` in the group's constructor, `this.parameterName` will behave
 * as if it were an AudioletParameter contained within an AudioletNode.
 *
 * **Inputs**
 *
 * - Parameter input
 *
 * **Outputs**
 *
 * - Parameter value
 *
 * **Parameters**
 *
 * - parameter The contained parameter.  Linked to input 0.
 */
var ParameterNode = AudioletNode.extend({

  /**
   * Constructor
   *
   * @extends AudioletNode
   * @param {Audiolet} audiolet The audiolet object.
   * @param {Number} value The initial static value of the parameter.
   */
  constructor: function(audiolet, value) {
      AudioletNode.call(this, audiolet, 1, 1);
      this.parameter = new AudioletParameter(this, 0, value);
  },

  /**
   * Process samples
   */
  generate: function() {
      this.outputs[0].samples[0] = this.parameter.getValue();
  },

  /**
   * toString
   *
   * @return {String} String representation.
   */
  toString:function() {
      return 'Parameter Node';
  }

});
/*!
 * @depends AudioletNode.js
 */

/**
 * A specialized type of AudioletNode where values from the inputs are passed
 * straight to the corresponding outputs in the most efficient way possible.
 * PassThroughNodes are used in AudioletGroups to provide the inputs and
 * outputs, and can also be used in analysis nodes where no modifications to
 * the incoming audio are made.
 */
var PassThroughNode = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} numberOfInputs The number of inputs.
     * @param {Number} numberOfOutputs The number of outputs.
     */
    constructor: function(audiolet, numberOfInputs, numberOfOutputs) {
        AudioletNode.call(this, audiolet, numberOfInputs, numberOfOutputs);
    },

    /**
     * Create output samples for each channel, copying any input samples to
     * the corresponding outputs.
     */
    createOutputSamples: function() {
        var numberOfOutputs = this.outputs.length;
        // Copy the inputs buffers straight to the output buffers
        for (var i = 0; i < numberOfOutputs; i++) {
            var input = this.inputs[i];
            var output = this.outputs[i];
            if (input && input.samples.length != 0) {
                // Copy the input buffer straight to the output buffers
                output.samples = input.samples;
            }
            else {
                // Create the correct number of output samples
                var numberOfChannels = output.getNumberOfChannels();
                if (output.samples.length == numberOfChannels) {
                    continue;
                }
                else if (output.samples.length > numberOfChannels) {
                    output.samples = output.samples.slice(0, numberOfChannels);
                    continue;
                }

                for (var j = output.samples.length; j < numberOfChannels; j++) {
                    output.samples[j] = 0;
                }
            }
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Pass Through Node';
    }

});
/*!
 * @depends AudioletClass.js
 */

/**
 * Priority Queue based on python heapq module
 * http://svn.python.org/view/python/branches/release27-maint/Lib/heapq.py
 */
var PriorityQueue = AudioletClass.extend({

    /**
     * Constructor
     *
     * @param {Object[]} [array] Initial array of values to store.
     * @param {Function} [compare] Compare function.
     */
    constructor: function(array, compare) {
        AudioletClass.call(this);
        if (compare) {
            this.compare = compare;
        }

        if (array) {
            this.heap = array;
            for (var i = 0; i < Math.floor(this.heap.length / 2); i++) {
                this.siftUp(i);
            }
        }
        else {
            this.heap = [];
        }
    },

    /**
     * Add an item to the queue
     *
     * @param {Object} item The item to add.
     */
    push: function(item) {
        this.heap.push(item);
        this.siftDown(0, this.heap.length - 1);
    },

    /**
     * Remove and return the top item from the queue.
     *
     * @return {Object} The top item.
     */
    pop: function() {
        var lastElement, returnItem;
        lastElement = this.heap.pop();
        if (this.heap.length) {
            var returnItem = this.heap[0];
            this.heap[0] = lastElement;
            this.siftUp(0);
        }
        else {
            returnItem = lastElement;
        }
        return (returnItem);
    },

    /**
     * Return the top item from the queue, without removing it.
     *
     * @return {Object} The top item.
     */
    peek: function() {
        return (this.heap[0]);
    },

    /**
     * Check whether the queue is empty.
     *
     * @return {Boolean} True if the queue is empty.
     */
    isEmpty: function() {
        return (this.heap.length == 0);
    },


    /**
     * Sift item down the queue.
     *
     * @param {Number} startPosition Queue start position.
     * @param {Number} position Item position.
     */
    siftDown: function(startPosition, position) {
        var newItem = this.heap[position];
        while (position > startPosition) {
            var parentPosition = (position - 1) >> 1;
            var parent = this.heap[parentPosition];
            if (this.compare(newItem, parent)) {
                this.heap[position] = parent;
                position = parentPosition;
                continue;
            }
            break;
        }
        this.heap[position] = newItem;
    },

    /**
     * Sift item up the queue.
     *
     * @param {Number} position Item position.
     */
    siftUp: function(position) {
        var endPosition = this.heap.length;
        var startPosition = position;
        var newItem = this.heap[position];
        var childPosition = 2 * position + 1;
        while (childPosition < endPosition) {
            var rightPosition = childPosition + 1;
            if (rightPosition < endPosition &&
                !this.compare(this.heap[childPosition],
                              this.heap[rightPosition])) {
                childPosition = rightPosition;
            }
            this.heap[position] = this.heap[childPosition];
            position = childPosition;
            childPosition = 2 * position + 1;
        }
        this.heap[position] = newItem;
        this.siftDown(startPosition, position);
    },

    /**
     * Default compare function.
     *
     * @param {Number} a First item.
     * @param {Number} b Second item.
     * @return {Boolean} True if a < b.
     */
    compare: function(a, b) {
        return (a < b);
    }

});
/*!
 * @depends PassThroughNode.js
 */

/**
 * A sample-accurate scheduler built as an AudioletNode.  The scheduler works
 * by storing a queue of events, and running callback functions when the
 * correct sample is being processed.  All timing and events are handled in
 * beats, which are converted to sample positions using a master tempo.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Audio
 */
var Scheduler = PassThroughNode.extend({

    /**
     * Constructor
     *
     * @extends PassThroughNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [bpm=120] Initial tempo.
     */
    constructor: function(audiolet, bpm) {
        PassThroughNode.call(this, audiolet, 1, 1);
        this.linkNumberOfOutputChannels(0, 0);
        this.bpm = bpm || 120;
        this.queue = new PriorityQueue(null, function(a, b) {
            return (a.time < b.time);
        });

        this.time = 0;
        this.beat = 0;
        this.beatInBar = 0;
        this.bar = 0;
        this.seconds = 0;
        this.beatsPerBar = 0;

        this.lastBeatTime = 0;
        this.beatLength = 60 / this.bpm * this.audiolet.device.sampleRate;
    },

    /**
     * Set the tempo of the scheduler.
     *
     * @param {Number} bpm The tempo in beats per minute.
     */
    setTempo:function(bpm) {
        this.bpm = bpm;
        this.beatLength = 60 / this.bpm * this.audiolet.device.sampleRate;
    },

    /**
     * Add an event relative to the current write position
     *
     * @param {Number} beats How many beats in the future to schedule the event.
     * @param {Function} callback A function called when it is time for the event.
     * @return {Object} The event object.
     */
    addRelative:function(beats, callback) {
        var event = {};
        event.callback = callback;
        event.time = this.time + beats * this.beatLength;
        this.queue.push(event);
        return event;
    },

    /**
     * Add an event at an absolute beat position
     *
     * @param {Number} beat The beat at which the event should take place.
     * @param {Function} callback A function called when it is time for the event.
     * @return {Object} The event object.
     */
    addAbsolute:function(beat, callback) {
        if (beat < this.beat ||
            beat == this.beat && this.time > this.lastBeatTime) {
            // Nah
            return null;
        }
        var event = {};
        event.callback = callback;
        event.time = this.lastBeatTime + (beat - this.beat) * this.beatLength;
        this.queue.push(event);
        return event;
    },

    /**
     * Schedule patterns to play, and provide the values generated to a callback.
     * The durationPattern argument can be either a number, giving a constant time
     * between each event, or a pattern, allowing varying time difference.
     *
     * @param {Pattern[]} patterns An array of patterns to play.
     * @param {Pattern|Number} durationPattern The number of beats between events.
     * @param {Function} callback Function called with the generated pattern values.
     * @return {Object} The event object.
     */
    play:function(patterns, durationPattern, callback) {
        var event = {};
        event.patterns = patterns;
        event.durationPattern = durationPattern;
        event.callback = callback;
        // TODO: Quantizing start time
        event.time = this.audiolet.device.getWriteTime();
        this.queue.push(event);
        return event;
    },

    /**
     * Schedule patterns to play starting at an absolute beat position,
     * and provide the values generated to a callback.
     * The durationPattern argument can be either a number, giving a constant time
     * between each event, or a pattern, allowing varying time difference.
     *
     * @param {Number} beat The beat at which the event should take place.
     * @param {Pattern[]} patterns An array of patterns to play.
     * @param {Pattern|Number} durationPattern The number of beats between events.
     * @param {Function} callback Function called with the generated pattern values.
     * @return {Object} The event object.
     */
    playAbsolute:function(beat, patterns, durationPattern,
                                                callback) {
        if (beat < this.beat ||
            beat == this.beat && this.time > this.lastBeatTime) {
            // Nah
            return null;
        }
        var event = {};
        event.patterns = patterns;
        event.durationPattern = durationPattern;
        event.callback = callback;
        event.time = this.lastBeatTime + (beat - this.beat) * this.beatLength;
        this.queue.push(event);
        return event;
    },


    /**
     * Remove a scheduled event from the scheduler
     *
     * @param {Object} event The event to remove.
     */
    remove:function(event) {
        var idx = this.queue.heap.indexOf(event);
        if (idx != -1) {
            this.queue.heap.splice(idx, 1);
            // Recreate queue with event removed
            this.queue = new PriorityQueue(this.queue.heap, function(a, b) {
                return (a.time < b.time);
            });
        }
    },

    /**
     * Alias for remove, so for simple events we have add/remove, and for patterns
     * we have play/stop.
     *
     * @param {Object} event The event to remove.
     */
    stop:function(event) {
        this.remove(event);
    },

    /**
     * Overridden tick method.  Process any events which are due to take place
     * either now or previously.
     */
    tick:function() {
        PassThroughNode.prototype.tick.call(this);
        this.tickClock();

        while (!this.queue.isEmpty() &&
               this.queue.peek().time <= this.time) {
            var event = this.queue.pop();
            this.processEvent(event);
        }
    },

    /**
     * Update the various representations of time within the scheduler.
     */
    tickClock:function() {
        this.time += 1;
        this.seconds = this.time / this.audiolet.device.sampleRate;
        if (this.time >= this.lastBeatTime + this.beatLength) {
            this.beat += 1;
            this.beatInBar += 1;
            if (this.beatInBar == this.beatsPerBar) {
                this.bar += 1;
                this.beatInBar = 0;
            }
            this.lastBeatTime += this.beatLength;
        }
    },

    /**
     * Process a single event, grabbing any necessary values, calling the event's
     * callback, and rescheduling it if necessary.
     *
     * @param {Object} event The event to process.
     */
    processEvent:function(event) {
        var durationPattern = event.durationPattern;
        if (durationPattern) {
            // Pattern event
            var args = [];
            var patterns = event.patterns;
            var numberOfPatterns = patterns.length;
            for (var i = 0; i < numberOfPatterns; i++) {
                var pattern = patterns[i];
                var value = pattern.next();
                if (value != null) {
                    args.push(value);
                }
                else {
                    // Null value for an argument, so don't process the
                    // callback or add any further events
                    return;
                }
            }
            event.callback.apply(null, args);

            var duration;
            if (durationPattern instanceof Pattern) {
                duration = durationPattern.next();
            }
            else {
                duration = durationPattern;
            }

            if (duration) {
                // Beats -> time
                event.time += duration * this.beatLength;
                this.queue.push(event);
            }
        }
        else {
            // Regular event
            event.callback();
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString:function() {
        return 'Scheduler';
    }

});
/**
 * Bidirectional shim for the renaming of slice to subarray.  Provides
 * backwards compatibility with old browser releases
 */
var Int8Array, Uint8Array, Int16Array, Uint16Array;
var Int32Array, Uint32Array, Float32Array, Float64Array;
var types = [Int8Array, Uint8Array, Int16Array, Uint16Array,
             Int32Array, Uint32Array, Float32Array, Float64Array];
var original, shim;
for (var i = 0; i < types.length; ++i) {
    if (types[i]) {
        if (types[i].prototype.slice === undefined) {
            original = 'subarray';
            shim = 'slice';
        }
        else if (types[i].prototype.subarray === undefined) {
            original = 'slice';
            shim = 'subarray';
        }
        Object.defineProperty(types[i].prototype, shim, {
            value: types[i].prototype[original],
            enumerable: false
        });
    }
}


/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * A generic envelope consisting of linear transitions of varying duration
 * between a series of values.
 *
 * **Inputs**
 *
 * - Gate
 *
 * **Outputs**
 *
 * - Envelope
 *
 * **Parameters**
 *
 * - gate Gate controlling the envelope.  Values should be 0 (off) or 1 (on).
 * Linked to input 0.
 */
var Envelope = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [gate=1] Initial gate value.
     * @param {Number[]} levels An array (of length n) of values to move between.
     * @param {Number[]} times An array of n-1 durations - one for each transition.
     * @param {Number} [releaseStage] Sustain at this stage until the the gate is 0.
     * @param {Function} [onComplete] Function called as the envelope finishes.
     */
    constructor: function(audiolet, gate, levels, times, releaseStage,
                        onComplete) {
        AudioletNode.call(this, audiolet, 1, 1);
        this.gate = new AudioletParameter(this, 0, gate || 1);

        this.levels = [];
        for (var i=0; i<levels.length; i++) {
            this.levels.push(new AudioletParameter(this, null, levels[i]));
        }

        this.times = [];
        for (var i=0; i<times.length; i++) {
            this.times.push(new AudioletParameter(this, null, times[i]));
        }

        this.releaseStage = releaseStage;
        this.onComplete = onComplete;

        this.stage = null;
        this.time = null;
        this.changeTime = null;

        this.level = this.levels[0].getValue();
        this.delta = 0;
        this.gateOn = false;
    },

    /**
     * Process samples
     */
    generate: function() {
        var gate = this.gate.getValue();

        var stageChanged = false;

        if (gate && !this.gateOn) {
            // Key pressed
            this.gateOn = true;
            this.stage = 0;
            this.time = 0;
            this.delta = 0;
            this.level = this.levels[0].getValue();
            if (this.stage != this.releaseStage) {
                stageChanged = true;
            }
        }

        if (this.gateOn && !gate) {
            // Key released
            this.gateOn = false;
            if (this.releaseStage != null) {
                // Jump to the release stage
                this.stage = this.releaseStage;
                stageChanged = true;
            }
        }

        if (this.changeTime) {
            // We are not sustaining, and we are playing, so increase the
            // time
            this.time += 1;
            if (this.time >= this.changeTime) {
                // Need to go to the next stage
                this.stage += 1;
                if (this.stage != this.releaseStage) {
                    stageChanged = true;
                }
                else {
                    // If we reach the release stage then sustain the value
                    // until the gate is released rather than moving on
                    // to the next level.
                    this.changeTime = null;
                    this.delta = 0;
                }
            }
        }

        if (stageChanged) {
    //        level = this.levels[stage];
            if (this.stage != this.times.length) {
                // Actually update the variables
                this.delta = this.calculateDelta(this.stage, this.level);
                this.changeTime = this.calculateChangeTime(this.stage, this.time);
            }
            else {
                // Made it to the end, so finish up
                if (this.onComplete) {
                    this.onComplete();
                }
                this.stage = null;
                this.time = null;
                this.changeTime = null;

                this.delta = 0;
            }
        }

        this.level += this.delta;
        this.outputs[0].samples[0] = this.level;
    },

    /**
     * Calculate the change in level needed each sample for a section
     *
     * @param {Number} stage The index of the current stage.
     * @param {Number} level The current level.
     * @return {Number} The change in level.
     */
    calculateDelta: function(stage, level) {
        var delta = this.levels[stage + 1].getValue() - level;
        var stageTime = this.times[stage].getValue() *
                        this.audiolet.device.sampleRate;
        return (delta / stageTime);
    },

    /**
     * Calculate the time in samples at which the next stage starts
     *
     * @param {Number} stage The index of the current stage.
     * @param {Number} time The current time.
     * @return {Number} The change time.
     */
    calculateChangeTime: function(stage, time) {
        var stageTime = this.times[stage].getValue() *
                        this.audiolet.device.sampleRate;
        return (time + stageTime);
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Envelope';
    }

});
/*!
 * @depends Envelope.js
 */

/**
 * Linear attack-decay-sustain-release envelope
 *
 * **Inputs**
 *
 * - Gate
 *
 * **Outputs**
 *
 * - Envelope
 *
 * **Parameters**
 *
 * - gate The gate turning the envelope on and off.  Value changes from 0 -> 1
 * trigger the envelope.  Value changes from 1 -> 0 make the envelope move to
 * its release stage.  Linked to input 0.
 */
var ADSREnvelope = Envelope.extend({

    /**
     * Constructor
     *
     * @extends Envelope
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} gate The initial gate value.
     * @param {Number} attack The attack time in seconds.
     * @param {Number} decay The decay time in seconds.
     * @param {Number} sustain The sustain level (between 0 and 1).
     * @param {Number} release The release time in seconds.
     * @param {Function} onComplete A function called after the release stage.
     */
    constructor: function(audiolet, gate, attack, decay, sustain, release,
                              onComplete) {
        var levels = [0, 1, sustain, 0];
        var times = [attack, decay, release];
        Envelope.call(this, audiolet, gate, levels, times, 2, onComplete);

        this.attack = this.times[0];
        this.decay = this.times[1];
        this.sustain = this.levels[2];
        this.release = this.levels[2];
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'ADSR Envelope';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Generic biquad filter.  The coefficients (a0, a1, a2, b0, b1 and b2) are set
 * using the calculateCoefficients function, which should be overridden and
 * will be called automatically when new values are needed.
 *
 * **Inputs**
 *
 * - Audio
 * - Filter frequency
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - frequency The filter frequency.  Linked to input 1.
 */
var BiquadFilter = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} frequency The initial frequency.
     */
    constructor: function(audiolet, frequency) {
        AudioletNode.call(this, audiolet, 2, 1);

        // Same number of output channels as input channels
        this.linkNumberOfOutputChannels(0, 0);

        this.frequency = new AudioletParameter(this, 1, frequency || 22100);
        this.lastFrequency = null; // See if we need to recalculate coefficients

        // Delayed values
        this.xValues = [];
        this.yValues = [];

        // Coefficients
        this.b0 = 0;
        this.b1 = 0;
        this.b2 = 0;
        this.a0 = 0;
        this.a1 = 0;
        this.a2 = 0;
    },

    /**
     * Calculate the biquad filter coefficients.  This should be overridden.
     *
     * @param {Number} frequency The filter frequency.
     */
    calculateCoefficients: function(frequency) {
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0]
        var xValueArray = this.xValues;
        var yValueArray = this.yValues;

        var frequency = this.frequency.getValue();

        if (frequency != this.lastFrequency) {
            // Recalculate the coefficients
            this.calculateCoefficients(frequency);
            this.lastFrequency = frequency;
        }

        var a0 = this.a0;
        var a1 = this.a1;
        var a2 = this.a2;
        var b0 = this.b0;
        var b1 = this.b1;
        var b2 = this.b2;

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            if (i >= xValueArray.length) {
                xValueArray.push([0, 0]);
                yValueArray.push([0, 0]);
            }

            var xValues = xValueArray[i];
            var x1 = xValues[0];
            var x2 = xValues[1];
            var yValues = yValueArray[i];
            var y1 = yValues[0];
            var y2 = yValues[1];

            var x0 = input.samples[i];
            var y0 = (b0 / a0) * x0 +
                     (b1 / a0) * x1 +
                     (b2 / a0) * x2 -
                     (a1 / a0) * y1 -
                     (a2 / a0) * y2;

            output.samples[i] = y0;

            xValues[0] = x0;
            xValues[1] = x1;
            yValues[0] = y0;
            yValues[1] = y1;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Biquad Filter';
    }

});
/*!
 * @depends BiquadFilter.js
 */

/**
 * All-pass filter
 *
 * **Inputs**
 *
 * - Audio
 * - Filter frequency
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - frequency The filter frequency.  Linked to input 1.
 */
var AllPassFilter = BiquadFilter.extend({

    /**
     * Constructor
     *
     * @extends BiquadFilter
     *
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} frequency The initial frequency.
     */
    constructor: function(audiolet, frequency) {
        BiquadFilter.call(this, audiolet, frequency);
    },

    /**
     * Calculate the biquad filter coefficients using maths from
     * http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
     *
     * @param {Number} frequency The filter frequency.
     */
    calculateCoefficients: function(frequency) {
        var w0 = 2 * Math.PI * frequency /
                 this.audiolet.device.sampleRate;
        var cosw0 = Math.cos(w0);
        var sinw0 = Math.sin(w0);
        var alpha = sinw0 / (2 / Math.sqrt(2));

        this.b0 = 1 - alpha;
        this.b1 = -2 * cosw0;
        this.b2 = 1 + alpha;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'All Pass Filter';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Amplitude envelope follower
 *
 * **Inputs**
 *
 * - Audio
 * - Attack time
 * - Release time
 *
 * **Outputs**
 *
 * - Amplitude envelope
 *
 * **Parameters**
 *
 * - attack The attack time of the envelope follower.  Linked to input 1.
 * - release The release time of the envelope follower.  Linked to input 2.
 */
var Amplitude  = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [attack=0.01] The initial attack time in seconds.
     * @param {Number} [release=0.01] The initial release time in seconds.
     */
    constructor: function(audiolet, attack, release) {
        AudioletNode.call(this, audiolet, 3, 1);
        this.linkNumberOfOutputChannels(0, 0);

        this.followers = [];

        this.attack = new AudioletParameter(this, 1, attack || 0.01);
        this.release = new AudioletParameter(this, 2, release || 0.01);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var followers = this.followers;
        var numberOfFollowers = followers.length;

        var sampleRate = this.audiolet.device.sampleRate;

        // Local processing variables
        var attack = this.attack.getValue();
        attack = Math.pow(0.01, 1 / (attack * sampleRate));
        var release = this.release.getValue();
        release = Math.pow(0.01, 1 / (release * sampleRate));

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            if (i >= numberOfFollowers) {
                followers.push(0);
            }
            var follower = followers[i];

            var value = Math.abs(input.samples[i]);
            if (value > follower) {
                follower = attack * (follower - value) + value;
            }
            else {
                follower = release * (follower - value) + value;
            }
            output.samples[i] = follower;
            followers[i] = follower;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return ('Amplitude');
    }

});
/*!
 * @depends ../core/PassThroughNode.js
 */

/**
 * Detect potentially hazardous values in the audio stream.  Looks for
 * undefineds, nulls, NaNs and Infinities.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Audio
 */
var BadValueDetector = PassThroughNode.extend({

    /**
     * Constructor
     *
     * @extends PassThroughNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Function} [callback] Function called if a bad value is detected.
     */
    constructor: function(audiolet, callback) {
        PassThroughNode.call(this, audiolet, 1, 1);
        this.linkNumberOfOutputChannels(0, 0);

        if (callback) {
            this.callback = callback;
        }
    },

    /**
     * Default callback.  Logs the value and position of the bad value.
     *
     * @param {Number|Object|'undefined'} value The value detected.
     * @param {Number} channel The index of the channel the value was found in.
     * @param {Number} index The sample index the value was found at.
     */
    callback: function(value, channel) {
        console.error(value + ' detected at channel ' + channel);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            var value = input.samples[i];
            if (typeof value == 'undefined' ||
                value == null ||
                isNaN(value) ||
                value == Infinity ||
                value == -Infinity) {
                this.callback(value, i);
            }
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Bad Value Detector';
    }

});
/*!
 * @depends BiquadFilter.js
 */

/**
 * Band-pass filter
 *
 * **Inputs**
 *
 * - Audio
 * - Filter frequency
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - frequency The filter frequency.  Linked to input 1.
 */
var BandPassFilter = BiquadFilter.extend({

    /**
     * Constructor
     *
     * @extends BiquadFilter
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} frequency The initial frequency.
     */
    constructor: function(audiolet, frequency) {
        BiquadFilter.call(this, audiolet, frequency);
    },

    /**
     * Calculate the biquad filter coefficients using maths from
     * http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
     *
     * @param {Number} frequency The filter frequency.
     */
    calculateCoefficients: function(frequency) {
        var w0 = 2 * Math.PI * frequency / this.audiolet.device.sampleRate;
        var cosw0 = Math.cos(w0);
        var sinw0 = Math.sin(w0);
        var alpha = sinw0 / (2 / Math.sqrt(2));

        this.b0 = alpha;
        this.b1 = 0;
        this.b2 = -alpha;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Band Pass Filter';
    }

});
/*!
 * @depends BiquadFilter.js
 */

/**
 * Band-reject filter
 *
 * **Inputs**
 *
 * - Audio
 * - Filter frequency
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - frequency The filter frequency.  Linked to input 1.
 */
var BandRejectFilter = BiquadFilter.extend({

    /**
     * Constructor
     *
     * @extends BiquadFilter
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} frequency The initial frequency.
     */
    constructor: function(audiolet, frequency) {
        BiquadFilter.call(this, audiolet, frequency);
    },

    /**
     * Calculate the biquad filter coefficients using maths from
     * http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
     *
     * @param {Number} frequency The filter frequency.
     */
    calculateCoefficients: function(frequency) {
        var w0 = 2 * Math.PI * frequency /
                 this.audiolet.device.sampleRate;
        var cosw0 = Math.cos(w0);
        var sinw0 = Math.sin(w0);
        var alpha = sinw0 / (2 / Math.sqrt(2));

        this.b0 = 1;
        this.b1 = -2 * cosw0;
        this.b2 = 1;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Band Reject Filter';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Reduce the bitrate of incoming audio
 *
 * **Inputs**
 *
 * - Audio 1
 * - Number of bits
 *
 * **Outputs**
 *
 * - Bit Crushed Audio
 *
 * **Parameters**
 *
 * - bits The number of bit to reduce to.  Linked to input 1.
 */
var BitCrusher = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} bits The initial number of bits.
     */
    constructor: function(audiolet, bits) {
        AudioletNode.call(this, audiolet, 2, 1);
        this.linkNumberOfOutputChannels(0, 0);
        this.bits = new AudioletParameter(this, 1, bits);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];

        var maxValue = Math.pow(2, this.bits.getValue()) - 1;

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            this.outputs[0].samples[i] = Math.floor(input.samples[i] * maxValue) /
                                         maxValue;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'BitCrusher';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Play the contents of an audio buffer
 *
 * **Inputs**
 *
 * - Playback rate
 * - Restart trigger
 * - Start position
 * - Loop on/off
 *
 * **Outputs**
 *
 * - Audio
 *
 * **Parameters**
 *
 * - playbackRate The rate that the buffer should play at.  Value of 1 plays at
 * the regular rate.  Values > 1 are pitched up.  Values < 1 are pitched down.
 * Linked to input 0.
 * - restartTrigger Changes of value from 0 -> 1 restart the playback from the
 * start position.  Linked to input 1.
 * - startPosition The position at which playback should begin.  Values between
 * 0 (the beginning of the buffer) and 1 (the end of the buffer).  Linked to
 * input 2.
 * - loop Whether the buffer should loop when it reaches the end.  Linked to
 * input 3
 */
var BufferPlayer = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {AudioletBuffer} buffer The buffer to play.
     * @param {Number} [playbackRate=1] The initial playback rate.
     * @param {Number} [startPosition=0] The initial start position.
     * @param {Number} [loop=0] Initial value for whether to loop.
     * @param {Function} [onComplete] Called when the buffer has finished playing.
     */
    constructor: function(audiolet, buffer, playbackRate, startPosition,
                            loop, onComplete) {
        AudioletNode.call(this, audiolet, 3, 1);
        this.buffer = buffer;
        this.setNumberOfOutputChannels(0, this.buffer.numberOfChannels);
        this.position = startPosition || 0;
        this.playbackRate = new AudioletParameter(this, 0, playbackRate || 1);
        this.restartTrigger = new AudioletParameter(this, 1, 0);
        this.startPosition = new AudioletParameter(this, 2, startPosition || 0);
        this.loop = new AudioletParameter(this, 3, loop || 0);
        this.onComplete = onComplete;

        this.restartTriggerOn = false;
        this.playing = true;
    },

    /**
     * Process samples
     */
    generate: function() {
        var output = this.outputs[0];

        // Cache local variables
        var numberOfChannels = output.samples.length;

        if (this.buffer.length == 0 || !this.playing) {
            // No buffer data, or not playing, so output zeros and return
            for (var i=0; i<numberOfChannels; i++) {
                output.samples[i] = 0;
            }
            return;
        }

        // Crap load of parameters
        var playbackRate = this.playbackRate.getValue();
        var restartTrigger = this.restartTrigger.getValue();
        var startPosition = this.startPosition.getValue();
        var loop = this.loop.getValue();

        if (restartTrigger > 0 && !this.restartTriggerOn) {
            // Trigger moved from <=0 to >0, so we restart playback from
            // startPosition
            this.position = startPosition;
            this.restartTriggerOn = true;
            this.playing = true;
        }

        if (restartTrigger <= 0 && this.restartTriggerOn) {
            // Trigger moved back to <= 0
            this.restartTriggerOn = false;
        }

        var numberOfChannels = this.buffer.channels.length;

        for (var i = 0; i < numberOfChannels; i++) {
            var inputChannel = this.buffer.getChannelData(i);
            output.samples[i] = inputChannel[Math.floor(this.position)];
        }
        
        this.position += playbackRate;

        if (this.position >= this.buffer.length) {
            if (loop) {
                // Back to the start
                this.position %= this.buffer.length;
            }
            else {
                // Finish playing until a new restart trigger
                this.playing = false;
                if (this.onComplete) {
                   this.onComplete();
                }
            }
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return ('Buffer player');
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Undamped comb filter
 *
 * **Inputs**
 *
 * - Audio
 * - Delay Time
 * - Decay Time
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - delayTime The delay time in seconds.  Linked to input 1.
 * - decayTime Time for the echoes to decay by 60dB.  Linked to input 0.
 */
var CombFilter = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} maximumDelayTime The largest allowable delay time.
     * @param {Number} delayTime The initial delay time.
     * @param {Number} decayTime The initial decay time.
     */
    constructor: function(audiolet, maximumDelayTime, delayTime, decayTime) {
        AudioletNode.call(this, audiolet, 3, 1);
        this.linkNumberOfOutputChannels(0, 0);
        this.maximumDelayTime = maximumDelayTime;
        this.delayTime = new AudioletParameter(this, 1, delayTime || 1);
        this.decayTime = new AudioletParameter(this, 2, decayTime);
        this.buffers = [];
        this.readWriteIndex = 0;
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var sampleRate = this.audiolet.device.sampleRate;

        var delayTime = this.delayTime.getValue() * sampleRate;
        var decayTime = this.decayTime.getValue() * sampleRate;
        var feedback = Math.exp(-3 * delayTime / decayTime);

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            if (i >= this.buffers.length) {
                // Create buffer for channel if it doesn't already exist
                var bufferSize = this.maximumDelayTime * sampleRate;
                this.buffers.push(new Float32Array(bufferSize));
            }

            var buffer = this.buffers[i];
            var outputValue = buffer[this.readWriteIndex];
            output.samples[i] = outputValue;
            buffer[this.readWriteIndex] = input.samples[i] + feedback * outputValue;
        }

        this.readWriteIndex += 1;
        if (this.readWriteIndex >= delayTime) {
            this.readWriteIndex = 0;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Comb Filter';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Sine wave oscillator
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Sine wave
 *
 * **Parameters**
 *
 * - frequency The frequency of the oscillator.  Linked to input 0.
 */
var Sine = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [frequency=440] Initial frequency.
     */
    constructor: function(audiolet, frequency) {
        AudioletNode.call(this, audiolet, 1, 1);
        this.frequency = new AudioletParameter(this, 0, frequency || 440);
        this.phase = 0;
    },

    /**
     * Process samples
     */
    generate: function() {
        var output = this.outputs[0];

        var frequency = this.frequency.getValue();
        var sampleRate = this.audiolet.device.sampleRate;

        output.samples[0] = Math.sin(this.phase);

        this.phase += 2 * Math.PI * frequency / sampleRate;
        if (this.phase > 2 * Math.PI) {
            this.phase %= 2 * Math.PI;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Sine';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 * @depends Sine.js
 */

/**
 * Equal-power cross-fade between two signals
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 * - Fade Position
 *
 * **Outputs**
 *
 * - Mixed audio
 *
 * **Parameters**
 *
 * - position The fade position.  Values between 0 (Audio 1 only) and 1 (Audio
 * 2 only).  Linked to input 2.
 */
var CrossFade = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [position=0.5] The initial fade position.
     */
    constructor: function(audiolet, position) {
        AudioletNode.call(this, audiolet, 3, 1);
        this.linkNumberOfOutputChannels(0, 0);
        this.position = new AudioletParameter(this, 2, position || 0.5);
    },

    /**
     * Process samples
     */
    generate: function() {
        var inputA = this.inputs[0];
        var inputB = this.inputs[1];
        var output = this.outputs[0];

        // Local processing variables
        var position = this.position.getValue();

        var scaledPosition = position * Math.PI / 2;
        var gainA = Math.cos(scaledPosition);
        var gainB = Math.sin(scaledPosition);

        var numberOfChannels = output.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            var valueA = inputA.samples[i] || 0;
            var valueB = inputB.samples[i] || 0;
            output.samples[i] = valueA * gainA + valueB * gainB;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Cross Fader';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Filter for leaking DC offset.  Maths is taken from
 * https://ccrma.stanford.edu/~jos/filters/DC_Blocker.html
 *
 * **Inputs**
 *
 * - Audio
 * - Filter coefficient
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - coefficient The filter coefficient.  Linked to input 1.
 */
var DCFilter = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [coefficient=0.995] The initial coefficient.
     */
    constructor: function(audiolet, coefficient) {
        AudioletNode.call(this, audiolet, 2, 1);

        // Same number of output channels as input channels
        this.linkNumberOfOutputChannels(0, 0);

        this.coefficient = new AudioletParameter(this, 1, coefficient || 0.995);

        // Delayed values
        this.xValues = [];
        this.yValues = [];
    },

    /**
     * Process samples
     */
    generate: function() {
        var coefficient = this.coefficient.getValue();
        var input = this.inputs[0];
        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            if (i >= this.xValues.length) {
                this.xValues.push(0);
            }
            if (i >= this.yValues.length) {
                this.yValues.push(0);
            }

            var x0 = input.samples[i];
            var y0 = x0 - this.xValues[i] + coefficient * this.yValues[i];

            this.outputs[0].samples[i] = y0;

            this.xValues[i] = x0;
            this.yValues[i] = y0;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'DC Filter';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Damped comb filter
 *
 * **Inputs**
 *
 * - Audio
 * - Delay Time
 * - Decay Time
 * - Damping
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - delayTime The delay time in seconds.  Linked to input 1.
 * - decayTime Time for the echoes to decay by 60dB.  Linked to input 2.
 * - damping The amount of high-frequency damping of echoes.  Linked to input 3.
 */
var DampedCombFilter = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} maximumDelayTime The largest allowable delay time.
     * @param {Number} delayTime The initial delay time.
     * @param {Number} decayTime The initial decay time.
     * @param {Number} damping The initial amount of damping.
     */
    constructor: function(audiolet, maximumDelayTime, delayTime,
                                decayTime, damping) {
        AudioletNode.call(this, audiolet, 4, 1);
        this.linkNumberOfOutputChannels(0, 0);
        this.maximumDelayTime = maximumDelayTime;
        this.delayTime = new AudioletParameter(this, 1, delayTime || 1);
        this.decayTime = new AudioletParameter(this, 2, decayTime);
        this.damping = new AudioletParameter(this, 3, damping);
        var bufferSize = maximumDelayTime * this.audiolet.device.sampleRate;
        this.buffers = [];
        this.readWriteIndex = 0;
        this.filterStores = [];
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var sampleRate = this.audiolet.device.sampleRate;

        var delayTime = this.delayTime.getValue() * sampleRate;
        var decayTime = this.decayTime.getValue() * sampleRate;
        var damping = this.damping.getValue();
        var feedback = Math.exp(-3 * delayTime / decayTime);

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            if (i >= this.buffers.length) {
                var bufferSize = this.maximumDelayTime * sampleRate;
                this.buffers.push(new Float32Array(bufferSize));
            }

            if (i >= this.filterStores.length) {
                this.filterStores.push(0);
            }

            var buffer = this.buffers[i];
            var filterStore = this.filterStores[i];

            var outputValue = buffer[this.readWriteIndex];
            filterStore = (outputValue * (1 - damping)) +
                          (filterStore * damping);
            output.samples[i] = outputValue;
            buffer[this.readWriteIndex] = input.samples[i] +
                                          feedback * filterStore;

            this.filterStores[i] = filterStore;
        }

        this.readWriteIndex += 1;
        if (this.readWriteIndex >= delayTime) {
            this.readWriteIndex = 0;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Damped Comb Filter';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * A simple delay line.
 *
 * **Inputs**
 *
 * - Audio
 * - Delay Time
 *
 * **Outputs**
 *
 * - Delayed audio
 *
 * **Parameters**
 *
 * - delayTime The delay time in seconds.  Linked to input 1.
 */
var Delay = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} maximumDelayTime The largest allowable delay time.
     * @param {Number} delayTime The initial delay time.
     */
    constructor: function(audiolet, maximumDelayTime, delayTime) {
        AudioletNode.call(this, audiolet, 2, 1);
        this.linkNumberOfOutputChannels(0, 0);
        this.maximumDelayTime = maximumDelayTime;
        this.delayTime = new AudioletParameter(this, 1, delayTime || 1);
        var bufferSize = maximumDelayTime * this.audiolet.device.sampleRate;
        this.buffers = [];
        this.readWriteIndex = 0;
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var sampleRate = this.audiolet.device.sampleRate;

        var delayTime = this.delayTime.getValue() * sampleRate;

        var numberOfChannels = input.samples.length;

        for (var i = 0; i < numberOfChannels; i++) {
            if (i >= this.buffers.length) {
                var bufferSize = this.maximumDelayTime * sampleRate;
                this.buffers.push(new Float32Array(bufferSize));
            }

            var buffer = this.buffers[i];
            output.samples[i] = buffer[this.readWriteIndex];
            buffer[this.readWriteIndex] = input.samples[i];
        }

        this.readWriteIndex += 1;
        if (this.readWriteIndex >= delayTime) {
            this.readWriteIndex = 0;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Delay';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Detect discontinuities in the input stream.  Looks for consecutive samples
 * with a difference larger than a threshold value.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Audio
 */
var DiscontinuityDetector = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends PassThroughNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [threshold=0.2] The threshold value.
     * @param {Function} [callback] Function called if a discontinuity is detected.
     */
    constructor: function(audiolet, threshold, callback) {
        AudioletNode.call(this, audiolet, 1, 1);
        this.linkNumberOfOutputChannels(0, 0);

        this.threshold = threshold || 0.2;
        if (callback) {
            this.callback = callback;
        }
        this.lastValues = [];

    },

    /**
     * Default callback.  Logs the size and position of the discontinuity.
     *
     * @param {Number} size The size of the discontinuity.
     * @param {Number} channel The index of the channel the samples were found in.
     * @param {Number} index The sample index the discontinuity was found at.
     */
    callback: function(size, channel) {
        console.error('Discontinuity of ' + size + ' detected on channel ' +
                      channel);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            if (i >= this.lastValues.length) {
                this.lastValues.push(0);
            }

            var value = input.samples[i];
            var diff = Math.abs(this.lastValues[i] - value);
            if (diff > this.threshold) {
                this.callback(diff, i);
            }

            this.lastValues[i] = value;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Discontinuity Detector';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Fast Fourier Transform
 *
 * **Inputs**
 *
 * - Audio
 * - Delay Time
 *
 * **Outputs**
 *
 * - Fourier transformed audio
 */
var FFT = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} bufferSize The FFT buffer size.
     */
    constructor: function(audiolet, bufferSize) {
        AudioletNode.call(this, audiolet, 2, 1);
        this.linkNumberOfOutputChannels(0, 0);
        this.bufferSize = bufferSize;
        this.readWriteIndex = 0;

        this.buffer = new Float32Array(this.bufferSize);

        this.realBuffer = new Float32Array(this.bufferSize);
        this.imaginaryBuffer = new Float32Array(this.bufferSize);

        this.reverseTable = new Uint32Array(this.bufferSize);
        this.calculateReverseTable();
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        if (input.samples.length == 0) {
            return;
        }

        this.buffer[this.readWriteIndex] = input.samples[0];
        output.samples[0] = [this.realBuffer[this.readWriteIndex],
                             this.imaginaryBuffer[this.readWriteIndex]];

        this.readWriteIndex += 1;
        if (this.readWriteIndex >= this.bufferSize) {
            this.transform();
            this.readWriteIndex = 0;
        }
    },

    /**
     * Precalculate the reverse table.
     * TODO: Split the function out so it can be reused in FFT and IFFT
     */
    calculateReverseTable: function() {
        var limit = 1;
        var bit = this.bufferSize >> 1;

        while (limit < this.bufferSize) {
            for (var i = 0; i < limit; i++) {
                this.reverseTable[i + limit] = this.reverseTable[i] + bit;
            }

            limit = limit << 1;
            bit = bit >> 1;
        }
    },

    /**
     * Calculate the FFT for the saved buffer
     */
    transform: function() {
        for (var i = 0; i < this.bufferSize; i++) {
            this.realBuffer[i] = this.buffer[this.reverseTable[i]];
            this.imaginaryBuffer[i] = 0;
        }

        var halfSize = 1;

        while (halfSize < this.bufferSize) {
            var phaseShiftStepReal = Math.cos(-Math.PI / halfSize);
            var phaseShiftStepImag = Math.sin(-Math.PI / halfSize);

            var currentPhaseShiftReal = 1;
            var currentPhaseShiftImag = 0;

            for (var fftStep = 0; fftStep < halfSize; fftStep++) {
                var i = fftStep;

                while (i < this.bufferSize) {
                    var off = i + halfSize;
                    var tr = (currentPhaseShiftReal * this.realBuffer[off]) -
                             (currentPhaseShiftImag * this.imaginaryBuffer[off]);
                    var ti = (currentPhaseShiftReal * this.imaginaryBuffer[off]) +
                             (currentPhaseShiftImag * this.realBuffer[off]);

                    this.realBuffer[off] = this.realBuffer[i] - tr;
                    this.imaginaryBuffer[off] = this.imaginaryBuffer[i] - ti;
                    this.realBuffer[i] += tr;
                    this.imaginaryBuffer[i] += ti;

                    i += halfSize << 1;
                }

                var tmpReal = currentPhaseShiftReal;
                currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) -
                                        (currentPhaseShiftImag *
                                         phaseShiftStepImag);
                currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) +
                                        (currentPhaseShiftImag *
                                         phaseShiftStepReal);
            }

            halfSize = halfSize << 1;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'FFT';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Delay line with feedback
 *
 * **Inputs**
 *
 * - Audio
 * - Delay Time
 * - Feedback
 * - Mix
 *
 * **Outputs**
 *
 * - Delayed audio
 *
 * **Parameters**
 *
 * - delayTime The delay time in seconds.  Linked to input 1.
 * - feedback The amount of feedback.  Linked to input 2.
 * - mix The amount of delay to mix into the dry signal.  Linked to input 3.
 */
var FeedbackDelay = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} maximumDelayTime The largest allowable delay time.
     * @param {Number} delayTime The initial delay time.
     * @param {Number} feedabck The initial feedback amount.
     * @param {Number} mix The initial mix amount.
     */
    constructor: function(audiolet, maximumDelayTime, delayTime, feedback,
                             mix) {
        AudioletNode.call(this, audiolet, 4, 1);
        this.linkNumberOfOutputChannels(0, 0);
        this.maximumDelayTime = maximumDelayTime;
        this.delayTime = new AudioletParameter(this, 1, delayTime || 1);
        this.feedback = new AudioletParameter(this, 2, feedback || 0.5);
        this.mix = new AudioletParameter(this, 3, mix || 1);
        var bufferSize = maximumDelayTime * this.audiolet.device.sampleRate;
        this.buffers = [];
        this.readWriteIndex = 0;
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var sampleRate = this.audiolet.output.device.sampleRate;

        var delayTime = this.delayTime.getValue() * sampleRate;
        var feedback = this.feedback.getValue();
        var mix = this.mix.getValue();

        var numberOfChannels = input.samples.length;
        var numberOfBuffers = this.buffers.length;
        for (var i = 0; i < numberOfChannels; i++) {
            if (i >= numberOfBuffers) {
                // Create buffer for channel if it doesn't already exist
                var bufferSize = this.maximumDelayTime * sampleRate;
                this.buffers.push(new Float32Array(bufferSize));
            }

            var buffer = this.buffers[i];

            var inputSample = input.samples[i];
            var bufferSample = buffer[this.readWriteIndex];

            output.samples[i] = mix * bufferSample + (1 - mix) * inputSample;
            buffer[this.readWriteIndex] = inputSample + feedback * bufferSample;
        }

        this.readWriteIndex += 1;
        if (this.readWriteIndex >= delayTime) {
            this.readWriteIndex = 0;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Feedback Delay';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/*
 * Multiply values
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 *
 * **Outputs**
 *
 * - Multiplied audio
 *
 * **Parameters**
 *
 * - value The value to multiply by.  Linked to input 1.
 */
var Multiply = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [value=1] The initial value to multiply by.
     */
    constructor: function(audiolet, value) {
        AudioletNode.call(this, audiolet, 2, 1);
        this.linkNumberOfOutputChannels(0, 0);
        this.value = new AudioletParameter(this, 1, value || 1);
    },

    /**
     * Process samples
     */
    generate: function() {
        var value = this.value.getValue();
        var input = this.inputs[0];
        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            this.outputs[0].samples[i] = input.samples[i] * value;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Multiply';
    }

});
/*!
 * @depends ../operators/Multiply.js
 */

/**
 * Simple gain control
 *
 * **Inputs**
 *
 * - Audio
 * - Gain
 *
 * **Outputs**
 *
 * - Audio
 *
 * **Parameters**
 *
 * - gain The amount of gain.  Linked to input 1.
 */
var Gain = Multiply.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [gain=1] Initial gain.
     */
    constructor: function(audiolet, gain) {
        // Same DSP as operators/Multiply.js, but different parameter name
        Multiply.call(this, audiolet, gain);
        this.gain = this.value;
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return ('Gain');
    }

});
/*!
 * @depends BiquadFilter.js
 */

/**
 * High-pass filter
 *
 * **Inputs**
 *
 * - Audio
 * - Filter frequency
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - frequency The filter frequency.  Linked to input 1.
 */
var HighPassFilter = BiquadFilter.extend({

    /**
     * Constructor
     *
     * @extends BiquadFilter
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} frequency The initial frequency.
     */
    constructor: function(audiolet, frequency) {
        BiquadFilter.call(this, audiolet, frequency);
    },

    /**
     * Calculate the biquad filter coefficients using maths from
     * http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
     *
     * @param {Number} frequency The filter frequency.
     */
    calculateCoefficients: function(frequency) {
        var w0 = 2 * Math.PI * frequency /
                 this.audiolet.device.sampleRate;
        var cosw0 = Math.cos(w0);
        var sinw0 = Math.sin(w0);
        var alpha = sinw0 / (2 / Math.sqrt(2));

        this.b0 = (1 + cosw0) / 2;
        this.b1 = - (1 + cosw0);
        this.b2 = this.b0;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'High Pass Filter';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Inverse Fast Fourier Transform.  Code liberally stolen with kind permission
 * of Corben Brook from DSP.js (https://github.com/corbanbrook/dsp.js).
 *
 * **Inputs**
 *
 * - Fourier transformed audio
 * - Delay Time
 *
 * **Outputs**
 *
 * - Audio
 */
var IFFT = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} bufferSize The FFT buffer size.
     */
    constructor: function(audiolet, bufferSize) {
        AudioletNode.call(this, audiolet, 2, 1);
        this.linkNumberOfOutputChannels(0, 0);
        this.bufferSize = bufferSize;
        this.readWriteIndex = 0;

        this.buffer = new Float32Array(this.bufferSize);

        this.realBuffer = new Float32Array(this.bufferSize);
        this.imaginaryBuffer = new Float32Array(this.bufferSize);

        this.reverseTable = new Uint32Array(this.bufferSize);
        this.calculateReverseTable();

        this.reverseReal = new Float32Array(this.bufferSize);
        this.reverseImaginary = new Float32Array(this.bufferSize);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        if (!input.samples.length) {
            return;
        }

        var values = input.samples[0];
        this.realBuffer[this.readWriteIndex] = values[0];
        this.imaginaryBuffer[this.readWriteIndex] = values[1];
        output.samples[0] = this.buffer[this.readWriteIndex];

        this.readWriteIndex += 1;
        if (this.readWriteIndex >= this.bufferSize) {
            this.transform();
            this.readWriteIndex = 0;
        }
    },

    /**
     * Precalculate the reverse table.
     * TODO: Split the function out so it can be reused in FFT and IFFT
     */
    calculateReverseTable: function() {
        var limit = 1;
        var bit = this.bufferSize >> 1;

        while (limit < this.bufferSize) {
            for (var i = 0; i < limit; i++) {
                this.reverseTable[i + limit] = this.reverseTable[i] + bit;
            }

            limit = limit << 1;
            bit = bit >> 1;
        }
    },

    /**
     * Calculate the inverse FFT for the saved real and imaginary buffers
     */
    transform: function() {
        var halfSize = 1;

        for (var i = 0; i < this.bufferSize; i++) {
            this.imaginaryBuffer[i] *= -1;
        }

        for (var i = 0; i < this.bufferSize; i++) {
            this.reverseReal[i] = this.realBuffer[this.reverseTable[i]];
            this.reverseImaginary[i] = this.imaginaryBuffer[this.reverseTable[i]];
        }
     
        this.realBuffer.set(this.reverseReal);
        this.imaginaryBuffer.set(this.reverseImaginary);


        while (halfSize < this.bufferSize) {
            var phaseShiftStepReal = Math.cos(-Math.PI / halfSize);
            var phaseShiftStepImag = Math.sin(-Math.PI / halfSize);
            var currentPhaseShiftReal = 1;
            var currentPhaseShiftImag = 0;

            for (var fftStep = 0; fftStep < halfSize; fftStep++) {
                i = fftStep;

                while (i < this.bufferSize) {
                    var off = i + halfSize;
                    var tr = (currentPhaseShiftReal * this.realBuffer[off]) -
                             (currentPhaseShiftImag * this.imaginaryBuffer[off]);
                    var ti = (currentPhaseShiftReal * this.imaginaryBuffer[off]) +
                             (currentPhaseShiftImag * this.realBuffer[off]);

                    this.realBuffer[off] = this.realBuffer[i] - tr;
                    this.imaginaryBuffer[off] = this.imaginaryBuffer[i] - ti;
                    this.realBuffer[i] += tr;
                    this.imaginaryBuffer[i] += ti;

                    i += halfSize << 1;
                }

                var tmpReal = currentPhaseShiftReal;
                currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) -
                                        (currentPhaseShiftImag *
                                         phaseShiftStepImag);
                currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) +
                                        (currentPhaseShiftImag *
                                         phaseShiftStepReal);
            }

            halfSize = halfSize << 1;
        }

        for (i = 0; i < this.bufferSize; i++) {
            this.buffer[i] = this.realBuffer[i] / this.bufferSize;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'IFFT';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Exponential lag for smoothing signals.
 *
 * **Inputs**
 *
 * - Value
 * - Lag time
 *
 * **Outputs**
 *
 * - Lagged value
 *
 * **Parameters**
 *
 * - value The value to lag.  Linked to input 0.
 * - lag The 60dB lag time. Linked to input 1.
 */
var Lag = AudioletNode.extend({

  /**
   * Constructor
   *
   * @extends AudioletNode
   * @param {Audiolet} audiolet The audiolet object.
   * @param {Number} [value=0] The initial value.
   * @param {Number} [lagTime=1] The initial lag time.
   */
    constructor: function(audiolet, value, lagTime) {
        AudioletNode.call(this, audiolet, 2, 1);
        this.value = new AudioletParameter(this, 0, value || 0);
        this.lag = new AudioletParameter(this, 1, lagTime || 1);
        this.lastValue = 0;

        this.log001 = Math.log(0.001);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var sampleRate = this.audiolet.device.sampleRate;

        var value = this.value.getValue();
        var lag = this.lag.getValue();
        var coefficient = Math.exp(this.log001 / (lag * sampleRate));

        var outputValue = ((1 - coefficient) * value) +
                          (coefficient * this.lastValue);
        output.samples[0] = outputValue;
        this.lastValue = outputValue;
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Lag';
    }

});
/*!
 * @depends ../core/AudioletGroup.js
 */

/**
 * A simple (and frankly shoddy) zero-lookahead limiter.
 *
 * **Inputs**
 *
 * - Audio
 * - Threshold
 * - Attack
 * - Release
 *
 * **Outputs**
 *
 * - Limited audio
 *
 * **Parameters**
 *
 * - threshold The limiter threshold.  Linked to input 1.
 * - attack The attack time in seconds. Linked to input 2.
 * - release The release time in seconds.  Linked to input 3.
 */
var Limiter = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletGroup
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [threshold=0.95] The initial threshold.
     * @param {Number} [attack=0.01] The initial attack time.
     * @param {Number} [release=0.4] The initial release time.
     */
    constructor: function(audiolet, threshold, attack, release) {
        AudioletNode.call(this, audiolet, 4, 1);
        this.linkNumberOfOutputChannels(0, 0);

        // Parameters
        this.threshold = new AudioletParameter(this, 1, threshold || 0.95);
        this.attack = new AudioletParameter(this, 2, attack || 0.01);
        this.release = new AudioletParameter(this, 2, release || 0.4);

        this.followers = [];
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var sampleRate = this.audiolet.device.sampleRate;

        // Local processing variables
        var attack = Math.pow(0.01, 1 / (this.attack.getValue() *
                                         sampleRate));
        var release = Math.pow(0.01, 1 / (this.release.getValue() *
                                          sampleRate));

        var threshold = this.threshold.getValue();

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            if (i >= this.followers.length) {
                this.followers.push(0);
            }

            var follower = this.followers[i];

            var value = input.samples[i];

            // Calculate amplitude envelope
            var absValue = Math.abs(value);
            if (absValue > follower) {
                follower = attack * (follower - absValue) + absValue;
            }
            else {
                follower = release * (follower - absValue) + absValue;
            }
            
            var diff = follower - threshold;
            if (diff > 0) {
                output.samples[i] = value / (1 + diff);
            }
            else {
                output.samples[i] = value;
            }

            this.followers[i] = follower;
        }
    },


    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Limiter';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Linear cross-fade between two signals
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 * - Fade Position
 *
 * **Outputs**
 *
 * - Mixed audio
 *
 * **Parameters**
 *
 * - position The fade position.  Values between 0 (Audio 1 only) and 1 (Audio
 * 2 only).  Linked to input 2.
 */
var LinearCrossFade = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [position=0.5] The initial fade position.
     */
    constructor: function(audiolet, position) {
        AudioletNode.call(this, audiolet, 3, 1);
        this.linkNumberOfOutputChannels(0, 0);
        this.position = new AudioletParameter(this, 2, position || 0.5);
    },

    /**
     * Process samples
     */
    generate: function() {
        var inputA = this.inputs[0];
        var inputB = this.inputs[1];
        var output = this.outputs[0];

        var position = this.position.getValue();

        var gainA = 1 - position;
        var gainB = position;

        var numberOfChannels = output.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            var valueA = inputA.samples[i] || 0;
            var valueB = inputB.samples[i] || 0;
            output.samples[i] = valueA * gainA + valueB * gainB;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Linear Cross Fader';
    }

});
/*!
 * @depends BiquadFilter.js
 */

/**
 * Low-pass filter
 *
 * **Inputs**
 *
 * - Audio
 * - Filter frequency
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - frequency The filter frequency.  Linked to input 1.
 */
var LowPassFilter = BiquadFilter.extend({

    /**
     * Constructor
     *
     * @extends BiquadFilter
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} frequency The initial frequency.
     */
    constructor: function(audiolet, frequency) {
        BiquadFilter.call(this, audiolet, frequency);
    },

    /**
     * Calculate the biquad filter coefficients using maths from
     * http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
     *
     * @param {Number} frequency The filter frequency.
     */
    calculateCoefficients: function(frequency) {
        var w0 = 2 * Math.PI * frequency /
                 this.audiolet.device.sampleRate;
        var cosw0 = Math.cos(w0);
        var sinw0 = Math.sin(w0);
        var alpha = sinw0 / (2 / Math.sqrt(2));

        this.b0 = (1 - cosw0) / 2;
        this.b1 = 1 - cosw0;
        this.b2 = this.b0;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Low Pass Filter';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Position a single-channel input in stereo space
 *
 * **Inputs**
 *
 * - Audio
 * - Pan Position
 *
 * **Outputs**
 *
 * - Panned audio
 *
 * **Parameters**
 *
 * - pan The pan position.  Values between 0 (hard-left) and 1 (hard-right).
 * Linked to input 1.
 */
var Pan = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [pan=0.5] The initial pan position.
     */
    constructor: function(audiolet, pan) {
        AudioletNode.call(this, audiolet, 2, 1);
        // Hardcode two output channels
        this.setNumberOfOutputChannels(0, 2);
        if (pan == null) {
            var pan = 0.5;
        }
        this.pan = new AudioletParameter(this, 1, pan);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var pan = this.pan.getValue();

        var value = input.samples[0] || 0;
        var scaledPan = pan * Math.PI / 2;
        output.samples[0] = value * Math.cos(scaledPan);
        output.samples[1] = value * Math.sin(scaledPan);
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Stereo Panner';
    }

});
/*!
 * @depends Envelope.js
 */

/**
 * Simple attack-release envelope
 *
 * **Inputs**
 *
 * - Gate
 *
 * **Outputs**
 *
 * - Envelope
 *
 * **Parameters**
 *
 * - gate The gate controlling the envelope.  Value changes from 0 -> 1
 * trigger the envelope.  Linked to input 0.
 */
var PercussiveEnvelope = Envelope.extend({

    /**
     * Constructor
     *
     * @extends Envelope
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} gate The initial gate value.
     * @param {Number} attack The attack time in seconds.
     * @param {Number} release The release time in seconds.
     * @param {Function} [onComplete] A function called after the release stage.
     */
    constructor: function(audiolet, gate, attack, release,
                                    onComplete) {
        var levels = [0, 1, 0];
        var times = [attack, release];
        Envelope.call(this, audiolet, gate, levels, times, null, onComplete);

        this.attack = this.times[0];
        this.release = this.times[1];
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Percussive Envelope';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Pulse wave oscillator.
 *
 * **Inputs**
 *
 * - Frequency
 * - Pulse width
 *
 * **Outputs**
 *
 * - Waveform
 *
 * **Parameters**
 *
 * - frequency The oscillator frequency.  Linked to input 0.
 * - pulseWidth The pulse width.  Linked to input 1.
 */
var Pulse = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [frequency=440] The initial frequency.
     * @param {Number} [pulseWidth=0.5] The initial pulse width.
     */
    constructor: function(audiolet, frequency, pulseWidth) {
        AudioletNode.call(this, audiolet, 2, 1);
        this.frequency = new AudioletParameter(this, 0, frequency || 440);
        this.pulseWidth = new AudioletParameter(this, 1, pulseWidth || 0.5);
        this.phase = 0;
    },

    /**
     * Process samples
     */
    generate: function() {
        var pulseWidth = this.pulseWidth.getValue();
        this.outputs[0].samples[0] = (this.phase < pulseWidth) ? 1 : -1;

        var frequency = this.frequency.getValue();
        var sampleRate = this.audiolet.device.sampleRate;
        this.phase += frequency / sampleRate;
        if (this.phase > 1) {
            this.phase %= 1;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Pulse';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 * @depends ../core/AudioletGroup.js
 */

/**
 * Port of the Freeverb Schrodoer/Moorer reverb model.  See
 * https://ccrma.stanford.edu/~jos/pasp/Freeverb.html for a description of how
 * each part works.
 *
 * **Inputs**
 *
 * - Audio
 * - Mix
 * - Room Size
 * - Damping
 *
 * **Outputs**
 *
 * - Reverberated Audio
 *
 * **Parameters**
 *
 * - mix The wet/dry mix.  Values between 0 and 1.  Linked to input 1.
 * - roomSize The reverb's room size.  Values between 0 and 1.  Linked to input
 * 2.
 * - damping The amount of high-frequency damping.  Values between 0 and 1.
 * Linked to input 3.
 */
var Reverb = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletGroup
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [mix=0.33] The initial wet/dry mix.
     * @param {Number} [roomSize=0.5] The initial room size.
     * @param {Number} [damping=0.5] The initial damping amount.
     */
    constructor: function(audiolet, mix, roomSize, damping) {
        AudioletNode.call(this, audiolet, 4, 1);

        // Constants
        this.initialMix = 0.33;
        this.fixedGain = 0.015;
        this.initialDamping = 0.5;
        this.scaleDamping = 0.4;
        this.initialRoomSize = 0.5;
        this.scaleRoom = 0.28;
        this.offsetRoom = 0.7;

        // Parameters: for 44.1k or 48k
        this.combTuning = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
        this.allPassTuning = [556, 441, 341, 225];

        // Controls
        // Mix control
        var mix = mix || this.initialMix;
        this.mix = new AudioletParameter(this, 1, mix);

        // Room size control
        var roomSize = roomSize || this.initialRoomSize;
        this.roomSize = new AudioletParameter(this, 2, roomSize);

        // Damping control
        var damping = damping || this.initialDamping;
        this.damping = new AudioletParameter(this, 3, damping);

        // Damped comb filters
        this.combBuffers = [];
        this.combIndices = [];
        this.filterStores = [];

        var numberOfCombs = this.combTuning.length;
        for (var i = 0; i < numberOfCombs; i++) {
            this.combBuffers.push(new Float32Array(this.combTuning[i]));
            this.combIndices.push(0);
            this.filterStores.push(0);
        }

        // All-pass filters
        this.allPassBuffers = [];
        this.allPassIndices = [];

        var numberOfFilters = this.allPassTuning.length;
        for (var i = 0; i < numberOfFilters; i++) {
            this.allPassBuffers.push(new Float32Array(this.allPassTuning[i]));
            this.allPassIndices.push(0);
        }
    },

    /**
     * Process samples
     */
    generate: function() {
        var mix = this.mix.getValue();
        var roomSize = this.roomSize.getValue();
        var damping = this.damping.getValue();

        var numberOfCombs = this.combTuning.length;
        var numberOfFilters = this.allPassTuning.length;

        var value = this.inputs[0].samples[0] || 0;
        var dryValue = value;

        value *= this.fixedGain;
        var gainedValue = value;

        var damping = damping * this.scaleDamping;
        var feedback = roomSize * this.scaleRoom + this.offsetRoom;

        for (var i = 0; i < numberOfCombs; i++) {
            var combIndex = this.combIndices[i];
            var combBuffer = this.combBuffers[i];
            var filterStore = this.filterStores[i];

            var output = combBuffer[combIndex];
            filterStore = (output * (1 - damping)) +
                          (filterStore * damping);
            value += output;
            combBuffer[combIndex] = gainedValue + feedback * filterStore;

            combIndex += 1;
            if (combIndex >= combBuffer.length) {
                combIndex = 0;
            }

            this.combIndices[i] = combIndex;
            this.filterStores[i] = filterStore;
        }

        for (var i = 0; i < numberOfFilters; i++) {
            var allPassBuffer = this.allPassBuffers[i];
            var allPassIndex = this.allPassIndices[i];

            var input = value;
            var bufferValue = allPassBuffer[allPassIndex];
            value = -value + bufferValue;
            allPassBuffer[allPassIndex] = input + (bufferValue * 0.5);

            allPassIndex += 1;
            if (allPassIndex >= allPassBuffer.length) {
                allPassIndex = 0;
            }

            this.allPassIndices[i] = allPassIndex;
        }

        this.outputs[0].samples[0] = mix * value + (1 - mix) * dryValue;
    },


    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Reverb';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Saw wave oscillator using a lookup table
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Saw wave
 *
 * **Parameters**
 *
 * - frequency The frequency of the oscillator.  Linked to input 0.
 */
var Saw = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [frequency=440] Initial frequency.
     */
    constructor: function(audiolet, frequency) {
        AudioletNode.call(this, audiolet, 1, 1);
        this.frequency = new AudioletParameter(this, 0, frequency || 440);
        this.phase = 0;
    },

    /**
     * Process samples
     */
    generate: function() {
        var output = this.outputs[0];
        var frequency = this.frequency.getValue();
        var sampleRate = this.audiolet.device.sampleRate;

        output.samples[0] = ((this.phase / 2 + 0.25) % 0.5 - 0.25) * 4;
        this.phase += frequency / sampleRate;

        if (this.phase > 1) {
            this.phase %= 1;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Saw';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * A soft-clipper, which distorts at values over +-0.5.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Clipped audio
 */
var SoftClip = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     */
    constructor: function(audiolet) {
        AudioletNode.call(this, audiolet, 1, 1);
        this.linkNumberOfOutputChannels(0, 0);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            var value = input.samples[i];
            if (value > 0.5 || value < -0.5) {
                output.samples[i] = (Math.abs(value) - 0.25) / value;
            }
            else {
                output.samples[i] = value;
            }
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return ('SoftClip');
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Square wave oscillator
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Square wave
 *
 * **Parameters**
 *
 * - frequency The frequency of the oscillator.  Linked to input 0.
 */
var Square = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [frequency=440] Initial frequency.
     */
    constructor: function(audiolet, frequency) {
        AudioletNode.call(this, audiolet, 1, 1);
        this.frequency = new AudioletParameter(this, 0, frequency || 440);
        this.phase = 0;
    },

    /**
     * Process samples
     */
    generate: function() {
        var output = this.outputs[0];

        var frequency = this.frequency.getValue();
        var sampleRate = this.audiolet.device.sampleRate;

        output.samples[0] = this.phase > 0.5 ? 1 : -1;

        this.phase += frequency / sampleRate;
        if (this.phase > 1) {
            this.phase %= 1;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Square';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Triangle wave oscillator using a lookup table
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Triangle wave
 *
 * **Parameters**
 *
 * - frequency The frequency of the oscillator.  Linked to input 0.
 */
var Triangle = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [frequency=440] Initial frequency.
     */
    constructor: function(audiolet, frequency) {
        AudioletNode.call(this, audiolet, 1, 1);
        this.frequency = new AudioletParameter(this, 0, frequency || 440);
        this.phase = 0;
    },

    /**
     * Process samples
     */
    generate: function() {
        var output = this.outputs[0];

        var frequency = this.frequency.getValue();
        var sampleRate = this.audiolet.device.sampleRate;

        output.samples[0] = 1 - 4 * Math.abs((this.phase + 0.25) % 1 - 0.5);

        this.phase += frequency / sampleRate;
        if (this.phase > 1) {
            this.phase %= 1;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Triangle';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Simple trigger which allows you to set a single sample to be 1 and then
 * resets itself.
 *
 * **Outputs**
 *
 * - Triggers
 *
 * **Parameters**
 *
 * - trigger Set to 1 to fire a trigger.
 */
var TriggerControl = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [trigger=0] The initial trigger state.
     */
    constructor: function(audiolet, trigger) {
        AudioletNode.call(this, audiolet, 0, 1);
        this.trigger = new AudioletParameter(this, null, trigger || 0);
    },

    /**
     * Process samples
     */
    generate: function() {
        if (this.trigger.getValue() > 0) {
            this.outputs[0].samples[0] = 1;
            this.trigger.setValue(0);
        }
        else {
            this.outputs[0].samples[0] = 0;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Trigger Control';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Upmix an input to a constant number of output channels
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Upmixed audio
 */
var UpMixer = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} outputChannels The number of output channels.
     */
    constructor: function(audiolet, outputChannels) {
        AudioletNode.call(this, audiolet, 1, 1);
        this.outputs[0].numberOfChannels = outputChannels;
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var numberOfInputChannels = input.samples.length;
        var numberOfOutputChannels = output.samples.length;

        if (numberOfInputChannels == numberOfOutputChannels) {
            output.samples = input.samples;
        }
        else {
            for (var i = 0; i < numberOfOutputChannels; i++) {
                output.samples[i] = input.samples[i % numberOfInputChannels];
            }
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'UpMixer';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

var WebKitBufferPlayer = AudioletNode.extend({

    constructor: function(audiolet, onComplete) {
        AudioletNode.call(this, audiolet, 0, 1);
        this.onComplete = onComplete;
        this.isWebKit = this.audiolet.device.sink instanceof Sink.sinks.webkit;
        this.ready = false;

        // Until we are loaded, output no channels.
        this.setNumberOfOutputChannels(0, 0);
        
        if (!this.isWebKit) {
            return;
        }

        this.context = this.audiolet.device.sink._context;
        this.jsNode = null;
        this.source = null;

        this.ready = false;
        this.loaded = false;

        this.buffers = [];
        this.readPosition = 0;

        this.endTime = null;
    },

    load: function(url, onLoad, onError) {
        if (!this.isWebKit) {
            return;
        }

        this.stop();

        // Request the new file
        this.xhr = new XMLHttpRequest();
        this.xhr.open("GET", url, true);
        this.xhr.responseType = "arraybuffer";
        this.xhr.onload = this.onLoad.bind(this, onLoad, onError);
        this.xhr.onerror = onError;
        this.xhr.send();
    },

    stop: function() {
        this.ready = false;
        this.loaded = false;

        this.buffers = [];
        this.readPosition = 0;
        this.endTime = null;

        this.setNumberOfOutputChannels(0);
       
        this.disconnectWebKitNodes();
    },

    disconnectWebKitNodes: function() {
        if (this.source && this.jsNode) {
            this.source.disconnect(this.jsNode);
            this.jsNode.disconnect(this.context.destination);
            this.source = null;
            this.jsNode = null;
        }
    },

    onLoad: function(onLoad, onError) {
        // Load the buffer into memory for decoding
    //    this.fileBuffer = this.context.createBuffer(this.xhr.response, false);
        this.context.decodeAudioData(this.xhr.response, function(buffer) {
            this.onDecode(buffer);
            onLoad();
        }.bind(this), onError);
    },

    onDecode: function(buffer) {
        this.fileBuffer = buffer;

        // Create the WebKit buffer source for playback
        this.source = this.context.createBufferSource();
        this.source.buffer = this.fileBuffer;

        // Make sure we are outputting the right number of channels on Audiolet's
        // side
        var numberOfChannels = this.fileBuffer.numberOfChannels;
        this.setNumberOfOutputChannels(0, numberOfChannels);

        // Create the JavaScript node for reading the data into Audiolet
        this.jsNode = this.context.createJavaScriptNode(4096, numberOfChannels, 0);
        this.jsNode.onaudioprocess = this.onData.bind(this);

        // Connect it all up
        this.source.connect(this.jsNode);
        this.jsNode.connect(this.context.destination);
        this.source.noteOn(0);
        this.endTime = this.context.currentTime + this.fileBuffer.duration;

        this.loaded = true;
    },

    onData: function(event) {
        if (this.loaded) {
            this.ready = true;
        }

        var numberOfChannels = event.inputBuffer.numberOfChannels;

        for (var i=0; i<numberOfChannels; i++) {
            this.buffers[i] = event.inputBuffer.getChannelData(i);
            this.readPosition = 0;
        }
    },

    generate: function() {
        if (!this.ready) {
            return;
        }

        var output = this.outputs[0];

        var numberOfChannels = output.samples.length;
        for (var i=0; i<numberOfChannels; i++) {
            output.samples[i] = this.buffers[i][this.readPosition];
        }
        this.readPosition += 1;

        if (this.context.currentTime > this.endTime) {
            this.stop();
            this.onComplete();
        }
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * A white noise source
 *
 * **Outputs**
 *
 * - White noise
 */
var WhiteNoise = AudioletNode.extend({

  /**
   * Constructor
   *
   * @extends AudioletNode
   * @param {Audiolet} audiolet The audiolet object.
   */
  constructor: function(audiolet) {
      AudioletNode.call(this, audiolet, 0, 1);
  },

  /**
   * Process samples
   */
  generate: function() {
      this.outputs[0].samples[0] = Math.random() * 2 - 1;
  },

  /**
   * toString
   *
   * @return {String} String representation.
   */
  toString: function() {
      return 'White Noise';
  }

});
/*!
 * @depends ../core/AudioletClass.js
 */

var MidiClock = AudioletClass.extend({

  constructor: function(scheduler) {
    AudioletClass.apply(this);
    this.scheduler = scheduler;
  },

  sequence: function(events, cb, ticksPerBeat) {
    // midi clock ticks 24 (or n) times per beat
    var tick = 1 / (ticksPerBeat || 96),
      sequence = new PSequence(events, Infinity),
      relative_tick = 0;
    this.scheduler.play([], tick, function() {
      var to_process = [],
        processing, type, method;
      while (sequence.peek().time == relative_tick) {
        to_process.push(sequence.next());
      };
      if (to_process.length) {
        for (var i = 0; i < to_process.length; i++) {
          cb(to_process[i]);
        }
        relative_tick = 0;
      } else {
        relative_tick++;
      }
    });
  }

});
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
/*!
 * @depends ../core/AudioletGroup.js
 */

var MidiPlayer = AudioletGroup.extend({

  constructor: function(audiolet, midi) {
    var header = midi.header,
      track_count = header.trackCount;
    AudioletGroup.apply(this, [audiolet, 0, track_count]);
    this.midi = midi;
    this.instruments = [];

    for (var i = 0; i < this.outputs.length; i++) {
      var instrument = new MidiInstrument(audiolet, [MidiVoice]);
      this.instruments[i] = instrument;
      instrument.connect(this.outputs[i]);
    }
  },

  play: function() {
    var midi = this.midi,
      tracks = midi.tracks,
      instruments = this.instruments,
      ticksPerBeat = midi.header.ticksPerBeat,
      track, instrument;
    for (var i = 0; i < tracks.length; i++) {
      track = tracks[i];
      instrument = instruments[i];
      instrument.play(track, ticksPerBeat);
    };
  }

});
/*!
 * @depends ../core/AudioletGroup.js
 */

var MidiVoice = AudioletGroup.extend({

  keysByNote: {
    0: 'c-1',
    1: 'c#-1',
    2: 'd-1',
    3: 'd#-1',
    4: 'e-1',
    5: 'f-1',
    6: 'f#-1',
    7: 'g-1',
    8: 'g#-1',
    9: 'a-1',
    10: 'a#-1',
    11: 'b-1',
    12: 'c0',
    13: 'c#0',
    14: 'd0',
    15: 'd#0',
    16: 'e0',
    17: 'f0',
    18: 'f#0',
    19: 'g0',
    20: 'g#0',
    21: 'a0',
    22: 'a#0',
    23: 'b0',
    24: 'c1',
    25: 'c#1',
    26: 'd1',
    27: 'd#1',
    28: 'e1',
    29: 'f1',
    30: 'f#1',
    31: 'g1',
    32: 'g#1',
    33: 'a1',
    34: 'a#1',
    35: 'b1',
    36: 'c2',
    37: 'c#2',
    38: 'd2',
    39: 'd#2',
    40: 'e2',
    41: 'f2',
    42: 'f#2',
    43: 'g2',
    44: 'g#2',
    45: 'a2',
    46: 'a#2',
    47: 'b2',
    48: 'c3',
    49: 'c#3',
    50: 'd3',
    51: 'd#3',
    52: 'e3',
    53: 'f3',
    54: 'f#3',
    55: 'g3',
    56: 'g#3',
    57: 'a3',
    58: 'a#3',
    59: 'b3',
    60: 'c4',
    61: 'c#4',
    62: 'd4',
    63: 'd#4',
    64: 'e4',
    65: 'f4',
    66: 'f#4',
    67: 'g4',
    68: 'g#4',
    69: 'a4',
    70: 'a#4',
    71: 'b4',
    72: 'c5',
    73: 'c#5',
    74: 'd5',
    75: 'd#5',
    76: 'e5',
    77: 'f5',
    78: 'f#5',
    79: 'g5',
    80: 'g#5',
    81: 'a5',
    82: 'a#5',
    83: 'b5',
    84: 'c6',
    85: 'c#6',
    86: 'd6',
    87: 'd#6',
    88: 'e6',
    89: 'f6',
    90: 'f#6',
    91: 'g6',
    92: 'g#6',
    93: 'a6',
    94: 'a#6',
    95: 'b6',
    96: 'c7',
    97: 'c#7',
    98: 'd7',
    99: 'd#7',
    100: 'e7',
    101: 'f7',
    102: 'f#7',
    103: 'g7',
    104: 'g#7',
    105: 'a7',
    106: 'a#7',
    107: 'b7',
    108: 'c8',
    109: 'c#8',
    110: 'd8',
    111: 'd#8',
    112: 'e8',
    113: 'f8',
    114: 'f#8',
    115: 'g8',
    116: 'g#8',
    117: 'a8',
    118: 'a#8',
    119: 'b8',
    120: 'c9',
    121: 'c#9',
    122: 'd9',
    123: 'd#9',
    124: 'e9',
    125: 'f9',
    126: 'f#9',
    127: 'g9'
  },

  constructor: function(audiolet, number, velocity) {
    AudioletGroup.apply(this, [audiolet, 0, 1]);
    var key = this.keysByNote[number];
    this.source = new Sine(audiolet, teoria.note(key).fq());
    this.gain = new Gain(audiolet, (1 / 127) * velocity);

    this.source.connect(this.gain);
    this.gain.connect(this.outputs[0]);
  }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Add values
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 *
 * **Outputs**
 *
 * - Summed audio
 *
 * **Parameters**
 *
 * - value The value to add.  Linked to input 1.
 */
var Add = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [value=0] The initial value to add.
     */
    constructor: function(audiolet, value) {
        AudioletNode.call(this, audiolet, 2, 1);
        this.linkNumberOfOutputChannels(0, 0);
        this.value = new AudioletParameter(this, 1, value || 0);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var value = this.value.getValue();

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            output.samples[i] = input.samples[i] + value;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Add';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Divide values
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 *
 * **Outputs**
 *
 * - Divided audio
 *
 * **Parameters**
 *
 * - value The value to divide by.  Linked to input 1.
 */
var Divide = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [value=1] The initial value to divide by.
     */
    constructor: function(audiolet, value) {
        AudioletNode.call(this, audiolet, 2, 1);
        this.linkNumberOfOutputChannels(0, 0);
        this.value = new AudioletParameter(this, 1, value || 1);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var value = this.value.getValue();

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            output.samples[i] = input.samples[i] / value;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Divide';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Modulo values
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 *
 * **Outputs**
 *
 * - Moduloed audio
 *
 * **Parameters**
 *
 * - value The value to modulo by.  Linked to input 1.
 */
var Modulo = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [value=1] The initial value to modulo by.
     */
    constructor: function(audiolet, value) {
        AudioletNode.call(this, audiolet, 2, 1);
        this.linkNumberOfOutputChannels(0, 0);
        this.value = new AudioletParameter(this, 1, value || 1);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var value = this.value.getValue();

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            output.samples[i] = input.samples[i] % value;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Modulo';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/*
 * Multiply and add values
 *
 * **Inputs**
 *
 * - Audio
 * - Multiply audio
 * - Add audio
 *
 * **Outputs**
 *
 * - MulAdded audio
 *
 * **Parameters**
 *
 * - mul The value to multiply by.  Linked to input 1.
 * - add The value to add.  Linked to input 2.
 */
var MulAdd = AudioletNode.extend({
    
    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [mul=1] The initial value to multiply by.
     * @param {Number} [add=0] The initial value to add.
     */
    constructor: function(audiolet, mul, add) {
        AudioletNode.call(this, audiolet, 3, 1);
        this.linkNumberOfOutputChannels(0, 0);
        this.mul = new AudioletParameter(this, 1, mul || 1);
        this.add = new AudioletParameter(this, 2, add || 0);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var mul = this.mul.getValue();
        var add = this.add.getValue();

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            output.samples[i] = input.samples[i] * mul + add;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Multiplier/Adder';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Reciprocal (1/x) of values
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Reciprocal audio
 */
var Reciprocal = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     */
    constructor: function(audiolet) {
        AudioletNode.call(this, audiolet, 1, 1);
        this.linkNumberOfOutputChannels(0, 0);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            output.samples[i] = 1 / input.samples[i];
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Reciprocal';
    }

});
/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Subtract values
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 *
 * **Outputs**
 *
 * - Subtracted audio
 *
 * **Parameters**
 *
 * - value The value to subtract.  Linked to input 1.
 */
var Subtract = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [value=0] The initial value to subtract.
     */
    constructor: function(audiolet, value) {
        AudioletNode.call(this, audiolet, 2, 1);
        this.linkNumberOfOutputChannels(0, 0);
        this.value = new AudioletParameter(this, 1, value || 0);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var value = this.value.getValue();

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            output.samples[i] = input.samples[i] - value;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Subtract';
    }

});
/**
 * @depends ../core/AudioletNode.js
 */

/**
 * Hyperbolic tangent of values.  Works nicely as a distortion function.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Tanh audio
 */
var Tanh = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     */
    constructor: function(audiolet) {
        AudioletNode.call(this, audiolet, 1, 1);
        this.linkNumberOfOutputChannels(0, 0);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            var value = input.samples[i];
            output.samples[i] = (Math.exp(value) - Math.exp(-value)) /
                                (Math.exp(value) + Math.exp(-value));
        } 
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return ('Tanh');
    }

});
/*!
 * @depends ../core/AudioletClass.js
 */

/**
 * A generic pattern.  Patterns are simple classes which return the next value
 * in a sequence when the next function is called.  Patterns can be embedded
 * inside other patterns to produce complex sequences of values.  When a
 * pattern is finished its next function returns null.
 */
var Pattern = AudioletClass.extend({

    /**
     * Default next function.
     *
     * @return {null} Null.
     */
    next: function() {
        return null;
    },

    /**
     * Return the current value of an item contained in a pattern.
     *
     * @param {Pattern|Object} The item.
     * @return {Object} The value of the item.
     */
    valueOf: function(item) {
        if (item instanceof Pattern) {
            return (item.next());
        }
        else {
            return (item);
        }
    },

    /**
     * Default reset function.
     */
    reset: function() {
    }

});
/*!
 * @depends Pattern.js
 */

/**
 * Arithmetic sequence.  Adds a value to a running total on each next call.
 */
var PArithmetic = Pattern.extend({

    /**
     * Constructor
     *
     * @extends Pattern
     * @param {Number} start Starting value.
     * @param {Pattern|Number} step Value to add.
     * @param {Number} repeats Number of values to generate.
     */
    constructor: function(start, step, repeats) {
        Pattern.call(this);
        this.start = start;
        this.value = start;
        this.step = step;
        this.repeats = repeats;
        this.position = 0;
    },

    /**
     * Generate the next value in the pattern.
     *
     * @return {Number} The next value.
     */
    next: function() {
        var returnValue;
        if (this.position == 0) {
            returnValue = this.value;
            this.position += 1;
        }
        else if (this.position < this.repeats) {
            var step = this.valueOf(this.step);
            if (step != null) {
                this.value += step;
                returnValue = this.value;
                this.position += 1;
            }
            else {
                returnValue = null;
            }
        }
        else {
            returnValue = null;
        }
        return (returnValue);
    },

    /**
     * Reset the pattern
     */
    reset: function() {
        this.value = this.start;
        this.position = 0;
        if (this.step instanceof Pattern) {
            this.step.reset();
        }
    }

});

/**
 * Supercollider alias
 */
var Pseries = PArithmetic;
/*!
 * @depends Pattern.js
 */

/**
 * Choose a random value from an array.
 */
var PChoose = Pattern.extend({

    /**
     * Constructor
     *
     * @extends Pattern
     * @param {Object[]} list Array of items to choose from.
     * @param {Number} [repeats=1] Number of values to generate.
     */
    constructor: function(list, repeats) {
        Pattern.call(this);
        this.list = list;
        this.repeats = repeats || 1;
        this.position = 0;
    },

    /**
     * Generate the next value in the pattern.
     *
     * @return {Number} The next value.
     */
    next: function() {
        var returnValue;
        if (this.position < this.repeats) {
            var index = Math.floor(Math.random() * this.list.length);
            var item = this.list[index];
            var value = this.valueOf(item);
            if (value != null) {
                if (!(item instanceof Pattern)) {
                    this.position += 1;
                }
                returnValue = value;
            }
            else {
                if (item instanceof Pattern) {
                    item.reset();
                }
                this.position += 1;
                returnValue = this.next();
            }
        }
        else {
            returnValue = null;
        }
        return (returnValue);
    },

    /**
     * Reset the pattern
     */
    reset: function() {
        this.position = 0;
        for (var i = 0; i < this.list.length; i++) {
            var item = this.list[i];
            if (item instanceof Pattern) {
                item.reset();
            }
        }
    }

});

/**
 * Supercollider alias
 */
var Prand = PChoose;
/*!
 * @depends Pattern.js
 */


/**
 * Geometric sequence.  Multiplies a running total by a value on each next
 * call.
 */
var PGeometric = Pattern.extend({

    /**
     * Constructor
     *
     * @extends Pattern
     * @param {Number} start Starting value.
     * @param {Pattern|Number} step Value to multiply by.
     * @param {Number} repeats Number of values to generate.
     */
    constructor: function(start, step, repeats) {
        Pattern.call(this);
        this.start = start;
        this.value = start;
        this.step = step;
        this.repeats = repeats;
        this.position = 0;
    },

    /**
     * Generate the next value in the pattern.
     *
     * @return {Number} The next value.
     */
    next: function() {
        var returnValue;
        if (this.position == 0) {
            returnValue = this.value;
            this.position += 1;
        }
        else if (this.position < this.repeats) {
            var step = this.valueOf(this.step);
            if (step != null) {
                this.value *= step;
                returnValue = this.value;
                this.position += 1;
            }
            else {
                returnValue = null;
            }
        }
        else {
            returnValue = null;
        }
        return (returnValue);
    },

    /**
     * Reset the pattern
     */
    reset: function() {
        this.value = this.start;
        this.position = 0;
        if (this.step instanceof Pattern) {
            this.step.reset();
        }
    }

});

/**
 * Supercollider alias
 */
var Pgeom = PGeometric;


/*!
 * @depends Pattern.js
 */

/**
 * Proxy pattern.  Holds a pattern which can safely be replaced by a different
 * pattern while it is running.
 */
var PProxy = Pattern.extend({

    /**
     * Constructor
     *
     * @extends Pattern
     * @param {Pattern} pattern The initial pattern.
     */
    constructor: function(pattern) {
        Pattern.call(this);
        if (pattern) {
            this.pattern = pattern;
        }
    },

    /**
     * Generate the next value in the pattern.
     *
     * @return {Number} The next value.
     */
    next: function() {
        var returnValue;
        if (this.pattern) {
            var returnValue = this.pattern.next();
        }
        else {
            returnValue = null;
        }
        return returnValue;
    }

});

/**
 * Alias
 */
var Pp = PProxy;
/*!
 * @depends Pattern.js
 */

/**
 * Sequence of random numbers.
 */
var PRandom = Pattern.extend({

    /**
     * Constructor
     *
     * @extends Pattern
     * @param {Number|Pattern} low Lowest possible value.
     * @param {Number|Pattern} high Highest possible value.
     * @param {Number} repeats Number of values to generate.
     */ 
    constructor: function(low, high, repeats) {
        Pattern.call(this);
        this.low = low;
        this.high = high;
        this.repeats = repeats;
        this.position = 0;
    },

    /**
     * Generate the next value in the pattern.
     *
     * @return {Number} The next value.
     */
    next: function() {
        var returnValue;
        if (this.position < this.repeats) {
            var low = this.valueOf(this.low);
            var high = this.valueOf(this.high);
            if (low != null && high != null) {
                returnValue = low + Math.random() * (high - low);
                this.position += 1;
            }
            else {
                returnValue = null;
            }
        }
        else {
            returnValue = null;
        }
        return (returnValue);
    },

    /**
     * Reset the pattern
     */
    reset: function() {
        this.position = 0;
    }

});

/**
 * Supercollider alias
 */
var Pwhite = PRandom;


/*!
 * @depends Pattern.js
 */

/**
 * Iterate through a list of values.
 */
var PSequence = Pattern.extend({

    /**
     * Constructor
     *
     * @extends Pattern
     * @param {Object[]} list Array of values.
     * @param {Number} [repeats=1] Number of times to loop through the array.
     * @param {Number} [offset=0] Index to start from.
     */
    constructor: function(list, repeats, offset) {
        Pattern.call(this);
        this.list = list;
        this.repeats = repeats || 1;
        this.position = 0;
        this.offset = offset || 0;
    },

    /**
     * Generate the next value in the pattern.
     *
     * @return {Number} The next value.
     */
    next: function() {
        var returnValue;
        if (this.position < this.repeats * this.list.length) {
            var index = (this.position + this.offset) % this.list.length;
            var item = this.list[index];
            var value = this.valueOf(item);
            if (value != null) {
                if (!(item instanceof Pattern)) {
                    this.position += 1;
                }
                returnValue = value;
            }
            else {
                if (item instanceof Pattern) {
                    item.reset();
                }
                this.position += 1;
                returnValue = this.next();
            }
        }
        else {
            returnValue = null;
        }
        return (returnValue);
    },

    peek: function() {
        var returnValue;
        if (this.position < this.repeats * this.list.length) {
            var index = (this.position + this.offset) % this.list.length;
            var item = this.list[index];
            var value = this.valueOf(item);
            if (value != null) {
                returnValue = value;
            }
            else {
                returnValue = this.next();
            }
        }
        else {
            returnValue = null;
        }
        return (returnValue);
    },

    /**
     * Reset the pattern
     */
    reset: function() {
        this.position = 0;
        for (var i = 0; i < this.list.length; i++) {
            var item = this.list[i];
            if (item instanceof Pattern) {
                item.reset();
            }
        }
    }

});

/**
 * Supercollider alias
 */
var Pseq = PSequence;
/*!
 * @depends Pattern.js
 */

/**
 * Iterate through a list of values.
 */
var PSeries = Pattern.extend({

    /**
     * Constructor
     *
     * @extends Pattern
     * @param {Object[]} list Array of values.
     * @param {Number} [repeats=1] Number of values to generate.
     * @param {Number} [offset=0] Index to start from.
     */
    constructor: function(list, repeats, offset) {
        Pattern.call(this);
        this.list = list;
        this.repeats = repeats || 1;
        this.position = 0;
        this.offset = offset || 0;
    },

    /**
     * Generate the next value in the pattern.
     *
     * @return {Number} The next value.
     */
    next: function() {
        var returnValue;
        if (this.position < this.repeats) {
            var index = (this.position + this.offset) % this.list.length;
            var item = this.list[index];
            var value = this.valueOf(item);
            if (value != null) {
                if (!(item instanceof Pattern)) {
                    this.position += 1;
                }
                returnValue = value;
            }
            else {
                if (item instanceof Pattern) {
                    item.reset();
                }
                this.position += 1;
                returnValue = this.next();
            }
        }
        else {
            returnValue = null;
        }
        return (returnValue);
    },

    /**
     * Reset the pattern
     */
    reset: function() {
        this.position = 0;
        for (var i = 0; i < this.list.length; i++) {
            var item = this.list[i];
            if (item instanceof Pattern) {
                item.reset();
            }
        }
    }

});

/**
 * Supercollider alias
 */
var Pser = PSeries;
/*!
 * @depends Pattern.js
 */

/**
 * Reorder an array, then iterate through it's values.
 */
var PShuffle = Pattern.extend({

    /**
     * Constructor
     *
     * @extends Pattern
     * @param {Object[]} list Array of values.
     * @param {Number} repeats Number of times to loop through the array.
     */
    constructor: function(list, repeats) {
        Pattern.call(this);
        this.list = [];
        // Shuffle values into new list
        while (list.length) {
            var index = Math.floor(Math.random() * list.length);
            var value = list.splice(index, 1);
            this.list.push(value);
        }
        this.repeats = repeats;
        this.position = 0;
    },

    /**
     * Generate the next value in the pattern.
     *
     * @return {Number} The next value.
     */
    next: function() {
        var returnValue;
        if (this.position < this.repeats * this.list.length) {
            var index = (this.position + this.offset) % this.list.length;
            var item = this.list[index];
            var value = this.valueOf(item);
            if (value != null) {
                if (!(item instanceof Pattern)) {
                    this.position += 1;
                }
                returnValue = value;
            }
            else {
                if (item instanceof Pattern) {
                    item.reset();
                }
                this.position += 1;
                returnValue = this.next();
            }
        }
        else {
            returnValue = null;
        }
        return (returnValue);
    }

});

/**
 * Supercollider alias
 */
var Pshuffle = PShuffle;
/*!
 * @depends ../core/AudioletClass.js
 */

/**
 * Representation of a generic musical scale.  Can be subclassed to produce
 * specific scales.
 */
var Scale = AudioletClass.extend({

    /*
     * Constructor
     *
     * @param {Number[]} degrees Array of integer degrees.
     * @param {Tuning} [tuning] The scale's tuning.  Defaults to 12-tone ET.
     */
    constructor: function(degrees, tuning) {
        this.degrees = degrees;
        this.tuning = tuning || new EqualTemperamentTuning(12);
    },

    /**
     * Get the frequency of a note in the scale.
     *
     * @param {Number} degree The note's degree.
     * @param {Number} rootFrequency  The root frequency of the scale.
     * @param {Number} octave The octave of the note.
     * @return {Number} The frequency of the note in hz.
     */
    getFrequency: function(degree, rootFrequency, octave) {
        var frequency = rootFrequency;
        octave += Math.floor(degree / this.degrees.length);
        degree %= this.degrees.length;
        frequency *= Math.pow(this.tuning.octaveRatio, octave);
        frequency *= this.tuning.ratios[this.degrees[degree]];
        return frequency;
    }

});
/*!
 * @depends Scale.js
 */

/**
 * Minor scale.
 */
var MajorScale = Scale.extend({

    /*
     * Constructor
     *
     * @extends Scale
     */
    constructor: function() {
        Scale.call(this, [0, 2, 4, 5, 7, 9, 11]);
    }

});
/*!
 * @depends Scale.js
 */

/**
 * Minor scale.
 */
var MinorScale = Scale.extend({

    /*
     * Constructor
     *
     * @extends Scale
     */
    constructor: function() {
        Scale.call(this, [0, 2, 3, 5, 7, 8, 10]);
    }

});
/*!
 * @depends ../core/AudioletClass.js
 */

/**
 * Representation of a generic musical tuning.  Can be subclassed to produce
 * specific tunings.
 */
var Tuning = AudioletClass.extend({

    /**
     * Constructor
     *
     * @param {Number[]} semitones Array of semitone values for the tuning.
     * @param {Number} [octaveRatio=2] Frequency ratio for notes an octave apart.
     */
    constructor: function(semitones, octaveRatio) {
        this.semitones = semitones;
        this.octaveRatio = octaveRatio || 2;
        this.ratios = [];
        var tuningLength = this.semitones.length;
        for (var i = 0; i < tuningLength; i++) {
            this.ratios.push(Math.pow(2, this.semitones[i] / tuningLength));
        }
    }

});
/*!
 * @depends Tuning.js
 */

/**
 * Equal temperament tuning.
 */
var EqualTemperamentTuning = Tuning.extend({

  /**
   * Constructor
   *
   * @extends Tuning
   * @param {Number} pitchesPerOctave The number of notes in each octave.
   */
  constructor: function(pitchesPerOctave) {
    var semitones = [];
    for (var i = 0; i < pitchesPerOctave; i++) {
        semitones.push(i);
    }
    Tuning.call(this, semitones, 2);
  }

});

var Sink = this.Sink = function (global) {

/**
 * Creates a Sink according to specified parameters, if possible.
 *
 * @class
 *
 * @arg =!readFn
 * @arg =!channelCount
 * @arg =!bufferSize
 * @arg =!sampleRate
 *
 * @param {Function} readFn A callback to handle the buffer fills.
 * @param {Number} channelCount Channel count.
 * @param {Number} bufferSize (Optional) Specifies a pre-buffer size to control the amount of latency.
 * @param {Number} sampleRate Sample rate (ms).
 * @param {Number} default=0 writePosition Write position of the sink, as in how many samples have been written per channel.
 * @param {String} default=async writeMode The default mode of writing to the sink.
 * @param {String} default=interleaved channelMode The mode in which the sink asks the sample buffers to be channeled in.
 * @param {Number} default=0 previousHit The previous time of a callback.
 * @param {Buffer} default=null ringBuffer The ring buffer array of the sink. If null, ring buffering will not be applied.
 * @param {Number} default=0 ringOffset The current position of the ring buffer.
*/
function Sink (readFn, channelCount, bufferSize, sampleRate) {
	var	sinks	= Sink.sinks.list,
		i;
	for (i=0; i<sinks.length; i++) {
		if (sinks[i].enabled) {
			try {
				return new sinks[i](readFn, channelCount, bufferSize, sampleRate);
			} catch(e1){}
		}
	}

	throw Sink.Error(0x02);
}

function SinkClass () {
}

Sink.SinkClass = SinkClass;

SinkClass.prototype = Sink.prototype = {
	sampleRate: 44100,
	channelCount: 2,
	bufferSize: 4096,

	writePosition: 0,
	previousHit: 0,
	ringOffset: 0,

	channelMode: 'interleaved',
	isReady: false,

/**
 * Does the initialization of the sink.
 * @method Sink
*/
	start: function (readFn, channelCount, bufferSize, sampleRate) {
		this.channelCount	= isNaN(channelCount) || channelCount === null ? this.channelCount: channelCount;
		this.bufferSize		= isNaN(bufferSize) || bufferSize === null ? this.bufferSize : bufferSize;
		this.sampleRate		= isNaN(sampleRate) || sampleRate === null ? this.sampleRate : sampleRate;
		this.readFn		= readFn;
		this.activeRecordings	= [];
		this.previousHit	= +new Date();
		Sink.EventEmitter.call(this);
		Sink.emit('init', [this].concat([].slice.call(arguments)));
	},
/**
 * The method which will handle all the different types of processing applied on a callback.
 * @method Sink
*/
	process: function (soundData, channelCount) {
		this.emit('preprocess', arguments);

		if (this.ringBuffer) {
			(this.channelMode === 'interleaved' ? this.ringSpin : this.ringSpinInterleaved).apply(this, arguments);
		}

		if (this.channelMode === 'interleaved') {
			this.emit('audioprocess', arguments);

			if (this.readFn) {
				this.readFn.apply(this, arguments);
			}
		} else {
			var	soundDataSplit	= Sink.deinterleave(soundData, this.channelCount),
				args		= [soundDataSplit].concat([].slice.call(arguments, 1));
			this.emit('audioprocess', args);

			if (this.readFn) {
				this.readFn.apply(this, args);
			}

			Sink.interleave(soundDataSplit, this.channelCount, soundData);
		}
		this.emit('postprocess', arguments);
		this.previousHit = +new Date();
		this.writePosition += soundData.length / channelCount;
	},
/**
 * Get the current output position, defaults to writePosition - bufferSize.
 *
 * @method Sink
 *
 * @return {Number} The position of the write head, in samples, per channel.
*/
	getPlaybackTime: function () {
		return this.writePosition - this.bufferSize;
	},
/**
 * Internal method to send the ready signal if not ready yet.
 * @method Sink
*/
	ready: function () {
		if (this.isReady) return;

		this.isReady = true;
		this.emit('ready', []);
	}
};

/**
 * The container for all the available sinks. Also a decorator function for creating a new Sink class and binding it.
 *
 * @method Sink
 * @static
 *
 * @arg {String} type The name / type of the Sink.
 * @arg {Function} constructor The constructor function for the Sink.
 * @arg {Object} prototype The prototype of the Sink. (optional)
 * @arg {Boolean} disabled Whether the Sink should be disabled at first.
*/

function sinks (type, constructor, prototype, disabled, priority) {
	prototype = prototype || constructor.prototype;
	constructor.prototype = new Sink.SinkClass();
	constructor.prototype.type = type;
	constructor.enabled = !disabled;

	var k;
	for (k in prototype) {
		if (prototype.hasOwnProperty(k)) {
			constructor.prototype[k] = prototype[k];
		}
	}

	sinks[type] = constructor;
	sinks.list[priority ? 'unshift' : 'push'](constructor);
}

Sink.sinks = Sink.devices = sinks;
Sink.sinks.list = [];

Sink.singleton = function () {
	var sink = Sink.apply(null, arguments);

	Sink.singleton = function () {
		return sink;
	};

	return sink;
};

global.Sink = Sink;

return Sink;

}(function (){ return this; }());
void function (Sink) {

/**
 * A light event emitter.
 *
 * @class
 * @static Sink
*/
function EventEmitter () {
	var k;
	for (k in EventEmitter.prototype) {
		if (EventEmitter.prototype.hasOwnProperty(k)) {
			this[k] = EventEmitter.prototype[k];
		}
	}
	this._listeners = {};
}

EventEmitter.prototype = {
	_listeners: null,
/**
 * Emits an event.
 *
 * @method EventEmitter
 *
 * @arg {String} name The name of the event to emit.
 * @arg {Array} args The arguments to pass to the event handlers.
*/
	emit: function (name, args) {
		if (this._listeners[name]) {
			for (var i=0; i<this._listeners[name].length; i++) {
				this._listeners[name][i].apply(this, args);
			}
		}
		return this;
	},
/**
 * Adds an event listener to an event.
 *
 * @method EventEmitter
 *
 * @arg {String} name The name of the event.
 * @arg {Function} listener The event listener to attach to the event.
*/
	on: function (name, listener) {
		this._listeners[name] = this._listeners[name] || [];
		this._listeners[name].push(listener);
		return this;
	},
/**
 * Adds an event listener to an event.
 *
 * @method EventEmitter
 *
 * @arg {String} name The name of the event.
 * @arg {Function} !listener The event listener to remove from the event. If not specified, will delete all.
*/
	off: function (name, listener) {
		if (this._listeners[name]) {
			if (!listener) {
				delete this._listeners[name];
				return this;
			}

			for (var i=0; i<this._listeners[name].length; i++) {
				if (this._listeners[name][i] === listener) {
					this._listeners[name].splice(i--, 1);
				}
			}

			if (!this._listeners[name].length) {
				delete this._listeners[name];
			}
		}
		return this;
	}
};

Sink.EventEmitter = EventEmitter;

EventEmitter.call(Sink);

}(this.Sink);
void function (Sink) {

/**
 * Creates a timer with consistent (ie. not clamped) intervals even in background tabs.
 * Uses inline workers to achieve this. If not available, will revert to regular timers.
 *
 * @static Sink
 * @name doInterval
 *
 * @arg {Function} callback The callback to trigger on timer hit.
 * @arg {Number} timeout The interval between timer hits.
 *
 * @return {Function} A function to cancel the timer.
*/

Sink.doInterval = function (callback, timeout) {
	var timer, kill;

	function create (noWorker) {
		if (Sink.inlineWorker.working && !noWorker) {
			timer = Sink.inlineWorker('setInterval(function (){ postMessage("tic"); }, ' + timeout + ');');
			timer.onmessage = function (){
				callback();
			};
			kill = function () {
				timer.terminate();
			};
		} else {
			timer = setInterval(callback, timeout);
			kill = function (){
				clearInterval(timer);
			};
		}
	}

	if (Sink.inlineWorker.ready) {
		create();
	} else {
		Sink.inlineWorker.on('ready', function () {
			create();
		});
	}

	return function () {
		if (!kill) {
			if (!Sink.inlineWorker.ready) {
				Sink.inlineWorker.on('ready', function () {
					if (kill) kill();
				});
			}
		} else {
			kill();
		}
	};
};

}(this.Sink);
void function (Sink) {

var _Blob, _BlobBuilder, _URL, _btoa;

void function (prefixes, urlPrefixes) {
	function find (name, prefixes) {
		var b, a = prefixes.slice();

		for (b=a.shift(); typeof b !== 'undefined'; b=a.shift()) {
			b = Function('return typeof ' + b + name + 
				'=== "undefined" ? undefined : ' +
				b + name)();

			if (b) return b;
		}
	}

	_Blob = find('Blob', prefixes);
	_BlobBuilder = find('BlobBuilder', prefixes);
	_URL = find('URL', urlPrefixes);
	_btoa = find('btoa', ['']);
}([
	'',
	'Moz',
	'WebKit',
	'MS'
], [
	'',
	'webkit'
]);

var createBlob = _Blob && _URL && function (content, type) {
	return _URL.createObjectURL(new _Blob([content], { type: type }));
};

var createBlobBuilder = _BlobBuilder && _URL && function (content, type) {
	var bb = new _BlobBuilder();
	bb.append(content);

	return _URL.createObjectURL(bb.getBlob(type));
};

var createData = _btoa && function (content, type) {
	return 'data:' + type + ';base64,' + _btoa(content);
};

var createDynURL =
	createBlob ||
	createBlobBuilder ||
	createData;

if (!createDynURL) return;

if (createBlob) createDynURL.createBlob = createBlob;
if (createBlobBuilder) createDynURL.createBlobBuilder = createBlobBuilder;
if (createData) createDynURL.createData = createData;

if (_Blob) createDynURL.Blob = _Blob;
if (_BlobBuilder) createDynURL.BlobBuilder = _BlobBuilder;
if (_URL) createDynURL.URL = _URL;

Sink.createDynURL = createDynURL;

Sink.revokeDynURL = function (url) {
	if (typeof url === 'string' && url.indexOf('data:') === 0) {
		return false;
	} else {
		return _URL.revokeObjectURL(url);
	}
};

}(this.Sink);
void function (Sink) {

/*
 * A Sink-specific error class.
 *
 * @class
 * @static Sink
 * @name Error
 *
 * @arg =code
 *
 * @param {Number} code The error code.
 * @param {String} message A brief description of the error.
 * @param {String} explanation A more verbose explanation of why the error occured and how to fix.
*/

function SinkError(code) {
	if (!SinkError.hasOwnProperty(code)) throw SinkError(1);
	if (!(this instanceof SinkError)) return new SinkError(code);

	var k;
	for (k in SinkError[code]) {
		if (SinkError[code].hasOwnProperty(k)) {
			this[k] = SinkError[code][k];
		}
	}

	this.code = code;
}

SinkError.prototype = new Error();

SinkError.prototype.toString = function () {
	return 'SinkError 0x' + this.code.toString(16) + ': ' + this.message;
};

SinkError[0x01] = {
	message: 'No such error code.',
	explanation: 'The error code does not exist.'
};
SinkError[0x02] = {
	message: 'No audio sink available.',
	explanation: 'The audio device may be busy, or no supported output API is available for this browser.'
};

SinkError[0x10] = {
	message: 'Buffer underflow.',
	explanation: 'Trying to recover...'
};
SinkError[0x11] = {
	message: 'Critical recovery fail.',
	explanation: 'The buffer underflow has reached a critical point, trying to recover, but will probably fail anyway.'
};
SinkError[0x12] = {
	message: 'Buffer size too large.',
	explanation: 'Unable to allocate the buffer due to excessive length, please try a smaller buffer. Buffer size should probably be smaller than the sample rate.'
};

Sink.Error = SinkError;

}(this.Sink);
void function (Sink) {

/**
 * Creates an inline worker using a data/blob URL, if possible.
 *
 * @static Sink
 *
 * @arg {String} script
 *
 * @return {Worker} A web worker, or null if impossible to create.
*/

var define = Object.defineProperty ? function (obj, name, value) {
	Object.defineProperty(obj, name, {
		value: value,
		configurable: true,
		writable: true
	});
} : function (obj, name, value) {
	obj[name] = value;
};

function terminate () {
	define(this, 'terminate', this._terminate);

	Sink.revokeDynURL(this._url);

	delete this._url;
	delete this._terminate;
	return this.terminate();
}

function inlineWorker (script) {
	function wrap (type, content, typeName) {
		try {
			var url = type(content, 'text/javascript');
			var worker = new Worker(url);

			define(worker, '_url', url);
			define(worker, '_terminate', worker.terminate);
			define(worker, 'terminate', terminate);

			if (inlineWorker.type) return worker;

			inlineWorker.type = typeName;
			inlineWorker.createURL = type;

			return worker;
		} catch (e) {
			return null;
		}
	}

	var createDynURL = Sink.createDynURL;
	var worker;

	if (inlineWorker.createURL) {
		return wrap(inlineWorker.createURL, script, inlineWorker.type);
	}

	worker = wrap(createDynURL.createBlob, script, 'blob');
	if (worker) return worker;

	worker = wrap(createDynURL.createBlobBuilder, script, 'blobbuilder');
	if (worker) return worker;

	worker = wrap(createDynURL.createData, script, 'data');

	return worker;
}

Sink.EventEmitter.call(inlineWorker);

inlineWorker.test = function () {
	inlineWorker.ready = inlineWorker.working = false;
	inlineWorker.type = '';
	inlineWorker.createURL = null;

	var worker = inlineWorker('this.onmessage=function(e){postMessage(e.data)}');
	var data = 'inlineWorker';

	function ready (success) {
		if (inlineWorker.ready) return;

		inlineWorker.ready = true;
		inlineWorker.working = success;
		inlineWorker.emit('ready', [success]);
		inlineWorker.off('ready');

		if (success && worker) {
			worker.terminate();
		}

		worker = null;
	}

	if (!worker) {
		setTimeout(function () {
			ready(false);
		}, 0);
	} else {
		worker.onmessage = function (e) {
			ready(e.data === data);
		};

		worker.postMessage(data);

		setTimeout(function () {
			ready(false);
		}, 1000);
	}
};

Sink.inlineWorker = inlineWorker;

inlineWorker.test();

}(this.Sink);
void function (Sink) {

/**
 * A Sink class for the Mozilla Audio Data API.
*/

Sink.sinks('audiodata', function () {
	var	self			= this,
		currentWritePosition	= 0,
		tail			= null,
		audioDevice		= new Audio(),
		written, currentPosition, available, soundData, prevPos,
		timer; // Fix for https://bugzilla.mozilla.org/show_bug.cgi?id=630117
	self.start.apply(self, arguments);
	self.preBufferSize = isNaN(arguments[4]) || arguments[4] === null ? this.preBufferSize : arguments[4];

	function bufferFill() {
		if (tail) {
			written = audioDevice.mozWriteAudio(tail);
			currentWritePosition += written;
			if (written < tail.length){
				tail = tail.subarray(written);
				return tail;
			}
			tail = null;
		}

		currentPosition = audioDevice.mozCurrentSampleOffset();
		available = Number(currentPosition + (prevPos !== currentPosition ? self.bufferSize : self.preBufferSize) * self.channelCount - currentWritePosition);

		if (currentPosition === prevPos) {
			self.emit('error', [Sink.Error(0x10)]);
		}

		if (available > 0 || prevPos === currentPosition){
			self.ready();

			try {
				soundData = new Float32Array(prevPos === currentPosition ? self.preBufferSize * self.channelCount :
					self.forceBufferSize ? available < self.bufferSize * 2 ? self.bufferSize * 2 : available : available);
			} catch(e) {
				self.emit('error', [Sink.Error(0x12)]);
				self.kill();
				return;
			}
			self.process(soundData, self.channelCount);
			written = self._audio.mozWriteAudio(soundData);
			if (written < soundData.length){
				tail = soundData.subarray(written);
			}
			currentWritePosition += written;
		}
		prevPos = currentPosition;
	}

	audioDevice.mozSetup(self.channelCount, self.sampleRate);

	this._timers = [];

	this._timers.push(Sink.doInterval(function () {
		// Check for complete death of the output
		if (+new Date() - self.previousHit > 2000) {
			self._audio = audioDevice = new Audio();
			audioDevice.mozSetup(self.channelCount, self.sampleRate);
			currentWritePosition = 0;
			self.emit('error', [Sink.Error(0x11)]);
		}
	}, 1000));

	this._timers.push(Sink.doInterval(bufferFill, self.interval));

	self._bufferFill	= bufferFill;
	self._audio		= audioDevice;
}, {
	// These are somewhat safe values...
	bufferSize: 24576,
	preBufferSize: 24576,
	forceBufferSize: false,
	interval: 100,

	kill: function () {
		while (this._timers.length) {
			this._timers.shift()();
		}

		this.emit('kill');
	},

	getPlaybackTime: function () {
		return this._audio.mozCurrentSampleOffset() / this.channelCount;
	}
}, false, true);

Sink.sinks.moz = Sink.sinks.audiodata;

}(this.Sink);
void function (Sink) {

/**
 * A dummy Sink. (No output)
*/

Sink.sinks('dummy', function () {
	var	self = this;
	self.start.apply(self, arguments);
	
	function bufferFill () {
		var	soundData = new Float32Array(self.bufferSize * self.channelCount);
		self.process(soundData, self.channelCount);
	}

	self._kill = Sink.doInterval(bufferFill, self.bufferSize / self.sampleRate * 1000);

	self._callback		= bufferFill;
}, {
	kill: function () {
		this._kill();
		this.emit('kill');
	}
}, true);

}(this.Sink);
(function (Sink, sinks) {

sinks = Sink.sinks;

function newAudio (src) {
	var audio = document.createElement('audio');
	if (src) {
		audio.src = src;
	}
	return audio;
}

/* TODO: Implement a <BGSOUND> hack for IE8. */

/**
 * A sink class for WAV data URLs
 * Relies on pcmdata.js and utils to be present.
 * Thanks to grantgalitz and others for the idea.
*/
sinks('wav', function () {
	var	self			= this,
		audio			= new sinks.wav.wavAudio(),
		PCMData			= typeof PCMData === 'undefined' ? audioLib.PCMData : PCMData;
	self.start.apply(self, arguments);
	var	soundData		= new Float32Array(self.bufferSize * self.channelCount),
		zeroData		= new Float32Array(self.bufferSize * self.channelCount);

	if (!newAudio().canPlayType('audio/wav; codecs=1') || !btoa) throw 0;
	
	function bufferFill () {
		if (self._audio.hasNextFrame) return;

		self.ready();

		Sink.memcpy(zeroData, 0, soundData, 0);
		self.process(soundData, self.channelCount);

		self._audio.setSource('data:audio/wav;base64,' + btoa(
			audioLib.PCMData.encode({
				data:		soundData,
				sampleRate:	self.sampleRate,
				channelCount:	self.channelCount,
				bytesPerSample:	self.quality
			})
		));

		if (!self._audio.currentFrame.src) self._audio.nextClip();
	}
	
	self.kill		= Sink.doInterval(bufferFill, 40);
	self._bufferFill	= bufferFill;
	self._audio		= audio;
}, {
	quality: 1,
	bufferSize: 22050,

	getPlaybackTime: function () {
		var audio = this._audio;
		return (audio.currentFrame ? audio.currentFrame.currentTime * this.sampleRate : 0) + audio.samples;
	}
});

function wavAudio () {
	var self = this;

	self.currentFrame	= newAudio();
	self.nextFrame		= newAudio();

	self._onended		= function () {
		self.samples += self.bufferSize;
		self.nextClip();
	};
}

wavAudio.prototype = {
	samples:	0,
	nextFrame:	null,
	currentFrame:	null,
	_onended:	null,
	hasNextFrame:	false,

	nextClip: function () {
		var	curFrame	= this.currentFrame;
		this.currentFrame	= this.nextFrame;
		this.nextFrame		= curFrame;
		this.hasNextFrame	= false;
		this.currentFrame.play();
	},

	setSource: function (src) {
		this.nextFrame.src = src;
		this.nextFrame.addEventListener('ended', this._onended, true);

		this.hasNextFrame = true;
	}
};

sinks.wav.wavAudio = wavAudio;

}(this.Sink));
 (function (sinks, fixChrome82795) {

var AudioContext = typeof window === 'undefined' ? null : window.webkitAudioContext || window.AudioContext;

/**
 * A sink class for the Web Audio API
*/

sinks('webaudio', function (readFn, channelCount, bufferSize, sampleRate) {
	var	self		= this,
		context		= sinks.webaudio.getContext(),
		node		= null,
		soundData	= null,
		zeroBuffer	= null;
	self.start.apply(self, arguments);
	node = context.createJavaScriptNode(self.bufferSize, self.channelCount, self.channelCount);

	function bufferFill(e) {
		var	outputBuffer	= e.outputBuffer,
			channelCount	= outputBuffer.numberOfChannels,
			i, n, l		= outputBuffer.length,
			size		= outputBuffer.size,
			channels	= new Array(channelCount),
			tail;

		self.ready();
		
		soundData	= soundData && soundData.length === l * channelCount ? soundData : new Float32Array(l * channelCount);
		zeroBuffer	= zeroBuffer && zeroBuffer.length === soundData.length ? zeroBuffer : new Float32Array(l * channelCount);
		soundData.set(zeroBuffer);

		for (i=0; i<channelCount; i++) {
			channels[i] = outputBuffer.getChannelData(i);
		}

		self.process(soundData, self.channelCount);

		for (i=0; i<l; i++) {
			for (n=0; n < channelCount; n++) {
				channels[n][i] = soundData[i * self.channelCount + n];
			}
		}
	}

	self.sampleRate = context.sampleRate;

	node.onaudioprocess = bufferFill;
	node.connect(context.destination);

	self._context		= context;
	self._node		= node;
	self._callback		= bufferFill;
	/* Keep references in order to avoid garbage collection removing the listeners, working around http://code.google.com/p/chromium/issues/detail?id=82795 */
	// Thanks to @baffo32
	fixChrome82795.push(node);
}, {
	kill: function () {
		this._node.disconnect(0);

		for (var i=0; i<fixChrome82795.length; i++) {
			if (fixChrome82795[i] === this._node) {
				fixChrome82795.splice(i--, 1);
			}
		}

		this._node = this._context = null;
		this.emit('kill');
	},

	getPlaybackTime: function () {
		return this._context.currentTime * this.sampleRate;
	}
}, false, true);

sinks.webkit = sinks.webaudio;

sinks.webaudio.fix82795 = fixChrome82795;

sinks.webaudio.getContext = function () {
	// For now, we have to accept that the AudioContext is at 48000Hz, or whatever it decides.
	var context = new AudioContext(/*sampleRate*/);

	sinks.webaudio.getContext = function () {
		return context;
	};

	return context;
};

}(this.Sink.sinks, []));
(function (Sink) {

/**
 * A Sink class for the Media Streams Processing API and/or Web Audio API in a Web Worker.
*/

Sink.sinks('worker', function () {
	var	self		= this,
		global		= (function(){ return this; }()),
		soundData	= null,
		outBuffer	= null,
		zeroBuffer	= null;
	self.start.apply(self, arguments);

	// Let's see if we're in a worker.

	importScripts();

	function mspBufferFill (e) {
		if (!self.isReady) {
			self.initMSP(e);
		}

		self.ready();

		var	channelCount	= self.channelCount,
			l		= e.audioLength,
			n, i;

		soundData	= soundData && soundData.length === l * channelCount ? soundData : new Float32Array(l * channelCount);
		outBuffer	= outBuffer && outBuffer.length === soundData.length ? outBuffer : new Float32Array(l * channelCount);
		zeroBuffer	= zeroBuffer && zeroBuffer.length === soundData.length ? zeroBuffer : new Float32Array(l * channelCount);

		soundData.set(zeroBuffer);
		outBuffer.set(zeroBuffer);

		self.process(soundData, self.channelCount);

		for (n=0; n<channelCount; n++) {
			for (i=0; i<l; i++) {
				outBuffer[n * e.audioLength + i] = soundData[n + i * channelCount];
			}
		}

		e.writeAudio(outBuffer);
	}

	function waBufferFill(e) {
		if (!self.isReady) {
			self.initWA(e);
		}

		self.ready();

		var	outputBuffer	= e.outputBuffer,
			channelCount	= outputBuffer.numberOfChannels,
			i, n, l		= outputBuffer.length,
			size		= outputBuffer.size,
			channels	= new Array(channelCount),
			tail;
		
		soundData	= soundData && soundData.length === l * channelCount ? soundData : new Float32Array(l * channelCount);
		zeroBuffer	= zeroBuffer && zeroBuffer.length === soundData.length ? zeroBuffer : new Float32Array(l * channelCount);
		soundData.set(zeroBuffer);

		for (i=0; i<channelCount; i++) {
			channels[i] = outputBuffer.getChannelData(i);
		}

		self.process(soundData, self.channelCount);

		for (i=0; i<l; i++) {
			for (n=0; n < channelCount; n++) {
				channels[n][i] = soundData[i * self.channelCount + n];
			}
		}
	}

	global.onprocessmedia	= mspBufferFill;
	global.onaudioprocess	= waBufferFill;

	self._mspBufferFill	= mspBufferFill;
	self._waBufferFill	= waBufferFill;

}, {
	ready: false,

	initMSP: function (e) {
		this.channelCount	= e.audioChannels;
		this.sampleRate		= e.audioSampleRate;
		this.bufferSize		= e.audioLength * this.channelCount;
		this.ready		= true;
		this.emit('ready', []);
	},

	initWA: function (e) {
		var b = e.outputBuffer;
		this.channelCount	= b.numberOfChannels;
		this.sampleRate		= b.sampleRate;
		this.bufferSize		= b.length * this.channelCount;
		this.ready		= true;
		this.emit('ready', []);
	}
});

}(this.Sink));
(function (Sink) {

/**
 * Splits a sample buffer into those of different channels.
 *
 * @static Sink
 * @name deinterleave
 *
 * @arg {Buffer} buffer The sample buffer to split.
 * @arg {Number} channelCount The number of channels to split to.
 *
 * @return {Array} An array containing the resulting sample buffers.
*/

Sink.deinterleave = function (buffer, channelCount) {
	var	l	= buffer.length,
		size	= l / channelCount,
		ret	= [],
		i, n;
	for (i=0; i<channelCount; i++){
		ret[i] = new Float32Array(size);
		for (n=0; n<size; n++){
			ret[i][n] = buffer[n * channelCount + i];
		}
	}
	return ret;
};

/**
 * Joins an array of sample buffers into a single buffer.
 *
 * @static Sink
 * @name resample
 *
 * @arg {Array} buffers The buffers to join.
 * @arg {Number} !channelCount The number of channels. Defaults to buffers.length
 * @arg {Buffer} !buffer The output buffer.
 *
 * @return {Buffer} The interleaved buffer created.
*/

Sink.interleave = function (buffers, channelCount, buffer) {
	channelCount		= channelCount || buffers.length;
	var	l		= buffers[0].length,
		bufferCount	= buffers.length,
		i, n;
	buffer			= buffer || new Float32Array(l * channelCount);
	for (i=0; i<bufferCount; i++) {
		for (n=0; n<l; n++) {
			buffer[i + n * channelCount] = buffers[i][n];
		}
	}
	return buffer;
};

/**
 * Mixes two or more buffers down to one.
 *
 * @static Sink
 * @name mix
 *
 * @arg {Buffer} buffer The buffer to append the others to.
 * @arg {Buffer} bufferX The buffers to append from.
 *
 * @return {Buffer} The mixed buffer.
*/

Sink.mix = function (buffer) {
	var	buffers	= [].slice.call(arguments, 1),
		l, i, c;
	for (c=0; c<buffers.length; c++){
		l = Math.max(buffer.length, buffers[c].length);
		for (i=0; i<l; i++){
			buffer[i] += buffers[c][i];
		}
	}
	return buffer;
};

/**
 * Resets a buffer to all zeroes.
 *
 * @static Sink
 * @name resetBuffer
 *
 * @arg {Buffer} buffer The buffer to reset.
 *
 * @return {Buffer} The 0-reset buffer.
*/

Sink.resetBuffer = function (buffer) {
	var	l	= buffer.length,
		i;
	for (i=0; i<l; i++){
		buffer[i] = 0;
	}
	return buffer;
};

/**
 * Copies the content of a buffer to another buffer.
 *
 * @static Sink
 * @name clone
 *
 * @arg {Buffer} buffer The buffer to copy from.
 * @arg {Buffer} !result The buffer to copy to.
 *
 * @return {Buffer} A clone of the buffer.
*/

Sink.clone = function (buffer, result) {
	var	l	= buffer.length,
		i;
	result = result || new Float32Array(l);
	for (i=0; i<l; i++){
		result[i] = buffer[i];
	}
	return result;
};

/**
 * Creates an array of buffers of the specified length and the specified count.
 *
 * @static Sink
 * @name createDeinterleaved
 *
 * @arg {Number} length The length of a single channel.
 * @arg {Number} channelCount The number of channels.
 * @return {Array} The array of buffers.
*/

Sink.createDeinterleaved = function (length, channelCount) {
	var	result	= new Array(channelCount),
		i;
	for (i=0; i<channelCount; i++){
		result[i] = new Float32Array(length);
	}
	return result;
};

Sink.memcpy = function (src, srcOffset, dst, dstOffset, length) {
	src	= src.subarray || src.slice ? src : src.buffer;
	dst	= dst.subarray || dst.slice ? dst : dst.buffer;

	src	= srcOffset ? src.subarray ?
		src.subarray(srcOffset, length && srcOffset + length) :
		src.slice(srcOffset, length && srcOffset + length) : src;

	if (dst.set) {
		dst.set(src, dstOffset);
	} else {
		for (var i=0; i<src.length; i++) {
			dst[i + dstOffset] = src[i];
		}
	}

	return dst;
};

Sink.memslice = function (buffer, offset, length) {
	return buffer.subarray ? buffer.subarray(offset, length) : buffer.slice(offset, length);
};

Sink.mempad = function (buffer, out, offset) {
	out = out.length ? out : new (buffer.constructor)(out);
	Sink.memcpy(buffer, 0, out, offset);
	return out;
};

Sink.linspace = function (start, end, out) {
	var l, i, n, step;
	out	= out.length ? (l=out.length) && out : Array(l=out);
	step	= (end - start) / --l;
	for (n=start+step, i=1; i<l; i++, n+=step) {
		out[i] = n;
	}
	out[0]	= start;
	out[l]	= end;
	return out;
};

Sink.ftoi = function (input, bitCount, output) {
	var i, mask = Math.pow(2, bitCount - 1);

	output = output || new (input.constructor)(input.length);

	for (i=0; i<input.length; i++) {
		output[i] = ~~(mask * input[i]);
	}

	return output;
};

}(this.Sink));
(function (Sink) {

function Proxy (bufferSize, channelCount) {
	Sink.EventEmitter.call(this);

	this.bufferSize		= isNaN(bufferSize) || bufferSize === null ? this.bufferSize : bufferSize;
	this.channelCount	= isNaN(channelCount) || channelCount === null ? this.channelCount : channelCount;

	var self = this;
	this.callback = function () {
		return self.process.apply(self, arguments);
	};

	this.resetBuffer();
}

Proxy.prototype = {
	buffer: null,
	zeroBuffer: null,
	parentSink: null,
	bufferSize: 4096,
	channelCount: 2,
	offset: null,

	resetBuffer: function () {
		this.buffer	= new Float32Array(this.bufferSize);
		this.zeroBuffer	= new Float32Array(this.bufferSize);
	},

	process: function (buffer, channelCount) {
		if (this.offset === null) {
			this.loadBuffer();
		}

		for (var i=0; i<buffer.length; i++) {
			if (this.offset >= this.buffer.length) {
				this.loadBuffer();
			}

			buffer[i] = this.buffer[this.offset++];
		}
	},

	loadBuffer: function () {
		this.offset = 0;
		Sink.memcpy(this.zeroBuffer, 0, this.buffer, 0);
		this.emit('audioprocess', [this.buffer, this.channelCount]);
	}
};

Sink.Proxy = Proxy;

/**
 * Creates a proxy callback system for the sink instance.
 * Requires Sink utils.
 *
 * @method Sink
 * @method createProxy
 *
 * @arg {Number} !bufferSize The buffer size for the proxy.
*/
Sink.prototype.createProxy = function (bufferSize) {
	var	proxy		= new Sink.Proxy(bufferSize, this.channelCount);
	proxy.parentSink	= this;

	this.on('audioprocess', proxy.callback);

	return proxy;
};

}(this.Sink));
(function (Sink) {

(function(){

/**
 * If method is supplied, adds a new interpolation method to Sink.interpolation, otherwise sets the default interpolation method (Sink.interpolate) to the specified property of Sink.interpolate.
 *
 * @arg {String} name The name of the interpolation method to get / set.
 * @arg {Function} !method The interpolation method.
*/

function interpolation(name, method) {
	if (name && method) {
		interpolation[name] = method;
	} else if (name && interpolation[name] instanceof Function) {
		Sink.interpolate = interpolation[name];
	}
	return interpolation[name];
}

Sink.interpolation = interpolation;


/**
 * Interpolates a fractal part position in an array to a sample. (Linear interpolation)
 *
 * @param {Array} arr The sample buffer.
 * @param {number} pos The position to interpolate from.
 * @return {Float32} The interpolated sample.
*/
interpolation('linear', function (arr, pos) {
	var	first	= Math.floor(pos),
		second	= first + 1,
		frac	= pos - first;
	second		= second < arr.length ? second : 0;
	return arr[first] * (1 - frac) + arr[second] * frac;
});

/**
 * Interpolates a fractal part position in an array to a sample. (Nearest neighbour interpolation)
 *
 * @param {Array} arr The sample buffer.
 * @param {number} pos The position to interpolate from.
 * @return {Float32} The interpolated sample.
*/
interpolation('nearest', function (arr, pos) {
	return pos >= arr.length - 0.5 ? arr[0] : arr[Math.round(pos)];
});

interpolation('linear');

}());


/**
 * Resamples a sample buffer from a frequency to a frequency and / or from a sample rate to a sample rate.
 *
 * @static Sink
 * @name resample
 *
 * @arg {Buffer} buffer The sample buffer to resample.
 * @arg {Number} fromRate The original sample rate of the buffer, or if the last argument, the speed ratio to convert with.
 * @arg {Number} fromFrequency The original frequency of the buffer, or if the last argument, used as toRate and the secondary comparison will not be made.
 * @arg {Number} toRate The sample rate of the created buffer.
 * @arg {Number} toFrequency The frequency of the created buffer.
 *
 * @return The new resampled buffer.
*/
Sink.resample	= function (buffer, fromRate /* or speed */, fromFrequency /* or toRate */, toRate, toFrequency) {
	var
		argc		= arguments.length,
		speed		= argc === 2 ? fromRate : argc === 3 ? fromRate / fromFrequency : toRate / fromRate * toFrequency / fromFrequency,
		l		= buffer.length,
		length		= Math.ceil(l / speed),
		newBuffer	= new Float32Array(length),
		i, n;
	for (i=0, n=0; i<l; i += speed) {
		newBuffer[n++] = Sink.interpolate(buffer, i);
	}
	return newBuffer;
};

}(this.Sink));
void function (Sink) {

Sink.on('init', function (sink) {
	sink.activeRecordings = [];
	sink.on('postprocess', sink.recordData);
});

Sink.prototype.activeRecordings = null;

/**
 * Starts recording the sink output.
 *
 * @method Sink
 * @name record
 *
 * @return {Recording} The recording object for the recording started.
*/
Sink.prototype.record = function () {
	var recording = new Sink.Recording(this);
	this.emit('record', [recording]);
	return recording;
};
/**
 * Private method that handles the adding the buffers to all the current recordings.
 *
 * @method Sink
 * @method recordData
 *
 * @arg {Array} buffer The buffer to record.
*/
Sink.prototype.recordData = function (buffer) {
	var	activeRecs	= this.activeRecordings,
		i, l		= activeRecs.length;
	for (i=0; i<l; i++) {
		activeRecs[i].add(buffer);
	}
};

/**
 * A Recording class for recording sink output.
 *
 * @class
 * @static Sink
 * @arg {Object} bindTo The sink to bind the recording to.
*/

function Recording (bindTo) {
	this.boundTo = bindTo;
	this.buffers = [];
	bindTo.activeRecordings.push(this);
}

Recording.prototype = {
/**
 * Adds a new buffer to the recording.
 *
 * @arg {Array} buffer The buffer to add.
 *
 * @method Recording
*/
	add: function (buffer) {
		this.buffers.push(buffer);
	},
/**
 * Empties the recording.
 *
 * @method Recording
*/
	clear: function () {
		this.buffers = [];
	},
/**
 * Stops the recording and unbinds it from it's host sink.
 *
 * @method Recording
*/
	stop: function () {
		var	recordings = this.boundTo.activeRecordings,
			i;
		for (i=0; i<recordings.length; i++) {
			if (recordings[i] === this) {
				recordings.splice(i--, 1);
			}
		}
	},
/**
 * Joins the recorded buffers into a single buffer.
 *
 * @method Recording
*/
	join: function () {
		var	bufferLength	= 0,
			bufPos		= 0,
			buffers		= this.buffers,
			newArray,
			n, i, l		= buffers.length;

		for (i=0; i<l; i++) {
			bufferLength += buffers[i].length;
		}
		newArray = new Float32Array(bufferLength);
		for (i=0; i<l; i++) {
			for (n=0; n<buffers[i].length; n++) {
				newArray[bufPos + n] = buffers[i][n];
			}
			bufPos += buffers[i].length;
		}
		return newArray;
	}
};

Sink.Recording = Recording;

}(this.Sink);
void function (Sink) {

function processRingBuffer () {
	if (this.ringBuffer) {
		(this.channelMode === 'interleaved' ? this.ringSpin : this.ringSpinInterleaved).apply(this, arguments);
	}
}

Sink.on('init', function (sink) {
	sink.on('preprocess', processRingBuffer);
});

Sink.prototype.ringBuffer = null;

/**
 * A private method that applies the ring buffer contents to the specified buffer, while in interleaved mode.
 *
 * @method Sink
 * @name ringSpin
 *
 * @arg {Array} buffer The buffer to write to.
*/
Sink.prototype.ringSpin = function (buffer) {
	var	ring	= this.ringBuffer,
		l	= buffer.length,
		m	= ring.length,
		off	= this.ringOffset,
		i;
	for (i=0; i<l; i++){
		buffer[i] += ring[off];
		off = (off + 1) % m;
	}
	this.ringOffset = off;
};

/**
 * A private method that applies the ring buffer contents to the specified buffer, while in deinterleaved mode.
 *
 * @method Sink
 * @name ringSpinDeinterleaved
 *
 * @param {Array} buffer The buffers to write to.
*/
Sink.prototype.ringSpinDeinterleaved = function (buffer) {
	var	ring	= this.ringBuffer,
		l	= buffer.length,
		ch	= ring.length,
		m	= ring[0].length,
		len	= ch * m,
		off	= this.ringOffset,
		i, n;
	for (i=0; i<l; i+=ch){
		for (n=0; n<ch; n++){
			buffer[i + n] += ring[n][off];
		}
		off = (off + 1) % m;
	}
	this.ringOffset = n;
};

}(this.Sink);
void function (Sink, proto) {

proto = Sink.prototype;

Sink.on('init', function (sink) {
	sink.asyncBuffers	= [];
	sink.syncBuffers	= [];
	sink.on('preprocess', sink.writeBuffersSync);
	sink.on('postprocess', sink.writeBuffersAsync);
});

proto.writeMode		= 'async';
proto.asyncBuffers	= proto.syncBuffers = null;

/**
 * Private method that handles the mixing of asynchronously written buffers.
 *
 * @method Sink
 * @name writeBuffersAsync
 *
 * @arg {Array} buffer The buffer to write to.
*/
proto.writeBuffersAsync = function (buffer) {
	var	buffers		= this.asyncBuffers,
		l		= buffer.length,
		buf,
		bufLength,
		i, n, offset;
	if (buffers) {
		for (i=0; i<buffers.length; i++) {
			buf		= buffers[i];
			bufLength	= buf.b.length;
			offset		= buf.d;
			buf.d		-= Math.min(offset, l);
			
			for (n=0; n + offset < l && n < bufLength; n++) {
				buffer[n + offset] += buf.b[n];
			}
			buf.b = buf.b.subarray(n + offset);
			if (i >= bufLength) {
				buffers.splice(i--, 1);
			}
		}
	}
};

/**
 * A private method that handles mixing synchronously written buffers.
 *
 * @method Sink
 * @name writeBuffersSync
 *
 * @arg {Array} buffer The buffer to write to.
*/
proto.writeBuffersSync = function (buffer) {
	var	buffers		= this.syncBuffers,
		l		= buffer.length,
		i		= 0,
		soff		= 0;
	for (;i<l && buffers.length; i++) {
		buffer[i] += buffers[0][soff];
		if (buffers[0].length <= soff){
			buffers.splice(0, 1);
			soff = 0;
			continue;
		}
		soff++;
	}
	if (buffers.length) {
		buffers[0] = buffers[0].subarray(soff);
	}
};

/**
 * Writes a buffer asynchronously on top of the existing signal, after a specified delay.
 *
 * @method Sink
 * @name writeBufferAsync
 *
 * @arg {Array} buffer The buffer to write.
 * @arg {Number} delay The delay to write after. If not specified, the Sink will calculate a delay to compensate the latency.
 * @return {Number} The number of currently stored asynchronous buffers.
*/
proto.writeBufferAsync = function (buffer, delay) {
	buffer			= this.mode === 'deinterleaved' ? Sink.interleave(buffer, this.channelCount) : buffer;
	var	buffers		= this.asyncBuffers;
	buffers.push({
		b: buffer,
		d: isNaN(delay) ? ~~((+new Date() - this.previousHit) / 1000 * this.sampleRate) : delay
	});
	return buffers.length;
};

/**
 * Writes a buffer synchronously to the output.
 *
 * @method Sink
 * @name writeBufferSync
 *
 * @param {Array} buffer The buffer to write.
 * @return {Number} The number of currently stored synchronous buffers.
*/
proto.writeBufferSync = function (buffer) {
	buffer			= this.mode === 'deinterleaved' ? Sink.interleave(buffer, this.channelCount) : buffer;
	var	buffers		= this.syncBuffers;
	buffers.push(buffer);
	return buffers.length;
};

/**
 * Writes a buffer, according to the write mode specified.
 *
 * @method Sink
 * @name writeBuffer
 *
 * @arg {Array} buffer The buffer to write.
 * @arg {Number} delay The delay to write after. If not specified, the Sink will calculate a delay to compensate the latency. (only applicable in asynchronous write mode)
 * @return {Number} The number of currently stored (a)synchronous buffers.
*/
proto.writeBuffer = function () {
	return this[this.writeMode === 'async' ? 'writeBufferAsync' : 'writeBufferSync'].apply(this, arguments);
};

/**
 * Gets the total amount of yet unwritten samples in the synchronous buffers.
 *
 * @method Sink
 * @name getSyncWriteOffset
 *
 * @return {Number} The total amount of yet unwritten samples in the synchronous buffers.
*/
proto.getSyncWriteOffset = function () {
	var	buffers		= this.syncBuffers,
		offset		= 0,
		i;
	for (i=0; i<buffers.length; i++) {
		offset += buffers[i].length;
	}
	return offset;
};

} (this.Sink);

/*jshint unused:false */

//    Teoria.js
//    http://saebekassebil.github.com/teoria
//    Copyright Jakob Miland (saebekassebil)
//    Teoria may be freely distributed under the MIT License.

(function teoriaClosure() {
  'use strict';

  var teoria = {};

  var kNotes = {
    'c': {
      name: 'c',
      distance: 0,
      index: 0
    },
    'd': {
      name: 'd',
      distance: 2,
      index: 1
    },
    'e': {
      name: 'e',
      distance: 4,
      index: 2
    },
    'f': {
      name: 'f',
      distance: 5,
      index: 3
    },
    'g': {
      name: 'g',
      distance: 7,
      index: 4
    },
    'a': {
      name: 'a',
      distance: 9,
      index: 5
    },
    'b': {
      name: 'b',
      distance: 11,
      index: 6
    },
    'h': {
      name: 'h',
      distance: 11,
      index: 6
    }
  };

  var kNoteIndex = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];

  var kDurations = {
    '0.25': 'longa',
    '0.5': 'breve',
    '1': 'whole',
    '2': 'half',
    '4': 'quarter',
    '8': 'eighth',
    '16': 'sixteenth',
    '32': 'thirty-second',
    '64': 'sixty-fourth',
    '128': 'hundred-twenty-eighth'
  };

  var kIntervals = [{
    name: 'first',
    quality: 'perfect',
    size: 0
  }, {
    name: 'second',
    quality: 'minor',
    size: 1
  }, {
    name: 'third',
    quality: 'minor',
    size: 3
  }, {
    name: 'fourth',
    quality: 'perfect',
    size: 5
  }, {
    name: 'fifth',
    quality: 'perfect',
    size: 7
  }, {
    name: 'sixth',
    quality: 'minor',
    size: 8
  }, {
    name: 'seventh',
    quality: 'minor',
    size: 10
  }, {
    name: 'octave',
    quality: 'perfect',
    size: 12
  }];

  var kIntervalIndex = {
    'first': 0, 'second': 1, 'third': 2, 'fourth': 3,
    'fifth': 4, 'sixth': 5, 'seventh': 6, 'octave': 7,
    'ninth': 8, 'tenth': 9, 'eleventh': 10, 'twelfth': 11,
    'thirteenth': 12, 'fourteenth': 13, 'fifteenth': 14
  };

  var kQualityLong = {
    'P': 'perfect',
    'M': 'major',
    'm': 'minor',
    '-': 'minor',
    'A': 'augmented',
    '+': 'augmented',
    'AA': 'doubly augmented',
    'd': 'diminished',
    'dd': 'doubly diminished',

    'min': 'minor',
    'aug': 'augmented',
    'dim': 'diminished'
  };

  var kQualityTemp = {
    'perfect': 'P',
    'major': 'M',
    'minor': 'm',
    'augmented': 'A',
    'doubly augmented': 'AA',
    'diminished': 'd',
    'doubly diminished': 'dd'
  };

  var kValidQualities = {
    perfect: {
      'doubly diminished': -2,
      diminished: -1,
      perfect: 0,
      augmented: 1,
      'doubly augmented': 2
    },

    minor: {
      'doubly diminished': -2,
      diminished: -1,
      minor: 0,
      major: 1,
      augmented: 2,
      'doubly augmented': 3
    }
  };

  var kQualityInversion = {
    'perfect': 'perfect',
    'major': 'minor',
    'minor': 'major',
    'augmented': 'diminished',
    'doubly augmented': 'doubly diminished',
    'diminished': 'augmented',
    'doubly diminished': 'doubly augmented'
  };

  var kAlterations = {
    perfect: ['doubly diminished', 'diminished', 'perfect',
              'augmented', 'doubly augmented'],

    minor: ['doubly diminished', 'diminished', 'minor',
            'major', 'augmented', 'doubly augmented']
  };

  var kSymbols = {
    'min': ['m3', 'P5'],
    'm': ['m3', 'P5'],
    '-': ['m3', 'P5'],

    'M': ['M3', 'P5'],
    '': ['M3', 'P5'],

    '+': ['M3', 'A5'],
    'aug': ['M3', 'A5'],

    'dim': ['m3', 'd5'],
    'o': ['m3', 'd5'],

    'maj': ['M3', 'P5', 'M7'],
    'dom': ['M3', 'P5', 'm7'],
    'ø': ['m3', 'd5', 'm7'],

    '5': ['P5']
  };

  var kChordShort = {
    'major': 'M',
    'minor': 'm',
    'augmented': 'aug',
    'diminished': 'dim',
    'half-diminished': '7b5',
    'power': '5',
    'dominant': '7'
  };

  var kAccidentalSign = {
    '-2': 'bb',
    '-1': 'b',
    '0': '',
    '1': '#',
    '2': 'x'
  };

  var kAccidentalValue = {
    'bb': -2,
    'b': -1,
    '#': 1,
    'x': 2
  };

  var kStepNumber = {
    'first': '1',
    'tonic': '1',
    'second': '2',
    'third': '3',
    'fourth': '4',
    'fifth': '5',
    'sixth': '6',
    'seventh': '7',
    'ninth': '9',
    'eleventh': '11',
    'thirteenth': '13'
  };

  // Adjusted Shearer syllables - Chromatic solfege system
  // Some intervals are not provided for. These include:
  // dd2 - Doubly diminished second
  // dd3 - Doubly diminished third
  // AA3 - Doubly augmented third
  // dd6 - Doubly diminished sixth
  // dd7 - Doubly diminished seventh
  // AA7 - Doubly augmented seventh
  var kIntervalSolfege = {
    'dd1': 'daw',
    'd1': 'de',
    'P1': 'do',
    'A1': 'di',
    'AA1': 'dai',
    'd2': 'raw',
    'm2': 'ra',
    'M2': 're',
    'A2': 'ri',
    'AA2': 'rai',
    'd3': 'maw',
    'm3': 'me',
    'M3': 'mi',
    'A3': 'mai',
    'dd4': 'faw',
    'd4': 'fe',
    'P4': 'fa',
    'A4': 'fi',
    'AA4': 'fai',
    'dd5': 'saw',
    'd5': 'se',
    'P5': 'so',
    'A5': 'si',
    'AA5': 'sai',
    'd6': 'law',
    'm6': 'le',
    'M6': 'la',
    'A6': 'li',
    'AA6': 'lai',
    'd7': 'taw',
    'm7': 'te',
    'M7': 'ti',
    'A7': 'tai',
    'dd8': 'daw',
    'd8': 'de',
    'P8': 'do',
    'A8': 'di',
    'AA8': 'dai'
  };
  /**
   * getDistance, returns the distance in semitones between two notes
   */
  function getDistance(from, to) {
    from = kNotes[from];
    to = kNotes[to];
    if (from.distance > to.distance) {
      return (to.distance + 12) - from.distance;
    } else {
      return to.distance - from.distance;
    }
  }

  function pad(str, ch, len) {
    for (; len > 0; len--) {
      str += ch;
    }

    return str;
  }

  // teoria.note namespace - All notes should be instantiated
  // through this function.
  teoria.note = function(name, duration) {
    return new TeoriaNote(name, duration);
  };

  teoria.note.fromKey = function(key) {
    var octave = Math.floor((key - 4) / 12);
    var distance = key - (octave * 12) - 4;
    var note = kNotes[kNoteIndex[Math.round(distance / 2)]];
    var name = note.name;
    if (note.distance < distance) {
      name += '#';
    } else if (note.distance > distance) {
      name += 'b';
    }

    return teoria.note(name + (octave + 1));
  };

  teoria.note.fromFrequency = function(fq, concertPitch) {
    var key, cents, originalFq;
    concertPitch = concertPitch || 440;

    key = 49 + 12 * ((Math.log(fq) - Math.log(concertPitch)) / Math.log(2));
    key = Math.round(key);
    originalFq = concertPitch * Math.pow(2, (key - 49) / 12);
    cents = 1200 * (Math.log(fq / originalFq) / Math.log(2));

    return {note: teoria.note.fromKey(key), cents: cents};
  };

  teoria.note.fromMIDI = function(note) {
    return teoria.note.fromKey(note - 20);
  };

  // teoria.chord namespace - All chords should be instantiated
  // through this function.
  teoria.chord = function(name, symbol) {
    if (typeof name === 'string') {
      var root, octave;
      root = name.match(/^([a-h])(x|#|bb|b?)/i);
      if (root && root[0]) {
        octave = typeof symbol === 'number' ? symbol.toString(10) : '4';
        return new TeoriaChord(teoria.note(root[0].toLowerCase() + octave),
                              name.substr(root[0].length));
      }
    } else if (name instanceof TeoriaNote) {
      return new TeoriaChord(name, symbol || '');
    }

    throw new Error('Invalid Chord. Couldn\'t find note name');
  };

  /**
   * teoria.interval
   *
   * Sugar function for #from and #between methods, with the possibility to
   * declare a interval by its string name: P8, M3, m7 etc.
   */
  teoria.interval = function(from, to, direction) {
    var quality, intervalNumber, interval, match;

    // Construct a TeoriaInterval object from string representation
    if (typeof from === 'string') {
      match = from.match(/^(AA|A|P|M|m|d|dd)(-?\d+)$/);
      if (!match) {
        throw new Error('Invalid string-interval format');
      }

      quality = kQualityLong[match[1]];
      intervalNumber = parseInt(match[2], 10);

      // Uses the second argument 'to', as direction
      direction = to === 'down' || intervalNumber < 0 ? 'down' : 'up';

      return new TeoriaInterval(Math.abs(intervalNumber), quality, direction);
    }

    if (typeof to === 'string' && from instanceof TeoriaNote) {
      interval = teoria.interval(to, direction);

      return teoria.interval.from(from, interval);
    } else if (to instanceof TeoriaNote && from instanceof TeoriaNote) {
      return teoria.interval.between(from, to);
    } else {
      throw new Error('Invalid parameters');
    }
  };

  /**
   * Returns the note from a given note (from), with a given interval (to)
   */
  teoria.interval.from = function(from, to) {
    var note, diff, octave, index, dist, intval, dir;
    dir = (to.direction === 'down') ? -1 : 1;

    intval = to.simpleInterval - 1;
    intval = dir * intval;

    index = kNotes[from.name].index + intval;

    if (index > kNoteIndex.length - 1) {
      index = index - kNoteIndex.length;
    } else if (index < 0) {
      index = index + kNoteIndex.length;
    }

    note = kNoteIndex[index];
    dist = getDistance(from.name, note);

    if (dir > 0) {
      diff = to.simpleIntervalType.size + to.qualityValue() - dist;
    } else {
      diff = getDistance(note, from.name) -
        (to.simpleIntervalType.size + to.qualityValue());
    }
    diff += from.accidental.value;

    octave = Math.floor((from.key() - from.accidental.value + dist - 4) / 12);
    octave += 1 + dir * to.compoundOctaves;

    if (diff >= 10) {
      diff -= 12;
    } else if (diff <= -10) {
      diff += 12;
    }

    if (to.simpleInterval === 8) {
      octave += dir;
    } else if (dir < 0) {
      octave--;
    }

    note += kAccidentalSign[diff];
    return teoria.note(note + octave.toString(10));
  };

  /**
   * Returns the interval between two instances of teoria.note
   */
  teoria.interval.between = function(from, to) {
    var semitones, interval, intervalInt, quality,
        alteration, direction = 'up', dir = 1;

    semitones = to.key() - from.key();
    intervalInt = to.key(true) - from.key(true);

    if (intervalInt < 0) {
      intervalInt = -intervalInt;
      direction = 'down';
      dir = -1;
    }

    interval = kIntervals[intervalInt % 7];
    alteration = kAlterations[interval.quality];
    quality = alteration[(dir * semitones - interval.size + 2) % 12];

    return new TeoriaInterval(intervalInt + 1, quality, direction);
  };

  teoria.interval.invert = function(sInterval) {
    return teoria.interval(sInterval).invert().toString();
  };

  // teoria.scale namespace - Scales are constructed through this function.
  teoria.scale = function(tonic, scale) {
    if (!(tonic instanceof TeoriaNote)) {
      tonic = teoria.note(tonic);
    }

    return new TeoriaScale(tonic, scale);
  };

  teoria.scale.scales = {};

  /**
   * TeoriaNote - teoria.note - the note object
   *
   * This object is the representation of a note.
   * The constructor must be called with a name,
   * and optionally a duration argument.
   * The first parameter (name) can be specified in either
   * scientific notation (name+accidentals+octave). Fx:
   *    A4 - Cb3 - D#8 - Hbb - etc.
   * Or in the Helmholtz notation:
   *    C,, - f#'' - d - Eb - etc.
   * The second argument must be an object literal, with a
   * 'value' property and/or a 'dots' property. By default,
   * the duration value is 4 (quarter note) and dots is 0.
   */
  function TeoriaNote(name, duration) {
    if (typeof name !== 'string') {
      return null;
    }

    duration = duration || {};

    this.name = name;
    this.duration = {value: duration.value || 4, dots: duration.dots || 0};
    this.accidental = {value: 0, sign: ''};
    var scientific = /^([a-h])(x|#|bb|b?)(-?\d*)/i;
    var helmholtz = /^([a-h])(x|#|bb|b?)([,\']*)$/i;
    var accidentalSign, accidentalValue, noteName, octave;

    // Start trying to parse scientific notation
    var parser = name.match(scientific);
    if (parser && name === parser[0] && parser[3].length !== 0) { // Scientific
      noteName = parser[1].toLowerCase();
      octave = parseInt(parser[3], 10);

      if (parser[2].length > 0) {
        accidentalSign = parser[2].toLowerCase();
        accidentalValue = kAccidentalValue[parser[2]];
      }
    } else { // Helmholtz Notation
      name = name.replace(/\u2032/g, "'").replace(/\u0375/g, ',');

      parser = name.match(helmholtz);
      if (!parser || name !== parser[0]) {
        throw new Error('Invalid note format');
      }

      noteName = parser[1];
      octave = parser[3];
      if (parser[2].length > 0) {
        accidentalSign = parser[2].toLowerCase();
        accidentalValue = kAccidentalValue[parser[2]];
      }

      if (octave.length === 0) { // no octave symbols
        octave = (noteName === noteName.toLowerCase()) ? 3 : 2;
      } else {
        if (octave.match(/^'+$/)) {
          if (noteName === noteName.toUpperCase()) { // If upper-case
            throw new Error('Format must respect the Helmholtz notation');
          }

          octave = 3 + octave.length;
        } else if (octave.match(/^,+$/)) {
          if (noteName === noteName.toLowerCase()) { // If lower-case
            throw new Error('Format must respect the Helmholtz notation');
          }

          octave = 2 - octave.length;
        } else {
          throw new Error('Invalid characters after note name.');
        }
      }
    }

    this.name = noteName.toLowerCase();
    this.octave = octave;

    if (accidentalSign) {
      this.accidental.value = accidentalValue;
      this.accidental.sign = accidentalSign;
    }
  }

  TeoriaNote.prototype = {
    /**
     * Returns the key number of the note
     */
    key: function(whitenotes) {
      var noteValue;
      if (whitenotes) {
        noteValue = Math.ceil(kNotes[this.name].distance / 2);
        return (this.octave - 1) * 7 + 3 + noteValue;
      } else {
        noteValue = kNotes[this.name].distance + this.accidental.value;
        return (this.octave - 1) * 12 + 4 + noteValue;
      }
    },

    /**
     * Calculates and returns the frequency of the note.
     * Optional concert pitch (def. 440)
     */
    fq: function(concertPitch) {
      concertPitch = concertPitch || 440;

      return concertPitch * Math.pow(2, (this.key() - 49) / 12);
    },

    /**
     * Returns the pitch class index (chroma) of the note
     */
    chroma: function() {
      var value = (kNotes[this.name].distance + this.accidental.value) % 12;
      return (value < 0) ? value + 12 : value;
    },

    /**
     * Sugar function for teoria.scale(note, scale)
     */
    scale: function(scale) {
      return teoria.scale(this, scale);
    },

    /**
     * Sugar function for teoria.interval(note, interval[, direction])
     */
    interval: function(interval, direction) {
      return teoria.interval(this, interval, direction);
    },

    /**
     * Transposes the note, returned by TeoriaNote#interval
     */
    transpose: function(interval, direction) {
      var note = teoria.interval(this, interval, direction);
      this.name = note.name;
      this.octave = note.octave;
      this.accidental = note.accidental;

      return this;
    },

    /**
     * Returns a TeoriaChord object with this note as root
     */
    chord: function(chord) {
      chord = (chord in kChordShort) ? kChordShort[chord] : chord;

      return new TeoriaChord(this, chord);
    },

    /**
     * Returns the Helmholtz notation form of the note (fx C,, d' F# g#'')
     */
    helmholtz: function() {
      var name = (this.octave < 3) ? this.name.toUpperCase() :
                                     this.name.toLowerCase();
      var paddingChar = (this.octave < 3) ? ',' : '\'';
      var paddingCount = (this.octave < 2) ? 2 - this.octave : this.octave - 3;

      return pad(name + this.accidental.sign, paddingChar, paddingCount);
    },

    /**
     * Returns the scientific notation form of the note (fx E4, Bb3, C#7 etc.)
     */
    scientific: function() {
      return this.name.toUpperCase() + this.accidental.sign + this.octave;
    },

    /**
     * Returns notes that are enharmonic with this note.
     */
    enharmonics: function() {
      var enharmonics = [], key = this.key(),
      upper = this.interval('m2', 'up'), lower = this.interval('m2', 'down');
      var upperKey = upper.key() - upper.accidental.value;
      var lowerKey = lower.key() - lower.accidental.value;
      var diff = key - upperKey;
      if (diff < 3 && diff > -3) {
        upper.accidental = {value: diff, sign: kAccidentalSign[diff]};
        enharmonics.push(upper);
      }

      diff = key - lowerKey;
      if (diff < 3 && diff > -3) {
        lower.accidental = {value: diff, sign: kAccidentalSign[diff]};
        enharmonics.push(lower);
      }

      return enharmonics;
    },

    solfege: function(scale, showOctaves) {
      if (!(scale instanceof TeoriaScale)) {
        throw new Error('Invalid Scale');
      }

      var interval = scale.tonic.interval(this), solfege, stroke, count;
      if (interval.direction === 'down') {
        interval = interval.invert();
      }

      if (showOctaves) {
        count = (this.key(true) - scale.tonic.key(true)) / 7;
        count = (count >= 0) ? Math.floor(count) : -(Math.ceil(-count));
        stroke = (count >= 0) ? '\'' : ',';
      }

      solfege = kIntervalSolfege[interval.simple(true)];
      return (showOctaves) ? pad(solfege, stroke, Math.abs(count)) : solfege;
    },

    /**
     * Returns the name of the duration value,
     * such as 'whole', 'quarter', 'sixteenth' etc.
     */
    durationName: function() {
      return kDurations[this.duration.value];
    },

    /**
     * Returns the duration of the note (including dots)
     * in seconds. The first argument is the tempo in beats
     * per minute, the second is the beat unit (i.e. the
     * lower numeral in a time signature).
     */
    durationInSeconds: function(bpm, beatUnit) {
      var secs = (60 / bpm) / (this.duration.value / 4) / (beatUnit / 4);
      return secs * 2 - secs / Math.pow(2, this.duration.dots);
    },

    /**
     * Returns the degree of this note in a given scale
     * If the scale doesn't contain this note, the scale degree
     * will be returned as 0 allowing for expressions such as:
     * if (teoria.note('a').scaleDegree(teoria.scale('a', 'major'))) {
     *   ...
     * }
     *
     * as 0 evaluates to false in boolean context
     **/
    scaleDegree: function(scale) {
      var interval = scale.tonic.interval(this);
      interval = (interval.direction === 'down' ||
                  interval.simpleInterval === 8) ? interval.invert() : interval;

      return scale.scale.indexOf(interval.simple(true)) + 1;
    },

    /**
     * Returns the name of the note, with an optional display of octave number
     */
    toString: function(dontShow) {
      var octave = dontShow ? '' : this.octave;
      return this.name.toLowerCase() + this.accidental.sign + octave;
    }
  };


  function TeoriaInterval(intervalNum, quality, direction) {
    var simple = (intervalNum >= 8 && intervalNum % 7 === 1) ?
          intervalNum % 7 * 8 : ((intervalNum - 1) % 7) + 1;
    var compoundOctaves = Math.ceil((intervalNum - simple) / 8);
    var simpleIntervalType = kIntervals[simple - 1];


    if (!(quality in kValidQualities[simpleIntervalType.quality])) {
      throw new Error('Invalid interval quality');
    }

    this.interval = intervalNum;
    this.quality = quality;
    this.direction = direction === 'down' ? 'down' : 'up';
    this.simpleInterval = simple;
    this.simpleIntervalType = simpleIntervalType;
    this.compoundOctaves = compoundOctaves;
  }

  TeoriaInterval.prototype = {
    semitones: function() {
      return this.simpleIntervalType.size + this.qualityValue() +
              this.compoundOctaves * 12;
    },

    simple: function(ignore) {
      var intval = this.simpleInterval;
      intval = (this.direction === 'down' && !ignore) ? -intval : intval;

      return kQualityTemp[this.quality] + intval.toString();
    },

    compound: function(ignore) {
      var intval = this.simpleInterval + this.compoundOctaves * 7;
      intval = (this.direction === 'down' && !ignore) ? -intval : intval;

      return kQualityTemp[this.quality] + intval.toString();
    },

    isCompound: function() {
      return this.compoundOctaves > 0;
    },

    invert: function() {
      var intervalNumber = this.simpleInterval;

      intervalNumber = 9 - intervalNumber;

      return new TeoriaInterval(intervalNumber,
                                kQualityInversion[this.quality], this.direction);
    },

    qualityValue: function() {
      var defQuality = this.simpleIntervalType.quality, quality = this.quality;

      return kValidQualities[defQuality][quality];
    },

    equal: function(interval) {
      return this.interval === interval.interval &&
             this.quality === interval.quality;
    },

    greater: function(interval) {
      var thisSemitones = this.semitones();
      var thatSemitones = interval.semitones();

      // If equal in absolute size, measure which interval is bigger
      // For example P4 is bigger than A3
      return (thisSemitones === thatSemitones) ?
        (this.interval > interval.interval) : (thisSemitones > thatSemitones);
    },

    smaller: function(interval) {
      return !this.equal(interval) && !this.greater(interval);
    },

    toString: function() {
      return this.compound();
    }
  };


  function TeoriaChord(root, name) {
    if (!(root instanceof TeoriaNote)) {
      return null;
    }

    name = name || '';
    this.name = root.name.toUpperCase() + root.accidental.sign + name;
    this.symbol = name;
    this.root = root;
    this.intervals = [];
    this._voicing = [];

    var i, length, c, strQuality, parsing = 'quality', additionals = [],
        notes = ['P1', 'M3', 'P5', 'm7', 'M9', 'P11', 'M13'],
        chordLength = 2, bass, symbol;

    function setChord(intervals) {
      for (var n = 0, chordl = intervals.length; n < chordl; n++) {
        notes[n + 1] = intervals[n];
      }

      chordLength = intervals.length;
    }

    // Remove whitespace, commas and parentheses
    name = name.replace(/[,\s\(\)]/g, '');
    bass = name.split('/');
    if (bass.length === 2) {
      name = bass[0];
      bass = bass[1];
    } else {
      bass = null;
    }

    for (i = 0, length = name.length; i < length; i++) {
      if (!(c = name[i])) {
        break;
      }

      switch (parsing) {
        // Parses for the "base" chord, either a triad or a seventh chord
        case 'quality':
          strQuality = ((i + 3) <= length) ? name.substr(i, 3) : null;
          symbol = (strQuality in kSymbols) ?
            strQuality : (c in kSymbols) ? c : '';

          setChord(kSymbols[symbol]);

          i += symbol.length - 1;
          parsing = 'extension';
          break;

        // Parses for the top interval or a pure sixth
        case 'extension':
          c = (c === '1' && name[i + 1]) ?
            parseFloat(name.substr(i, 2)) : parseFloat(c);

          if (!isNaN(c) && c !== 6) {
            chordLength = (c - 1) / 2;

            if (chordLength !== Math.round(chordLength)) {
              throw new Error('Invalid interval extension: ' + c.toString(10));
            }

            // Special care for diminished chords
            if (symbol === 'o' || symbol === 'dim') {
              notes[3] = 'd7';
            }

            i += String(c).length - 1;
          } else if (c === 6) {
            notes[3] = 'M6';
            chordLength = (chordLength < 3) ? 3 : chordLength;
          } else {
            i -= 1;
          }

          parsing = 'alterations';
          break;

        // Parses for possible alterations of intervals (#5, b9, etc.)
        case 'alterations':
          var alterations = name.substr(i).split(/(#|b|add|maj|sus|M)/),
              next, flat = false, sharp = false;

          if (alterations.length === 1) {
            throw new Error('Invalid alterations');
          } else if (alterations[0].length !== 0) {
            throw new Error('Invalid token: \'' + alterations[0] + '\'');
          }

          for (var a = 1, aLength = alterations.length; a < aLength; a++) {
            next = alterations[a + 1];

            switch (alterations[a]) {
            case 'M':
            case 'maj':
              chordLength = (chordLength < 3) ? 3 : chordLength;

              if (next === '7') { // Ignore the seventh, that is already implied
                a++;
              }

              notes[3] = 'M7';
              break;

            case 'sus':
              var type = 'P4';
              if (next === '2' || next === '4') {
                a++;

                if (next === '2') {
                  type = 'M2';
                }
              }

              notes[1] = type; // Replace third with M2 or P4
              break;

            case 'add':
              if (next && !isNaN(parseInt(next, 10))) {
                if (next === '9') {
                  additionals.push('M9');
                } else if (next === '11') {
                  additionals.push('P11');
                } else if (next === '13') {
                  additionals.push('M13');
                }

                a += next.length;
              }
              break;

            case 'b':
              flat = true;
              break;

            case '#':
              sharp = true;
              break;

            default:
              if (alterations[a].length === 0) {
                break;
              }

              var token = parseInt(alterations[a], 10), quality,
                  interval = parseInt(alterations[a], 10), intPos;
              if (isNaN(token) ||
                  String(token).length !== alterations[a].length) {
                throw new Error('Invalid token: \'' + alterations[a] + '\'');
              }

              if (token === 6) {
                if (sharp) {
                  notes[3] = 'A6';
                } else if (flat) {
                  notes[3] = 'm6';
                } else {
                  notes[3] = 'M6';
                }

                chordLength = (chordLength < 3) ? 3 : chordLength;
                continue;
              }

              // Calculate the position in the 'note' array
              intPos = (interval - 1) / 2;
              if (chordLength < intPos) {
                chordLength = intPos;
              }

              if (interval < 5 || interval === 7 ||
                  intPos !== Math.round(intPos)) {
                throw new Error('Invalid interval alteration: ' +
                    interval.toString(10));
              }

              quality = notes[intPos][0];

              // Alterate the quality of the interval according the accidentals
              if (sharp) {
                if (quality === 'd') {
                  quality = 'm';
                } else if (quality === 'm') {
                  quality = 'M';
                } else if (quality === 'M' || quality === 'P') {
                  quality = 'A';
                }
              } else if (flat) {
                if (quality === 'A') {
                  quality = 'M';
                } else if (quality === 'M') {
                  quality = 'm';
                } else if (quality === 'm' || quality === 'P') {
                  quality = 'd';
                }
              }

              notes[intPos] = quality + interval;
              break;
            }
          }

          parsing = 'ended';
          break;
      }

      if (parsing === 'ended') {
        break;
      }
    }

    this.intervals = notes
      .slice(0, chordLength + 1)
      .concat(additionals)
      .map(function(i) { return teoria.interval(i); });

    for (i = 0, length = this.intervals.length; i < length; i++) {
      this._voicing[i] = this.intervals[i];
    }

    if (bass) {
      var intervals = this.intervals, bassInterval, inserted = 0, note;
      // Make sure the bass is atop of the root note
      note = teoria.note(bass + (root.octave + 1));

      bassInterval = teoria.interval.between(root, note);
      bass = bassInterval.simpleInterval;

      if (bassInterval.direction === 'up') {
        bassInterval = bassInterval.invert();
        bassInterval.direction = 'down';
      }

      this._voicing = [bassInterval];
      for (i = 0; i < length; i++) {
        if (intervals[i].interval === bass) {
          continue;
        }

        inserted++;
        this._voicing[inserted] = intervals[i];
      }
    }
  }

  TeoriaChord.prototype = {
    notes: function() {
      var voicing = this.voicing(), notes = [];

      for (var i = 0, length = voicing.length; i < length; i++) {
        notes.push(teoria.interval.from(this.root, voicing[i]));
      }

      return notes;
    },

    voicing: function(voicing) {
      // Get the voicing
      if (!voicing) {
        return this._voicing;
      }

      // Set the voicing
      this._voicing = [];
      for (var i = 0, length = voicing.length; i < length; i++) {
        this._voicing[i] = teoria.interval(voicing[i]);
      }

      return this;
    },

    resetVoicing: function() {
      this._voicing = this.intervals;
    },

    dominant: function(additional) {
      additional = additional || '';
      return new TeoriaChord(this.root.interval('P5'), additional);
    },

    subdominant: function(additional) {
      additional = additional || '';
      return new TeoriaChord(this.root.interval('P4'), additional);
    },

    parallel: function(additional) {
      additional = additional || '';
      var quality = this.quality();

      if (this.chordType() !== 'triad' || quality === 'diminished' ||
          quality === 'augmented') {
        throw new Error('Only major/minor triads have parallel chords');
      }

      if (quality === 'major') {
        return new TeoriaChord(this.root.interval('m3', 'down'), 'm');
      } else {
        return new TeoriaChord(this.root.interval('m3', 'up'));
      }
    },

    quality: function() {
      var third, fifth, seventh, intervals = this.intervals;

      for (var i = 0, length = intervals.length; i < length; i++) {
        if (intervals[i].interval === 3) {
          third = intervals[i];
        } else if (intervals[i].interval === 5) {
          fifth = intervals[i];
        } else if (intervals[i].interval === 7) {
          seventh = intervals[i];
        }
      }

      if (!third) {
        return;
      }

      third = (third.direction === 'down') ? third.invert() : third;
      third = third.simple();

      if (fifth) {
        fifth = (fifth.direction === 'down') ? fifth.invert() : fifth;
        fifth = fifth.simple();
      }

      if (seventh) {
        seventh = (seventh.direction === 'down') ? seventh.invert() : seventh;
        seventh = seventh.simple();
      }

      if (third === 'M3') {
        if (fifth === 'A5') {
          return 'augmented';
        } else if (fifth === 'P5') {
          return (seventh === 'm7') ? 'dominant' : 'major';
        }

        return 'major';
      } else if (third === 'm3') {
        if (fifth === 'P5') {
          return 'minor';
        } else if (fifth === 'd5') {
          return (seventh === 'm7') ? 'half-diminished' : 'diminished';
        }

        return 'minor';
      }
    },

    chordType: function() { // In need of better name
      var length = this.intervals.length, interval, has, invert, i, name;

      if (length === 2) {
        return 'dyad';
      } else if (length === 3) {
        has = {first: false, third: false, fifth: false};
        for (i = 0; i < length; i++) {
          interval = this.intervals[i];
          invert = interval.invert();
          if (interval.simpleIntervalType.name in has) {
            has[interval.simpleIntervalType.name] = true;
          } else if (invert.simpleIntervalType.name in has) {
            has[invert.simpleIntervalType.name] = true;
          }
        }

        name = (has.first && has.third && has.fifth) ? 'triad' : 'trichord';
      } else if (length === 4) {
        has = {first: false, third: false, fifth: false, seventh: false};
        for (i = 0; i < length; i++) {
          interval = this.intervals[i];
          invert = interval.invert();
          if (interval.simpleIntervalType.name in has) {
            has[interval.simpleIntervalType.name] = true;
          } else if (invert.simpleIntervalType.name in has) {
            has[invert.simpleIntervalType.name] = true;
          }
        }

        if (has.first && has.third && has.fifth && has.seventh) {
          name = 'tetrad';
        }
      }

      return name || 'unknown';
    },

    get: function(interval) {
      if (typeof interval === 'string' && interval in kStepNumber) {
        var intervals = this.intervals, i, length;

        interval = kStepNumber[interval];
        for (i = 0, length = intervals.length; i < length; i++) {
          if (intervals[i].interval === +interval) {
            return teoria.interval.from(this.root, intervals[i]);
          }
        }

        return null;
      } else {
        throw new Error('Invalid interval name');
      }
    },

    interval: function(interval, direction) {
      return new TeoriaChord(this.root.interval(interval, direction),
                             this.symbol);
    },

    transpose: function(interval, direction) {
      this.root.transpose(interval, direction);
      this.name = this.root.name.toUpperCase() +
                  this.root.accidental.sign + this.symbol;

      return this;
    },

    toString: function() {
      return this.name;
    }
  };


  function TeoriaScale(tonic, scale) {
    var scaleName, i, length;

    if (!(tonic instanceof TeoriaNote)) {
      throw new Error('Invalid Tonic');
    }

    if (typeof scale === 'string') {
      scaleName = scale;
      scale = teoria.scale.scales[scale];
      if (!scale) {
        throw new Error('Invalid Scale');
      }
    } else {
      for (i in teoria.scale.scales) {
        if (teoria.scale.scales.hasOwnProperty(i)) {
          if (teoria.scale.scales[i].toString() === scale.toString()) {
            scaleName = i;
            break;
          }
        }
      }
    }

    this.name = scaleName;
    this.notes = [];
    this.tonic = tonic;
    this.scale = scale;

    for (i = 0, length = scale.length; i < length; i++) {
      this.notes.push(teoria.interval(tonic, scale[i]));
    }
  }

  TeoriaScale.prototype = {
    simple: function() {
      var sNotes = [];

      for (var i = 0, length = this.notes.length; i < length; i++) {
        sNotes.push(this.notes[i].toString(true));
      }

      return sNotes;
    },

    type: function() {
      var length = this.notes.length - 2;
      if (length < 8) {
        return ['di', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa'][length] +
          'tonic';
      }
    },

    get: function(i) {
      if (typeof i === 'string' && i in kStepNumber) {
        i = parseInt(kStepNumber[i], 10);
      }

      return this.notes[i - 1];
    },

    solfege: function(index, showOctaves) {
      var i, length, solfegeArray = [];

      // Return specific index in scale
      if (index) {
        return this.get(index).solfege(this, showOctaves);
      }

      // Return an array of solfege syllables
      for (i = 0, length = this.notes.length; i < length; i++) {
        solfegeArray.push(this.notes[i].solfege(this, showOctaves));
      }

      return solfegeArray;
    },

    interval: function(interval, direction) {
      return new TeoriaScale(this.tonic.interval(interval, direction),
                             this.scale);
    },

    transpose: function(interval, direction) {
      var scale = new TeoriaScale(this.tonic.interval(interval, direction),
                                  this.scale);
      this.notes = scale.notes;
      this.scale = scale.scale;
      this.tonic = scale.tonic;

      return this;
    }
  };


  teoria.scale.scales.ionian = teoria.scale.scales.major =
    ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'];
  teoria.scale.scales.dorian = ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7'];
  teoria.scale.scales.phrygian = ['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7'];
  teoria.scale.scales.lydian = ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'M7'];
  teoria.scale.scales.mixolydian = ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7'];
  teoria.scale.scales.aeolian = teoria.scale.scales.minor =
    ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'];
  teoria.scale.scales.locrian = ['P1', 'm2', 'm3', 'P4', 'd5', 'm6', 'm7'];
  teoria.scale.scales.majorpentatonic = ['P1', 'M2', 'M3', 'P5', 'M6'];
  teoria.scale.scales.minorpentatonic = ['P1', 'm3', 'P4', 'P5', 'm7'];
  teoria.scale.scales.chromatic = teoria.scale.scales.harmonicchromatic =
    ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7'];


  teoria.TeoriaNote = TeoriaNote;
  teoria.TeoriaChord = TeoriaChord;
  teoria.TeoriaScale = TeoriaScale;
  teoria.TeoriaInterval = TeoriaInterval;

  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = teoria;
    }
    exports.teoria = teoria;
  } else if (typeof this !== 'undefined') {
    this.teoria = teoria;
  } else if (typeof window !== 'undefined') {
    window.teoria = teoria;
  }
})();


(function(exports) {
/**
 * almond 0.2.5 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("almond", function(){});

define('lib/stream',[],function() {
  var MIDIStream;

  return MIDIStream = (function() {
    function MIDIStream(str) {
      this.str = str;
      this.position = 0;
    }

    MIDIStream.prototype.read = function(length) {
      var result;

      result = this.str.substr(this.position, length);
      this.position += length;
      return result;
    };

    MIDIStream.prototype.readInt32 = function() {
      var position, result, str;

      str = this.str;
      position = this.position;
      result = (str.charCodeAt(position) << 24) + (str.charCodeAt(position + 1) << 16) + (str.charCodeAt(position + 2) << 8) + str.charCodeAt(position + 3);
      this.position += 4;
      return result;
    };

    MIDIStream.prototype.readInt16 = function() {
      var position, result, str;

      str = this.str;
      position = this.position;
      result = (str.charCodeAt(position) << 8) + str.charCodeAt(position + 1);
      this.position += 2;
      return result;
    };

    MIDIStream.prototype.readInt8 = function(signed) {
      var result;

      result = this.str.charCodeAt(this.position);
      if (signed && result > 127) {
        result -= 256;
      }
      this.position += 1;
      return result;
    };

    MIDIStream.prototype.eof = function() {
      return this.position >= this.str.length;
    };

    MIDIStream.prototype.readVarInt = function() {
      var b, result;

      result = 0;
      while (true) {
        b = this.readInt8();
        if (b & 0x80) {
          result += b & 0x7f;
          result <<= 7;
        } else {
          return result + b;
        }
      }
    };

    MIDIStream.prototype.readChunk = function() {
      var data, id, length;

      id = this.read(4);
      length = this.readInt32();
      data = this.read(length);
      return {
        id: id,
        length: length,
        data: data
      };
    };

    return MIDIStream;

  })();
});

define('lib/events',[],function() {
  return {
    SequenceNumber: function(number, time) {
      this.type = 'meta';
      this.name = 'sequenceNumber';
      this.number = number;
      return this.time = time || 0;
    },
    Text: function(text, time) {
      this.type = 'meta';
      this.name = 'text';
      this.text = text;
      return this.time = time || 0;
    },
    CopyrightNotice: function(text, time) {
      this.type = 'meta';
      this.name = 'copyrightNotice';
      this.text = text;
      return this.time = time || 0;
    },
    TrackName: function(text, time) {
      this.type = 'meta';
      this.name = 'trackName';
      this.text = text;
      return this.time = time || 0;
    },
    InstrumentName: function(text, time) {
      this.type = 'meta';
      this.name = 'instrumentName';
      this.text = text;
      return this.time = time || 0;
    },
    Lyrics: function(text, time) {
      this.name = 'lyrics';
      this.text = text;
      return this.time = time || 0;
    },
    Marker: function(text, time) {
      this.type = 'meta';
      this.name = 'marker';
      this.text = text;
      return this.time = time || 0;
    },
    CuePoint: function(text, time) {
      this.type = 'meta';
      this.name = 'cuePoint';
      this.text = text;
      return this.time = time || 0;
    },
    ChannelPrefix: function(channel, time) {
      this.type = 'meta';
      this.name = 'channelPrefix';
      this.channel = channel;
      return this.time = time || 0;
    },
    EndOfTrack: function(time) {
      this.type = 'meta';
      this.name = 'endOfTrack';
      return this.time = time || 0;
    },
    SetTempo: function(microseconds, time) {
      this.type = 'meta';
      this.name = 'setTempo';
      this.microseconds = microseconds;
      return this.time = time || 0;
    },
    SMPTEOffset: function(frameRate, hour, min, sec, frame, subframe, time) {
      this.type = 'meta';
      this.name = 'smpteOffset';
      this.frameRate = frameRate;
      this.hour = hour;
      this.min = min;
      this.sec = sec;
      this.frame = frame;
      this.subframe = subframe;
      return this.time = time || 0;
    },
    TimeSignature: function(numerator, denominator, metronome, thirtyseconds, time) {
      this.type = 'meta';
      this.name = 'timeSignature';
      this.numerator = numerator;
      this.denominator = denominator;
      this.metronome = metronome;
      this.thirtyseconds = thirtyseconds;
      return this.time = time || 0;
    },
    KeySignature: function(key, scale, time) {
      this.type = 'meta';
      this.name = 'keySignature';
      this.key = key;
      this.scale = scale;
      return this.time = time || 0;
    },
    SequencerSpecific: function(data, time) {
      this.type = 'meta';
      this.name = 'sequencerSpecific';
      this.data = data;
      return this.time = time || 0;
    },
    NoteOn: function(number, velocity, time) {
      this.type = 'channel';
      this.name = 'noteOn';
      this.number = number;
      this.velocity = velocity;
      return this.time = time || 0;
    },
    NoteOff: function(number, velocity, time) {
      this.type = 'channel';
      this.name = 'noteOff';
      this.number = number;
      this.velocity = velocity;
      return this.time = time || 0;
    },
    NoteAftertouch: function(number, amount, time) {
      this.type = 'channel';
      this.name = 'noteAftertouch';
      this.number = number;
      this.amount = amount;
      return this.time = time || 0;
    },
    Controller: function(controller, value, time) {
      this.type = 'channel';
      this.name = 'controller';
      this.controller = controller;
      this.value = value;
      return this.time = time || 0;
    },
    ProgramChange: function(number, time) {
      this.type = 'channel';
      this.name = 'programChange';
      this.number = number;
      return this.time = time || 0;
    },
    ChannelAftertouch: function(amount, time) {
      this.type = 'channel';
      this.name = 'channelAftertouch';
      this.amount = amount;
      return this.time = time || 0;
    },
    PitchBend: function(value, time) {
      this.type = 'channel';
      this.controller = controller;
      this.value = value;
      return this.time = time || 0;
    }
  };
});

var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

define('lib/parser',['./stream', './events'], function(Stream, Events) {
  var ChannelEventParser, EventParser, MIDIHeader, MIDIParser, MIDITracks, MetaEventParser, SysEventParser, _ref, _ref1, _ref2;

  EventParser = (function() {
    function EventParser() {}

    EventParser.checkLength = function(name, length, check) {
      if (length !== check) {
        throw "Expected length for " + name + " event is " + check + ", got " + length;
      }
      if (length === check) {
        return true;
      }
    };

    return EventParser;

  })();
  MetaEventParser = (function(_super) {
    __extends(MetaEventParser, _super);

    function MetaEventParser() {
      _ref = MetaEventParser.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    MetaEventParser.events = {
      0x00: function(length, stream, time) {
        if (!MetaEventParser.checkLength('SequenceNumber', length, 2)) {
          return;
        }
        return new MIDI.Events.SequenceNumber(stream.readInt16(), time);
      },
      0x01: function(length, stream, time) {
        return new MIDI.Events.Text(stream.read(length), time);
      },
      0x02: function(length, stream, time) {
        return new MIDI.Events.CopyrightNotice(stream.read(length), time);
      },
      0x03: function(length, stream, time) {
        return new MIDI.Events.TrackName(stream.read(length), time);
      },
      0x04: function(length, stream, time) {
        return new MIDI.Events.InstrumentName(stream.read(length), time);
      },
      0x05: function(length, stream, time) {
        return new MIDI.Events.Lyrics(stream.read(length), time);
      },
      0x06: function(length, stream, time) {
        return new MIDI.Events.Marker(stream.read(length), time);
      },
      0x07: function(length, stream, time) {
        return new MIDI.Events.CuePoint(stream.read(length), time);
      },
      0x20: function(length, stream, time) {
        if (!MetaEventParser.checkLength('ChannelPrefix', length, 1)) {
          return;
        }
        return new MIDI.Events.ChannelPrefix(stream.readInt8(), time);
      },
      0x2f: function(length, stream, time) {
        if (!MetaEventParser.checkLength('EndOfTrack', length, 0)) {
          return;
        }
        return new MIDI.Events.EndOfTrack(time);
      },
      0x51: function(length, stream, time) {
        if (!MetaEventParser.checkLength('SetTempo', length, 3)) {
          return;
        }
        return new MIDI.Events.SetTempo((stream.readInt8() << 16) + (stream.readInt8() << 8) + stream.readInt8(), time);
      },
      0x54: function(length, stream, time) {
        var frame_rate, hour_byte;

        if (!MetaEventParser.checkLength('SMPTEOffset', length, 5)) {
          return;
        }
        hour_byte = stream.readInt8();
        frame_rate = {
          0x00: 24,
          0x20: 25,
          0x40: 29,
          0x60: 30
        };
        frame_rate = frame_rate[hour_byte & 0x60];
        return new SMPTEOffset(frame_rate, hour_byte & 0x1f, stream.readInt8(), stream.readInt8(), stream.readInt8(), stream.readInt8(), time);
      },
      0x58: function(length, stream, time) {
        if (!MetaEventParser.checkLength('TimeSignature', length, 4)) {
          return;
        }
        return new MIDI.Events.TimeSignature(stream.readInt8(), Math.pow(2, stream.readInt8()), stream.readInt8(), stream.readInt8(), time);
      },
      0x59: function(length, stream, time) {
        if (!MetaEventParser.checkLength('KeySignature', length, 2)) {
          return;
        }
        return new MIDI.Events.KeySignature(stream.readInt8(true), stream.readInt8(), time);
      },
      0x7f: function(length, stream, time) {
        return new MIDI.Events.SequencerSpecific(stream.read(length), time);
      }
    };

    MetaEventParser.prototype.read = function(stream, time, eventTypeByte) {
      var create_event, length, nameByte;

      nameByte = stream.readInt8();
      length = stream.readVarInt();
      create_event = MetaEventParser.events[nameByte];
      if (create_event) {
        return create_event(length, stream, time);
      } else {
        return {
          type: "unknown",
          time: time,
          data: stream.read(length)
        };
      }
    };

    return MetaEventParser;

  })(EventParser);
  ChannelEventParser = (function(_super) {
    __extends(ChannelEventParser, _super);

    function ChannelEventParser() {
      _ref1 = ChannelEventParser.__super__.constructor.apply(this, arguments);
      return _ref1;
    }

    ChannelEventParser.events = {
      0x08: function(param, stream, time) {
        return new MIDI.Events.NoteOff(param, stream.readInt8(), time);
      },
      0x09: function(param, stream, time) {
        var event_name, velocity;

        velocity = stream.readInt8();
        event_name = (velocity ? "NoteOn" : "NoteOff");
        return new MIDI.Events[event_name](param, velocity, time);
      },
      0x0a: function(param, stream, time) {
        return new MIDI.Events.NoteAftertouch(param, stream.readInt8(), time);
      },
      0x0b: function(param, stream, time) {
        return new MIDI.Events.Controller(param, stream.readInt8(), time);
      },
      0x0c: function(param, stream, time) {
        return new MIDI.Events.ProgramChange(param, time);
      },
      0x0d: function(param, stream, time) {
        return new MIDI.Events.ChannelAftertouch(param, time);
      },
      0x0e: function(param, stream, time) {
        return new MIDI.Events.PitchBend(param + (stream.readInt8() << 7), time);
      }
    };

    ChannelEventParser.prototype.read = function(stream, time, eventTypeByte) {
      var channel, create_event, eventType, param;

      if ((eventTypeByte & 0x80) === 0) {
        param = eventTypeByte;
        eventTypeByte = this._lastEventTypeByte;
      } else {
        param = stream.readInt8();
        this._lastEventTypeByte = eventTypeByte;
      }
      eventType = eventTypeByte >> 4;
      channel = eventTypeByte & 0x0f;
      create_event = ChannelEventParser.events[eventType];
      if (create_event) {
        return create_event(param, stream, time);
      } else {
        return {
          type: "unknown",
          time: time,
          channel: channel
        };
      }
    };

    return ChannelEventParser;

  })(EventParser);
  SysEventParser = (function(_super) {
    __extends(SysEventParser, _super);

    function SysEventParser() {
      _ref2 = SysEventParser.__super__.constructor.apply(this, arguments);
      return _ref2;
    }

    SysEventParser.events = {
      0xf0: function(stream, time) {
        var length;

        length = stream.readVarInt();
        return new MIDI.Events.SysEx(stream.read(length), time);
      },
      0xf7: function(stream, time) {
        var length;

        length = stream.readVarInt();
        return new MIDI.Events.DividedSysEx(stream.read(length), time);
      }
    };

    SysEventParser.prototype.read = function(stream, time, eventTypeByte) {
      var create_event;

      create_event = SysEventParser.events[eventTypeByte];
      if (create_event) {
        return create_event(stream, time);
      } else {
        return {
          type: "unknown",
          time: time
        };
      }
    };

    return SysEventParser;

  })(EventParser);
  MIDIHeader = (function() {
    function MIDIHeader(midi_stream) {
      this.midi_stream = midi_stream;
    }

    MIDIHeader.prototype.read = function() {
      var header, header_chunk, header_stream;

      header_chunk = this.midi_stream.readChunk();
      if (header_chunk.id !== "MThd" || header_chunk.length !== 6) {
        throw "Bad .mid file - header not found";
      }
      header_stream = new Stream(header_chunk.data);
      header = {
        formatType: header_stream.readInt16(),
        trackCount: header_stream.readInt16(),
        ticksPerBeat: header_stream.readInt16()
      };
      if (header.ticksPerBeat & 0x8000) {
        throw "Expressing time division in SMTPE frames is not supported yet";
      }
      return header;
    };

    return MIDIHeader;

  })();
  MIDITracks = (function() {
    function MIDITracks(midi_stream, header) {
      this.midi_stream = midi_stream;
      this.header = header;
    }

    MIDITracks.prototype.read = function() {
      var i, track, track_chunk, track_id, track_stream, tracks, unexpected, _i, _ref3;

      tracks = [];
      for (i = _i = 0, _ref3 = this.header.trackCount - 1; 0 <= _ref3 ? _i <= _ref3 : _i >= _ref3; i = 0 <= _ref3 ? ++_i : --_i) {
        track = tracks[i] = [];
        track_chunk = this.midi_stream.readChunk();
        track_id = track_chunk.id;
        unexpected = track_id !== "MTrk";
        if (unexpected) {
          throw "Unexpected chunk. Expected MTrk, got " + track_id + ".";
        }
        track_stream = new Stream(track_chunk.data);
        while (!track_stream.eof()) {
          track.push(this.readNext(track_stream));
        }
      }
      return tracks;
    };

    MIDITracks.prototype.readNext = function(track_stream) {
      var e, eventTypeByte, parser, time;

      e = new Event(track_stream);
      time = track_stream.readVarInt();
      eventTypeByte = track_stream.readInt8();
      EventParser = this.getEventParserByType(eventTypeByte);
      parser = new EventParser();
      return parser.read(track_stream, time, eventTypeByte);
    };

    MIDITracks.prototype.getEventParserByType = function(eventTypeByte) {
      if ((eventTypeByte & 0xf0) !== 0xf0) {
        return ChannelEventParser;
      } else if (eventTypeByte === 0xff) {
        return MetaEventParser;
      } else {
        return SysEventParser;
      }
    };

    return MIDITracks;

  })();
  return MIDIParser = (function() {
    function MIDIParser(binaryString) {
      var header, header_parser, midi_stream, track_parser, tracks;

      midi_stream = new Stream(binaryString);
      header_parser = new MIDIHeader(midi_stream);
      header = header_parser.read();
      track_parser = new MIDITracks(midi_stream, header);
      tracks = track_parser.read();
      this.header = header;
      this.tracks = tracks;
    }

    return MIDIParser;

  })();
});

define('lib/writer',[],function() {
  var MIDIWriter;

  return MIDIWriter = (function() {
    function MIDIWriter(midi) {
      this.midi = midi;
    }

    MIDIWriter.prototype.write = function() {
      return JSON.stringify(this.midi);
    };

    return MIDIWriter;

  })();
});

define('main',['./lib/parser', './lib/writer', './lib/events'], function(Parser, Writer, Events) {
  var exports;

  exports = exports || window;
  return exports.MIDI = (function() {
    _Class.Writer = Writer;

    _Class.Parser = Parser;

    _Class.Events = Events;

    function _Class(header, tracks) {
      var decoded;

      if (typeof header === 'string') {
        decoded = new Parser(header);
        header = decoded.header;
        tracks = decoded.tracks;
      }
      this.header = header;
      this.tracks = tracks;
    }

    _Class.prototype.write = function() {
      var writer;

      writer = new Writer(this);
      return writer.write();
    };

    return _Class;

  })();
});
require(['main'], null, null, true); }(this));
