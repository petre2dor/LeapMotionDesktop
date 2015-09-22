# Load LeapJS 
`Leap = require('leapjs');` # embed JavaScript code directly in your CoffeeScript so 'Leap' is global

# Load LeapJS hand entry plugin
require('../lib/leap.hand-entry.js')


# Desktop Automation. Control the mouse, keyboard, and read the screen.
robot = require("robotjs")

# Unobtrusive desktop notification system 
growl = require('growl');


# Local gesture and actions configs
config = require('../config.json')


loopController = new Leap.Controller( 
                        inBrowser:              false, 
                        enableGestures:         true, 
                        frameEventName:         'deviceFrame', 
                        background:             true,
                        loopWhileDisconnected:  false
                    )
loopController.use('handEntry')

class MainController
    constructor: () ->
        @gestureSequence = []
        @extendedFingers = []
        @timeout         = false
        @lastGestureTime = 0
        @wait            = 0
    setFrame: (@frame) -> 

    run: ->
        now = new Date() 
        if (now.getTime() - @lastGestureTime) < @wait
            # console.log 'wait'
            # previous gesture requires a longer wait
            return

        @extendedFingers = @getExtendedFingers()
        # check if in mouse mode
        if @isInMouseMode()
            console.log "mouse mode"
            mouseAction = new MouseAction(@frame.hands[0])
            mouseAction.run()
            # move mouse/exec mouse actions
        # check if in keyboard shortcut mode / has gestures
        else
            gestureController = new Gesture(@frame, @extendedFingers)

            currentGesture = gestureController.detect()

            if currentGesture and currentGesture != @gestureSequence[@gestureSequence.length - 1] 
                # save detected time
                @lastGestureTime = new Date().getTime()
                # add it to gestureSequence
                @gestureSequence.push(currentGesture) 
                # get the config
                currentGestureConfig = config.gestures[currentGesture]
                @wait = currentGestureConfig.wait

                console.log @wait

                # check 
                for sequence in config.gestureSequences 
                    if sequence.gestures.is @gestureSequence
                        console.log "found sequence -> " + sequence.action.keyCombo
                        if sequence.action.type is "keyboard"
                            keyboard.runKeyCombo(sequence.action.keyCombo)
                        # reset gesture sequence
                        @resetGestureSequence()
                # debugger

    isInMouseMode: ->
        # (@extendedFingers.length == 2) and ("thumb" in @extendedFingers) and ("index" in @extendedFingers)
        @extendedFingers.length is 5
        
    getExtendedFingers: -> 
        extendedFingers = []
        if @frame.hands.length > 0
            hand = @frame.hands[0]
            fingerMap = ["thumb", "index", "middle", "ring", "pinky"]
            
            for finger in hand.fingers
                if finger.extended is on
                    extendedFingers.push(fingerMap[finger.type])

        return extendedFingers
    resetGestureSequence: -> 
        @wait               = 0
        @lastGestureTime    = 0
        @gestureSequence    = []      

class Gesture
    constructor: (@frame, @extendedFingers) -> 

    detect: ->
        if @frame.gestures.length > 0
            for gesture in @frame.gestures
                switch gesture.type
                    when "circle"
                        # if (@extendedFingers.length == 2) and ("thumb" in @extendedFingers) and ("index" in @extendedFingers)
                        if @extendedFingers.is ["thumb", "index"]
                            pointableID = gesture.pointableIds[0];
                            direction = @frame.pointable(pointableID).direction;
                            dotProduct = Leap.vec3.dot(direction, gesture.normal);

                            if dotProduct > 0
                                return 'oneFingerRotateClockwise'
                            else
                                return 'oneFingerRotateContraClockwise'
        return false
class MouseAction
    constructor: (@hand) ->

    run: ->
        if @hand.pinchStrength > 0
            console.log( 'hand.pinchStrength: ' + @hand.pinchStrength)
            # do click

class KeyboardAction
    runKeyCombo: (keyCombo) -> 
        #press keys
        for key in keyCombo
            robot.keyToggle(key, true)

        #release keys
        for key in keyCombo by -1
            robot.keyToggle(key, false)

processFrame = (frame) ->
    if frame.valid
        mainController.setFrame(frame)
        mainController.run()
    else
        console.log('Invalid frame')

keyboard = new KeyboardAction()
mainController = new MainController()
loopController.connect()
loopController.on('frame', processFrame)


Array::is = (o) ->
    return true if this is o
    return false if this.length isnt o.length
    for i in [0..this.length]
        return false if this[i] isnt o[i]
    true