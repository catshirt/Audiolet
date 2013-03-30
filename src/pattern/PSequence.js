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