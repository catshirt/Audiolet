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
        this.setValue(value || 0);
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
        this.trigger('change', value);
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
    },

    on: function(e, fn) {
        this._events = this._events || {};
        this._events[e] = this._events[e] || [];
        this._events[e].push(fn);
    },

    off: function(e, fn) {
        this._events = this._events || {};
        if (e in this._events === false) {
            return;
        }
        this._events[e].splice(this._events[e].indexOf(fn), 1);
    },

    trigger: function(e) {
        this._events = this._events || {};
        if (e in this._events === false) {
            return;
        }
        for (var i = 0; i < this._events[e].length; i++) {
            this._events[e][i].apply(this, Array.prototype.slice.call(arguments, 1));
        }
    }

});