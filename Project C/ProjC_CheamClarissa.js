//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// TABS set to 2.
//
// ORIGINAL SOURCE:
// RotatingTranslatedTriangle.js (c) 2012 matsuda
// HIGHLY MODIFIED to make:
//
// JT_MultiShader.js  for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin

// Jack Tumblin's Project C -- step by step.

/* Show how to use 3 separate VBOs with different verts, attributes & uniforms. 
-------------------------------------------------------------------------------
	Create a 'VBObox' object/class/prototype & library to collect, hold & use all 
	data and functions we need to render a set of vertices kept in one Vertex 
	Buffer Object (VBO) on-screen, including:
	--All source code for all Vertex Shader(s) and Fragment shader(s) we may use 
		to render the vertices stored in this VBO;
	--all variables needed to select and access this object's VBO, shaders, 
		uniforms, attributes, samplers, texture buffers, and any misc. items. 
	--all variables that hold values (uniforms, vertex arrays, element arrays) we 
	  will transfer to the GPU to enable it to render the vertices in our VBO.
	--all user functions: init(), draw(), adjust(), reload(), empty(), restore().
	Put all of it into 'JT_VBObox-Lib.js', a separate library file.

USAGE:
------
1) If your program needs another shader program, make another VBObox object:
 (e.g. an easy vertex & fragment shader program for drawing a ground-plane grid; 
 a fancier shader program for drawing Gouraud-shaded, Phong-lit surfaces, 
 another shader program for drawing Phong-shaded, Phong-lit surfaces, and
 a shader program for multi-textured bump-mapped Phong-shaded & lit surfaces...)
 
 HOW:
 a) COPY CODE: create a new VBObox object by renaming a copy of an existing 
 VBObox object already given to you in the VBObox-Lib.js file. 
 (e.g. copy VBObox1 code to make a VBObox3 object).

 b) CREATE YOUR NEW, GLOBAL VBObox object.  
 For simplicity, make it a global variable. As you only have ONE of these 
 objects, its global scope is unlikely to cause confusions/errors, and you can
 avoid its too-frequent use as a function argument.
 (e.g. above main(), write:    var phongBox = new VBObox3();  )

 c) INITIALIZE: in your JS progam's main() function, initialize your new VBObox;
 (e.g. inside main(), write:  phongBox.init(); )

 d) DRAW: in the JS function that performs all your webGL-drawing tasks, draw
 your new VBObox's contents on-screen. 
 (NOTE: as it's a COPY of an earlier VBObox, your new VBObox's on-screen results
  should duplicate the initial drawing made by the VBObox you copied.  
  If that earlier drawing begins with the exact same initial position and makes 
  the exact same animated moves, then it will hide your new VBObox's drawings!
  --THUS-- be sure to comment out the earlier VBObox's draw() function call  
  to see the draw() result of your new VBObox on-screen).
  (e.g. inside drawAll(), add this:  
      phongBox.switchToMe();
      phongBox.draw();            )

 e) ADJUST: Inside the JS function that animates your webGL drawing by adjusting
 uniforms (updates to ModelMatrix, etc) call the 'adjust' function for each of your
VBOboxes.  Move all the uniform-adjusting operations from that JS function into the
'adjust()' functions for each VBObox. 

2) Customize the VBObox contents; add vertices, add attributes, add uniforms.
 ==============================================================================*/

//=============================================================================*/
// HAS GROUND PLANE, 3D CONTROL, SPINNING SPHERE


// Global Variables  
//   (These are almost always a BAD IDEA, but here they eliminate lots of
//    tedious function arguments. 
//    Later, collect them into just a few global, well-organized objects!)
// ============================================================================
// for WebGL usage:--------------------
var gl;													// WebGL rendering context -- the 'webGL' object
																// in JavaScript with all its member fcns & data
var g_canvasID;									// HTML-5 'canvas' element ID#
var floatsPerVertex = 7.0;

