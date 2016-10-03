;(function () {
	'use strict';

	/**
	 * @class
	 * timer that exposes completion percentage, executes callback on completion.
	 * @param {Object} options - timer options
	 * @param {Number} [options.duration] - how long the timer should last, if not
	 * 	set here, must be specified when timer is started.
	 * @param {Number} [options.delay] - ms between update calls, default 1000ms
	 * @param {boolean} [options.restart] - whether the timer restarts after being
	 * 	completed. if omitted, will use the return value of complete callback.
	 * @param {boolean} [options.autoStart] - if true, start the timer immediately.
	 * 	otherwise, wait for a manual call to start. default true when initial
	 * 	duration supplied, otherwise false.
	 * @param {completeCallback} [options.pause] - method to be called when
	 * 	timer completes. return true to restart the timer.
	 * @param {pauseCallback} [options.complete] - method to be called before each
	 * 	timer udpate. if true, the timer will not progress.
	 * @param {updateCallback} [options.update] - method to be called after each
	 * 	update with the new timer progress, whether it's running or not.
	 *
	 * @callback completeCallback
	 * @returns {boolean}
	 *
	 * @callback pauseCallback
	 * @returns {boolean}
	 *
	 * @callback updateCallback
	 * @param {number} progress - timer progress as percentage (0-100)
	 * @param {boolean} running - timer is currently running; false if paused or stopped.
	 * @param {number} remaining - ms remaining before timer completes.
	 *
	 */
	var TimerProgress = function (options) {
		this.callbacks = {
			complete: [],
			pause: [],
			update: []
		};
		this.options = this._optionOrDefault(options || {});

		this.time = {
			start: null,
			current: null,
			stop: null,
			duration: this.options.duration
		};

		this.intervalID = setInterval(this._intervalCallback(), this.options.delay);

		if (this.options.autoStart) {
			this.start(this.time.duration);
		}

	};

	TimerProgress.prototype._optionOrDefault = function (options) {
		var ro = {};
		ro.duration = options.duration || null;
		ro.delay = options.delay || 1000;
		ro.restart = options.hasOwnProperty('restart') ?
			( options.restart ? true : false ) : null;
		if (options.hasOwnProperty('autoStart')) {
			ro.autoStart = options.autoStart;
		} else {
			ro.autoStart = options.duration !== null;
		}

		// look for initial callbacks
		for (var key in this.callbacks) {
			if (options.hasOwnProperty(key)) {
				this.callbacks[key].push(options[key]);
			}
		}

		return ro;

	};

	TimerProgress.prototype._intervalCallback = function () {
		var that = this;
		return function() {
			 that._update()
		};
	};

	TimerProgress.prototype._doUpdateCallbacks = function(running, progress, remaining) {
		for (var i = 0; i < this.callbacks.update.length; i++) {
			this.callbacks.update[i](running, progress, remaining);
		}
	}

	TimerProgress.prototype._doPauseCallbacks = function () {
		// returns true if any callback returns true.
		for (var i = 0; i < this.callbacks.pause.length; i++) {
			if (this.callbacks.pause[i]()) {
				return true;
			}
		}
		return false;
	}

	TimerProgress.prototype._doCompleteCallbacks = function() {
		// returns true if any callback returns true.
		for (var i = 0; i < this.callbacks.complete.length; i++) {
			if (this.callbacks.complete[i]()) {
				return true;
			}
		}
		return false;
	}

	TimerProgress.prototype._paused = function() {
		if ( this.time.start === null ) {
			// a stopped timer is not paused.
			return false;
		}
		return this._doPauseCallbacks();
	};

	TimerProgress.prototype._complete = function() {
		return this.time.start !== null && this.remaining() <= 0;
	};

	TimerProgress.prototype._update = function() {
		if ( this.time.start === null ) {
			this._doUpdateCallbacks(false, 0, -1);
			return;
		}
		// timer is running
		var now = Date.now();

		if ( this._paused() ) {
			var delta = now - this.time.current; // ms since last update
			// advance the timer, but also the start/stop time, so our percentage doesn't move.
			this.time.start += delta;
			this.time.stop += delta;
			console.log(this.time.start, this.time.stop, this.time.stop - this.time.start, delta);
		}
		this.time.current = now;
		this._doUpdateCallbacks(
			true,
			this.progress(),
			this.remaining()
		);

		if (this._complete()) {
			var callbackResult = this._doCompleteCallbacks();
			if (this.options.restart === false) {
				this.stop()
			} else if (this.options.restart === true) {
				this.start(this.time.duration)
			} else { // auto restart option not set...
				if (callbackResult) {
					this.start(this.time.duration());
				} else {
					this.stop();
				}
			}
		}

	};

	/**
	* @function start
	* @param {number} [duration] how long the timer should run in ms. can be omitted
	* 	if provided at initialization
	*/
	TimerProgress.prototype.start = function(duration) {
		duration = duration || this.options.duration
		var now = Date.now();
		this.time = {
			start: now,
			current: now,
			stop: now + duration,
			duration: duration
		};
	};

	TimerProgress.prototype.progress = function() {
		var total = this.time.stop - this.time.start;
		var progress = this.time.current - this.time.start;
		var percentage = (progress/total) * 100;
		// clamp 0 - 100
		return Math.min(100, Math.max(0, percentage));

	};
	TimerProgress.prototype.remaining = function() {
		// can't be less than 0.
		return Math.max(0, this.time.stop - this.time.current)
	};

	TimerProgress.prototype.stop = function() {
		this.time = {
			start: null,
			current: null,
			stop: null,
			duration: null
		}
	};

	TimerProgress.prototype.kill = function() {
		clearInterval(this.intervalID);
	}

	window.TimerProgress = TimerProgress; // << lazy


}());

