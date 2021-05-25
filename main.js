// elements
const ele = {
	canvas0:document.getElementById('canvas0'),
	canvas1:document.getElementById('canvas1'),
	canvas2:document.getElementById('canvas2'),
	formula:document.getElementById('formula'),
	error:document.getElementById('error')
}

const ctx0 = canvas0.getContext('2d');
const ctx1 = canvas1.getContext('2d');
const ctx2 = canvas2.getContext('2d');

// settings
var settings = {
	bg:{
		detail:4,
		drawWidth:10
	},
	lines:{
		radius:8,
		spacing:10
	},
	scrollSpeed:1.01,
}

// information about viewport
var viewport = {}

viewport.width = ele.canvas1.offsetWidth;
viewport.height = ele.canvas1.offsetHeight;
viewport.ratio = viewport.width/viewport.height;
console.log(viewport)

viewport.xMin = -10;
viewport.xMax = 10;
viewport.yMin = -10/viewport.ratio;
viewport.yMax = 10/viewport.ratio;

// resize viewport
function calcViewport(){
	ele.canvas0.width = ele.canvas1.offsetWidth;
	ele.canvas0.height = ele.canvas1.offsetHeight;
	ele.canvas1.width = ele.canvas1.offsetWidth;
	ele.canvas1.height = ele.canvas1.offsetHeight;
	ele.canvas2.width = ele.canvas2.offsetWidth;
	ele.canvas2.height = ele.canvas2.offsetHeight;

	var  oldRatio = viewport.ratio;
	viewport.width = ele.canvas1.width;
	viewport.height = ele.canvas1.height;
	viewport.ratio = viewport.width/viewport.height;

	var change = oldRatio / viewport.ratio

	viewport.yMin *= change;
	viewport.yMax *= change;
}
calcViewport();

// handle resize
window.addEventListener('resize',()=>{
	clearInterval(drawLoop);
	calcViewport();
	updateCord();
	drawAll();
});

// initialize canvas
function clear(){
	ctx1.fillStyle = '#000100'
	ctx1.fillRect(0,0,viewport.width,viewport.height)
}
clear();


// convert coordinates
var screenCordConst = {};
function screenCord(c){
	var n = screenCordConst;
	return {x:n.x.m*c.x+n.x.b,y:n.y.m*c.y+n.y.b};
}
var mathCordConst = {};
function mathCord(c){
	var n = mathCordConst;
	return {x:n.x.m*c.x+n.x.b,y:n.y.m*c.y+n.y.b};
}
function updateCord(){
	var v = viewport;
	screenCordConst = {
		x:{
			m:v.width/(v.xMax-v.xMin),
			b:(v.width*v.xMin)/(v.xMin-v.xMax)
		},
		y:{
			m:v.height/(v.yMin-v.yMax),
			b:(v.height*v.yMax)/(v.yMax-v.yMin)
		}
	};
	mathCordConst = {
		x:{
			m:(v.xMax-v.xMin)/v.width,
			b:v.xMin
		},
		y:{
			m:(v.yMin-v.yMax)/v.height,
			b:v.yMax
		}
	};
}
updateCord();

// handle input
ele.formula.value = localStorage.getItem('formula') || 'sin(x)+y';
var func = math.compile(ele.formula.value);
ele.formula.addEventListener('input',()=>{
	try {
		var f = math.compile(ele.formula.value)
		f.evaluate({x:0,y:0});
		ele.error.innerHTML = '';
	} catch (err) {
		ele.error.innerHTML = err.toString();
	}
});
ele.formula.addEventListener('change',()=>{
	try {
		var f = math.compile(ele.formula.value)
		f.evaluate({x:0,y:0});
		localStorage.setItem('formula',ele.formula.value)
		func = f;
		drawAll();
		ele.error.innerHTML = '';
	} catch (err) {
		ele.formula.value = localStorage.getItem('formula');
		ele.error.innerHTML = '';
	}
});

// allow draging
ele.canvas2.addEventListener('mousemove',e=>{ 
	if(e.buttons % 2 == 1){
		clearInterval(drawLoop);

		var x = mathCordConst.x.m * e.movementX;
		var y = mathCordConst.y.m * e.movementY;
		viewport.xMin -= x;
		viewport.xMax -= x;
		viewport.yMin -= y;
		viewport.yMax -= y;

		updateCord();
		drawAll();
	}
});

ele.canvas2.addEventListener('wheel',e=>{
	clearInterval(drawLoop);

	viewport.xMin *= Math.pow(settings.scrollSpeed,e.deltaY);
	viewport.xMax *= Math.pow(settings.scrollSpeed,e.deltaY);
	viewport.yMin *= Math.pow(settings.scrollSpeed,e.deltaY);
	viewport.yMax *= Math.pow(settings.scrollSpeed,e.deltaY);

	updateCord();
	drawAll();
});

// convert slope to color
function color(slope){
	if (!isFinite(slope)){
		return('rgb(255,0,255)')
	} else if (slope > 0){
		return(`rgb(${Math.floor(
			256 - 256/(1 + slope)
		)},0,0)`);
	} else if (slope < 0){
		return(`rgb(0,0,${Math.floor(
			256 - 256/(1 - slope)
		)})`);
	} else {
		return('rgb(0,0,0)');
	}
}

// draw
var drawLoop;
function drawAll(detail){
	var i = 0;
	if(detail){
		drawLoop = setInterval(()=>{
			for(var x = i; x < i + detail * settings.bg.drawWidth; x += detail){
				if(x >= viewport.width){
					clearInterval(drawLoop);
					if(detail > 1){
						drawAll(detail/2);
					}
					break;
				}
				for(var y = 0; y < viewport.height; y += detail){
					drawPixel({x:x,y:y},detail);
				}
			}
			i += detail * settings.bg.drawWidth;
		});
	}else{
		drawSlope();
		for(var x = i; x < viewport.width; x += 16){
			for(var y = 0; y < viewport.height; y += 16){
				drawPixel({x:x,y:y},16);
			}
		}
		drawAll(8)
	}
}

function drawSlope(){
	ctx2.strokeStyle = '#ffffff'
	ctx2.clearRect(0,0,viewport.width,viewport.height);
	for(var x = settings.lines.spacing; x < viewport.width; x += 2*settings.lines.spacing){
		for(var y = settings.lines.spacing; y < viewport.width; y += 2*settings.lines.spacing){
			var c = mathCord({x:x,y:y});
			var slope = func.evaluate(c);
			var tmp = (mathCordConst.x.m * settings.lines.radius) / Math.sqrt((slope*slope) + 1);

			var x1 = c.x - tmp;
			var x2 = c.x + tmp;
			var y1 = slope*(x1 - c.x) + c.y;
			var y2 = slope*(x2 - c.x) + c.y;

			var p1 = screenCord({x:x1,y:y1});
			var p2 = screenCord({x:x2,y:y2});

			ctx2.beginPath();
			ctx2.moveTo(p1.x,p1.y);
			ctx2.lineTo(p2.x,p2.y);
			ctx2.stroke();
		}
	}
}

function drawPixel(c,detail){
	//if(Math.random()<0.001){console.log(c,mathCord(c))}
	ctx1.fillStyle = color(func.evaluate(mathCord(c)))
	ctx1.fillRect(c.x,c.y,detail,detail)
	ctx1.fillRect
}

drawAll();