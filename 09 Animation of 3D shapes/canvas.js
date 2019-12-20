// global variables
var canvas = null
// webgl context
var gl = null
var bFullScreen = false;
var canvas_original_width;
var canvas_original_height;

const WebGLMacros = 
{
    AMC_ATTRIBUTE_VERTEX : 0,
    AMC_ATTRIBUTE_COLOR : 1,
    AMC_ATTRIBUTE_NORMAL : 2,
    AMC_ATTRIBUTE_TEXTURE0 : 3
};

// To start animation:
var requestAnimationFrame = window.requestAnimationFrame
                         || window.webkitRequestAnimationFrame
                         || window.mozRequestAnimationFrame
                         || window.oRequestAnimationFrame
                         || window.msRequestAnimationFrame;

// To stop animation:
var cancelAnimationFrame = window.cancelAnimationFrame
                         || window.webkitCancelRequestAnimationFrame || window.webkitCancelAnimationFrame
                         || window.mozCancelRequestAnimationFrame || window.mozCanceltAnimationFrame
                         || window.oCancelRequestAnimationFrame || window.oCancelAnimationFrame
                         || window.msCancelRequestAnimationFrame || window.msCancelAnimationFrame;

var vertexShaderObject;
var fragmentShaderObject;
var shaderProgramObject;

var vao_pyramid;
var vbo_pyramid_position;
var vbo_pyramid_color;

var vao_cube;
var vbo_cube_position;
var vbo_cube_color;

var anglePyramid = 0.0;
var angleCube = 0.0;

var mvpUniform;
var perspectiveProjectionMatrix;

function main()
{
    // get <canvas> element
    canvas = document.getElementById("AMC");
    if(!canvas)
        console.log("Obtaining Canvas Failed");
    else
        console.log("Obtaining Canvas Succeded");

    canvas_original_height = canvas.height;
    canvas_original_width = canvas.width;

    // register keyboard`s keydown event handler
    window.addEventListener("keydown", keyDown, false);
    window.addEventListener("click", mouseDown, false);
    window.addEventListener("resize", resize, false);

    // initialize WebGL
    init();

    // start drawing as warming up here
    resize();
    draw();
}

function toggleFullScreen()
{
    var fullscreen_element =
                    document.fullscreenElement
                    || document.webkitFullscreenElement
                    || document.mozFullScreenElement
                    || document.msFullscreenElement
                    || null;

    if(fullscreen_element == null)
    {
        if(canvas.requestFullscreen)
            canvas.requestFullscreen();
        else if(canvas.mozRequestFullScreen)
            canvas.mozRequestFullScreen();
        else if(canvas.webkitRequestFullscreen)
            canvas.webkitRequestFullscreen();
        else if(canvas.msRequestFullscreen)
            canvas.msRequestFullscreen();

        bFullScreen = true;
    }
    else
    {
        if(document.exitFullscreen)
            document.exitFullscreen();
        else if(document.mozCancelFullScreen)
            document.mozCancelFullScreen();
        else if(document.webkitExitFullscreen)
            document.webkitExitFullscreen();
        else if(document.msExitFullscreen)
            document.msExitFullscreen();

        bFullScreen = false;
    }
}

