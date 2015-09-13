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


/*
 * Input controller
 *
 * This controller handles processing related to mouse and keyboard input events
 *
 */
var inputController = (function() {
    var robot = require("robotjs");

    function runKeyCombo(keyCombo){
        console.log(keyCombo);
        //press keys
        for (var i = 0; i < keyCombo.length; i++) {
            robot.keyToggle(keyCombo[i], true);
        }

        //reverse the arr and release keys
        for (var i = keyCombo.length - 1; i >= 0; i--) {
            robot.keyToggle(keyCombo[i], false);
        }

    }

    return {
        runKeyCombo: runKeyCombo
    }
})();

/*
 * Notification controller
 *
 * This controller handles system notifications
 *
 */
var notificationController = (function() {
    /*
     * Unobtrusive notification system 
     */
    var growl = require('growl');

    function show(notification){
        // console.log(notification.title);
        // console.log(notification.desciption);

        if(notification.title != undefined && notification.desciption != undefined){
            growl(notification.desciption, { title: notification.title})
        }else if(notification.title != undefined){
            growl(notification.title);
        }else{
            console.log(notification.desciption);
            growl(notification.desciption);
        }
    }

    return {
        show: show
    }
})();


var gestureController = (function() {
    var previousGesture     = 'none';
    var previousGestureTime = 0;

    function run(gesture){
        var gestureConfig =  config[gesture];
        if(gesture == previousGesture){
            wait = gestureConfig.waitBeforeSameGesture;
        }else{
            wait = gestureConfig.waitBeforeNextGesture;
        }
        var now = new Date();
        if( (now.getTime() - previousGestureTime) < wait ){
            // too soon
            // console.log('trying to run gesture too soon');
            return false;
        }
        switch(gestureConfig.inputType){
            case 'mouse':
                console.log('not implemented yet');
                break;
            case 'keyboard':
                notificationController.show(gestureConfig.notification);
                inputController.runKeyCombo(gestureConfig.keyCombo);
                break;    
        }

        previousGestureTime = new Date(); 
        previousGesture = gesture;
    }
    
    return {
        run: run
    }
})();

var controller = Leap.loop(
    {
        enableGestures: true, 
        loopWhileDisconnected: false, 
        background: true,
        frameEventName: 'deviceFrame'
    }, 
    function(frame){
        if(frame.valid){

            /*var fewFramesBack = controller.frame(3);
            if(fewFramesBack.pointables.length > 0){
                var pointable = fewFramesBack.pointables[0];
                var prevStabilizedPosition = pointable.stabilizedTipPosition;
                console.log('fewFramesBack: ');
                console.log(prevStabilizedPosition[0]);
                console.log(prevStabilizedPosition[2]);
                console.log('--------');

                if(frame.pointables.length > 0){
                    // var mousePosition = pointerLocation();
                    // console.log(mousePosition);
                    var pointable = frame.pointables[0];
                    var currentStabilizedPosition = pointable.stabilizedTipPosition;
                    console.log(currentStabilizedPosition[0]);
                    console.log(currentStabilizedPosition[2]);
                    console.log('--------');

                    var diffx = prevStabilizedPosition[0] - currentStabilizedPosition[0];
                    var diffy = prevStabilizedPosition[2] - currentStabilizedPosition[2];
                    console.log('diffx' + diffx);
                    console.log('diffx' + diffx);
                    console.log('diffx' + diffx);
                }
            }*/



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
                            console.log('circle');
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
                                gestureController.run('oneFingerRotateClockwise');
                            }else{
                                gestureController.run('oneFingerRotateContraClockwise');
                            }
                            break;
                        case "keyTap":
                            // if(extendedFingers.length > 1 || extendedFingers.indexOf('index') == -1 ){
                            //     break;
                            // }
                            gestureController.run('oneFingerKeyTap');
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
                                    gestureController.run('openHandSwipe' + swipeDirection[0].toUpperCase() + swipeDirection.slice(1));
                                    break;
                                }
                            }

                    }
                });
            }

            /*if(
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
                        gestureController.run("twoFingerHoverDown");
                    }else if(index.stabilizedTipPosition[1] > 160){                        
                        gestureController.run("twoFingerHoverUp");
                    }
                }
            }*/


            /*if(extendedFingers.length == 1 && extendedFingers.indexOf('index') != -1){
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
            }*/
        }
    }
);
