//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// built from RotatingTranslatedTriangle.js (c) 2012 matsuda
// and
// jtRotatingTranslatedTriangle.js  MODIFIED for CS 351-1, 
//									Northwestern Univ. Jack Tumblin
// Early Changes:
// -- converted to 2D->4D; 3 verts --> 6 verts, 2 triangles arranged as long 
//    rectangle with small gap fills one single Vertex Buffer Object (VBO);
// -- draw same rectangle over and over, but with different matrix tranforms
//    to construct a jointed 'robot arm'
// -- Make separately-numbered copies that build up arm step-by-step.
// LATER CHANGES: (2021)
//    Add global vars -- all will start with 'g', including: gl, g_canvasID,
//		g_vertCount, g_modelMatrix, uLoc_modelMatrix, etc.
// -- improve animation; better names, global vars, more time-varying values.
// -- simplify 'draw()': remove all args by using global vars;rename 'drawAll()'.
// -- create part-drawing functions that use current g_modelMatrix contents:
//		e.g. drawArm(), drawPincers(), to make 'instancing' easy. 
//

// Vertex shader program----------------------------------
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'uniform mat4 u_modelMatrix;\n' +
  'void main() {\n' +
  '  gl_Position = u_modelMatrix * a_Position;\n' +
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
//  Each instance computes all the on-screen attributes for just one PIXEL.
// Here we do the bare minimum: if we draw any part of any drawing primitive in 
// any pixel, we simply set that pixel to the constant color specified here.


// Global Variables  
//   (These are almost always a BAD IDEA, 
//		but here they eliminate lots of tedious function arguments. 
//    Later, collect them into just a few well-organized global objects!)
// ============================================================================
// for WebGL usage:--------------------
var gl;													// WebGL rendering context -- the 'webGL' object
																// in JavaScript with all its member fcns & data
var g_canvasID;									// HTML-5 'canvas' element ID#. (was 'canvas')
var g_vertCount;								// # of vertices held by our VBO.(was 'n')
var g_modelMatrix;							// 4x4 matrix in JS; sets 'uniform' in GPU
var uLoc_modelMatrix;						// GPU location where this uniform is stored.

// For animation:---------------------
var g_lastMS = Date.now();
var g_isRun = true;			// Timestamp (in milliseconds) for our 
                                // most-recently-drawn WebGL screen contents.  
                                // Set & used by timerAll() fcn to update all
                                // time-varying params for our webGL drawings.
  // All of our time-dependent params (you can add more!)
                                //---------------
var currentAngle =  0.0;
var ANGLE_STEP = 45.0;
								//---------------
// flying cherub movement
var g_angle0now  =   0.0;       // init Current rotation angle, in degrees
var g_angle0rate = -10.0;       // init Rotation angle rate, in degrees/second.
var g_angle0brake=	 1.0;				// init Speed control; 0=stop, 1=full speed.
var g_angle0min  =  360.0;       // init min, max allowed angle, in degrees.
var g_angle0max  =  360.0;
                                //---------------
// lower petal movement
var g_angle1now  =   0.0; 			// init Current rotation angle, in degrees > 0
var g_angle1rate =  64.0;				// init Rotation angle rate, in degrees/second.
var g_angle1brake=	 1.0;				// init Rotation start/stop. 0=stop, 1=full speed.
var g_angle1min  = -130.0;       // init min, max allowed angle, in degrees
var g_angle1max  =  -30.0;
                                //---------------
// middle petal movement
var g_angle2now  =   0.0; 			// init Current rotation angle, in degrees.
var g_angle2rate =  60.0;				// init Rotation angle rate, in degrees/second.
var g_angle2brake=	 1.0;				// init Speed control; 0=stop, 1=full speed.
var g_angle2min  = -40.0;       // init min, max allowed angle, in degrees
var g_angle2max  = -20.0;			

// smallest petal movement
var g_angle3now  =   0.0; 			// init Current rotation angle, in degrees.
var g_angle3rate =  75.0;				// init Rotation angle rate, in degrees/second.
var g_angle3brake=	 1.0;				// init Speed control; 0=stop, 1=full speed.
var g_angle3min  = -70.0;       // init min, max allowed angle, in degrees
var g_angle3max  = 70.0;

// cherub wing movement
var g_angle4now  =   0.0; 			// init Current rotation angle, in degrees.
var g_angle4rate =  60.0;				// init Rotation angle rate, in degrees/second.
var g_angle4brake=	 1.0;				// init Speed control; 0=stop, 1=full speed.
var g_angle4min  = -40.0;       // init min, max allowed angle, in degrees
var g_angle4max  = -20.0;