function init()
{
    // get WebGL 2.0 context
    gl = canvas.getContext("webgl2");
    if(null == gl)
    {
        console.log("Failed to get rendering context for WebGL\n");
        return
    }

    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;

    var vertexShaderSourceCode =
    "#version 300 es"+
    "\n" +
    "in vec4 vPosition;" +
    "in vec4 vColor;" +
    "uniform mat4 u_mvp_matrix;" +
    "out vec4 voutColor;" +
    "void main(void)" +
    "{" +
    "gl_Position = u_mvp_matrix * vPosition;" +
    "voutColor = vColor;" +
    "}";

    vertexShaderObject = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShaderObject, vertexShaderSourceCode);
    gl.compileShader(vertexShaderObject);
    if(gl.getShaderParameter(vertexShaderObject, gl.COMPILE_STATUS) == false)
    {
        var error = gl.getShaderInfoLog(vertexShaderObject);
        if(error.length > 0)
        {
            alert(error);
            uninitialize();
        }
    }

    var fragmentShaderSourceCode =
    "#version 300 es"+
    "\n" +
    "precision highp float;" +
    "in vec4 voutColor;" +
    "out vec4 vFragColor;" +
    "void main(void)" +
    "{" +
    "vFragColor = voutColor;" +
    "}"

    fragmentShaderObject = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShaderObject, fragmentShaderSourceCode);
    gl.compileShader(fragmentShaderObject);
    if(false == gl.getShaderParameter(fragmentShaderObject, gl.COMPILE_STATUS))
    {
        var error = gl.getShaderInfoLog(fragmentShaderObject);
        if(error.length > 0)
        {
            alert(error);
            uninitialize();
        }
    }

    // shader program
    shaderProgramObject = gl.createProgram();
    gl.attachShader(shaderProgramObject, vertexShaderObject);
    gl.attachShader(shaderProgramObject, fragmentShaderObject);

    gl.bindAttribLocation(shaderProgramObject,
        WebGLMacros.AMC_ATTRIBUTE_VERTEX,
        "vPosition");

    gl.bindAttribLocation(shaderProgramObject,
        WebGLMacros.AMC_ATTRIBUTE_COLOR,
        "vColor");

    // linking
    gl.linkProgram(shaderProgramObject);
    if(!gl.getProgramParameter((shaderProgramObject), gl.LINK_STATUS))
    {
        var error = gl.getProgramInfoLog(fragmentShaderObject);
        if(error.length > 0)
        {
            alert(error);
            uninitialize();
        }
    }

    // get MVP uniform location
    mvpUniform = gl.getUniformLocation(shaderProgramObject, "u_mvp_matrix");

    var triangleVertices = new Float32Array([
         0.0,  1.0, 0.0,
        -1.0, -1.0, 1.0,
         1.0, -1.0, 1.0,

        0.0,  1.0,  0.0,
        1.0, -1.0,  1.0,
        1.0, -1.0, -1.0,

        0.0,  1.0,  0.0,
        1.0, -1.0, -1.0,
       -1.0, -1.0, -1.0,

         0.0,  1.0,  0.0,
        -1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0]);

    var triangleColors = new Float32Array([
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0,

        1.0, 0.0, 0.0,
        0.0, 0.0, 1.0,
        0.0, 1.0, 0.0,

        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0,

        1.0, 0.0, 0.0,
        0.0, 0.0, 1.0,
        0.0, 1.0, 0.0    
        ]);

    var rectangleVertices = new
     Float32Array([
             1.0, 1.0, -1.0,
			-1.0, 1.0, -1.0,
			-1.0, 1.0,  1.0,
		     1.0, 1.0,  1.0,

			 1.0, -1.0, -1.0 ,
			-1.0, -1.0, -1.0,
			-1.0, -1.0,  1.0,
			 1.0, -1.0,  1.0,

			 1.0,  1.0, 1.0,
			-1.0,  1.0, 1.0,
			-1.0, -1.0, 1.0,
			 1.0, -1.0, 1.0,

			 1.0,  1.0, -1.0,
			-1.0,  1.0, -1.0,
			-1.0, -1.0, -1.0,
			 1.0, -1.0, -1.0,

			1.0,  1.0, -1.0,
			1.0,  1.0,  1.0,
			1.0, -1.0,  1.0,
			1.0, -1.0, -1.0,

			-1.0,  1.0, -1.0,
			-1.0,  1.0,  1.0,
			-1.0, -1.0,  1.0,
			-1.0, -1.0, -1.0                                    
        ]);

    var rectangleColors = new Float32Array([
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,

        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,

        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,

        0.0, 1.0, 1.0,
        0.0, 1.0, 1.0,
        0.0, 1.0, 1.0,
        0.0, 1.0, 1.0,

        1.0, 0.0, 1.0,
        1.0, 0.0, 1.0,
        1.0, 0.0, 1.0,
        1.0, 0.0, 1.0,

        1.0, 1.0, 0.0,
        1.0, 1.0, 0.0,
        1.0, 1.0, 0.0,
        1.0, 1.0, 0.0
    ]);

    vao_pyramid = gl.createVertexArray();
    gl.bindVertexArray(vao_pyramid);

    vbo_pyramid_position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_pyramid_position);
    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_VERTEX,
            3,
            gl.FLOAT,
            false,
            0,
            0);
    gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_VERTEX);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    vbo_pyramid_color = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_pyramid_color);
    gl.bufferData(gl.ARRAY_BUFFER, triangleColors, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_COLOR,
        3,
        gl.FLOAT,
        false,
        0,
        0);
    gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_COLOR);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindVertexArray(null);

    vao_cube = gl.createVertexArray();
    gl.bindVertexArray(vao_cube);
    
    vbo_cube_position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_cube_position);
    gl.bufferData(gl.ARRAY_BUFFER, rectangleVertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_VERTEX,
        3,
        gl.FLOAT,
        false,
        0,
        0);
    gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_VERTEX);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);  
    
    vbo_cube_color = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_cube_color);
    gl.bufferData(gl.ARRAY_BUFFER, rectangleColors, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_COLOR,
        3,
        gl.FLOAT,
        false,
        0,
        0);
    gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_COLOR);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
    gl.bindVertexArray(null);

    // setting clear color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    // gl.enable(gl.CULL_FACE);

    perspectiveProjectionMatrix = mat4.create();
}

