const DESIRED_FPS = 120;
const UPDATE_INTERVAL = Math.trunc(1000 / DESIRED_FPS)
const KEY_UP = 38
const KEY_DOWN = 40
const KEY_LEFT = 37
const KEY_RIGHT = 39
const KEY_W = 90
const KEY_S = 83
const KEY_A = 81
const KEY_D = 68

// works, teleport key
const KEY_F = 70

// initialisation variables
var totalTimeElapsed = 0;

// Ingame Timer
var yourTurn = true;

// Etat animation
// A déclarer en dehors des fonctions /!\
var leftAnimation = false;
var leftAnimationProgress = 0;

var rightAnimation = false;
var rightAnimationProgress = 0;

var forwardAnimation = false;
var forwardAnimationProgress = 0;

var backwardAnimation = false;
var backwardAnimationProgress = 0;

let animationDirection; // Variable pour stocker la direction de l'animation
let animationProgress; // Variable pour stocker la progression de l'animation

// Direction  - Orientation caméra
// Valeur étalon 
const nord = Math.PI / 2;
const ouest = Math.PI;
const sud = 3 * Math.PI / 2;
const est = 0;

// vérification de l'orientation visée
var orientationTarget;

// vérification de la distance parcourue par le joueur à chaque pas
var moveTargetX;
var moveTargetY;

// ces variables étaient anciennement dans la fonction d'avancée, c'était illogique
var forward;
var backward;

// Terminal du moteur 
// Accès à l'élément de sortie en utilisant son ID
let consoleContent = ""; // Variable pour stocker le contenu de la console

// Valeur hauteur de plafond
let ceilingHeight = 2;
let ceilingRender = false;

// Texture sol et plafond
let floorTexture = 3;
let ceilingTexture = 1;

