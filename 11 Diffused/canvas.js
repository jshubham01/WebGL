// global variables
var canvas = null
// webgl context
var gl = null
var bFullScreen = false;
var canvas_original_width;
var canvas_original_height;

// const WebGLMacros =
// {
//     AMC_ATTRIBUTE_VERTEX : 0,
//     AMC_ATTRIBUTE_COLOR : 1,
//     AMC_ATTRIBUTE_NORMAL : 2,
//     AMC_ATTRIBUTE_TEXTURE0 : 3
// };

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

var vao_cube;

var vbo_cube_position;
var vbo_cube_normals;

var modelViewMatrixUniform;
var projectionMatrixUniform;

var LKeyPressedUniform;
var ldUniform;
var kdUniform;
var lightPositionUniform;

var uniform_texture0_sampler;   

var pyramid_texture = 0;
var cube_texture = 0;

var anglePyramid = 0.0;
var angleCube = 0.0;

var perspectiveProjectionMatrix;

var bLKeyPressedUniform = false;

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

    console.log("Creating Shaders, program and linking it");
    var vertexShaderSourceCode =
    "#version 300 es"+
    "\n" +
    "in vec4 vPosition;" +
    "in vec3 vNormal;" +
    "uniform mat4 u_model_view_matrix;" +
    "uniform mat4 u_projection_matrix;" +
    "uniform mediump int u_LKeyPressed;" +
    "uniform vec3 u_Ld;" +
    "uniform vec3 u_Kd;" +
    "uniform vec4 u_light_position;" +
    "out vec3 diffuse_light;" +

    "void main(void)" +
    "{" +
        "vec4 eyeCoordinates;" +
        "vec3 tnorm;" +
        "vec3 s;" +

        "if(1 == u_LKeyPressed)" +
        "{" +
            "eyeCoordinates = u_model_view_matrix * vPosition;" +
            "tnorm = normalize(mat3(u_model_view_matrix) * vNormal);" +
            "s = normalize(vec3(u_light_position - eyeCoordinates));" +
            "diffuse_light  = u_Ld * u_Kd * max(dot(s, tnorm), 0.0);" +
        "}" +

        "gl_Position = u_projection_matrix * u_model_view_matrix * vPosition;" +
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
    "#version 300 es" +
    "\n" +
    "precision highp float;" +
    "in vec3 diffuse_light;" +
    "out vec4 FragColor;" +
    "uniform int u_LKeyPressed;" +
    "void main(void)" +
    "{" +
        "vec4 color;" +
        "if(1 == u_LKeyPressed)" +
        "{" +
            "color = vec4(diffuse_light, 1.0);"+
        "}"+
        "else" +
        "{" +
            "color = vec4(1.0, 1.0, 1.0, 1.0);" +
        "}" +

        "FragColor = color;" +
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

    // pre-link binding of shader program object with vertex shader attributes
    gl.bindAttribLocation(shaderProgramObject,
        WebGLMacros.AMC_ATTRIBUTE_VERTEX,
        "vPosition");

    gl.bindAttribLocation(shaderProgramObject,
        WebGLMacros.AMC_ATTRIBUTE_NORMAL,
        "vNormal");

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

    console.log("Done with Shaders, program and linking it");


    // getting Uniform locations
    modelViewMatrixUniform = gl.getUniformLocation(shaderProgramObject, "u_model_view_matrix");
    projectionMatrixUniform = gl.getUniformLocation(shaderProgramObject, "u_projection_matrix");
    LKeyPressedUniform = gl.getUniformLocation(shaderProgramObject, "u_LKeyPressed");
    ldUniform = gl.getUniformLocation(shaderProgramObject, "u_Ld");
    kdUniform = gl.getUniformLocation(shaderProgramObject, "u_Kd");
    lightPositionUniform = gl.getUniformLocation(shaderProgramObject, "u_light_position");

    var cubeVertices = new
     Float32Array([
             1.0, 1.0, -1.0,
            -1.0, 1.0, -1.0,
            -1.0, 1.0,  1.0,
            1.0, 1.0,  1.0,

             1.0, -1.0, -1.0,
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

    for(var i=0; i<72; i++)
    {
        if(cubeVertices[i] < 0.0)
            cubeVertices[i] = cubeVertices[i] + 0.25;
        else if(cubeVertices[i] > 0.0)
            cubeVertices[i] = cubeVertices[i] - 0.25;
        else
            cubeVertices[i] = cubeVertices[i];
    }

    var cubeNormals =
     new Float32Array([
        // top
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,

        // bottom
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,

        // front
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,

        // back
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,

        // left
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,

        // right
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0
    ]);

    vao_cube = gl.createVertexArray();
    gl.bindVertexArray(vao_cube);

    vbo_cube_position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_cube_position);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_VERTEX,
        3,
        gl.FLOAT,
        false,
        0,
        0);
    gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_VERTEX);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);  
    
    vbo_cube_normals = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_cube_normals);
    gl.bufferData(gl.ARRAY_BUFFER, cubeNormals, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_NORMAL,
        3,
        gl.FLOAT,
        false,
        0,
        0);
    gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_NORMAL);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
    gl.bindVertexArray(null);

    // setting clear color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.LEQUAL);
    // gl.enable(gl.CULL_FACE);0

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

    if(true == bLKeyPressedUniform)
    {
        gl.uniform1i(LKeyPressedUniform, 1);
        gl.uniform3f(ldUniform, 1.0, 1.0, 1.0);
        gl.uniform3f(kdUniform, 0.5, 0.5, 0.5);

        var lightPosition = [0.0, 0.0, 2.0, 1.0];
        gl.uniform4fv(lightPositionUniform, lightPosition);
    }
    else
    {
        gl.uniform1i(LKeyPressedUniform, 0);
    }

    var modelViewMatrix = mat4.create();
    var modelViewProjectionMatrix = mat4.create();

    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -4.0]);

    mat4.rotateX(modelViewMatrix, modelViewMatrix, degToRad(angleCube));
    mat4.rotateY(modelViewMatrix, modelViewMatrix, degToRad(angleCube));
    mat4.rotateZ(modelViewMatrix, modelViewMatrix, degToRad(angleCube));

    gl.uniformMatrix4fv(modelViewMatrixUniform, false, modelViewMatrix);
    gl.uniformMatrix4fv(projectionMatrixUniform, false, perspectiveProjectionMatrix);

    gl.bindVertexArray(vao_cube);
    gl.drawArrays(gl.TRIANGLE_FAN, 0,  4);
    gl.drawArrays(gl.TRIANGLE_FAN, 4,  4);
    gl.drawArrays(gl.TRIANGLE_FAN, 8,  4);
    gl.drawArrays(gl.TRIANGLE_FAN, 12, 4);
    gl.drawArrays(gl.TRIANGLE_FAN, 16, 4);
    gl.drawArrays(gl.TRIANGLE_FAN, 20, 4);
    gl.bindVertexArray(null);

    gl.useProgram(null);

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

        case 76:
            if(false == bLKeyPressedUniform)
                bLKeyPressedUniform = true;
            else
                bLKeyPressedUniform = false;
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

    if(cube_texture)
    {
        gl.deleteTexture(cube_texture);
        cube_texture = 0;
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

    if(vbo_cube_normals)
    {
        gl.deleteVertexArray(vbo_cube_normals);
        vbo_cube_normals = null;
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