function resize()
{
    if(true == bFullScreen)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    else
    {
        canvas.width = canvas_original_width;
        canvas.height = canvas_original_height;
    }

    // set the viewport to match
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Perspective Projection
    mat4.perspective(perspectiveProjectionMatrix, 45.0, parseFloat(canvas.width)/parseFloat(canvas.height), 0.1, 100.0)
}

function draw()
{
    // code
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(shaderProgramObject);

    var modelViewMatrix = mat4.create();
    var modelViewProjectionMatrix = mat4.create();
    
    mat4.translate(modelViewMatrix, modelViewMatrix, [-1.5, 0.0, -4.0]);

    mat4.rotateY(modelViewMatrix, modelViewMatrix, degToRad(anglePyramid));

    mat4.multiply(modelViewProjectionMatrix, perspectiveProjectionMatrix, modelViewMatrix);
    gl.uniformMatrix4fv(mvpUniform, false, modelViewProjectionMatrix);

    gl.bindVertexArray(vao_pyramid);
    gl.drawArrays(gl.TRIANGLES, 0, 12);
    
    gl.bindVertexArray(null);

    mat4.identity(modelViewMatrix);
    mat4.identity(modelViewProjectionMatrix);

    mat4.translate(modelViewMatrix, modelViewMatrix, [1.5, 0.0, -4.0]);

    mat4.rotateX(modelViewMatrix, modelViewMatrix, degToRad(angleCube));
    mat4.rotateY(modelViewMatrix, modelViewMatrix, degToRad(angleCube));
    mat4.rotateZ(modelViewMatrix, modelViewMatrix, degToRad(angleCube));

    mat4.multiply(modelViewProjectionMatrix, perspectiveProjectionMatrix, modelViewMatrix);
    gl.uniformMatrix4fv(mvpUniform, false, modelViewProjectionMatrix);

    gl.bindVertexArray(vao_cube);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    gl.drawArrays(gl.TRIANGLE_FAN, 4, 4);
    gl.drawArrays(gl.TRIANGLE_FAN, 8, 4);
    gl.drawArrays(gl.TRIANGLE_FAN, 12, 4);
    gl.drawArrays(gl.TRIANGLE_FAN, 16, 4);
    gl.drawArrays(gl.TRIANGLE_FAN, 20, 4);
    gl.bindVertexArray(null);

    gl.useProgram(null);
    anglePyramid = anglePyramid + 2.0;
    if (anglePyramid >= 360.0)
        anglePyramid = anglePyramid - 360.0;

    angleCube  = angleCube + 2.0;
    if (angleCube >= 360.0)
        angleCube = angleCube - 360.0;

    // animation loop
    requestAnimationFrame(draw, canvas);
}

function keyDown(event)
{
    switch(event.keyCode)
    {
        case 27:
            uninitialize();
            window.close();
            break;

        case 70: // f or F
            toggleFullScreen();
            // repaint
            break;
    }
}

function mouseDown()
{
    // for code
}

function uninitialize()
{
    // code
    if(vao_pyramid)
    {
        gl.deleteVertexArray(vao_pyramid);
        vao_pyramid = null;
    }

    if(vbo_pyramid_position)
    {
        gl.deleteBuffer(vbo_pyramid_position);
        vbo_pyramid_position = null;
    }

    if(vbo_pyramid_color)
    {
        gl.deleteBuffer(vbo_pyramid_color);
        vbo_pyramid_color = null;
    }

    if(vao_cube)
    {
        gl.deleteVertexArray(vao_cube);
        vao_cube = null;
    }

    if(vbo_cube_position)
    {
        gl.deleteVertexArray(vbo_cube_position);
        vbo_cube_position = null;
    }

    if(vbo_cube_color)
    {
        gl.deleteVertexArray(vbo_cube_color);
        vbo_cube_color = null;
    }

    if(shaderProgramObject)
    {
        if(fragmentShaderObject)
        {
            gl.detachShader(shaderProgramObject, fragmentShaderObject);
            gl.deleteShader(fragmentShaderObject);
            fragmentShaderObject = null;
        }

        if(vertexShaderObject)
        {
            gl.detachShader(shaderProgramObject, vertexShaderObject);
            gl.deleteShader(vertexShaderObject);
            vertexShaderObject = null;
        }

        gl.deleteProgram(shaderProgramObject);
        shaderProgramObject = null;
    }
}

function degToRad(degrees)
{
    // code
    return(degrees * Math.PI / 180);
}
