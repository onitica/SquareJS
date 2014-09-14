;var SquarePresets = (function(Squares) {
	'use strict';
	
	var LOG = false;
	var NEXT_IMAGE_DELAY = 2000;
	var SQUARES_JS_ANIMATOR_PROP = "SquaresJS_Animator";
	var SELECTED_CIRCLE_PROP = "SquaresJS_SelectedCircle";
	var IS_PAUSED_PROP = "SquaresJS_IsPaused";
	var CURRENT_ANIMATION_PROP = "SquaresJS_CurrentAnimation";
	var EMPTY_FUNC = function() {};
	
	function gen(type, canvas, link, size, finish) {
		var obj = presets[type];
		obj.canvas = canvas;
		obj.link = link;
		obj.rows = size[0];
		obj.cols = size[1];
		obj.finished = finish;
		
		// Adjust for ghost lines based on browser... Currently assume only chrome renders correctly
		obj.adjustForGhostLines = !(navigator.userAgent.toLowerCase().indexOf('chrome') > -1);
		
		return obj;
	}
	
	// Source: http://stackoverflow.com/questions/2745432/best-way-to-detect-that-html5-canvas-is-not-supported
	function isCanvasSupported(){
	  var elem = document.createElement('canvas');
	  return !!(elem.getContext && elem.getContext('2d'));
	}
	
	// Creates a circular iterator over an array
	function circularIterator(array) {
		return function() {
			var currentPos = 0;

			var next = function() {
				currentPos += 1;
				if(currentPos == array.length) {
					currentPos = 0;
				}
				return array[currentPos];
			};

			var prev = function() {
				currentPos -= 1;
				if(currentPos < 0) {
					currentPos = array.length - 1;
				}
				return array[currentPos];
			};
			
			var setPosition = function(current) {
				if(current < 0 || current > array.length) {
					throw 'Error: Attempted to set iterator to invalid position.';
				} else {
					currentPos = current;
					return array[currentPos];
				}
			};

			return {
				next : next,
				prev : prev,
				setPosition : setPosition
			};
		}();
	}

	// Currently unused, but cool if you want random effects
	function randomIterator(array) {
		return function() {
			var random = function() {
				return array[Math.floor(Math.random() * array.length)];
			};

			return {
				next : random,
				prev : random
			};
		}();
	}
	
	function getDivSize(divName) {
		var div = document.getElementById(divName);
		return [div.offsetWidth, div.offsetHeight];
	}	
	
	// Source: http://stackoverflow.com/questions/288699/get-the-position-of-a-div-span-tag
	function getPos(el) {
	    for (var lx=0, ly=0;
	         el !== null;
	         lx += el.offsetLeft, ly += el.offsetTop, el = el.offsetParent);
	    return {x: lx, y: ly};
	}
	
	function createGallery(divName, gallery) {
		var size = getDivSize(divName);
		var width = size[0];
		var height = size[1];
		
		// If we don't support canvas - silently log error and just insert first img into the div
		if(!isCanvasSupported()) {
			console.log("SquaresJS Error: Unable to instantiate a canvas object!");
			var imgDiv = document.getElementById(divName);
			var img_tag = document.createElement('img');
			img_tag.setAttribute('width', width);
			img_tag.setAttribute('height', height);
			img_tag.setAttribute('src', gallery.values[0].image);
			imgDiv.appendChild(img_tag);
			return;
		}
		
		var hw = Squares.SquareUtils.getSquareRatio(10, width, height);
		var buffer = (height/12) * (gallery.textHeader ? 2 : 1);

		var canvas = document.createElement('canvas');
		canvas.setAttribute('width', width);
		canvas.setAttribute('height', height - buffer);  
		canvas.setAttribute('class', 'squaresjs_canvas_border');
		canvas.onclick = function(e) {
			canvas[SQUARES_JS_ANIMATOR_PROP].stopAndDraw();
		};

		var bottomDiv = document.createElement('div');
		bottomDiv.setAttribute('width', width);
		bottomDiv.setAttribute('height', buffer);
		bottomDiv.setAttribute('class', 'squaresjs_bottom_div');
		
		var choiceDiv = document.createElement('ul');
		choiceDiv.setAttribute('class', 'squaresjs_circles');
		var iteration_values = [];
		for(var i = 0; i < gallery.values.length; i++) {
			var circle = document.createElement('li');
			var circle_button = document.createElement('button');
			if(i === 0) {
				canvas[SELECTED_CIRCLE_PROP] = circle_button;
				circle_button.setAttribute('class', 'squaresjs_active');
			}
			circle_button.innerHTML = i + '';
			circle_button.setAttribute('type', 'button');
			
			circle_button.onclick = function() {
				if(canvas[CURRENT_ANIMATION_PROP]) {
					clearTimeout(canvas[CURRENT_ANIMATION_PROP]);
				}
				canvas[SQUARES_JS_ANIMATOR_PROP].setFinished(function() {});
				canvas[SQUARES_JS_ANIMATOR_PROP].stop();
				
				var data = iter.setPosition(parseInt(this.innerHTML)).data;
				
				var finish = createNextFunction(canvas, iter, hw);
				canvas[SQUARES_JS_ANIMATOR_PROP] = new Squares.Animation(SquarePresets.gen(data.effect, canvas, data.image, hw, finish));
				this.setAttribute('class', 'squaresjs_active');
				
				if(canvas[SELECTED_CIRCLE_PROP].hasAttribute('class')) {
					canvas[SELECTED_CIRCLE_PROP].removeAttribute('class');
					canvas[SELECTED_CIRCLE_PROP] = this;
				}
				
				if(canvas.textHeader) {
					canvas.textHeader.innerHTML = data.text;
				}
			};
			
			circle.appendChild(circle_button);
			choiceDiv.appendChild(circle);
			iteration_values.push({
				data : gallery.values[i],
				button : circle_button
			});
		}
		
		var iter = circularIterator(iteration_values);

		var canvasDiv = document.getElementById(divName);
		bottomDiv.appendChild(choiceDiv);
		
		if(gallery.textHeader) {
			var textDiv = document.createElement('div');
			textDiv.setAttribute('class', 'squaresjs_text_div');
			canvas.textHeader = textDiv;
			canvasDiv.appendChild(textDiv);
		}
		
		canvasDiv.appendChild(canvas);
		canvasDiv.appendChild(bottomDiv);
		
		var playSpan = document.createElement('span');
		var canvasPos = getPos(canvas);
		playSpan.setAttribute('class', 'squaresjs_play');
		playSpan.setAttribute('top', canvasPos.y + canvas.height + 10);
		playSpan.setAttribute('left', canvasPos.x + canvas.width + 10);
		playSpan.onclick = function() {
			canvas[SQUARES_JS_ANIMATOR_PROP].stopAndDraw();
			if(canvas[IS_PAUSED_PROP] === true) {
				canvas[IS_PAUSED_PROP] = false;
				playSpan.setAttribute('class', 'squaresjs_pause');
				createNextFunction(canvas, iter, hw)();
			} else {
				canvas[IS_PAUSED_PROP] = true;
				clearTimeout(canvas[CURRENT_ANIMATION_PROP]);
				playSpan.setAttribute('class', 'squaresjs_play');
			}
		};
		canvasDiv.appendChild(playSpan);
		if(gallery.repeat) {
			canvas[IS_PAUSED_PROP] = true;
			playSpan.setAttribute('class', 'squaresjs_pause');
		}
		
		var data = iter.setPosition(0).data;
		canvas[IS_PAUSED_PROP] = true; // Paused by default
		
		canvas[SQUARES_JS_ANIMATOR_PROP] = new Squares.Animation(SquarePresets.gen(data.effect, canvas, data.image, hw, EMPTY_FUNC));
		if(canvas.textHeader) {
			canvas.textHeader.innerHTML = data.text;	
		}
	}
	
	function createNextFunction(canvas, iter, hw) {
		return function() {
			if(canvas[IS_PAUSED_PROP] === false) {
				canvas[CURRENT_ANIMATION_PROP] = setTimeout(function() {
					var iter_obj = iter.next();
					var data = iter_obj.data;
					var finish = createNextFunction(canvas, iter, hw);
					canvas[SQUARES_JS_ANIMATOR_PROP] = new Squares.Animation(SquarePresets.gen(data.effect, canvas, data.image, hw, finish));
					var circle_button = iter_obj.button;
					circle_button.setAttribute('class', 'squaresjs_active');

					if(canvas[SELECTED_CIRCLE_PROP].hasAttribute('class')) {
						canvas[SELECTED_CIRCLE_PROP].removeAttribute('class');
						canvas[SELECTED_CIRCLE_PROP] = circle_button;
					}

					if(canvas.textHeader) {
						canvas.textHeader.innerHTML = data.text;
					}
				}, NEXT_IMAGE_DELAY);
			}
		};
	}
	
	// Preset objects - Feel free to mess around with the options 
	var presets = {
		checkers : {
			growDelay : 0,
			growDirection : Squares.GrowDirection.checker,
			growFactor : Squares.GrowFactor.linear,
			growType : Squares.GrowType.linear,
			effects : [],
			squareSteps : 1
		},
		fadeoutcenter : {
			growDelay : 1,
			growDirection : Squares.GrowDirection.vertical,
			growFactor : Squares.GrowFactor.row,
			growType : Squares.GrowType.centerout,
			effects : [[Squares.FadingEffect]],
			squareSteps : 25
		},
		jumble : {
			growDelay : 2,
			growDirection : Squares.GrowDirection.diagonal,
			growFactor : Squares.GrowFactor.row,
			growType : Squares.GrowType.centerout,
			effects : [[Squares.GrowingEffect],[Squares.ZoomingEffect,Squares.ZoomDirection.random2]]
		},
		progressbar : {
			growDelay : 5,
			growDirection : Squares.GrowDirection.vertical,
			growFactor : Squares.GrowFactor.row,
			growType : Squares.GrowType.linear,
			effects : [[Squares.GrowingEffect]],
			squareSteps : 30
		},
		slidingdown : {
			growDelay : 6,
			growDirection : Squares.GrowDirection.horizontal,
			growFactor : Squares.GrowFactor.row,
			growType : Squares.GrowType.linear,
			effects : [[Squares.ZoomingEffect,Squares.ZoomDirection.top]]
		},
		slinky : {
			growDelay : 2,
			growDirection : Squares.GrowDirection.horizontal,
			growFactor : Squares.GrowFactor.linear,
			growType : Squares.GrowType.all,
			effects : [[Squares.ZoomingEffect,Squares.ZoomDirection.right]]
		},
		spinners : {
			growDelay : 2,
			growDirection : Squares.GrowDirection.diagonal,
			growFactor : Squares.GrowFactor.row,
			growType : Squares.GrowType.centerout,
			effects : [[Squares.RotatingEffect, 4]]
		},
		waterfall : {
			growDelay : 3,
			growDirection : Squares.GrowDirection.horizontal,
			growFactor : Squares.GrowFactor.linear,
			growType : Squares.GrowType.all,
			effects : [[Squares.ZoomingEffect,Squares.ZoomDirection.top]]
		},
		whackamole : {
			growDelay : 2,
			growFactor : Squares.GrowFactor.random,
			growType : Squares.GrowType.random,
			effects : [[Squares.FlashingEffect,4]]
		}	
	};
	
	return {
		gen : gen,
		createGallery : createGallery
	};
})(Squares);