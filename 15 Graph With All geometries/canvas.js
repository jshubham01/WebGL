/*
Module: Graph Paper With Different Geometries
*/

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

var vao;
var vbo;
var mvpUniform;
var colorUniform;
var perspectiveProjectionMatrix;

var vao_verticalLines;
var vbo_verticalLines;

var vao_Circle;
var vao_Rectangle;
var vao_Triangle;

var vbo_Circle;
var vbo_Rectangle;
var vbo_Triangle;

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
    "uniform mat4 u_mvp_matrix;" +
    "void main(void)" +
    "{" +
        "gl_Position = u_mvp_matrix * vPosition;" +
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
    "uniform vec4 u_vLineColor;" +
    "out vec4 vFragColor;" +
    "void main(void)" +
    "{" +
        "vFragColor = u_vLineColor;"+
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

    gl.bindAttribLocation(shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_VERTEX, "vPosition");

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
    colorUniform = gl.getUniformLocation(shaderProgramObject, "u_vLineColor");

    // creating array for for vertices
    var fLineArray = new Float32Array(126);
    var flag = 0;
    var fFact = -1.0;
    var ind;
    for(ind = 0; ind < 42; ind++)
    {
        fLineArray[ind * 3 + 1] = fFact;
        fLineArray[ind * 3 + 2] = 0.0;
        if (0==flag)
        {
            fLineArray[ind * 3] = -1.0;
        }
        else
        {
            fLineArray[ind * 3] = 1.0;
            fFact = fFact + 0.1;
        }

        if(1 == flag)
        {
            flag = 0;
        }
        else
        {
            flag = 1;
        }
    }

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, fLineArray, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_VERTEX,
            3,
            gl.FLOAT,
            false,
            0,
            0
    );

    gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_VERTEX);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);

    // for Vertical Lines
    var fVerticalLines = new Float32Array(126);
    var flag = 0;
    var fFact = -1.0;

    for(ind = 0; ind < 42; ind++)
    {
        fVerticalLines[ind * 3] = fFact;
        fVerticalLines[ind * 3 + 2] = 0.0;
        if (0==flag)
        {
            fVerticalLines[ind * 3 + 1] = -1.0;
        }
        else
        {
            fVerticalLines[ind * 3 + 1] = 1.0;
            fFact = fFact + 0.1;
        }

        if(1 == flag)
        {
            flag = 0;
        }
        else
        {
            flag = 1;
        }
    }

    vao_verticalLines = gl.createVertexArray();
    gl.bindVertexArray(vao_verticalLines);

    vbo_verticalLines = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_verticalLines);
    gl.bufferData(gl.ARRAY_BUFFER, fVerticalLines, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_VERTEX, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_VERTEX);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);


    //color
    var fAngle = 0.0;
    var fCirclePositions = new Float32Array(1000 * 3);
    for (ind = 0; ind < 1000; ind++)
    {
        fAngle = 2.0 * Math.PI * ind / 1000;
        fCirclePositions[ind * 3] = Math.cos(fAngle);
        fCirclePositions[ind * 3 + 1] = Math.sin(fAngle);
        fCirclePositions[ind * 3 + 2] = 0.0;
    }

    vao_Circle = gl.createVertexArray();
    gl.bindVertexArray(vao_Circle);

    vbo_Circle = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_Circle);
    gl.bufferData(gl.ARRAY_BUFFER, fCirclePositions, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_VERTEX, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_VERTEX);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);

    var fSide = Math.sqrt(0.5);
    var fArrayRectangle = new Float32Array([fSide, fSide, 0.0,
        -fSide, fSide, 0.0,     -fSide, fSide, 0.0, 		-fSide, -fSide, 0.0, 		-fSide, -fSide, 0.0,
        fSide, -fSide, 0.0,     fSide, -fSide, 0.0, 		fSide, fSide, 0.0]);

    vao_Rectangle = gl.createVertexArray();
    gl.bindVertexArray(vao_Rectangle);

    vbo_Rectangle = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_Rectangle);
    gl.bufferData(gl.ARRAY_BUFFER, fArrayRectangle, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_VERTEX, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_VERTEX);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);

    // Triangle for Incircle
    var fx, fy, fTempfA, fTempfB, fDistA, fDistB, fDistC;

    fx = fy = fSide;
    fTempfA = -fx;
    fTempfB = -2 * fy;
    fDistA = Math.sqrt(fTempfA*fTempfA + fTempfB * fTempfB);
    fTempfA = 2 * fx;
    fTempfB = 0.0;
    fDistB = Math.sqrt(fTempfA*fTempfA + fTempfB * fTempfB);
    fTempfA = -fx;
    fTempfB = 2 * fy;
    fDistC = Math.sqrt(fTempfA * fTempfA + fTempfB * fTempfB);

    var fInTriangle = new Float32Array([0.0, fy, 0.0,
        -fx, -fy, 0.0, -fx, -fy, 0.0, fx, -fy, 0.0, fx, -fy, 0.0, 0.0, fy, 0.0]);

    vao_Triangle = gl.createVertexArray();
    gl.bindVertexArray(vao_Triangle);

    vbo_Triangle = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_Triangle);
    gl.bufferData(gl.ARRAY_BUFFER, fInTriangle, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_VERTEX, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_VERTEX);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);

    // In-Circle
    var fIncircleXCord, fIncircleYCord, fSemiPerimeter, fAreaSquare, fArea, fInRadius;

    fIncircleXCord = ((fDistB) * 0.0) + ((fDistC * (-fx)) + ((fDistA) * fx))
                        / (fDistA + fDistB + fDistC);

    fIncircleYCord = (((fDistB) * fy) + (fDistC * (-fy)) + ((fDistA) * (-fy)))
        / (fDistA + fDistB + fDistC);

    fSemiPerimeter = (fDistA + fDistB + fDistC) / 2;

    fAreaSquare = (fSemiPerimeter - fDistA)
        * (fSemiPerimeter - fDistB)
        * (fSemiPerimeter - fDistC) * fSemiPerimeter;

    fArea = Math.sqrt(fAreaSquare);
    fInRadius = fArea / fSemiPerimeter;

    ind = 0;
    fAngle = 0.0;

    var  fInCirclePositions = new Float32Array(1000 * 3);
    for (ind = 0; ind < 1000; ind++)
    {
        fAngle = 2.0 * Math.PI * ind / 1000;
        fInCirclePositions[ind * 3] = fInRadius * Math.cos(fAngle) + fIncircleXCord;
        fInCirclePositions[ind * 3 + 1] = fInRadius * Math.sin(fAngle) + fIncircleYCord;
        fInCirclePositions[ind * 3 + 2] = 0.0;
    }

    vao_In_Circle = gl.createVertexArray();
    gl.bindVertexArray(vao_In_Circle);

    vbo_In_Circle = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_In_Circle);
    gl.bufferData(gl.ARRAY_BUFFER, fInCirclePositions, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_VERTEX, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_VERTEX);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);

    // setting clear color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
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
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(shaderProgramObject);

    var modelViewMatrix = mat4.create();
    var modelViewProjectionMatrix = mat4.create();
    
    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -3.0]);
    mat4.multiply(modelViewProjectionMatrix, perspectiveProjectionMatrix, modelViewMatrix);
    gl.uniformMatrix4fv(mvpUniform, false, modelViewProjectionMatrix);

    // bind with vao
    gl.bindVertexArray(vao);

    gl.lineWidth(0.5);
    gl.uniform4f(colorUniform, 0.0, 0.0, 1.0, 1.0);
    gl.drawArrays(gl.LINES, 0, 20);
    
    gl.lineWidth(2.0);
    gl.uniform4f(colorUniform, 1.0, 0.0, 0.0, 1.0);
    gl.drawArrays(gl.LINES, 20, 2);

    gl.lineWidth(2.0);
    gl.uniform4f(colorUniform, 0.0, 0.0, 1.0, 1.0);
    
    gl.drawArrays(gl.LINES, 22, 20);
    gl.bindVertexArray(null);
    gl.bindVertexArray(vao_verticalLines);

    gl.lineWidth(0.5);
    gl.drawArrays(gl.LINES, 0, 20);

    gl.lineWidth(2.0);
    gl.uniform4f(colorUniform, 0.0, 1.0, 0.0, 1.0);
    gl.drawArrays(gl.LINES, 20, 2);

    gl.lineWidth(2.0);
    gl.uniform4f(colorUniform, 0.0, 0.0, 1.0, 1.0);
    gl.drawArrays(gl.LINES, 22, 20);
    gl.bindVertexArray(null);

    // Circle
    modelViewMatrix = mat4.identity(modelViewMatrix);
    modelViewProjectionMatrix = mat4.identity(modelViewProjectionMatrix);

    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -3.0]);
    mat4.multiply(modelViewProjectionMatrix, perspectiveProjectionMatrix, modelViewMatrix);
    gl.uniformMatrix4fv(mvpUniform, false, modelViewProjectionMatrix);
    gl.uniform4f(colorUniform, 1.0, 1.0, 0.0, 1.0);

    gl.bindVertexArray(vao_Circle);
    gl.lineWidth(0.5);
    gl.drawArrays(gl.LINE_LOOP, 0, 1000);
    gl.bindVertexArray(null);

    // Rectangle
    gl.bindVertexArray(vao_Rectangle);
    gl.lineWidth(1.5);
    gl.uniform4f(colorUniform, 1.0, 1.0, 0.0, 1.0);
    gl.drawArrays(gl.LINES, 0, 8);
    gl.bindVertexArray(null);

    // Triangle
    gl.bindVertexArray(vao_Triangle);
    gl.drawArrays(gl.LINES, 0, 6);
    gl.bindVertexArray(0);

    // In-Circle
    gl.bindVertexArray(vao_In_Circle);
    gl.drawArrays(gl.LINE_LOOP, 0, 1000);
    gl.bindVertexArray(0);

    gl.useProgram(null);
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
    if(vao)
    {
        gl.deleteVertexArray(vao);
        vao = null;
    }

    if(vbo)
    {
        gl.deleteBuffer(vbo);
        vbo = null;
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
