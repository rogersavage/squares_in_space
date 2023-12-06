debug = null;
function show_debug() {
	let context = document.querySelector("canvas").getContext("2d");
  context.font = "18px Retroscape"; 
  context.fillStyle = "white";
  context.fillText(debug, 0, 48);
}

flag = false;

////////////////////////////////////////////////////////////////////////////////
// Input
////////////////////////////////////////////////////////////////////////////////

class Input {
	
	static init(settings) {
		this.settings = settings;
		window.addEventListener("keydown", this.keyDown.bind(this), false);
		window.addEventListener("keyup", this.keyUp.bind(this), false);
	}

	static poll() {
		GameEvent.add(this.settings.getPlayer(), "playerInput", this.settings.keys);
	}

	static keyDown(event) {
		if(this.settings.mapping.hasOwnProperty(event.keyCode)) {
			this.settings.keys[this.settings.mapping[event.keyCode]] = true;
		}
	}

	static keyUp(event) {
		if(this.settings.mapping.hasOwnProperty(event.keyCode)) {
			this.settings.keys[this.settings.mapping[event.keyCode]] = false;
		}
		else if(this.settings.menuKeys.hasOwnProperty(event.keyCode)) {
			this.settings.menuEvents[this.settings.menuKeys[event.keyCode]]();
		}
	}

}

////////////////////////////////////////////////////////////////////////////////
// GameEvent
////////////////////////////////////////////////////////////////////////////////

class GameEvent {
	
	static pending = [];

	static add(recipient, eventType, eventArguments) {
		this.pending.push(new GameEvent(recipient, eventType, eventArguments));
	}

	static processAll() {
		while(this.pending.length) {
			const gameEvent = this.pending.pop();
			if(gameEvent.recipient){
				gameEvent.recipient.handleEvent(gameEvent.eventType,
					gameEvent.eventArguments);
			}
		}
		/* Go again if these events generated any new events */
		if(this.pending.length) this.processAll();
	}

	constructor(recipient, eventType, eventArguments) {
		this.recipient = recipient;
		this.eventType = eventType;
		this.eventArguments = eventArguments;
	}
}

////////////////////////////////////////////////////////////////////////////////
// Output
////////////////////////////////////////////////////////////////////////////////

class Output {

	static init(settings) {
		this.settings = settings;
		const retroFont = new FontFace("Retroscape",
			"url(BungeeHairline-Regular.ttf");
		retroFont.load().then((font) =>
			document.fonts.add(font));
	}

	static wipeWindow() {
		let windowWidth = this.settings.getWindowSize().width;
		let windowHeight = this.settings.getWindowSize().height;
		setCanvasSize(windowWidth, windowHeight);
		this.settings.context.fillStyle = this.settings.refreshColor;
		this.settings.context.fillRect(0, 0, windowWidth, windowHeight);
	}

	/* Maintain aspect ratio, draw black bars on sides or top/bottom if needed */
	static wipeGameArea() {
		const referenceRatio = this.settings.referenceWidth / 
			this.settings.referenceHeight;
		const windowWidth = this.settings.getWindowSize().width;
		const windowHeight = this.settings.getWindowSize().height;
		const currentRatio = windowWidth / windowHeight;
		
		if(currentRatio >= referenceRatio) {
			this.gameAreaHeight = windowHeight;
			this.gameAreaWidth = this.gameAreaHeight * referenceRatio;
			this.gameAreaYOffset = 0;
			this.gameAreaXOffset = (windowWidth - this.gameAreaWidth) / 2;
		} else {
			this.gameAreaWidth = windowWidth;
			this.gameAreaHeight = this.gameAreaWidth / referenceRatio;
			this.gameAreaXOffset = 0;
			this.gameAreaYOffset = (windowHeight - this.gameAreaHeight) / 2;
		}

		this.settings.context.fillStyle = this.settings.gameAreaRefreshColor;
		this.settings.context.fillRect(
			this.gameAreaXOffset, this.gameAreaYOffset,
			this.gameAreaWidth, this.gameAreaHeight);
	}

	static getGameArea() {
		return({
			gameAreaWidth: this.gameAreaWidth,
			gameAreaHeight: this.gameAreaHeight,
			gameAreaXOffset: this.gameAreaXOffset,
			gameAreaYOffset: this.gameAreaYOffset});
	}

	static refresh() {
		this.wipeWindow();
		this.wipeGameArea();
		this.settings.drawShapes(this.settings);
		GameSession.displayScore();
		GameSession.displayMenu();
		GameSession.displayHelp();
		//show_debug();
	}

	static drawText(text, x, y, size, color) {
		const hRatio = this.gameAreaWidth / this.settings.referenceWidth;
		x *= hRatio;
		const vRatio = this.gameAreaHeight / this.settings.referenceHeight;
		y *= vRatio;
		x += this.gameAreaXOffset;
		y += this.gameAreaYOffset;
		size *= vRatio;
		this.settings.context.font = `normal 600 ${size}px Retroscape`;
		this.settings.context.fillStyle = color;
		this.settings.context.fillText(text, x, y + size);
	}

	static drawButton(text, x, y, size, textColor, outlineColor) {
		this.drawText(text, x, y, size, textColor);
		const hRatio = this.gameAreaWidth / this.settings.referenceWidth;
		x *= hRatio;
		const vRatio = this.gameAreaHeight / this.settings.referenceHeight;
		y *= vRatio;
		x += this.gameAreaXOffset;
		y += this.gameAreaYOffset;
		size *= vRatio;
		const letterWidth = size * 0.75;
		const w = (text.length + 1) * letterWidth;
		const h = size * 1.5;
		x -= letterWidth / 2;
		this.settings.context.strokeStyle = outlineColor;
		this.settings.context.strokeRect(x, y, w, h);
	}

}

////////////////////////////////////////////////////////////////////////////////
// Shape
////////////////////////////////////////////////////////////////////////////////

class Shape {

	static members = [];

	static drawAll(outputSettings) {
		if(this.members.length > 0) {
			for(let member of this.members) {
				member.draw(outputSettings);
			}
		}
	}

	static add(shape) {
		this.members.push(shape);
		this.members.sort((a, b,) => a.settings.drawDepth - b.settings.drawDepth);
	}

	static remove(shape) {
		if(this.members.includes(shape)) {
			this.members.splice(this.members.indexOf(shape), 1);
		}
	}

	constructor(settings) {
		this.settings = settings;
		this.color = settings.color;
		this.x = settings.x,
		this.y = settings.y,
		this.w = settings.w,
		this.h = settings.h,
		Shape.add(this);
	}

	setPos(pos) {
		this.x = pos.x;
		this.y = pos.y;
	}

	remove(){
		Shape.remove(this);
	}
}

////////////////////////////////////////////////////////////////////////////////
// Rectangle
////////////////////////////////////////////////////////////////////////////////

class Rectangle extends Shape {

	constructor(settings) {
		super(settings);
	}

