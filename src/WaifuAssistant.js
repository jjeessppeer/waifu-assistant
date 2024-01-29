export class WaifuAssistant extends HTMLElement {
  static observedAttributes = ["dialogue-src", "triggers-src", "model-src", "width", "height"];

  constructor() {
    super();
    this.classList.add('waifu-assistant');
    // this.classList.add('speaking');
    this.classList.add('hidden');
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = `
        <div part="container">
          <div part="speech-bubble">
          </div>
          <canvas></canvas>
        </div>
      `;

    const style = document.createElement("style");
    style.textContent = WaifuAssistant.styleText;
    this.appendChild(style);

    this.speechBubble = shadowRoot.querySelector('::part(speech-bubble)');
    this.dialogueTriggers = {};
    this.dialogueEntries = {};

    this.messageQueue = [];
    this.messageStartTimestamp = null;

    this.dialogueCooldowns = {};
    this.displayRunning = false;
    this.currentMessageText = null;

    // Initialize pixi app.
    const canvas = shadowRoot.querySelector('canvas');
    this.pixiApp = new PIXI.Application({
      view: canvas,
      autoStart: true,
      resizeTo: this,
      backgroundAlpha: 0
    });

    // TODO: do with setTimeout callbacks on message expiration, no infinite ticking required.
    setInterval(this.updateDialogue, 500);
  }

  connectedCallback() {
  }

  disconnectedCallback() {
    for (const eventTrigger in this.dialogueTriggers) {
      console.log(eventTrigger);
      document.removeEventListener(eventTrigger, this.eventTriggered);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "dialogue-src":
        // TODO: clear old dialogue?
        this.loadDialogue(newValue);
        break;
      case "triggers-src":
        this.loadTriggers(newValue);
        break;
      case "model-src":
        this.loadLive2dModel(newValue);
        break;
      case "width":
        this.style.width = `${newValue}px`;
        this.pixiApp.resize();
        break;
      case "height":
        this.style.height = `${newValue}px`;
        this.pixiApp.resize();
        break;
    }
  }

  async loadLive2dModel(modelSrc) {
    const canvas = this.shadowRoot.querySelector('canvas');
    const model = await PIXI.live2d.Live2DModel.from(modelSrc);
    this.pixiApp.stage.addChild(model);

    // Scale model to fit canvas.
    const scale = canvas.height / model.internalModel.height * 1;
    model.scale.set(scale);
    model.x = canvas.width / 2 - model.internalModel.width / 2 * scale;

    this.model = model;
    this.classList.remove('hidden');
  }

  async loadDialogue(dialogueSrc) {
    const response = await fetch(dialogueSrc);
    const dialogueData = await response.json();
    // for (const trigger of dialogueData['auto_triggers']) {
    //   this.addDialogueTrigger(trigger.event, trigger.selector, trigger.dialogueId);
    // }
    console.log(dialogueData)

    for (const message of dialogueData['dialogue']) {
      this.dialogueEntries[message.id] = message;
    }

    this.triggerDialogueById('welcome');
  }

  async loadTriggers(triggersSrc) {
    const response = await fetch(triggersSrc);
    const triggersData = await response.json();
    for (const trigger of triggersData['event_triggers']) {
      this.addDialogueTrigger(trigger.event, trigger.selector, trigger.dialogueId);
    }
  }

  addDialogueTrigger(eventType, selector, dialogueId) {
    if (!(eventType in this.dialogueTriggers)) {
      this.dialogueTriggers[eventType] = [];
    }
    this.dialogueTriggers[eventType].push({
      selector: selector,
      dialogueId: dialogueId
    });
    document.addEventListener(eventType, this.eventTriggered);
  }

  triggerDialogueById(dialogueId) {
    let dialogueObj;
    if (dialogueId in this.dialogueEntries) {
      dialogueObj = this.dialogueEntries[dialogueId];
    }
    else {
      // dialogueObj = {
      //     text: [`[${dialogueId}]`]
      // };
      return;
    }
    this.triggerDialogue(dialogueObj);
  }

  triggerDialogue(dialogueObj) {
    const LETTERS_PER_MINUTE = 100 * 5;
    const SECONDS_PER_LETTER = 1 / (LETTERS_PER_MINUTE / 60);
    const id = dialogueObj.id;
    if (id in this.dialogueCooldowns) {
      const cooldown = dialogueObj.cooldown ?? 120;
      const timespan = (Date.now() - this.dialogueCooldowns[dialogueObj.id]) / 1000;
      if (timespan < cooldown || cooldown === -1) return;
    }
    this.dialogueCooldowns[id] = Date.now();

    let messages = [];
    for (let i = 0; i < dialogueObj.text.length; i++) {
      const text = dialogueObj.text[i];
      const duration = (dialogueObj.duration && dialogueObj.duration[i]) ?? text.length * SECONDS_PER_LETTER + 2;
      const motion = dialogueObj.motion && dialogueObj.motion[i];
      const expression = dialogueObj.expression && dialogueObj.expression[i];
      messages.push({
        text: text,
        duration: duration,
        motion: motion,
        expression: expression
      });
    }

    const behavior = dialogueObj.behavior ?? 'SEQUENCE';
    if (behavior === 'RANDOM') {
      const idx = Math.floor(Math.random() * messages.length);
      messages = [messages[idx]];
    }

    const priority = dialogueObj.priority ?? 'IMMEDIATE';
    switch (priority) {
      case 'IMMEDIATE':
        this.messageQueue = messages;
        this.messageStartTimestamp = null;
        break;
      case 'QUEUE':
        this.messageQueue = this.messageQueue.concat(messages);
        break;
      case 'IS_SILENT':
        if (this.messageQueue.length === 0)
          this.messageQueue = messages;
        break;
    }
  }

  updateDialogue = () => {
    if (this.messageQueue.length === 0) {
      return;
    }

    let newMessage = false;

    // No current message displayed. Next should be activated.
    if (this.messageStartTimestamp === null) {
      this.messageStartTimestamp = Date.now();
      newMessage = true;
      // Display dialogue box.
      this.classList.add('speaking');
    }

    // If message duration has expired go to the next one.
    const messageDisplayDuration = (Date.now() - this.messageStartTimestamp) / 1000;
    if (messageDisplayDuration > this.messageQueue[0].duration) {
      this.messageQueue.shift();
      this.messageStartTimestamp = Date.now();
      newMessage = true;

      // There is no next queued message.
      if (this.messageQueue.length === 0) {
        this.messageStartTimestamp = null;
        this.classList.remove('speaking');
        return;
      }
    }

    if (newMessage) {
      const message = this.messageQueue[0];
      if (message.motion) {
        this.model.motion(message.motion);
      }

      this.renderingText = message.text;
      this.renderingTextIdx = 0;
      this.speechBubble.textContent = "";
      if (!this.displayRunning) {
        this.displayRunning = true;
        setTimeout(() => this.displayText(), 200);
      }

    }
  }

  displayText = (delay = 40) => {
    const partialText = this.renderingText.substring(0, this.renderingTextIdx);
    this.renderingTextIdx += 1;
    this.speechBubble.textContent = partialText;
    if (this.renderingText.length > partialText.length) {
      setTimeout(() => this.displayText(delay), delay);
    }
    else {
      this.displayRunning = false;
    }
  }

  eventTriggered = (evt) => {
    const triggers = this.dialogueTriggers[evt.type];
    if (!Boolean(triggers)) return;
    for (const trigger of triggers) {
      const matchingElement = evt.target.closest(trigger.selector);
      const matched = Boolean(matchingElement);
      if (!matched) continue;
      this.triggerDialogueById(trigger.dialogueId);
    }
  }

  // toggleDisplayBounds() {
  //   const foreground = PIXI.Sprite.from(PIXI.Texture.WHITE);
  //   foreground.width = this.model.internalModel.width;
  //   foreground.height = this.model.internalModel.height;
  //   foreground.alpha = 0.2;
  //   this.model.addChild(foreground);
  // }
  // toggleDisplayAreas() {
  //   const hitAreaFrames = new PIXI.live2d.HitAreaFrames();
  //   this.model.addChild(hitAreaFrames);
  // }
  static get styleText() {
    return `
    waifu-assistant {
      position: fixed;
      z-index: 1000;
      height: 300px;
      width: 300px;
      bottom: 0;
      transition: bottom 0.9s ease-in-out;
      /* pointer-events: none; */
      visibility: visible;
    }
    
    waifu-assistant.hidden {
      bottom: -50%;
      visibility: hidden;
    }
    
    waifu-assistant::part(speech-bubble) {
      position: absolute;
      font-family: Lato, 'PingFang SC', 'Microsoft YaHei', sans-serif;
      font-size: 14px;
      line-height: 24px;
      text-overflow: ellipsis;
    
      width: 85%;
      min-height: 70px;
      margin: -30px 20px;
      padding: 5px 10px;
      border: 1px solid rgba(224, 186, 140, .62);
      border-radius: 12px;
    
      box-shadow: 0 3px 15px 2px rgba(191, 158, 118, .2);
      animation: shake 30s ease-in-out 1s infinite;
      background-color: rgba(234, 214, 186, .5);
      overflow: hidden;
    
      opacity: 0;
      transition: opacity 1s;
    }
    
    waifu-assistant.speaking::part(speech-bubble) {
      opacity: 1;
    }
    
    @keyframes shake {
      0%,
      100% {
        transform: translate(-1.5px, -0.5px) rotate(0.5deg);
      }
      10% {
        transform: translate(2.5px, -1.5px) rotate(0.5deg);
      }
      20% {
        transform: translate(0.5px, -1.5px) rotate(-1.5deg);
      }
      30% {
        transform: translate(-2.5px, 2.5px) rotate(-0.5deg);
      }
      40% {
        transform: translate(-0.5px, -1.5px) rotate(0.5deg);
      }
      50% {
        transform: translate(2.5px, -0.5px) rotate(1.5deg);
      }
      60% {
        transform: translate(1.5px, -0.5px) rotate(-0.5deg);
      }
      70% {
        transform: translate(-1.5px, -2.5px) rotate(-0.5deg);
      }
      80% {
        transform: translate(2.5px, -2.5px) rotate(-0.5deg);
      }
      90% {
        transform: translate(-0.5px, 2.5px) rotate(-0.5deg);
      }
    }
    `;
  }
}