// For multiple VBOs & Shaders:-----------------
worldBox = new VBObox0();		  // Holds VBO & shaders for 3D 'world' ground-plane grid, etc;
gouraudBox = new VBObox1();		  // "  "  for first set of custom-shaded 3D parts
phongBox = new VBObox2();     // "  "  for second set of custom-shaded 3D parts
flowerStem = new VBObox3();
flowerPetal = new VBObox4();

// for vbo..?


// Global vars for mouse click-and-drag for rotation.
var isDrag=false;		// mouse-drag: true when user holds down mouse button
var xMclik=0.0;			// last mouse button-down position (in CVV coords)
var yMclik=0.0;   
var xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot=0.0;  

// for lighting
//var lamp0 = new LightsT();
//var matlSel= MATL_BLU_PLASTIC;				// see keypress(): 'm' key changes matlSel
//var matl0 = new Material(matlSel);

// For animation:---------------------
var g_lastMS = Date.now();			// Timestamp (in milliseconds) for our 
                                // most-recently-drawn WebGL screen contents.  
                                // Set & used by moveAll() fcn to update all
                                // time-varying params for our webGL drawings.
  // All time-dependent params (you can add more!)
var g_angleNow0  =  0.0; 			  // Current rotation angle, in degrees.
var g_angleRate0 = 45.0;				// Rotation angle rate, in degrees/second.
                                //---------------
var g_angleNow1  = 100.0;       // current angle, in degrees
var g_angleRate1 =  95.0;        // rotation angle rate, degrees/sec
var g_angleMax1  = 150.0;       // max, min allowed angle, in degrees
var g_angleMin1  =  60.0;
                                //---------------
var g_angleNow2  =  0.0; 			  // Current rotation angle, in degrees.
var g_angleRate2 = -30.0;				// Rotation angle rate, in degrees/second.

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

                                //---------------
var g_posNow0 =  0.0;           // current position
var g_posRate0 = 0.6;           // position change rate, in distance/second.
var g_posMax0 =  0.5;           // max, min allowed for g_posNow;
var g_posMin0 = -0.5;           
                                // ------------------
var g_posNow1 =  0.0;           // current position
var g_posRate1 = 0.5;           // position change rate, in distance/second.
var g_posMax1 =  1.0;           // max, min allowed positions
var g_posMin1 = -1.0;
                                //---------------

// For mouse/keyboard:------------------------
var g_show0 = 1;								// 0==Show, 1==Hide VBO0 contents on-screen.
var g_show1 = 1;								// 	"					"			VBO1		"				"				" 
var g_show2 = 1;                //  "         "     VBO2    "       "       "

// for lamp location
var lampx = 3.0;
var lampy = 3.0;
var lampz = 3.0;

// for ambi, diff and spec colors
var ambir = 0.4;
var ambig = 0.4;
var ambib = 0.4;

var diffr = 1.0;
var diffg = 1.0;
var diffb = 1.0;

var specr = 1.0;
var specg = 1.0;
var specb = 1.0;

var mode = true;

var lightOn = true;


//lamp0 = new LightsT();
//matlSel= MATL_RED_PLASTIC;				// see keypress(): 'm' key changes matlSel
//matl0 = new Material(matlSel);


// GLOBAL CAMERA CONTROL:					// 
g_worldMat = new Matrix4();				// Changes CVV drawing axes to 'world' axes.
g_mvpMat = new Matrix4();
// (equivalently: transforms 'world' coord. numbers (x,y,z,w) to CVV coord. numbers)
// WHY?
// Lets mouse/keyboard functions set just one global matrix for 'view' and 
// 'projection' transforms; then VBObox objects use it in their 'adjust()'
// member functions to ensure every VBObox draws its 3D parts and assemblies
// using the same 3D camera at the same 3D position in the same 3D world).