	draw(outputSettings) {
		/* Even with all the work I've put into argument packaging,
		 * it's still a ridiculous amount of work getting this data
		 * to the place I need to do work.
		 * Output needs its output setting.
		 * Shape needs to have current output settings in order
		 * to draw proportionately.
		 */
		const referenceWidth = outputSettings.referenceWidth;
		const referenceHeight = outputSettings.referenceHeight;
		if(this.x < 0) return;
		if(this.y < 0) return;
		if(this.x > referenceWidth - this.w) return;
		if(this.y > referenceHeight - this.h) return
		const xOffset = outputSettings.xOffset;
		const yOffset = outputSettings.yOffset;
		const {gameAreaWidth, gameAreaHeight, gameAreaXOffset, gameAreaYOffset} = 
			outputSettings.getGameArea();
		const windowSize = outputSettings.getWindowSize();
		const xRatio = gameAreaWidth / referenceWidth;
		const yRatio = gameAreaHeight / referenceHeight;
		const context = this.settings.context;
		context.strokeStyle = `rgb(${this.color.r}, 
			${this.color.g}, ${this.color.b})`;
		const outX = this.x * xRatio + gameAreaXOffset;
		const outY = this.y * yRatio + gameAreaYOffset;
		const outW = this.w * xRatio;
		const outH = this.h * yRatio;
		context.strokeRect(outX, outY, outW, outH);
	}

}

////////////////////////////////////////////////////////////////////////////////
// Logic
////////////////////////////////////////////////////////////////////////////////

class Logic {

	static init(settings) {
		this.settings = settings;
	}

	static update(deltaTime) {
		if(GameSession.gameState == "menu") return;
		this.settings.gameObjectUpdate(deltaTime);
		this.settings.gameEventProcess();
		GameSession.gameTimer++;
		let minBaddies = 5 + GameSession.score / 20 +
			Math.sqrt(GameSession.gameTimer / 30);
		if(Baddie.getMembers().length < minBaddies) Baddie.spawnWave();
		debug = GameObject.members.length;
	}

}

////////////////////////////////////////////////////////////////////////////////
// GameObject
////////////////////////////////////////////////////////////////////////////////

class GameObject {
	
	static members = [];

	static getMembers() {
		return this.members;
	}

	static add(object) {
		this.members.push(object);
	}

	static remove(object) {
		this.members.splice(this.members.indexOf(object), 1);
	}

	static update(deltaTime) {
		if(this.members.length) {
			for(let member of this.members) {
				member.update(deltaTime);
			}
		}
	}

	static handleEvent(eventType, eventArguments) {
		if(this.eventHandlers.hasOwnProperty(eventType)) {
			this.eventHandlers[eventType](eventArguments);
		}
	}

	constructor(settings) {
		this.settings = settings;
		this.handleEvent = GameObject.handleEvent;
		/* Is it wrong for an instance to touch static data? */
		//GameObject.members.push(this);
	}

	remove(){
		if(this.shape) this.shape.remove();
		GameObject.remove(this);
	}

	getDistance(otherEntity) {
		let thisCenterX = this.physicsBody.x + (this.physicsBody.w / 2);
		let thisCenterY = this.physicsBody.y + (this.physicsBody.h / 2);
		let otherCenterX = otherEntity.physicsBody.x +
			(otherEntity.physicsBody.w / 2);
		let otherCenterY = otherEntity.physicsBody.y +
			(otherEntity.physicsBody.h / 2);
		return(
			Math.sqrt((thisCenterX - otherCenterX) *
			(thisCenterX - otherCenterX) +
			(thisCenterY - otherCenterY) *
			(thisCenterY - otherCenterY)));
	}

	createTrail(trailDuration, deltaTime) {
		if(deltaTime > 1.01) return;
		const trailSettings = {
			context: outputSettings.context,
			x: this.getX(), y: this.getY(), w: this.getW(), h: this.getH(),
			color: this.getColor(), duration: trailDuration};
		GameEvent.add(Trail, "createTrail", trailSettings);
	}

	getX() {
		if(this.physicsBody) return this.physicsBody.x;
		else return this.x;
	}

	getY() {
		if(this.physicsBody) return this.physicsBody.y;
		else return this.y;
	}
	getW() {
		if(this.physicsBody) return this.physicsBody.w;
		else return this.w;
	}
	getH() {
		if(this.physicsBody) return this.physicsBody.h;
		else return this.h;
	}

	getColor() {
		return this.shape.color;
	}

}

////////////////////////////////////////////////////////////////////////////////
//  Player
////////////////////////////////////////////////////////////////////////////////

class Player extends GameObject {

	constructor(settings) {
		super(settings);
		const shapeSettings = {
			x: this.settings.x,
			y: this.settings.y,
			w: this.settings.w,
			h: this.settings.h,
			color: this.settings.color,
			drawDepth: this.settings.drawDepth,
			context: this.settings.context};
		const physicsBodySettings = {
			x: this.settings.x,
			y: this.settings.y,
			w: this.settings.w,
			h: this.settings.h,
			hSpeed: 0, vSpeed: 0,
			hAccel: this.settings.hAccel,
			vAccel: this.settings.vAccel,
			hDecel: this.settings.hDecel,
			vDecel: this.settings.vDecel,
			hMaxSpeed: this.settings.hMaxSpeed,
			vMaxSpeed: this.settings.vMaxSpeed};
		this.trailSettings = {
			x: this.settings.x, y: this.settings.y, 
			w: this.settings.w, h: this.settings.h,
			context: this.settings.context,
			duration: 8,
			color: this.settings.color};
		this.shape = new Rectangle(shapeSettings);
		this.bulletSettings = settings.bulletSettings;
		this.physicsBody = new PhysicsBody(physicsBodySettings);
		this.bulletDelay = this.settings.bulletDelay;
		this.currentBulletDelay = 0;
		this.deathTimer = 180;
		this.currentDeathTimer = 0;

		this.eventHandlers = {
			up: (deltaTime) => {this.physicsBody.accelerate(deltaTime, "up")},
			left: (deltaTime) => {this.physicsBody.accelerate(deltaTime, "left")},
			down: (deltaTime) => {this.physicsBody.accelerate(deltaTime, "down")},
			right: (deltaTime) => {this.physicsBody.accelerate(deltaTime, "right")},
			shoot: (deltaTime) => {this.shootBullet(deltaTime)},
			playerInput: (eventArguments) => {this.handleInput(eventArguments)},
			menuButton: () => {GameEvent.add(GameSession, "menuButton", {})}
		}

		this.powerShot = false;
	}

	shootBullet(deltaTime) {
		if(this.powerShot == true) {
			this.bulletSettings.color = {r: 0, g: 255, b: 255}
		}
		else this.bulletSettings.color = {r: 255, g: 255, b: 0};

		if(this.currentBulletDelay > 0) return;
		if(this.currentDeathTimer > 0) return;
		this.currentBulletDelay = this.bulletDelay;
		this.bulletSettings.x = this.physicsBody.x + this.physicsBody.w / 2 -
			this.bulletSettings.w / 2;
		this.bulletSettings.y = this.physicsBody.y + this.physicsBody.h / 2 -
			this.bulletSettings.h / 2;
		this.settings.createBullet(this.bulletSettings);
	}


