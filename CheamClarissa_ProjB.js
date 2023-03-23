//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// Chapter 5: ColoredTriangle.js (c) 2012 matsuda  AND
// Chapter 4: RotatingTriangle_withButtons.js (c) 2012 matsuda
// became:
//
// BasicShapes.js  MODIFIED for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin
//		--converted from 2D to 4D (x,y,z,w) vertices
//		--extend to other attributes: color, surface normal, etc.
//		--demonstrate how to keep & use MULTIPLE colored shapes in just one
//			Vertex Buffer Object(VBO). 
//		--create several canonical 3D shapes borrowed from 'GLUT' library:
//		--Demonstrate how to make a 'stepped spiral' tri-strip,  and use it
//			to build a cylinder, sphere, and torus.
//
// Clarissa Cheam
//
//

// Vertex shader program----------------------------------
var VSHADER_SOURCE = 
  'uniform mat4 u_ModelMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE = 
//  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
//  '#endif GL_ES\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

// Global Variables
var gl;
var ANGLE_STEP = 45.0;		// Rotation angle rate (degrees/second)
var floatsPerVertex = 7;	// # of Float32Array elements used for each vertex
													// (x,y,z,w)position + (r,g,b)color
													// Later, see if you can add:
													// (x,y,z) surface normal + (tx,ty) texture addr.
													// flying cherub movement
var currentAngle = 0.0;

var g_lastMS = Date.now();
var g_isRun = true;

                                //---------------
// lower petal movement
var g_angle1now  =   0.0; 			// init Current rotation angle, in degrees > 0
var g_angle1rate =  64.0;				// init Rotation angle rate, in degrees/second.
var g_angle1brake=	 1.0;				// init Rotation start/stop. 0=stop, 1=full speed.
var g_angle1min  = -60.0;       // init min, max allowed angle, in degrees
var g_angle1max  =  30.0;
                                //---------------
// middle petal movement
var g_angle2now  =   0.0; 			// init Current rotation angle, in degrees.
var g_angle2rate =  60.0;				// init Rotation angle rate, in degrees/second.
var g_angle2brake=	 1.0;				// init Speed control; 0=stop, 1=full speed.
var g_angle2min  = -50.0;       // init min, max allowed angle, in degrees
var g_angle2max  = 50.0;			

// smallest petal movement
var g_angle3now  =   0.0; 			// init Current rotation angle, in degrees.
var g_angle3rate =  75.0;				// init Rotation angle rate, in degrees/second.
var g_angle3brake=	 1.0;				// init Speed control; 0=stop, 1=full speed.
var g_angle3min  = -70.0;       // init min, max allowed angle, in degrees
var g_angle3max  = 70.0;

// cherub wing movement
var g_angle4now  =   0.0; 			// init Current rotation angle, in degrees.
var g_angle4rate =  70.0;				// init Rotation angle rate, in degrees/second.
var g_angle4brake=	 1.0;				// init Speed control; 0=stop, 1=full speed.
var g_angle4min  = -40.0;       // init min, max allowed angle, in degrees
var g_angle4max  = -20.0;

// flying creature translation?
var g_movementnow  =   0.0; 			// init Current rotation angle, in degrees.
var g_movementrate =  0.1;				// init Rotation angle rate, in degrees/second.
var g_movementbrake=  1.0;				// init Speed control; 0=stop, 1=full speed.
var g_movementmin  = -0.4;       // init min, max allowed angle, in degrees
var g_movementmax  = 1.0;

// Global vars for mouse click-and-drag for rotation.
var isDrag=false;		// mouse-drag: true when user holds down mouse button
var xMclik=0.0;			// last mouse button-down position (in CVV coords)
var yMclik=0.0;   
var xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot=0.0;  

var qNew = new Quaternion(0,0,0,1); // most-recent mouse drag's rotation
var qTot = new Quaternion(0,0,0,1);	// 'current' orientation (made from qNew)
var quatMatrix = new Matrix4();				// rotation matrix, made from latest qTot

var canvas = document.getElementById('webgl');
gl = canvas.getContext("webgl", { preserveDrawingBuffer: true});	
var u_ModelMatrix;
var modelMatrix;