function main() {
//=============================================================================
  // Retrieve the HTML-5 <canvas> element where webGL will draw our pictures:
  g_canvasID = document.getElementById('webgl');	
  // Create the the WebGL rendering context: one giant JavaScript object that
  // contains the WebGL state machine adjusted by large sets of WebGL functions,
  // built-in variables & parameters, and member data. Every WebGL function call
  // will follow this format:  gl.WebGLfunctionName(args);

  // Create the the WebGL rendering context: one giant JavaScript object that
  // contains the WebGL state machine, adjusted by big sets of WebGL functions,
  // built-in variables & parameters, and member data. Every WebGL func. call
  // will follow this format:  gl.WebGLfunctionName(args);
  //SIMPLE VERSION:  gl = getWebGLContext(g_canvasID); 
  // Here's a BETTER version:
  gl = g_canvasID.getContext("webgl", { preserveDrawingBuffer: true});
	// This fancier-looking version disables HTML-5's default screen-clearing, so 
	// that our drawMain() 
	// function will over-write previous on-screen results until we call the 
	// gl.clear(COLOR_BUFFER_BIT); function. )
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  gl.clearColor(0.886, 0.737, 0.921, 1);	  // RGBA color for clearing <canvas>

  gl.enable(gl.DEPTH_TEST);

  //g_canvasID.onmousedown	=	function(ev){myMouseDown( ev, gl, g_canvasID) }; 
  
  					// when user's mouse button goes down call mouseDown() function
  //g_canvasID.onmousemove = 	function(ev){myMouseMove( ev, gl, g_canvasID) };
  
											// call mouseMove() function					
  //g_canvasID.onmouseup = 		function(ev){myMouseUp(   ev, gl, g_canvasID)};
  window.addEventListener("keydown", myKeyDown, false);
  window.addEventListener("keypress", myKeyPress, false);



  //lamp0.I_pos.elements.set( [6.0, 5.0, 5.0]);
  //lamp0.I_ambi.elements.set([0.4, 0.4, 0.4]);
  //lamp0.I_diff.elements.set([1.0, 1.0, 1.0]);
  //lamp0.I_spec.elements.set([1.0, 1.0, 1.0]);
	

  /*
//----------------SOLVE THE 'REVERSED DEPTH' PROBLEM:------------------------
  // IF the GPU doesn't transform our vertices by a 3D Camera Projection Matrix
  // (and it doesn't -- not until Project B) then the GPU will compute reversed 
  // depth values:  depth==0 for vertex z == -1;   (but depth = 0 means 'near') 
  //		    depth==1 for vertex z == +1.   (and depth = 1 means 'far').
  //
  // To correct the 'REVERSED DEPTH' problem, we could:
  //  a) reverse the sign of z before we render it (e.g. scale(1,1,-1); ugh.)
  //  b) reverse the usage of the depth-buffer's stored values, like this:
  gl.enable(gl.DEPTH_TEST); // enabled by default, but let's be SURE.

  gl.clearDepth(0.0);       // each time we 'clear' our depth buffer, set all
                            // pixel depths to 0.0  (1.0 is DEFAULT)
  gl.depthFunc(gl.GREATER); // draw a pixel only if its depth value is GREATER
                            // than the depth buffer's stored value.
                            // (gl.LESS is DEFAULT; reverse it!)
  //------------------end 'REVERSED DEPTH' fix---------------------------------
*/

  // Initialize each of our 'vboBox' objects: 
  worldBox.init(gl);		// VBO + shaders + uniforms + attribs for our 3D world,
                        // including ground-plane,                       
  gouraudBox.init(gl);		//  "		"		"  for 1st kind of shading & lighting
	phongBox.init(gl);    //  "   "   "  for 2nd kind of shading & lighting
  flowerStem.init(gl);
  flowerPetal.init(gl);
	
setCamera();				// TEMPORARY: set a global camera used by ALL VBObox objects...
	
gl.clearColor(0.686, 0.637, 0.921, 1);	  // RGBA color for clearing <canvas>
  
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
  //------------------------------------
  drawResize();


  var tick = function() {		    // locally (within main() only), define our 
                                // self-calling animation function. 
    requestAnimationFrame(tick, g_canvasID); // browser callback request; wait
                                // til browser is ready to re-draw canvas, then
    timerAll();  // Update all time-varying params, and
    drawAll();                // Draw all the VBObox contents
    };
  //------------------------------------
  tick();                       // do it again!
}