	handleInput(eventArguments, deltaTime) {
		if(GameSession.lives < 0) return;
		for(const key in eventArguments) {
			if(eventArguments[key] == true){
				this.eventHandlers[key](deltaTime);
			}
		}
	}

	update(deltaTime) {
		if(this.currentDeathTimer == 1 && GameSession.lives >= 0){
			Sound.play("reviveSound");
			this.physicsBody.x = outputSettings.referenceWidth / 8;
			this.physicsBody.y = outputSettings.referenceHeight / 2 - 24;
		}

		if(GameSession.lives == -1) return;

		if(this.currentDeathTimer > 0) {
			this.currentDeathTimer--;
			return;
		}

		this.physicsBody.update(deltaTime);
		this.physicsBody.decelerate(deltaTime);
		this.constrain();
		this.resolveCollisions();
		this.updateShootStatus(deltaTime);
		this.shape.setPos({x: this.physicsBody.x, y: this.physicsBody.y});
		this.trailSettings.x = this.physicsBody.x;
		this.trailSettings.y = this.physicsBody.y;
		GameEvent.add(Trail, "createTrail", this.trailSettings);
	}

	updateShootStatus(deltaTime) {
		if(this.currentBulletDelay > 0) this.currentBulletDelay -= deltaTime;
	}

  constrain() {
		let {x, y} = this.physicsBody.getPos();
		let {w, h} = this.physicsBody.getSize();
		const refWidth = this.settings.gameAreaReferenceWidth;
		const refHeight = this.settings.gameAreaReferenceHeight;
    if(x < 0) x = 0;
    if(y < 0) y = 0;
    if(x >= refWidth - w) x = 1920 - w - 1;
    if(y >= refHeight - this.physicsBody.h) y = 1080 - h - 1;
		this.physicsBody.setPos(x, y);
  }

	resolveCollisions() {
		if(this.currentDeathTimer > 0) return;
		let baddieList = Baddie.getMembers();
		for(const each of baddieList) {
			if(this.physicsBody.checkCollision(each.physicsBody)) {
				Sound.play("dieSound");
				this.currentDeathTimer = this.deathTimer;
				GameSession.lives--;
				this.powerShot = false;
				for(let i=0; i<50; i++){
					let newSpark = new Spark(sparkSettings);
					newSpark.shape.x = this.physicsBody.x;
					newSpark.shape.y = this.physicsBody.y;
					newSpark.shape.color = {r: 255, g: 255, b: 0};
					newSpark.duration = 30 + Math.random() * 15;
					GameObject.add(newSpark);
				}
				this.physicsBody.x = outputSettings.referenceWidth * 2;
				this.physicsBody.y = outputSettings.referenceHeight / 2;
			}
		}
		if(this.physicsBody.checkCollision(GameSession.portal.physicsBody)
			&& GameSession.portal.currentTimeout < 1){
			GameSession.portal.currentTimeout = 300 + GameSession.score;
				Sound.play("portalSound");
				for(let i=0; i<20; i++){
					let newSpark = new Spark(sparkSettings);
					newSpark.shape.x = this.physicsBody.x;
					newSpark.shape.y = this.physicsBody.y;
					newSpark.shape.color = {r: 0, g: 255, b: 255};
					newSpark.duration = 5 + Math.random() * 5;
					GameObject.add(newSpark);
				}
			this.physicsBody.x = outputSettings.referenceWidth / 8;
			this.physicsBody.y = outputSettings.referenceHeight / 2 - 24;
				for(let i=0; i<20; i++){
					let newSpark = new Spark(sparkSettings);
					newSpark.shape.x = this.physicsBody.x;
					newSpark.shape.y = this.physicsBody.y;
					newSpark.shape.color = {r: 0, g: 255, b: 255};
					newSpark.duration = 5 + Math.random() * 5;
					GameObject.add(newSpark);
				}
		}

		for(const powerup of Powerup.members) {
			if(this.physicsBody.checkCollision(powerup.physicsBody)) {
				Sound.play("powerupSound");
				powerup.remove();
				GameSession.score++;
				if(powerup.shotPowerup)
					this.powerShot = true;
			}
		}
	}

	getX() {
		return this.physicsBody.x;
	}

	getY() {
		return this.physicsBody.y;
	}

}

////////////////////////////////////////////////////////////////////////////////
// Bullet
////////////////////////////////////////////////////////////////////////////////

class Bullet extends GameObject {

	static members = [];

	static getMembers() {
		return this.members;
	}

	static addBullet(settings) {
		const newBullet = new Bullet(settings);
		GameObject.add(newBullet);
	}

	static eventHandlers = {
		createBullet: (eventArguments) => this.addBullet(eventArguments)
	};

	constructor(settings){
		super(settings);
		Bullet.members.push(this);
		this.x = this.settings.x;
		this.y = this.settings.y;
		this.w = this.settings.w;
		this.h = this.settings.h;
		this.hSpeed = this.settings.hSpeed;
		this.vSpeed = this.settings.vSpeed;
		this.hMaxSpeed = this.settings.hMaxSpeed;
		this.vMaxSpeed = this.settings.vMaxSpeed;
		this.hAccel = this.settings.hAccel;
		this.vAccel = this.settings.vAccel;
		this.hDecel = this.settings.hDecel;
		this.vDecel = this.settings.vDecel;
		const physicsBodySettings = {
			x: this.x,
			y: this.y,
			w: this.w,
			h: this.h,
			hSpeed: this.hSpeed, vSpeed: this.vSpeed,
			hAccel: this.hAccel,
			vAccel: this.vAccel,
			hDecel: this.hDecel,
			vDecel: this.vDecel,
			hMaxSpeed: this.hMaxSpeed,
			vMaxSpeed: this.vMaxSpeed};
		const shapeSettings = {
			x: this.x, y: this.y, w: this.w, h: this.h,
			color: this.settings.color,
			drawDepth: this.settings.drawDepth,
			context: this.settings.context};
		this.trailSettings = {
			x: this.settings.x, y: this.settings.y, 
			w: this.settings.w, h: this.settings.h,
			context: this.settings.context,
			duration: 8,
			color: this.settings.color};
		this.physicsBody = new PhysicsBody(physicsBodySettings);
		this.shape = new Rectangle(shapeSettings);
		if(GameSession.player.powerShot == false){
			Sound.play("shotSound");
		} else Sound.play("powershotSound");
	}

  deleteIfOffscreen() {
		let {x, y} = this.physicsBody.getPos();
		let {w, h} = this.physicsBody.getSize();
		const refWidth = this.settings.gameAreaReferenceWidth;
		const refHeight = this.settings.gameAreaReferenceHeight;
    if(x < 0) this.remove();
    if(y < 0) this.remove();
    if(x >= refWidth - w) this.remove();
    if(y >= refHeight - this.physicsBody.h) this.remove();
  }

