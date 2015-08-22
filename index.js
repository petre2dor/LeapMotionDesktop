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

var mouseDown           = false;
var frameCount          = 0;
var touchDistanceSum    = 0;

var previousGesture     = 'none';
var previousGestureTime = 0;

function swipeDesktop(swipeDirection){
    console.log('swipe ' + swipeDirection);
    var key = '';
    switch(swipeDirection){
        case 'up':
            key = 'VK_DOWN';
            break;
        case 'down':
            key = 'VK_UP';
            break;
        case 'right':
            key = 'VK_LEFT';
            break;
        case 'left':
            key = 'VK_RIGHT';
            break;    
    }
    keyDown('VK_CONTROL');
    keyDown('VK_ALT');
    keyDown(key);

    keyUp(key);
    keyUp('VK_CONTROL');
    keyUp('VK_ALT');
}

function playPause(){
    var now = new Date();
    if( (now.getTime() - lastPlayPause) >= playPauseTimeLimit ){
        console.log('PLAY/PAUSE ----------------------------------------------');

        keyDown('VK_CONTROL');
        keyDown('VK_ALT');
        keyDown('VK_Z');

        keyUp('VK_Z');
        keyUp('VK_CONTROL');
        keyUp('VK_ALT');

        lastPlayPause = now.getTime();
    }else{
        console.log('FUCK OFFFF!!!!!!!!!!!');
    }
}

function changeVolume(direction){
    var now = new Date();
    if(direction == 'clockwise'){
        key = 'VK_UP';
    }else{
        key = 'VK_DOWN';
    }

    if( (now.getTime() - lastVolumeChange) >= changeVolumeTimeLimit ){1

        keyDown('VK_CONTROL');
        keyDown(key);

        keyUp(key);
        keyUp('VK_CONTROL');

        lastVolumeChange = now.getTime();
    }else{
        console.log('Volume FUCK OFFFF!!!!!!!!!!!');
    }   
}

function runGesture(gesture){
    var gestureConfig =  config.keyboard[gesture];
    if(gesture == previousGesture){
        wait = gestureConfig.waitBeforeSameGesture;
    }else{
        wait = gestureConfig.waitBeforeNextGesture;
    }
    var now = new Date();
    if( (now.getTime() - previousGestureTime) < wait ){
        console.log('too soon');
        return false;
    }

    var keyCombo = gestureConfig.keyCombo.split(' + ');

    console.log(keyCombo);
    // press keys
    for (var i = 0; i < keyCombo.length; i++) {
        keyDown(keyCombo[i]);
    };

    //reverse the arr and release keys
    for (var i = keyCombo.length - 1; i >= 0; i--) {
        keyUp(keyCombo[i]);
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
            if(frame.gestures.length > 0){
                //check out gestures
                frame.gestures.forEach(function(gesture){
                    // console.log(gesture.id);
                    switch (gesture.type){
                        case "circle":
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
                            runGesture('oneFingerKeyTap');
                            break;
                        case "screenTap":
                            // console.log("Screen Tap Gesture");
                            break;
                        case "swipe":
                            if(gesture.state == 'update'){
                            //Classify swipe as either horizontal or vertical
                            var isHorizontal = Math.abs(gesture.direction[0]) > Math.abs(gesture.direction[1]);
                            //Classify as right-left or up-down
                            if(isHorizontal){
                                if(gesture.direction[0] > 0){
                                    runGesture('openHandSwipeRight');
                                } else {
                                    runGesture('openHandSwipeLeft');
                                }
                            } else { //vertical
                                if(gesture.direction[1] > 0){
                                    runGesture('openHandSwipeUp');
                                } else {
                                    runGesture('openHandSwipeDown');
                                }                  
                            }
                        }
                        break;
                  }
                });

            }
            /*if(frame.pointables.length == 1){
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
