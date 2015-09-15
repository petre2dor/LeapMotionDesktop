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

class FrameController
    constructor: (@frame) ->
        @extendedFingers = @getExtendedFingers()

    isInMouseMode: ->
        "thumb" in @extendedFingers
        
    getExtendedFingers: -> 
        extendedFingers = []
        if @frame.hands.length > 0
            hand = @frame.hands[0]
            fingerMap = ["thumb", "index", "middle", "ring", "pinky"]
            
            for finger in hand.fingers
                if finger.extended is on
                    extendedFingers.push(fingerMap[finger.type])

        return extendedFingers
            


processFrame = (frame) ->
    if frame.valid
        frameController = new FrameController(frame)
        # check if in mouse mode
        if frameController.isInMouseMode()
            console.log "mouse mode"
            # move mouse/exec mouse actions
        # check if in keyboard shortcut mode / has gestures
        else if  frameController.isInKeySchortcutMode()
            # run keyCombo for gesture
        # else 
        else
            console.log "continue to chill"
            # chill
    else
        console.log('Invalid frame')

loopController.connect()
loopController.on('frame', processFrame)