function main() {
//==============================================================================
  // Retrieve <canvas> element
  

  // Get the rendering context for WebGL
  //var gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true});	
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // 
  var n = initVertexBuffer(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

	// Register the Mouse & Keyboard Event-handlers-------------------------------
	
	// Here's how to 'register' all mouse events found within our HTML-5 canvas:
	canvas.onmousedown	=	function(ev){myMouseDown( ev, gl, canvas) }; 
	// when user's mouse button goes down, call mouseDown() function
	canvas.onmousemove = 	function(ev){myMouseMove( ev, gl, canvas) };
							// when the mouse moves, call mouseMove() function					
	canvas.onmouseup = 		function(ev){myMouseUp(   ev, gl, canvas)};

	// END Mouse & Keyboard Event-Handlers-----------------------------------

  // Specify the color for clearing <canvas>
  gl.clearColor(0.71, 0.81, 0.88, 1.0);

	// NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel 
	// unless the new Z value is closer to the eye than the old one..
//	gl.depthFunc(gl.LESS);			 // WebGL default setting: (default)
	gl.enable(gl.DEPTH_TEST); 	 
	 
  // Get handle to graphics system's storage location of u_ModelMatrix
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  //var u_OrthMatrix = gl.getUniformLocation(gl.program, 'u_OrthMatrix');
  if (!u_ModelMatrix) { 
    console.log('Failed to get u_ModelMatrix or u_ProjMatrix or u_OrthMatrix');
    return;
  }
  // Create a local version of our model matrix in JavaScript 
  modelMatrix = new Matrix4();
  document.onkeydown= function(ev){keydown(ev, gl, u_ModelMatrix, modelMatrix); };

  //var orthMatrix = new Matrix4();
  // REPLACE this orthographic camera matrix:
  //orthMatrix.setOrtho(-1.0, 1.0, 					// left,right;
  	//									-1.0, 1.0, 					// bottom, top;
  	//									0.0, 2000.0);				// near, far; (always >=0)

	// with this perspective-camera matrix:
	// (SEE PerspectiveView.js, Chapter 7 of book)


  // YOU TRY IT: make an equivalent camera using matrix-cuon-mod.js
  // perspective-camera matrix made by 'frustum()' function..
  
	// Send this matrix to our Vertex and Fragment shaders through the
	// 'uniform' variable u_ProjMatrix:
  //gl.uniformMatrix4fv(u_OrthMatrix, false, orthMatrix.elements);
  
  // Create, init current rotation angle value in JavaScript
  drawResize();
  
//-----------------  
  // Start drawing: create 'tick' variable whose value is this function:
  var tick = function() {
    currentAngle = animate(currentAngle);  // Update the rotation angle
	   // Draw shapes
    // report current angle on console
    //console.log('currentAngle=',currentAngle);

    requestAnimationFrame(tick, canvas);   
    									// Request that the browser re-draw the webpage
	
	drawAll();
  };
  tick();							// start (and continue) animation: draw current image
  
}

function initVertexBuffer(gl) {
//==============================================================================
// Create one giant vertex buffer object (VBO) that holds all vertices for all
// shapes.
 
 	// Make each 3D shape in its own array of vertices:
  makeSphere();						// create, fill the sphVerts array
  makeStem();						// create, fill the torVerts array
  makePetal();
  makeHeart();
  makeWing();
  makeAxis();
  makeGroundGrid();				// create, fill the gndVerts array
  // how many floats total needed to store all shapes?
	var mySiz = (sphVerts.length + stemVerts.length + petalVerts.length 
				+ heartVerts.length + wingVerts.length + axisVerts.length 
				+ gndVerts.length);						

	// How many vertices total?
	var nn = mySiz / floatsPerVertex;
	console.log('nn is', nn, 'mySiz is', mySiz, 'floatsPerVertex is', floatsPerVertex);
	// Copy all shapes into one big Float32 array:
  var colorShapes = new Float32Array(mySiz);
	// Copy them:  remember where to start for each shape:
	sphStart = 0;							// we stored the cylinder first.
  for(i=0,j=0; j< sphVerts.length; i++,j++) {
  	colorShapes[i] = sphVerts[j];
		}
		stemStart = i;
	for(j=0; j< stemVerts.length; i++, j++) { // store petal
		colorShapes[i] = stemVerts[j];
		}
		petalStart = i;
	for(j=0; j< petalVerts.length; i++, j++) { // store petal
		colorShapes[i] = petalVerts[j];
		}
		heartStart = i;
	for(j=0; j< heartVerts.length; i++, j++) { // store heart ()
		colorShapes[i] = heartVerts[j];
		}
		wingStart = i;
	for(j=0; j< wingVerts.length; i++, j++) { // store heart ()
		colorShapes[i] = wingVerts[j];
		}
		axisStart = i;
	for(j=0; j< axisVerts.length; i++, j++) { // store heart ()
		colorShapes[i] = axisVerts[j];
		}
		gndStart = i;						// next we'll store the ground-plane;
	for(j=0; j< gndVerts.length; i++, j++) {
		colorShapes[i] = gndVerts[j];
		}
  // Create a buffer object on the graphics hardware:
  var shapeBufferHandle = gl.createBuffer();  
  if (!shapeBufferHandle) {
    console.log('Failed to create the shape buffer object');
    return false;
  }

  // Bind the the buffer object to target:
  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
  // Transfer data from Javascript array colorShapes to Graphics system VBO
  // (Use sparingly--may be slow if you transfer large shapes stored in files)
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);
    
  //Get graphics system's handle for our Vertex Shader's position-input variable: 
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }

  var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?

  // Use handle to specify how to retrieve **POSITION** data from our VBO:
  gl.vertexAttribPointer(
  		a_Position, 	// choose Vertex Shader attribute to fill with data
  		4, 						// how many values? 1,2,3 or 4.  (we're using x,y,z,w)
  		gl.FLOAT, 		// data type for each value: usually gl.FLOAT
  		false, 				// did we supply fixed-point data AND it needs normalizing?
  		FSIZE * floatsPerVertex, // Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  		0);						// Offset -- now many bytes from START of buffer to the
  									// value we will actually use?
  gl.enableVertexAttribArray(a_Position);  
  									// Enable assignment of vertex buffer object's position data

  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  // Use handle to specify how to retrieve **COLOR** data from our VBO:
  gl.vertexAttribPointer(
  	a_Color, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 7, 			// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  	FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w
  									
  gl.enableVertexAttribArray(a_Color);  
  									// Enable assignment of vertex buffer object's position data

	//--------------------------------DONE!
  // Unbind the buffer object 
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return nn;
}

function makeHeart() {
	heartVerts = new Float32Array([0.0,0.5714285714285714,0.5714285714285714,1.0,	0.0, 0.0, 1.0,
		0.0,0.0714285714285714,0.5714285714285714,1.0,	0.39, 0.58, 0.93,
		-0.5,0.3214285714285714,0.0,1.0,	0.098, 0.098, 0.44,
		-0.5,0.3214285714285714,0.0,1.0,	0.53, 0.81, 0.98,
		-1.0,0.5714285714285714,0.5714285714285714,1.0,	0.0, 0.0, 1.0,
		-0.5,0.5714285714285714,0.5714285714285714,1.0,	0.39, 0.58, 0.93,
		-0.5,0.3214285714285714,0.0,1.0,	0.098, 0.098, 0.44,
		-0.5,0.5714285714285714,0.5714285714285714,1.0,	0.53, 0.81, 0.98,
		0.0,0.5714285714285714,0.5714285714285714,1.0,	0.0, 0.0, 1.0,
		-0.5,0.3214285714285714,0.0,1.0,	0.39, 0.58, 0.93,
		-1.0,0.0714285714285714,0.5714285714285714,1.0,	0.098, 0.098, 0.44,
		-1.0,0.5714285714285714,0.5714285714285714,1.0,	0.53, 0.81, 0.98,
		-1.0,0.0714285714285714,0.5714285714285714,1.0,	0.0, 0.0, 1.0,
		-0.5,0.3214285714285714,0.0,1.0,	0.39, 0.58, 0.93,
		-0.5,0.0714285714285714,0.5714285714285714,1.0,	0.098, 0.098, 0.44,
		0.0,0.0714285714285714,0.5714285714285714,1.0,	0.53, 0.81, 0.98,
		-0.5,0.0714285714285714,0.5714285714285714,1.0,	0.0, 0.0, 1.0,
		-0.5,0.3214285714285714,0.0,1.0,	0.39, 0.58, 0.93,
		0.0,0.5714285714285714,0.5714285714285714,1.0,	0.098, 0.098, 0.44,
		-0.25,0.3214285714285714,1.0,1.0,	0.53, 0.81, 0.98,
		0.0,0.0714285714285714,0.5714285714285714,1.0,	0.0, 0.0, 1.0,
		-0.25,0.3214285714285714,1.0,1.0,	0.39, 0.58, 0.93,
		-0.5,0.0714285714285714,0.5714285714285714,1.0,	0.098, 0.098, 0.44,
		0.0,0.0714285714285714,0.5714285714285714,1.0,	0.53, 0.81, 0.98,
		-0.25,0.3214285714285714,1.0,1.0,	0.0, 0.0, 1.0,
		-0.5,0.5714285714285714,0.5714285714285714,1.0,	0.39, 0.58, 0.93,
		-0.5,0.0714285714285714,0.5714285714285714,1.0,	0.098, 0.098, 0.44,
		0.0,0.5714285714285714,0.5714285714285714,1.0,0.53, 0.81, 0.98,
		-0.5,0.5714285714285714,0.5714285714285714,1.0,	0.0, 0.0, 1.0,
		-0.25,0.3214285714285714,1.0,1.0,	0.39, 0.58, 0.93,
		-0.5,0.5714285714285714,0.5714285714285714,1.0,	0.098, 0.098, 0.44,
		-0.75,0.3214285714285714,1.0,1.0,	0.53, 0.81, 0.98,
		-0.5,0.0714285714285714,0.5714285714285714,1.0,	0.0, 0.0, 1.0,
		-0.5,0.5714285714285714,0.5714285714285714,1.0,	0.39, 0.58, 0.93,
		-1.0,0.5714285714285714,0.5714285714285714,1.0,	0.098, 0.098, 0.44,
		-0.75,0.3214285714285714,1.0,1.0,	0.53, 0.81, 0.98,
		-0.75,0.3214285714285714,1.0,1.0,	0.0, 0.0, 1.0,
		-1.0,0.0714285714285714,0.5714285714285714,1.0,	0.39, 0.58, 0.93,
		-0.5,0.0714285714285714,0.5714285714285714,1.0,	0.098, 0.098, 0.44,
		-0.75,0.3214285714285714,1.0,1.0,	0.53, 0.81, 0.98,
		-1.0,0.5714285714285714,0.5714285714285714,1.0,	0.0, 0.0, 1.0,
		-1.0,0.0714285714285714,0.5714285714285714,1.0,	0.39, 0.58, 0.93,]);
}

function makePetal() {
//==============================================================================
// Make a 4-cornered pyramid from one OpenGL TRIANGLE_STRIP primitive.
// All vertex coords are +/1 or zero; pyramid base is in xy plane.
  	petalVerts = new Float32Array([0.20, 0.00, 0.07, 1.00,	  1.0, 0.75, 0.79,	// Node 2
	  0.40, 0.50, 0.07, 1.00,	  0.55, 0, 0.54,	// Node 4
	  0.40, 0.50, 0.00, 1.00,	  0.25, 0.41, 0.88,   // Node 8
	 
	  0.20, 0.00, 0.07, 1.00,	  1.0, 0.75, 0.79,	// Node 2
	  0.20, 0.00, 0.00, 1.00,	  0.55, 0, 0.54,	// Node 6
	  0.40, 0.50, 0.00, 1.00,	  0.25, 0.41, 0.88,	// Node 8
 
		 // +y face
	  -0.20, 0.50, 0.07, 1.00,	  1.0, 0.75, 0.79,	// Node 3
	  -0.20, 0.50, 0.00, 1.00,	  0.55, 0, 0.54,	// Node 7
	  0.40, 0.50, 0.00, 1.00,	  0.25, 0.41, 0.88,	// Node 8
 
	  -0.20, 0.50, 0.07, 1.00,	  1.0, 0.75, 0.79,	// Node 3
	  0.40, 0.50, 0.07, 1.00,	  0.55, 0, 0.54,	// Node 4 
	  0.40, 0.50, 0.00, 1.00,	  0.25, 0.41, 0.88,	// Node 8
 
		 // +z face
	  0.00, 0.00, 0.07, 1.00,	  0.25, 0.41, 0.88,	// Node 1
	  -0.20, 0.50, 0.07, 1.00,     1.0, 0.75, 0.79,	// Node 3
	  0.40, 0.50, 0.07, 1.00,	  0.55, 0, 0.54,	// Node 4
 
	  0.00, 0.00, 0.07, 1.00,	  0.25, 0.41, 0.88,	// Node 1
	  0.20, 0.00, 0.07, 1.00,	  1.0, 0.75, 0.79,	// Node 2
	  0.40, 0.50, 0.07, 1.00,	  0.55, 0, 0.54,	// Node 4
 
		 // -x face
	  0.00, 0.00, 0.00, 1.00,	  1.0, 0.75, 0.79,	// Node 5	
	  -0.20, 0.50, 0.00, 1.00,	  0.55, 0, 0.54,	// Node 7 
	  -0.20, 0.50, 0.07, 1.00,	  1.0, 0.75, 0.79,	// Node 3
	 
	  0.00, 0.00, 0.00, 1.00,	  1.0, 0.75, 0.79,	// Node 5
	  0.00, 0.00, 0.07, 1.00,	  0.25, 0.41, 0.88,	// Node 1  
	  -0.20, 0.50, 0.07, 1.00,     1.0, 0.75, 0.79,	// Node 3  
	 
		 // -y face
	  0.00, 0.00, 0.07, 1.00,	  0.25, 0.41, 0.88,	// Node 1
	  0.00, 0.00, 0.00, 1.00,	  1.0, 0.75, 0.79,	// Node 5
	  0.20, 0.00, 0.00, 1.00,	  1.0, 0.41, 0.71,	// Node 6
 
	  0.00, 0.00, 0.07, 1.00,	  0.25, 0.41, 0.88,	// Node 1
	  0.20, 0.00, 0.07, 1.00,	  1.0, 0.75, 0.79,	// Node 2
	  0.20, 0.00, 0.00, 1.00,	  1.0, 0.41, 0.71,	// Node 6
 
	  // -z face
	  0.00, 0.00, 0.00, 1.00,	  1.0, 0.75, 0.79,	// Node 5
	  -0.20, 0.50, 0.00, 1.00,	 0.55, 0, 0.54,	// Node 7
	  0.40, 0.50, 0.00, 1.00,	  0.25, 0.41, 0.88,	// Node 8		
 
	  0.00, 0.00, 0.00, 1.00,	  1.0, 0.75, 0.79,	// Node 5
	  0.20, 0.00, 0.00, 1.00,      1.0, 0.41, 0.71,  	// Node 6
	  0.40, 0.50, 0.00, 1.00,	  0.25, 0.41, 0.88,	// Node 8
	]);
	
	
}

function makeStem() {
	stemVerts = new Float32Array([0.07, 0.00, 0.07, 1.00,	  0, 0.39, 0,	// Node 2
	0.07, 0.50, 0.07, 1.00,	  0.49, 0.99, 0.0,	// Node 4
	0.07, 0.50, 0.00, 1.00,	  0.42, 0.56, 0.14,   // Node 8
   
	0.07, 0.00, 0.07, 1.00,	  0, 0.39, 0,	// Node 2
	0.07, 0.00, 0.00, 1.00,	  0.49, 0.99, 0.0,	// Node 6
	0.07, 0.50, 0.00, 1.00,	  0.42, 0.56, 0.14,	// Node 8

	   // +y face
	0.00, 0.50, 0.07, 1.00,	  0, 0.39, 0,	// Node 3
	0.00, 0.50, 0.00, 1.00,	  0.49, 0.99, 0.0,	// Node 7
	0.07, 0.50, 0.00, 1.00,	  0.42, 0.56, 0.14,	// Node 8

	0.00, 0.50, 0.07, 1.00,	  0, 0.39, 0,	// Node 3
	0.07, 0.50, 0.07, 1.00,	  0.49, 0.99, 0.0,	// Node 4 
	0.07, 0.50, 0.00, 1.00,	  0.42, 0.56, 0.14,	// Node 8

	   // +z face
	0.00, 0.00, 0.07, 1.00,	  0.42, 0.56, 0.14,	// Node 1
	0.00, 0.50, 0.07, 1.00,      0, 0.39, 0,	// Node 3
	0.07, 0.50, 0.07, 1.00,	  0.49, 0.99, 0.0,	// Node 4

	0.00, 0.00, 0.07, 1.00,	  0.42, 0.56, 0.14,	// Node 1
	0.07, 0.00, 0.07, 1.00,	  0, 0.39, 0,	// Node 2
	0.07, 0.50, 0.07, 1.00,	  0.49, 0.99, 0.0,	// Node 4

	   // -x face
	0.00, 0.00, 0.00, 1.00,	  0, 0.39, 0,	// Node 5	
	0.00, 0.50, 0.00, 1.00,	  0.49, 0.99, 0.0,	// Node 7 
	0.00, 0.50, 0.07, 1.00,	  0, 0.39, 0,	// Node 3
   
	0.00, 0.00, 0.00, 1.00,	  0, 0.39, 0,	// Node 5
	0.00, 0.00, 0.07, 1.00,	  0.42, 0.56, 0.14,	// Node 1  
	0.00, 0.50, 0.07, 1.00,      0, 0.39, 0,	// Node 3  
   
	   // -y face
	0.00, 0.00, 0.07, 1.00,	  0.42, 0.56, 0.14,	// Node 1
	0.00, 0.00, 0.00, 1.00,	  0, 0.39, 0,	// Node 5
	0.07, 0.00, 0.00, 1.00,	  0.49, 0.99, 0.0,	// Node 6

	0.00, 0.00, 0.07, 1.00,	  0.42, 0.56, 0.14,	// Node 1
	0.07, 0.00, 0.07, 1.00,	  0, 0.39, 0,	// Node 2
	0.07, 0.00, 0.00, 1.00,	  0.49, 0.99, 0.0,	// Node 6

	// -z face
	0.00, 0.00, 0.00, 1.00,	  0, 0.39, 0,	// Node 5
	0.00, 0.50, 0.00, 1.00,	  0.49, 0.99, 0.0,	// Node 7
	0.07, 0.50, 0.00, 1.00,	  0.42, 0.56, 0.14,	// Node 8		

	0.00, 0.00, 0.00, 1.00,	  0, 0.39, 0,	// Node 5
	0.07, 0.00, 0.00, 1.00,      0.49, 0.99, 0.0,  	// Node 6
	0.07, 0.50, 0.00, 1.00,	  0.42, 0.56, 0.14,	// Node 8
	]);
}

function makeSphere() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
// and connect them as a 'stepped spiral' design (see makeCylinder) to build the
// sphere from one triangle strip.
  var slices = 13;		// # of slices of the sphere along the z axis. >=3 req'd
											// (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts	= 27;	// # of vertices around the top edge of the slice
											// (same number of vertices on bottom of slice, too)
  var topColr = new Float32Array([0.7, 0.7, 0.7]);	// North Pole: light gray
  var equColr = new Float32Array([0.3, 0.7, 0.3]);	// Equator:    bright green
  var botColr = new Float32Array([0.9, 0.9, 0.9]);	// South Pole: brightest gray.
  var sliceAngle = Math.PI/slices;	// lattitude angle spanned by one slice.

	// Create a (global) array to hold this sphere's vertices:
  sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 
										// each slice requires 2*sliceVerts vertices except 1st and
										// last ones, which require only 2*sliceVerts-1.
										
	// Create dome-shaped top slice of sphere at z=+1
	// s counts slices; v counts vertices; 
	// j counts array elements (vertices * elements per vertex)
	var cos0 = 0.0;					// sines,cosines of slice's top, bottom edge.
	var sin0 = 0.0;
	var cos1 = 0.0;
	var sin1 = 0.0;	
	var j = 0;							// initialize our array index
	var isLast = 0;
	var isFirst = 1;
	for(s=0; s<slices; s++) {	// for each slice of the sphere,
		// find sines & cosines for top and bottom of this slice
		if(s==0) {
			isFirst = 1;	// skip 1st vertex of 1st slice.
			cos0 = 1.0; 	// initialize: start at north pole.
			sin0 = 0.0;
		}
		else {					// otherwise, new top edge == old bottom edge
			isFirst = 0;	
			cos0 = cos1;
			sin0 = sin1;
		}								// & compute sine,cosine for new bottom edge.
		cos1 = Math.cos((s+1)*sliceAngle);
		sin1 = Math.sin((s+1)*sliceAngle);
		// go around the entire slice, generating TRIANGLE_STRIP verts
		// (Note we don't initialize j; grows with each new attrib,vertex, and slice)
		if(s==slices-1) isLast=1;	// skip last vertex of last slice.
		for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) {	
			if(v%2==0)
			{				// put even# vertices at the the slice's top edge
							// (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
							// and thus we can simplify cos(2*PI(v/2*sliceVerts))  
				sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts); 	
				sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);	
				sphVerts[j+2] = cos0;		
				sphVerts[j+3] = 1.0;			
			}
			else { 	// put odd# vertices around the slice's lower edge;
							// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
							// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
				sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
				sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
				sphVerts[j+2] = cos1;																				// z
				sphVerts[j+3] = 1.0;																				// w.		
			}
			if(s==0) {	// finally, set some interesting colors for vertices:
				sphVerts[j+4]=topColr[0]; 
				sphVerts[j+5]=topColr[1]; 
				sphVerts[j+6]=topColr[2];	
				}
			else if(s==slices-1) {
				sphVerts[j+4]=botColr[0]; 
				sphVerts[j+5]=botColr[1]; 
				sphVerts[j+6]=botColr[2];	
			}
			else {
					sphVerts[j+4]=Math.random();// equColr[0]; 
					sphVerts[j+5]=Math.random();// equColr[1]; 
					sphVerts[j+6]=Math.random();// equColr[2];					
			}
		}
	}
}