// englober la fonction de dialogue dans le listener sinon ? C'est du rafistolage, mais ça marchera.
// TEST STATUS :  
// Version en cours : "const outputElement = document.getElementById("output");" avant la fonction de dialogue.
document.addEventListener("DOMContentLoaded", function () {
    const outputElement = document.getElementById("output");

    function addToConsole(entry) {
        const consoleContent = outputElement.innerHTML;
        outputElement.innerHTML = consoleContent + "> " + entry + "<br>";
    }

    // impossible d'utiliser la fonction addToConsole() en dehors de 
    addToConsole(" ");
    addToConsole("Bienvenue dans Oasis !");
    addToConsole("Version Alpha (conception)");
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

class Sprite {
    constructor(x = 0, y = 0, z = 0, w = 128, h = 128, ang, spriteType = 0, attackable=false, turn = true, hp=3, dmg=1) {
        this.x = x
        this.y = y
        this.z = w
        this.w = w
        this.h = h

        this.hit = false
        this.screenPosition = null // calculated screen position
        
        // ang == "angle"
        this.ang = ang

        //la
        this.spriteType = spriteType;

        // Enemies ?
        this.attackable = attackable;
        this.hp = hp;

        this.turn = turn;
        this.dmg = dmg;
    }
    //créer fonction dialogue
    //créer fonction d'attaque

    talk() {

    }

    behavior() {

    }

    attack(target) {
        target.hp -= this.dmg; // Utilisez this.dmg pour accéder à la propriété de la classe
    
        // Revoir cette partie du code
        //const outputElement = document.getElementById("output");
        // outputElement.innerHTML = consoleContent + "> " + this.spriteType + " attacks the player, inflicting " + this.dmg + " damages! <br> You have now " + target.hp + "HP.";
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Holds information about a wall hit from a single ray
class RayHit {
    constructor() {
        this.x = 0; // world coordinates of hit
        this.y = 0;
        this.strip = 0; // screen column
        this.tileX = 0; // // wall hit position, used for texture mapping
        this.distance = 0; // distance between player and wall
        this.correctDistance = 0; // distance to correct for fishbowl effect
        this.vertical = false; // vertical cell hit
        this.horizontal = false; // horizontal cell hit
        this.wallType = 0; // type of wall
        this.rayAngle = 0; // angle of ray hitting the wall
        this.sprite = null // save sprite hit
    }

    static spriteRayHit(sprite, distX, distY, strip, rayAngle) {
        let squaredDistance = distX * distX + distY * distY;
        let rayHit = new RayHit()
        rayHit.sprite = sprite

        //la
        rayHit.sprite.spriteType = sprite.spriteType;
        rayHit.strip = strip
        rayHit.rayAngle = rayAngle
        rayHit.distance = Math.sqrt(squaredDistance)
        return rayHit
    }
}

class RayState {
    constructor(rayAngle, strip) {
        this.rayAngle = rayAngle
        this.strip = strip
        this.cellX = 0
        this.cellY = 0
        this.rayHits = []
        this.vx = 0
        this.vy = 0
        this.hx = 0
        this.hy = 0
        this.vertical = false
        this.horizontal = false
    }
}

class Raycaster {
    static get TWO_PI() {
        return Math.PI * 2
    }

    static get MINIMAP_SCALE() {
        return 8
    }

    /* Test : 
    a chaque cycle, les output html sont revus (mise à jour des valeurs)
    
    l'idée est intéressante, mais impossible à mettre dans une classe comme ça
    */

    initMap() {
        this.map = 
        [
        [1,1,1,1,1,1,1,1,3,3,3,3,3,1,6,6,1,3,3,3,3,3,3,3],
        [2,0,0,0,0,0,0,2,3,3,0,0,0,1,0,0,1,0,0,3,3,3,3,3],
        [2,0,0,0,0,0,0,2,3,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3],
        [2,0,0,0,0,0,0,2,3,1,0,0,0,0,0,0,0,0,1,1,1,1,3,3],
        [1,1,1,1,0,1,1,1,1,1,0,0,0,0,0,0,0,0,1,0,0,0,1,3],
        [2,2,0,0,0,0,0,1,2,0,0,0,0,0,0,0,0,0,5,0,0,0,1,3],
        [2,0,0,0,0,0,0,0,6,0,0,0,0,0,0,0,0,0,1,0,0,0,1,3],
        [2,2,0,0,0,0,0,1,2,0,0,0,0,0,0,0,0,0,1,1,1,1,0,3],
        [1,1,1,1,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
        [1,0,0,0,0,0,0,1,3,1,0,0,0,0,0,0,0,0,0,0,3,0,3,3],
        [1,0,0,0,1,1,0,1,3,0,0,0,4,5,4,4,4,0,3,3,3,3,3,3],
        [1,0,0,0,1,0,0,0,1,3,0,0,4,0,0,0,4,0,3,3,3,3,3,3],
        [1,0,0,0,1,0,0,0,1,3,0,0,4,0,0,0,4,3,3,0,0,0,3,3],
        [1,2,6,2,1,1,1,1,1,3,3,0,4,0,0,0,4,3,0,0,0,0,0,3],
        [3,3,0,3,3,3,3,3,3,3,3,0,4,4,4,4,4,3,3,0,3,0,0,3],
        [3,0,0,3,3,3,0,0,3,3,3,3,3,3,3,3,3,0,0,0,3,3,0,3],
        [3,0,3,3,0,0,0,0,0,3,3,3,0,0,0,0,0,0,3,0,0,3,3,3],
        [3,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,3,0,0,0,3,3],
        [3,3,3,3,0,0,0,0,0,3,3,3,3,3,0,0,0,3,0,0,3,0,3,3],
        [3,0,0,3,3,3,0,3,3,3,0,0,0,3,0,0,0,3,0,3,3,0,3,3],
        [3,0,0,3,3,3,0,3,0,0,0,0,0,3,0,0,0,3,0,3,0,0,0,3],
        [3,0,0,0,0,0,0,0,0,3,0,0,0,3,3,0,3,3,0,3,0,0,0,3],
        [3,0,0,3,3,3,3,3,3,3,0,0,0,3,3,0,0,0,0,3,0,0,0,3],
        [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3]]
        ;
    }

    initPlayer() {
        const tileSizeHalf = Math.floor(this.tileSize / 2)

        this.player = {
            x: 14 * this.tileSize + tileSizeHalf, // current x, y position in game units
            y: 1 * this.tileSize + tileSizeHalf,
            z: 0,
            dir: 0, // turn direction,  -1 for left or 1 for right.
            rot: 4.71238898038469, // rotation angle; counterclockwise is positive.
            speed: 0, // forward (speed = 1) or backwards (speed = -1).
            attack: 1,
            hp:10,
            mp:10,
            xp:0,

            // Instaurer inertie/accélération
            moveSpeed: Math.round(this.tileSize / (DESIRED_FPS / 60.0 * 16)),
            rotSpeed: 1.5 * Math.PI / 180
        }

        // Accédez à l'élément HTML
        const PlayerHP = document.getElementById("PlayerHPoutput");
        const PlayerMP = document.getElementById("PlayerMPoutput");
        const PlayerXP = document.getElementById("PlayerXPoutput");

        // Modifiez la valeur numérique
        PlayerHP.textContent = this.player.hp;
        PlayerMP.textContent = this.player.mp;   
        PlayerXP.textContent = this.player.xp;   
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    initSprites() {
        // Put sprite in center of cell
        const tileSizeHalf = Math.floor(this.tileSize / 2)

// MARQUEUR : Sprite list liste des sprites

        // intégrer information sur type de sprite ; format [x, y, type] 
        let spritePositions = [
            [17 * this.tileSize + tileSizeHalf, 6 * this.tileSize + tileSizeHalf, 1],
            [9 * this.tileSize + tileSizeHalf, 5 * this.tileSize + tileSizeHalf, 2],
            [4 * this.tileSize + tileSizeHalf, 1 * this.tileSize + tileSizeHalf, 2],
            [14 * this.tileSize + tileSizeHalf, 13 * this.tileSize + tileSizeHalf, 3],

            // décoration
            [7 * this.tileSize + tileSizeHalf, 16 * this.tileSize + tileSizeHalf, 4],
            [20 * this.tileSize + tileSizeHalf, 16 * this.tileSize + tileSizeHalf, 4],
            [16 * this.tileSize + tileSizeHalf, 9 * this.tileSize + tileSizeHalf, 5],
            [15 * this.tileSize + tileSizeHalf, 13 * this.tileSize + tileSizeHalf, 5],
            [17 * this.tileSize + tileSizeHalf, 3 * this.tileSize + tileSizeHalf, 6],
            [15 * this.tileSize + tileSizeHalf, 7 * this.tileSize + tileSizeHalf, 6],
            [10 * this.tileSize + tileSizeHalf, 10 * this.tileSize + tileSizeHalf, 6],
            [12 * this.tileSize + tileSizeHalf, 3 * this.tileSize + tileSizeHalf, 6],
            [14 * this.tileSize + tileSizeHalf, 9 * this.tileSize + tileSizeHalf, 7],
            [1 * this.tileSize + tileSizeHalf, 6 * this.tileSize + tileSizeHalf, 11],
            [3 * this.tileSize + tileSizeHalf, 7 * this.tileSize + tileSizeHalf, 12],
            [3 * this.tileSize + tileSizeHalf, 5 * this.tileSize + tileSizeHalf, 12],

            // enemies
            [4 * this.tileSize + tileSizeHalf, 17 * this.tileSize + tileSizeHalf, 0],
            [19 * this.tileSize + tileSizeHalf, 15 * this.tileSize + tileSizeHalf, 0],
            [21 * this.tileSize + tileSizeHalf, 20 * this.tileSize + tileSizeHalf, 0],
            
            // "end of demo"
            [15 * this.tileSize + tileSizeHalf, 18 * this.tileSize + tileSizeHalf, 9],            
        ];


        let sprite = null;
        this.sprites = [];

        // format   constructor(x=0, y=0, z=0, w=128, h=128, spriteType=0)
        for (let pos of spritePositions) {
            let sprite = new Sprite(pos[0], pos[1], 0, this.tileSize, this.tileSize, pos[2]);
            console.log(JSON.stringify(sprite))
            this.sprites.push(sprite)
            console.log('sprite enregistré !');
        }

        // analyse le type de sprite
        for (let i = 0; i < this.sprites.length; i++) {
            this.sprites[i].spriteType = spritePositions[i][2];
            console.log(this.sprites[i].spriteType);
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    resetSpriteHits() {
        for (let sprite of this.sprites) {
            sprite.hit = false
            sprite.screenPosition = null
        }
    }

    findSpritesInCell(cellX, cellY, onlyNotHit = false) {
        let spritesFound = []
        for (let sprite of this.sprites) {
            if (onlyNotHit && sprite.hit) {
                continue
            }
            let spriteCellX = Math.floor(sprite.x / this.tileSize)
            let spriteCellY = Math.floor(sprite.y / this.tileSize)
            if (cellX == spriteCellX && cellY == spriteCellY) {
                spritesFound.push(sprite);
            }
        }
        return spritesFound
    }

    constructor(mainCanvas, displayWidth = 640, displayHeight = 360, tileSize = 1280, textureSize = 64, fovDegrees = 90) {
        this.initMap()
        this.stripWidth = 1 // leave this at 1 for now
        this.ceilingHeight = 1 // ceiling height in blocks
        this.mainCanvas = mainCanvas
        this.mapWidth = this.map[0].length
        this.mapHeight = this.map.length
        this.displayWidth = displayWidth
        this.displayHeight = displayHeight
        this.rayCount = Math.ceil(displayWidth / this.stripWidth)
        this.tileSize = tileSize
        this.worldWidth = this.mapWidth * this.tileSize
        this.worldHeight = this.mapHeight * this.tileSize
        this.textureSize = textureSize
        this.fovRadians = fovDegrees * Math.PI / 180
        this.viewDist = (this.displayWidth / 2) / Math.tan((this.fovRadians / 2))
        this.rayAngles = null
        this.viewDistances = null
        this.backBuffer = null

        this.mainCanvasContext;
        this.screenImageData;
        this.textureIndex = 0
        this.textureImageDatas = []
        this.texturesLoadedCount = 0
        this.texturesLoaded = false

        this.initPlayer()
        this.initSprites()
        this.bindKeys()
        this.initScreen()
        this.drawMiniMap()
        this.createRayAngles()
        this.createViewDistances()
        this.past = Date.now()
    }

    /**
     * https://stackoverflow.com/a/35690009/1645045
     */
    static setPixel(imageData, x, y, r, g, b, a) {
        let index = (x + y * imageData.width) * 4;
        imageData.data[index + 0] = r;
        imageData.data[index + 1] = g;
        imageData.data[index + 2] = b;
        imageData.data[index + 3] = a;
    }

    static getPixel(imageData, x, y) {
        let index = (x + y * imageData.width) * 4;
        return {
            r: imageData.data[index + 0],
            g: imageData.data[index + 1],
            b: imageData.data[index + 2],
            a: imageData.data[index + 3]
        };
    }

    /*
    This is no longer called by us anymore because it interferes with the
    pixel manipulation of floor/ceiling texture mapping.

    https://stackoverflow.com/a/46920541/1645045
    https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio

    sharpenCanvas() {
      // Set display size (css pixels).
      let sizew = this.displayWidth;
      let sizeh = this.displayHeight;
      this.mainCanvas.style.width = sizew + "px";
      this.mainCanvas.style.height = sizeh + "px";

      // Set actual size in memory (scaled to account for extra pixel density).
      let scale = window.devicePixelRatio; // Change to 1 on retina screens to see blurry canvas.
      this.mainCanvas.width = Math.floor(sizew * scale);
      this.mainCanvas.height = Math.floor(sizeh * scale);

      // Normalize coordinate system to use css pixels.
      this.mainCanvasContext.scale(scale, scale);
    }
    */


    initScreen() {
        this.mainCanvasContext = this.mainCanvas.getContext('2d');
        let screen = document.getElementById("screen");
        screen.style.width = this.displayWidth + "px";
        screen.style.height = this.displayHeight + "px";
        this.mainCanvas.width = this.displayWidth;
        this.mainCanvas.height = this.displayHeight;
        this.loadFloorCeilingImages();
    }

    loadFloorCeilingImages() {
        // Draw images on this temporary canvas to grab the ImageData pixels
        let canvas = document.createElement('canvas');

        // Canvas needs to be big enough for the wall texture
        //this.textureSize*x 
        //x correspond au nombre de textures (de haut en bas) sur imgWall
        //exemple : texture n°4 = 4ème texture, soit entre 3*64px et 4*64px
        canvas.width = this.textureSize * 2
        canvas.height = this.textureSize * 6
        let context = canvas.getContext('2d');

        // initialisation de la variable floorimg qui stoque la texture en base64 (pixels)
        // let floorimg;
        // NON -> si déclaration de variable, alors réinitialisation des textures. A faire après condition.

// MARQUEUR : Chargement des textures sol plafond mur sprites

        // selon le type de sol, la texture est adaptée
        if (floorTexture == 1) {
            let floorimg = document.getElementById('floorimg1');
            context.drawImage(floorimg, 0, 0, floorimg.width, floorimg.height);
            this.floorImageData = context.getImageData(0, 0, this.textureSize, this.textureSize);    
        } else if (floorTexture == 2) {
            let floorimg = document.getElementById('floorimg2');
            context.drawImage(floorimg, 0, 0, floorimg.width, floorimg.height);
            this.floorImageData = context.getImageData(0, 0, this.textureSize, this.textureSize);
        } else if (floorTexture == 3) {
            let floorimg = document.getElementById('floorimg3');
            context.drawImage(floorimg, 0, 0, floorimg.width, floorimg.height);
            this.floorImageData = context.getImageData(0, 0, this.textureSize, this.textureSize);
        } else if (floorTexture == 4) {
            let floorimg = document.getElementById('floorimg4');
            context.drawImage(floorimg, 0, 0, floorimg.width, floorimg.height);
            this.floorImageData = context.getImageData(0, 0, this.textureSize, this.textureSize);
        }

        // Save ceiling image pixels
        if (ceilingTexture == 1) {
            let ceilingimg = document.getElementById('ceilingimg1');
            context.drawImage(ceilingimg, 0, 0, ceilingimg.width, ceilingimg.height);
            this.ceilingImageData = context.getImageData(0, 0, this.textureSize, this.textureSize);    
        } else if (ceilingTexture == 2) {
            let ceilingimg = document.getElementById('ceilingimg2');
            context.drawImage(ceilingimg, 0, 0, ceilingimg.width, ceilingimg.height);
            this.ceilingImageData = context.getImageData(0, 0, this.textureSize, this.textureSize);
        } else if (ceilingTexture == 3) {
            let ceilingimg = document.getElementById('ceilingimg3');
            context.drawImage(ceilingimg, 0, 0, ceilingimg.width, ceilingimg.height);
            this.ceilingImageData = context.getImageData(0, 0, this.textureSize, this.textureSize);
    
        }

        // Save walls image pixels
        let wallsImage = document.getElementById('wallsImage');
        context.drawImage(wallsImage, 0, 0, wallsImage.width, wallsImage.height);
        this.wallsImageData = context.getImageData(0, 0, wallsImage.width, wallsImage.height);
        console.log("wallsImage.width=" + wallsImage.width);

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // Save sprite image pixels
        canvas = document.createElement('canvas');
        context = canvas.getContext('2d');
        //1   
        // Save sprite image pixels
        // tableau avec les identifiants des éléments d'image (les noms dans le html)
        const spriteIds = ['sprite1', 'sprite2', 'sprite3', 'sprite4', 'sprite5', 'sprite6', 'sprite7', 'sprite8', 'sprite9','sprite10', 'sprite11', 'sprite12'];

        // On parcours le tableau et effectue les opérations pour chaque élément, 
        // plutôt que les répéter comme avant.
        spriteIds.forEach((spriteId, index) => {
        let spriteImage = document.getElementById(spriteId);
        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
        canvas.width = spriteImage.width;
        canvas.height = spriteImage.height;
        context.drawImage(spriteImage, 0, 0, spriteImage.width, spriteImage.height);
        this['spriteImageData' + (index + 1)] = context.getImageData(0, 0, spriteImage.width, spriteImage.height);
        console.log(`spriteImage${index + 1}.width = ${spriteImage.width}`);
        });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // bind keyboard events to game functions (movement, etc)
    bindKeys() {
        this.keysDown = [];
        let this2 = this
        document.onkeydown = function(e) {
            e = e || window.event;
            this2.keysDown[e.keyCode] = true;
        }
        document.onkeyup = function(e) {
            e = e || window.event;
            this2.keysDown[e.keyCode] = false;
        }
    }

    gameCycle() {
        const now = Date.now()
        let timeElapsed = now - this.past
        this.past = now
        this.move(timeElapsed);
        this.updateMiniMap();
        let rayHits = [];
        this.resetSpriteHits()
        this.castRays(rayHits);
        this.sortRayHits(rayHits)
        this.drawWorld(rayHits);
        let this2 = this
        window.requestAnimationFrame(function() {
            this2.gameCycle()
        });
        // setTimeout(function() {
        //   this2.gameCycle()
        // },1000/60);


        // UNITE TEMPORELLE : 1 SECONDE/TOUR
        ///////////////////////////////////////////////////////

        // Ajoutez une nouvelle variable pour suivre le temps total écoulé depuis le début du jeu
        totalTimeElapsed += timeElapsed;

        // Utilisez totalTimeElapsed pour calculer un délai d'une seconde
        // la valeur est initialisé en tout début de code
        const oneSecondDelay = 1000; // 1 seconde en millisecondes

        if (totalTimeElapsed >= oneSecondDelay) {
            // action lorsque le délai d'une seconde est atteint
            // console.log("Une seconde s'est écoulée !");

            // Bouléen pour tour par tour
            yourTurn = true;
            // Réinitialisez totalTimeElapsed pour commencer à suivre le temps écoulé depuis le début de la prochaine seconde
            totalTimeElapsed -= oneSecondDelay;
        }
    }

        ///////////////////////////////////////////////////////
          // Test hauteur des murs
    
          ///////////////////////////////////////////////////////
    
          stripScreenHeight(screenDistance, correctDistance, heightInGame) {
        return Math.round(screenDistance / correctDistance * heightInGame);
    }

    drawTexturedRect(imgdata, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH) {
        srcX = Math.trunc(srcX)
        srcY = Math.trunc(srcY)
        dstX = Math.trunc(dstX)
        dstY = Math.trunc(dstY);
        const dstEndX = Math.trunc(dstX + dstW)
        const dstEndY = Math.trunc(dstY + dstH)
        const dx = dstEndX - dstX
        const dy = dstEndY - dstY

        // Nothing to draw
        if (dx === 0 || dy === 0) {
            return
        }

        // Linear interpolation variables
        let screenStartX = dstX
        let screenStartY = dstY
        let texStartX = srcX
        let texStartY = srcY
        const texStepX = srcW / dx
        const texStepY = srcH / dy

        // Skip top pixels off screen
        if (screenStartY < 0) {
            texStartY = srcY + (0 - screenStartY) * texStepY
            screenStartY = 0
        }

        // Skip left pixels off screen
        if (screenStartX < 0) {
            texStartX = srcX + (0 - screenStartX) * texStepX
            screenStartX = 0
        }

        for (let texY = texStartY, screenY = screenStartY; screenY < dstEndY && screenY < this.displayHeight; screenY++, texY += texStepY) {
            for (let texX = texStartX, screenX = screenStartX; screenX < dstEndX && screenX < this.displayWidth; screenX++, texX += texStepX) {
                let textureX = Math.trunc(texX)
                let textureY = Math.trunc(texY)

                // Another way using multiplication
                // let textureX = srcX + Math.trunc( ((screenX-dstX) / dstW) * srcW );
                // let textureY = srcY + Math.trunc( ((screenY-dstY) / dstH) * srcH );

                let srcPixel = Raycaster.getPixel(imgdata, textureX, textureY);
                if (srcPixel.a) {
                    Raycaster.setPixel(this.backBuffer, screenX, screenY, srcPixel.r, srcPixel.g, srcPixel.b, 255);
                }
            }
        }
    }

    drawSpriteStrip(rayHit) {
        let sprite = rayHit.sprite
        if (!rayHit.sprite.screenPosition) {
            rayHit.sprite.screenPosition = this.spriteScreenPosition(rayHit.sprite)
        }
        let rc = rayHit.sprite.screenPosition
        // sprite first strip is ahead of current strip
        if (rc.x > rayHit.strip) {
            return
        }
        // sprite last strip is before current strip
        if (rc.x + rc.w < rayHit.strip) {
            return
        }
        let diffX = Math.trunc(rayHit.strip - rc.x)
        let dstX = rc.x + diffX // skip left parts of sprite already drawn
        let srcX = Math.trunc(diffX / rc.w * this.textureSize)
        let srcW = 1
        if (srcX >= 0 && srcX < this.textureSize) {

        //if (this)
            //  mettre la condition  de type
            // !rayhit.sprite.spriteType
            //lire le code

        // Créez un objet (ou tableau) pour stocker les données associées à chaque spriteType
            const spriteData = {
                0: this.spriteImageData8,   // NPC TEST ENEMY
                1: this.spriteImageData1,   // PNJ1
                2: this.spriteImageData2,   // PNJ2
                3: this.spriteImageData3,   // Garde
                4: this.spriteImageData4,   // Rock
                5: this.spriteImageData5,   // Tonneau
                6: this.spriteImageData6,   // buisson
                7: this.spriteImageData7,   // pancarte
                8: this.spriteImageData8,   // Imp
                9: this.spriteImageData9,    // Treasure !
                10: this.spriteImageData10,   // "dead enemy skull"
                11: this.spriteImageData11,   // Statue
                12: this.spriteImageData12,   // Brasier
            };
            
            // Utilisez la structure de données pour accéder aux données appropriées en fonction de spriteType
            const spriteType = rayHit.sprite.spriteType;
            if (spriteData.hasOwnProperty(spriteType)) {
                this.drawTexturedRect(spriteData[spriteType], srcX, 0, srcW, this.textureSize, dstX, rc.y, this.stripWidth, rc.h);
            }
        }
    }

    drawWallStrip(rayHit, textureX, textureY, wallScreenHeight) {
        let swidth = 4;
        let sheight =64;
        let imgx = rayHit.strip * this.stripWidth;
        
        let imgy = (this.displayHeight - wallScreenHeight) / 2;
        let imgw = this.stripWidth;
        let imgh = wallScreenHeight;
        this.drawTexturedRect(this.wallsImageData, textureX, textureY, swidth, sheight, imgx, imgy, imgw, imgh);

        // Par défaut : hauteur = 1
        /*
            TEST : si mur == ; ceilingHeight = 4
        */
        //

        for (let level = 1; level < this.ceilingHeight; ++level) {
            this.drawTexturedRect(this.wallsImageData, textureX, textureY, swidth, sheight, imgx, imgy - level * wallScreenHeight, imgw, imgh);
        }

        /*
        if (rayHit.texture === 6) {
            this.drawTexturedRect(this.wallsImageData, textureX, textureY, swidth, sheight, imgx, imgy - level * 1, imgw, imgh);
        } else {
            for (let level = 1; level < this.ceilingHeight; ++level) {
                this.drawTexturedRect(this.wallsImageData, textureX, textureY, swidth, sheight, imgx, imgy - level * wallScreenHeight, imgw, imgh);
            }
        }
        */
    }

    drawSolidFloor() {
        for (let y = this.displayHeight / 2; y < this.displayHeight; ++y) {
            for (let x = 0; x < this.displayWidth; ++x) {
                Raycaster.setPixel(this.backBuffer, x, y, 111, 71, 59, 255);
            }
        }
    }

    //////////////////////////////////////////////////////////////////////
    // SkyBox
    //////////////////////////////////////////////////////////////////////

    drawSolidCeiling() {
        for (let y = 0; y < this.displayHeight / 2; ++y) {
            for (let x = 0; x < this.displayWidth; ++x) {
                Raycaster.setPixel(this.backBuffer, x, y, 0, 151, 239, 240);
            }
        }
    }

    drawTexturedFloor(rayHits) {
        for (let rayHit of rayHits) {
            const wallScreenHeight = this.stripScreenHeight(this.viewDist, rayHit.correctDistance, this.tileSize);
            const centerY = this.displayHeight / 2;
            const eyeHeight = this.tileSize / 2 + this.player.z;
            const screenX = rayHit.strip * this.stripWidth;
            const currentViewDistance = this.viewDistances[rayHit.strip]
            const cosRayAngle = Math.cos(rayHit.rayAngle)
            const sinRayAngle = Math.sin(rayHit.rayAngle)
            let screenY = Math.max(centerY, Math.floor((this.displayHeight - wallScreenHeight) / 2) + wallScreenHeight)
            for (; screenY < this.displayHeight; screenY++) {
                let dy = screenY - centerY
                let floorDistance = (currentViewDistance * eyeHeight) / dy
                let worldX = this.player.x + floorDistance * cosRayAngle
                let worldY = this.player.y + floorDistance * -sinRayAngle
                if (worldX < 0 || worldY < 0 || worldX >= this.worldWidth || worldY >= this.worldHeight) {
                    continue;
                }
                let textureX = Math.floor(worldX) % this.tileSize;
                let textureY = Math.floor(worldY) % this.tileSize;
                if (this.tileSize != this.textureSize) {
                    textureX = Math.floor(textureX / this.tileSize * this.textureSize)
                    textureY = Math.floor(textureY / this.tileSize * this.textureSize)
                }
                let srcPixel = Raycaster.getPixel(this.floorImageData, textureX, textureY)
                Raycaster.setPixel(this.backBuffer, screenX, screenY, srcPixel.r, srcPixel.g, srcPixel.b, 255)
            }
        }
    }

    drawTexturedCeiling(rayHits) {
        for (let rayHit of rayHits) {
            const wallScreenHeight = this.stripScreenHeight(this.viewDist, rayHit.correctDistance, this.tileSize);
            const centerY = this.displayHeight / 2;
            const eyeHeight = this.tileSize / 2 + this.player.z;
            const screenX = rayHit.strip * this.stripWidth;
            const currentViewDistance = this.viewDistances[rayHit.strip]
            const cosRayAngle = Math.cos(rayHit.rayAngle)
            const sinRayAngle = Math.sin(rayHit.rayAngle)
            const currentCeilingHeight = this.tileSize * this.ceilingHeight
            let screenY = Math.min(centerY - 1, Math.floor((this.displayHeight - wallScreenHeight) / 2) - 1)
            for (; screenY >= 0; screenY--) {
                let dy = centerY - screenY
                let ceilingDistance = (currentViewDistance * (currentCeilingHeight - eyeHeight)) / dy
                let worldX = this.player.x + ceilingDistance * cosRayAngle
                let worldY = this.player.y + ceilingDistance * -sinRayAngle
                if (worldX < 0 || worldY < 0 || worldX >= this.worldWidth || worldY >= this.worldHeight) {
                    continue;
                }
                let textureX = Math.floor(worldX) % this.tileSize;
                let textureY = Math.floor(worldY) % this.tileSize;
                if (this.tileSize != this.textureSize) {
                    textureX = Math.floor(textureX / this.tileSize * this.textureSize)
                    textureY = Math.floor(textureY / this.tileSize * this.textureSize)
                }
                let srcPixel = Raycaster.getPixel(this.ceilingImageData, textureX, textureY)
                Raycaster.setPixel(this.backBuffer, screenX, screenY, srcPixel.r, srcPixel.g, srcPixel.b, 255)
            }
        }
    }

    drawWorld(rayHits) {
        this.ceilingHeight = ceilingHeight;
        //document.getElementById("ceilingHeight").value;

        if (!this.backBuffer) {
            this.backBuffer = this.mainCanvasContext.createImageData(this.displayWidth, this.displayHeight);
        }
        
        let texturedFloorOn = true;

        if (texturedFloorOn) {
            this.drawTexturedFloor(rayHits);
        } else {
            this.drawSolidFloor()
        }

        let texturedCeilingOn = ceilingRender;
        // let texturedCeilingOn = document.getElementById("texturedCeilingOn").checked;

        if (texturedCeilingOn) {
            this.drawTexturedCeiling(rayHits);
        } else {
            this.drawSolidCeiling()
        }
        for (let rayHit of rayHits) {
            if (rayHit.sprite) {
                this.drawSpriteStrip(rayHit)
            } else {
                let wallScreenHeight = Math.round(this.viewDist / rayHit.correctDistance * this.tileSize);
                let textureX = (rayHit.horizontal ? this.textureSize : 0) + (rayHit.tileX / this.tileSize * this.textureSize);
                let textureY = this.textureSize * (rayHit.wallType - 1);
                this.drawWallStrip(rayHit, textureX, textureY, wallScreenHeight);
            }
        }
        this.mainCanvasContext.putImageData(this.backBuffer, 0, 0);

    }

    createRayAngles() {
        if (!this.rayAngles) {
            this.rayAngles = [];
            for (let i = 0; i < this.rayCount; i++) {
                let screenX = (this.rayCount / 2 - i) * this.stripWidth
                let rayAngle = Math.atan(screenX / this.viewDist)
                this.rayAngles.push(rayAngle)
            }
            console.log("No. of ray angles=" + this.rayAngles.length);
        }
    }

    createViewDistances() {
        if (!this.viewDistances) {
            this.viewDistances = [];
            for (let x = 0; x < this.rayCount; x++) {
                let dx = (this.rayCount / 2 - x) * this.stripWidth
                let currentViewDistance = Math.sqrt(dx * dx + this.viewDist * this.viewDist)
                this.viewDistances.push(currentViewDistance)
            }
            console.log("No. of view distances=" + this.viewDistances.length);
        }
    }

    sortRayHits(rayHits) {
        rayHits.sort(function(a, b) {
            return a.distance > b.distance ? -1 : 1
        });
    }

    castRays(rayHits) {
        for (let i = 0; i < this.rayAngles.length; i++) {
            let rayAngle = this.rayAngles[i];
            this.castSingleRay(rayHits, this.player.rot + rayAngle, i);
        }
    }

    onCellHit(ray) {
        let vx = ray.vx,
            vy = ray.vy,
            hx = ray.hx,
            hy = ray.hy
        let up = ray.up,
            right = ray.right
        let cellX = ray.cellX,
            cellY = ray.cellY
        let wallHit = ray.wallHit
        let horizontal = ray.horizontal
        let wallFound = false
        let stripIdx = ray.strip
        let rayAngle = ray.rayAngle
        let rayHits = ray.rayHits

        // Check for sprites in cell
        let spritesFound = this.findSpritesInCell(cellX, cellY, true)
        for (let sprite of spritesFound) {
            let spriteHit = RayHit.spriteRayHit(sprite, this.player.x - sprite.x, this.player.y - sprite.y, stripIdx, rayAngle)
            if (spriteHit.distance) {
                // sprite.hit = true
                rayHits.push(spriteHit)
            }
        }

        // Handle cell walls
        if (this.map[cellY][cellX] > 0) {
            let distX = this.player.x - (horizontal ? hx : vx);
            let distY = this.player.y - (horizontal ? hy : vy)
            let squaredDistance = distX * distX + distY * distY;
            if (!wallHit.distance || squaredDistance < wallHit.distance) {
                wallFound = true
                wallHit.distance = squaredDistance;
                wallHit.horizontal = horizontal
                if (horizontal) {
                    wallHit.x = hx
                    wallHit.y = hy
                    wallHit.tileX = hx % this.tileSize;
                    // Facing down, flip image
                    if (!up) {
                        wallHit.tileX = this.tileSize - wallHit.tileX;
                    }
                } else {
                    wallHit.x = vx
                    wallHit.y = vy
                    wallHit.tileX = vy % this.tileSize;
                    // Facing left, flip image
                    if (!right) {
                        wallHit.tileX = this.tileSize - wallHit.tileX;
                    }
                }
                wallHit.wallType = this.map[cellY][cellX];
            }
        }
        return !wallFound
    }

    onRayEnd(ray) {
        let rayAngle = ray.rayAngle
        let rayHits = ray.rayHits
        let stripIdx = ray.strip
        let wallHit = ray.wallHit
        if (wallHit.distance) {
            wallHit.distance = Math.sqrt(wallHit.distance)
            wallHit.correctDistance = wallHit.distance * Math.cos(this.player.rot - rayAngle);
            wallHit.strip = stripIdx;
            wallHit.rayAngle = rayAngle;
            this.drawRay(wallHit.x, wallHit.y);
            rayHits.push(wallHit);
        }
    }

    castSingleRay(rayHits, rayAngle, stripIdx) {
        rayAngle %= Raycaster.TWO_PI;
        if (rayAngle < 0) rayAngle += Raycaster.TWO_PI;

        //   2  |  1
        //  ----+----
        //   3  |  4
        let right = (rayAngle < Raycaster.TWO_PI * 0.25 && rayAngle >= 0) || // Quadrant 1
            (rayAngle > Raycaster.TWO_PI * 0.75); // Quadrant 4
        let up = rayAngle < Raycaster.TWO_PI * 0.5 && rayAngle >= 0; // Quadrant 1 and 2

        let ray = new RayState(rayAngle, stripIdx)
        ray.rayHits = rayHits
        ray.right = right
        ray.up = up
        ray.wallHit = new RayHit

        // Process current player cell
        ray.cellX = Math.trunc(this.player.x / this.tileSize);
        ray.cellY = Math.trunc(this.player.y / this.tileSize);
        this.onCellHit(ray)

        // closest vertical line
        ray.vx = right ? Math.trunc(this.player.x / this.tileSize) * this.tileSize + this.tileSize :
            Math.trunc(this.player.x / this.tileSize) * this.tileSize - 1
        ray.vy = this.player.y + (this.player.x - ray.vx) * Math.tan(rayAngle)

        // closest horizontal line
        ray.hy = up ? Math.trunc(this.player.y / this.tileSize) * this.tileSize - 1 :
            Math.trunc(this.player.y / this.tileSize) * this.tileSize + this.tileSize
        ray.hx = this.player.x + (this.player.y - ray.hy) / Math.tan(rayAngle)

        // vector for next vertical line
        let stepvx = right ? this.tileSize : -this.tileSize
        let stepvy = this.tileSize * Math.tan(rayAngle)

        // vector for next horizontal line
        let stephy = up ? -this.tileSize : this.tileSize
        let stephx = this.tileSize / Math.tan(rayAngle)

        // tan() returns positive values in Quadrant 1 and Quadrant 4
        // But window coordinates need negative coordinates for Y-axis so we reverse them
        if (right) {
            stepvy = -stepvy
        }

        // tan() returns stepx as positive in quadrant 3 and negative in quadrant 4
        // This is the opposite of horizontal window coordinates so we need to reverse the values
        // when angle is facing down
        if (!up) {
            stephx = -stephx
        }

        // Vertical lines
        ray.vertical = true
        ray.horizontal = false
        while (ray.vx >= 0 && ray.vx < this.worldWidth && ray.vy >= 0 && ray.vy < this.worldHeight) {
            ray.cellX = Math.trunc(ray.vx / this.tileSize)
            ray.cellY = Math.trunc(ray.vy / this.tileSize)
            if (this.onCellHit(ray)) {
                ray.vx += stepvx
                ray.vy += stepvy
            } else {
                break
            }
        }

        // Horizontal lines
        ray.vertical = false
        ray.horizontal = true
        while (ray.hx >= 0 && ray.hx < this.worldWidth && ray.hy >= 0 && ray.hy < this.worldHeight) {
            ray.cellX = Math.trunc(ray.hx / this.tileSize)
            ray.cellY = Math.trunc(ray.hy / this.tileSize)
            if (this.onCellHit(ray)) {
                ray.hx += stephx
                ray.hy += stephy
            } else {
                break
            }
        }

        this.onRayEnd(ray)
    }

    /**
    Algorithm adapted from this article:
    https://dev.opera.com/articles/3d-games-with-canvas-and-raycasting-part-2/

                 S----------+                       ------
                  \         |                          ^
                   \        |                          |
                    \<--x-->|                     centerDistance
     spriteDistance  \------+--view plane -----        |
                      \     |               ^          |
                       \    |               |          |
                        \   |         viewDist         |
                         \sa|               |          |
                          \ |-----+         |          |
                           \| rot |         v          v
                            P-----+---------------------------

       S  = the sprite      dx  = S.x - P.x      sa  = spriteAngle
       P  = player          dy  = S.y - P.y      rot = player camera rotation

      totalAngle = spriteAngle + rot
      tan(spriteAngle) = x / viewDist
      cos(spriteAngle) = centerDistance / spriteDistance
    */
    spriteScreenPosition(sprite) {
        let rc = {
            x: 0,
            y: 0,
            w: 0,
            h: 0
        }

        // Calculate angle between player and sprite
        // We use atan2() to find the sprite's angle if the player rotation was 0 degrees
        // Then we deduct the player's current rotation from it
        // Note that plus (+) is used to "deduct" instead of minus (-) because it takes
        // into account these facts:
        //   a) dx and dy use world coordinates, while atan2() uses cartesian coordinates.
        //   b) atan2() can return positive or negative angles based on the circle quadrant
        let dx = sprite.x - this.player.x
        let dy = sprite.y - this.player.y
        let totalAngle = Math.atan2(dy, dx)
        let spriteAngle = totalAngle + this.player.rot

        // x distance from center line
        let x = Math.tan(spriteAngle) * this.viewDist;

        let spriteDistance = Math.sqrt(dx * dx + dy * dy)
        let centerDistance = Math.cos(spriteAngle) * spriteDistance;

        // spriteScreenWidth   spriteWorldWidth
        // ----------------- = ----------------
        //      viewDist        centerDistance
        let spriteScreenWidth = this.tileSize * this.viewDist / centerDistance
        let spriteScreenHeight = spriteScreenWidth // assume both width and height are the same

        rc.x = (this.displayWidth / 2) + x // get distance from left of screen
            -
            (spriteScreenWidth / 2) // deduct half of sprite width because x is center of sprite
        rc.y = (this.displayHeight - spriteScreenWidth) / 2.0
        rc.w = spriteScreenWidth
        rc.h = spriteScreenHeight

        return rc
    }

    drawRay(rayX, rayY) {
        let miniMapObjects = document.getElementById("minimapobjects");
        let objectCtx = miniMapObjects.getContext("2d");

        rayX = rayX / (this.mapWidth * this.tileSize) * 100;
        rayX = rayX / 100 * Raycaster.MINIMAP_SCALE * this.mapWidth;
        rayY = rayY / (this.mapHeight * this.tileSize) * 100;
        rayY = rayY / 100 * Raycaster.MINIMAP_SCALE * this.mapHeight;

        let playerX = this.player.x / (this.mapWidth * this.tileSize) * 100;
        playerX = playerX / 100 * Raycaster.MINIMAP_SCALE * this.mapWidth;

        let playerY = this.player.y / (this.mapHeight * this.tileSize) * 100;
        playerY = playerY / 100 * Raycaster.MINIMAP_SCALE * this.mapHeight;

        objectCtx.strokeStyle = "rgba(0,100,0,0.3)";
        objectCtx.lineWidth = 0.5;
        objectCtx.beginPath();
        objectCtx.moveTo(playerX, playerY);
        objectCtx.lineTo(
            rayX,
            rayY
        );
        objectCtx.closePath();
        objectCtx.stroke();
    }

    move(timeElapsed) {
        const up = this.keysDown[KEY_UP] || this.keysDown[KEY_W]
        const down = this.keysDown[KEY_DOWN] || this.keysDown[KEY_S]
        const left = this.keysDown[KEY_LEFT] || this.keysDown[KEY_A]
        const right = this.keysDown[KEY_RIGHT] || this.keysDown[KEY_D]

        // UNITE TEMPORELLE  
        /////////////////////////////////////////////////////////

        // NE PAS TOUCHER, c'est présent dans le code initial
        // let timeBasedFactor = timeElapsed / UPDATE_INTERVAL;

        // TELEPORT  
        /////////////////////////////////////////////////////////
        const action = this.keysDown[KEY_F];

        //  Algorithme d'avancée case par case
        /////////////////////////////////////////////////////////

        // math.trunc() suprime les décimales pour ne garder que l'entier inférieur 
        const x = Math.floor(this.player.x / this.tileSize);
        const y = Math.floor(this.player.y / this.tileSize);

        const northDir = this.map[y - 1][x];
        const estDir = this.map[y][x + 1];
        const southDir = this.map[y + 1][x];
        const ouestDir = this.map[y][x - 1];

        //autocenter debug
        // console.log("player x : "+this.player.x+" y:"+this.player.y);
        // console.log("player x : "+this.player.x/1280+" y:"+this.player.y/1280);

        /*
        console.log("N : " + northDir);
        console.log("E : " + estDir);
        console.log("S : " + southDir);
        console.log("W : " + ouestDir);
        */

        if (this.player.rot === nord) {
            if (northDir === 0) {
                forward = true;

            } else {
                forward = false;
            }

            if (southDir === 0) {
                backward = true;
            } else {
                backward = false;
            }
        } else if (this.player.rot === est) {
            if (estDir === 0) {
                forward = true;
            } else {
                forward = false;
            }

            if (ouestDir === 0) {
                backward = true;
            } else {
                backward = false;
            }
        } else if (this.player.rot === sud) {
            if (southDir === 0) {
                forward = true;
            } else {
                forward = false;
            }

            if (northDir === 0) {
                backward = true;
            } else {
                backward = false;
            }
        } else if (this.player.rot === ouest) {
            if (ouestDir === 0) {
                forward = true;
            } else {
                forward = false;
            }

            if (estDir === 0) {
                backward = true;
            } else {
                backward = false;
            }
        }

        if (up && yourTurn == true && forward == true) {
            forwardAnimation = true;
            // console.log("Action - Avance");

            // établissement de la position cible (avance)
            if (this.player.rot == est) {
                moveTargetX = this.player.x + 1280; // Déplacement horizontal
            } else if (this.player.rot == ouest) {
                moveTargetX = this.player.x - 1280; // Déplacement horizontal
            } else if (this.player.rot == nord) {
                moveTargetY = this.player.y - 1280; // Déplacement vertical
            } else if (this.player.rot == sud) {
                moveTargetX = this.player.y + 1280; // Déplacement vertical
            } else {
                console.log("this.player.rot isn't fixed - need exact angle in radiant")
            }

            yourTurn = false;

        } else if (down && yourTurn == true && backward == true) {
            backwardAnimation = true;
            // console.log("Action - Recule");
            yourTurn = false;
        }

        // peut être inutile à présent : la condition suivante peut simplement additionner ou soustraire, plutôt que faire une multiplication par -1 ou 1.
        if (forwardAnimation || backwardAnimation) {
        
            const northFrontY = y - 1;
            const northFrontX = x;
            const estFrontY = y;
            const estFrontX = x + 1;
            const southFrontY = y + 1;
            const southFrontX = x;
            const ouestFrontY = y;
            const ouestFrontX = x - 1;

            if (forwardAnimation) {
                animationDirection = 1; // Avance (positif)
            } else {
                animationDirection = -1; // Recule (négatif)
            }

            // PROBLEME : tu met des opérateurs - et + alors que animation direction est là pour dire avant//arriere
            // Vérification de l'angle de la camera
            // selon l'angle de la camera, X ou Y
            if (this.player.rot == est) {
                this.player.x += animationDirection * 128; // Déplacement horizontal
            } else if (this.player.rot == ouest) {
                this.player.x -= animationDirection * 128; // Déplacement horizontal
            } else if (this.player.rot == nord) {
                this.player.y -= animationDirection * 128; // Déplacement vertical
            } else if (this.player.rot == sud) {
                this.player.y += animationDirection * 128; // Déplacement vertical
            } else {
                console.log("this.player.rot isn't fixed - need exact angle in radiant")
            }

            // Incrémente la progression de l'animation
            // vérification de la distance parcourue
            if (forwardAnimation) {
                forwardAnimationProgress += 1;
            } else {
                backwardAnimationProgress += 1;
            }

            // console.log("Poudoudou");  

            // Vérifie si l'animation est terminée
            if (forwardAnimationProgress == 10 || backwardAnimationProgress == 10) {
                
                forwardAnimation = false;
                backwardAnimation = false;
                forwardAnimationProgress = 0;
                backwardAnimationProgress = 0;


                // centrage automatique
                // La logique étant : on calcule la position CellX et Celly,
                // on l'arrondis à l'entier inférieur, puis on multiplie par les unités ingame, 
                // puis on ajoute la moitié d'une cellule en X et Y pour centrer le joueur.
                // C'est de de loin la meilleur solution trouvée pour l'instant.
                this.player.y = Math.floor(this.player.y/1280)*1280+640;
                this.player.x = Math.floor(this.player.x/1280)*1280+640;

                // console.log("fin d'avance/recul, caméra centrée")
                yourTurn = true;
            }
        }

        /////////////////////////////////////////////////////////
        //  Algorithme de rotation à angle fixe
        /////////////////////////////////////////////////////////

        if (right && yourTurn == true) {
            rightAnimation = true;
            yourTurn = false;
            animationProgress = 0; // Initialisez animationProgress à 0

            // pour éviter les erreurs de calcul, les décalages, les virgules flottantes, on target des valeurs étalon.
            if (this.player.rot == nord) {
                orientationTarget = est;
            } else if (this.player.rot == est) {
                orientationTarget = sud;
            } else if (this.player.rot == sud) {
                orientationTarget = ouest;
            } else if (this.player.rot == ouest) {
                orientationTarget = nord;
            }

            // console.log("action")
        } else if (left && yourTurn == true) {
            leftAnimation = true;
            yourTurn = false;
            animationProgress = 0;

            if (this.player.rot == nord) {
                orientationTarget = ouest;
            } else if (this.player.rot == ouest) {
                orientationTarget = sud;
            } else if (this.player.rot == sud) {
                orientationTarget = est;
            } else if (this.player.rot == est) {
                orientationTarget = nord;
            }
            // console.log("action")
        }

        /////////////////////////////////////////////////////////
        // RIGHT ou LEFT - terminé
        /////////////////////////////////////////////////////////

        if (rightAnimation || leftAnimation) {
            if (rightAnimation) {
                animationDirection = -1; // Sens horaire (négatif)
            } else {
                animationDirection = 1; // Sens antihoraire (positif)
            }

            // Calcule l'angle de rotation en fonction de la progression
            // facteurpositif ou negatif déterminer le sens de rotation
            // UTILISATION DES RADIANS : 0,19*8 = 152, puis autocentrage caméra. (0,19 = 11.25°)
            const rotationAngle = Math.PI / 32;

            // Applique l'angle de rotation à this.player.rot
            if (rightAnimation) {
                this.player.rot -= rotationAngle;
            } else if (leftAnimation) {
                this.player.rot += rotationAngle;
            }

            // Incrémente la progression de l'animation
            animationProgress += 1;

            // Vérifie si l'animation est terminée
            if (animationProgress == 16) {
                // reviens systématiquement à un angle en radiant positif.
                if (this.player.rot < 0) {
                    this.player.rot -= 2 * Math.PI;
                } else if (this.player.rot > 2 * Math.PI) {
                    this.player.rot += 2 * Math.PI;
                }

                // centrage automatique de la caméra
                this.player.rot = orientationTarget;

                rightAnimation = false;
                leftAnimation = false;
                rightAnimationProgress = 0;
                leftAnimationProgress = 0;
                yourTurn = true;

                console.log("angle :" + this.player.rot)
            }
        }

        /////////////////////////////////////////////////////////
        //  Algorithme d'avancée case par case
        /////////////////////////////////////////////////////////

        let newX = this.player.x;
        let newY = this.player.y;

        // Round down to integers
        newX = Math.floor(newX);
        newY = Math.floor(newY);

        let cellX = newX / this.tileSize;
        let cellY = newY / this.tileSize;

        // ISBLOCKING était là à l'orgine
        if (this.isBlocking(cellX, cellY)) { // are we allowed to move to the new position?
            return; // no, bail out.
        }

        ///////////////////////////////////////////////////////////////////////////////////////////////
        // TELEPORT FUNCTION
        ///////////////////////////////////////////////////////////////////////////////////////////////


        // position des events
        // Solution adoptée : deux listes de coordonnées mises en relation par leur position dans cette dernière.
        // [0][i] de A <=> [0][i] de B
        // il y a un "tunnel" entre les deux.
        //        [x, y,  dir, ceiling, ceilingtexture, wall, floor, "commentaire"],


// MARQUEUR : event événement téléporteur

        // from outside
        const mapEventA = [
            [17, 5,  ouest, false, 3, 2, 3, "Moving out..."],
            [13, 9,  nord, false, 1, 2, 3, "Moving out..."],
            [9, 6,  est, false, 3, 2, 3, "Moving out..."],
            [2,12, nord, true, 2, 1, 2, "Moving out of the dungeon !"]
        ];
        // from inside
        const mapEventB = [
            [19,5, est, true, 3, 1, 2, "Moving in !"],
            [13,11, sud, true, 3, 1, 4, "Moving in !"],
            [7,6, ouest, true, 2, 1, 2, "Moving in !"],
            [2,14, sud, true, 1, 1, 1, "It's a pretty scary place..."]
        ];

        if (action && yourTurn) {
            // dialogue NPC
            // Reprends la logique de détection de collision (attention /!\ répétition)
            const playerX = this.player.x;
            const playerY = this.player.y;
            const playerRot = this.player.rot;
        
            let frontX, frontY;
        
            // Calcul des coordonnées de la case devant le joueur en fonction de sa rotation
            if (playerRot === nord) {
                frontX = Math.floor(playerX / this.tileSize);
                frontY = Math.floor((playerY - this.tileSize) / this.tileSize);
            } else if (playerRot === est) {
                frontX = Math.floor((playerX + this.tileSize) / this.tileSize);
                frontY = Math.floor(playerY / this.tileSize);
            } else if (playerRot === sud) {
                frontX = Math.floor(playerX / this.tileSize);
                frontY = Math.floor((playerY + this.tileSize) / this.tileSize);
            } else if (playerRot === ouest) {
                frontX = Math.floor((playerX - this.tileSize) / this.tileSize);
                frontY = Math.floor(playerY / this.tileSize);
            }

            // Vérification si la case devant le joueur contient un sprite
            for (let i = 0; i < this.sprites.length; i++) {
                const spriteType = this.sprites[i].spriteType; // Récupérez le sprite actuel dans la boucle
                const spriteX = Math.floor(this.sprites[i].x / this.tileSize);
                const spriteY = Math.floor(this.sprites[i].y / this.tileSize);

                // définir l'output pour la console
                const outputElement = document.getElementById("output");
                const PlayerHPoutput = document.getElementById("playerHPoutput")
        
                if (spriteX === frontX && spriteY === frontY) {
                    yourTurn = false;
                    // Un sprite est présent dans la case devant le joueur
                    if (spriteType == 0) {
                        let damage = this.player.attack;
                        this.sprites[i].hp -= damage;

                        consoleContent += "> You attack, inflincting " + damage + " dmg points. The enemy has " + this.sprites[i].hp + " health points" + "<br>";

                        outputElement.innerHTML = consoleContent;

                        this.sprites[i].attack(this.player);


                        // Accédez à l'élément HTML
                        const PlayerHP = document.getElementById("PlayerHPoutput");
                        const PlayerXP = document.getElementById("PlayerXPoutput");

                        // Modifiez la valeur numérique
                        PlayerHP.textContent = this.player.hp;        
                        

                        if (this.sprites[i].hp <= 0) {
                            consoleContent += "> The enemy is dead. You won 10xp points ! <br> ";
                            this.player.xp += 10;
                            PlayerXP.textContent = this.player.xp;  
                            outputElement.innerHTML = consoleContent;
                            this.sprites[i].spriteType = 10;
                        }



                    }  else if (spriteType == 1) {

                        let entry = 'Kali says : "Hey ! whatya up to ?"';
                        consoleContent += "> " + entry + "<br>";
                        outputElement.innerHTML = consoleContent;

                    } else if (spriteType == 2) {

                        let entry = 'Guard says : "Get the fuck outta my way."';
                        consoleContent += "> " + entry + "<br>";
                        outputElement.innerHTML = consoleContent;

                    } else if (spriteType == 3) {
                        let entry = 'Siggar says : "Looking for something ?"';
                        consoleContent += "> " + entry + "<br>";
                        outputElement.innerHTML = consoleContent;
                    } else if (spriteType == 4) {
                        let entry = 'Just a rock...';
                        consoleContent += "> " + entry + "<br>";
                        outputElement.innerHTML = consoleContent;
                    } else if (spriteType == 5) {
                        let entry = 'A barrel. Nothing amazing.';
                        consoleContent += "> " + entry + "<br>";
                        outputElement.innerHTML = consoleContent;
                    } else if (spriteType == 6) {
                        let entry = 'Wanna beat around the bush ?';
                        consoleContent += "> " + entry + "<br>";
                        outputElement.innerHTML = consoleContent;
                    } else if (spriteType == 7) {
                        let entry = '"The Wailing Tavern", nice.';
                        consoleContent += "> " + entry + "<br>";
                        outputElement.innerHTML = consoleContent;
                    }
                    // laisser la 8
                    else if (spriteType == 9) {
                        let entry = 'You found the treasure ! Your adventure pays off, thanks for playing.';
                        consoleContent += "> " + entry + "<br>";
                        outputElement.innerHTML = consoleContent;
                    } 
                    else if (spriteType == 10) {
                        let entry = "It's dead...";
                        consoleContent += "> " + entry + "<br>";
                        outputElement.innerHTML = consoleContent;
                    } 
                    else if (spriteType == 11) {
                        let entry = 'A statue of the Goddess.';
                        consoleContent += "> " + entry + "<br>";
                        outputElement.innerHTML = consoleContent;
                    }
                    // console.log('Un sprite se trouve face à vous');
                }
            }

            // formule pour log la position
            // console.log(Math.floor(newX/this.tileSize));
            // console.log(Math.floor(newY/this.tileSize));

            // faire boucle pour comparer tous les évenements listés
            // comparer les valeur de référence avec celle du joueur (A/B[i][0] = playerX, A/B[i][1] = playerY)
            // La liste A et B sont des mirroir: A[1] téléportera à B[1], ainsi de suite et vice versa.
            // La  position dans la liste A ou B réfère au même event/téléporteur A/B[1]...[2]...[3]...
            
            /*
            Memo organisation des téléporteurs
        const mapEventX = [
            [Y, X, Rotation, RenduPlafond, TexturePlafond, HauteurPlafond, TextureSol, Contextualisation],
            ]
        ];
            */

            for (var i = 0; i < mapEventA.length; i++) {
                if (
                    Math.floor(newX / this.tileSize) === mapEventA[i][0] &&
                    Math.floor(newY / this.tileSize) === mapEventA[i][1] &&
                    yourTurn == true
                ) {
                    // téléportation aux coordonnées données dans l'Event
                    newX = (mapEventB[i][0] * this.tileSize) + 640;
                    newY = (mapEventB[i][1] * this.tileSize) + 640;
                    this.player.rot = mapEventB[i][2];

                    // variable de modification d'environnement
                    ceilingRender = mapEventB[i][3];
                    ceilingTexture = mapEventB[i][4];
                    ceilingHeight = mapEventB[i][5];
                    // variable de modification des textures (vers le type '1' = terre)
                    floorTexture = mapEventB[i][6];
                    // On recharge toutes les textures, sinon le canvas ne sera pas modifié                    
                    this.loadFloorCeilingImages();
                    console.log(mapEventB[i][7]);

                    yourTurn = false;

                    break; // Sortir de la boucle une fois la téléportion effectuéef
                }
                // On compare également les coordonnées suivantes pour aller/retour
                if (
                    Math.floor(newX / this.tileSize) === mapEventB[i][0] &&
                    Math.floor(newY / this.tileSize) === mapEventB[i][1] &&
                    yourTurn == true
                ) {
                    // téléportation aux coordonnées données dans l'Event
                    newX = (mapEventA[i][0] * this.tileSize) + 640;
                    newY = (mapEventA[i][1] * this.tileSize) + 640;

                    this.player.rot = mapEventA[i][2];

                    // variable de modification d'environnement
                    ceilingRender = mapEventA[i][3];
                    ceilingTexture = mapEventA[i][4];
                    ceilingHeight = mapEventA[i][5];
                    // variable de modification des textures (vers le type '1' = terre)
                    floorTexture = mapEventA[i][6];
                    // On recharge toutes les textures, sinon le canvas ne sera pas modifié
                    this.loadFloorCeilingImages();
                    console.log(mapEventA[i][7]);

                    yourTurn = false;

                    break; // Sortir de la boucle une fois la téléportion effectuée
                } else {
                    // console.log(false);
                }
            }
        }

        this.player.x = newX; // set new position
        this.player.y = newY;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // TELEPORT TRIGGER
    ///////////////////////////////////////////////////////////////////////////////////////////////


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // BLOCAGE
    ///////////////////////////////////////////////////////////////////////////////////////////////
    cellIsBlocking(x, y) {

    }

    isBlocking(x, y) {
        // first make sure that we cannot move outside the boundaries of the level
        if (y < 0 || y >= this.mapHeight || x < 0 || x >= this.mapWidth)
            return true;
    }


    updateMiniMap() {

        let miniMap = document.getElementById("minimap");
        let miniMapObjects = document.getElementById("minimapobjects");

        let objectCtx = miniMapObjects.getContext("2d");

        miniMapObjects.width = miniMapObjects.width;

        let playerX = this.player.x / (this.mapWidth * this.tileSize) * 100;
        playerX = playerX / 100 * Raycaster.MINIMAP_SCALE * this.mapWidth;

        let playerY = this.player.y / (this.mapHeight * this.tileSize) * 100;
        playerY = playerY / 100 * Raycaster.MINIMAP_SCALE * this.mapHeight;

        objectCtx.fillStyle = "red";
        objectCtx.fillRect( // draw a dot at the current player position
            playerX - 2,
            playerY - 2,
            4, 4
        );

        objectCtx.strokeStyle = "red";
        objectCtx.beginPath();
        objectCtx.moveTo(playerX, playerY);
        objectCtx.lineTo(
            (playerX + Math.cos(this.player.rot) * 4 * Raycaster.MINIMAP_SCALE),
            (playerY + -Math.sin(this.player.rot) * 4 * Raycaster.MINIMAP_SCALE)
        );
        objectCtx.closePath();
        objectCtx.stroke();
    }


    drawMiniMap() {
        let miniMap = document.getElementById("minimap"); // the actual map
        let miniMapCtr = document.getElementById("minimapcontainer"); // the container div element
        let miniMapObjects = document.getElementById("minimapobjects"); // the canvas used for drawing the objects on the map (player character, etc)

        miniMap.width = this.mapWidth * Raycaster.MINIMAP_SCALE; // resize the internal canvas dimensions
        miniMap.height = this.mapHeight * Raycaster.MINIMAP_SCALE; // of both the map canvas and the object canvas
        miniMapObjects.width = miniMap.width;
        miniMapObjects.height = miniMap.height;

        let w = (this.mapWidth * Raycaster.MINIMAP_SCALE) + "px" // minimap CSS dimensions
        let h = (this.mapHeight * Raycaster.MINIMAP_SCALE) + "px"
        miniMap.style.width = miniMapObjects.style.width = miniMapCtr.style.width = w;
        miniMap.style.height = miniMapObjects.style.height = miniMapCtr.style.height = h;

        let ctx = miniMap.getContext("2d");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, miniMap.width, miniMap.height);

        // loop through all blocks on the map
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                let wall = this.map[y][x];
                if (wall > 0) { // if there is a wall block at this (x,y) ...
                    ctx.fillStyle = "rgb(200,200,200)";
                    ctx.fillRect( // ... then draw a block on the minimap
                        x * Raycaster.MINIMAP_SCALE,
                        y * Raycaster.MINIMAP_SCALE,
                        Raycaster.MINIMAP_SCALE, Raycaster.MINIMAP_SCALE
                    );
                }
            }
        }

        this.updateMiniMap();
    }
}
