// global variables
var canvas = null
var context = null

function main()
{
    // get <canvas> element
    canvas = document.getElementById("AMC");
    if(!canvas)
        console.log("Obtaining Canvas Failed");
    else
        console.log("Obtaining Canvas Succeded");

    console.log("Canvas Width: " + canvas.width + " And Canvas Height : " + canvas.height);

    // get 2D context
    context = canvas.getContext("2d");
    if(!context)
        console.log("Obtaining 2D Context Failed \n");
    else
        console.log("Obtaining 2D Context Succeded\n");

    // fill canvas with black color
    context.fillStyle = "black"; // "#000000"
    context.fillRect(0, 0, canvas.width, canvas.height);

    // text
    drawText("Hello World !!!")

    // register keyboard`s keydown event handler
    window.addEventListener("keydown", keyDown, false);
    window.addEventListener("click", mouseDown, false);
}

function drawText(text)
{
    // centre the text
    context.textAlign = "center"; // center horizantally
    context.textBaseline = "middle"; // center vertically

    // text font
    context.font = "48px sans-serif";

    // text color
    context.fillStyle = "white";

    // display
    context.fillText(text, canvas.width/2, canvas.height/2);
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
    }
}

function keyDown(event)
{
    switch(event.keyCode)
    {
        case 70: // f or F
            toggleFullScreen();
            // repaint
            drawText("Hello World !!!")
            break;
    }
}

function mouseDown()
{
    // for code
}