//------------For mouse click-and-drag: -------------------------------
var g_isDrag=false;		// mouse-drag: true when user holds down mouse button
var g_xMclik=0.0;			// last mouse button-down position (in CVV coords)
var g_yMclik=0.0;   
var g_xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var g_yMdragTot=0.0; 
var g_digits=5;			// DIAGNOSTICS: # of digits to print in console.log (
									//    console.log('xVal:', xVal.toFixed(g_digits)); // print 5 digits
var tick = function() {		    // locally (within main() only), define our 
	currentAngle = animate(currentAngle);  // Update the rotation angle
		// Draw shapes
	console.log('currentAngle=',currentAngle);                            // self-calling animation function. 
		
	requestAnimationFrame(tick, g_canvasID); // browser callback request; wait
								// til browser is ready to re-draw canvas, then
	timerAll();  				// Update all our time-varying params, and
	drawAll();          // Draw all parts using transformed VBObox contents
	};

function main() {
//==============================================================================
  // Retrieve the HTML-5 <canvas> element where webGL will draw our pictures:
  g_canvasID = document.getElementById('webgl');	

  // Create the the WebGL rendering context 'gl'. This huge JavaScript object 
  // contains the WebGL state machine adjusted by large sets of WebGL functions,
  // built-in variables & parameters, and member data. Every WebGL function 
  // call follows this format:  gl.WebGLfunctionName(args);
  //
  //SIMPLE VERSION:  gl = getWebGLContext(g_canvasID); 
  // Here's a BETTER version:
  gl = g_canvasID.getContext("webgl", { preserveDrawingBuffer: true});
	// This fancier-looking version disables HTML-5's default screen-clearing,
	// so that our draw() functions will over-write previous on-screen results 
	// until we call the gl.clear(COLOR_BUFFER_BIT); function. Try it! can you
	// make an on-screen button to enable/disable screen clearing? )
				 
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL. Bye!');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Write the positions of vertices into an array, transfer array contents into 
  // a Vertex Buffer Object created in the graphics hardware.
  var myErr = initVertexBuffers(); // sets global var 'g_vertCount'
  if (myErr < 0) {
    console.log('Failed to set the positions of the vertices');
    return;
  }

  // KEYBOARD:
  // The 'keyDown' and 'keyUp' events respond to ALL keys on the keyboard,
  //      including shift,alt,ctrl,arrow, pgUp, pgDn,f1,f2...f12 etc. 
	window.addEventListener("keydown", myKeyDown, false);
	window.addEventListener("keyup", myKeyUp, false);
		
	// MOUSE:
	// Create 'event listeners' for a few vital mouse events 
	// (others events are available too... google it!).  
	window.addEventListener("mousedown", myMouseDown); 
	// (After each 'mousedown' event, browser calls the myMouseDown() fcn.)
 	window.addEventListener("mousemove", myMouseMove); 
	window.addEventListener("mouseup", myMouseUp);	
	window.addEventListener("click", myMouseClick);				
	// END Keyboard & Mouse Event-Handlers---------------------------------------

  // Specify the color for clearing <canvas>
  gl.clearColor(0, 0, 0, 1); // R,G,B, A==opacity)

  // Create our (global) model matrix here in JavaScript.  We will set its 
  // values using transformation-matrix calls, and then send its contents to 
  // the GPU to set the value of the uniform named 'u_modelMatrix' in shaders.
  g_modelMatrix = new Matrix4();
//	g_modelMatrix.printMe('Initial g_modelMatrix');
  // Get the GPU storage location for u_modelMatrix uniform 
  // (now a global var declared above main().  was 'u_modelMatrix )
  uLoc_modelMatrix = gl.getUniformLocation(gl.program, 'u_modelMatrix');
  if (!uLoc_modelMatrix) { 
    console.log('Failed to get the storage location of u_modelMatrix');
    return;
 }
 
// TEST g_modelMatrix with cuon-matrix-quat03 library's crude push-down stack:	
// testMatrixStack();
  
  
// ==============ANIMATION=============
  // Quick tutorials on synchronous, real-time animation in JavaScript/HTML-5: 
  //    https://webglfundamentals.org/webgl/lessons/webgl-animation.html
  //  or
  //  	http://creativejs.com/resources/requestanimationframe/
  //		--------------------------------------------------------
  // Why use 'requestAnimationFrame()' instead of the simpler-to-use
  //	fixed-time setInterval() or setTimeout() functions?  Because:
  //		1) it draws the next animation frame 'at the next opportunity' instead 
  //			of a fixed time interval. It allows your browser and operating system
  //			to manage its own processes, power, & computing loads, and to respond 
  //			to on-screen window placement (to skip battery-draining animation in 
  //			any window that was hidden behind others, or was scrolled off-screen)
  //		2) it helps your program avoid 'stuttering' or 'jittery' animation
  //			due to delayed or 'missed' frames.  Your program can read and respond 
  //			to the ACTUAL time interval between displayed frames instead of fixed
  //		 	fixed-time 'setInterval()' calls that may take longer than expected.

  //------------------------------------  Define & run our animation:
  
  //------------------------------------
  tick();                       // do it again!  (endless loop)

}