	update(deltaTime) {
		this.physicsBody.update(deltaTime);
		this.deleteIfOffscreen();
		this.shape.setPos({x: this.physicsBody.x, y: this.physicsBody.y});
		this.trailSettings.x = this.physicsBody.x;
		this.trailSettings.y = this.physicsBody.y;
		GameEvent.add(Trail, "createTrail", this.trailSettings);
	}

	remove() {
		super.remove();
		if(Bullet.members.includes(this)) {
			Bullet.members.splice(Bullet.members.indexOf(this), 1);
		}
	}
}

////////////////////////////////////////////////////////////////////////////////
// Physics Body
////////////////////////////////////////////////////////////////////////////////

class PhysicsBody {
	constructor(settings) {
			this.x = settings.x,
			this.y = settings.y,
			this.w = settings.w,
			this.h = settings.h,
			this.hSpeed = settings.hSpeed, 
			this.vSpeed = settings.vSpeed,
			this.hAccel = settings.hAccel,
			this.vAccel = settings.vAccel,
			this.hDecel = settings.hDecel,
			this.vDecel = settings.vDecel,
			this.hMaxSpeed = settings.hMaxSpeed,
			this.vMaxSpeed = settings.vMaxSpeed
	}

	getPos() {
		return({x: this.x, y: this.y});
	}

	getSize() {
		return({w: this.w, h: this.h});
	}

	setHSpeed(value) {
		this.hSpeed = value;
	}

	setVSpeed(value) {
		this.vSpeed = value;
	}

	update(deltaTime) {
		this.x += this.hSpeed * deltaTime;
		this.y += this.vSpeed * deltaTime;
	}

  accelerate(deltaTime, direction) {
    switch(direction) {
      case "up": this.vSpeed -= this.vAccel; break;
      case "down": this.vSpeed += this.vAccel; break;
      case "left": this.hSpeed -= this.hAccel; break;
      case "right": this.hSpeed += this.hAccel; break;
    }
    if(this.hSpeed > this.hMaxSpeed) this.hSpeed = this.hMaxSpeed;
    if(this.vSpeed > this.vMaxSpeed) this.vSpeed = this.vMaxSpeed;
    if(this.hSpeed < -this.hMaxSpeed) this.hSpeed = -this.hMaxSpeed;
    if(this.vSpeed < -this.vMaxSpeed) this.vSpeed = -this.vMaxSpeed;
  }

	decelerate(deltaTime) {
		if(this.hSpeed > 0) {
			if(this.hSpeed <= this.hDecel * deltaTime) {
				this.hSpeed = 0;
			}
			else {
				this.hSpeed -= this.hDecel * deltaTime;
			}
		}

		if(this.hSpeed < 0) {
			if(this.hSpeed >= -this.hDecel * deltaTime) {
				this.hSpeed = 0;
			}
			else {
				this.hSpeed += this.hDecel * deltaTime;
			}
		}

		if(this.vSpeed > 0) {
			if(this.vSpeed <= this.vDecel * deltaTime) {
				this.vSpeed = 0;
			}
			else {
				this.vSpeed -= this.vDecel * deltaTime;
			}
		}

		if(this.vSpeed < 0) {
			if(this.vSpeed >= -this.vDecel * deltaTime) {
				this.vSpeed = 0;
			}
			else {
				this.vSpeed += this.vDecel * deltaTime;
			}
		}
	}

	setPos(x, y) {
		this.x = x;
		this.y = y;
	}
	
	checkCollision(other) {
		return(
			!(this.x + this.w < other.x ||
			this.x > other.x + other.w ||
			this.y + this.h < other.y ||
			this.y > other.y + other.h)
		)
	}

}

////////////////////////////////////////////////////////////////////////////////
// Baddie
////////////////////////////////////////////////////////////////////////////////

class Baddie extends GameObject {

	static members = [];

	static getMembers() {
		return this.members;
	}

	static spawnWave() {
		const rw = outputSettings.referenceWidth;
		const rh = outputSettings.referenceHeight;
		let effectiveScore = GameSession.score;
		if(effectiveScore > 300) effectiveScore = 300;
		for(let i=0; i<10 + Math.sqrt(effectiveScore); i++) {
			let newBaddie = new Baddie(baddieSettings);
			newBaddie.setPos(rw * 1.25 + (Math.random() * 128),
				rh * 4 * Math.random());
			GameObject.add(newBaddie);
		}
		for(let i=0; i < outputSettings.referenceHeight; i += 16){
			let newSpark = new Spark(sparkSettings);
			newSpark.shape.x = outputSettings.referenceWidth;
			newSpark.shape.y = i;
			newSpark.shape.color = {r:255, g:0, b:0};
			GameObject.add(newSpark);
		}
		Sound.play("invasionSound");
	}

	constructor(settings) {
		super(settings);
		/* Baddie goes on the main gameobj list AND on a baddie-only list */
		Baddie.members.push(this);
		let shapeSettings = {
			x: this.settings.x,
			y: this.settings.y,
			w: this.settings.w,
			h: this.settings.h,
			color: {
				r: this.settings.color.r - Math.random() * 20,
				g: this.settings.color.g + Math.random() * 10,
				b: this.settings.color.b + Math.random() * 5},
			drawDepth: this.settings.drawDepth,
			context: this.settings.context};
		let physicsBodySettings = {
			x: this.settings.x,
			y: this.settings.y,
			w: this.settings.w,
			h: this.settings.h,
			hSpeed: 0, vSpeed: 0,
			hAccel: this.settings.hAccel,
			vAccel: this.settings.vAccel,
			hDecel: this.settings.hDecel,
			vDecel: this.settings.vDecel,
			hMaxSpeed: this.settings.hMaxSpeed,
			vMaxSpeed: this.settings.vMaxSpeed};
		this.trailSettings = {
			x: this.settings.x, y: this.settings.y, 
			w: this.settings.w, h: this.settings.h,
			context: this.settings.context,
			duration: 8,
			color: this.settings.color};
		this.shape = new Rectangle(shapeSettings);
		this.bulletSettings = settings.bulletSettings;
		this.physicsBody = new PhysicsBody(physicsBodySettings);
		this.bulletDelay = this.settings.bulletDelay;
		this.currentBulletDelay = 0;
		this.flock_coherence = this.settings.flock_coherence;
		this.flock_size = this.settings.flock_size;
		this.bullet_avoidance = this.settings.bullet_avoidance;
		this.personal_space = this.settings.personal_space;
		this.friendly_avoidance = this.settings.friendly_avoidance;
		this.velocity_coherence = this.settings.velocity_coherence;
		this.player_tracking = this.settings.player_tracking;
	}