function makeWing() {

	wingVerts = new Float32Array([
	0.1971370370370369,-0.9259259259259259,0.14766666666666683,1.0,		0.0, 0.75, 1.0,
-0.33333333333333337,-0.9259259259259259,0.33333333333333326,1.0,		0.55, 0, 0,
0.12581481481481482,-0.9259259259259259,0.32018518518518513,1.0,		0.86, 0.44, 0.58,
0.11116296296296291,-1.0,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.11111111111111116,-1.0,0.33333333333333326,1.0,		0.55, 0, 0,
0.12581481481481482,-1.0,0.32018518518518513,1.0,		0.86, 0.44, 0.58,
0.12616296296296303,-1.0,0.3202074074074075,1.0,		0.0, 0.75, 1.0,
0.11116296296296291,-1.0,0.33333333333333326,1.0,		0.55, 0, 0,
0.12581481481481482,-1.0,0.32018518518518513,1.0,		0.86, 0.44, 0.58,
-0.33333333333333337,-1.0,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
-0.4814814814814815,-1.0,0.462962962962963,1.0,		0.55, 0, 0,
-0.4814814814814815,-0.9259259259259259,0.462962962962963,1.0,		0.86, 0.44, 0.58,
-0.33333333333333337,-1.0,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
-0.4814814814814815,-0.9259259259259259,0.462962962962963,1.0,		0.55, 0, 0,
-0.33333333333333337,-0.9259259259259259,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-1.0,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.2592592592592593,-1.0,0.462962962962963,1.0,		0.55, 0, 0,
0.11111111111111116,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-0.9259259259259259,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.11111111111111116,-1.0,0.33333333333333326,1.0,		0.55, 0, 0,
0.11116296296296291,-1.0,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-0.9259259259259259,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.11116296296296291,-1.0,0.33333333333333326,1.0,		0.55, 0, 0,
0.11116296296296291,-0.9259259259259259,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-1.0,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
-0.33333333333333337,-1.0,0.33333333333333326,1.0,		0.55, 0, 0,
0.12581481481481482,-1.0,0.32018518518518513,1.0,		0.86, 0.44, 0.58,
0.1971370370370369,-1.0,0.14766666666666683,1.0,		0.0, 0.75, 1.0,
0.12581481481481482,-1.0,0.32018518518518513,1.0,		0.55, 0, 0,
-0.33333333333333337,-1.0,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-0.9259259259259259,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.12581481481481482,-0.9259259259259259,0.32018518518518513,1.0,		0.55, 0, 0,
-0.33333333333333337,-0.9259259259259259,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
-0.33333333333333337,-0.9259259259259259,0.5925925925925926,1.0,		0.0, 0.75, 1.0,
0.11109259259259274,-0.9259259259259259,0.5925925925925926,1.0,		0.55, 0, 0,
-0.33333333333333337,-0.9259259259259259,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-0.9259259259259259,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
-0.33333333333333337,-0.9259259259259259,0.33333333333333326,1.0,		0.55, 0, 0,
0.11109259259259274,-0.9259259259259259,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-0.9259259259259259,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.11109259259259274,-0.9259259259259259,0.5925925925925926,1.0,		0.55, 0, 0,
0.11111111111111116,-0.9259259259259259,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.12616296296296303,-1.0,0.3202074074074075,1.0,		0.0, 0.75, 1.0,
0.12616296296296303,-0.9259259259259259,0.3202074074074075,1.0,		0.55, 0, 0,
0.11116296296296291,-0.9259259259259259,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.12616296296296303,-1.0,0.3202074074074075,1.0,		0.0, 0.75, 1.0,
0.11116296296296291,-0.9259259259259259,0.33333333333333326,1.0,		0.55, 0, 0,
0.11116296296296291,-1.0,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.11109259259259274,-0.9259259259259259,0.5925925925925926,1.0,		0.0, 0.75, 1.0,
-0.33333333333333337,-0.9259259259259259,0.5925925925925926,1.0,		0.55, 0, 0,
0.40740740740740744,-0.9259259259259259,0.9999592592592592,1.0,		0.86, 0.44, 0.58,
0.40740740740740744,-0.9259259259259259,1.0,1.0,		0.0, 0.75, 1.0,
0.40740740740740744,-0.9259259259259259,0.9999592592592592,1.0,		0.55, 0, 0,
-0.33333333333333337,-0.9259259259259259,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
-0.33333333333333337,-0.9259259259259259,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
-0.4814814814814815,-0.9259259259259259,0.462962962962963,1.0,		0.55, 0, 0,
-0.33333333333333337,-0.9259259259259259,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.12581481481481482,-0.9259259259259259,0.32018518518518513,1.0,		0.0, 0.75, 1.0,
0.12581481481481482,-1.0,0.32018518518518513,1.0,		0.55, 0, 0,
0.1971370370370369,-1.0,0.14766666666666683,1.0,		0.86, 0.44, 0.58,
0.12581481481481482,-0.9259259259259259,0.32018518518518513,1.0,		0.0, 0.75, 1.0,
0.1971370370370369,-1.0,0.14766666666666683,1.0,		0.55, 0, 0,
0.1971370370370369,-0.9259259259259259,0.14766666666666683,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-1.0,0.5925925925925926,1.0,		0.0, 0.75, 1.0,
0.11109259259259274,-1.0,0.5925925925925926,1.0,		0.55, 0, 0,
0.11111111111111116,-1.0,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
-0.33333333333333337,-1.0,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.11111111111111116,-1.0,0.33333333333333326,1.0,		0.55, 0, 0,
0.11109259259259274,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
-0.33333333333333337,-1.0,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.11109259259259274,-1.0,0.5925925925925926,1.0,		0.55, 0, 0,
-0.33333333333333337,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.40740740740740744,-1.0,1.0,1.0,		0.0, 0.75, 1.0,
-0.33333333333333337,-1.0,0.5925925925925926,1.0,		0.55, 0, 0,
0.40740740740740744,-1.0,0.9999592592592592,1.0,		0.86, 0.44, 0.58,
0.11109259259259274,-1.0,0.5925925925925926,1.0,		0.0, 0.75, 1.0,
0.40740740740740744,-1.0,0.9999592592592592,1.0,		0.55, 0, 0,
-0.33333333333333337,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
-0.4814814814814815,-1.0,0.462962962962963,1.0,		0.0, 0.75, 1.0,
-0.33333333333333337,-1.0,0.33333333333333326,1.0,		0.55, 0, 0,
-0.33333333333333337,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.2592592592592593,-1.0,0.462962962962963,1.0,		0.0, 0.75, 1.0,
0.2592592592592593,-0.9259259259259259,0.462962962962963,1.0,		0.55, 0, 0,
0.11111111111111116,-0.9259259259259259,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.2592592592592593,-1.0,0.462962962962963,1.0,		0.0, 0.75, 1.0,
0.11111111111111116,-0.9259259259259259,0.5925925925925926,1.0,		0.55, 0, 0,
0.11111111111111116,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.40740740740740744,-1.0,1.0,1.0,		0.0, 0.75, 1.0,
0.40740740740740744,-0.9259259259259259,1.0,1.0,		0.55, 0, 0,
-0.33333333333333337,-0.9259259259259259,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.40740740740740744,-1.0,1.0,1.0,		0.0, 0.75, 1.0,
-0.33333333333333337,-0.9259259259259259,0.5925925925925926,1.0,		0.55, 0, 0,
-0.33333333333333337,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.40740740740740744,-1.0,1.0,1.0,		0.0, 0.75, 1.0,
0.40740740740740744,-1.0,0.9999592592592592,1.0,		0.55, 0, 0,
0.40740740740740744,-0.9259259259259259,0.9999592592592592,1.0,		0.86, 0.44, 0.58,
0.40740740740740744,-1.0,1.0,1.0,		0.0, 0.75, 1.0,
0.40740740740740744,-0.9259259259259259,0.9999592592592592,1.0,		0.55, 0, 0,
0.40740740740740744,-0.9259259259259259,1.0,1.0,		0.86, 0.44, 0.58,
0.11116296296296291,-0.9259259259259259,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.12616296296296303,-0.9259259259259259,0.3202074074074075,1.0,		0.55, 0, 0,
0.12581481481481482,-0.9259259259259259,0.32018518518518513,1.0,		0.86, 0.44, 0.58,
0.11116296296296291,-0.9259259259259259,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.12581481481481482,-0.9259259259259259,0.32018518518518513,1.0,		0.55, 0, 0,
0.11111111111111116,-0.9259259259259259,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.40740740740740744,-1.0,0.9999592592592592,1.0,		0.0, 0.75, 1.0,
0.11109259259259274,-1.0,0.5925925925925926,1.0,		0.55, 0, 0,
0.11109259259259274,-0.9259259259259259,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.40740740740740744,-1.0,0.9999592592592592,1.0,		0.0, 0.75, 1.0,
0.11109259259259274,-0.9259259259259259,0.5925925925925926,1.0,		0.55, 0, 0,
0.40740740740740744,-0.9259259259259259,0.9999592592592592,1.0,		0.86, 0.44, 0.58,
0.2592592592592593,-0.9259259259259259,0.462962962962963,1.0,		0.0, 0.75, 1.0,
0.11111111111111116,-0.9259259259259259,0.33333333333333326,1.0,		0.55, 0, 0,
0.11111111111111116,-0.9259259259259259,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
-0.4814814814814815,-0.9259259259259259,0.462962962962963,1.0,		0.0, 0.75, 1.0,
-0.4814814814814815,-1.0,0.462962962962963,1.0,		0.55, 0, 0,
-0.33333333333333337,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
-0.4814814814814815,-0.9259259259259259,0.462962962962963,1.0,		0.0, 0.75, 1.0,
-0.33333333333333337,-1.0,0.5925925925925926,1.0,		0.55, 0, 0,
-0.33333333333333337,-0.9259259259259259,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.12581481481481482,-1.0,0.32018518518518513,1.0,		0.0, 0.75, 1.0,
0.12581481481481482,-0.9259259259259259,0.32018518518518513,1.0,		0.55, 0, 0,
0.12616296296296303,-0.9259259259259259,0.3202074074074075,1.0,		0.86, 0.44, 0.58,
0.12581481481481482,-1.0,0.32018518518518513,1.0,		0.0, 0.75, 1.0,
0.12616296296296303,-0.9259259259259259,0.3202074074074075,1.0,		0.55, 0, 0,
0.12616296296296303,-1.0,0.3202074074074075,1.0,		0.86, 0.44, 0.58,
0.2592592592592593,-1.0,0.462962962962963,1.0,		0.0, 0.75, 1.0,
0.11111111111111116,-1.0,0.33333333333333326,1.0,		0.55, 0, 0,
0.11111111111111116,-0.9259259259259259,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.2592592592592593,-1.0,0.462962962962963,1.0,		0.0, 0.75, 1.0,
0.11111111111111116,-0.9259259259259259,0.33333333333333326,1.0,		0.55, 0, 0,
0.2592592592592593,-0.9259259259259259,0.462962962962963,1.0,		0.86, 0.44, 0.58,
-0.33333333333333337,-1.0,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
-0.33333333333333337,-0.9259259259259259,0.33333333333333326,1.0,		0.55, 0, 0,
0.1971370370370369,-1.0,0.14766666666666683,1.0,		0.86, 0.44, 0.58,
0.1971370370370369,-0.9259259259259259,0.14766666666666683,1.0,		0.0, 0.75, 1.0,
0.1971370370370369,-1.0,0.14766666666666683,1.0,		0.55, 0, 0,
-0.33333333333333337,-0.9259259259259259,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-0.9259259259259259,0.5925925925925926,1.0,		0.0, 0.75, 1.0,
0.11109259259259274,-0.9259259259259259,0.5925925925925926,1.0,		0.55, 0, 0,
0.11109259259259274,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-0.9259259259259259,0.5925925925925926,1.0,		0.0, 0.75, 1.0,
0.11109259259259274,-1.0,0.5925925925925926,1.0,		0.55, 0, 0,
0.11111111111111116,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,0.1971370370370369,-0.9259259259259259,0.14766666666666683,1.0,		0.0, 0.75, 1.0,
-0.33333333333333337,-0.9259259259259259,0.33333333333333326,1.0,		0.55, 0, 0,
0.12581481481481482,-0.9259259259259259,0.32018518518518513,1.0,		0.86, 0.44, 0.58,
0.11116296296296291,-1.0,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.11111111111111116,-1.0,0.33333333333333326,1.0,		0.55, 0, 0,
0.12581481481481482,-1.0,0.32018518518518513,1.0,		0.86, 0.44, 0.58,
0.12616296296296303,-1.0,0.3202074074074075,1.0,		0.0, 0.75, 1.0,
0.11116296296296291,-1.0,0.33333333333333326,1.0,		0.55, 0, 0,
0.12581481481481482,-1.0,0.32018518518518513,1.0,		0.86, 0.44, 0.58,
-0.33333333333333337,-1.0,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
-0.4814814814814815,-1.0,0.462962962962963,1.0,		0.55, 0, 0,
-0.4814814814814815,-0.9259259259259259,0.462962962962963,1.0,		0.86, 0.44, 0.58,
-0.33333333333333337,-1.0,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
-0.4814814814814815,-0.9259259259259259,0.462962962962963,1.0,		0.55, 0, 0,
-0.33333333333333337,-0.9259259259259259,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-1.0,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.2592592592592593,-1.0,0.462962962962963,1.0,		0.55, 0, 0,
0.11111111111111116,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-0.9259259259259259,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.11111111111111116,-1.0,0.33333333333333326,1.0,		0.55, 0, 0,
0.11116296296296291,-1.0,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-0.9259259259259259,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.11116296296296291,-1.0,0.33333333333333326,1.0,		0.55, 0, 0,
0.11116296296296291,-0.9259259259259259,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-1.0,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
-0.33333333333333337,-1.0,0.33333333333333326,1.0,		0.55, 0, 0,
0.12581481481481482,-1.0,0.32018518518518513,1.0,		0.86, 0.44, 0.58,
0.1971370370370369,-1.0,0.14766666666666683,1.0,		0.0, 0.75, 1.0,
0.12581481481481482,-1.0,0.32018518518518513,1.0,		0.55, 0, 0,
-0.33333333333333337,-1.0,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-0.9259259259259259,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.12581481481481482,-0.9259259259259259,0.32018518518518513,1.0,		0.55, 0, 0,
-0.33333333333333337,-0.9259259259259259,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
-0.33333333333333337,-0.9259259259259259,0.5925925925925926,1.0,		0.0, 0.75, 1.0,
0.11109259259259274,-0.9259259259259259,0.5925925925925926,1.0,		0.55, 0, 0,
-0.33333333333333337,-0.9259259259259259,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-0.9259259259259259,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
-0.33333333333333337,-0.9259259259259259,0.33333333333333326,1.0,		0.55, 0, 0,
0.11109259259259274,-0.9259259259259259,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-0.9259259259259259,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.11109259259259274,-0.9259259259259259,0.5925925925925926,1.0,		0.55, 0, 0,
0.11111111111111116,-0.9259259259259259,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.12616296296296303,-1.0,0.3202074074074075,1.0,		0.0, 0.75, 1.0,
0.12616296296296303,-0.9259259259259259,0.3202074074074075,1.0,		0.55, 0, 0,
0.11116296296296291,-0.9259259259259259,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.12616296296296303,-1.0,0.3202074074074075,1.0,		0.0, 0.75, 1.0,
0.11116296296296291,-0.9259259259259259,0.33333333333333326,1.0,		0.55, 0, 0,
0.11116296296296291,-1.0,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.11109259259259274,-0.9259259259259259,0.5925925925925926,1.0,		0.0, 0.75, 1.0,
-0.33333333333333337,-0.9259259259259259,0.5925925925925926,1.0,		0.55, 0, 0,
0.40740740740740744,-0.9259259259259259,0.9999592592592592,1.0,		0.86, 0.44, 0.58,
0.40740740740740744,-0.9259259259259259,1.0,1.0,		0.0, 0.75, 1.0,
0.40740740740740744,-0.9259259259259259,0.9999592592592592,1.0,		0.55, 0, 0,
-0.33333333333333337,-0.9259259259259259,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
-0.33333333333333337,-0.9259259259259259,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
-0.4814814814814815,-0.9259259259259259,0.462962962962963,1.0,		0.55, 0, 0,
-0.33333333333333337,-0.9259259259259259,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.12581481481481482,-0.9259259259259259,0.32018518518518513,1.0,		0.0, 0.75, 1.0,
0.12581481481481482,-1.0,0.32018518518518513,1.0,		0.55, 0, 0,
0.1971370370370369,-1.0,0.14766666666666683,1.0,		0.86, 0.44, 0.58,
0.12581481481481482,-0.9259259259259259,0.32018518518518513,1.0,		0.0, 0.75, 1.0,
0.1971370370370369,-1.0,0.14766666666666683,1.0,		0.55, 0, 0,
0.1971370370370369,-0.9259259259259259,0.14766666666666683,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-1.0,0.5925925925925926,1.0,		0.0, 0.75, 1.0,
0.11109259259259274,-1.0,0.5925925925925926,1.0,		0.55, 0, 0,
0.11111111111111116,-1.0,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
-0.33333333333333337,-1.0,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.11111111111111116,-1.0,0.33333333333333326,1.0,		0.55, 0, 0,
0.11109259259259274,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
-0.33333333333333337,-1.0,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.11109259259259274,-1.0,0.5925925925925926,1.0,		0.55, 0, 0,
-0.33333333333333337,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.40740740740740744,-1.0,1.0,1.0,		0.0, 0.75, 1.0,
-0.33333333333333337,-1.0,0.5925925925925926,1.0,		0.55, 0, 0,
0.40740740740740744,-1.0,0.9999592592592592,1.0,		0.86, 0.44, 0.58,
0.11109259259259274,-1.0,0.5925925925925926,1.0,		0.0, 0.75, 1.0,
0.40740740740740744,-1.0,0.9999592592592592,1.0,		0.55, 0, 0,
-0.33333333333333337,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
-0.4814814814814815,-1.0,0.462962962962963,1.0,		0.0, 0.75, 1.0,
-0.33333333333333337,-1.0,0.33333333333333326,1.0,		0.55, 0, 0,
-0.33333333333333337,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.2592592592592593,-1.0,0.462962962962963,1.0,		0.0, 0.75, 1.0,
0.2592592592592593,-0.9259259259259259,0.462962962962963,1.0,		0.55, 0, 0,
0.11111111111111116,-0.9259259259259259,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.2592592592592593,-1.0,0.462962962962963,1.0,		0.0, 0.75, 1.0,
0.11111111111111116,-0.9259259259259259,0.5925925925925926,1.0,		0.55, 0, 0,
0.11111111111111116,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.40740740740740744,-1.0,1.0,1.0,		0.0, 0.75, 1.0,
0.40740740740740744,-0.9259259259259259,1.0,1.0,		0.55, 0, 0,
-0.33333333333333337,-0.9259259259259259,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.40740740740740744,-1.0,1.0,1.0,		0.0, 0.75, 1.0,
-0.33333333333333337,-0.9259259259259259,0.5925925925925926,1.0,		0.55, 0, 0,
-0.33333333333333337,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.40740740740740744,-1.0,1.0,1.0,		0.0, 0.75, 1.0,
0.40740740740740744,-1.0,0.9999592592592592,1.0,		0.55, 0, 0,
0.40740740740740744,-0.9259259259259259,0.9999592592592592,1.0,		0.86, 0.44, 0.58,
0.40740740740740744,-1.0,1.0,1.0,		0.0, 0.75, 1.0,
0.40740740740740744,-0.9259259259259259,0.9999592592592592,1.0,		0.55, 0, 0,
0.40740740740740744,-0.9259259259259259,1.0,1.0,		0.86, 0.44, 0.58,
0.11116296296296291,-0.9259259259259259,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.12616296296296303,-0.9259259259259259,0.3202074074074075,1.0,		0.55, 0, 0,
0.12581481481481482,-0.9259259259259259,0.32018518518518513,1.0,		0.86, 0.44, 0.58,
0.11116296296296291,-0.9259259259259259,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
0.12581481481481482,-0.9259259259259259,0.32018518518518513,1.0,		0.55, 0, 0,
0.11111111111111116,-0.9259259259259259,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.40740740740740744,-1.0,0.9999592592592592,1.0,		0.0, 0.75, 1.0,
0.11109259259259274,-1.0,0.5925925925925926,1.0,		0.55, 0, 0,
0.11109259259259274,-0.9259259259259259,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.40740740740740744,-1.0,0.9999592592592592,1.0,		0.0, 0.75, 1.0,
0.11109259259259274,-0.9259259259259259,0.5925925925925926,1.0,		0.55, 0, 0,
0.40740740740740744,-0.9259259259259259,0.9999592592592592,1.0,		0.86, 0.44, 0.58,
0.2592592592592593,-0.9259259259259259,0.462962962962963,1.0,		0.0, 0.75, 1.0,
0.11111111111111116,-0.9259259259259259,0.33333333333333326,1.0,		0.55, 0, 0,
0.11111111111111116,-0.9259259259259259,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
-0.4814814814814815,-0.9259259259259259,0.462962962962963,1.0,		0.0, 0.75, 1.0,
-0.4814814814814815,-1.0,0.462962962962963,1.0,		0.55, 0, 0,
-0.33333333333333337,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
-0.4814814814814815,-0.9259259259259259,0.462962962962963,1.0,		0.0, 0.75, 1.0,
-0.33333333333333337,-1.0,0.5925925925925926,1.0,		0.55, 0, 0,
-0.33333333333333337,-0.9259259259259259,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.12581481481481482,-1.0,0.32018518518518513,1.0,		0.0, 0.75, 1.0,
0.12581481481481482,-0.9259259259259259,0.32018518518518513,1.0,		0.55, 0, 0,
0.12616296296296303,-0.9259259259259259,0.3202074074074075,1.0,		0.86, 0.44, 0.58,
0.12581481481481482,-1.0,0.32018518518518513,1.0,		0.0, 0.75, 1.0,
0.12616296296296303,-0.9259259259259259,0.3202074074074075,1.0,		0.55, 0, 0,
0.12616296296296303,-1.0,0.3202074074074075,1.0,		0.86, 0.44, 0.58,
0.2592592592592593,-1.0,0.462962962962963,1.0,		0.0, 0.75, 1.0,
0.11111111111111116,-1.0,0.33333333333333326,1.0,		0.55, 0, 0,
0.11111111111111116,-0.9259259259259259,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.2592592592592593,-1.0,0.462962962962963,1.0,		0.0, 0.75, 1.0,
0.11111111111111116,-0.9259259259259259,0.33333333333333326,1.0,		0.55, 0, 0,
0.2592592592592593,-0.9259259259259259,0.462962962962963,1.0,		0.86, 0.44, 0.58,
-0.33333333333333337,-1.0,0.33333333333333326,1.0,		0.0, 0.75, 1.0,
-0.33333333333333337,-0.9259259259259259,0.33333333333333326,1.0,		0.55, 0, 0,
0.1971370370370369,-1.0,0.14766666666666683,1.0,		0.86, 0.44, 0.58,
0.1971370370370369,-0.9259259259259259,0.14766666666666683,1.0,		0.0, 0.75, 1.0,
0.1971370370370369,-1.0,0.14766666666666683,1.0,		0.55, 0, 0,
-0.33333333333333337,-0.9259259259259259,0.33333333333333326,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-0.9259259259259259,0.5925925925925926,1.0,		0.0, 0.75, 1.0,
0.11109259259259274,-0.9259259259259259,0.5925925925925926,1.0,		0.55, 0, 0,
0.11109259259259274,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,
0.11111111111111116,-0.9259259259259259,0.5925925925925926,1.0,		0.0, 0.75, 1.0,
0.11109259259259274,-1.0,0.5925925925925926,1.0,		0.55, 0, 0,
0.11111111111111116,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,]);
}

