/*
Module Name:
    Showing Sphere having per fragment lighting

Abstract:
    This App demonstrates lighting effects

Revision History:
    Date:   Nov 16, 2019.
    Desc:   Started

    Date:   Nov 16, 2019.
    Desc:   Done
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

var light_ambient = [0.0, 0.0, 0.0];
var light_diffuse = [1.0, 1.0, 1.0];
var light_specular = [1.0, 1.0, 1.0];   
var light_position = [100.0, 100.0, 100.0, 1.0];

var material_ambient = [0.0, 0.0, 0.0];
var material_diffuse = [1.0, 1.0, 1.0];
var material_specular = [1.0, 1.0, 1.0];
var material_shineyness = 50.0;

var sphere = null;

var perspectiveProjectionMatrix;

var modelMatrixUniform, viewMatrixUniform, projectionMatrixUniform;
var laUniform, ldUniform, lsUniform, lightPositionUniform;
var kaUniform, kdUniform, ksUniform, materialShineyUniform;
var LKeyPressedUniform;

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
        return; 
    }

    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;

    console.log("Creating Shaders, program and linking it");
    var vertexShaderSourceCode =
    "#version 300 es"+
    "\n" +
    "in vec4 vPosition;" +
    "in vec3 vNormal;" +

    "uniform mat4 u_model_matrix;" +
    "uniform mat4 u_view_matrix;" +
    "uniform mat4 u_projection_matrix;" +

    "uniform mediump int u_LKeyPressed;" +
    "uniform vec4 u_light_position;" +

    "out vec3 transformed_normals;" +
    "out vec3 light_direction; " +
    "out vec3 viewer_vector;" +

    "void main(void)" +
    "{" +
        "vec4 eyeCoordinates;" +

        "if(u_LKeyPressed == 1)" +
        "{" +
            "eyeCoordinates = u_view_matrix * u_model_matrix * vPosition;" +
            "transformed_normals = mat3(u_view_matrix * u_model_matrix) * vNormal;" +
            "light_direction = vec3(u_light_position) - eyeCoordinates.xyz;" +
            "viewer_vector = -eyeCoordinates.xyz;" +
        "}" +

        "gl_Position = u_projection_matrix * u_view_matrix * u_model_matrix * vPosition;" +
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
            console.log("In vertex shader error");
            uninitialize();
        }
    }

    var fragmentShaderSourceCode =
    "#version 300 es" +
    "\n" +
    "precision highp float;" +

    "in vec3 transformed_normals;" +
    "in vec3 light_direction; " +
    "in vec3 viewer_vector;" +

    "uniform vec3 u_La;" +
    "uniform vec3 u_Ld;" +
    "uniform vec3 u_Ls;" +
    "uniform vec3 u_Ka;" +
    "uniform vec3 u_Kd;" +
    "uniform vec3 u_Ks;" +
    "uniform float u_material_shininess;" +
    "uniform mediump int u_LKeyPressed;" +

    "out vec4 FragColor;" +
    "void main(void)" +
    "{" +
        "vec3 phong_ads_color;" +
        "if(u_LKeyPressed == 1)" +
        "{" +
            "vec3 ambient;" +
            "vec3 diffuse;" +
            "vec3 specular;" +
            "vec3 normalized_transformed_normals;" +
            "vec3 normalized_light_direction;" +
            "vec3 normalized_viewer_vector;" +
            "float tn_dot_ld;" +
            "vec3 reflection_vector;" +

            "normalized_transformed_normals = normalize(transformed_normals);" +
            "normalized_light_direction = normalize(light_direction);" +
            "normalized_viewer_vector = normalize(viewer_vector);" +
            "ambient = u_La * u_Ka;" +
            "tn_dot_ld = max(dot(normalized_transformed_normals, normalized_light_direction), 0.0);" +
            "diffuse = u_Ld * u_Kd * tn_dot_ld;" +
            "reflection_vector = reflect(-normalized_light_direction, normalized_transformed_normals);" +
            "specular = u_Ls * u_Ks * " +
                "pow(max(dot(reflection_vector, normalized_viewer_vector), 0.0), u_material_shininess);" +
            "phong_ads_color = ambient + diffuse + specular;" +
        "}" +
        "else" +
        "{" +
            "phong_ads_color = vec3(1.0, 1.0, 1.0);" +
        "}" +

        "FragColor = vec4(phong_ads_color, 1.0);" +
    "}";

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
        var error = gl.getProgramInfoLog(shaderProgramObject);
        if(error.length > 0)
        {
            alert(error);
            uninitialize();
        }
    }

    console.log("Done with Shaders, program and linking it");

    // getting Uniform locations
    modelMatrixUniform = gl.getUniformLocation(shaderProgramObject, "u_model_matrix");
    viewMatrixUniform = gl.getUniformLocation(shaderProgramObject, "u_view_matrix");
    projectionMatrixUniform = gl.getUniformLocation(shaderProgramObject, "u_projection_matrix");

    LKeyPressedUniform = gl.getUniformLocation(shaderProgramObject, "u_LKeyPressed");
    laUniform = gl.getUniformLocation(shaderProgramObject, "u_La");
    ldUniform = gl.getUniformLocation(shaderProgramObject, "u_Ld");
    lsUniform = gl.getUniformLocation(shaderProgramObject, "u_Ls");
    lightPositionUniform = gl.getUniformLocation(shaderProgramObject, "u_light_position");

    kaUniform = gl.getUniformLocation(shaderProgramObject, "u_Ka");
    kdUniform = gl.getUniformLocation(shaderProgramObject, "u_Kd");
    ksUniform = gl.getUniformLocation(shaderProgramObject, "u_Ks");
    materialShineyUniform = gl.getUniformLocation(shaderProgramObject, "u_material_shininess");

    sphere = new Mesh();
    makeSphere(sphere, 2.0, 30, 30);

    // setting clear color
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    //gl.enable(gl.CULL_FACE);

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
    mat4.perspective(perspectiveProjectionMatrix, 45.0, parseFloat(canvas.width)/parseFloat(canvas.height), 0.1, 100.0);    
}

function draw()
{
    // code
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(shaderProgramObject);

    if(true == bLKeyPressedUniform)
    {
        gl.uniform1i(LKeyPressedUniform, 1);

        // setting light properties
        gl.uniform3fv(laUniform, light_ambient);
        gl.uniform3fv(ldUniform, light_diffuse);
        gl.uniform3fv(lsUniform, light_specular);
        gl.uniform4fv(lightPositionUniform, light_position);

        gl.uniform3fv(kaUniform, material_ambient);
        gl.uniform3fv(kdUniform, material_diffuse);
        gl.uniform3fv(ksUniform, material_specular);
        gl.uniform1f(materialShineyUniform, material_shineyness);
    }
    else
    {
        gl.uniform1i(LKeyPressedUniform, 0);
    }

    var modelMatrix = mat4.create();
    var viewMatrix = mat4.create();

    mat4.translate(modelMatrix, modelMatrix, [0.0, 0.0, -10.0]);

    gl.uniformMatrix4fv(modelMatrixUniform, false, modelMatrix);
    gl.uniformMatrix4fv(viewMatrixUniform, false, viewMatrix);
    gl.uniformMatrix4fv(projectionMatrixUniform, false, perspectiveProjectionMatrix);

    sphere.draw();
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
    if(sphere)
    {
        sphere.deallocate();
        sphere = null;
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