	/* I was able to mostly copy in this routine from an old version
	 * two re-writes ago. This is a very long function, but there is
	 * nothing that will be reused or repeated anywhere, there is no
	 * reason to change the order of any of the operations, there is nothing
	 * to abstract. I suppose I could break this into 5 or 10 micro-functions
	 * and have them scattered across the source file, but then that
	 * means I have to carry all this data around again, giving me many more
	 * opportunities for bugs and a significant increase in LOC. Maybe
	 * I'll come back and refactor this in a more professional manner
	 * for a later version. */
	flockMove() {
		/* Copy these into local variables for manipulation within this scope,
		 * but also for the sake of readability because they will be referred
		 * to many times. */
		let x = this.physicsBody.x;
		let y = this.physicsBody.y;
		let h = this.physicsBody.hSpeed;
		let v = this.physicsBody.vSpeed;
		let c_x = 0; // Center of flock
		let c_y = 0;
		let baddie_count = 0;
		const player = this.settings.getPlayer();
		const baddie_list = Baddie.getMembers();

		let count = 0;
		// Move toward center of flock
		for(const each of baddie_list) {
			if(each == this) continue;
			if(this.getDistance(each) < this.flock_size) {
				c_x += each.physicsBody.x;
				c_y += each.physicsBody.y;
				count++;
			}
		}
		if(count > 0) {
			c_x = c_x / count;
			c_y = c_y / count;
			h += (c_x - x) * this.flock_coherence;
			v += (c_y - y) * this.flock_coherence;
		}
		
		// Avoid other baddies
		for(const each of baddie_list) {
			if(each == this) continue;
			if(this.getDistance(each) < this.personal_space) {
				let d_x = x - each.physicsBody.x;
				let d_y = y - each.physicsBody.y;
				h += d_x * this.friendly_avoidance;
				v += d_y * this.friendly_avoidance;
			}
		}

		// Match average speed
		let a_x = 0;
		let a_y = 0;
		count = 0;

		for(let each of baddie_list) {
			if(each == this) continue;
			if(this.getDistance(each) < this.flock_size){
				a_x += each.physicsBody.hSpeed;
				a_y += each.physicsBody.vSpeed;
				count++;
			}
		}
		if(count > 0) {
			a_x /= count;
			a_y /= count;
			h += a_x * this.velocity_coherence;
			v += a_y * this.velocity_coherence;
		}

		// Chase player
		h -= (this.physicsBody.x - player.getX()) * this.player_tracking;
		v -= (this.physicsBody.y - player.getY()) * this.player_tracking;

		// Constrain and apply final velocity values
		if(h > this.physicsBody.hMaxSpeed) h = this.physicsBody.hMaxSpeed;
		if(h < -this.physicsBody.hMaxSpeed) h = -this.physicsBody.hMaxSpeed;
		if(v > this.physicsBody.vMaxSpeed) v = this.physicsBody.vMaxSpeed;
		if(v < -this.physicsBody.vMaxSpeed) v = -this.physicsBody.vMaxSpeed;

		// Avoid bullets
		let bullet_list = this.settings.getBulletList();
		const screen_width = this.settings.gameAreaReferenceWidth;
		if(bullet_list && this.physicsBody.x > player.getX()){
			for(const each of bullet_list) {
				if(each == this) continue;
				if(this.getDistance(each) < screen_width / 6) {
					let each_x = each.physicsBody.x;
					let each_y = each.physicsBody.y;
					let d_x = x - each_x;
					let d_y = y - each_y;
					h += d_x * this.bullet_avoidance;
					v += d_y * this.bullet_avoidance;
				}
			}
		}

		this.physicsBody.hSpeed = h;
		this.physicsBody.vSpeed = v;
	}

	update(deltaTime) {
		if(deltaTime <= 0) return;
		this.flockMove();
		this.physicsBody.update(deltaTime);
		this.resolveCollisions(deltaTime);
		//this.updateShootStatus(deltaTime);
		this.shape.setPos({x: this.physicsBody.x, y: this.physicsBody.y});
		this.trailSettings.x = this.shape.x;
		this.trailSettings.y = this.shape.y;
		GameEvent.add(Trail, "createTrail", this.trailSettings);
	}

	resolveCollisions(deltaTime){
		if(Baddie.getMembers().length < 50){
			const baddieList = Baddie.getMembers();
			for(const each of baddieList){
				if(each == this) continue;
				if(this.physicsBody.checkCollision(each.physicsBody)){
					if(this.physicsBody.x < each.physicsBody.x){
						this.physicsBody.hSpeed -= 0.075;
						each.physicsBody.hSpeed += 0.075;
					}
					if(this.physicsBody.x > each.physicsBody.x){
						this.physicsBody.hSpeed += 0.075;
						each.physicsBody.hSpeed -= 0.075;
					}
					if(this.physicsBody.y < each.physicsBody.y){
						this.physicsBody.vSpeed -= 0.075;
						each.physicsBody.vSpeed += 0.075;
					}
					if(this.physicsBody.y > each.physicsBody.y){
						this.physicsBody.vSpeed += 0.075;
						each.physicsBody.vSpeed -= 0.075;
					}
				}
			}
		}
		const bulletList = Bullet.getMembers();
		for(const each of bulletList) {
			if(this.physicsBody.checkCollision(each.physicsBody) != 0) {
				for(let i=0; i<5; i++){
					if(GameObject.members.length > 1500) break;
					let newSpark = new Spark(sparkSettings);
					newSpark.shape.x = this.physicsBody.x;
					newSpark.shape.y = this.physicsBody.y;
					GameObject.add(newSpark);
				}
				this.remove();
				if(GameSession.player.powerShot == false) each.remove();
				GameObject.add(new Powerup(powerupSettings, this.physicsBody.x,
				this.physicsBody.y));
				Sound.play("explosionSound");
			}
		}
	}

	remove() {
		GameSession.score++;
		super.remove();
		if(Baddie.members.includes(this)) {
			Baddie.members.splice(Baddie.members.indexOf(this), 1);
		}
	}

	setPos(x, y) {
		this.physicsBody.x = x;
		this.physicsBody.y = y;
	}
}

////////////////////////////////////////////////////////////////////////////////
// Spark
////////////////////////////////////////////////////////////////////////////////

class Spark extends GameObject {
	
	static eventHandlers = {
		createSpark: (eventArguments) => this.addSpark(eventArguments)
	};

	static addSpark(settings) {
		const newTrail = new Trail(settings);
		GameObject.add(newTrail);
	}

	constructor(settings) {
		super(settings);
		const shapeSettings = {
			context: settings.context,
			x: settings.x, y: settings.y,
			w: settings.w, h: settings.h,
			color: {r: 255, g: 255, b: 255}, drawDepth: 60};
		this.shape = new Rectangle(shapeSettings);
		this.hSpeed = (settings.hSpeed * 2) * Math.random() - settings.hSpeed;
		this.vSpeed = (settings.vSpeed * 2) * Math.random() - settings.vSpeed;
		this.intensity = 100;
		this.brightness = 1.0;
		this.duration = settings.duration + Math.random() * 10;
		this.trailSettings = {
			x: this.settings.x, y: this.settings.y, 
			w: this.settings.w, h: this.settings.h,
			context: this.settings.context,
			duration: 10,
			color: this.shape.color};
	}