function timerAll() {
//=============================================================================
// Find new values for all time-varying parameters used for on-screen drawing
  // use local variables to find the elapsed time.
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
  // Continuous rotation:
  g_angleNow0 = g_angleNow0 + (g_angleRate0 * elapsedMS) / 1000.0;
  g_angleNow1 = g_angleNow1 + (g_angleRate1 * elapsedMS) / 1000.0;
  g_angleNow2 = g_angleNow2 + (g_angleRate2 * elapsedMS) / 1000.0;
  g_angle1now += g_angle1rate * g_angle1brake * (elapsedMS * 0.001);
	  g_angle2now += g_angle2rate * g_angle2brake * (elapsedMS * 0.001);
	  g_angle3now += g_angle3rate * g_angle3brake * (elapsedMS * 0.001);
  g_angleNow0 %= 360.0;   // keep angle >=0.0 and <360.0 degrees  
  g_angleNow1 %= 360.0;   
  g_angleNow2 %= 360.0;
  if(g_angleNow1 > g_angleMax1) { // above the max?
    g_angleNow1 = g_angleMax1;    // move back down to the max, and
    g_angleRate1 = -g_angleRate1; // reverse direction of change.
    }
  else if(g_angleNow1 < g_angleMin1) {  // below the min?
    g_angleNow1 = g_angleMin1;    // move back up to the min, and
    g_angleRate1 = -g_angleRate1;
    }
  if((g_angle1now >= g_angle1max && g_angle1rate > 0) || // going over max, or
      (g_angle1now <= g_angle1min && g_angle1rate < 0) )	 // going under min ?
      g_angle1rate *= -1;	// YES: reverse direction.
  if((g_angle2now >= g_angle2max && g_angle2rate > 0) || // going over max, or
      (g_angle2now <= g_angle2min && g_angle2rate < 0) )	 // going under min ?
      g_angle2rate *= -1;	// YES: reverse direction.
  if((g_angle3now >= g_angle3max && g_angle3rate > 0) || // going over max, or
      (g_angle3now <= g_angle3min && g_angle3rate < 0) )	 // going under min ?
      g_angle3rate *= -1;	// YES: reverse direction.
  // Continuous movement:
  g_posNow0 += g_posRate0 * elapsedMS / 1000.0;
  g_posNow1 += g_posRate1 * elapsedMS / 1000.0;
  // apply position limits
  if(g_posNow0 > g_posMax0) {   // above the max?
    g_posNow0 = g_posMax0;      // move back down to the max, and
    g_posRate0 = -g_posRate0;   // reverse direction of change
    }
  else if(g_posNow0 < g_posMin0) {  // or below the min? 
    g_posNow0 = g_posMin0;      // move back up to the min, and
    g_posRate0 = -g_posRate0;   // reverse direction of change.
    }
  if(g_posNow1 > g_posMax1) {   // above the max?
    g_posNow1 = g_posMax1;      // move back down to the max, and
    g_posRate1 = -g_posRate1;   // reverse direction of change
    }
  else if(g_posNow1 < g_posMin1) {  // or below the min? 
    g_posNow1 = g_posMin1;      // move back up to the min, and
    g_posRate1 = -g_posRate1;   // reverse direction of change.
    }
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

}