function timerAll() {
//=============================================================================
// Find new values for all time-varying parameters used for on-screen drawing.
// HINT: this is ugly, repetive code!  Could you write a better version?
// 			 would it make sense to create a 'timer' or 'animator' class? Hmmmm...
//
  // use local variables to find the elapsed time:
  var nowMS = Date.now();             // current time (in milliseconds)
  var elapsedMS = nowMS - g_lastMS;   // 
  g_lastMS = nowMS;                   // update for next webGL drawing.
  if(elapsedMS > 1000.0) {            
    // Browsers won't re-draw 'canvas' element that isn't visible on-screen 
    // (user chose a different browser tab, etc.); when users make the browser
    // window visible again our resulting 'elapsedMS' value has gotten HUGE.
    // Instead of allowing a HUGE change in all our time-dependent parameters,
    // let's pretend that only a nominal 1/30th second passed:
    elapsedMS = 1000.0/30.0;
    }
  // Find new time-dependent parameters using the current or elapsed time:
  
	g_angle0now += g_angle0rate * g_angle0brake * (elapsedMS * 0.001);	// update.
  g_angle1now += g_angle1rate * g_angle1brake * (elapsedMS * 0.001);
  g_angle2now += g_angle2rate * g_angle2brake * (elapsedMS * 0.001);
  g_angle3now += g_angle3rate * g_angle3brake * (elapsedMS * 0.001);
  g_angle4now += g_angle4rate * g_angle4brake * (elapsedMS * 0.001);
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
	// pause and unpause heart cherub
	if(g_isRun == true) {
		g_angle0brake = 1.0;
	  }
	  else {
		g_angle0brake = 0;
	  }
}

function initVertexBuffers() {
//==============================================================================
  var vertices = new Float32Array ([
    // Drawing the stem shape 
	// Contains three different colors: dark green, lawn green and olive drab
	// +x face
     0.07, 0.00, 0.07, 1.00,	  0, 0.39, 0,	// Node 2
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

	 //------------------------------------
	 // Draw Petal Shape
	 // Contains three different colors: Pink, Dark Magenta, and Royal Blue

	 // +x face
     0.20, 0.00, 0.07, 1.00,	  1.0, 0.75, 0.79,	// Node 2
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
	
	 // HEART ==================================
	 // Contains 3 colors: cornflower blue, midnight blue, and light sky blue.
	0.0,0.5714285714285714,0.5714285714285714,1.0,	0.0, 0.0, 1.0,
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
	-1.0,0.0714285714285714,0.5714285714285714,1.0,	0.39, 0.58, 0.93,

	// DRAW WING ==============================================
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
0.11111111111111116,-1.0,0.5925925925925926,1.0,		0.86, 0.44, 0.58,

  ]);
  g_vertCount = 258;   // The number of vertices (now a global var; was 'n') (0:36, 36: 72) (114 + 144)

  // Create a buffer object in GPU; get its ID:
  var vertexBufferID = gl.createBuffer();
  if (!vertexBufferID) {
    console.log('Failed to create the buffer object');
    return -1;	// error code
  }

  // In GPU, bind the buffer object to target for reading vertices;
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferID);
  // Write JS vertex array contents into the buffer object on the GPU:
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  var FSIZE = vertices.BYTES_PER_ELEMENT;

  // On GPU, get location of vertex shader's 'a_position' attribute var
  var aLoc_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(aLoc_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -2;  // error code
  }
  // Now connect the 'a_position' data in our VBO to the 'a_position' attribute
  // in the shaders in the GPU:
  gl.vertexAttribPointer(aLoc_Position, 4, gl.FLOAT, false, FSIZE * 7, 0);
  // Enable the assignment of that VBO data to the shaders' a_Position variable
  gl.enableVertexAttribArray(aLoc_Position);

  // Connect a VBO Attribute to Shaders-------------------------------------------
  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_ColorLoc = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_ColorLoc < 0) {
    console.log('Failed to get the attribute storage location of a_Color');
    return -1;
  }
  // Use handle to specify how Vertex Shader retrieves color data from our VBO:
  gl.vertexAttribPointer(
  	a_ColorLoc, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 7, 			// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  	FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w 									
  gl.enableVertexAttribArray(a_ColorLoc);  
  									// Enable assignment of vertex buffer object's position data
//-----------done.
  // UNBIND the buffer object: we have filled the VBO & connected its attributes
  // to our shader, so no more modifications needed.
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return 0;	// normal exit; no error.
}