	update(deltaTime) {
		if(deltaTime == 0) return;
		this.shape.x += this.hSpeed * deltaTime;
		this.shape.y += this.vSpeed * deltaTime;
		this.shape.color = {
			r: this.shape.color.r * this.brightness,
			g: this.shape.color.g * this.brightness, 
			b: this.shape.color.b * this.brightness};
		this.duration--;
		if(this.duration < 15) this.brightness -= 0.1;
		if(this.duration <= 0) this.remove();
		this.trailSettings.x = this.shape.x;
		this.trailSettings.y = this.shape.y;
		this.trailSettings.color = this.shape.color;
		GameEvent.add(Trail, "createTrail", this.trailSettings);
	}

}

////////////////////////////////////////////////////////////////////////////////
// Star
////////////////////////////////////////////////////////////////////////////////

class Star extends GameObject {
	
	static createStarField() {
		for(let i=0; i<32; i++) {
			let newStar = new Star(
				outputSettings.referenceWidth * Math.random(),
				outputSettings.referenceHeight * Math.random(),
				starSettings);
			GameObject.add(newStar);
		}
	}

	constructor(inX, inY, settings) {
		super(settings);
		this.intensity = Math.random() * 255;
		const shapeSettings = {
			context: settings.context,
			x: inX, y: inY,
			w: settings.w, h: settings.h,
			color: {r: this.intensity, g: this.intensity, b: 
			this.intensity}, drawDepth: 60};
		this.trailSettings = {
			x: this.settings.x, y: this.settings.y, 
			w: this.settings.w, h: this.settings.h,
			context: this.settings.context,
			duration: 5,
			color: {
				r: this.intensity, g: this.intensity, b: this.intensity}};
		this.shape = new Rectangle(shapeSettings);
		this.hSpeed = -6 * (this.intensity / 255);
		this.vSpeed = 0;
	}

	update(deltaTime) {
		this.shape.x += this.hSpeed;
		this.shape.y += this.vSpeed * deltaTime;
		if(this.shape.x < 0) this.shape.x =
			outputSettings.referenceWidth;
		this.trailSettings.x = this.shape.x;
		this.trailSettings.y = this.shape.y;
		GameEvent.add(Trail, "createTrail", this.trailSettings);
	}


}
////////////////////////////////////////////////////////////////////////////////
// Trail
////////////////////////////////////////////////////////////////////////////////

class Trail extends GameObject {
	
	static eventHandlers = {
		createTrail: (eventArguments) => this.addTrail(eventArguments)
	};

	static addTrail(settings) {
		if(GameSession.showTrails == false) return;
		const newTrail = new Trail(settings);
		GameObject.add(newTrail);
	}

	constructor(settings) {
		super(settings);
		const shapeSettings = {
			context: settings.context,
			x: settings.x, y: settings.y,
			w: settings.w, h: settings.h,
			color: settings.color, drawDepth: 30};
		this.shape = new Rectangle(shapeSettings);
		this.brightness = 0.675;
		this.duration = settings.duration;
	}

	update(deltaTime) {
		this.shape.color = {
			r: this.shape.color.r * this.brightness,
			g: this.shape.color.g * this.brightness, 
			b: this.shape.color.b * this.brightness};
		this.duration--;
		if(this.duration < 6) this.brightness -= 0.1;
		if(this.duration <= 0) this.remove();
	}

}

////////////////////////////////////////////////////////////////////////////////
// Portal
////////////////////////////////////////////////////////////////////////////////

class Portal extends GameObject {

	constructor(settings) {
		super(settings);
		const shapeSettings = {
			context: settings.context,
			x: settings.x, y: settings.y,
			w: settings.w, h: settings.h,
			color: settings.color, drawDepth: 30};
		this.shape = new Rectangle(shapeSettings);
		const physicsBodySettings = {
			x: this.settings.x,
			y: this.settings.y,
			w: this.settings.w,
			h: this.settings.h,
			hSpeed: 0, vSpeed: 0,
			hAccel: this.settings.hAccel,
			vAccel: this.settings.vAccel,
			hDecel: this.settings.hDecel,
			vDecel: this.settings.vDecel,
			hMaxSpeed: this.settings.hMaxSpeed,
			vMaxSpeed: this.settings.vMaxSpeed};
		this.physicsBody = new PhysicsBody(physicsBodySettings);
		this.currentTimeout = 0;
		this.flashTimer = 30;
		this.flash = false;
	}

	update(deltaTime) {
		if(this.currentTimeout > 0) {
			this.shape.color = {r: 10, g: 10, b: 10};
			this.currentTimeout -= deltaTime;
		}
		else{
			(this.shape.color = this.settings.color);
			this.flashTimer--;
			if(this.flashTimer < 5){
				this.shape.color = {r:255, g: 255, b: 255};
			} else {
				this.shape.color = this.settings.color;
				if(this.shotPowerup == true)
					this.shape.color = {r: 0, g: 255, b: 255};
			}
			if(this.flashTimer == 0) this.flashTimer = 30;	
		}
	}
}

////////////////////////////////////////////////////////////////////////////////
// Powerup
////////////////////////////////////////////////////////////////////////////////

class Powerup extends GameObject {

	static members = [];

	constructor(settings, argX, argY) {
		super(settings);
		Powerup.members.push(this);
		const shapeSettings = {
			context: settings.context,
			x: argX, y: argY,
			w: settings.w, h: settings.h,
			color: settings.color, drawDepth: 30};
		this.shape = new Rectangle(shapeSettings);
		const physicsBodySettings = {
			x: argX - 12,
			y: argY - 12,
			w: this.settings.w + 24,
			h: this.settings.h + 24,
			hSpeed: 0, vSpeed: 0,
			hAccel: this.settings.hAccel,
			vAccel: this.settings.vAccel,
			hDecel: this.settings.hDecel,
			vDecel: this.settings.vDecel,
			hMaxSpeed: this.settings.hMaxSpeed,
			vMaxSpeed: this.settings.vMaxSpeed};
		this.physicsBody = new PhysicsBody(physicsBodySettings);
		this.duration = 300;
		this.flash = false;
		this.flashTimer = 30;
		if(Math.random() * 50 < 1 && GameSession.player.powerShot == false) {
			this.shotPowerup = true;
			this.shape.color = {r: 0, g: 255, b: 255}
		}
	}

	update(deltaTime) {
		this.duration -= deltaTime;
		if(this.duration < 1) this.remove();
		this.flashTimer--;
		if(this.flashTimer < 5){
			this.shape.color = {r:255, g: 255, b: 255};
		} else {
			this.shape.color = this.settings.color;
			if(this.shotPowerup == true)
				this.shape.color = {r: 0, g: 255, b: 255};
		}
		if(this.flashTimer == 0) this.flashTimer = 30;	
	}

	remove() {
		super.remove();
		if(Powerup.members.includes(this)) {
			Powerup.members.splice(Powerup.members.indexOf(this), 1);
		}
	}
}

////////////////////////////////////////////////////////////////////////////////
// Sounds
////////////////////////////////////////////////////////////////////////////////

class Sound {