function drawAll() {
//=============================================================================
  // Clear on-screen HTML-5 <canvas> object:
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  setCamera();

var b4Draw = Date.now();
var b4Wait = b4Draw - g_lastMS;



	if(g_show0 == 1) {	// IF user didn't press HTML button to 'hide' VBO0:
	  worldBox.switchToMe();  // Set WebGL to render from this VBObox.
		worldBox.adjust();		  // Send new values for uniforms to the GPU, and
		worldBox.draw();			  // draw our VBO's contents using our shaders.
  }
  if(g_show1 == 1) { // IF user didn't press HTML button to 'hide' VBO1:
    gouraudBox.switchToMe();  // Set WebGL to render from this VBObox.
  	gouraudBox.adjust();		  // Send new values for uniforms to the GPU, and
  	gouraudBox.draw();			  // draw our VBO's contents using our shaders.
    flowerStem.switchToMe();
    flowerStem.adjust();
    flowerStem.draw();
    flowerPetal.switchToMe();
    flowerPetal.adjust();
    flowerPetal.draw();
	  }
	if(g_show2 == 1) { // IF user didn't press HTML button to 'hide' VBO2:
	  phongBox.switchToMe();  // Set WebGL to render from this VBObox.
  	phongBox.adjust();		  // Send new values for uniforms to the GPU, and
  	phongBox.draw();			  // draw our VBO's contents using our shaders.
    flowerStem.switchToMe();
    flowerStem.adjust();
    flowerStem.draw();
    flowerPetal.switchToMe();
    flowerPetal.adjust();
    flowerPetal.draw();
  	}
/* // ?How slow is our own code?  	
var aftrDraw = Date.now();
var drawWait = aftrDraw - b4Draw;
console.log("wait b4 draw: ", b4Wait, "drawWait: ", drawWait, "mSec");
*/



}

function VBO0toggle() {
//=============================================================================
// Called when user presses HTML-5 button 'Show/Hide VBO0'.
  if(g_show0 != 1) g_show0 = 1;				// show,
  else g_show0 = 0;										// hide.
  console.log('g_show0: '+g_show0);
}

function VBO1toggle() {
//=============================================================================
// Called when user presses HTML-5 button 'Show/Hide VBO1'.
  if(g_show1 != 1) g_show1 = 1;			// show,
  else g_show1 = 0;									// hide.
  console.log('g_show1: '+g_show1);
}

function VBO2toggle() {
//=============================================================================
// Called when user presses HTML-5 button 'Show/Hide VBO2'.
  if(g_show2 != 1) g_show2 = 1;			// show,
  else g_show2 = 0;									// hide.
  console.log('g_show2: '+g_show2);
}

var g_EyeX = 3.0, g_EyeY = 3.0, g_EyeZ = 1.25; 
var aim_theta = -2.4;
var change_tilt = -0.3;
var aimx, aimy, aimz;


function setCamera() {
//============================================================================
// PLACEHOLDER:  sets a fixed camera at a fixed position for use by
// ALL VBObox objects.  REPLACE This with your own camera-control code.

	g_worldMat.setIdentity();
  gl.viewport(0,  														// Viewport lower-left corner
  			0,															// (x,y) location(in pixels)
  			g_canvasID.width, 				// viewport width, height.
  			g_canvasID.height);

	var vpAspect = g_canvasID.width /					  // On-screen aspect ratio for
			  g_canvasID.height;	// this camera: width/height.

	g_worldMat.setPerspective(30.0,   // FOVY: top-to-bottom vertical image angle, in degrees
  										vpAspect,   // Image Aspect Ratio: camera lens width/height
                      1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
                      200.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)

  aimx = g_EyeX + Math.cos(aim_theta);
  aimy = g_EyeY + Math.sin(aim_theta);
  aimz = g_EyeZ + change_tilt;

  g_worldMat.lookAt(g_EyeX, g_EyeY, g_EyeZ, 	// eye position
                  aimx, aimy, (g_EyeZ + change_tilt),  								// look-at point (origin)
                  0, 0, 1);		// View UP vector.
	// READY to draw in the 'world' coordinate system.
//------------END COPY

}