function drawAll() {
//==============================================================================
  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

//========================================
// START with an empty model matrix; drawing axes == CVV
	g_modelMatrix.setIdentity();
	// DEBUGGING: if your push/pop operations are all balanced and correct,
	// you can comment out this 'setIdentity()' call with no on-screen change...

	// Move drawing axes to the 'base' or 'shoulder' of the robot arm:
	g_modelMatrix.translate(-0.1,-0.5, 0.0);  // 'set' means DISCARD old matrix,
		  						// (drawing axes centered in CVV), and then make new
		  						// drawing axes moved to the lower-left corner of CVV.  
	drawScene();

}


function drawScene() {
//==============================================================================
	//----------------------------------------------------------
	pushMatrix(g_modelMatrix);
	//-----------------------------------------------------------			
			//-------Draw Stem and Heart center---------------
			g_modelMatrix.rotate(currentAngle, 0, 1, 0);
			// DRAW CENTER HEART:==================
			pushMatrix(g_modelMatrix);
				g_modelMatrix.translate(0.10, 0.5, 0.095);
				g_modelMatrix.scale(0.2,0.2,0.2);
				g_modelMatrix.rotate(-90, 1, 0, 0);
				drawHeart();
			g_modelMatrix = popMatrix();
			g_modelMatrix.translate(-0.05, 0,0);						
		  // DRAW STEM:======================
		  	drawStem();
			pushMatrix(g_modelMatrix);
		  //-------Draw PETALS----------------
		  		g_modelMatrix.translate(0, 0.5, 0); 			
			
		  		g_modelMatrix.scale(0.4,0.4,0.4);				// Make new drawing axes that
		  						// are smaller that the previous drawing axes by 0.6.
		  		g_modelMatrix.rotate(g_angle1now, 1,0,0);	// Make new drawing axes that
		  						// spin around Z axis (0,0,1) of the previous drawing 
		  						// axes, using the same origin.
		  // DRAW FIRST PETAL:=======================
				drawLowerPetal(); 
				drawUpperPetal(-1);
				drawSmallestPetal(-1);
			g_modelMatrix = popMatrix();
			pushMatrix(g_modelMatrix);
		  // DRAW SECOND PETAL: ========================
		  			//translate drawing axes	  
					g_modelMatrix.translate(0, 0.5, 0.08); 
					g_modelMatrix.scale(0.4,0.4,0.4);				
		  			g_modelMatrix.rotate(g_angle1now, -1,0,0);
					drawLowerPetal();
						drawUpperPetal(1); // flutter inwards
							drawSmallestPetal(1);
		  	g_modelMatrix = popMatrix();
		  // DRAW THIRD PETAL: ========================	  
		  	pushMatrix(g_modelMatrix);
			  		g_modelMatrix.translate(0.07, 0.5, 0.08);
					g_modelMatrix.scale(0.4,0.4,0.4);  
					g_modelMatrix.rotate(90, 0, 1, 0);
					g_modelMatrix.rotate(g_angle1now, -1,0,0);
					drawLowerPetal();
						drawUpperPetal(1);
							drawSmallestPetal(1);
			g_modelMatrix = popMatrix();
			
		  // DRAW FOURTH PETAL: ======================	
		  	pushMatrix(g_modelMatrix);
			  		g_modelMatrix.translate(0, 0.5, 0.08);
					g_modelMatrix.scale(0.4,0.4,0.4);
					g_modelMatrix.rotate(-90, 0, 1, 0);
					g_modelMatrix.rotate(g_angle1now, -1,0,0);
					drawLowerPetal();
						drawUpperPetal(1);
							drawSmallestPetal(1);
			g_modelMatrix = popMatrix();
	g_modelMatrix = popMatrix();
		// Draw flying heart cherub: ======================
		pushMatrix(g_modelMatrix);
			g_modelMatrix.rotate(3*g_angle0now, 0,1,0);  //  try: SPIN ON Y AXIS!!!
			pushMatrix(g_modelMatrix);
				drawFlyingheart();
			g_modelMatrix = popMatrix();  
		g_modelMatrix = popMatrix();
	
	// draw heart that can be rotated with mouse drag
	g_modelMatrix.translate(0.8, 0, 0);
		g_modelMatrix.rotate(-90, 1, 0, 0);
		g_modelMatrix.scale(0.5, 0.5, 0.5);
		//g_modelMatrix.translate(translationX, translationY, 0);
		var dist = Math.sqrt(g_xMdragTot*g_xMdragTot + g_yMdragTot*g_yMdragTot);
							// why add 0.001? avoids divide-by-zero in next statement
							// in cases where user didn't drag the mouse.)
		g_modelMatrix.rotate(dist*120.0, -g_yMdragTot+0.0001, g_xMdragTot+0.0001, 0.0);
		drawHeart();

}	
			

