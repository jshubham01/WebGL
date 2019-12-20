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

var vao_sphere;
var vbo_position;
var vbo_normal;
var vbo_texture;
var vbo_index;

var numElements;

var perspectiveProjectionMatrix;

var u_modelview;       // Locations for uniform matrices
var u_projection;
var u_normalMatrix;
var u_textureNum;
var u_scale;

// for texture changes
var cube_texture = 0;
var uniform_texture0_sampler;

var angle = 0.0;

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
    "in vec3 vNormal;" +
    "in vec2 vTexCooard; " +

    "out vec2 out_texture0_coord;" +

    "uniform mat4 u_model_view_matrix;" +
    "uniform mat4 u_projection_matrix;" +

    "out vec3 vNormalizedNormals;" +
    "out vec3 vobjectCoordinates;" +
    "out vec3 vEyeCoords;" +
    "out vec2 vTexCoords;" +
    "void main(void)" +
    "{" +
        "vec4 eyeCoords;" +
        "eyeCoords = u_model_view_matrix * vPosition;" +
        "gl_Position = u_projection_matrix * eyeCoords;" +
        "vNormalizedNormals = normalize(vNormal);" +
        "vobjectCoordinates = vPosition.xyz;" +
        "vEyeCoords = eyeCoords.xyz / eyeCoords.w;" +
        "vTexCoords = vTexCooard;" +
        "out_texture0_coord = vTexCooard;" +
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
    "uniform mat3 normalMatrix;" +

    "in vec3 vNormalizedNormals;" +
    "in vec3 vobjectCoordinates;" +
    "in vec3 vEyeCoords;" +
    "in vec2 vTexCoords;" +

    "in vec2 out_texture0_coord;" +
    "uniform highp sampler2D u_texture0_sampler;" +

    "out vec4 vFragColor;" +

    "void main(void)" +
    "{" +
        "vec3 N;" +
        "vec3 L;" +
        "vec3 color;" +
        "float diffusedVector;" +

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

        "N = normalize(normalMatrix * vNormalizedNormals);" +
        "L = normalize(-vEyeCoords);" +
        "diffusedVector = dot(N, L);" +
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
    gl.bindAttribLocation(shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_NORMAL, "vNormal");
    gl.bindAttribLocation(shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_TEXTURE0, "vTexCooard");

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

    console.log("Creating Texture");
    cube_texture = gl.createTexture();
    cube_texture.image = new Image();
    cube_texture.image.src = "stone.png";
    cube_texture.image.onload = function()
    {
        gl.bindTexture(gl.TEXTURE_2D, cube_texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cube_texture.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    console.log("Done With Obtaining Textures");

    //mvpUniform = gl.getUniformLocation(shaderProgramObject, "u_mvp_matrix");

    uniform_texture0_sampler = gl.getUniformLocation(shaderProgramObject, "u_texture0_sampler");

    u_modelview = gl.getUniformLocation(shaderProgramObject, "u_model_view_matrix");
    u_projection = gl.getUniformLocation(shaderProgramObject, "u_projection_matrix");
    // = gl.getUniformLocation(shaderProgramObject, "normalMatrix");

    var modelData;
    modelData = uvSphere(1.6, 64, 32);

    numElements = modelData.indices.length;
    vao_sphere = gl.createVertexArray();
    gl.bindVertexArray(vao_sphere);

    // vbo for position
    vbo_position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,vbo_position);
    gl.bufferData(gl.ARRAY_BUFFER,modelData.vertexPositions, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_VERTEX,
                           3,
                           gl.FLOAT,
                           false,0,0);
    gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_VERTEX);
    gl.bindBuffer(gl.ARRAY_BUFFER,null);

    // vbo for normals
    vbo_normal = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,vbo_normal);
    gl.bufferData(gl.ARRAY_BUFFER,
                modelData.vertexNormals,
                gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_NORMAL,
                           3,
                           gl.FLOAT,
                           false,0,0);
    gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_NORMAL);
    gl.bindBuffer(gl.ARRAY_BUFFER,null);

    // vbo for texture
    vbo_texture=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,vbo_texture);
    gl.bufferData(gl.ARRAY_BUFFER,
                modelData.vertexTextureCoords,
                gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_TEXTURE0,
                           2, // 2 is for S,T co-ordinates in our texCoords array
                           gl.FLOAT,
                           false,0,0);
    gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_TEXTURE0);
    gl.bindBuffer(gl.ARRAY_BUFFER,null);

    // vbo for index
    vbo_index=gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vbo_index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
                modelData.indices,
                gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    gl.bindVertexArray(null);

    // setting clear color
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
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(shaderProgramObject);

    var modelViewMatrix = mat4.create();
    var modelMatrix = mat4.create();
    var viewMatrix = mat4.create();

    // var ProjectionMatrix = mat4.create();
    var up_vector = vec3.create();
    var target_vector = vec3.create();
    var camera_pos = vec3.create();

    vec3.set(up_vector, 0.0, 1.0, 0.0);
    vec3.set(target_vector, 0.0, 0.0, 0.0);
    vec3.set(camera_pos, 0.0, 0.0,5.0);

    // var camera_direction = normalize(target_vector - camera_pos); // f
    // var camera_x_axis_or_right_vec = cross(camera_direction, up_vector); //s 
    // var camera_up_vec = cross(camera_x_axis_or_right_vec, camera_direction); // s f

    var camera_direction = vec3.create();
    var camera_x_axis_or_right_vec = vec3.create();
    var camera_up_vec = vec3.create();

    vec3.subract(target_vector, target_vector, camera_pos);
    // vec3.subtract(target_vector, target_vector, camera_pos);
    vec3.normalize(camera_direction, target_vector); 
    vec3.cross(camera_x_axis_or_right_vec, camera_direction, up_vector);
    vec3.cross(camera_up_vec, camera_x_axis_or_right_vec, camera_direction);

    mat4.set(viewMatrix,
            camera_x_axis_or_right_vec[0], camera_up_vec[0], -camera_direction[0], 0.0,
            camera_x_axis_or_right_vec[1], camera_up_vec[1], -camera_direction[1], 0.0,
            camera_x_axis_or_right_vec[2], camera_up_vec[2], -camera_direction[2], 0.0,
            0.0, 0.0, 0.0, 1.0
        );

    // mat4.set(viewMatrix,
    //         camera_x_axis_or_right_vec[0],camera_x_axis_or_right_vec[1] , camera_x_axis_or_right_vec[2], 0.0,
    //         camera_up_vec[0], camera_up_vec[1],  camera_up_vec[2], 0.0,
    //         -camera_direction[0], -camera_direction[1] , -camera_direction[2], 0.0,
    //         0.0, 0.0, 0.0, 1.0
    //     );

    mat4.translate(modelMatrix, modelMatrix, [0.0, 0.0, -5.0]);

    mat4.multiply(modelViewMatrix, modelMatrix, viewMatrix);

    // viewMatrix = 
    // mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -5.0]);
    // mat4.multiply(ProjectionMatrix, perspectiveProjectionMatrix, modelViewMatrix);
    gl.uniformMatrix4fv(u_modelview, false, modelViewMatrix);
    gl.uniformMatrix4fv(u_projection, false,  perspectiveProjectionMatrix);

    // bind the texture
    gl.bindTexture(gl.TEXTURE_2D, cube_texture);
    gl.uniform1i(uniform_texture0_sampler, 0);

    gl.bindVertexArray(vao_sphere);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vbo_index);
    gl.drawElements(gl.TRIANGLES, numElements, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);

    gl.useProgram(null);

    // animation loop
    angle = angle + 1.0;
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
    if(vao_sphere)
    {
        gl.deleteVertexArray(vao_sphere);
        vao_sphere = null;
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

function
uvSphere(radius, slices, stacks)
{
    radius = radius || 0.5;
    slices = slices || 32;
    stacks = stacks || 16;
    var vertexCount = (slices+1)*(stacks+1);
    var vertices = new Float32Array( 3*vertexCount );
    var normals = new Float32Array( 3* vertexCount );
    var texCoords = new Float32Array( 2*vertexCount );
    var indices = new Uint16Array( 2*slices*stacks*3 );
    var du = 2*Math.PI/slices;
    var dv = Math.PI/stacks;
    var i,j,u,v,x,y,z;
    var indexV = 0;
    var indexT = 0;
    for (i = 0; i <= stacks; i++) {
       v = -Math.PI/2 + i*dv;
       for (j = 0; j <= slices; j++) {
          u = j*du;
          x = Math.cos(u)*Math.cos(v);
          y = Math.sin(u)*Math.cos(v);
          z = Math.sin(v);
          vertices[indexV] = radius*x;
          normals[indexV++] = x;
          vertices[indexV] = radius*y;
          normals[indexV++] = y;
          vertices[indexV] = radius*z;
          normals[indexV++] = z;
          texCoords[indexT++] = j/slices;
          texCoords[indexT++] = i/stacks;
       } 
    }
    var k = 0;
    for (j = 0; j < stacks; j++) {
       var row1 = j*(slices+1);
       var row2 = (j+1)*(slices+1);
       for (i = 0; i < slices; i++) {
           indices[k++] = row1 + i;
           indices[k++] = row2 + i + 1;
           indices[k++] = row2 + i;
           indices[k++] = row1 + i;
           indices[k++] = row1 + i + 1;
           indices[k++] = row2 + i + 1;
       }
    }
    return {
        vertexPositions: vertices,
        vertexNormals: normals,
        vertexTextureCoords: texCoords,
        indices: indices
    };
 }
