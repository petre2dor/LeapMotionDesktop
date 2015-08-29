/*
 * Load LeapJS - the variable needs to be global for plugin modules
 */
 Leap = require('leapjs');


/*
 * Load LeapJS hand entry plugin
 */
require('./lib/leap.hand-entry.js');


var loopController = new Leap.Controller({
    enableGestures: true,
    frameEventName: 'deviceFrame'
});

// Use hand entry plugin. Logging hand entry is convenient since the user can be notified when leap motion is actually registering hand data.
loopController.use('handEntry');

// Remain operational when running in the background.
loopController.setBackground(true);

config = require('./config.json');

// https://github.com/joeferner/node-java
var java = require('java');

// https://docs.oracle.com/javase/7/docs/api/java/awt/Robot.html
var Robot = java.import('java.awt.Robot');
var robot = new Robot();

var graphicsEnvironment = java.callStaticMethodSync("java.awt.GraphicsEnvironment", "getLocalGraphicsEnvironment");
var graphicsDevice = java.callMethodSync(graphicsEnvironment, "getDefaultScreenDevice");
var displayMode = java.callMethodSync(graphicsDevice, "getDisplayMode");

var screenResolution = {
  height : java.callMethodSync(displayMode, "getHeight"),
  width : java.callMethodSync(displayMode, "getWidth")
}
console.log('screenResolution:' + screenResolution);

var mouseActions = ['mouseWheelUp', 'mouseWheelDown'];

var mouseDown           = false;
var frameCount          = 0;
var touchDistanceSum    = 0;

var previousGesture     = 'none';
var previousGestureTime = 0;

function runGesture(gesture){
    
    var gestureConfig =  config[gesture];

    if(gesture == previousGesture){
        wait = gestureConfig.waitBeforeSameGesture;
    }else{
        wait = gestureConfig.waitBeforeNextGesture;
    }
    var now = new Date();
    if( (now.getTime() - previousGestureTime) < wait ){
        return false;
    }

    var keyCombo = gestureConfig.keyCombo.split(' + ');

    // press keys
    for (var i = 0; i < keyCombo.length; i++) {
        console.log( 'key: ' + keyCombo[i] + ', in array: ' + mouseActions.indexOf(keyCombo[i]) );
        if( mouseActions.indexOf(keyCombo[i]) == -1 ){
            keyDown(keyCombo[i]);
        }
    }

    // do mouse actions
    for (var i = 0; i < keyCombo.length; i++) {
        if( mouseActions.indexOf(keyCombo[i]) > -1 ){
            switch (keyCombo[i]) {
                case 'mouseWheelUp':
                    robot.mouseWheel(-1);
                    break;
                case 'mouseWheelDown':
                    robot.mouseWheel(1);
                    break;
                default:
                    console.log('No action for ' + keyCombo[i]);
                    break;
            }
        }
    }

    //reverse the arr and release keys
    for (var i = keyCombo.length - 1; i >= 0; i--) {
        if(mouseActions.indexOf(keyCombo[i]) == -1){
            keyUp(keyCombo[i]);
        }
    };

    now = new Date();
    previousGesture     = gesture;
    previousGestureTime = now.getTime();
}

function keyDown(key){
    robot.keyPressSync(java.getStaticFieldValue("java.awt.event.KeyEvent", key));
}

function keyUp(key){
    robot.keyReleaseSync(java.getStaticFieldValue("java.awt.event.KeyEvent", key));
}