function drawStem() {
		  gl.uniformMatrix4fv(uLoc_modelMatrix, false, g_modelMatrix.elements);
		  gl.drawArrays(gl.TRIANGLES, 0, 36);	// draw all vertices.
}

function drawWing() {
		gl.uniformMatrix4fv(uLoc_modelMatrix, false, g_modelMatrix.elements);
		gl.drawArrays(gl.TRIANGLES, 114, 144);
}

function drawHeart() {
		gl.uniformMatrix4fv(uLoc_modelMatrix, false, g_modelMatrix.elements);
		gl.drawArrays(gl.TRIANGLES, 72, 42)
}

function drawLowerPetal() {
		 gl.uniformMatrix4fv(uLoc_modelMatrix, false, g_modelMatrix.elements);
		 gl.drawArrays(gl.TRIANGLES, 36, 36);
}

function drawUpperPetal(direction) {
	//g_modelMatrix.rotate(180, 1, 0, 0)
	//g_modelMatrix.rotate(-180, 1, 0, 0)
	g_modelMatrix.translate(0.025, 0.5, 0.0);
	g_modelMatrix.scale(0.8, 1, 0.8);
	//g_modelMatrix.rotate(-180, 0, 0, 0)
	//g_modelMatrix.translate(0, 0.5, 0.0);
	g_modelMatrix.rotate(g_angle2now, direction,0,0);
	drawLowerPetal();
}

function drawSmallestPetal(direction) {
	g_modelMatrix.translate(0.025, 0.5, 0.0);
	g_modelMatrix.scale(0.8, 1, 0.8);
	g_modelMatrix.rotate(g_angle3now, direction,0,0);
	drawLowerPetal();
}
 
function drawFlyingheart() {
	g_modelMatrix.translate(0.3, 0.8, 0.3);
	g_modelMatrix.scale(0.1,0.1,0.1);
	g_modelMatrix.rotate(-90, 1, 0, 0);
	drawHeart();
		//drawWing();
		pushMatrix(g_modelMatrix);
			g_modelMatrix.translate(0.4, 1.2, 0.6);
			g_modelMatrix.rotate(g_angle4now, -0.1,0,0);
			drawWing();
		g_modelMatrix = popMatrix();
		pushMatrix(g_modelMatrix);
			g_modelMatrix.translate(-1.3, -0.5, 0.6);
			g_modelMatrix.rotate(180, 0, 1, 0);
			g_modelMatrix.rotate(180, 1, 0, 0);
			g_modelMatrix.rotate(g_angle4now, -0.1,0,0);
			drawWing();
		g_modelMatrix = popMatrix();
}

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
	  
	  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
	  return newAngle %= 360;
	}	

//========================
//
// HTML BUTTON HANDLERS
//
//========================

function A1_runStop() {
//==============================================================================
  if(g_angle1brake > 0.5)	// if running,
  {
  	g_angle1brake = 0.0;	// stop, and change button label:
  	document.getElementById("A1button").value="Lower Petal OFF";
	}
  else 
  {
  	g_angle1brake = 1.0;	// Otherwise, go.
  	document.getElementById("A1button").value="Lower Petal ON-";
	}
}
function A2_runStop() {
//==============================================================================
  if(g_angle2brake > 0.5)	// if running,
  {
  	g_angle2brake = 0.0;	// stop, and change button label:
  	document.getElementById("A2button").value="Middle Petal OFF";
	}
  else 
  {
  	g_angle2brake = 1.0;	// Otherwise, go.
  	document.getElementById("A2button").value="Middle Petal ON-";
	}
}

