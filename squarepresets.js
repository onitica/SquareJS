;var SquarePresets = (function(Squares) {
	var LOG = false;
	
	function gen(type, canvas, link, size) {
		var obj = presets[type];
		obj.canvas = canvas;
		obj.link = link;
		obj.rows = size[0];
		obj.cols = size[1];
		
		//Adjust for ghost lines based on browser... Currently assume only chrome renders correctly
		obj.adjustForGhostLines = !(navigator.userAgent.toLowerCase().indexOf('chrome') > -1);
		
		return obj;
	}
	
	function finished() {
		if(LOG) { 
			console.log("Finished SquarePreset"); 
		}
	}
	
	function circularIterator(array) {
		return function() {
			var currentPos = 0;

			var next = function() {
				currentPos += 1;
				if(currentPos == array.length) {
					currentPos = 0;
				}
				return array[currentPos];
			}

			var prev = function() {
				currentPos -= 1;
				if(currentPos < 0) {
					currentPos = array.length - 1;
				}
				return array[currentPos];
			}

			return {
				next : next,
				prev : prev
			}	
		}();
	}

	function randomIterator(array) {
		return function() {
			var random = function() {
				return array[Math.floor(Math.random() * array.length)];
			  }

			return {
				next : random,
				prev : random
			}
		}();
	}
	
	function getDivSize(divName) {
		var div = document.getElementById(divName);
		return [div.offsetWidth, div.offsetHeight];
	}	
	
	function createGallery(divName, imageArray, effectsArray) {
		var imageIter = circularIterator(imageArray);
		var effectsIter = randomIterator(effectsArray);
		var size = getDivSize(divName);
		var width = size[0];
		var height = size[1];
		var hw = Squares.SquareUtils.getSquareRatio(10, width, height);
		var buffer = height/12;

		var canvas = document.createElement('canvas');
		canvas.setAttribute('width', width);
		canvas.setAttribute('height', height - (buffer * 2));  
		canvas.onclick = function() {
			Animator.stopAndDraw();
		}

		var bottomDiv = document.createElement('div');
		bottomDiv.setAttribute('width', width);
		bottomDiv.setAttribute('height', buffer*2);
		bottomDiv.style.position = "relative";
		bottomDiv.style.cssFloat = "bottom";
		
		var textDiv = document.createElement('div');
		textDiv.style.cssFloat = "center";
		textDiv.style.position = "relative";
		textDiv.style.paddingTop = "10px";
		textDiv.style.textAlign = "center";
		textDiv.style.zIndex = "1";

		var left = new Image();
		left.style.top = 0 + "px";
		left.style.cssFloat = "left";
		left.style.position = "relative";
		left.style.zIndex = "2";
		left.setAttribute('height', buffer);
		left.setAttribute('width', buffer);
		left.src = "left-arrow.png";
		left.onclick = function() {
			Animator.stop();
			var effect = effectsIter.prev();
			textDiv.innerHTML = effect;
			Animator = new Squares.Animation(SquarePresets.gen(effect, canvas, imageIter.prev(), hw));
		}

		var right = new Image();
		right.style.top = 0 + "px";
		right.style.cssFloat = "right";
		right.style.position = "relative";
		right.style.zIndex = "2";
		right.setAttribute('height', buffer);
		right.setAttribute('width', buffer);
		right.src = "right-arrow.png";
		right.onclick = function() {
			Animator.stop();
			var effect = effectsIter.next();
			textDiv.innerHTML = effect;
			Animator = new Squares.Animation(SquarePresets.gen(effect, canvas, imageIter.next(), hw));
		}

		var canvasDiv = document.getElementById(divName);
		bottomDiv.appendChild(left);
		bottomDiv.appendChild(right);
		bottomDiv.appendChild(textDiv);
		canvasDiv.appendChild(canvas);
		canvasDiv.appendChild(bottomDiv);
		textDiv.innerHTML = effectsArray[0];
		var Animator = new Squares.Animation(SquarePresets.gen(effectsArray[0], canvas, imageArray[0], hw));
	}
	
	var presets = {
		//More fun presets
		checkers : {
			growDelay : 0,
			growDirection : Squares.GrowDirection.checker,
			growFactor : Squares.GrowFactor.linear,
			growType : Squares.GrowType.linear,
			effects : [],
			squareSteps : 1,
			finished : finished
		},
		fadeoutcenter : {
			growDelay : 1,
			growDirection : Squares.GrowDirection.vertical,
			growFactor : Squares.GrowFactor.row,
			growType : Squares.GrowType.centerout,
			effects : [[Squares.FadingEffect]],
			squareSteps : 25,
			finished : finished 
		},
		jumble : {
			growDelay : 2,
			growDirection : Squares.GrowDirection.diagonal,
			growFactor : Squares.GrowFactor.row,
			growType : Squares.GrowType.centerout,
			effects : [[Squares.GrowingEffect],[Squares.ZoomingEffect,Squares.ZoomDirection.random2]],
			finished : finished
		},
		progressbar : {
			growDelay : 5,
			growDirection : Squares.GrowDirection.vertical,
			growFactor : Squares.GrowFactor.row,
			growType : Squares.GrowType.linear,
			effects : [[Squares.GrowingEffect]],
			squareSteps : 30,
			finished : finished
		},
		slidingdown : {
			growDelay : 6,
			growDirection : Squares.GrowDirection.horizontal,
			growFactor : Squares.GrowFactor.row,
			growType : Squares.GrowType.linear,
			effects : [[Squares.ZoomingEffect,Squares.ZoomDirection.top]],
			finished : finished
		},
		slinky : {
			growDelay : 2,
			growDirection : Squares.GrowDirection.horizontal,
			growFactor : Squares.GrowFactor.linear,
			growType : Squares.GrowType.all,
			effects : [[Squares.ZoomingEffect,Squares.ZoomDirection.right]],
			finished : finished
		},
		spinners : {
			growDelay : 2,
			growDirection : Squares.GrowDirection.diagonal,
			growFactor : Squares.GrowFactor.row,
			growType : Squares.GrowType.centerout,
			effects : [[Squares.RotatingEffect, 4]],
			finished : finished
		},
		waterfall : {
			growDelay : 3,
			growDirection : Squares.GrowDirection.horizontal,
			growFactor : Squares.GrowFactor.linear,
			growType : Squares.GrowType.all,
			effects : [[Squares.ZoomingEffect,Squares.ZoomDirection.top]],
			finished : finished
		},
		whackamole : {
			growDelay : 2,
			growFactor : Squares.GrowFactor.random,
			growType : Squares.GrowType.random,
			effects : [[Squares.FlashingEffect,4]],
			finished : finished
		}	
	}
	
	return {
		gen : gen,
		createGallery : createGallery
	}
})(Squares);