function drawResize() {
  //==============================================================================
  // Called when user re-sizes their browser window , because our HTML file
  // contains:  <body onload="main()" onresize="winResize()">
  
    //Report our current browser-window contents:
  
    console.log('g_Canvas width,height=', g_canvasID.width, g_canvasID.height);		
     console.log('Browser window: innerWidth,innerHeight=', 
                                  innerWidth, innerHeight);	
                                  // http://www.w3schools.com/jsref/obj_window.asp
  
    
    //Make canvas fill the top 3/4 of our browser window:
    var xtraMargin = 16;    // keep a margin (otherwise, browser adds scroll-bars)
    g_canvasID.width = innerWidth - xtraMargin;
    g_canvasID.height = (innerHeight*2/3) - xtraMargin;
    // IMPORTANT!  Need a fresh drawing in the re-sized viewports.
    drawAll();				// draw in all viewports.
  }

function myKeyDown(ev) {
  //===============================================================================
  // Called when user presses down ANY key on the keyboard, and captures the 
  // keyboard's scancode or keycode(varies for different countries and alphabets).
  //  CAUTION: You may wish to avoid 'keydown' and 'keyup' events: if you DON'T 
  // need to sense non-ASCII keys (arrow keys, function keys, pgUp, pgDn, Ins, 
  // Del, etc), then just use the 'keypress' event instead.
  //	 The 'keypress' event captures the combined effects of alphanumeric keys and
  // the SHIFT, ALT, and CTRL modifiers.  It translates pressed keys into ordinary
  // ASCII codes; you'll get the ASCII code for uppercase 'S' if you hold shift 
  // and press the 's' key.
  // For a light, easy explanation of keyboard events in JavaScript,
  // see:    http://www.kirupa.com/html5/keyboard_events_in_javascript.htm
  // For a thorough explanation of the messy way JavaScript handles keyboard events
  // see:    http://javascript.info/tutorial/keyboard-events
  //
  
    switch(ev.keyCode) {			// keycodes !=ASCII, but are very consistent for 
    //	nearly all non-alphanumeric keys for nearly all keyboards in all countries.
        case 39: // right arrow key
        aim_theta -= 0.1;
        drawAll();														// re-draw on-screen image.
        break;
        case 37: //left arrow
        aim_theta += 0.1;
        drawAll();														// re-draw on-screen image.
        break;
        case 38: // up arrow
        change_tilt += 0.01;
        drawAll();																// re-draw on-screen image.
        break;
        case 40: // down arrow
        change_tilt -= 0.01;
        drawAll();					
        break;
        case 87: // W key pressed
        g_EyeX += Math.cos(aim_theta);		// INCREASED for perspective camera)
        g_EyeY += Math.sin(aim_theta);
        g_EyeZ += change_tilt;
        drawAll();			
        break;
        case 83: // S key
        g_EyeX -= Math.cos(aim_theta);		// INCREASED for perspective camera)
        g_EyeY -= Math.sin(aim_theta);
        g_EyeZ -= change_tilt;
        drawAll();			
        break;
        case 68: // D key
        g_EyeX -= 0.1*Math.cos(aim_theta+(Math.PI/2));		// INCREASED for perspective camera)
        g_EyeY -= 0.1*Math.sin(aim_theta+(Math.PI/2));	// INCREASED for perspective camera)
        aimx -= 0.1*Math.cos(aim_theta+(Math.PI/2));
        aimy -= 0.1*Math.sin(aim_theta+(Math.PI/2)); 
        drawAll();			
        break;
        case 65: // A key
        g_EyeX += 0.1*Math.cos(aim_theta+(Math.PI/2));		// INCREASED for perspective camera)
        g_EyeY += 0.1*Math.sin(aim_theta+(Math.PI/2));
        aimx += 0.1*Math.cos(aim_theta+(Math.PI/2));
        aimy += 0.1*Math.sin(aim_theta+(Math.PI/2));
        drawAll();			
        break;
      default:
  //			console.log('myKeyDown()--keycode=', ev.keyCode, ', charCode=', ev.charCode);
        document.getElementById('Result').innerHTML =
            'myKeyDown()--keyCode='+ev.keyCode;
        break;
    }
  }