function makeAxis() {
	axisVerts = new Float32Array([
	0.0,  0.0,  0.0, 1.0,		0.3,  0.3,  0.3,	// X axis line (origin: gray)
	1.3,  0.0,  0.0, 1.0,		1.0,  0.3,  0.3,	// 						 (endpoint: red)
	
	0.0,  0.0,  0.0, 1.0,    0.3,  0.3,  0.3,	// Y axis line (origin: white)
	0.0,  1.3,  0.0, 1.0,		0.3,  1.0,  0.3,	//						 (endpoint: green)

	0.0,  0.0,  0.0, 1.0,		0.3,  0.3,  0.3,	// Z axis line (origin:white) (endpoint: blue)
	0.0,  0.0,  1.3, 1.0,		0.3,  0.3,  1.0,]);
}

function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

	var xcount = 100;			// # of lines to draw in x,y to make the grid.
	var ycount = 100;		
	var xymax	= 50.0;			// grid size; extends to cover +/-xymax in x and y.
 	var xColr = new Float32Array([1.0, 1.0, 0.3]);	// bright yellow
 	var yColr = new Float32Array([0.5, 1.0, 0.5]);	// bright green.
 	
	// Create an (global) array to hold this ground-plane's vertices:
	gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
						// draw a grid made of xcount+ycount lines; 2 vertices per line.
						
	var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
	var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
	
	// First, step thru x values as we make vertical lines of constant-x:
	for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
		if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
			gndVerts[j  ] = -xymax + (v  )*xgap;	// x
			gndVerts[j+1] = -xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {				// put odd-numbered vertices at (xnow, +xymax, 0).
			gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
			gndVerts[j+1] = xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = xColr[0];			// red
		gndVerts[j+5] = xColr[1];			// grn
		gndVerts[j+6] = xColr[2];			// blu
	}
	// Second, step thru y values as wqe make horizontal lines of constant-y:
	// (don't re-initialize j--we're adding more vertices to the array)
	for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
		if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
			gndVerts[j  ] = -xymax;								// x
			gndVerts[j+1] = -xymax + (v  )*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {					// put odd-numbered vertices at (+xymax, ynow, 0).
			gndVerts[j  ] = xymax;								// x
			gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = yColr[0];			// red
		gndVerts[j+5] = yColr[1];			// grn
		gndVerts[j+6] = yColr[2];			// blu
	}
}

