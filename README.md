# \<waifu-assistant>
## Usage
Load required the js. The script regiesters a new web component `waifu-assistant`. This can now be used in html or from js.
```
<!-- Dependencies -->
<script src="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pixi.js@6.5.2/dist/browser/pixi.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/index.min.js"></script>

<!-- The web component -->
<script type="module" src="https://cdn.jsdelivr.net/npm/waifu-assistant@1/waifu-assistant.js"></script>
```

**Initialize in html body**
```
<waifu-assistant 
  id="waifu-assistant" height="300" width="300"
  dialogue-src="./dialogue.json"
  triggers-src="./triggers.json"
  model-src="https://cdn.jsdelivr.net/npm/katze-live2d_api@1.0.0/model/Potion-Maker/Tia/index.json">
</waifu-assistant>
```

**Initialize in js**

You can also initialize the element from js, like any custom element.
```
const waifu = document.createElement("div", {is: "waifu-assistant"});
waifu.setAttribute("dialogue-src", "/dialogue.json");
waifu.setAttribute("model-src", "https://cdn.jsdelivr.net/npm/katze-live2d_api@1.0.0/model/Potion-Maker/Tia/index.json");
document.querySelector("body").appendChild(element);
```

## Model
Specify the url to the model JSON in the `model-src` attribute. Supports Cubism 2.1 and Cubism 4 Live2D models. See [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display) for more details.

## Dialogue JSON
See `demo/dialogue.json`. Contains the predefined messages. The messages can be triggered by the auto triggers specified in the json or manually by calling `WaifuAssistant.triggerDialogueById(dialogueId)`. The json consists of a list of dialogue objects. Json file loaded by setting the `dialogue-src` attribute. Example object: 
```
{
  "id": "sample message",
  "text": ["Hello!"]
}
```

Each dialogue object can contain the following fields.
* `id`: String. Identifier used for triggering this dialogue.
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
## Trigger JSON
 See `demo/triggers.json`.

**Browser event triggers**

Objects under `event_triggers` specify events to trigger dialogue on. Example:
```
{
  "event": "mouseover",
  "selector": "div",
  "dialogueId": "div examined"
}
```
This will trigger the dialogue `div examined` when the `mouseover` event is triggered on an element matching the css selector `div`. 
Note that this will only work on events that bubble up to the document level. If events are captured earlier they will not be detected.