function A3_runStop() {
//==============================================================================
  if(g_angle3brake > 0.5)	// if running,
  {
  	g_angle3brake = 0.0;	// stop, and change button label:
  	document.getElementById("A3button").value="Angle 3 OFF";
	}
  else 
  {
  	g_angle3brake = 1.0;	// Otherwise, go.
  	document.getElementById("A3button").value="Angle 3 ON-";
	}
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

function myMouseDown(ev) {
	//==============================================================================
	// Called when user PRESSES down any mouse button;

	
	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	  var yp = g_canvasID.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
	//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
	  
		// Convert to Canonical View Volume (CVV) coordinates too:
	  var x = (xp - g_canvasID.width/2)  / 		// move origin to center of canvas and
							   (g_canvasID.width/2);			// normalize canvas to -1 <= x < +1,
		var y = (yp - g_canvasID.height/2) /		//										 -1 <= y < +1.
								 (g_canvasID.height/2);
	//	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
		
		g_isDrag = true;											// set our mouse-dragging flag
		g_xMclik = x;													// record where mouse-dragging began
		g_yMclik = y;
		
	};
	
	
function myMouseMove(ev) {
//==============================================================================
// Called when user MOVES the mouse with a button already pressed down.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

	if(g_isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'

	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = g_canvasID.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
	
	// Convert to Canonical View Volume (CVV) coordinates too:
	var x = (xp - g_canvasID.width/2)  / 		// move origin to center of canvas and
							(g_canvasID.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - g_canvasID.height/2) /		//										 -1 <= y < +1.
								(g_canvasID.height/2);

	// find how far we dragged the mouse:
	g_xMdragTot += (x - g_xMclik);					// Accumulate change-in-mouse-position,&
	g_yMdragTot += (y - g_yMclik);
	// Report new mouse position & how far we moved on webpage:

	g_xMclik = x;													// Make next drag-measurement from here.
	g_yMclik = y;
	};
	
function myMouseUp(ev) {
	//==============================================================================
	// Called when user RELEASES mouse button pressed previously.
	// 									(Which button?   console.log('ev.button='+ev.button);    )
	// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
	//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
	
	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
		var yp = g_canvasID.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
	//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);
	  
		// Convert to Canonical View Volume (CVV) coordinates too:
	  var x = (xp - g_canvasID.width/2)  / 		// move origin to center of canvas and
							   (g_canvasID.width/2);			// normalize canvas to -1 <= x < +1,
		var y = (yp - g_canvasID.height/2) /		//										 -1 <= y < +1.
								 (g_canvasID.height/2);
		console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);
		
		g_isDrag = false;											// CLEAR our mouse-dragging flag, and
		// accumulate any final bit of mouse-dragging we did:
		g_xMdragTot += (x - g_xMclik);
		g_yMdragTot += (y - g_yMclik);
		
	};
	
function myMouseClick(ev) {
	//=============================================================================
	// Called when user completes a mouse-button single-click event 
	// (e.g. mouse-button pressed down, then released)	
	  // STUB
		console.log("myMouseClick() on button: ", ev.button); 
	};	
	
	function myKeyDown(kev) {
	//===============================================================================
	// Called when user presses down ANY key on the keyboard;
	//
	
	// and report EVERYTHING on webpage:
	document.getElementById('KeyDownResult').innerHTML = ''; // clear old results
	 
		switch(kev.code) {
			case "KeyP":
				console.log("Pause/unPause!\n");                // print on console,
				document.getElementById('KeyDownResult').innerHTML =  
				'Heart Cherub has been paused/unpaused!';   // print on webpage
				if(g_isRun==true) {
				  g_isRun = false;    // STOP animation
				  }
				else {
				  g_isRun = true;     // RESTART animation
				  tick();
				  }
				break;
			
		default:
		  console.log("UNUSED!");
			  document.getElementById('KeyDownResult').innerHTML =
				  'myKeyDown(): UNUSED!';
		  break;
		}
	}
	
	function myKeyUp(kev) {
	//===============================================================================
	// Called when user releases ANY key on the keyboard; captures scancodes well
	
		console.log('myKeyUp()--keyCode='+kev.keyCode+' released.');
	}