var g_EyeX = 3.0, g_EyeY = 3.0, g_EyeZ = 1.25; 
var aim_theta = -2.4;
var change_tilt = -0.3;
var aimx, aimy, aimz;


function drawAll() {
//==============================================================================
  // Clear <canvas>  colors AND the depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  modelMatrix.setIdentity();    // DEFINE 'world-space' coords.


  // Draw in the FIRST of several 'viewports'
  //------------------------------------------



gl.viewport(0,  														// Viewport lower-left corner
  			0,															// (x,y) location(in pixels)
  			canvas.width/2, 				// viewport width, height.
  			canvas.height);

var vpAspect = (canvas.width/2) /					  // On-screen aspect ratio for
			  canvas.height;	// this camera: width/height.
 	// this camera: width/height.				
  
// STEP 2: add in a 'perspective()' function call here to define 'camera lens':
  modelMatrix.setPerspective(	35.0,   // FOVY: top-to-bottom vertical image angle, in degrees
                            vpAspect,   // Image Aspect Ratio: camera lens width/height
                           	1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
                        	300.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)
// Set the matrix to be used for to set the camera view
aimx = g_EyeX + Math.cos(aim_theta);
aimy = g_EyeY + Math.sin(aim_theta);
aimz = g_EyeZ + change_tilt;

modelMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ, 	// eye position
					aimx, aimy, (g_EyeZ + change_tilt),  								// look-at point (origin)
					  0, 0, 1);								// up vector (+y)

  //===========================================================
  //
  drawScene();
  //===========================================================

  gl.viewport(canvas.width/2,  														// Viewport lower-left corner
  0,															// (x,y) location(in pixels)
  canvas.width/2, 				// viewport width, height.
  canvas.height);

  h = Math.tan(35/2 * Math.PI/180);
  w = h * vpAspect;
  left = -w / 2;
  right = w / 2;
  bot = -h / 2;
  t = -bot;

  modelMatrix.setOrtho((left*100/1 - left)/3, (right*100/1 - right)/3,					//left,right;
  						(bot*100/1 - bot)/3, (t*100/1 - t)/3,					// bottom, top;
							1.0, 100.0);				// near, far; (always >=0)

  //modelMatrix.setOrtho(-6.0, 6.0,					//left,right;
