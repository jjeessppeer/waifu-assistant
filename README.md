# \<waifu-assistant>
## Usage
Load required js.
```
<head>
    <!-- Required for live2d rendering -->
    <script src="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/pixi.js@6.5.2/dist/browser/pixi.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/index.min.js"></script>

    <!-- The assistant -->
    <script src="waifu-assistant.js" defer></script>
</head>
```
The script regiesters a new custom element `waifu-assistant`. This can now be used in html or from js.

**Initialize from html**
```
<body>
    <waifu-assistant
        dialogue-src="./dialogue_example.json" 
        model-src="https://cdn.jsdelivr.net/npm/katze-live2d_api@1.0.0/model/Potion-Maker/Tia/index.json">
    </waifu-assistant>
</body>
```

**Initialize from js**

You can also initialize the element from js, like any custom element.
```
const waifu = document.createElement("div", {is: "waifu-assistant"});
waifu.setAttribute("dialogue-src", "/js/dialogue.json");
waifu.setAttribute("model-src", "https://cdn.jsdelivr.net/npm/katze-live2d_api@1.0.0/model/Potion-Maker/Tia/index.json");
document.getElementById("some-parent-element").appendChild(element);
```

# Defining dialogue JSON
Json file loaded by setting the `dialogue-src` attribute. See `demo/dialogue_example.json` for example.

**Event triggers**

Specify html events to trigger dialogue on. For example:
```
{
    "event": "mouseover",
    "selector": ".someclass",
    "dialogueId": "sample message"
}
```
This will trigger the dialogue `sample message` when the mouseover event is triggered on an element matching the css selector `.someclass`. 
Note that this will only work on events that bubble up to the document level. If events are captured earlier they will not be detected.

**Dialogue**

Contains the predefined messages. The messages can be triggered by the auto triggers specified in the json or by calling `WaifuAssistant.triggerDialogue(dialogueId)`. Example: 
```
{
  "id": "sample message",
  "text": ["Hello!"]
}
```

Each dialogue object can contain the following fields.
* `text`: Array of strings. Contains the sequence of messages to be displayed.
* `duration` (optional): Array of numbers. Specifies time spent on each message in seconds. Use element null for automatic timing.
* `motion` (optional): Array of keys to model motion to be taken during message.
* `expression` (optional): Array of keys to model expression to be used during message.
* `behavior` (optional): String `SEQUENCE|RANDOM`. Default `SEQUENCE`.
    * `SEQUENCE`: Messages will be displayed in sequence.
    * `RANDOM`: One message will be displayed at random.
* `priority` (optional): String `IMMEDIATE|IS_SILENT|INTERRUPT|QUEUE`. Dictates how the message is pushed. Default `IMMEDIATE`.
    * `IMMEDIATE`: clears the message queue and immediately displays message.
    * `IS_SILENT`: message only pushed if there is no current message being displayed.
    * `INTERRUPT`: immedietly displays message but then restores the previous queue.
    * `QUEUE`: adds the message to the end of the message queue.
* `cooldown` (optional): Number. Seconds until this message may be triggered again. `-1` for never repeating again.
* `chance` (optional): Number from 0 to 1. Chance that the dialogue will display on trigger. Cooldown still applies on failed roll.

**Trigger dialogue from js**

You can easily trigger dialogue manually from js. Either messages defined in the json or custom ones.
```
const waifu = document.getElementById("waifu-assistant");
waifu.triggerDialogueById("welcome message"); // Triggers the message with id "welcome message" from the loaded json.
waify.triggerDialogue({
    text: ["hello", "there"]
}); // Triggers the specified dialogue object. Same object specification as detailed in #Dialogue.
```