	static init() {
		this.shotSound= [];
		this.shotSound.count = 0;
		this.explosionSound= [];
		this.explosionSound.count = 0;
		this.dieSound = [];
		this.dieSound.count = 0;
		this.reviveSound = [];
		this.reviveSound.count = 0;
		this.invasionSound = [];
		this.invasionSound.count = 0;
		this.portalSound = [];
		this.portalSound.count = 0;
		this.powerupSound = [];
		this.powerupSound.count = 0;
		this.powershotSound = [];
		this.powershotSound.count = 0;

		for(let i=0; i<8; i++) {
			this.addSound("zap.wav", this.shotSound);
			this.addSound("explosion.wav", this.explosionSound);
			this.addSound("die.wav", this.dieSound);
			this.addSound("revive.wav", this.reviveSound);
			this.addSound("invasion.wav", this.invasionSound);
			this.addSound("powerup.wav", this.powerupSound);
			this.addSound("portal.wav", this.portalSound);
			this.addSound("powershot.wav", this.powershotSound);
		}
	}

	static addSound(source, queueName) {
		let newSound = document.createElement("audio");
		newSound.src = source;
		newSound.setAttribute("preload", "auto");
		newSound.setAttribute("controls", "none");
		newSound.style.display = "none";
		document.body.appendChild(newSound);
		queueName.push(newSound);
	}

	static play(sound) {
		if(GameSession.playSound != true) return;
		this[sound][this[sound].count].play();
		this[sound].count++;
		if(this[sound].count == 8)
		this[sound].count = 0;
	}

}

////////////////////////////////////////////////////////////////////////////////
// Game Session
////////////////////////////////////////////////////////////////////////////////

class GameSession {

	static handleEvent = GameObject.handleEvent;
	static eventHandlers = {
		menuButton: this.menuButton};

	static menuButton() {
		if(this.gameState == "play") {
			this.gameState = "menu";
			//restartGame();
		} else if(this.gameState == "menu"){
			this.gameState = "play";
		}
	}

	static newGameButton() {
		this.gameState = "play";
		restartGame();
	}

	static toggleSoundButton() {
		if(this.playSound == true) this.playSound = false;
		else this.playSound = true;
	}

	static toggleTrailsButton() {
		if(this.showTrails == true) this.showTrails = false;
		else this.showTrails = true;
	}

	static init() {
		this.player = new Player(playerSettings);
		GameObject.add(this.player);
		this.portal = new Portal(portalSettings);
		GameObject.add(this.portal);
		Baddie.spawnWave();
		this.score = 0;
		this.lives = 3;
		Star.createStarField();
		this.gameState = "menu";
		this.playSound = false;
		this.showTrails = true;
		this.gameTimer = 0;
	}

	static getPlayer() {
		return (this.player);
	}

	static displayScore() {
		let context = document.querySelector("canvas").getContext("2d");
		context.font = "normal 600 28px Retroscape";
		context.fillStyle = "yellow";
		let scoreString = `${GameSession.score}`;
		let livesString = `LIVES: ${GameSession.lives}`;
		context.fillText(scoreString, 
			Output.getGameArea().gameAreaXOffset +
			Output.getGameArea().gameAreaWidth / 2 - scoreString.length * 4, 
			Output.getGameArea().gameAreaYOffset + 36);
		for(let i=0; i<this.lives; i++){
			context.strokeStyle = "blue";
			context.strokeRect(
				outputSettings.getGameArea().gameAreaXOffset + 8 + 20 * i, 
				outputSettings.getGameArea().gameAreaYOffset + 8, 16, 16);
		}

		if(GameSession.lives == -1 && GameSession.gameState == "play"){
			context.font = "normal 600 40px Retroscape";
			let gameOverText = "GAME OVER";
			context.fillText(gameOverText,
				Output.getGameArea().gameAreaXOffset + 
				Output.getGameArea().gameAreaWidth / 2 - 
				(context.measureText(gameOverText).width / 2),
				Output.getGameArea().gameAreaHeight / 2 +
				Output.getGameArea().gameAreaYOffset - 12);
		}
	}

	static displayMenu() {
		if(this.gameState == "play") return;
		let size = 40;
		let vSpace = size * 2;
		let hSpace = size * 2;
		let x = 200;
		let y = outputSettings.referenceHeight - size * 8;

		Output.drawText("New Game", x + hSpace, y, size, "white");
		Output.drawButton("1", x, y, size, "yellow", "blue");
		y += vSpace;
		Output.drawText("Toggle Sound", x + hSpace, y, size, "white", "blue");
		Output.drawButton("2", x, y, size, "yellow", "blue");
		if(this.playSound == true) {
			Output.drawButton("ON", x - size * 2.5, y, size, "green", "blue");
		}
		if(this.playSound == false) {
			Output.drawButton("OFF", x - size * 3.25, y, size, "red", "blue");
		}
		y += vSpace;
		Output.drawText("Toggle Trail FX", x + hSpace, y, size, "white", "blue");
		if(this.showTrails == true) {
			Output.drawButton("ON", x - size * 2.5, y, size, "green", "blue");
		}
		if(this.showTrails == false) {
			Output.drawButton("OFF", x - size * 3.25, y, size, "red", "blue");
		}
		Output.drawButton("3", x, y, size, "yellow", "blue");
	}

	static displayHelp() {
		let size = 32;
		let x = 32;
		let y = outputSettings.referenceHeight - size * 1.5;
		Output.drawText(
			"WASD: Move     SPACE: Shoot     ESC: Menu", x, y, size, "grey");
	}
}

////////////////////////////////////////////////////////////////////////////////
// Global Scope
////////////////////////////////////////////////////////////////////////////////

/* Global dictionaries of dependency info and constants, so I don't have to
 * manually update argument lists in multiple places.
 * This has the added benefit of letting me put all the game setttings
 * in one place.
 * This creates an interesting problem/opportunity where this bundle of 
 * context is being shallow-copied to its destination. At the moment,
 * I'm selectively transferring members into the destination object,
 * but if I do this again I'll split these settings into two lists,
 * one to be deep-copied into the new object in bulk rather than
 * individually, another to be shallow-copied and used as a pointer to 
 * shared data.
 * If I really properly decoupled this instead of letting these datasets
 * access the global scope, I'd have to have some sort of manager that I'd
 * pass everything into which would then return these nice packages.
 * I could see that being a good idea in a large enough system but I think
 * I've already taken this exercise far enough and that would balloon this
 * already bloated code quite a bit more, and I do want to actually release
 * this at some point. */

const inputSettings = {
	getPlayer: GameSession.getPlayer.bind(GameSession),
	keys: {
		up: false,
		down: false,
		left: false,
		right: false,
		shoot: false},
	mapping: {
		87: "up",
		65: "left",
		83: "down",
		68: "right",
		32: "shoot"},
	menuKeys: {
		27: "menuButton",
		49: "newGameButton",
		50: "toggleSoundButton",
		51: "toggleTrailsButton"},
	menuEvents: {
		menuButton: GameSession.menuButton.bind(GameSession),
		newGameButton: GameSession.newGameButton.bind(GameSession),
		toggleSoundButton: GameSession.toggleSoundButton.bind(GameSession),
		toggleTrailsButton: GameSession.toggleTrailsButton.bind(GameSession)}
};