// var frameCountSwipeGesture = 0;
var controller = Leap.loop(
    {
        enableGestures: true, 
        loopWhileDisconnected: false, 
        background: true,
        frameEventName: 'deviceFrame'
    }, 
    function(frame){
        if(frame.valid){
            var extendedFingers = [];
            if(frame.hands.length > 0){
                var hand = frame.hands[0];
                var fingerMap = ["thumb", "index", "middle", "ring", "pinky"];
                var i = 0;
                for(var f = 0; f < hand.fingers.length; f++){
                    var finger = hand.fingers[f];
                    if(finger.extended){
                        extendedFingers[i] = fingerMap[finger.type];
                        i++;
                    }
                }
            }

            if(frame.gestures.length > 0){
                //check out gestures
                frame.gestures.forEach(function(gesture){
                    // console.log(gesture.id);
                    switch (gesture.type){
                        case "circle":
                            if(
                                extendedFingers.length > 2 || 
                                extendedFingers.indexOf('thumb') == -1 || 
                                extendedFingers.indexOf('index') == -1 
                            ){
                                // get out
                                break;
                            }
                            var direction;
                            var pointableID = gesture.pointableIds[0];
                            var direction = frame.pointable(pointableID).direction;
                            var dotProduct = Leap.vec3.dot(direction, gesture.normal);

                            if (dotProduct  >  0){
                                runGesture('oneFingerRotateClockwise');
                            }else{
                                runGesture('oneFingerRotateContraClockwise');
                            }
                            break;
                        case "keyTap":
                            // if(extendedFingers.length > 1 || extendedFingers.indexOf('index') == -1 ){
                            //     break;
                            // }
                            runGesture('oneFingerKeyTap');
                            break;
                        case "screenTap":
                            // console.log("Screen Tap Gesture");
                            break;
                        case "swipe":
                            if(gesture.state == 'update'){
                                var swipeDirection = '';

                                //Classify swipe as either horizontal or vertical
                                var isHorizontal = Math.abs(gesture.direction[0]) > Math.abs(gesture.direction[1]);
                                //Classify as right-left or up-down
                                if(isHorizontal){
                                    if(gesture.direction[0] > 0){
                                        swipeDirection = 'right';
                                    } else {
                                        swipeDirection = 'left';
                                    }
                                } else { //vertical
                                    if(gesture.direction[1] > 0){
                                        swipeDirection = 'up';
                                    } else {
                                        swipeDirection = 'down';
                                    }                  
                                }
                                //open hand swipe
                                if(extendedFingers.length == 5){
                                    console.log('openHandSwipe' + swipeDirection[0].toUpperCase() + swipeDirection.slice(1));
                                    runGesture('openHandSwipe' + swipeDirection[0].toUpperCase() + swipeDirection.slice(1));
                                    break;
                                }
                            }

                    }
                });
            }

            if(
                extendedFingers.length == 2 && 
                extendedFingers.indexOf('index') != -1 && 
                extendedFingers.indexOf('middle') != -1 
            ){
                var index = hand.indexFinger;
                var middle = hand.middleFinger;
                if(Math.abs(index.stabilizedTipPosition[1] - middle.stabilizedTipPosition[1]) < 20){
                    console.log("index " + index.stabilizedTipPosition);
                    console.log("middle " + middle.stabilizedTipPosition);
                    if(index.stabilizedTipPosition[1] < 100){
                        runGesture("twoFingerHoverDown");
                    }else if(index.stabilizedTipPosition[1] > 160){                        
                        runGesture("twoFingerHoverUp");
                    }
                }
            }


            /*if(frame.pointables.length > 1){
                frameCount++;

                var pointable = frame.pointables[0];
                var stabilizedPosition = pointable.stabilizedTipPosition;
                var tipPosition = pointable.tipPosition;
                console.log('touchDistan: ' + pointable.touchDistance);
                // console.log('touchZone  : ' + pointable.touchZone);

                var interactionBox = frame.interactionBox;
                var normalizedPosition = interactionBox.normalizePoint(stabilizedPosition, true);

                var x = screenResolution.width * normalizedPosition[0];
                var y = screenResolution.height * (1 - normalizedPosition[1]);
                // console.log(x);
                // console.log(y);
                // console.log('   ---   ');
                if(pointable.touchDistance >= 0.3 ){
                    if(mouseDown){
                        mouseDown = false;
                        robot.mouseReleaseSync(java.getStaticFieldValue("java.awt.event.InputEvent", "BUTTON1_DOWN_MASK"));
                        console.log("Mouse1 up!");
                    }
                    robot.mouseMoveSync(parseInt(x), parseInt(y));
                }else if(pointable.touchDistance <= 0){
                    if(!mouseDown){
                        mouseDown = true;
                        robot.mousePressSync(java.getStaticFieldValue("java.awt.event.InputEvent", "BUTTON1_DOWN_MASK"));
                        console.log("Mouse1 down!");
                    }
                }else{
                    if(mouseDown){
                        mouseDown = false;
                        robot.mouseReleaseSync(java.getStaticFieldValue("java.awt.event.InputEvent", "BUTTON1_DOWN_MASK"));
                        console.log("Mouse1 up!");
                    }
                }
                touchDistanceSum += pointable.touchDistance;
                if( frameCount % 1000 == 0){
                    console.log('touchDistance average ' + (touchDistanceSum/frameCount));
                }
            }*/
        }
    }
);
