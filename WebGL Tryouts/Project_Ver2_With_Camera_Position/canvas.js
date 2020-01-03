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

var vao_ground;
var vbo_ground_position;
var perspectiveProjectionMatrix;

var vao_cube;
var vbo_cube_position;

var vao_sidepanels;
var vbo_cube_sidepanels_pos;

var vao_sidepanels_aside;
var vbo_cube_sidepanels_pos_aside;

var mvpUniform;
var colorUniform;
var textureFlagUniform;
var samplerUniform;

// added to add noise texture
var texture;
var angle = 0.0;

var cameraPosition;
var cameraFront;
var cameraUp;

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
    "out vec3 vobjectCoordinates;" +
    "uniform mat4 u_mvp_matrix;" +
    "void main(void)" +
    "{" +
    "gl_Position = u_mvp_matrix * vPosition;" +
    "vobjectCoordinates = vPosition.xyz;" +
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
    "uniform vec4 u_color;" +
    "out vec4 vFragColor;" +
    "uniform int texture_flag;" +

    // added before adding marble to the texture
    "uniform  highp sampler3D u_Noise;" +

    "in vec3 vobjectCoordinates;" +

    "vec3 get_marble()" +
    "{" +
        "vec4 noisevec;" +
        "float intensity;" +
        "vec3 color;" +
        "float sineval;" +

        "vec3 MarbleColor = vec3(1.0, 1.0, 1.0);" +
        "vec3 VeinColor = vec3(0.0, 0.0, 0.0);" +

        "noisevec = texture(u_Noise, vobjectCoordinates);" +

        "intensity = " +
        "abs(noisevec[0] - 0.25) +" +
        "abs(noisevec[1] - 0.125) +" +
        "abs(noisevec[2] - 0.0625) +" +
        "abs(noisevec[3] - 0.03125);" +

        "intensity = clamp(intensity * 6.0, 0.0, 1.0);" +
        "sineval = sin(vobjectCoordinates.y * 5.0 + intensity * 12.0) * 0.5 + 0.5;" +
        "color = mix(MarbleColor, VeinColor, sineval);" +
        "return color;" +
    "}" +

    "vec3 get_brick()" +
    "{" +
        "vec3 color;" +
        "vec3 brick_color = vec3(1.0, 0.3, 0.2);" +
        "vec3 morter_color = vec3(0.85, 0.86, 0.84);" +
        "vec2 brick_size = vec2(0.30, 0.15);" +
        "vec2 brick_pct = vec2(0.90, 0.85);" +
        "vec2 position, useBrick;" +

        "position = vobjectCoordinates.xy / brick_size;" +
        "if (fract(position.y * 0.5) > 0.5)" +
        "{" +
        "position.x += 0.5;" +
        "}" +

        "position = fract(position);" +
        "useBrick = step(position, brick_pct);" +
        "color = mix(morter_color, brick_color, useBrick.x * useBrick.y);" +
        "return color;" +
    "}" +

    "void main(void)" +
    "{" +
        "vec3 N;" +
        "vec3 L;" +
        "vec3 color;" +
        "float diffusedVector;" +

        "if(texture_flag == 0)" +
        "{" +
            "color = u_color.xyz;" +
        "}" +
        "else if(texture_flag == 1)" +
        "{" +
        "color = get_brick();" +
        "}" +
        "else if(texture_flag == 2){" +
            "color = get_marble();" +
        "}" +



        "vFragColor = vec4(color, 1.0);" +
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
    colorUniform = gl.getUniformLocation(shaderProgramObject, "u_color");
    textureFlagUniform = gl.getUniformLocation(shaderProgramObject, "texture_flag");
    // following sampler is added to get noise  texture
    samplerUniform = gl.getUniformLocation(shaderProgramObject, "u_Noise");

    //
    // Drawing Downplot
    //
    var groundVertices = new Float32Array([
                                            5.0,  -2.0, -3.0,
                                            -5.0, -2.0, -3.0,
                                            -5.0, -2.0, 5.0,
                                            5.0,  -2.0, 5.0,
                                        ]);

    vao_ground = gl.createVertexArray();
    gl.bindVertexArray(vao_ground);

    vbo_ground_position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_ground_position);
    gl.bufferData(gl.ARRAY_BUFFER, groundVertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_VERTEX, 3, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_VERTEX);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);

    var cubeVertices_1 = new
     Float32Array([
             2.0,  1.0, -2.0,
			-2.0,  1.0, -2.0,
			-2.0,  1.0,  2.0,
             2.0,  1.0,  2.0,

			 2.0, -3.0, -2.0 ,
			-2.0, -3.0, -2.0,
			-2.0, -3.0,  2.0,
             2.0, -3.0,  2.0,

			 -0.5,  1.0,  2.0,
			-2.0,  1.0,  2.0,
			-2.0, -3.0,  2.0,
             -0.5, -3.0,  2.0,

			 2.0,  1.0, -2.0,
			-2.0,  1.0, -2.0,
			-2.0, -3.0, -2.0,
             2.0, -3.0, -2.0,

			 2.0,  1.0, -2.0,
			 2.0,  1.0,  2.0,
			 2.0, -3.0,  2.0,
             2.0, -3.0, -2.0,

			-2.0,  1.0, -2.0,
			-2.0,  1.0,  2.0,
			-2.0, -3.0,  2.0,
            -2.0, -3.0, -2.0,
            
            2.0,  1.0,  2.0,
			0.5,  1.0,  2.0,
			0.5, -3.0,  2.0,
             2.0, -3.0,  2.0
        ]);

    vao_cube = gl.createVertexArray();
    gl.bindVertexArray(vao_cube);
    
    vbo_cube_position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_cube_position);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices_1, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_VERTEX,
        3,
        gl.FLOAT,
        false,
        0,
        0);
    gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_VERTEX);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);

    var side_panels = new Float32Array([
                    2.2,  1.0, -2.2,
                    2.0,  1.2, -2.0,
                    2.0,  1.2,  2.0,
                    2.2,  1.0,  2.0]);


    vao_sidepanels = gl.createVertexArray();
    gl.bindVertexArray(vao_sidepanels);
    vbo_cube_sidepanels_pos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_cube_sidepanels_pos);
    gl.bufferData(gl.ARRAY_BUFFER, side_panels, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_VERTEX, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_VERTEX);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);

    // getting the rect on left side of shade
    var side_panels_aside = new Float32Array([
                    2.2,  1.2, -2.0,
                    -2.0,  1.0, -2.0,
                    -2.0,  1.0,  2.0,
                     2.2,  1.2,  2.0]);

    vao_sidepanels_aside = gl.createVertexArray();
    gl.bindVertexArray(vao_sidepanels_aside);
    gl.bindVertexArray(null);


    // setting texture
    getTexture();
    cameraPosition = vec3.create();
    cameraFront = vec3.create();
    cameraUp = vec3.create();

    vec3.set(cameraPosition, 0.0, 3.0, 5.5); // 
    vec3.set(cameraFront, 0.0, 0.0, -0.01);
    vec3.set(cameraUp, 0.0, 1.0, 0.0);

    // cameraPosition = vec3.AMC_ATTRIBUTE_TEXTURE0
    // setting clear u_color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
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

    var modelMatrix = mat4.create();
    mat4.translate(modelMatrix, modelMatrix, [0.0, 0.0, -20.0]);

    var viewMatrix = mat4.create();
    var tempVec = vec3.create();
    var tempVec1 = vec3.create();
    if(cameraPosition[2]> -3.5)
    {
        vec3.scale(tempVec1, cameraFront, 0.0000000001);
        vec3.add(cameraPosition, cameraPosition, cameraFront);
        vec3.add(tempVec, cameraPosition, cameraFront);
    }
    else
    {
        vec3.add(tempVec, cameraPosition, cameraFront);
    }

    mat4.lookAt(viewMatrix, cameraPosition,  tempVec, cameraUp); // res, cam_pos, target_pos, up_vec
    mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);


    //mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -5.0]);
    mat4.multiply(modelViewProjectionMatrix, perspectiveProjectionMatrix, modelViewMatrix);
    gl.uniformMatrix4fv(mvpUniform, false, modelViewProjectionMatrix);

    gl.uniform4f(colorUniform, 0.88, 0.66, 0.37, 1.0);
    gl.uniform1i(textureFlagUniform, 0);
    gl.bindVertexArray(vao_ground);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    
    gl.bindVertexArray(null);

    // Adding Marble Texture to floor
    gl.uniform1i(textureFlagUniform, 2);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, texture);
    gl.bindVertexArray(vao_cube);
    gl.drawArrays(gl.TRIANGLE_FAN, 4, 4);
    gl.bindVertexArray(null);
    //gl.bindTexture(gl.TEXTURE_3D, texture);
    gl.uniform1i(textureFlagUniform, 0);
    // Done Adding Texture To floor


    gl.uniform1i(textureFlagUniform, 1);
    gl.bindVertexArray(vao_cube);
    //  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    //  gl.drawArrays(gl.TRIANGLE_FAN, 4, 4);
    
    gl.drawArrays(gl.TRIANGLE_FAN, 12, 4);
    gl.drawArrays(gl.TRIANGLE_FAN, 16, 4);
    gl.drawArrays(gl.TRIANGLE_FAN, 20, 4);
    gl.drawArrays(gl.TRIANGLE_FAN, 24, 4);
    gl.drawArrays(gl.TRIANGLE_FAN, 8, 4); 
    gl.bindVertexArray(null);
    gl.uniform1i(textureFlagUniform, 0);

    gl.uniform4f(colorUniform, 0.88, 0.1, 0.1, 1.0);
    gl.bindVertexArray(vao_sidepanels);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    gl.bindVertexArray(null);

    gl.uniform1i(samplerUniform, 0);

    gl.useProgram(null);

    requestAnimationFrame(draw, canvas);
}




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
    if(vao_ground)
    {
        gl.deleteVertexArray(vao_ground);
        vao_ground = null;
    }

    if(vbo_ground_position)
    {
        gl.deleteBuffer(vbo_ground_position);
        vbo_ground_position = null;
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


function
getTexture()
{
    var data = make3DNoiseTexture();
    texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);


    gl.bindTexture(gl.TEXTURE_3D, texture);
    gl.texParameterf(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameterf(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameterf(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.REPEAT);

    // here MAG and MIN filter need to check as they not worked 
    gl.texImage3D(gl.TEXTURE_3D,
         0,
          gl.RGBA,
           Noise3DTexSize,
        Noise3DTexSize,
        Noise3DTexSize,
        0,
        gl.RGBA,
         gl.UNSIGNED_BYTE,
         data);

    gl.generateMipmap(gl.TEXTURE_3D);
    //gl.bindTexture(gl.TEXTURE_3D, 0);
}