const logicSettings = {
	gameObjectUpdate: GameObject.update.bind(GameObject),
	gameEventProcess: GameEvent.processAll.bind(GameEvent)
};

const outputSettings = {
	refreshColor: "rgb(20, 20, 20)",
	canvas: document.querySelector("canvas"),
	context: document.querySelector("canvas").getContext("2d"),
	getWindowSize: window.getWindowSize.bind(window),
	gameAreaRefreshColor: "black",
	referenceWidth: 1920,
	referenceHeight: 1080,
	drawShapes: Shape.drawAll.bind(Shape),
	getGameArea: Output.getGameArea.bind(Output)
};

const playerSettings = {
		x: outputSettings.referenceWidth / 8,
		y: outputSettings.referenceHeight / 2 - 24,
		w: 48,
		h: 48,
	color: {r: 0, g: 20, b: 255},
	drawDepth: 50,
	context: outputSettings.context,
	gameAreaReferenceWidth: outputSettings.referenceWidth,
	gameAreaReferenceHeight: outputSettings.referenceHeight,
	bulletSettings: {
		context: outputSettings.context,
		gameAreaReferenceWidth: outputSettings.referenceWidth,
		gameAreaReferenceHeight: outputSettings.referenceHeight,
		x: 0,
		y: 0,
		w: 32,
		h: 32,
		hSpeed: 40,
		vSpeed: 0,
		color: {r:0, g:225, b:255},
		width: 32,
		height: 32},
	hSpeed: 0, vSpeed: 0,
	hAccel: 8, vAccel: 8,
	hDecel: 3.5, vDecel: 3.5, 
	hMaxSpeed: 18, vMaxSpeed: 18,
	createBullet: (bulletSettings) => GameEvent.add(
		Bullet, "createBullet", bulletSettings),
	bulletDelay: 8 
};

/* Something that occurs to me here is that I would prefer to separate
 * infrastructural data (such as the reference dimensions of the gameplay
 * area needed to draw the entity or determine its behavior) from 
 * the parametric/characteristic information about that entity,
 * such as its size and color, or movement speed. */
const baddieSettings = {
	x: 200, y: 200, w: 48, h: 48,
	color: {r: 225, g: 20, b: 0},
	drawDepth: 40,
	context: outputSettings.context,
	gameAreaReferenceWidth: outputSettings.referenceWidth,
	gameAreaReferenceHeight: outputSettings.referenceHeight,
	bulletSettings: {
		context: outputSettings.context,
		gameAreaReferenceWidth: outputSettings.referenceWidth,
		gameAreaReferenceHeight: outputSettings.referenceHeight,
		x: 0, y: 0, w: 32, h: 32,
		hSpeed: -16, vSpeed: 0,
		color: "orange"},
	hSpeed: 0, vSpeed: 0,
	hAccel: 3.5, vAccel: 3.5,
	hDecel: 1.5, vDecel: 1.5,
	hMaxSpeed: 8.5, vMaxSpeed: 8.5,
	createBullet: (bulletSettings) => GameObject.add(new Bullet(bulletSettings)),
	bulletDelay: 10,
	getBulletList: Bullet.getMembers.bind(Bullet),
	getPlayer: GameSession.getPlayer.bind(GameSession),
	flock_coherence: 0.002,
	flock_size: 200,
	bullet_avoidance: 0.008,
	personal_space: 200,
	friendly_avoidance: 0.0005,
	velocity_coherence: 0.01,
	player_tracking: 0.0005
};

const sparkSettings = {
	context: outputSettings.context,
	x: 0, y: 0, w: 16, h: 16,
	hSpeed: 24, vSpeed: 24,
	brightness: 100,
	duration: 15};

const starSettings = {
	context: outputSettings.context,
	x: 0, y: 0, w: 2, h: 2,
	hSpeed: 0, vSpeed: 0};

const portalSettings = {
	x: outputSettings.referenceWidth - 128, 
	y: outputSettings.referenceHeight / 2 - 32, 
	w: 64, h: 64,
	color: {r: 0, g: 255, b: 255},
	drawDepth: 100,
	context: outputSettings.context,
	gameAreaReferenceWidth: outputSettings.referenceWidth,
	gameAreaReferenceHeight: outputSettings.referenceHeight,
	hSpeed: 0, vSpeed: 0,
	hAccel: 3.5, vAccel: 3.5,
	hDecel: 1.5, vDecel: 1.5,
	hMaxSpeed: 8.5, vMaxSpeed: 8.5,
};

const powerupSettings = {
	x: 0, y: 0,
	w: 32, h: 32,
	color: {r: 255, g: 255, b: 0},
	drawDepth: 100,
	context: outputSettings.context,
	gameAreaReferenceWidth: outputSettings.referenceWidth,
	gameAreaReferenceHeight: outputSettings.referenceHeight,
	hSpeed: 0, vSpeed: 0,
	hAccel: 3.5, vAccel: 3.5,
	hDecel: 1.5, vDecel: 1.5,
	hMaxSpeed: 8.5, vMaxSpeed: 8.5,
};

/* Wrap browser window access */
function getWindowSize() {
	return({
		width: innerWidth,
		height: innerHeight
	});
}

function setCanvasSize(width, height) {
	const canvas = document.querySelector("canvas");
	canvas.width = width;
	canvas.height = height;
}

/* Global game input/update/output loop */
function Tic(timeStamp, previousTimeStamp) {
	const deltaTime = (timeStamp - previousTimeStamp) / (1000 / 60);
	previousTimeStamp = timeStamp;
	Input.poll();
	Logic.update(deltaTime);
	Output.refresh();
	requestAnimationFrame((timeStamp) => {
		Tic(timeStamp, previousTimeStamp)});
}

/* Connect dependencies to systems, then start main loop */
function main() {
	Sound.init();
	GameSession.init();
	Input.init(inputSettings);
	Logic.init(logicSettings);
	Output.init(outputSettings);
	const now = new Date();
	/* Not sure how I should initialize time for the first tic.
	 * I'm not sure it matters in practice but I would prefer this to 
	 * be correct. DeltaTime of 0 causes problems. */
	Tic(now.getTime(), now.getTime());
}

function restartGame() {
	GameObject.members = [];
	Baddie.members = [];
	Shape.members = [];
	Bullet.members = [];
	Powerup.members = [];
	GameSession.player = new Player(playerSettings);
	GameSession.lives = 3;
	GameSession.score = 0;
	GameSession.gameTimer = 0;
	GameSession.portal = new Portal(portalSettings);
	Star.createStarField();
	GameObject.add(GameSession.player);
	GameObject.add(GameSession.portal);
}

////////////////////////////////////////////////////////////////////////////////
// Main Execution
////////////////////////////////////////////////////////////////////////////////

/* Make it explicit I'm not doing any work in the global scope. */
//main();
window.addEventListener("load", main);
