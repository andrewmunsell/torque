////////////////////////////////
// Torque BallRenderer
// CartoDB, 2015
// developed by Francisco Dans
////////////////////////////////

function BallRenderer(thecanvas){
	this.canvas = thecanvas;
	this.ctx = this.canvas.getContext("2d");
	this.width = this.canvas.width;
	this.height = this.canvas.height;
	this.size = this.width * this.height;
	this.pointLayer = new Uint8ClampedArray(this.size * 4);
	this.radius = 30;
	this.drawnTemp = {};
	this.prof = 0;
	this.gradient = {};
}
BallRenderer.prototype = {
	addBall: function(x0, y0){
        var orad = this.radius;
        var increment = this.map_range(1, 0, orad,0,255);
        var x = this.radius;
        var y = 0;
        var radiusError = 1 - x;
        while (x >= y){
        	// Try not to touch the following, it's a pain in the ass to write
            this.horizontalLine(-x + x0, y + y0, x + x0, y + y0, x0,y0);
            this.horizontalLine(-y + x0, -x + y0, y + x0, -x + y0, x0,y0);
            this.horizontalLine(-x + x0, -y + y0, x + x0, -y + y0, x0,y0);
            this.horizontalLine(-y + x0, x + y0, y + x0, x + y0, x0,y0);
            y++;
            if (radiusError<0){
                radiusError += 2 * y + 1;
            }
            else{
                x--;
                radiusError += 2 * (y - x) + 1;
            }
        }
        this.drawnTemp = {};
	},
	addPoint: function(x, y, alpha){
		var indexPos = this.getRIndexPos(x, y);
		this.pointLayer[indexPos + 3] = this.pointLayer[indexPos + 3] + alpha;
	},
	horizontalLine: function(xi, yi, xf, yf, x0, y0){
		function lineDistance(x,y){
		  var xs = Math.pow(x - x0, 2);
		  var ys = Math.pow(y - y0, 2);
		  return Math.sqrt( xs + ys );
		}
		// Assumes xi is on the left and xf is on the right
		if(typeof this.drawnTemp[yi] === "undefined"){
			while (xi <= xf){
				var alpha = this.map_range(lineDistance(xi, yi), 0, this.radius, 30, 0);
				this.addPoint(xi, yi, alpha);
				xi ++;
			}
			this.drawnTemp[yi]=true;
		}
	},
	contour: function(granularity){
		var step = 255/granularity;
		var i = 1, a = new Uint8ClampedArray(granularity+1), c=0;
		while (i<255){
			a[c] = i;
			i += step;
			c++;
		}
		a[a.length-1] = 255;
		var l = -step/2;
		var gradient = new Uint8ClampedArray(1024);
		for(var i = 0; i<a.length; i++){
			var y = Math.round(i*step);
			var thisAlpha = a[i];
			while(y<step*(i+1)){
				gradient[y*4+3] = thisAlpha;
				y++;
			}
		}
		if(!this.contourLayer) this.contourLayer = new Uint8ClampedArray(this.size * 4);
		for (var i = 0; i< this.pointLayer.length; i+=4){
			if(this.pointLayer[i+3] === 0) continue;
			var currentAlpha = this.pointLayer[i+3];
			this.contourLayer[i+3] = gradient[currentAlpha*4+3];
		}
	},
	draw: function(dataArray){
		if (!dataArray){
			if (this.isoplethLayer) dataArray = this.isoplethLayer;
			else if (this.contourLayer) dataArray = this.contourLayer;
			else dataArray = this.pointLayer;
		}
		if(!this.imageData) this.imageData = this.ctx.createImageData(this.width, this.height);
	    this.imageData.data.set(dataArray);
	    this.ctx.putImageData(this.imageData, 0, 0);
	},
	mergeLayers: function(from, to){
		if (from.length !== to.length) throw("layers aren't of the same size"); return;
		for (var i = 0; i<to.length; i++){
			if(from[i+3]>0){
				// There's a better way of doing this but I was lazy.
				to[i] = from[i];
				to[i+1] = from[i+1];
				to[i+2] = from[i+2];
				to[i+3] = from[i+3];
			}
		}
	},
	reduceArray: function(){

	},
	expandArray: function(){

	},
	invalidate: function(){
		if(!this.imageData) this.imageData = this.ctx.createImageData(this.width, this.height);
		this.pointList = new Uint8ClampedArray(this.size * 4);
	    this.imageData.data.set(this.pointList);
	    this.ctx.putImageData(this.imageData, 0, 0);
	},
	getRIndexPos: function(x,y){
		var rIndexPos = (y*this.width+x)*4;
		return rIndexPos;
	},
	getXYFromRIndex: function(index){
		var x = (index % (this.width*4))/4;
		var y = (index - 4 * x) / (4 * this.width);
		return [x,y];
	},
	// Clockwise. Again, there definitely is a better way.
	getNeighbors: function(index){
		var tw = this.width*4;
		var n = index - tw;
		var s = index + tw;
		return [n, n + 4, index + 4, s + 4, s, s - 4, index - 4, n -4];
	},
	map_range: function(value, low1, high1, low2, high2) {
        return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
    },
    isEmpty: function(layer) {
    	for (var i = 0; i<layer.length; i+=4){
    		if(layer[i+3] > 0) return false;
    	}
    	return true;
    },
    createArray: function(){
    	return new Uint8ClampedArray(this.size * 4);
    },
    isopleth: function(factor){
    	var skip = false;
    	if(!(factor>0)) factor = 1;
    	this.isoplethLayer = this.createArray();
    	for (var i = 0, len = this.contourLayer.length; i<len; i+=4){
    		var alpha = this.contourLayer[i + 3];
    		if (alpha > 0 && alpha < 255){
    			var neighbors = this.getNeighbors(i);
    			for (var n = 0, ln = neighbors.length; n<ln; n++){
    				var index = neighbors[n];
    				if(this.contourLayer[index+3] === 0 || this.contourLayer[index+3]!==this.contourLayer[i+3]){
    					this.isoplethLayer[index+3] = 255;
    					this.isoplethLayer[index] = this.contourLayer[index+3];
    					this.isoplethLayer[index+1] = this.contourLayer[index+3];
    				}
    			}
    		}
    	}
    	//this.invalidate();
    	this.draw(this.isoplethLayer);
    },
    colorize: function (pixels, gradient) {
        for (var i = 3, len = pixels.length, j; i < len; i += 4) {
            j = pixels[i] * 4; // get gradient color from opacity value

            if (j) {
                pixels[i - 3] = gradient[j];
                pixels[i - 2] = gradient[j + 1];
                pixels[i - 1] = gradient[j + 2];
            }
        }
    }
}

module.exports = BallRenderer;