function myKeyPress(ev) {
  //===============================================================================
  // Best for capturing alphanumeric keys and key-combinations such as 
  // CTRL-C, alt-F, SHIFT-4, etc.
    switch(ev.keyCode)
    {
      case 77:	// UPPER-case 'M' key:
      case 109:	// LOWER-case 'm' key:
        matlSel = (matlSel +1)%MATL_DEFAULT;	// see materials_Ayerdi.js for list
        //matl0.setMatl(matlSel);								// set new material reflectances,
        drawAll();																// re-draw on-screen image.
        break;
      case 82: // UPPER-case 's' key:
        matl0.K_shiny += 1.0;								// INCREASE shinyness, but with a
        if(matl0.K_shiny > 128.0) matl0.K_shiny = 128.0;	// upper limit.
        console.log('UPPERcase S: ++K_shiny ==', matl0.K_shiny,'\n');	
        drawAll();														// re-draw on-screen image.
        break;
      case 114:	// LOWER-case 's' key:
        matl0.K_shiny += -1.0;								// DECREASE shinyness, but with a
        if(matl0.K_shiny < 1.0) matl0.K_shiny = 1.0;		// lower limit.
        console.log('lowercase s: --K_shiny ==', matl0.K_shiny, '\n');
        drawAll();													// re-draw on-screen image.
        break;
      
      default:
  /* SILENCE!
      console.log('myKeyPress():keyCode=' +ev.keyCode  +', charCode=' +ev.charCode+
                            ', shift='    +ev.shiftKey + ', ctrl='    +ev.ctrlKey +
                            ', altKey='   +ev.altKey   +
                            ', metaKey(Command key or Windows key)='+ev.metaKey);
  */
      break;
    }
  }
    
function setLampLoc() {
  lampx = document.getElementById('usrX').value;
  lampy = document.getElementById('usrY').value;
  lampz = document.getElementById('usrZ').value;
  console.log('lampx = ', lampx, ', lampy = ', lampy, ', lampz = ', lampz);
}

function setAmbiCol() {
  ambir = document.getElementById('ambir').value;
  ambig = document.getElementById('ambig').value;
  ambib = document.getElementById('ambib').value;
  console.log('ambir = ', ambir, ', ambig = ', ambig, ', ambib = ', ambib);
}

function setDiffCol() {
  diffr = document.getElementById('diffr').value;
  diffg = document.getElementById('diffg').value;
  diffb = document.getElementById('diffb').value;
  console.log('diffr = ', diffr, ', diffg = ', diffg, ', diffb = ', diffb);
}
function setSpecCol() {
  specr = document.getElementById('specr').value; 
  specg = document.getElementById('specg').value;
  specb = document.getElementById('specb').value;
  console.log('specr = ', specr, ', specg = ', specg, ', specb = ', specb);
}

function setLightMode() {
  console.log("Light Mode is called");
  lMode = document.getElementById('lMode').value;
  console.log("LMoDE", lMode);
  if (lMode == 1) {
      console.log('Light Mode has changed to Blinn-Phong Lighting!')}
  else if (lMode == 2) {
    console.log('Light Mode has changed to Phong Lighting!')
  }
}

function onOffLight() {
  if (lightOn == false) {
    lightOn = true;
    console.log('Lamp is now on!');
  }
  else {
  lightOn = false;
  console.log('Lamp is now off!');
  }
}

function blinnLighting() {
  if(mode == true) {
    mode = false;
    console.log('mode is phong');
  }
  else {
    mode = true;
    console.log('mode is blinnphong');
  }
}