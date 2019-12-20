// global variables
var canvas = null
var context = null

function main()
{
    // get <canvas> element
    var canvas = document.getElementById("AMC");
    if(!canvas)
        console.log("Obtaining Canvas Failed");
    else
        console.log("Obtaining Canvas Succeded");

    console.log("Canvas Width: " + canvas.width + " And Canvas Height : " + canvas.height);

    // get 2D context
    var context = canvas.getContext("2d");
    if(!context)
        console.log("Obtaining 2D Context Failed \n");
    else
        console.log("Obtaining 2D Context Succeded\n");

    // fill canvas with black color
    context.fillStyle = "black"; // "#000000"
    context.fillRect(0, 0, canvas.width, canvas.height);

    // centre the text
    context.textAlign = "center"; // center horizantally
    context.textBaseline = "middle"; // center vertically

    // text
    var str = "Hello World !!!";

    // text font
    context.font = "48px sans-serif";

    // text color
    context.fillStyle = "white";

    // display
    context.fillText(str, canvas.width/2, canvas.height/2);

    // register keyboard`s keydown event handler
    window.addEventListener("keydown", keyDown, false);
    window.addEventListener("click", mouseDown, false);
}

function keyDown(event)
{
    alert("A Key is Pressed !!")
}

function mouseDown()
{
    alert("Mouse Is Pressed !!")
}