//						-6.0,6.0, 					// bottom, top;
  //						1.0, 300.0);				// near, far; (always >=0)
  modelMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ, 	// eye position
  		aimx, aimy, (g_EyeZ + change_tilt), 								// look//-at point (origin)
					  0, 0, 1);	

  drawScene();
}

function drawScene() {
	
  //===========================================================
  //
  pushMatrix(modelMatrix);
	modelMatrix.translate(0.3, -1.4, 0.0);
	modelMatrix.rotate(90, 1, 0, 0);
	modelMatrix.rotate(-currentAngle, 0, 1, 0);
	modelMatrix.scale(1.1, 1.1, 1.1);
	
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLES,
							  stemStart/floatsPerVertex,
							  stemVerts.length/floatsPerVertex);
		modelMatrix.rotate(-90, 1, 0, 0);
		pushMatrix(modelMatrix);
			modelMatrix.translate(0.27, -0.19, 0.5);
			modelMatrix.scale(0.5, 0.5, 0.5);
			drawHeart();
		modelMatrix = popMatrix();
		// DRAW FIRST PETAL
		
		pushMatrix(modelMatrix);
			modelMatrix.translate(0.01, 0, 0.5);
			modelMatrix.scale(0.3, 0.3, 0.3);
			modelMatrix.rotate(-g_angle1now, 1, 0, 0);
			drawLowerPetal();
			// DRAW SECOND LAYER OF PETAL
				drawUpperPetal(-1);
				// DRAW THIRD LAYER OF PETAL
					drawSmallestPetal(-1);
		modelMatrix = popMatrix();
		// DRAW SECOND PETAL
		pushMatrix(modelMatrix);
			modelMatrix.rotate(180, 1, 0, 0);
			modelMatrix.translate(0.0, 0.07, -0.52);
			modelMatrix.scale(0.3, 0.3, 0.3);
			modelMatrix.rotate(g_angle1now, 1, 0, 0)
			drawLowerPetal();
			// DRAW SECOND LAYER OF PETAL
			drawUpperPetal(1);
				// DRAW THIRD LAYER OF PETAL
					drawSmallestPetal(1);
		modelMatrix = popMatrix();
		// DRAW THIRD PETAL
		pushMatrix(modelMatrix);
			modelMatrix.rotate(-90, 0, 0, 1);
			modelMatrix.translate(0.01, 0.065, 0.5);
			modelMatrix.scale(0.3, 0.3, 0.3);
			modelMatrix.rotate(-g_angle1now, 1, 0, 0)
			drawLowerPetal();
			// DRAW SECOND LAYER OF PETAL
			drawUpperPetal(-1);
				// DRAW THIRD LAYER OF PETAL
					drawSmallestPetal(-1);
		modelMatrix = popMatrix();
		// DRAW FOURTH PETAL
		pushMatrix(modelMatrix);
			modelMatrix.rotate(90, 0, 0, 1);
			modelMatrix.translate(-0.06, -0.005, 0.5);
			modelMatrix.scale(0.3, 0.3, 0.3);
			modelMatrix.rotate(-g_angle1now, 1, 0, 0)	
			drawLowerPetal();
			// DRAW SECOND LAYER OF PETAL
				drawUpperPetal(-1);
				// DRAW THIRD LAYER OF PETAL
					drawSmallestPetal(-1);
		modelMatrix = popMatrix();
  modelMatrix = popMatrix();
  
  //===========================================================
  //  
  pushMatrix(modelMatrix);
	modelMatrix.translate(0.3, 2.4, 0.0);
	modelMatrix.rotate(90, 1, 0, 0);
	modelMatrix.rotate(-currentAngle, 0, 1, 0);
	modelMatrix.scale(1.1, 1.1, 1.1);
	
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLES,
							  stemStart/floatsPerVertex,
							  stemVerts.length/floatsPerVertex);
		modelMatrix.rotate(-90, 1, 0, 0);
		pushMatrix(modelMatrix);
			modelMatrix.translate(0.27, -0.19, 0.5);
			modelMatrix.scale(0.5, 0.5, 0.5);
			drawHeart(gl, u_ModelMatrix, modelMatrix);
		modelMatrix = popMatrix();
		// DRAW FIRST PETAL
		
		pushMatrix(modelMatrix);
			modelMatrix.translate(0.01, 0, 0.5);
			modelMatrix.scale(0.3, 0.3, 0.3);
			modelMatrix.rotate(-g_angle1now, 1, 0, 0);
			drawLowerPetal();
			// DRAW SECOND LAYER OF PETAL
				drawUpperPetal(-1);
				// DRAW THIRD LAYER OF PETAL
					drawSmallestPetal(-1);
		modelMatrix = popMatrix();
		// DRAW SECOND PETAL
		pushMatrix(modelMatrix);
			modelMatrix.rotate(180, 1, 0, 0);
			modelMatrix.translate(0.0, 0.07, -0.52);
			modelMatrix.scale(0.3, 0.3, 0.3);
			modelMatrix.rotate(g_angle1now, 1, 0, 0)
			drawLowerPetal();
			// DRAW SECOND LAYER OF PETAL
			drawUpperPetal(1);
				// DRAW THIRD LAYER OF PETAL
					drawSmallestPetal(1);
		modelMatrix = popMatrix();
		// DRAW THIRD PETAL
		pushMatrix(modelMatrix);
			modelMatrix.rotate(-90, 0, 0, 1);
			modelMatrix.translate(0.01, 0.065, 0.5);
			modelMatrix.scale(0.3, 0.3, 0.3);
			modelMatrix.rotate(-g_angle1now, 1, 0, 0)
			drawLowerPetal();
			// DRAW SECOND LAYER OF PETAL
			drawUpperPetal(-1);
				// DRAW THIRD LAYER OF PETAL
					drawSmallestPetal(-1);
		modelMatrix = popMatrix();
		// DRAW FOURTH PETAL
		pushMatrix(modelMatrix);
			modelMatrix.rotate(90, 0, 0, 1);
			modelMatrix.translate(-0.06, -0.005, 0.5);
			modelMatrix.scale(0.3, 0.3, 0.3);
			modelMatrix.rotate(-g_angle1now, 1, 0, 0)	
			drawLowerPetal();
			// DRAW SECOND LAYER OF PETAL
				drawUpperPetal(-1);
				// DRAW THIRD LAYER OF PETAL
					drawSmallestPetal(-1);
		modelMatrix = popMatrix();
  modelMatrix = popMatrix();
 
  //===========================================================
  //
  pushMatrix(modelMatrix);
	modelMatrix.translate(2.3, 0.4, 0.0);
	modelMatrix.rotate(90, 1, 0, 0);
	modelMatrix.rotate(currentAngle, 0, 1, 0);
	modelMatrix.scale(1.1, 1.1, 1.1);
	
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLES,
							  stemStart/floatsPerVertex,
							  stemVerts.length/floatsPerVertex);
		modelMatrix.rotate(-90, 1, 0, 0);
		pushMatrix(modelMatrix);
			modelMatrix.translate(0.27, -0.19, 0.5);
			modelMatrix.scale(0.5, 0.5, 0.5);
			drawHeart(gl, u_ModelMatrix, modelMatrix);
		modelMatrix = popMatrix();
		// DRAW FIRST PETAL
		
		pushMatrix(modelMatrix);
			modelMatrix.translate(0.01, 0, 0.5);
			modelMatrix.scale(0.3, 0.3, 0.3);
			modelMatrix.rotate(g_angle1now, 1, 0, 0);
			drawLowerPetal();
			// DRAW SECOND LAYER OF PETAL
				drawUpperPetal(1);
				// DRAW THIRD LAYER OF PETAL
					drawSmallestPetal(1);
		modelMatrix = popMatrix();
		// DRAW SECOND PETAL
		pushMatrix(modelMatrix);
			modelMatrix.rotate(180, 1, 0, 0);
			modelMatrix.translate(0.0, 0.07, -0.52);
			modelMatrix.scale(0.3, 0.3, 0.3);
			modelMatrix.rotate(-g_angle1now, 1, 0, 0)
			drawLowerPetal();
			// DRAW SECOND LAYER OF PETAL
			drawUpperPetal(-1);
				// DRAW THIRD LAYER OF PETAL
					drawSmallestPetal(-1);
		modelMatrix = popMatrix();
		// DRAW THIRD PETAL
		pushMatrix(modelMatrix);
			modelMatrix.rotate(-90, 0, 0, 1);
			modelMatrix.translate(0.01, 0.065, 0.5);
			modelMatrix.scale(0.3, 0.3, 0.3);
			modelMatrix.rotate(g_angle1now, 1, 0, 0)
			drawLowerPetal();
			// DRAW SECOND LAYER OF PETAL
			drawUpperPetal(1);
				// DRAW THIRD LAYER OF PETAL
					drawSmallestPetal(1);
		modelMatrix = popMatrix();
		// DRAW FOURTH PETAL
		pushMatrix(modelMatrix);
			modelMatrix.rotate(90, 0, 0, 1);
			modelMatrix.translate(-0.06, -0.005, 0.5);
			modelMatrix.scale(0.3, 0.3, 0.3);
			modelMatrix.rotate(g_angle1now, 1, 0, 0)	
			drawLowerPetal();
			// DRAW SECOND LAYER OF PETAL
				drawUpperPetal(1);
				// DRAW THIRD LAYER OF PETAL
					drawSmallestPetal(1);
		modelMatrix = popMatrix();
  modelMatrix = popMatrix();
 
  //===========================================================

  pushMatrix(modelMatrix);
	modelMatrix.translate(0.0, 0.0, 0.8);
	modelMatrix.scale(0.8, 0.8, 0.8);
	// Quaternion rotation
	quatMatrix.setFromQuat(qTot.x, qTot.y, qTot.z, qTot.w);	// Quaternion-->Matrix
	modelMatrix.rotate(aim_theta, 0 ,-1, 0);
	modelMatrix.rotate(aim_theta, -1, 0, 0);
	modelMatrix.concat(quatMatrix);	// apply that matrix.
	modelMatrix.rotate(aim_theta, 1, 0, 0);
	modelMatrix.rotate(aim_theta, 0, 1, 0)
	drawHeart();
	gl.drawArrays(gl.LINES,
							axisStart/floatsPerVertex,
							axisVerts.length/floatsPerVertex);
	// draw wings (1)
	modelMatrix.translate(0.35, 1.08, 0.07);
	modelMatrix.scale(0.8, 0.8, 0.8);
	modelMatrix.rotate(g_angle4now, 0.1,0,0);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLES,
								wingStart/floatsPerVertex,
								wingVerts.length/floatsPerVertex);

	// draw wings (2)
	modelMatrix.translate(-2.2, -1.90, 0.0);
	modelMatrix.rotate(180, 0, 0, 1);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLES,
								wingStart/floatsPerVertex,
								wingVerts.length/floatsPerVertex);

  modelMatrix = popMatrix();

	//===========================================================

	pushMatrix(modelMatrix);
	modelMatrix.scale(0.8, 0.8, 0.8);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.LINES,
							  axisStart/floatsPerVertex,
							  axisVerts.length/floatsPerVertex);
  modelMatrix = popMatrix();

	//===========================================================
	pushMatrix(modelMatrix);
  modelMatrix.translate(0.7, g_movementnow, 1.3);

  	pushMatrix(modelMatrix);
  	modelMatrix.scale(2.1, 0.5, 2.1);
  	
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,
							stemStart/floatsPerVertex,
							stemVerts.length/floatsPerVertex);
	modelMatrix= popMatrix();
	
	  //modelMatrix.rotate(-90, 1, 0, 0);
	  pushMatrix(modelMatrix);
	  modelMatrix.translate(0.075,0.07,0.1)
	  modelMatrix.scale(0.1, 0.1, 0.1)
	  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    		// Draw just the sphere's vertices
      gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
    							sphStart/floatsPerVertex,	// start at this vertex number, and 
    							sphVerts.length/floatsPerVertex);	// draw this many vertices.
	  modelMatrix = popMatrix();
	  // DRAW THIRD PETAL
	  pushMatrix(modelMatrix);
		  modelMatrix.rotate(-90, 0, 0, 1);
		  modelMatrix.translate(-0.17, 0.15, 0.10);
		  modelMatrix.scale(0.3, 0.3, 0.3);
		  modelMatrix.rotate(g_angle1now, 1, 0, 0)
		  drawLowerPetal();
		  // DRAW SECOND LAYER OF PETAL
		  drawUpperPetal(1);
			  // DRAW THIRD LAYER OF PETAL
				  drawSmallestPetal(1);
	  modelMatrix = popMatrix();
	  // DRAW FOURTH PETAL
	  pushMatrix(modelMatrix);
		  modelMatrix.rotate(90, 0, 0, 1);
		  modelMatrix.translate(0.1, 0, 0.10);
		  modelMatrix.scale(0.3, 0.3, 0.3);
		  modelMatrix.rotate(g_angle1now, 1, 0, 0)	
		  drawLowerPetal();
		  // DRAW SECOND LAYER OF PETAL
			  drawUpperPetal(1);
			  // DRAW THIRD LAYER OF PETAL
				  drawSmallestPetal(1);
	  modelMatrix = popMatrix();
  modelMatrix = popMatrix();
