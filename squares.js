;var Squares = (function(window, document) {
	"use strict";
	
	//Utility classes
	var ArrayUtils = (function() {
		//Remove elements in array [from, to]
		function remove(array, from, to) {
			var rest = array.slice((to || from) + 1 || array.length);
			array.length = from < 0 ? array.length + from : from;
			return array.push.apply(array, rest);
		}
		
		//Pop a random element in a 1D array
		//Destructive
		function randomEle(array) {
			var pos = Math.floor(Math.random() * array.length);
			var val = array[pos];
			remove(array, pos);
			return val;
		}
		
		//Pop a random element in a Matrix (2D array)
		//Destructive
		function randomEle2D(array) {
			var rPos = Math.floor(Math.random() * array.length);
			var row = array[rPos];
			var pos = Math.floor(Math.random() * row.length);
			var val = row[pos];
			remove(row, pos);
			if(row.length == 0) {
				remove(array, rPos);
			}
			return val;
		}
		
		return {
			remove : remove,
			randomEle : randomEle,
			randomEle2D : randomEle2D
		}	
	})();

	var SquareUtils = (function() {
		//Return the size of the window
		function getWindowSize() {
			var winW = 600;
			var winH = 400;
			if (document.body && document.body.offsetWidth) {
			 winW = document.body.offsetWidth;
			 winH = document.body.offsetHeight;
			}
			if (document.compatMode=='CSS1Compat' &&
				document.documentElement &&
				document.documentElement.offsetWidth ) {
			 winW = document.documentElement.offsetWidth;
			 winH = document.documentElement.offsetHeight;
			}
			if (window.innerWidth && window.innerHeight) {
			 winW = window.innerWidth;
			 winH = window.innerHeight;
			}
			var minTest = Math.floor(winW * .66);
			if(minTest < 400) { //minimum values
				winW = 600;
				winH = 400;
			}
			return [winW, winH];
		}
	
		//Pass in the nubmer of rows desired and the size of the canvas
		//Returns the number of cols and rows to pass in to get squares (first number is cols, second is rows)
		function getSquareRatio(num, width, height) {
			return [Math.round(num * width/height), num];
		}
	
		return {
			getWindowSize : getWindowSize,
			getSquareRatio : getSquareRatio
		}
	})();

	function merge(obj1,obj2){
		var obj3 = {};
		for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
		for (var attrname in obj2) { if(obj2[attrname] != undefined) obj3[attrname] = obj2[attrname]; }
		return obj3;
	}
	
	function deepCopyArray(matrix) {
		var arr = [];
		for(var i = 0; i < matrix.length; i++) {
			if(Object.prototype.toString.call(matrix[i]) === '[object Array]') {
				arr.push(deepCopyArray(matrix[i]));
			} else arr.push(matrix[i]);
		}
		return arr;
	}

	//CONSTANTS
	var TO_RADIANS = Math.PI/180;
	//requestAnimationFrame
	var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
								window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
	//Direction from which pieces zoom in from.
	//random means a random direction, random2 means random anywhere off the screen
	var ZoomDirection = { left: 1, top: 2, right: 3, bottom: 4, random: 5, random2: 6 }
	//Growth animation functions (horizontal, vertical, diagonal, mixed with linear, row, grow-out and also linear, centerout, centerin, and random)
	//Special combinations: random linear always does the same thing, random and anything else always draw random row in shift
	var GrowDirection = { horizontal: 1, vertical: 2, diagonal: 3, checker: 4 };
	var GrowFactor = { linear: 1, row: 2, centerout: 3, centerin: 4};
	var GrowType = { linear: 1, centerout: 2, centerin: 3, all: 4, random: 5};
	//Animation default parameters
	var AnimDefaults = {
		canvas : undefined,
		link : undefined, 
		rows : 10,
		cols : 10, 
		squareSteps: 50,
		growDelay : 2,
		growDirection : GrowDirection.horizontal,
		growFactor : GrowFactor.linear,
		growType : GrowType.linear,
		effects : [],
		finished : function() {}
	}


	//Square animation functions
	function SquareAnimation(parent, r, c) {
		this.parent = parent;
		this.r = r;
		this.c = c;
		this.steps = parent.squareAnimationSteps;
		this.currentStep = 0;
	}

	SquareAnimation.prototype.populate = function() {
		this.img = this.parent.img;
		this.iCornerX = this.parent.iX * this.r;
		this.iCornerY = this.parent.iY * this.c;
		this.iSizeX = this.parent.iX;
		this.iSizeY = this.parent.iY;
		this.cCornerX = this.parent.cX * this.r;
		this.cCornerY = this.parent.cY * this.c;
		this.cSizeX = this.parent.adjustedcX;
		this.cSizeY = this.parent.adjustedcY;
	
		//Special flags
		this.flashing = false;
		this.parent.context.globalAlpha = 1.0;
	}

	//Swap out save and restore with reverse context operations to save computation
	SquareAnimation.prototype.draw = function() {
		this.parent.context.save(); 
		if(this.rotation) {
			var x2 = this.cSizeX/2;
			var y2 = this.cSizeY/2;
			this.parent.context.translate(this.cCornerX + x2, this.cCornerY + y2);
			this.parent.context.rotate(this.rotation);
			this.cCornerX = x2 * -1;
			this.cCornerY = y2 * -1;
		}
		if(this.flashing) {
			this.parent.context.drawImage(this.parent.backCanvas, this.iCornerX, this.iCornerY, this.iSizeX, this.iSizeY, 
				this.cCornerX, this.cCornerY, this.cSizeX, this.cSizeY);
		} else {
			this.parent.context.drawImage(this.parent.img, this.iCornerX, this.iCornerY, this.iSizeX, this.iSizeY, 
				this.cCornerX, this.cCornerY, this.cSizeX, this.cSizeY);
		}
		this.parent.context.restore();
	}

	function GrowingEffect() {
		var parent = this;
		return function() {
			var ratio = Math.min(1.0, (this.currentStep + 1)/this.steps);
			var cxSize = parent.cX * ratio;
			var cySize = parent.cY * ratio;
			this.cCornerX += ((parent.cX - cxSize)/2);
			this.cCornerY += ((parent.cY - cySize)/2);
			this.cSizeX = cxSize;
			this.cSizeY = cySize;
		}
	}

	function FadingEffect() {
		var parent = this;
		return function() {
			parent.context.globalAlpha = this.currentStep/this.steps;
		}
	}

	function FlashingEffect(delay) {
		var parent = this;
		return function() {
			if(this.currentStep >= this.steps) {
				this.flashing = false; 
			}
			else if(this.currentStep % delay == 0) {
				this.flashing = !(this.flashing);
			}
		}
	}

	function RotatingEffect(rotations) {
		var parent = this;
		var angleTurn = rotations * 360 / parent.squareAnimationSteps;
		return function() {
			this.rotation = (angleTurn * this.currentStep) * TO_RADIANS;
		}
	}

	function ZoomingEffect(growth) {
		var parent = this;
		return function() {
			if(this.startX == undefined) { //initialize inner variables if they have not been
				switch(growth) {
					case ZoomDirection.left:
						this.startX = parent.cX * -1;
						break;
					case ZoomDirection.right:
						this.startX = parent.cwidth + parent.cX;
						break;
					case ZoomDirection.random:
						var rand = Math.random();
						if(rand <= 0.33) this.startX = 0;
						else if(rand <= 0.66) this.startX = parent.cX * -1;
						else this.startX = parent.cwidth + parent.cX;
						break;
					case ZoomDirection.random2:
						var rand = Math.random();
						var rand2 = Math.random();
						var xchosen = false;
						if(rand > 0.5) {
							if(rand2 > 0.5) this.startX = parent.cX * -1;
							else this.startX = parent.cwidth + parent.cX;
						} else {
							this.startX = this.parent.cwidth * rand2;
							xchosen = true;
						}
						break;
					default:
						this.startX = 0;
					}
				switch(growth) {
					case ZoomDirection.top:
						this.startY = parent.cY * -1;
						break;
					case ZoomDirection.bottom:
						this.startY = parent.cheight + parent.cY;
						break;
					case ZoomDirection.random:
						if(this.startX == 0) {
							if(Math.random() > 0.5) this.startY = parent.cY * -1;
							else this.startY = parent.cheight + parent.cY;
						} else this.startY = 0;
						break;
					case ZoomDirection.random2:
						rand = Math.random();
						if(xchosen) {
							if(rand > 0.5) this.startY = parent.cY * -1;
							else this.startY = parent.cheight + parent.cY;
						} else {
							this.startY = this.parent.cheight * rand;
						}
						break;
					default:
						this.startY = 0;
				}
			}
			var ratio = Math.min(1.0, (this.currentStep + 1)/this.steps);
			var invRatio = 1.0 - ratio;
			this.cCornerX = this.startX == 0 ? this.cCornerX : this.startX * invRatio + this.cCornerX * ratio;
			this.cCornerY = this.startY == 0 ? this.cCornerY : this.startY * invRatio + this.cCornerY * ratio;
		}	
	}

	//The Animation class
	var Animation = function(options) {
		var that = this;
		this.options = options; //save options for possibly passing on
		options = merge(AnimDefaults, options);
		this.context = options.canvas.getContext('2d');
	
		//If we pass in a src array it is a video
		this.isVideo = Object.prototype.toString.call( options.link ) === '[object Array]';
		this.refresh = true;
		
		//Preserve current canvas to be redrawn as background
		this.backCanvas = document.createElement('canvas');
		this.backCanvas.setAttribute('width', options.canvas.width);
		this.backCanvas.setAttribute('height', options.canvas.height);
		var backContext = this.backCanvas.getContext('2d');
		backContext.drawImage(options.canvas, 0, 0, options.canvas.width, options.canvas.height);
	
		//Handle video passed in
		if(this.isVideo) {
			this.video = document.createElement('video');
			this.video.setAttribute('style','display:none;');
			this.videoCanvas = document.createElement('canvas');
			this.videoContext = this.videoCanvas.getContext('2d');
			this.video.addEventListener('play', function(e){
				that.drawVideo(this,that);
			},false);
			this.video.addEventListener('canplay', function(e) {
				document.body.appendChild(that.video);
				that.iX = this.videoWidth/options.cols;
				that.iY = this.videoHeight/options.rows;
				that.videoCanvas.setAttribute('width', this.videoWidth);
				that.videoCanvas.setAttribute('height',this.videoHeight);
				that.video.play();
				requestAnimationFrame(that.drawImageAnim.bind(that));
			}, false);
			this.img = this.videoCanvas;
		} else {
			this.img = new Image();
			this.img.onload = function() {
				that.iX = this.width/options.cols;
				that.iY = this.height/options.rows;
				requestAnimationFrame(that.drawImageAnim.bind(that));
			};
		}
	
		this.finished = options.finished;
		this.cwidth = options.canvas.width;
		this.cheight = options.canvas.height;
		this.cX = this.cwidth/options.cols;
		this.cY = this.cheight/options.rows;
		
		//This is a hack to get around mozilla/safari not drawing exact pixel boundaries and leaving ghost lines...
		//However, this causes a slight shake in the picture when it is fully loaded...
		//Currently we just add 1 pixel to the box we draw on the canvas, possibly a better way to do this?
		if(options.adjustForGhostLines == true) {
			this.adjustedcX = this.cX + 1;
			this.adjustedcY = this.cY + 1;
		} else {
			this.adjustedcX = this.cX;
			this.adjustedcY = this.cY;
		}
		
		this.colCount = options.cols;
		this.rowCount = options.rows;
		this.buffer = [];
		this.rows = [];
		this.posfinished = false; //signify we have exhausted all elements in the position array
		this.bufrunning = true; //signify all animations in the buffer have not completed and the buffer is still running
	
		this.squareAnimationSteps = options.squareSteps; //Number of steps each square animation takes to finish
		this.growDelay = options.growDelay; //The delay in steps before growing the next batch of squares
		this.growStep = 0;
	
		this.gdirection = options.growDirection;
		this.gfactor = options.growFactor;
		this.gtype = options.growType;
		var effects = [];
		options.effects = deepCopyArray(options.effects); //Deep copy to be non-destructive to original input
		for(var i = 0; i < options.effects.length; i++) {
			var effect = options.effects[i];
			var gfn = effect.shift();
			effects.push(gfn.apply(that,effect));
		}
		this.effects = effects;
	
		this.initPos();
	
		if(this.isVideo) {
			for(var i = 0; i < options.link.length; i++) {
				//Hack for firefox - Do not add mp4 type if we cannot play it
			   var canPlayMP4 = this.video.canPlayType && this.video.canPlayType('video/mp4').replace(/no/, '');
				if(!(options.link[i].indexOf(".mp4") != -1 && !canPlayMP4)) {
					var source = document.createElement('source');
					source.src = options.link[i];
					this.video.appendChild(source);
				}
			}
		} else {
			this.img.src = options.link;
		}
	}

	Animation.prototype.drawVideo = function(v,buffer) {
		if(buffer.stopped) v.pause();
		if(v.paused || v.ended) return false;
		buffer.videoContext.drawImage(v,0,0,buffer.videoCanvas.width,buffer.videoCanvas.height);
		setTimeout(buffer.drawVideo,60,v,buffer);
	}

	//For video have secondary buffer that elements get placed in after removed and drawn as well
	//Possibly have another canvas and double buffer as well
	Animation.prototype.drawBuffer = function() {
		if(this.refresh) this.context.drawImage(this.backCanvas, 0, 0, this.cwidth, this.cheight);
		this.bufrunning = false;
		for(var i = 0; i < this.buffer.length; i++) {
			var anim = this.buffer[i];
			anim.populate();
			for(var j = 0; j < this.effects.length; j++) {
				this.effects[j].call(anim);
			}
			anim.draw();
			if(this.buffer[i].currentStep < this.buffer[i].steps) {
				this.buffer[i].currentStep += 1;
				this.bufrunning = true;
			}
		}
	}

	Animation.prototype.push = function(anim) {
		this.buffer.push(anim);
	}

	Animation.prototype.stop = function() {
		this.stopped = true;
	}
	
	Animation.prototype.stopAndDraw = function() {
		this.drawOnStop = true;
		this.stopped = true;
	}

	//Use this to generate all the positions to be drawn up
	//Initializes a 2-d buffer of all the squares to draw
	//We can then calculate rows, random, and different growth strategies using these precomputed values
	Animation.prototype.initPos = function() {
		var positions = [];
		var i, j;
		switch(this.gdirection) {
			case GrowDirection.horizontal:
				for(i = 0; i < this.rowCount; i++) {
					var inner = [];
					for(j = 0; j < this.colCount; j++) {
						inner.push([j, i]);
					}
					positions.push(inner);
				}
				break;
			case GrowDirection.vertical:
				for(i = 0; i < this.colCount; i++) {
					var inner = [];
					for(j = 0; j < this.rowCount; j++) {
						inner.push([i, j]);
					}
					positions.push(inner);
				}
				break;
			case GrowDirection.diagonal:
				for(i = 0; i < this.colCount + this.rowCount - 1; i++) {
					var z1 = i < this.rowCount ? 0 : i - this.rowCount + 1;
					var z2 = i < this.colCount ? 0 : i - this.colCount + 1;
					var inner = [];
					for (j = i - z2; j >= z1; --j) {
						inner.push([j, i - j]);
					}
					positions.push(inner);
				}
				break;
			case GrowDirection.checker:
			for(i = 0; i < this.colCount + this.rowCount - 1; i++) {
				var z1 = i < this.rowCount ? 0 : i - this.rowCount + 1;
				var z2 = i < this.colCount ? 0 : i - this.colCount + 1;
				var inner = [];
				for (j = i - z2; j >= z1; --j) {
					inner.push([j, i - j]);
				}
				positions.push(inner);
				positions = positions.reverse();
			}
			break;
		}

		this.positions = positions;
	}

	//Shifts to the next row if necessary. Returns false if all rows have been consumed 
	Animation.prototype.getRows = function() {
		if(this.rows.length == 0) {
			if(this.positions.length == 0) {
				this.posfinished = true;
				return false; //all positions are consumed
			}
		} else return true; //continue current row if still going
	
		switch(this.gtype) { //populate new rows
			case GrowType.centerin:
				this.rows.push(this.positions.shift());
				if(this.positions.length > 0) {
					this.rows.push(this.positions.pop());
				}
				break;
			case GrowType.centerout:
				var count = this.positions.length;
				if(count == 1) {
					this.rows.push(this.positions.pop());
				} else {
					var begin = Math.floor(count/2) - 1;
					this.rows.push(this.positions[begin]);
					this.rows.push(this.positions[begin+1]);
					ArrayUtils.remove(this.positions,begin, begin+1);	
				}
				break;
			case GrowType.all:
				this.rows = this.positions;
				this.postions = [];
				break;
			default: //gtype linear and random
				this.rows[0] = this.gtype == GrowType.random ? ArrayUtils.randomEle(this.positions) : this.positions.shift();
		}
		return true;
	}

	//Pass in the position 
	Animation.prototype.pushSquareToBuffer = function(pos) {
		var sAnim = new SquareAnimation(this, pos[0], pos[1]);
		sAnim.populate();
		this.push(sAnim);	
	}

	Animation.prototype.grow = function() {
		var buffer = this;
	
		switch(this.gfactor) {
			case GrowFactor.row: 
				if(!this.getRows()) return;
		
				this.rows.forEach(function (element, index, array) {
					for(var i = 0; i < element.length; i++) {
						buffer.pushSquareToBuffer(element[i]);
					}
					ArrayUtils.remove(array, index);
				});
			
				break;
			case GrowFactor.centerout:
				if(!this.getRows()) return;
			
				this.rows.forEach(function (element, index, array) {
					var count = element.length;
					switch(element.length) {
						case 1:
							var pos = element.shift();
							buffer.pushSquareToBuffer(pos);
						case 0: 
							ArrayUtils.remove(array, index);
							break;
						default:
							var begin = Math.floor(count/2) - 1;
							buffer.pushSquareToBuffer(element[begin]);
							buffer.pushSquareToBuffer(element[begin+1]);
							ArrayUtils.remove(element,begin, begin+1);				
					}
				});		
				break;
			case GrowFactor.centerin:
				if(!this.getRows()) return;

				this.rows.forEach(function (element, index, array) {
					var row = element;
					buffer.pushSquareToBuffer(element.shift());
					switch(element.length) {
						case 1:
							buffer.pushSquareToBuffer(element.pop());
						case 0: 
							ArrayUtils.remove(array, index);
							break;
						default:
							buffer.pushSquareToBuffer(element.pop());					
					}
				});

				break;
			case GrowFactor.linear:
				if(this.gtype == GrowType.random) { //handle special case of linear and random
					this.pushSquareToBuffer(ArrayUtils.randomEle2D(this.positions));
					if(this.positions.length == 0) {
						this.posfinished = true;
					}
				} else {
					if(!this.getRows()) return;
					this.rows.forEach(function (element, index, array) {
						if(element.length > 0) {
							buffer.pushSquareToBuffer(element.shift());
						} else {
							ArrayUtils.remove(array, index);
						}
					});
				}
		}	
	}
	
	Animation.prototype.drawImageAnim = function() {
		if(!this.stopped) {
			var that = this;

			if(this.growStep == this.growDelay) {
				if(!this.posfinished) this.grow();
				this.growStep = 0;
			} else this.growStep += 1;
			this.drawBuffer();
			if(!this.posfinished || this.bufrunning) {
				requestAnimationFrame(that.drawImageAnim.bind(that));
			} else {
				//Redraw the whole picture in case of ghost lines
				this.context.drawImage(this.img, 0, 0, this.cX * this.colCount, this.cY * this.rowCount);
				if(this.isVideo && !this.video.paused) {
					requestAnimationFrame(that.drawImageAnim.bind(that));
				} else {
					this.finished(); 
				}
			}
		} else {
			if(this.stopAndDraw) {
				this.context.drawImage(this.img, 0, 0, this.cX * this.colCount, this.cY * this.rowCount);
			}
			this.finished();
		}
	}

	return {
		//Classes
		Animation : Animation,
		SquareUtils : SquareUtils,
		//Constants
		ZoomDirection : ZoomDirection,
		GrowDirection : GrowDirection,
		GrowFactor : GrowFactor,
		GrowType : GrowType,
		//Effect functions
		GrowingEffect : GrowingEffect,
		FadingEffect : FadingEffect,
		FlashingEffect : FlashingEffect,
		RotatingEffect : RotatingEffect,
		ZoomingEffect : ZoomingEffect
	}
	
})(window, document);
