var AudioletOutput = function(node, index) {
    this.node = node;
    this.index = index;
    this.connectedTo = [];
    // External buffer where data pulled from the graph is stored
    this.buffer = new AudioletBuffer(1, 0);
    // Internal buffer for if we are in a feedback loop
    this.feedbackBuffer = new AudioletBuffer(1, 0);
    // Buffer to shift data into if we are in a feedback loop
    this.outputBuffer = new AudioletBuffer(1, 0);

    this.linkedInput = null;
    this.numberOfChannels = 1;

    this.suppliesFeedbackLoop = false;
    this.timestamp = null;
};

AudioletOutput.prototype.connect = function(input) {
    this.connectedTo.push(input);
};

AudioletOutput.prototype.disconnect = function(input) {
    var numberOfStreams = this.connectedTo.length;
    for (var i = 0; i < numberOfStreams; i++) {
        if (input == this.connectedTo[i]) {
            this.connectedTo.splice(i, 1);
            break;
        }
    }
};

AudioletOutput.prototype.isConnected = function() {
    return (this.connectedTo.length > 0);
};

AudioletOutput.prototype.linkNumberOfChannels = function(input) {
    this.linkedInput = input;
};

AudioletOutput.prototype.unlinkNumberOfChannels = function() {
    this.linkedInput = null;
};

AudioletOutput.prototype.getNumberOfChannels = function() {
    if (this.linkedInput && this.linkedInput.isConnected()) {
        return (this.linkedInput.buffer.numberOfChannels);
    }
    return (this.numberOfChannels);
};

AudioletOutput.prototype.getBuffer = function(length) {
    var buffer = this.buffer;
    if (buffer.length == length && !this.suppliesFeedbackLoop) {
        // Buffer not part of a feedback loop, so just return it
        return buffer;
    }
    else {
        // Buffer is part of a feedback loop, so we need to take care
        // of overflows.
        // Because feedback loops have to be connected to more than one
        // node, getBuffer will be called more than once.  To make sure
        // we only generate the output buffer once, store a timestamp.
        if (this.node.timestamp == this.timestamp) {
            // Buffer already generated by a previous getBuffer call
            return this.outputBuffer;
        }
        else {
            this.timestamp = this.node.timestamp;

            var feedbackBuffer = this.feedbackBuffer;
            var outputBuffer = this.outputBuffer;

            if (!this.suppliesFeedbackLoop) {
                this.suppliesFeedbackLoop = true;
                var limiter = this.node.audiolet.blockSizeLimiter;
                feedbackBuffer.resize(this.getNumberOfChannels(),
                                      limiter.maximumBlockSize, true);
            }

            // Resize feedback buffer to the correct number of channels
            feedbackBuffer.resize(this.getNumberOfChannels(),
                                  feedbackBuffer.length);

            // Resize output buffer to the correct size
            outputBuffer.resize(this.getNumberOfChannels(), length, true);

            // Buffer the output, so nodes on a later timestamp (i.e. nodes
            // in a feedback loop connected to this output) can pull
            // any amount up to maximumBlockSize without fear of overflow
            feedbackBuffer.push(buffer);
            feedbackBuffer.shift(outputBuffer);

            return outputBuffer;
        }
    }
};

AudioletOutput.prototype.toString = function() {
    return this.node.toString() + 'Output #' + this.index + ' - ';
};