//==============================================================

pushMatrix(modelMatrix);
  modelMatrix.translate(-g_movementnow, g_movementnow, 0.3);

  	pushMatrix(modelMatrix);
  	modelMatrix.scale(2.1, 0.5, 2.1);
  	

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,
							stemStart/floatsPerVertex,
							stemVerts.length/floatsPerVertex);
	modelMatrix= popMatrix();
	
	  //modelMatrix.rotate(-90, 1, 0, 0);
	  pushMatrix(modelMatrix);
	  modelMatrix.translate(0.075,0.07,0.1)
	  modelMatrix.scale(0.1, 0.1, 0.1)
	  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    		// Draw just the sphere's vertices
      gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
    							sphStart/floatsPerVertex,	// start at this vertex number, and 
    							sphVerts.length/floatsPerVertex);	// draw this many vertices.
	  modelMatrix = popMatrix();
	  // DRAW THIRD PETAL
	  pushMatrix(modelMatrix);
		  modelMatrix.rotate(-90, 0, 0, 1);
		  modelMatrix.translate(-0.17, 0.15, 0.10);
		  modelMatrix.scale(0.3, 0.3, 0.3);
		  modelMatrix.rotate(-g_angle1now, 1, 0, 0)
		  drawLowerPetal();
		  // DRAW SECOND LAYER OF PETAL
		  drawUpperPetal(-1);
			  // DRAW THIRD LAYER OF PETAL
				  drawSmallestPetal(-1);
	  modelMatrix = popMatrix();
	  // DRAW FOURTH PETAL
	  pushMatrix(modelMatrix);
		  modelMatrix.rotate(90, 0, 0, 1);
		  modelMatrix.translate(0.1, 0, 0.10);
		  modelMatrix.scale(0.3, 0.3, 0.3);
		  modelMatrix.rotate(-g_angle1now, 1, 0, 0)	
		  drawLowerPetal();
		  // DRAW SECOND LAYER OF PETAL
			  drawUpperPetal(-1);
			  // DRAW THIRD LAYER OF PETAL
				  drawSmallestPetal(-1);
	  modelMatrix = popMatrix();
  modelMatrix = popMatrix();
//==============================================================

  pushMatrix(modelMatrix);  // SAVE world drawing coords.
  	//---------Draw Ground Plane, without spinning.
  	// position it.
  	modelMatrix.translate( 0.4, -0.4, 0.0);	
  	modelMatrix.scale(0.1, 0.1, 0.1);				// shrink by 10X:

  	// Drawing:
  	// Pass our current matrix to the vertex shaders:
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    // Draw just the ground-plane's vertices
    gl.drawArrays(gl.LINES, 								// use this drawing primitive, and
    						  gndStart/floatsPerVertex,	// start at this vertex number, and
    						  gndVerts.length/floatsPerVertex);	// draw this many vertices.
  modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
	
  
//==============================================================
  
}


function drawLowerPetal() {
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLES,
							petalStart/floatsPerVertex,
							petalVerts.length/floatsPerVertex);
}

function drawUpperPetal(direction) {
	//g_modelMatrix.rotate(180, 1, 0, 0)
	//g_modelMatrix.rotate(-180, 1, 0, 0)
	modelMatrix.translate(0.025, 0.5, 0.0);
	modelMatrix.scale(0.8, 1, 0.8);
	//g_modelMatrix.rotate(-180, 0, 0, 0)
	//g_modelMatrix.translate(0, 0.5, 0.0);
	modelMatrix.rotate(g_angle2now, direction,0,0);
	drawLowerPetal();
}

function drawSmallestPetal(direction) {
	modelMatrix.translate(0.025, 0.5, 0.0);
	modelMatrix.scale(0.8, 1, 0.8);
	modelMatrix.rotate(g_angle3now, direction,0,0);
	drawLowerPetal();
}

function drawHeart() {
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLES,
							  heartStart/floatsPerVertex,
							  heartVerts.length/floatsPerVertex);
}


// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();

function animate(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;    
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
//  if(angle >  120.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
//  if(angle < -120.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;

if(elapsed > 1000.0) {            
    // Browsers won't re-draw 'canvas' element that isn't visible on-screen 
    // (user chose a different browser tab, etc.); when users make the browser
    // window visible again our resulting 'elapsedMS' value has gotten HUGE.
    // Instead of allowing a HUGE change in all our time-dependent parameters,
    // let's pretend that only a nominal 1/30th second passed:
    elapsed = 1000.0/30.0;
    }

g_angle1now += g_angle1rate * g_angle1brake * (elapsed * 0.001);
	  g_angle2now += g_angle2rate * g_angle2brake * (elapsed * 0.001);
	  g_angle3now += g_angle3rate * g_angle3brake * (elapsed * 0.001);
	  g_angle4now += g_angle4rate * g_angle4brake * (elapsed * 0.001);
	  g_movementnow += g_movementrate * g_movementbrake * (elapsed * 0.001);
	  // apply angle limits:  going above max, or below min? reverse direction!
	  // (!CAUTION! if max < min, then these limits do nothing...)
	  if((g_angle1now >= g_angle1max && g_angle1rate > 0) || // going over max, or
		   (g_angle1now <= g_angle1min && g_angle1rate < 0) )	 // going under min ?
		   g_angle1rate *= -1;	// YES: reverse direction.
	  if((g_angle2now >= g_angle2max && g_angle2rate > 0) || // going over max, or
		   (g_angle2now <= g_angle2min && g_angle2rate < 0) )	 // going under min ?
		   g_angle2rate *= -1;	// YES: reverse direction.
	  if((g_angle3now >= g_angle3max && g_angle3rate > 0) || // going over max, or
		   (g_angle3now <= g_angle3min && g_angle3rate < 0) )	 // going under min ?
		   g_angle3rate *= -1;	// YES: reverse direction.
	  if((g_angle4now >= g_angle4max && g_angle4rate > 0) || // going over max, or
		   (g_angle4now <= g_angle4min && g_angle4rate < 0) )	 // going under min ?
		   g_angle4rate *= -1;	// YES: reverse direction.
		if((g_movementnow >= g_movementmax && g_movementrate > 0) || // going over max, or
		  (g_movementnow <= g_movementmin && g_movementrate < 0) )	 // going under min ?
		  g_movementrate *= -1;	// YES: reverse direction.
		// *NO* limits? Don't let angles go to infinity! cycle within -180 to +180.
		if(g_angle1min > g_angle1max)
		{
			if(     g_angle1now < -180.0) g_angle1now += 360.0;	// go to >= -180.0 or
			else if(g_angle1now >  180.0) g_angle1now -= 360.0;	// go to <= +180.0
		}
		if(g_angle2min > g_angle2max)
		{
			if(     g_angle2now < -180.0) g_angle2now += 360.0;	// go to >= -180.0 or
			else if(g_angle2now >  180.0) g_angle2now -= 360.0;	// go to <= +180.0
		}
		if(g_angle3min > g_angle3max)
		{
			if(     g_angle3now < -180.0) g_angle3now += 360.0;	// go to >= -180.0 or
			else if(g_angle3now >  180.0) g_angle3now -= 360.0;	// go to <= +180.0
		}
		if(g_angle4min > g_angle4max)
		{
			if(     g_angle4now < -180.0) g_angle4now += 360.0;	// go to >= -180.0 or
			else if(g_angle4now >  180.0) g_angle4now -= 360.0;	// go to <= +180.0
		}


  
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}

//==================HTML Button Callbacks

function spinDown() {
 ANGLE_STEP -= 25; 
}

function spinUp() {
  ANGLE_STEP += 25; 
}

function runStop() {
  if(ANGLE_STEP*ANGLE_STEP > 1) {
    myTmp = ANGLE_STEP;
    ANGLE_STEP = 0;
  }
  else {
  	ANGLE_STEP = myTmp;
  }
}

	//===================Mouse and Keyboard event-handling Callbacks

function myMouseDown(ev, gl, canvas) {
	//==============================================================================
	// Called when user PRESSES down any mouse button;
	// 									(Which button?    console.log('ev.button='+ev.button);   )
	// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
	//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
	
	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	  var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
	//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
	  
		// Convert to Canonical View Volume (CVV) coordinates too:
	  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
							   (canvas.width/2);			// normalize canvas to -1 <= x < +1,
		var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
								 (canvas.height/2);
	//	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
		
		isDrag = true;											// set our mouse-dragging flag
		xMclik = x;													// record where mouse-dragging began
		yMclik = y;
	};
	
	
	function myMouseMove(ev, gl, canvas) {
	//==============================================================================
	// Called when user MOVES the mouse with a button already pressed down.
	// 									(Which button?   console.log('ev.button='+ev.button);    )
	// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
	//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
	
		if(isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'
	
		// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
		var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
	//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
	  
		// Convert to Canonical View Volume (CVV) coordinates too:
	  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
							   (canvas.width/2);			// normalize canvas to -1 <= x < +1,
		var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
								 (canvas.height/2);
	
		// find how far we dragged the mouse:
		xMdragTot += (x - xMclik);					// Accumulate change-in-mouse-position,&
		yMdragTot += (y - yMclik);
		// AND use any mouse-dragging we found to update quaternions qNew and qTot.
		dragQuat(x - xMclik, y - yMclik);
		
		xMclik = x;													// Make NEXT drag-measurement from here.
		yMclik = y;
		
		// Show it on our webpage, in the <div> element named 'MouseText':
		document.getElementById('MouseText').innerHTML=
				'Mouse Drag totals (CVV x,y coords):\t'+
				 xMdragTot.toFixed(5)+', \t'+
				 yMdragTot.toFixed(5);	
	};
	
	function myMouseUp(ev, gl, canvas) {
	//==============================================================================
	// Called when user RELEASES mouse button pressed previously.
	// 									(Which button?   console.log('ev.button='+ev.button);    )
	// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
	//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
	
	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
		var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
	//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);
	  
		// Convert to Canonical View Volume (CVV) coordinates too:
	  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
							   (canvas.width/2);			// normalize canvas to -1 <= x < +1,
		var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
								 (canvas.height/2);
	//	console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);
		
		isDrag = false;											// CLEAR our mouse-dragging flag, and
		// accumulate any final bit of mouse-dragging we did:
		xMdragTot += (x - xMclik);
		yMdragTot += (y - yMclik);
	//	console.log('myMouseUp: xMdragTot,yMdragTot =',xMdragTot,',\t',yMdragTot);
	
		// AND use any mouse-dragging we found to update quaternions qNew and qTot;
		dragQuat(x - xMclik, y - yMclik);
	
		// Show it on our webpage, in the <div> element named 'MouseText':
		document.getElementById('MouseText').innerHTML=
				'Mouse Drag totals (CVV x,y coords):\t'+
				 xMdragTot.toFixed(5)+', \t'+
				 yMdragTot.toFixed(5);	
	};
	
	function dragQuat(xdrag, ydrag) {
	//==============================================================================
	// Called when user drags mouse by 'xdrag,ydrag' as measured in CVV coords.
	// We find a rotation axis perpendicular to the drag direction, and convert the 
	// drag distance to an angular rotation amount, and use both to set the value of 
	// the quaternion qNew.  We then combine this new rotation with the current 
	// rotation stored in quaternion 'qTot' by quaternion multiply.  Note the 
	// 'draw()' function converts this current 'qTot' quaternion to a rotation 
	// matrix for drawing. 
		var res = 5;
		var qTmp = new Quaternion(0,0,0,1);
		
		var dist = Math.sqrt(xdrag*xdrag + ydrag*ydrag);

		// console.log('xdrag,ydrag=',xdrag.toFixed(5),ydrag.toFixed(5),'dist=',dist.toFixed(5));
		qNew.setFromAxisAngle(ydrag + 0.0001, -xdrag + 0.0001, 0.0, dist*150.0);
		// (why add tiny 0.0001? To ensure we never have a zero-length rotation axis)
								// why axis (x,y,z) = (-yMdrag,+xMdrag,0)? 
								// -- to rotate around +x axis, drag mouse in -y direction.
								// -- to rotate around +y axis, drag mouse in +x direction.
								
		qTmp.multiply(qNew,qTot);			// apply new rotation to current rotation. 
		//--------------------------
		// IMPORTANT! Why qNew*qTot instead of qTot*qNew? (Try it!)
		// ANSWER: Because 'duality' governs ALL transformations, not just matrices. 
		// If we multiplied in (qTot*qNew) order, we would rotate the drawing axes
		// first by qTot, and then by qNew--we would apply mouse-dragging rotations
		// to already-rotated drawing axes.  Instead, we wish to apply the mouse-drag
		// rotations FIRST, before we apply rotations from all the previous dragging.
		//------------------------
		// IMPORTANT!  Both qTot and qNew are unit-length quaternions, but we store 
		// them with finite precision. While the product of two (EXACTLY) unit-length
		// quaternions will always be another unit-length quaternion, the qTmp length
		// may drift away from 1.0 if we repeat this quaternion multiply many times.
		// A non-unit-length quaternion won't work with our quaternion-to-matrix fcn.
		// Matrix4.prototype.setFromQuat().
	//	qTmp.normalize();						// normalize to ensure we stay at length==1.0.
		qTot.copy(qTmp);
		// show the new quaternion qTot on our webpage in the <div> element 'QuatValue'
		document.getElementById('QuatValue').innerHTML= 
															 '\t X=' +qTot.x.toFixed(res)+
															'i\t Y=' +qTot.y.toFixed(res)+
															'j\t Z=' +qTot.z.toFixed(res)+
															'k\t W=' +qTot.w.toFixed(res)+
															'<br>length='+qTot.length().toFixed(res);
	};

	function clearMouse() {
		// Called when user presses 'Clear' button on our webpage, just below the 
		// 'xMdragTot,yMdragTot' display.
			xMdragTot = 0.0;
			yMdragTot = 0.0;
			document.getElementById('MouseText').innerHTML=
					'Mouse Drag totals (CVV x,y coords):\t'+
						xMdragTot.toFixed(5)+', \t'+
						yMdragTot.toFixed(5);	
		}

	function resetQuat() {
	// Called when user presses 'Reset' button on our webpage, just below the 
	// 'Current Quaternion' display.
	var res=5;
		qTot.clear();
		document.getElementById('QuatValue').innerHTML= 
															'\t X=' +qTot.x.toFixed(res)+
															'i\t Y=' +qTot.y.toFixed(res)+
															'j\t Z=' +qTot.z.toFixed(res)+
															'k\t W=' +qTot.w.toFixed(res)+
															'<br>length='+qTot.length().toFixed(res);
	}

	function keydown(ev, gl, u_ModelMatrix, modelMatrix) {
		//------------------------------------------------------
		//HTML calls this'Event handler' or 'callback function' when we press a key:
		
			if(ev.keyCode == 39) { // The right arrow key was pressed
		//      g_EyeX += 0.01;
						//g_EyeX += 0.1;		// INCREASED for perspective camera)
						aim_theta -= 0.1;
			} else 
			if (ev.keyCode == 37) { // The left arrow key was pressed
		//      g_EyeX -= 0.01;
						//g_EyeX -= 0.1;		// INCREASED for perspective camera)
						aim_theta += 0.1;
			} else 
			if(ev.keyCode == 87) { // The W key was pressed
				g_EyeX += Math.cos(aim_theta);		// INCREASED for perspective camera)
				g_EyeY += Math.sin(aim_theta);
				g_EyeZ += change_tilt;

			} else 
			if(ev.keyCode == 83) { // The S key was pressed
				g_EyeX -= Math.cos(aim_theta);		// INCREASED for perspective camera)
				g_EyeY -= Math.sin(aim_theta);
				g_EyeZ -= change_tilt;
			} else
			if(ev.keyCode == 38) { // The up key was pressed
				change_tilt += 0.01;
						
			}else
			if(ev.keyCode == 40) { // The down key was pressed
				change_tilt -= 0.01;	// INCREASED for perspective camera)
			}else
			if(ev.keyCode == 68) { // The D key was pressed
				//aim_theta += 0.1;
				g_EyeX -= 0.1*Math.cos(aim_theta+(Math.PI/2));		// INCREASED for perspective camera)
				g_EyeY -= 0.1*Math.sin(aim_theta+(Math.PI/2));	// INCREASED for perspective camera)
				aimx -= 0.1*Math.cos(aim_theta+(Math.PI/2));
				aimy -= 0.1*Math.sin(aim_theta+(Math.PI/2)); 

				// INCREASED for perspective camera)
			} else
			if(ev.keyCode == 65) { // The A key was pressed 
				
				g_EyeX += 0.1*Math.cos(aim_theta+(Math.PI/2));		// INCREASED for perspective camera)
				g_EyeY += 0.1*Math.sin(aim_theta+(Math.PI/2));
				aimx += 0.1*Math.cos(aim_theta+(Math.PI/2));
				aimy += 0.1*Math.sin(aim_theta+(Math.PI/2));
				
						// INCREASED for perspective camera)
			} else { return; } // Prevent the unnecessary drawing
			drawAll();    
		}

	function drawResize() {
//==============================================================================
// Called when user re-sizes their browser window , because our HTML file
// contains:  <body onload="main()" onresize="winResize()">

	//Report our current browser-window contents:

	console.log('g_Canvas width,height=', canvas.width, canvas.height);		
 	console.log('Browser window: innerWidth,innerHeight=', 
																innerWidth, innerHeight);	
																// http://www.w3schools.com/jsref/obj_window.asp

	
	//Make canvas fill the top 3/4 of our browser window:
	var xtraMargin = 16;    // keep a margin (otherwise, browser adds scroll-bars)
	canvas.width = innerWidth - xtraMargin;
	canvas.height = (innerHeight*3/4) - xtraMargin;
	// IMPORTANT!  Need a fresh drawing in the re-sized viewports.
	drawAll();				// draw in all viewports.
}