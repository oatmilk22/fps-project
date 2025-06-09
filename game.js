import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Create death screen elements
if (!document.getElementById('death-screen')) {
    // Create death fade overlay
    const fade = document.createElement('div');
    fade.id = 'death-fade';
    fade.style.position = 'fixed';
    fade.style.top = '0';
    fade.style.left = '0';
    fade.style.width = '100vw';
    fade.style.height = '100vh';
    fade.style.background = 'black';
    fade.style.opacity = '0';
    fade.style.pointerEvents = 'none';
    fade.style.transition = 'opacity 1s';
    fade.style.zIndex = '999'; // Lower than death menu
    document.body.appendChild(fade);
    
    // Create death screen container
    const deathScreen = document.createElement('div');
    deathScreen.id = 'death-screen';
    deathScreen.style.position = 'fixed';
    deathScreen.style.top = '50%';
    deathScreen.style.left = '50%';
    deathScreen.style.transform = 'translate(-50%, -50%)';
    deathScreen.style.width = '500px';
    deathScreen.style.padding = '30px';
    deathScreen.style.background = 'rgba(0, 0, 0, 0.8)';
    deathScreen.style.border = '2px solid #ff0000';
    deathScreen.style.borderRadius = '10px';
    deathScreen.style.color = 'white';
    deathScreen.style.textAlign = 'center';
    deathScreen.style.fontFamily = 'Arial, sans-serif';
    deathScreen.style.zIndex = '1000';
    deathScreen.style.display = 'none';
    
    // Death message
    const deathMessage = document.createElement('h1');
    deathMessage.textContent = 'YOU DIED!';
    deathMessage.style.color = '#ff0000';
    deathMessage.style.fontSize = '48px';
    deathMessage.style.marginBottom = '20px';
    deathScreen.appendChild(deathMessage);
    
    // Score display
    const scoreDisplay = document.createElement('p');
    scoreDisplay.id = 'death-score';
    scoreDisplay.style.fontSize = '24px';
    scoreDisplay.style.marginBottom = '10px';
    deathScreen.appendChild(scoreDisplay);
    
    // Time survived display
    const timeDisplay = document.createElement('p');
    timeDisplay.id = 'death-time';
    timeDisplay.style.fontSize = '24px';
    timeDisplay.style.marginBottom = '30px';
    deathScreen.appendChild(timeDisplay);
    
    // Respawn button
    const respawnButton = document.createElement('button');
    respawnButton.id = 'respawn-button';
    respawnButton.textContent = 'RESPAWN';
    respawnButton.style.background = '#ff0000';
    respawnButton.style.color = 'white';
    respawnButton.style.border = 'none';
    respawnButton.style.padding = '15px 30px';
    respawnButton.style.fontSize = '24px';
    respawnButton.style.borderRadius = '5px';
    respawnButton.style.cursor = 'pointer';
    respawnButton.style.transition = 'background 0.3s';
    respawnButton.style.marginTop = '20px';
    respawnButton.addEventListener('mouseover', () => {
        respawnButton.style.background = '#cc0000';
    });
    respawnButton.addEventListener('mouseout', () => {
        respawnButton.style.background = '#ff0000';
    });
    respawnButton.addEventListener('click', resetGame);
    deathScreen.appendChild(respawnButton);
    
    document.body.appendChild(deathScreen);
}

// Game variables
let score = 0;
let ammo = 12; // Default pistol ammo
let maxAmmo = 12; // Default pistol max ammo
let isReloading = false;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let prevTime = performance.now();
const MOVEMENT_SPEED = 200.0;
let solarPanels = [];
let robotEnemies = [];
let lampPosts = [];
let droppedItems = [];
let isAiming = false;
const NORMAL_SPEED = 20.0;
const AIM_SPEED = 10.0;
const NORMAL_CROSSHAIR_MIN_GAP = 8;
const AIM_CROSSHAIR_MIN_GAP = 2;
const NORMAL_CROSSHAIR_MAX_GAP = 20;
const AIM_CROSSHAIR_MAX_GAP = 8;
const NORMAL_SPREAD = Math.PI / 36; // ~5 deg (improved from ~10 deg)
const AIM_SPREAD = Math.PI / 90;    // ~2 deg

// Player health and death system
let playerHealth = 100;
const maxPlayerHealth = 100;
let playerArmor = 0;
const maxPlayerArmor = 100;
let lastDamageTime = 0;
const DAMAGE_COOLDOWN = 500; // ms between damage indicators
let animationRunning = true;
let isDead = false;
// Use startTime consistently throughout the code
let startTime = Date.now();

// Player death function - DISABLED
function playerDeath() {
    console.log('Player death prevented!');
    return; // Completely disable death
}

// Function to handle game reset - declaration moved to avoid duplication
// The actual resetGame function is defined later in the file

// Damage counter system
let totalDamageDealt = 0;
let damageCounterElement = null;
let lastDamageDealtTime = 0;
const DAMAGE_COUNTER_RESET_TIME = 3000; // Reset damage counter after 3 seconds of no damage

// Ladder system
let ladders = [];
let isOnLadder = false;
let currentLadder = null;

// Weapon system
const WEAPONS = {
    PISTOL: {
        name: 'Pistol',
        damage: 25,
        headshotMultiplier: 1.5,
        maxAmmo: 12,
        magazineCount: 10, // Number of magazines available
        reloadTime: 900,  // Reduced from 1500ms
        spread: {
            normal: Math.PI / 18,     // ~10 deg
            aim: Math.PI / 90,        // ~2 deg
            sprint: Math.PI / 12,     // ~15 deg (more inaccurate when sprinting)
        },
        crosshair: {
            minGap: { normal: 8, aim: 2, sprint: 15 },
            maxGap: { normal: 20, aim: 8, sprint: 30 }
        },
        fireRate: 400, // ms between shots
        automatic: false,
        ammoType: 'pistol', // Type of ammo for pickup display
        ammoColor: '#3498db' // Blue color for pistol ammo
    },
    AR: {
        name: 'Assault Rifle',
        damage: 35,
        headshotMultiplier: 1.5,
        maxAmmo: 30,
        magazineCount: 10, // Number of magazines available
        reloadTime: 1200, // Reduced from 2200ms
        spread: {
            normal: Math.PI / 16,     // ~11 deg
            aim: Math.PI / 80,        // ~2.25 deg
            sprint: Math.PI / 10,     // ~18 deg (more inaccurate when sprinting)
        },
        crosshair: {
            minGap: { normal: 10, aim: 3, sprint: 18 },
            maxGap: { normal: 24, aim: 10, sprint: 35 }
        },
        fireRate: 100, // ms between shots
        automatic: true,
        ammoType: 'ar', // Type of ammo for pickup display
        ammoColor: '#2ecc71' // Green color for AR ammo
    },
    SHOTGUN: {
        name: 'Shotgun',
        damage: 14, // per pellet
        pellets: 8,
        headshotMultiplier: 2.0,
        maxAmmo: 8,
        magazineCount: 10, // Number of magazines available
        reloadTime: 1500, // Reduced from 2800ms
        spread: {
            normal: Math.PI / 15, // ~12 deg (less extreme spread)
            aim: Math.PI / 24,    // ~7.5 deg (less extreme when aiming)
            sprint: Math.PI / 10,  // ~18 deg (more inaccurate when sprinting)
        },
        crosshair: {
            minGap: { normal: 18, aim: 10, sprint: 25 },
            maxGap: { normal: 35, aim: 20, sprint: 45 },
            type: 'circle'
        },
        fireRate: 800, // ms between shots
        automatic: false,
        // Damage drop-off based on distance
        damageDropOff: {
            start: 10, // Distance at which damage starts to drop
            end: 30,   // Distance at which damage reaches minimum
            min: 0.3   // Minimum damage multiplier (30% of base damage)
        },
        ammoType: 'shotgun', // Type of ammo for pickup display
        ammoColor: '#e67e22' // Orange color for shotgun ammo
    },
    SNIPER: {
        name: 'Sniper Rifle',
        damage: 115,
        headshotMultiplier: 2.0,
        maxAmmo: 7,
        magazineCount: 10, // Number of magazines available
        reloadTime: 1800, // Reduced from 3000ms
        spread: {
            normal: Math.PI / 30, // ~6 deg (much more inaccurate when not aiming)
            aim: Math.PI / 360,   // ~0.5 deg (extremely accurate when aiming)
            sprint: Math.PI / 15,  // ~12 deg (extremely inaccurate when sprinting)
        },
        crosshair: {
            minGap: { normal: 25, aim: 0, sprint: 40 },
            maxGap: { normal: 45, aim: 0, sprint: 60 }
        },
        fireRate: 1200, // ms between shots
        automatic: false,
        ammoType: 'sniper', // Type of ammo for pickup display
        ammoColor: '#9b59b6', // Purple color for sniper ammo
        scopeZoom: 4 // Zoom factor when aiming
    }
};

// Current weapon and ammo system
let currentWeapon = WEAPONS.PISTOL;
let lastShotTime = 0;
let isShooting = false;

// Magazine tracking for each weapon type
let magazineCounts = {
    PISTOL: 10,
    AR: 10,
    SHOTGUN: 10,
    SNIPER: 10
};

// Pickup notification system
let pickupNotification = null;
let pickupNotificationTimeout = null;

// Show pickup notification
function showPickupNotification(type, amount) {
    const pickupElement = document.getElementById('pickup-notification');
    const pickupIcon = document.getElementById('pickup-icon');
    const pickupText = document.getElementById('pickup-text');
    
    if (!pickupElement || !pickupIcon || !pickupText) return;
    
    // Clear any existing timeout
    if (pickupNotificationTimeout) {
        clearTimeout(pickupNotificationTimeout);
    }
    
    // Set icon and text based on pickup type
    let icon = '';
    let text = '';
    let color = '#ffffff';
    
    switch (type) {
        case 'pistol':
            icon = '🔫';
            text = `+1 Pistol Magazine`;
            color = WEAPONS.PISTOL.ammoColor;
            break;
        case 'ar':
            icon = '🔫';
            text = `+1 AR Magazine`;
            color = WEAPONS.AR.ammoColor;
            break;
        case 'shotgun':
            icon = '🔫';
            text = `+1 Shotgun Magazine`;
            color = WEAPONS.SHOTGUN.ammoColor;
            break;
        case 'sniper':
            icon = '🔫';
            text = `+1 Sniper Magazine`;
            color = WEAPONS.SNIPER.ammoColor;
            break;
        case 'health':
            icon = '❤️';
            text = `+${amount} Health`;
            color = '#ff5555';
            break;
        case 'armor':
            icon = '🛡️';
            text = `+${amount} Armor`;
            color = '#5555ff';
            break;
    }
    
    // Update notification content
    pickupIcon.innerHTML = icon;
    pickupText.innerHTML = text;
    pickupText.style.color = color;
    
    // Show notification
    pickupElement.style.display = 'flex';
    pickupElement.style.opacity = '1';
    
    // Set timeout to hide notification
    pickupNotificationTimeout = setTimeout(() => {
        pickupElement.style.opacity = '0';
        setTimeout(() => {
            pickupElement.style.display = 'none';
        }, 300);
    }, 2000);
}

let canJump = true;
let verticalVelocity = 0;
const GRAVITY = 350;
const LOW_GRAVITY = 100; // Lower gravity for double jump effect
const JUMP_STRENGTH = 75; // Original jump strength
const DOUBLE_JUMP_STRENGTH = 60; // Slightly lower than first jump
const GROUND_Y = 2;

// Double jump system
let canDoubleJump = false;
let hasDoubleJumped = false;
let doubleJumpCooldown = false;
let doubleJumpCooldownTime = 5000; // 5 seconds cooldown
let doubleJumpLastUsed = 0;
let isLowGravity = false;
let lowGravityEndTime = 0;
let lowGravityDuration = 2000; // 2 seconds of low gravity
let generators = [];
let boxes = [];
let stairs = [];
// isDead and startTime are already declared above
let invulnerableUntil = 0;

let isSprinting = false;
const SPRINT_SPEED = 36.0; // 80% faster than normal

let crosshairGap = 8;
const crosshairStep = 1.5;

let isCrawling = false;
const CRAWL_SPEED = 10.0; // Half normal speed

let targetCameraHeight = 1.6;

let playerFeetY = 2; // Initial feet position

// Minimap setup
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');
minimapCanvas.width = 200;
minimapCanvas.height = 200;
const MAP_SCALE = 2; // Scale factor for the minimap
const MAP_OFFSET = 50; // Offset to center the map

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x00ffff); // Cyan for debug
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Add this global array to track all solid surfaces
let solidSurfaces = [];

// Create the power station environment
createPowerStation();

// Set camera above terrain and looking at center
camera.position.set(0, 15, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game-container').appendChild(renderer.domElement);

// Controls
const controls = new PointerLockControls(camera, document.body);

// Create stars
function createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.1,
        transparent: true
    });

    const starsVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

// Create moon
function createMoon() {
    const moonGeometry = new THREE.SphereGeometry(5, 32, 32);
    const moonMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFCC
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(50, 50, -100);
    scene.add(moon);

    // Add moon glow
    const moonGlow = new THREE.PointLight(0xFFFFCC, 0.5, 200);
    moonGlow.position.copy(moon.position);
    scene.add(moonGlow);
}

// Create the power station environment
function createPowerStation() {
    // Create stars and moon
    createStars();
    createMoon();
    
    // Set the background color to match the border color (blue)
    scene.background = new THREE.Color(0x0000ff);

    // Create a larger ground plane
    const groundGeometry = new THREE.PlaneGeometry(200, 200); // Doubled size
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    solidSurfaces.push(ground);
    
    // Add map boundaries to prevent falling off the map
    const MAP_SIZE = 100; // Half the size of the ground plane
    const WALL_HEIGHT = 50; // Height of the invisible walls
    const boundaryMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x0000ff, // Blue color for the boundaries
        transparent: false, // Make walls solid
        opacity: 1.0 // Fully visible
    });
    
    // Create boundary walls with thicker collision boxes
    // North wall
    const northWall = new THREE.Mesh(
        new THREE.BoxGeometry(2*MAP_SIZE, WALL_HEIGHT, 5), // Thicker wall (5 units)
        boundaryMaterial
    );
    northWall.position.set(0, WALL_HEIGHT/2, -MAP_SIZE);
    northWall.userData.isBoundaryWall = true; // Mark as boundary wall
    scene.add(northWall);
    solidSurfaces.push(northWall);
    
    // South wall
    const southWall = new THREE.Mesh(
        new THREE.BoxGeometry(2*MAP_SIZE, WALL_HEIGHT, 5), // Thicker wall (5 units)
        boundaryMaterial
    );
    southWall.position.set(0, WALL_HEIGHT/2, MAP_SIZE);
    southWall.userData.isBoundaryWall = true; // Mark as boundary wall
    scene.add(southWall);
    solidSurfaces.push(southWall);
    
    // East wall
    const eastWall = new THREE.Mesh(
        new THREE.BoxGeometry(5, WALL_HEIGHT, 2*MAP_SIZE), // Thicker wall (5 units)
        boundaryMaterial
    );
    eastWall.position.set(MAP_SIZE, WALL_HEIGHT/2, 0);
    eastWall.userData.isBoundaryWall = true; // Mark as boundary wall
    scene.add(eastWall);
    solidSurfaces.push(eastWall);
    
    // West wall
    const westWall = new THREE.Mesh(
        new THREE.BoxGeometry(5, WALL_HEIGHT, 2*MAP_SIZE), // Thicker wall (5 units)
        boundaryMaterial
    );
    westWall.position.set(-MAP_SIZE, WALL_HEIGHT/2, 0);
    westWall.userData.isBoundaryWall = true; // Mark as boundary wall
    scene.add(westWall);
    solidSurfaces.push(westWall);

    // Night lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    scene.add(ambientLight);

    // Moonlight (directional light)
    const moonLight = new THREE.DirectionalLight(0xFFFFCC, 0.5);
    moonLight.position.set(50, 50, -100);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    scene.add(moonLight);

    // Add some subtle blue ambient light for night atmosphere
    const nightAmbient = new THREE.AmbientLight(0x4040ff, 0.1);
    scene.add(nightAmbient);

    // Create buildings and structures
    const buildingMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.7,
        metalness: 0.3
    });

    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x88ccff,
        emissive: 0x88ccff,
        emissiveIntensity: 0.2,
        metalness: 0.8,
        roughness: 0.2
    });

    solidSurfaces = [];

    // Main street buildings (inspired by King's Row)
    function createBuilding(width, height, depth, x, z) {
        const building = new THREE.Group();
        
        // Main structure
        const main = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            buildingMaterial
        );
        building.add(main);

        // Add windows
        const windowSize = 2;
        const windowSpacing = 4;
        const numWindowsX = Math.floor(width / windowSpacing);
        const numWindowsY = Math.floor(height / windowSpacing);
        
        for (let i = 0; i < numWindowsX; i++) {
            for (let j = 0; j < numWindowsY; j++) {
                const window = new THREE.Mesh(
                    new THREE.BoxGeometry(windowSize, windowSize, 0.1),
                    windowMaterial
                );
                window.position.set(
                    -width/2 + windowSpacing/2 + i * windowSpacing,
                    -height/2 + windowSpacing/2 + j * windowSpacing,
                    depth/2 + 0.1
                );
                building.add(window);
            }
        }

        building.position.set(x, height/2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);
        
        // Add the main mesh to solidSurfaces for collision
        solidSurfaces.push(main);
        
        // Create a slightly larger collision box to prevent falling through gaps
        const collisionPadding = 0.2; // Add padding to collision box
        const collisionGeometry = new THREE.BoxGeometry(
            width + collisionPadding, 
            height, 
            depth + collisionPadding
        );
        const collisionMesh = new THREE.Mesh(
            collisionGeometry,
            new THREE.MeshBasicMaterial({ visible: false }) // Invisible collision mesh
        );
        
        // Position the collision mesh at the same position as the building
        collisionMesh.position.set(x, height/2, z);
        scene.add(collisionMesh);
        
        // Add the collision mesh to solidSurfaces
        solidSurfaces.push(collisionMesh);
        
        return building;
    }

    // SIMPLIFIED LADDER SYSTEM - USING SOLID BOXES FOR RELIABLE CLIMBING
    function createLadder(buildingX, buildingZ, buildingWidth, buildingDepth, buildingHeight, side) {
        // Create a solid ladder that can be climbed
        const ladderWidth = 2;
        const ladderDepth = 0.5;
        
        // Create the main ladder body
        const ladderGeometry = new THREE.BoxGeometry(ladderWidth, buildingHeight, ladderDepth);
        const ladderMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffff00, // Bright yellow for high visibility
            roughness: 0.7,
            metalness: 0.3
        });
        const ladder = new THREE.Mesh(ladderGeometry, ladderMaterial);
        
        // Position the ladder based on which side of the building it's on
        let ladderX = buildingX;
        let ladderZ = buildingZ;
        let rotation = 0;
        
        switch(side) {
            case 'north': // Front side (positive Z)
                ladderZ = buildingZ + (buildingDepth / 2) + (ladderDepth / 2);
                break;
            case 'south': // Back side (negative Z)
                ladderZ = buildingZ - (buildingDepth / 2) - (ladderDepth / 2);
                break;
            case 'east': // Right side (positive X)
                ladderX = buildingX + (buildingWidth / 2) + (ladderDepth / 2);
                rotation = Math.PI / 2;
                break;
            case 'west': // Left side (negative X)
                ladderX = buildingX - (buildingWidth / 2) - (ladderDepth / 2);
                rotation = Math.PI / 2;
                break;
        }
        
        // Position the ladder (centered vertically)
        ladder.position.set(ladderX, buildingHeight / 2, ladderZ);
        ladder.rotation.y = rotation;
        
        // Add to scene
        scene.add(ladder);
        
        // Add to solid surfaces for collision detection
        solidSurfaces.push(ladder);
        
        // Add a trigger zone around the ladder for interaction
        const triggerGeometry = new THREE.BoxGeometry(ladderWidth + 1, buildingHeight, ladderDepth + 1);
        const triggerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.0 // Invisible trigger zone
        });
        const triggerZone = new THREE.Mesh(triggerGeometry, triggerMaterial);
        triggerZone.position.copy(ladder.position);
        triggerZone.rotation.copy(ladder.rotation);
        scene.add(triggerZone);
        
        // Store ladder data for interaction
        ladders.push({
            object: ladder,
            trigger: triggerZone,
            position: { x: ladderX, z: ladderZ },
            height: buildingHeight,
            side: side,
            isClimbing: false
        });
        
        return ladder;
    }
    
    // Create the main street buildings
    createBuilding(20, 15, 10, -70, 0);  // Left side building (was -80)
    createBuilding(20, 15, 10, 70, 0);   // Right side building (was 80)
    createBuilding(15, 20, 8, 0, -70);   // Back building (was -80)
    createBuilding(15, 12, 8, 0, 70);    // Front building (was 80)
    
    // Add ladders to buildings
    // Parameters: buildingX, buildingZ, buildingWidth, buildingDepth, buildingHeight, side
    
    // Main buildings ladders
    createLadder(-70, 0, 20, 10, 15, 'east');  // Left building, east side
    createLadder(70, 0, 20, 10, 15, 'west');   // Right building, west side
    createLadder(0, -70, 15, 8, 20, 'south');  // Back building, south side
    createLadder(0, 70, 15, 8, 12, 'north');   // Front building, north side
    
    // Corner buildings ladders
    createLadder(-50, -50, 18, 9, 16, 'east');  // Northeast corner building
    createLadder(50, -50, 18, 9, 16, 'west');   // Northwest corner building
    createLadder(-50, 50, 18, 9, 16, 'east');   // Southeast corner building
    createLadder(50, 50, 18, 9, 16, 'west');    // Southwest corner building

    // Additional buildings
    createBuilding(18, 16, 9, -50, -50); // Corner buildings (was -60)
    createBuilding(18, 16, 9, 50, -50);
    createBuilding(18, 16, 9, -50, 50);
    createBuilding(18, 16, 9, 50, 50);
    createBuilding(16, 14, 8, -30, -30); // Inner buildings (was -40)
    createBuilding(16, 14, 8, 30, -30);
    createBuilding(16, 14, 8, -30, 30);
    createBuilding(16, 14, 8, 30, 30);

    // Create high ground platforms (like the balconies in King's Row)
    function createPlatform(width, depth, x, y, z) {
        const platform = new THREE.Mesh(
            new THREE.BoxGeometry(width, 1, depth),
            new THREE.MeshStandardMaterial({
                color: 0x444444,
                roughness: 0.6,
                metalness: 0.4
            })
        );
        platform.position.set(x, y, z);
        platform.castShadow = true;
        platform.receiveShadow = true;
        scene.add(platform);
        solidSurfaces.push(platform);

        // Add railings
        const railingMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.2
        });

        // Left railing
        const leftRailing = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 1, depth),
            railingMaterial
        );
        leftRailing.position.set(x - width/2, y + 0.5, z);
        scene.add(leftRailing);
        solidSurfaces.push(leftRailing);

        // Right railing
        const rightRailing = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 1, depth),
            railingMaterial
        );
        rightRailing.position.set(x + width/2, y + 0.5, z);
        scene.add(rightRailing);
        solidSurfaces.push(rightRailing);

        return platform;
    }

    // Create high ground platforms
    createPlatform(10, 5, -50, 8, 0);  // Left high ground (was -60)
    createPlatform(10, 5, 50, 8, 0);   // Right high ground (was 60)
    createPlatform(8, 4, 0, 10, -50);  // Back high ground (was -60)
    createPlatform(8, 4, 0, 6, 50);    // Front high ground (was 60)
    // Additional platforms
    createPlatform(8, 4, -40, 12, -40); // Corner platforms (was -50)
    createPlatform(8, 4, 40, 12, -40);
    createPlatform(8, 4, -40, 12, 40);
    createPlatform(8, 4, 40, 12, 40);
    createPlatform(6, 3, -20, 8, -20); // Inner platforms (was -30)
    createPlatform(6, 3, 20, 8, -20);
    createPlatform(6, 3, -20, 8, 20);
    createPlatform(6, 3, 20, 8, 20);

    // Replace stairs with ramps
    function createRamp(width, height, depth, x, y, z, rotation) {
        const ramp = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.2, roughness: 0.8 })
        );
        ramp.position.set(x, y + height / 2, z);
        ramp.rotation.z = -Math.atan(height / depth); // Slope
        ramp.rotation.y = rotation;
        ramp.castShadow = true;
        ramp.receiveShadow = true;
        scene.add(ramp);
        solidSurfaces.push(ramp);
        return ramp;
    }

    // Main ramp (replace stairs)
    createRamp(6, 5, 10, 40, 0, -35, 0); // Example ramp (was 50, -45)

    // Add some industrial elements (pipes, etc.)
    function createPipe(radius, height, x, y, z) {
        const pipe = new THREE.Mesh(
            new THREE.CylinderGeometry(radius, radius, height, 8),
            new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 })
        );
        pipe.position.set(x, y, z);
        pipe.castShadow = true;
        pipe.receiveShadow = true;
        scene.add(pipe);
        solidSurfaces.push(pipe);
        return pipe;
    }

    // Add generators as industrial equipment - positioned away from buildings
    // Carefully positioned to avoid being inside any structures
    const generatorPositions = [
        { x: -40, z: -40 }, // Far corner, away from buildings
        { x: 40, z: -40 },  // Far corner, away from buildings
        { x: -40, z: 40 },  // Far corner, away from buildings
        { x: 40, z: 40 },   // Far corner, away from buildings
        { x: 55, z: 0 },    // Edge of map, no buildings
        { x: -55, z: 0 },   // Edge of map, no buildings
        { x: 0, z: 55 },    // Edge of map, no buildings
        { x: 0, z: -55 }    // Edge of map, no buildings
    ];
    
    generators = [];
    
    // Create each generator
    generatorPositions.forEach(pos => {
        // Create generator group
        const generator = new THREE.Group();
        
        // Main cylinder
        const mainCylinder = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 6, 16),
            new THREE.MeshStandardMaterial({ color: 0xff2222, metalness: 0.8, roughness: 0.2 })
        );
        generator.add(mainCylinder);

        // Add warning lights
        const warningLight = new THREE.PointLight(0xff0000, 1, 10);
        warningLight.position.set(0, 4, 0);
        generator.add(warningLight);

        // Add warning light fixture
        const lightFixture = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 16, 16),
            new THREE.MeshStandardMaterial({ 
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 0.5
            })
        );
        lightFixture.position.set(0, 4, 0);
        generator.add(lightFixture);
        
        // Add pipes to generator
        const pipeMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
        for (let i = 0; i < 4; i++) {
            const pipe = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.3, 4, 8),
                pipeMaterial
            );
            pipe.position.set(
                Math.cos(i * Math.PI/2) * 2,
                2,
                Math.sin(i * Math.PI/2) * 2
            );
            pipe.rotation.x = Math.PI/2;
            generator.add(pipe);
        }
        
        // Position and add to scene
        generator.position.set(pos.x, 3, pos.z);
        generator.castShadow = true;
        generator.receiveShadow = true;
        
        // Add userData to identify this as a generator for collision detection
        mainCylinder.userData = {
            isSolidObject: true,
            type: 'generator',
            isDeadly: true  // Mark generators as deadly objects
        };
        
        scene.add(generator);
        generators.push(generator);
        
        // Add the main cylinder to solid surfaces for collision detection
        solidSurfaces.push(mainCylinder);
    });

    // Add more cars
    const carPositions = [
        { x: -65, z: 0, rotation: 0 },
        { x: 65, z: 0, rotation: Math.PI },
        { x: 0, z: -65, rotation: Math.PI/2 },
        { x: 0, z: 65, rotation: -Math.PI/2 },
        { x: -45, z: -45, rotation: Math.PI/4 },
        { x: 45, z: -45, rotation: 3*Math.PI/4 },
        { x: -45, z: 45, rotation: -Math.PI/4 },
        { x: 45, z: 45, rotation: -3*Math.PI/4 },
        { x: -25, z: -25, rotation: Math.PI/3 },
        { x: 25, z: -25, rotation: 2*Math.PI/3 },
        { x: -25, z: 25, rotation: -Math.PI/3 },
        { x: 25, z: 25, rotation: -2*Math.PI/3 }
    ];
    
    carPositions.forEach(pos => {
        createCar(pos.x, pos.z, pos.rotation);
    });
    
    // Add more boxes with increased spacing
    const boxPositions = [
        // Outer ring
        { x: -30, z: 30, size: 4, color: 0x888888 },
        { x: 30, z: -30, size: 6, color: 0x666666 },
        { x: 45, z: 45, size: 5, color: 0x444444 },
        { x: -45, z: -45, size: 3, color: 0xaaaaaa },
        { x: -60, z: 0, size: 4, color: 0x777777 },
        { x: 60, z: 0, size: 4, color: 0x777777 },
        // Inner ring
        { x: -15, z: 15, size: 3, color: 0x999999 },
        { x: 15, z: -15, size: 4, color: 0x777777 },
        { x: 22, z: 22, size: 3, color: 0x555555 },
        { x: -22, z: -22, size: 4, color: 0xbbbbbb }
    ];
    
    boxPositions.forEach(pos => {
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(pos.size, pos.size, pos.size),
            new THREE.MeshStandardMaterial({ 
                color: pos.color,
                metalness: 0.3,
                roughness: 0.7
            })
        );
        box.position.set(pos.x, pos.size/2, pos.z);
        box.castShadow = true;
        box.receiveShadow = true;
        scene.add(box);
        boxes.push(box);
        solidSurfaces.push(box);
    });

    // Add more ramps
    const rampPositions = [
        { x: 40, y: 0, z: -35, rotation: 0 },
        { x: -40, y: 0, z: 35, rotation: Math.PI },
        { x: 35, y: 0, z: 40, rotation: Math.PI/2 },
        { x: -35, y: 0, z: -40, rotation: -Math.PI/2 }
    ];
    
    rampPositions.forEach(pos => {
        createRamp(6, 5, 10, pos.x, pos.y, pos.z, pos.rotation);
    });
}

// Load Eskom logo texture
// Create a basic texture for robots and items
function createColorTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    context.fillStyle = color;
    context.fillRect(0, 0, 256, 256);
    
    // Add some texture/noise
    context.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < 1000; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const size = Math.random() * 3 + 1;
        context.fillRect(x, y, size, size);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Robot textures
const robotBodyTexture = createColorTexture('#555555');
const robotHeadTexture = createColorTexture('#333333');
const robotEyeTexture = createColorTexture('#ff0000');

// Lamp post textures
const lampPostTexture = createColorTexture('#444444');

// Item textures
const ammoTexture = createColorTexture('#ffcc00');
const armorTexture = createColorTexture('#00ccff');

// Create initial robots and lamp posts
for (let i = 0; i < 5; i++) {
    createRobotEnemy();
}

// Add lamp posts around the map
createLampPosts();

// Shooting mechanics
document.addEventListener('mousedown', (event) => {
    if (event.button === 0 && ammo > 0 && !isReloading) { // Left click
        const now = Date.now();
        // Check fire rate
        if (now - lastShotTime < currentWeapon.fireRate) return;
        lastShotTime = now;
        
        // Handle shooting based on weapon type
        fireWeapon();
        
        // Update ammo
        ammo--;
        updateAmmoDisplay();
        
        // Auto-reload if empty
        if (ammo === 0 && !isReloading) {
            reload();
        }
        
        // Handle automatic weapons
        if (currentWeapon.automatic) {
            isShooting = true;
        }
    }
});

document.addEventListener('mouseup', (event) => {
    if (event.button === 0) { // Left mouse button released
        isShooting = false;
    }
});

// Keyboard event handling for game controls
document.addEventListener('keydown', (event) => {
    // Prevent default behavior for Tab key to avoid focusing browser elements
    if (event.key === 'Tab') {
        event.preventDefault();
    }
});

// Handle keyup events for game controls
document.addEventListener('keyup', (event) => {
    // Tab key is handled by the stats-screen.js
    if (event.key === 'Tab') {
        event.preventDefault();
    }
});

// Function to fire the current weapon
function fireWeapon() {
    // Use requestAnimationFrame to prevent UI blocking
    requestAnimationFrame(() => {
        // Calculate shot direction with spread
        const shotDirection = new THREE.Vector3();
        camera.getWorldDirection(shotDirection);
        
        // Apply weapon-specific spread based on stance
        let spreadAmount;
        if (isAiming) {
            spreadAmount = currentWeapon.spread.aim;
        } else if (isSprinting) {
            spreadAmount = currentWeapon.spread.sprint;
        } else {
            spreadAmount = currentWeapon.spread.normal;
        }
        
        // Apply additional spread based on movement and stance
        let finalSpread = spreadAmount;
        const isMoving = moveForward || moveBackward || moveLeft || moveRight;
        
        // Additional modifiers
        if (isCrawling) {
            finalSpread *= 0.7; // Crawling: more accurate
        } else if (isMoving && !isAiming && !isSprinting) {
            finalSpread *= 1.2; // Moving without aiming: less accurate
        }
        
        // Handle different weapon types
        if (currentWeapon === WEAPONS.SHOTGUN) {
            // Fire all shotgun pellets simultaneously
            for (let i = 0; i < currentWeapon.pellets; i++) {
                fireSingleShot(finalSpread * 1.2);
            }
        } else {
            // Single projectile weapons
            fireSingleShot(finalSpread);
        }
        
        // Muzzle flash effect
        createMuzzleFlash();
    });
}

// Function to fire a single shot/pellet
function fireSingleShot(spread) {
    // Apply recoil animation to weapon overlay
    const weaponOverlay = document.getElementById('weapon-overlay');
    if (weaponOverlay) {
        weaponOverlay.classList.remove('weapon-recoil');
        // Force reflow to restart animation
        void weaponOverlay.offsetWidth;
        weaponOverlay.classList.add('weapon-recoil');
    }
    
    const shotDirection = new THREE.Vector3();
    camera.getWorldDirection(shotDirection);
    
    // Apply spread if needed
    if (spread > 0) {
        const randomSpreadX = (Math.random() - 0.5) * spread;
        const randomSpreadY = (Math.random() - 0.5) * spread;
        const xAxis = new THREE.Vector3(0, 1, 0); // Yaw axis
        const yAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion); // Pitch axis
        shotDirection.applyAxisAngle(xAxis, randomSpreadX);
        shotDirection.applyAxisAngle(yAxis, randomSpreadY);
    }
    
    // Track shot in stats system if available
    if (window.statsSystem) {
        window.statsSystem.recordShot(false, 0); // We'll update this if we hit something
    }
    
    // Calculate max distance based on weapon
    const maxDistance = 100; // Default max distance
    
    // Create raycaster for hit detection
    const raycaster = new THREE.Raycaster(camera.position, shotDirection);
    const intersects = raycaster.intersectObjects(robotEnemies, true); // true to check all descendants in robot groups
    
    if (intersects.length > 0) {
        const hit = intersects[0];
        
        // Get the parent robot if we hit a child part
        const target = hit.object.parent && hit.object.parent.userData && hit.object.parent.userData.type === 'target' ? 
                      hit.object.parent : hit.object;

        // Create hit effect at hit point
        createHitEffect(hit.point, false);

        // Calculate damage based on weapon and hit location
        let damage = currentWeapon.damage;
        
        // Check for headshot (if y position is in upper part of robot)
        const targetHeight = 4; // Total height of robot
        const hitHeight = hit.point.y - (target.position.y - targetHeight/2);
        const isHeadshot = hitHeight > (targetHeight * 0.7);
        
        if (isHeadshot) {
            damage *= currentWeapon.headshotMultiplier;
        }
        
        // Apply damage drop-off for shotgun
        if (currentWeapon === WEAPONS.SHOTGUN) {
            const distance = hit.distance;
            const dropOff = currentWeapon.damageDropOff;
            
            if (distance > dropOff.start) {
                const dropOffFactor = Math.max(
                    dropOff.min,
                    1 - ((distance - dropOff.start) / (dropOff.end - dropOff.start)) * (1 - dropOff.min)
                );
                damage *= dropOffFactor;
            }
        }
        
        // Update hit effect for headshot if needed
        if (isHeadshot) {
            createHitEffect(hit.point, true); // Create a special headshot effect
        }
        
        // Apply damage to target
        if (!target.userData.health) {
            target.userData.health = 100; // Initialize health if not set
        }
        
        target.userData.health -= damage;
        
        // Show damage number at hit location
        showDamageNumber(damage, hit.point, isHeadshot);
        
        // Record hit and damage in stats system if available
        if (window.statsSystem) {
            window.statsSystem.recordShot(true, damage);
        }
        
        // Check if target is destroyed
        if (target.userData.health <= 0) {
            // Store position before removing for item drop
            const robotPosition = target.position.clone();
            
            // Remove robot from scene
            scene.remove(target);
            const index = robotEnemies.indexOf(target);
            if (index !== -1) {
                robotEnemies.splice(index, 1);
            }
            
            // Add points to score
            score += isHeadshot ? 20 : 10;
            // Update score display
            document.getElementById('score').textContent = `Score: ${score}`;
            
            // Record kill in stats system if available
            if (window.statsSystem) {
                window.statsSystem.recordKill(isHeadshot);
            }
            
            // Increase player armor by 20 when killing a robot
            playerArmor = Math.min(maxPlayerArmor, playerArmor + 20);
            updateHealthBar();
            
            // Chance to drop an item (ammo or armor)
            if (Math.random() < target.userData.dropChance) {
                createDroppedItem(robotPosition);
            }
            
            // Create a new robot enemy
            createRobotEnemy();
        }
    } else {
        // Missed shot - create bullet trail effect
        createBulletTrail(shotDirection, maxDistance);
    }
}

// Create a muzzle flash effect
function createMuzzleFlash() {
    // Choose color based on current weapon
    let flashColor;
    let flashIntensity = 3;
    let flashSize = 8;
    
    if (currentWeapon === WEAPONS.PISTOL) {
        flashColor = 0x00ffff; // Cyan for pistol
    } else if (currentWeapon === WEAPONS.AR) {
        flashColor = 0x00ff00; // Green for AR
        flashIntensity = 4;
        flashSize = 10;
    } else if (currentWeapon === WEAPONS.SHOTGUN) {
        flashColor = 0xff8800; // Orange for shotgun
        flashIntensity = 5;
        flashSize = 12;
    } else if (currentWeapon === WEAPONS.SNIPER) {
        flashColor = 0xff0000; // Red for sniper
        flashIntensity = 6;
        flashSize = 15;
    } else {
        flashColor = 0xffaa00; // Default orange-yellow
    }
    
    // Create the main flash
    const flash = new THREE.PointLight(flashColor, flashIntensity, flashSize);
    flash.position.copy(camera.position);
    const flashDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    flash.position.add(flashDirection.multiplyScalar(1));
    scene.add(flash);
    
    // Create a secondary white flash for more realism
    const whiteFlash = new THREE.PointLight(0xffffff, flashIntensity * 0.7, flashSize * 0.6);
    whiteFlash.position.copy(flash.position);
    scene.add(whiteFlash);
    
    // Remove flashes after a short time with a fade effect
    let intensity = flashIntensity;
    const fadeInterval = setInterval(() => {
        intensity -= 0.5;
        if (intensity <= 0) {
            clearInterval(fadeInterval);
            scene.remove(flash);
            scene.remove(whiteFlash);
        } else {
            flash.intensity = intensity;
            whiteFlash.intensity = intensity * 0.7;
        }
    }, 10);
}

// Create hit effect at impact point
function createHitEffect(position, isHeadshot) {
    // Create a flash of light at hit point
    const flash = new THREE.PointLight(
        isHeadshot ? 0xff0000 : 0xffaa00, // Red for headshots, orange for body shots
        1, 
        3
    );
    flash.position.copy(position);
    scene.add(flash);
    
    // Remove flash after a short time
    setTimeout(() => scene.remove(flash), 100);
}

// Create optimized bullet trail with yellow/red theme
function createBulletTrail(direction, distance) {
    const trailStart = camera.position.clone();
    const trailEnd = trailStart.clone().add(direction.clone().multiplyScalar(distance));
    
    const trailGroup = new THREE.Group();
    scene.add(trailGroup);
    
    const isShotgunPellet = currentWeapon === WEAPONS.SHOTGUN;
    
    // Use yellow for regular weapons, red for shotgun
    const trailColor = isShotgunPellet ? 0xFF3300 : 0xFFCC00;
    
    // For shotgun, reduce the number of trails when hitting close targets
    if (isShotgunPellet && distance < 10) {
        // Only show 50% of trails for close-range shotgun hits
        if (Math.random() > 0.5) {
            trailGroup.removeFromParent();
            return;
        }
    }
    
    // 1. Main trail line (thinner for shotgun)
    const trailGeometry = new THREE.BufferGeometry().setFromPoints([
        trailStart,
        trailEnd
    ]);
    
    const trailMaterial = new THREE.LineBasicMaterial({
        color: trailColor,
        transparent: true,
        opacity: isShotgunPellet ? 0.2 : 0.4,
        linewidth: isShotgunPellet ? 0.8 : 1.2
    });
    
    const trail = new THREE.Line(trailGeometry, trailMaterial);
    trailGroup.add(trail);
    
    // 2. Impact point (smaller and simpler for shotgun)
    const impactSize = isShotgunPellet ? 0.02 : 0.035;
    const impactGeometry = new THREE.SphereGeometry(impactSize, 4, 4);
    const impactMaterial = new THREE.MeshBasicMaterial({
        color: trailColor,
        transparent: true,
        opacity: 0.8,
        depthWrite: false
    });
    
    const impactPoint = new THREE.Mesh(impactGeometry, impactMaterial);
    impactPoint.position.copy(trailEnd);
    trailGroup.add(impactPoint);
    
    // 3. Only add glow for non-shotgun or for hits
    if (!isShotgunPellet || distance > 5) {
        const glowSize = isShotgunPellet ? 0.08 : 0.12;
        const glowGeometry = new THREE.SphereGeometry(glowSize, 6, 6);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: trailColor,
            transparent: true,
            opacity: 0.15,
            depthWrite: false
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(trailEnd);
        trailGroup.add(glow);
    }
    
    // Animation variables - shorter for shotgun
    const startTime = Date.now();
    const trailDuration = isShotgunPellet ? 150 : 250; // ms
    const fadeStart = isShotgunPellet ? 0.2 : 0.3;
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / trailDuration, 1);
        const fadeProgress = Math.max(0, (progress - fadeStart) / (1 - fadeStart));
        
        // Fade out all elements
        if (trail && trail.material) {
            trail.material.opacity = (isShotgunPellet ? 0.2 : 0.4) * (1 - fadeProgress);
        }
        
        if (impactPoint && impactPoint.material) {
            impactPoint.material.opacity = 0.8 * (1 - fadeProgress);
            impactPoint.scale.setScalar(1 + progress * (isShotgunPellet ? 0.3 : 0.5));
        }
        
        // Clean up when animation is complete
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Quick cleanup
            if (trailGroup.parent) {
                trailGroup.removeFromParent();
                trailGroup.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
            }
        }
    };
    
    requestAnimationFrame(animate);
}

// Update ammo display with current weapon info
function updateAmmoDisplay() {
    // Get the weapon key (PISTOL, AR, etc.)
    const weaponKey = Object.keys(WEAPONS).find(key => WEAPONS[key] === currentWeapon);
    
    // Update the ammo display to show current ammo, max ammo, and magazine count
    document.getElementById('ammo').textContent = `${currentWeapon.name}: ${ammo}/${currentWeapon.maxAmmo} [${magazineCounts[weaponKey]} mags]`;
}

// Function to handle crosshair updates

// Function to draw the minimap
function drawMinimap() {
    // Clear the minimap
    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    
    // Draw the walls
    minimapCtx.strokeStyle = 'white';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    
    // Draw the player as a smaller arrow, tip at player position
    const px = (camera.position.x + MAP_OFFSET) * MAP_SCALE;
    const pz = (camera.position.z + MAP_OFFSET) * MAP_SCALE;
    const arrowLength = 12; // smaller
    const arrowWidth = 7;   // smaller
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    const angle = Math.atan2(-direction.x, direction.z) + Math.PI;
    
    minimapCtx.save();
    minimapCtx.translate(px, pz);
    minimapCtx.rotate(angle);
    minimapCtx.beginPath();
    minimapCtx.moveTo(0, 0); // Tip of arrow at player position
    minimapCtx.lineTo(-arrowWidth / 2, arrowLength); // Left base
    minimapCtx.lineTo(arrowWidth / 2, arrowLength);  // Right base
    minimapCtx.closePath();
    minimapCtx.fillStyle = 'blue';
    minimapCtx.fill();
    minimapCtx.restore();
    
    // Draw robot enemies
    robotEnemies.forEach(robot => {
        minimapCtx.fillStyle = 'red';
        minimapCtx.beginPath();
        minimapCtx.arc(
            (robot.position.x + MAP_OFFSET) * MAP_SCALE,
            (robot.position.z + MAP_OFFSET) * MAP_SCALE,
            3, 0, Math.PI * 2
        );
        minimapCtx.fill();
    });
    
    // Draw dropped items
    droppedItems.forEach(item => {
        minimapCtx.fillStyle = item.userData.itemType === 'ammo' ? 'yellow' : 'blue';
        minimapCtx.beginPath();
        minimapCtx.arc(
            (item.position.x + MAP_OFFSET) * MAP_SCALE,
            (item.position.z + MAP_OFFSET) * MAP_SCALE,
            2, 0, Math.PI * 2
        );
        minimapCtx.fill();
    });
}

// Game loop
function animate() {
    requestAnimationFrame(animate);
    
    // If player is dead, don't update game logic but still render
    if (isDead) {
        renderer.render(scene, camera);
        return;
    }
    
    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    let MOVEMENT_SPEED = NORMAL_SPEED;
    if (isAiming) MOVEMENT_SPEED = AIM_SPEED;
    else if (isCrawling) MOVEMENT_SPEED = CRAWL_SPEED;
    else if (isSprinting && (moveForward||moveBackward||moveLeft||moveRight)) MOVEMENT_SPEED = SPRINT_SPEED;
    const standHeight = 1.6;
    const crawlHeight = 0.2;
    
    // Handle automatic weapon firing
    if (isShooting && currentWeapon.automatic && ammo > 0 && !isReloading) {
        const now = Date.now();
        if (now - lastShotTime >= currentWeapon.fireRate) {
            fireWeapon();
            lastShotTime = now;
            ammo--;
            updateAmmoDisplay();
            
            if (ammo === 0 && !isReloading) {
                reload();
                isShooting = false;
            }
        }
    }

    // --- X/Z movement with robust collision ---
    let moveX = 0, moveZ = 0;
    if (moveForward) moveZ += MOVEMENT_SPEED * delta;
    if (moveBackward) moveZ -= MOVEMENT_SPEED * delta;
    if (moveLeft) moveX -= MOVEMENT_SPEED * delta;
    if (moveRight) moveX += MOVEMENT_SPEED * delta;

    // Check for ladder interaction
    let nearLadder = false;
    let ladderToClimb = null;
    
    // Check if player is near a ladder
    for (const ladder of ladders) {
        const dx = camera.position.x - ladder.position.x;
        const dz = camera.position.z - ladder.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < 2) { // Within 2 units of a ladder
            nearLadder = true;
            ladderToClimb = ladder;
            
            // Show ladder interaction prompt if not already on ladder
            if (!isOnLadder) {
                const promptElement = document.getElementById('ladder-prompt');
                if (!promptElement) {
                    const prompt = document.createElement('div');
                    prompt.id = 'ladder-prompt';
                    prompt.textContent = 'Press E to climb ladder';
                    prompt.style.position = 'fixed';
                    prompt.style.bottom = '20%';
                    prompt.style.left = '50%';
                    prompt.style.transform = 'translateX(-50%)';
                    prompt.style.color = 'white';
                    prompt.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                    prompt.style.padding = '10px';
                    prompt.style.borderRadius = '5px';
                    prompt.style.fontFamily = 'Arial, sans-serif';
                    document.body.appendChild(prompt);
                }
            }
            break;
        }
    }
    
    // Remove prompt if not near a ladder
    if (!nearLadder) {
        const promptElement = document.getElementById('ladder-prompt');
        if (promptElement) {
            document.body.removeChild(promptElement);
        }
    }
    
    // Handle ladder climbing
    if (isOnLadder && currentLadder) {
        // Disable gravity while on ladder
        verticalVelocity = 0;
        
        // Climb up/down with W/S keys
        if (moveForward) {
            playerFeetY += MOVEMENT_SPEED * delta;
            // Limit to ladder height
            if (playerFeetY > currentLadder.height) {
                playerFeetY = currentLadder.height;
                isOnLadder = false;
                currentLadder = null;
            }
        }
        if (moveBackward) {
            playerFeetY -= MOVEMENT_SPEED * delta;
            // Dismount at bottom
            if (playerFeetY <= GROUND_Y) {
                playerFeetY = GROUND_Y;
                isOnLadder = false;
                currentLadder = null;
            }
        }
        
        // Exit ladder with E key (handled in key events)
        
        // Set camera position directly when on ladder
        camera.position.y = playerFeetY + standHeight;
    }
    
    let intendedPosition = camera.position.clone();
    let forward = new THREE.Vector3();
    controls.getDirection(forward);
    forward.y = 0;
    forward.normalize();
    let right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
    intendedPosition.add(forward.clone().multiplyScalar(moveZ));
    intendedPosition.add(right.clone().multiplyScalar(moveX));

    let collision = false;
    let stepUp = false;
    let stepUpY = 0;
    // Use a slightly larger collision box for the player to prevent falling through gaps
    const playerRadius = 0.6; // Increased from 0.45
    const playerHeadroom = 0.2; // Extra space to prevent getting stuck
    
    for (const surface of solidSurfaces) {
        surface.updateMatrixWorld();
        const box = new THREE.Box3().setFromObject(surface);
        const surfaceTop = box.max.y;
        
        // Check if player is within the horizontal bounds of the surface with increased radius
        if (
            intendedPosition.x > box.min.x - playerRadius && intendedPosition.x < box.max.x + playerRadius &&
            intendedPosition.z > box.min.z - playerRadius && intendedPosition.z < box.max.z + playerRadius
        ) {
            // Special handling for boundary walls - use stronger collision detection
            if (surface.userData && surface.userData.isBoundaryWall) {
                collision = true;
                break;
            }
            
            // Get the height of the player's feet above the surface
            const feetAbove = intendedPosition.y - surfaceTop;
            
            // Allow walking/jumping on top with improved tolerance
            if (feetAbove > -0.3 && feetAbove < 1.2) continue;
            
            // Allow a small step up if close to the top with improved tolerance
            if (feetAbove > -0.7 && feetAbove <= -0.3) {
                stepUp = true;
                stepUpY = surfaceTop;
                continue;
            }
            
            // Enhanced collision detection for ALL solid objects
            // Check if any part of the player's body is inside the object
            const playerBottom = intendedPosition.y - playerHeadroom;
            const playerTop = intendedPosition.y + (isCrawling ? crawlHeight : standHeight) + playerHeadroom;
            
            // Create an expanded collision box for ALL objects
            const expandedBox = new THREE.Box3().setFromObject(surface);
            expandedBox.expandByScalar(0.1); // Expand box by 0.1 units in all directions
            
            // Unified collision detection for all solid objects
            if (playerBottom < expandedBox.max.y && playerTop > expandedBox.min.y) {
                // Determine what type of object we collided with for debugging
                let objectType = 'unknown';
                if (surface.userData) {
                    if (surface.userData.isSolidBox) objectType = surface.userData.boxType || 'box';
                    else if (surface.userData.isBoundaryWall) objectType = 'wall';
                    else if (surface.userData.type) objectType = surface.userData.type;
                } else if (surface.geometry) {
                    objectType = surface.geometry.type;
                }
                
                // For debugging
                console.log('Collision detected with:', objectType);
                collision = true;
                break;
            }
        }
    }
    if (!collision) {
        camera.position.x = intendedPosition.x;
        camera.position.z = intendedPosition.z;
        if (stepUp) {
            camera.position.y = stepUpY;
            verticalVelocity = 0;
            canJump = true;
        }
    }

    // --- Y movement (gravity, jumping, standing on structures) ---
    // Apply appropriate gravity based on low gravity mode
    if (isLowGravity) {
        verticalVelocity -= LOW_GRAVITY * delta;
    } else {
        verticalVelocity -= GRAVITY * delta;
    }
    
    // Store previous Y position for collision detection
    const previousFeetY = playerFeetY;
    playerFeetY += verticalVelocity * delta;
    
    // Check if low gravity effect should end
    if (isLowGravity && Date.now() > lowGravityEndTime) {
        isLowGravity = false;
        updateDoubleJumpUI();
    }
    
    // Check if double jump cooldown should end
    if (doubleJumpCooldown && Date.now() > doubleJumpLastUsed + doubleJumpCooldownTime) {
        doubleJumpCooldown = false;
        updateDoubleJumpUI();
    }

    let onSurface = false;
    let highestSurfaceY = GROUND_Y;
    let surfaceNormal = new THREE.Vector3(0, 1, 0);
    // Use the same playerRadius as defined earlier for consistent collision detection
    
    // First pass: Check for surfaces we might be standing on
    solidSurfaces.forEach(surface => {
        if (!surface.visible) return; // Skip invisible surfaces
        
        surface.updateMatrixWorld();
        const box = new THREE.Box3().setFromObject(surface);
        
        // Check if player is within the XZ bounds of the surface with some vertical tolerance
        if (camera.position.x > box.min.x - playerRadius * 1.5 && 
            camera.position.x < box.max.x + playerRadius * 1.5 &&
            camera.position.z > box.min.z - playerRadius * 1.5 && 
            camera.position.z < box.max.z + playerRadius * 1.5) {
            
            const surfaceTop = box.max.y;
            const surfaceBottom = box.min.y;
            const playerBottom = playerFeetY;
            const playerTop = playerFeetY + (isCrawling ? crawlHeight : standHeight);
            
            // Check if player is above the surface and close enough to land on it
            if (playerBottom <= surfaceTop + 0.5 && playerBottom >= surfaceBottom - 0.5) {
                // Check if we're landing on top of the surface
                if (verticalVelocity <= 0 && playerBottom - surfaceTop <= 0.5 && playerBottom - surfaceTop >= -0.1) {
                    // This is a surface we can land on
                    if (surfaceTop > highestSurfaceY - 0.1) {
                        highestSurfaceY = surfaceTop;
                        onSurface = true;
                        
                        // If we're close enough to the surface top, snap to it
                        if (playerBottom - surfaceTop < 0.1) {
                            playerFeetY = surfaceTop;
                            verticalVelocity = 0;
                            canJump = true;
                        }
                    }
                }
                // Check for head collision
                else if (verticalVelocity > 0 && playerTop >= surfaceBottom && playerTop <= surfaceTop) {
                    playerFeetY = surfaceBottom - (isCrawling ? crawlHeight : standHeight) - 0.01;
                    verticalVelocity = 0;
                }
            }
            
            // Check for side collisions to prevent phasing through walls
            if (playerTop > surfaceBottom && playerBottom < surfaceTop) {
                // Check left/right collisions
                if (Math.abs(camera.position.x - box.min.x) < playerRadius || 
                    Math.abs(camera.position.x - box.max.x) < playerRadius) {
                    // Push player out to the side
                    if (camera.position.x < box.min.x) intendedPosition.x = box.min.x - playerRadius;
                    else intendedPosition.x = box.max.x + playerRadius;
                    moveX = 0; // Stop horizontal movement
                }
                // Check front/back collisions
                if (Math.abs(camera.position.z - box.min.z) < playerRadius || 
                    Math.abs(camera.position.z - box.max.z) < playerRadius) {
                    // Push player out front/back
                    if (camera.position.z < box.min.z) intendedPosition.z = box.min.z - playerRadius;
                    else intendedPosition.z = box.max.z + playerRadius;
                    moveZ = 0; // Stop forward/back movement
                }
            }
        }
    });

    // Check if player is on any surface (ground or building)
    if (onSurface || (verticalVelocity <= 0 && playerFeetY <= highestSurfaceY + 0.1)) {
        playerFeetY = highestSurfaceY;
        verticalVelocity = 0;
        canJump = true; // Enable jumping when on any surface
        
        // Reset double jump state when landing
        canDoubleJump = false;
        hasDoubleJumped = false;
        
        // Debug output to verify standing on a surface
        // console.log('Standing on surface at height:', highestSurfaceY);
    } else if (!onSurface && playerFeetY <= GROUND_Y) {
        playerFeetY = GROUND_Y;
        verticalVelocity = 0;
        canJump = true;
    } else {
        // When in the air, disable jumping
        canJump = false;
    }

    // Set camera height based on crawl/stand
    camera.position.y = playerFeetY + (isCrawling ? crawlHeight : standHeight);
    
    // Check if player is dead and should show death screen
    if (playerHealth <= 0 && !isDead) {
        playerDeath();
    }
    
    // Removed the test damage zone that was causing unexpected damage
    
    // Update robot enemies
    robotEnemies.forEach(robot => {
        // Move robot
        robot.position.x += robot.userData.velocity.x;
        robot.position.z += robot.userData.velocity.z;
        
        // Rotate robot
        robot.rotation.y += robot.userData.spinSpeed;
        
        // Keep robots within bounds
        if (robot.position.x > 80 || robot.position.x < -80) {
            robot.userData.velocity.x *= -1;
        }
        if (robot.position.z > 80 || robot.position.z < -80) {
            robot.userData.velocity.z *= -1;
        }
    });
    
        // SIMPLIFIED ITEM COLLECTION AND COLLISION DETECTION
    // This is a complete rewrite with a much simpler approach
    
    // Create a list to store items that need to be collected
    const itemsToCollect = [];
    
    // Process each dropped item
    for (let i = 0; i < droppedItems.length; i++) {
        const item = droppedItems[i];
        
        // Skip invalid items
        if (!item || !item.position) continue;
        
        // Make item rotate and bounce
        item.rotation.y += 0.03;
        const bounceHeight = 0.15;
        const bounceSpeed = 0.002;
        const bounceOffset = Date.now() * bounceSpeed;
        item.position.y = 0.4 + Math.abs(Math.sin(bounceOffset)) * bounceHeight;
        
        // Calculate distance to player
        const dx = camera.position.x - item.position.x;
        const dy = camera.position.y - item.position.y;
        const dz = camera.position.z - item.position.z;
        const distanceSquared = dx*dx + dz*dz; // Ignore Y for collection distance
        
        // ITEM COLLECTION - very simple approach
        // If player is close enough, collect the item
        if (distanceSquared < 4) { // 2 units squared radius
            itemsToCollect.push(item);
            continue; // Skip collision check if we're collecting
        }
        
        // ITEM ATTRACTION - move toward player when close
        if (distanceSquared < 25) { // 5 units squared radius
            const attractStrength = 0.1 * (1 - Math.sqrt(distanceSquared) / 5);
            item.position.x += dx * attractStrength;
            item.position.z += dz * attractStrength;
            
            // Make item glow when player is nearby
            if (item.userData.light) {
                item.userData.light.intensity = 0.5 + (1 - Math.sqrt(distanceSquared) / 5);
            }
        }
        
        // COLLISION DETECTION - extremely simplified
        // Only check horizontal collision (ignore Y)
        if (distanceSquared < 1.5) { // 1.2 units squared radius for collision
            // Push player away
            const pushStrength = 0.5;
            const pushDirX = dx === 0 ? 0 : dx / Math.abs(dx);
            const pushDirZ = dz === 0 ? 0 : dz / Math.abs(dz);
            
            camera.position.x += pushDirX * pushStrength;
            camera.position.z += pushDirZ * pushStrength;
        }
    }
    
    // Process all items that need to be collected
    // We do this outside the loop to avoid modifying the array while iterating
    for (let i = 0; i < itemsToCollect.length; i++) {
        const item = itemsToCollect[i];
        const itemType = item.userData.itemType;
        
        // Add magazine to the appropriate weapon
        if (itemType === 'pistol' || itemType === 'ar' || itemType === 'shotgun' || itemType === 'sniper') {
            const weaponKey = itemType.toUpperCase();
            magazineCounts[weaponKey]++;
            console.log(`Collected ${weaponKey} magazine. New count:`, magazineCounts[weaponKey]);
            
            // Show pickup notification
            showPickupNotification(itemType, 1);
        } else if (itemType === 'armor') {
            // Add armor
            playerArmor = Math.min(maxPlayerArmor, playerArmor + 20);
            
            // Show pickup notification
            showPickupNotification('armor', 20);
        }
        
        // Remove the item from the scene
        scene.remove(item);
        
        // Remove from the items array
        const index = droppedItems.indexOf(item);
        if (index !== -1) {
            droppedItems.splice(index, 1);
        }
    }
    
    // Update UI if we collected any items
    if (itemsToCollect.length > 0) {
        updateAmmoDisplay();
        updateHealthBar();
    }
    
    // DIRECT GENERATOR COLLISION DETECTION - SIMPLIFIED FOR RELIABILITY
    for (let i = 0; i < generators.length; i++) {
        const generator = generators[i];
        const dx = camera.position.x - generator.position.x;
        const dz = camera.position.z - generator.position.z;
        const distance = Math.sqrt(dx*dx + dz*dz);
        
        // If player is very close to a generator, kill them instantly
        if (distance < 3 && !isDead) {
            console.log('PLAYER TOUCHED GENERATOR - INSTANT DEATH');
            
            // Use the consistent playerDeath function for all death scenarios
            playerDeath();
            return; // Exit the game loop
        }
    }
    
    // Update minimap
    drawMinimap();
    
    // Update crosshair
    const isMoving = moveForward || moveBackward || moveLeft || moveRight;
    
    // Set target gap based on movement state and weapon
    let targetGap;
    if (isAiming) {
        // When aiming, use the aim gap (most accurate)
        targetGap = currentWeapon.crosshair.minGap.aim;
    } else if (isSprinting) {
        // When sprinting, use the sprint gap (least accurate)
        targetGap = currentWeapon.crosshair.maxGap.sprint;
    } else if (isMoving) {
        // When moving but not sprinting, use a value between normal max and sprint
        targetGap = currentWeapon.crosshair.maxGap.normal * 1.5;
    } else {
        // When standing still but not aiming, still show significant inaccuracy
        // This is the key change - making it much less accurate when not aiming
        targetGap = currentWeapon.crosshair.minGap.normal * 2.5;
    }
    
    // Smoothly adjust crosshair gap
    if (Math.abs(crosshairGap - targetGap) > 0.1) {
        crosshairGap += (targetGap - crosshairGap) * 0.2;
    }
    
    // Update crosshair DOM elements
    updateCrosshairDOM();
    
    // Draw the minimap
    drawMinimap();
    
    // Generator collision detection - COMPLETELY DISABLED
    // This empty loop ensures no collisions can happen with generators
    for (const generator of generators) {
        // Intentionally left empty - no collision detection
    }
    
    // Debug player position (once per second)
    if (frames % 60 === 0) {
        console.log('Player position:', {
            x: camera.position.x.toFixed(2),
            y: camera.position.y.toFixed(2),
            z: camera.position.z.toFixed(2)
        });
    }
    
    // Force isDead to false to prevent any death state
    isDead = false;
    
    // At the end of animate, update sprint UI
    updateSprintUI();
    updateCrawlUI();
    
    prevTime = time;
    renderer.render(scene, camera);
}

// Initial camera position
camera.position.y = 2;

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize weapon UI
updateAmmoDisplay();

// Create a container for both health and armor bars
const statusBarsContainer = document.createElement('div');
statusBarsContainer.id = 'status-bars-container';
statusBarsContainer.style.position = 'absolute';
statusBarsContainer.style.bottom = '20px';
statusBarsContainer.style.left = '50%';
statusBarsContainer.style.transform = 'translateX(-50%)';
statusBarsContainer.style.width = '300px'; // Wider to accommodate the numbers
statusBarsContainer.style.display = 'flex';
statusBarsContainer.style.flexDirection = 'column';
statusBarsContainer.style.gap = '5px';
statusBarsContainer.style.zIndex = '10';

// Add armor bar UI
const armorBarContainer = document.createElement('div');
armorBarContainer.id = 'armor-container';
armorBarContainer.style.width = '100%';
armorBarContainer.style.height = '20px';
armorBarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
armorBarContainer.style.border = '2px solid white';
armorBarContainer.style.borderRadius = '4px';
armorBarContainer.style.display = 'flex';
armorBarContainer.style.alignItems = 'center';
armorBarContainer.style.position = 'relative';

const armorBar = document.createElement('div');
armorBar.id = 'armor-bar';
armorBar.style.width = '0%'; // Start with no armor
armorBar.style.height = '100%';
armorBar.style.backgroundColor = '#3399ff'; // Blue for armor
armorBar.style.transition = 'width 0.3s';

const armorText = document.createElement('div');
armorText.id = 'armor-text';
armorText.style.position = 'absolute';
armorText.style.right = '5px';
armorText.style.color = 'white';
armorText.style.fontFamily = 'Arial, sans-serif';
armorText.style.fontSize = '12px';
armorText.style.fontWeight = 'bold';
armorText.style.textShadow = '1px 1px 1px black';
armorText.style.zIndex = '1';
armorText.textContent = '0/100';

armorBarContainer.appendChild(armorBar);
armorBarContainer.appendChild(armorText);

// Add health bar UI
const healthBarContainer = document.createElement('div');
healthBarContainer.id = 'health-container';
healthBarContainer.style.width = '100%';
healthBarContainer.style.height = '20px';
healthBarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
healthBarContainer.style.border = '2px solid white';
healthBarContainer.style.borderRadius = '4px';
healthBarContainer.style.display = 'flex';
healthBarContainer.style.alignItems = 'center';
healthBarContainer.style.position = 'relative';

const healthBar = document.createElement('div');
healthBar.id = 'health-bar';
healthBar.style.width = '100%';
healthBar.style.height = '100%';
healthBar.style.backgroundColor = '#33ff33';
healthBar.style.transition = 'width 0.3s';

const healthText = document.createElement('div');
healthText.id = 'health-text';
healthText.style.position = 'absolute';
healthText.style.right = '5px';
healthText.style.color = 'white';
healthText.style.fontFamily = 'Arial, sans-serif';
healthText.style.fontSize = '12px';
healthText.style.fontWeight = 'bold';
healthText.style.textShadow = '1px 1px 1px black';
healthText.style.zIndex = '1';
healthText.textContent = '100/100';

healthBarContainer.appendChild(healthBar);
healthBarContainer.appendChild(healthText);

// Add both bars to the container
statusBarsContainer.appendChild(armorBarContainer);
statusBarsContainer.appendChild(healthBarContainer);

// Add the container to the document
document.body.appendChild(statusBarsContainer);

// Initialize health bar
updateHealthBar();
updateCrosshairStyle();
updateWeaponSelectorUI();

// Add click handlers for weapon selection in UI
document.querySelectorAll('.weapon-slot').forEach(slot => {
    slot.addEventListener('click', () => {
        if (controls.isLocked) {
            switchWeapon(slot.dataset.weapon);
        }
    });
});

// Start animation
animate();

// Add a function to create generators and obstacles
function createGeneratorsAndObstacles() {
    // Generators (stationary, deadly)
    const generatorPositions = [
        { x: -40, z: -40 },
        { x: 40, z: -40 },
        { x: -40, z: 40 },
        { x: 40, z: 40 },
        { x: 60, z: 0 },
        { x: -60, z: 0 },
        { x: 0, z: 60 },
        { x: 0, z: -60 }
    ];
    generators = [];
    generatorPositions.forEach(pos => {
        const generator = new THREE.Group();
        
        // Main cylinder - reduced height from 6 to 3 units
        const mainCylinder = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 3, 16),
            new THREE.MeshStandardMaterial({ color: 0xff2222, metalness: 0.8, roughness: 0.2 })
        );
        generator.add(mainCylinder);

        // Add warning lights - adjusted position for new height
        const warningLight = new THREE.PointLight(0xff0000, 1, 10);
        warningLight.position.set(0, 1.5, 0);
        generator.add(warningLight);

        // Add warning light fixture - adjusted position
        const lightFixture = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 16, 16),
            new THREE.MeshStandardMaterial({ 
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 0.5
            })
        );
        lightFixture.position.set(0, 1.5, 0);
        generator.add(lightFixture);

        // Add pipes - adjusted position for new height
        const pipeMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
        for (let i = 0; i < 4; i++) {
            const pipe = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.3, 2, 8),
                pipeMaterial
            );
            pipe.position.set(
                Math.cos(i * Math.PI/2) * 2,
                0.5,  // Lowered pipes to match new height
                Math.sin(i * Math.PI/2) * 2
            );
            pipe.rotation.x = Math.PI/2;
            generator.add(pipe);
        }
        // Position generator so its base is at ground level (y=0)
        generator.position.set(pos.x, 1.5, pos.z);
        generator.castShadow = true;
        generator.receiveShadow = true;
        scene.add(generator);
        generators.push(generator);
    });

    // Boxes (obstacles) with more variety
    const boxPositions = [
        { x: -20, z: 20, size: 4, color: 0x888888 },
        { x: 20, z: -20, size: 6, color: 0x666666 },
        { x: 30, z: 30, size: 5, color: 0x444444 },
        { x: -30, z: -30, size: 3, color: 0xaaaaaa },
        { x: -40, z: 0, size: 4, color: 0x777777 },
        { x: 40, z: 0, size: 4, color: 0x777777 }
    ];
    boxes = [];
    boxPositions.forEach(pos => {
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(pos.size, pos.size, pos.size),
            new THREE.MeshStandardMaterial({ 
                color: pos.color,
                metalness: 0.3,
                roughness: 0.7
            })
        );
        box.position.set(pos.x, pos.size/2, pos.z);
        box.castShadow = true;
        box.receiveShadow = true;
        scene.add(box);
        boxes.push(box);
        solidSurfaces.push(box);
    });

    // Stairs (more complex structure)
    stairs = [];
    const stairMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x555555,
        metalness: 0.2,
        roughness: 0.8
    });
    
    // Main staircase
    for (let i = 0; i < 5; i++) {
        const stair = new THREE.Mesh(
            new THREE.BoxGeometry(6, 1, 2),
            stairMaterial
        );
        stair.position.set(30, 0.5 + i, -30 + i * 2);
        stair.castShadow = true;
        stair.receiveShadow = true;
        scene.add(stair);
        stairs.push(stair);
        solidSurfaces.push(stair);
    }

    // Add railings to the stairs
    const railingMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        metalness: 0.8,
        roughness: 0.2
    });
    
    // Left railing
    for (let i = 0; i < 5; i++) {
        const railing = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 1, 8),
            railingMaterial
        );
        railing.position.set(33, 1 + i, -30 + i * 2);
        railing.castShadow = true;
        railing.receiveShadow = true;
        scene.add(railing);
        stairs.push(railing);
        solidSurfaces.push(railing);
    }

    // Right railing
    for (let i = 0; i < 5; i++) {
        const railing = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 1, 8),
            railingMaterial
        );
        railing.position.set(27, 1 + i, -30 + i * 2);
        railing.castShadow = true;
        railing.receiveShadow = true;
        scene.add(railing);
        stairs.push(railing);
        solidSurfaces.push(railing);
    }
}

function playDeathAnimation(callback) {
    const fade = document.getElementById('death-fade');
    fade.style.opacity = '1';
    fade.style.pointerEvents = 'auto';
    setTimeout(() => {
        fade.style.pointerEvents = 'none'; // Allow clicks on menu
        if (callback) callback();
    }, 1200); // Wait for fade in
}

function playRespawnAnimation() {
    const fade = document.getElementById('death-fade');
    fade.style.opacity = '0';
    fade.style.pointerEvents = 'none';
}

// Add death menu HTML overlay
if (!document.getElementById('death-menu')) {
    const menu = document.createElement('div');
    menu.id = 'death-menu';
    menu.style.position = 'fixed';
    menu.style.top = '0';
    menu.style.left = '0';
    menu.style.width = '100vw';
    menu.style.height = '100vh';
    menu.style.background = 'rgba(0,0,0,0.85)';
    menu.style.display = 'none';
    menu.style.flexDirection = 'column';
    menu.style.justifyContent = 'center';
    menu.style.alignItems = 'center';
    menu.style.zIndex = '1000'; // Above fade overlay
    menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    menu.style.userSelect = 'none';
    menu.style.pointerEvents = 'none';
    menu.style.transition = 'opacity 0.2s';
    menu.style.opacity = '0';
    // SVG running man
    menu.innerHTML = `
        <div style="color:white;font-size:2em;margin-bottom:20px;">You Died!</div>
        <div id="death-stats" style="color:white;font-size:1.2em;margin-bottom:20px;"></div>
        <button id="respawn-btn" style="font-size:1.2em;padding:10px 30px;">Respawn</button>
    `;
    document.body.appendChild(menu);
    document.getElementById('respawn-btn').onclick = () => {
        menu.style.display = 'none';
        restartGame();
    };
}

// Add restartGame function
function restartGame() {
    // Always respawn at the original starting point
    playerFeetY = 2;
    camera.position.set(0, playerFeetY + (isCrawling ? 0.7 : 1.6), 0);
    velocity.set(0, 0, 0);
    verticalVelocity = 0;
    canJump = true;
    moveForward = false;
    moveBackward = false;
    moveLeft = false;
    moveRight = false;
    // Remove all robots, items, panels, generators, boxes, stairs
    robotEnemies.forEach(robot => scene.remove(robot));
    robotEnemies = [];
    
    droppedItems.forEach(item => scene.remove(item));
    droppedItems = [];
    
    lampPosts.forEach(lamp => scene.remove(lamp));
    lampPosts = [];
    // Remove all solar panels
    // solarPanels.forEach(p => scene.remove(p));
    // solarPanels = [];
    generators.forEach(g => scene.remove(g));
    boxes.forEach(b => scene.remove(b));
    stairs.forEach(s => scene.remove(s));
    // Reset score
    score = 0;
    document.getElementById('score').textContent = `Score: ${score}`;
    // Reset ammo
    ammo = currentWeapon.maxAmmo;
    document.getElementById('ammo').textContent = `Solar Panels: ${ammo}`;
    // Reset health
    playerHealth = maxPlayerHealth;
    playerArmor = 0; // Reset armor to zero
    updateHealthBar();
    
    // Reset damage counter
    totalDamageDealt = 0;
    if (damageCounterElement) {
        damageCounterElement.textContent = 'Damage: 0';
    }
    // Recreate robots and lamp posts
    for (let i = 0; i < 5; i++) createRobotEnemy();
    createLampPosts();
    createGeneratorsAndObstacles();
    createSolarPanels();
    createScatteredBoxes(); // Add scattered boxes as solid objects
    startTime = Date.now();
    playRespawnAnimation();
    // Unlock and re-lock pointer to regain movement
    if (controls.isLocked) controls.unlock();
    setTimeout(() => { controls.lock(); }, 200);
    // Restart the animate loop if it was stopped
    requestAnimationFrame(animate);
    // Set invulnerability for 2 seconds
    invulnerableUntil = Date.now() + 2000;
}

// Function to damage the player
function damagePlayer(amount) {
    // Don't damage if invulnerable or already dead
    if (Date.now() < invulnerableUntil || isDead) return;
    
    // Show damage indicator regardless of armor
    showDamageIndicator();
    
    // Use armor as a shield first
    if (playerArmor > 0) {
        // If we have armor, it absorbs 75% of the damage
        const armorDamage = amount * 0.75;
        const healthDamage = amount * 0.25;
        
        // Reduce armor
        playerArmor -= armorDamage;
        
        // If armor goes below zero, apply the remainder to health
        if (playerArmor < 0) {
            playerHealth += playerArmor; // playerArmor is negative here
            playerArmor = 0;
        } else {
            // Apply reduced damage to health
            playerHealth -= healthDamage;
        }
    } else {
        // No armor, full damage to health
        playerHealth -= amount;
    }
    
    // Update UI
    updateHealthBar();
    
    // Check if player is dead
    if (playerHealth <= 0) {
        playerHealth = 0;
        updateHealthBar();
        playerDeath();
    }
}

// Function to show damage indicator
function showDamageIndicator() {
    const now = Date.now();
    if (now - lastDamageTime < DAMAGE_COOLDOWN) return;
    lastDamageTime = now;
    
    // Create damage indicator if it doesn't exist
    let damageIndicator = document.getElementById('damage-indicator');
    if (!damageIndicator) {
        damageIndicator = document.createElement('div');
        damageIndicator.id = 'damage-indicator';
        damageIndicator.style.position = 'fixed';
        damageIndicator.style.top = '0';
        damageIndicator.style.left = '0';
        damageIndicator.style.width = '100%';
        damageIndicator.style.height = '100%';
        damageIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        damageIndicator.style.pointerEvents = 'none';
        damageIndicator.style.opacity = '0';
        damageIndicator.style.transition = 'opacity 0.5s';
        damageIndicator.style.zIndex = '100';
        document.body.appendChild(damageIndicator);
    }
    
    // Show damage indicator
    damageIndicator.style.opacity = '0.5';
    setTimeout(() => {
        damageIndicator.style.opacity = '0';
    }, 200);
    
    // No need for the old class-based animation anymore
    // We're using opacity transitions instead
}

// Health bar update function is defined elsewhere
// Old death screen implementation completely removed

// Function to update the health bar UI
function updateHealthBar() {
    // Update health bar
    const healthBar = document.getElementById('health-bar');
    const healthText = document.getElementById('health-text');
    
    if (healthBar) {
        const healthPercent = Math.max(0, playerHealth / maxPlayerHealth * 100);
        healthBar.style.width = `${healthPercent}%`;
        
        // Change color based on health level
        if (healthPercent > 60) {
            healthBar.style.backgroundColor = '#33ff33'; // Green for good health
        } else if (healthPercent > 30) {
            healthBar.style.backgroundColor = '#ffff33'; // Yellow for medium health
        } else {
            healthBar.style.backgroundColor = '#ff3333'; // Red for low health
        }
    }
    
    // Update health text
    if (healthText) {
        healthText.textContent = `${Math.ceil(playerHealth)}/${maxPlayerHealth}`;
    }
    
    // Update armor bar
    const armorBar = document.getElementById('armor-bar');
    const armorText = document.getElementById('armor-text');
    
    if (armorBar) {
        const armorPercent = Math.max(0, playerArmor / maxPlayerArmor * 100);
        armorBar.style.width = `${armorPercent}%`;
    }
    
    // Update armor text
    if (armorText) {
        armorText.textContent = `${Math.ceil(playerArmor)}/${maxPlayerArmor}`;
    }
}

// Function to reset the game after death
function resetGame() {
    console.log('Resetting game...');
    // Reset player position
    playerFeetY = 2;
    camera.position.set(0, playerFeetY + (isCrawling ? 0.7 : 1.6), 0);
    velocity.set(0, 0, 0);
    verticalVelocity = 0;
    
    // Reset movement flags
    moveForward = false;
    moveBackward = false;
    isDead = false;
    playerHealth = maxPlayerHealth;
    
    // Reset score
    score = 0;
    document.getElementById('score').textContent = `Score: ${score}`;
    
    // Reset game start time
    startTime = Date.now();
    
    // Lock pointer again
    controls.lock();
    
    // Reset all robots, items, and lamp posts
    robotEnemies.forEach(robot => scene.remove(robot));
    robotEnemies = [];
    
    droppedItems.forEach(item => scene.remove(item));
    droppedItems = [];
    
    lampPosts.forEach(lamp => scene.remove(lamp));
    lampPosts = [];
    // Create new robots and lamp posts
    for (let i = 0; i < 5; i++) {
        createRobotEnemy();
    }
    createLampPosts();
    
    // Reset animation flag
    animationRunning = true;
    
    // Reset double jump state
    canDoubleJump = false;
    hasDoubleJumped = false;
    doubleJumpCooldown = false;
    isLowGravity = false;
    updateDoubleJumpUI();
    
    // Remove any leftover death screens - include all possible death screen elements
    const oldDeathScreens = document.querySelectorAll('#death-menu, .death-screen, #death-screen');
    oldDeathScreens.forEach(screen => {
        if (screen && screen.parentNode) {
            screen.parentNode.removeChild(screen);
        }
    });
    
    // Make sure the death fade is hidden
    const deathFade = document.getElementById('death-fade');
    if (deathFade) {
        deathFade.style.opacity = '0';
    }
    
    // Force hide any death screen that might still be visible
    const deathScreen = document.getElementById('death-screen');
    if (deathScreen) {
        deathScreen.style.display = 'none';
    }
}

// Function to update the damage counter
function updateDamageCounter(damage) {
    // Initialize the damage counter element if not already done
    if (!damageCounterElement) {
        damageCounterElement = document.getElementById('damage-counter');
    }
    
    const now = Date.now();
    
    // Reset counter if it's been too long since last damage
    if (now - lastDamageDealtTime > DAMAGE_COUNTER_RESET_TIME) {
        totalDamageDealt = 0;
    }
    
    // Add the new damage to the total
    totalDamageDealt += damage;
    lastDamageDealtTime = now;
    
    // Update the counter display
    damageCounterElement.textContent = `Damage: ${Math.round(totalDamageDealt)}`;
    
    // Add a small scale animation for feedback
    damageCounterElement.style.transform = 'scale(1.2)';
    setTimeout(() => {
        damageCounterElement.style.transform = 'scale(1)';
    }, 100);
}

// Function to show damage numbers at hit location
function showDamageNumber(damage, position, isHeadshot = false) {
    // Update the damage counter
    updateDamageCounter(damage);
    
    // Convert 3D position to 2D screen position
    const vector = position.clone();
    vector.project(camera);
    
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
    
    // Create damage number element
    const damageEl = document.createElement('div');
    damageEl.className = 'damage-number';
    if (isHeadshot) {
        damageEl.classList.add('headshot');
        damageEl.textContent = Math.round(damage) + '!';
    } else {
        damageEl.textContent = Math.round(damage);
    }
    
    // Position the element
    damageEl.style.left = x + 'px';
    damageEl.style.top = y + 'px';
    
    // Add to DOM
    document.body.appendChild(damageEl);
    
    // Remove after animation completes
    setTimeout(() => {
        if (damageEl.parentNode) {
            damageEl.parentNode.removeChild(damageEl);
        }
    }, 1000);
}

// Movement controls
const onKeyDown = function(event) {
    switch(event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            break;
        case 'KeyR':
            if (!isReloading && ammo < currentWeapon.maxAmmo) {
                reload();
            }
            break;
        case 'Space':
            if (canJump) {
                // Apply a stronger initial jump velocity
                verticalVelocity = JUMP_STRENGTH;
                // Add a small immediate position boost to prevent getting stuck on edges
                playerFeetY += 0.15;
                // Disable jumping until landing again
                canJump = false;
            }
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            isSprinting = true;
            break;
        case 'ControlLeft':
        case 'ControlRight':
            if (!isCrawling) {
                isCrawling = true;
                isSprinting = false;
            } else {
                isCrawling = false;
            }
            break;
        // Weapon switching
        case 'Digit1':
            switchWeapon('PISTOL');
            break;
        case 'Digit2':
            switchWeapon('AR');
            break;
        case 'Digit3':
            switchWeapon('SHOTGUN');
            break;
        case 'Digit4':
            switchWeapon('SNIPER');
            break;
        // Ladder interaction with E key
        case 'KeyE':
            // Check if near a ladder
            let nearLadder = false;
            let ladderToInteract = null;
            
            for (const ladder of ladders) {
                const dx = camera.position.x - ladder.position.x;
                const dz = camera.position.z - ladder.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < 2) { // Within 2 units of a ladder
                    nearLadder = true;
                    ladderToInteract = ladder;
                    break;
                }
            }
            
            if (nearLadder && ladderToInteract) {
                if (isOnLadder) {
                    // Get off ladder
                    isOnLadder = false;
                    currentLadder = null;
                    console.log('Dismounted ladder');
                } else {
                    // Get on ladder
                    isOnLadder = true;
                    currentLadder = ladderToInteract;
                    console.log('Mounted ladder');
                }
            }
            break;
        // Add test key for death screen
        case 'KeyK':
            console.log('Test death triggered');
            playerHealth = 0;
            playerDeath();
            break;
    }
};

const onKeyUp = function(event) {
    switch(event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = false;
            break;
        case 'KeyR':
            if (!isReloading && ammo < maxAmmo) {
                reload();
            }
            break;
        case 'Space':
            if (canJump) {
                // Apply a stronger initial jump velocity
                verticalVelocity = JUMP_STRENGTH;
                // Add a small immediate position boost to prevent getting stuck on edges
                playerFeetY += 0.15;
                // Disable jumping until landing again
                canJump = false;
            }
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            isSprinting = false;
            break;
    }
};

// We'll modify the existing onKeyDown function instead

// Add double jump handler
document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
        if (canJump) {
            // First jump is handled by the regular onKeyDown handler
            // Just enable double jump
            canDoubleJump = true;
            hasDoubleJumped = false;
            updateDoubleJumpUI();
        } else if (canDoubleJump && !hasDoubleJumped && !doubleJumpCooldown) {
            // Double jump with low gravity effect
            verticalVelocity = DOUBLE_JUMP_STRENGTH;
            hasDoubleJumped = true;
            canDoubleJump = false;
            // Enable low gravity effect
            isLowGravity = true;
            lowGravityEndTime = Date.now() + lowGravityDuration;
            // Start cooldown
            doubleJumpCooldown = true;
            doubleJumpLastUsed = Date.now();
            // Visual feedback
            showDoubleJumpEffect();
            // Update UI
            updateDoubleJumpUI();
        }
    }
});

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);
document.addEventListener('click', () => {
    controls.lock();
});

controls.addEventListener('lock', function() {
    document.getElementById('game-container').style.cursor = 'none';
});

controls.addEventListener('unlock', function() {
    document.getElementById('game-container').style.cursor = 'auto';
});

// Reload weapon
function reload() {
    // Check if already reloading or ammo is full
    if (isReloading || ammo === currentWeapon.maxAmmo) return;
    
    // Get the weapon key (PISTOL, AR, etc.)
    const weaponKey = Object.keys(WEAPONS).find(key => WEAPONS[key] === currentWeapon);
    
    // Check if we have magazines left
    if (magazineCounts[weaponKey] <= 0) {
        // Play empty sound
        // Using a simple console log for now since sound system isn't fully implemented
        console.log('Playing empty sound');
        console.log(`No magazines left for ${currentWeapon.name}`);
        document.getElementById('ammo').textContent = `${currentWeapon.name}: No ammo!`;
        return;
    }
    
    isReloading = true;
    console.log(`Reloading ${currentWeapon.name}...`);
    
    // Update UI to show reloading
    document.getElementById('ammo').textContent = `${currentWeapon.name}: Reloading...`;
    
    // Play reload sound
    // Using a simple console log for now since sound system isn't fully implemented
    console.log('Playing reload sound');
    
    // Set timeout for reload duration
    setTimeout(() => {
        // Decrease magazine count
        magazineCounts[weaponKey]--;
        
        // Refill ammo
        ammo = currentWeapon.maxAmmo;
        isReloading = false;
        updateAmmoDisplay();
        console.log(`Reloaded ${currentWeapon.name}, ${magazineCounts[weaponKey]} magazines left`);
    }, currentWeapon.reloadTime);
}

// Weapon switching
function switchWeapon(weaponKey) {
    if (isReloading) return; // Can't switch while reloading
    
    const previousWeapon = currentWeapon;
    currentWeapon = WEAPONS[weaponKey];
    
    // Reset ammo to full for the new weapon
    ammo = currentWeapon.maxAmmo;
    
    // Update crosshair style based on weapon
    updateCrosshairStyle();
    
    // Update ammo display
    updateAmmoDisplay();
    
    // Update weapon selector UI
    updateWeaponSelectorUI();
    
    // Initialize double jump UI
    updateDoubleJumpUI();
    
    // Handle sniper scope overlay
    const sniperScopeOverlay = document.getElementById('sniper-scope-overlay');
    if (sniperScopeOverlay) {
        // Hide sniper scope when switching from sniper
        if (previousWeapon === WEAPONS.SNIPER && isAiming) {
            sniperScopeOverlay.style.display = 'none';
            camera.fov = 75; // Reset to default FOV
            camera.updateProjectionMatrix();
            isAiming = false; // Reset aiming state
        }
        
        // Show/hide sniper scope based on current weapon
        sniperScopeOverlay.style.display = (currentWeapon === WEAPONS.SNIPER && isAiming) ? 'block' : 'none';
    }
    
    // Update shotgun pattern if switching to shotgun
    if (currentWeapon === WEAPONS.SHOTGUN) {
        updateShotgunPattern();
    } else {
        // Hide shotgun pellets for other weapons
        const pelletContainer = document.getElementById('shotgun-pellets');
        if (pelletContainer) {
            pelletContainer.style.display = 'none';
        }
    }
}

// Update crosshair style based on current weapon
function updateCrosshairStyle() {
    const normalCrosshair = document.getElementById('normal-crosshair');
    const aimingCrosshair = document.getElementById('aiming-crosshair');
    
    if (!normalCrosshair || !aimingCrosshair) return;
    
    // Remove all weapon-specific classes first
    normalCrosshair.classList.remove('weapon-pistol', 'weapon-ar', 'weapon-shotgun', 'weapon-sniper');
    aimingCrosshair.classList.remove('weapon-pistol', 'weapon-ar', 'weapon-shotgun', 'weapon-sniper');
    
    // Add the appropriate weapon class
    const weaponName = currentWeapon === WEAPONS.PISTOL ? 'pistol' :
                      currentWeapon === WEAPONS.AR ? 'ar' :
                      currentWeapon === WEAPONS.SHOTGUN ? 'shotgun' :
                      currentWeapon === WEAPONS.SNIPER ? 'sniper' : 'pistol';
    
    const weaponClass = `weapon-${weaponName}`;
    normalCrosshair.classList.add(weaponClass);
    aimingCrosshair.classList.add(weaponClass);
    
    // Update crosshair DOM elements
    updateCrosshairDOM();
}

// Update crosshair DOM elements based on current gap
function updateCrosshairDOM() {
    const normalCrosshair = document.getElementById('normal-crosshair');
    const aimingCrosshair = document.getElementById('aiming-crosshair');
    
    if (!normalCrosshair || !aimingCrosshair) return;
    
    // Show the appropriate crosshair based on aiming state
    normalCrosshair.style.display = isAiming ? 'none' : 'block';
    aimingCrosshair.style.display = isAiming ? 'block' : 'none';
    
    // Update crosshair lines based on gap
    updateCrosshairLines(normalCrosshair, crosshairGap);
    updateCrosshairLines(aimingCrosshair, crosshairGap);
}

// Update the crosshair lines based on the current gap
function updateCrosshairLines(crosshair, gap) {
    if (!crosshair) return;
    
    const lines = crosshair.querySelectorAll('.crosshair-line');
    lines.forEach(line => {
        if (line.classList.contains('top') || line.classList.contains('bottom')) {
            // Vertical positioning
            line.style.height = `${gap}px`;
        } else {
            // Horizontal positioning
            line.style.width = `${gap}px`;
        }
    });
}

// Update shotgun pellet pattern
function updateShotgunPattern() {
    const pelletContainer = document.getElementById('shotgun-pellets');
    if (!pelletContainer) return;
    
    // Clear existing pellets
    pelletContainer.innerHTML = '';
    
    // Show pellet container if using shotgun
    if (currentWeapon === WEAPONS.SHOTGUN) {
        // Position the pellet container in the center of the screen
        pelletContainer.style.position = 'absolute';
        pelletContainer.style.top = '50%';
        pelletContainer.style.left = '50%';
        pelletContainer.style.transform = 'translate(-50%, -50%)';
        pelletContainer.style.width = '60px';
        pelletContainer.style.height = '60px';
        pelletContainer.style.display = 'block';
        
        // Fixed pellet pattern in a circular spread
        const pelletPattern = [
            // Center pellet
            { x: 0, y: 0 },
            // First ring
            { x: 12, y: 0 },
            { x: -12, y: 0 },
            { x: 0, y: 12 },
            { x: 0, y: -12 },
            // Second ring (slightly randomized for natural look)
            { x: 15, y: 8 },
            { x: 15, y: -8 },
            { x: -15, y: 8 },
            { x: -15, y: -8 },
            { x: 8, y: 15 },
            { x: -8, y: 15 },
            { x: 8, y: -15 },
            { x: -8, y: -15 }
        ];
        
        // Adjust spread based on aiming state
        const spreadFactor = isAiming ? 0.6 : 1.0;
        
        // Create pellet dots
        for (const pos of pelletPattern) {
            const pellet = document.createElement('div');
            pellet.className = 'pellet-dot';
            pellet.style.position = 'absolute';
            pellet.style.width = '4px';
            pellet.style.height = '4px';
            pellet.style.backgroundColor = 'rgba(255, 255, 0, 0.9)';
            pellet.style.borderRadius = '50%';
            pellet.style.boxShadow = '0 0 3px rgba(255, 100, 0, 0.8)';
            pellet.style.left = `calc(50% + ${pos.x * spreadFactor}px)`;
            pellet.style.top = `calc(50% + ${pos.y * spreadFactor}px)`;
            pellet.style.transform = 'translate(-50%, -50%)';
            
            // Add to container
            pelletContainer.appendChild(pellet);
        }
    } else {
        pelletContainer.style.display = 'none';
    }
}

// Update weapon selector UI
function updateWeaponSelectorUI() {
    // Update active weapon highlighting
    const weaponSlots = document.querySelectorAll('.weapon-slot');
    weaponSlots.forEach(slot => {
        if (slot.dataset.weapon === Object.keys(WEAPONS).find(key => WEAPONS[key] === currentWeapon)) {
            slot.classList.add('active');
        } else {
            slot.classList.remove('active');
        }
        
        // Update ammo count for each weapon
        const weaponKey = slot.dataset.weapon;
        const weapon = WEAPONS[weaponKey];
        let ammoDisplay = '';
        
        // If this is the current weapon, show current ammo, otherwise show max
        if (weapon === currentWeapon) {
            ammoDisplay = `${ammo}/${weapon.maxAmmo}`;
        } else {
            ammoDisplay = `${weapon.maxAmmo}/${weapon.maxAmmo}`;
        }
        
        slot.querySelector('.weapon-ammo').textContent = ammoDisplay;
    });
    
    // Update weapon overlay
    updateWeaponOverlay();
}

// Update weapon overlay
function updateWeaponOverlay() {
    // Hide all weapon overlays first
    document.querySelectorAll('.weapon-svg').forEach(svg => {
        svg.style.opacity = '0';
    });
    
    // Show the current weapon overlay
    let overlayId = '';
    if (currentWeapon === WEAPONS.PISTOL) {
        overlayId = 'pistol-overlay';
    } else if (currentWeapon === WEAPONS.AR) {
        overlayId = 'ar-overlay';
    } else if (currentWeapon === WEAPONS.SHOTGUN) {
        overlayId = 'shotgun-overlay';
    } else if (currentWeapon === WEAPONS.SNIPER) {
        overlayId = 'sniper-overlay';
    }
    
    if (overlayId) {
        const overlay = document.getElementById(overlayId);
        if (overlay) {
            overlay.style.opacity = '1';
        }
    }
}

// Add emergency lights
function createEmergencyLight(x, z) {
    const light = new THREE.PointLight(0xff0000, 0.5, 20);
    light.position.set(x, 8, z);
    scene.add(light);
}

// Create Eskom targets (power drain units)
// Create a robot enemy that can drop items when killed
function createRobotEnemy() {
    // Create a group to hold all robot parts
    const robot = new THREE.Group();
    robot.userData.type = 'target';
    robot.userData.health = 100;
    
    // Robot body
    const bodyGeometry = new THREE.BoxGeometry(1.5, 2, 1);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        map: robotBodyTexture,
        metalness: 0.7,
        roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    robot.add(body);
    
    // Robot head
    const headGeometry = new THREE.BoxGeometry(1, 1, 1);
    const headMaterial = new THREE.MeshStandardMaterial({ 
        map: robotHeadTexture,
        metalness: 0.8,
        roughness: 0.2
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.5;
    robot.add(head);
    
    // Robot eyes (glowing)
    const eyeGeometry = new THREE.PlaneGeometry(0.3, 0.2);
    const eyeMaterial = new THREE.MeshStandardMaterial({ 
        map: robotEyeTexture,
        emissive: 0xff0000,
        emissiveIntensity: 1,
        side: THREE.DoubleSide
    });
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.25, 2.5, 0.51);
    robot.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.25, 2.5, 0.51);
    robot.add(rightEye);
    
    // Robot arms
    const armGeometry = new THREE.BoxGeometry(0.4, 1.5, 0.4);
    const armMaterial = new THREE.MeshStandardMaterial({ 
        map: robotBodyTexture,
        metalness: 0.7,
        roughness: 0.3
    });
    
    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.95, 1, 0);
    robot.add(leftArm);
    
    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.95, 1, 0);
    robot.add(rightArm);
    
    // Robot legs
    const legGeometry = new THREE.BoxGeometry(0.5, 1.5, 0.5);
    const legMaterial = new THREE.MeshStandardMaterial({ 
        map: robotBodyTexture,
        metalness: 0.7,
        roughness: 0.3
    });
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.5, -0.75, 0);
    robot.add(leftLeg);
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.5, -0.75, 0);
    robot.add(rightLeg);
    
    // Random position
    robot.position.x = Math.random() * 80 - 40;
    robot.position.z = Math.random() * 80 - 40;
    robot.position.y = 2;
    
    // Add movement properties
    robot.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        0,
        (Math.random() - 0.5) * 0.1
    );
    robot.userData.spinSpeed = Math.random() * 0.02 + 0.01;
    
    // Add drop chance properties
    robot.userData.dropChance = 0.7; // 70% chance to drop an item
    
    scene.add(robot);
    robotEnemies.push(robot);
    return robot;
}

// Create lamp posts around the map for better lighting
function createLampPosts() {
    // Define lamp post positions (strategic locations around the map)
    const positions = [
        { x: 20, z: 20 },
        { x: -20, z: 20 },
        { x: 20, z: -20 },
        { x: -20, z: -20 },
        { x: 0, z: 30 },
        { x: 0, z: -30 },
        { x: 30, z: 0 },
        { x: -30, z: 0 },
        { x: 40, z: 40 },
        { x: -40, z: 40 },
        { x: 40, z: -40 },
        { x: -40, z: -40 }
    ];
    
    positions.forEach(pos => {
        // Create a group for the lamp post
        const lampPost = new THREE.Group();
        
        // Lamp post pole
        const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 8, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({ 
            map: lampPostTexture,
            metalness: 0.7,
            roughness: 0.3
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 4;
        lampPost.add(pole);
        
        // Lamp housing
        const housingGeometry = new THREE.CylinderGeometry(0.8, 0.5, 1, 8);
        const housingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.2
        });
        const housing = new THREE.Mesh(housingGeometry, housingMaterial);
        housing.position.y = 8.5;
        lampPost.add(housing);
        
        // Light bulb (emissive)
        const bulbGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const bulbMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffcc,
            emissive: 0xffffcc,
            emissiveIntensity: 1
        });
        const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
        bulb.position.y = 8.2;
        lampPost.add(bulb);
        
        // Add actual light source
        const light = new THREE.PointLight(0xffffcc, 1, 20);
        light.position.y = 8.2;
        lampPost.add(light);
        
        // Position the lamp post
        lampPost.position.set(pos.x, 0, pos.z);
        
        scene.add(lampPost);
        lampPosts.push(lampPost);
    });
}

// Create a dropped item (ammo or armor) at the specified position
function createDroppedItem(position) {
    // Determine item type (70% chance for ammo, 30% for armor)
    const isAmmo = Math.random() < 0.7;
    
    let itemMesh;
    let itemType;
    
    if (isAmmo) {
        // Determine which weapon's ammo to drop
        const weaponTypes = ['PISTOL', 'AR', 'SHOTGUN', 'SNIPER'];
        const randomWeaponIndex = Math.floor(Math.random() * weaponTypes.length);
        const weaponType = weaponTypes[randomWeaponIndex];
        
        // Set item type to the specific weapon's ammo
        itemType = weaponType.toLowerCase();
        
        // Create realistic magazine/bullet model based on weapon type
        if (weaponType === 'PISTOL') {
            // Pistol magazine - rectangular with slight taper
            const magBody = new THREE.BoxGeometry(0.3, 0.6, 0.15);
            const magMaterial = new THREE.MeshStandardMaterial({
                color: 0x3498db, // Match pistol ammo color from WEAPONS
                metalness: 0.8,
                roughness: 0.2
            });
            
            // Create bullet tips visible at top of magazine
            const bulletTipGeometry = new THREE.BoxGeometry(0.25, 0.05, 0.12);
            const bulletTipMaterial = new THREE.MeshStandardMaterial({
                color: 0xccaa77, // Brass color
                metalness: 0.9,
                roughness: 0.1
            });
            
            // Create magazine group
            itemMesh = new THREE.Group();
            const magBodyMesh = new THREE.Mesh(magBody, magMaterial);
            const bulletTips = new THREE.Mesh(bulletTipGeometry, bulletTipMaterial);
            bulletTips.position.y = 0.325;
            
            itemMesh.add(magBodyMesh);
            itemMesh.add(bulletTips);
            
        } else if (weaponType === 'AR') {
            // AR magazine - longer curved magazine
            const magGeometry = new THREE.BoxGeometry(0.35, 0.8, 0.2);
            magGeometry.translate(0, 0, 0.05); // Curve the magazine slightly
            
            const magMaterial = new THREE.MeshStandardMaterial({
                color: 0x2ecc71, // Match AR ammo color from WEAPONS
                metalness: 0.7,
                roughness: 0.3
            });
            
            // Create bullet tips visible at top
            const bulletTipGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.15);
            const bulletTipMaterial = new THREE.MeshStandardMaterial({
                color: 0xccaa77, // Brass color
                metalness: 0.9,
                roughness: 0.1
            });
            
            // Create magazine group
            itemMesh = new THREE.Group();
            const magBodyMesh = new THREE.Mesh(magGeometry, magMaterial);
            const bulletTips = new THREE.Mesh(bulletTipGeometry, bulletTipMaterial);
            bulletTips.position.y = 0.425;
            
            itemMesh.add(magBodyMesh);
            itemMesh.add(bulletTips);
            
        } else if (weaponType === 'SHOTGUN') {
            // Shotgun shells - create a small box of shells
            itemMesh = new THREE.Group();
            
            // Shell box
            const boxGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.3);
            const boxMaterial = new THREE.MeshStandardMaterial({
                color: 0xaa7722, // Brown box
                metalness: 0.1,
                roughness: 0.8
            });
            
            const shellBox = new THREE.Mesh(boxGeometry, boxMaterial);
            itemMesh.add(shellBox);
            
            // Add visible shells on top
            const shellGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.15, 8);
            const shellMaterial = new THREE.MeshStandardMaterial({
                color: 0xe67e22, // Match shotgun ammo color from WEAPONS
                metalness: 0.7,
                roughness: 0.3
            });
            
            const tipMaterial = new THREE.MeshStandardMaterial({
                color: 0xcc0000, // Red tip
                metalness: 0.2,
                roughness: 0.8
            });
            
            // Create 3 visible shells
            for (let i = 0; i < 3; i++) {
                const shell = new THREE.Mesh(shellGeometry, shellMaterial);
                shell.rotation.x = Math.PI / 2; // Lay flat
                shell.position.set(-0.1 + i * 0.1, 0.15, 0);
                
                // Add red tip to shell
                const tipGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 8);
                const tip = new THREE.Mesh(tipGeometry, tipMaterial);
                tip.position.y = 0.085;
                shell.add(tip);
                
                itemMesh.add(shell);
            }
            
        } else if (weaponType === 'SNIPER') {
            // Sniper magazine - slim box with long bullets
            itemMesh = new THREE.Group();
            
            // Magazine body
            const magGeometry = new THREE.BoxGeometry(0.25, 0.6, 0.15);
            const magMaterial = new THREE.MeshStandardMaterial({
                color: 0x9b59b6, // Match sniper ammo color from WEAPONS
                metalness: 0.6,
                roughness: 0.4
            });
            
            const magBody = new THREE.Mesh(magGeometry, magMaterial);
            itemMesh.add(magBody);
            
            // Add visible bullet tips
            const bulletGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8);
            const bulletMaterial = new THREE.MeshStandardMaterial({
                color: 0xccaa77, // Brass
                metalness: 0.9,
                roughness: 0.1
            });
            
            // Create a row of visible bullets
            for (let i = 0; i < 2; i++) {
                const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
                bullet.rotation.x = Math.PI / 2; // Lay flat
                bullet.position.set(-0.05 + i * 0.1, 0.32, 0);
                itemMesh.add(bullet);
            }
        }
    } else {
        // Armor item - create a small armor plate or shield
        itemMesh = new THREE.Group();
        
        // Main armor plate
        const plateGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.1);
        const plateMaterial = new THREE.MeshStandardMaterial({
            color: 0x3377cc, // Blue
            metalness: 0.6,
            roughness: 0.4
        });
        
        const plate = new THREE.Mesh(plateGeometry, plateMaterial);
        itemMesh.add(plate);
        
        // Add armor details
        const detailGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.02);
        const detailMaterial = new THREE.MeshStandardMaterial({
            color: 0x5599ff, // Lighter blue
            metalness: 0.7,
            roughness: 0.3
        });
        
        const detail = new THREE.Mesh(detailGeometry, detailMaterial);
        detail.position.z = 0.06;
        itemMesh.add(detail);
        
        // Add armor symbol
        const symbolGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.02);
        const symbolMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff, // White
            emissive: 0x88aaff,
            emissiveIntensity: 0.5
        });
        
        const symbol = new THREE.Mesh(symbolGeometry, symbolMaterial);
        symbol.position.z = 0.09;
        symbol.rotation.z = Math.PI / 4; // Rotate 45 degrees
        itemMesh.add(symbol);
        
        itemType = 'armor';
    }
    
    // Position the item where the robot was
    itemMesh.position.copy(position);
    // Move it slightly down so it's on the ground
    itemMesh.position.y = 0.4;
    
    // Add item properties
    itemMesh.userData.type = 'item';
    itemMesh.userData.itemType = itemType;
    itemMesh.userData.spinSpeed = 0.02;
    itemMesh.userData.bounceHeight = 0.15;
    itemMesh.userData.bounceSpeed = 0.002;
    itemMesh.userData.bounceOffset = Math.random() * Math.PI * 2; // Random start position in bounce cycle
    itemMesh.userData.glowIntensity = 0;
    itemMesh.userData.glowDirection = 0.01; // Start increasing glow
    
    // Add collision box for the item
    const boundingBox = new THREE.Box3().setFromObject(itemMesh);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    
    // Create a collision box slightly larger than the item
    itemMesh.userData.collider = {
        width: size.x * 1.2,
        height: size.y * 1.2,
        depth: size.z * 1.2
    }
    
    // Add a point light to make the item glow slightly
    const itemLight = new THREE.PointLight(0xffffff, 0.3, 1.5);
    itemLight.position.set(0, 0.2, 0);
    itemMesh.add(itemLight);
    itemMesh.userData.light = itemLight;
    
    scene.add(itemMesh);
    droppedItems.push(itemMesh);
    return itemMesh;
}

// Function to collect items (ammo or armor)
function collectItem(item) {
    if (!item || !item.userData) {
        console.error('Invalid item passed to collectItem');
        return;
    }
    
    // Apply the item effect based on its type
    const itemType = item.userData.itemType;
    console.log('Collecting item of type:', itemType);
    
    // Handle weapon-specific magazine pickups
    if (itemType === 'pistol' || itemType === 'ar' || itemType === 'shotgun' || itemType === 'sniper') {
        // Convert itemType to uppercase for the magazineCounts object
        const weaponKey = itemType.toUpperCase();
        
        // Increase magazine count for that weapon
        magazineCounts[weaponKey]++;
        console.log(`Added magazine for ${weaponKey}. New count:`, magazineCounts[weaponKey]);
        
        // Update ammo display if this is the current weapon
        if (currentWeapon === WEAPONS[weaponKey]) {
            updateAmmoDisplay();
        }
        
        // Show pickup notification
        showPickupNotification(itemType, 1);
    } else if (itemType === 'armor') {
        // Add armor
        const armorAmount = 20;
        playerArmor = Math.min(maxPlayerArmor, playerArmor + armorAmount);
        updateHealthBar();
        
        // Show pickup notification
        showPickupNotification('armor', armorAmount);
    }
    
    // Remove from the items array
    const index = droppedItems.indexOf(item);
    if (index !== -1) {
        droppedItems.splice(index, 1);
    }
    
    // Remove the item from the scene
    scene.remove(item);
    
    // Play pickup sound
    console.log('Playing pickup sound');
    
    // Update the HUD
    updateAmmoDisplay();
    updateHealthBar();
}

// Function to show a temporary message
function showMessage(text) {
    // Create or get message element
    let messageElement = document.getElementById('pickup-message');
    
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'pickup-message';
        messageElement.style.position = 'absolute';
        messageElement.style.bottom = '150px';
        messageElement.style.left = '50%';
        messageElement.style.transform = 'translateX(-50%)';
        messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        messageElement.style.color = 'white';
        messageElement.style.padding = '10px 20px';
        messageElement.style.borderRadius = '5px';
        messageElement.style.fontFamily = 'Arial, sans-serif';
        messageElement.style.fontSize = '18px';
        messageElement.style.fontWeight = 'bold';
        messageElement.style.textAlign = 'center';
        messageElement.style.opacity = '0';
        messageElement.style.transition = 'opacity 0.3s';
        document.body.appendChild(messageElement);
    }
    
    // Set message text and show
    messageElement.textContent = text;
    messageElement.style.opacity = '1';
    
    // Hide after 3 seconds
    setTimeout(() => {
        messageElement.style.opacity = '0';
    }, 3000);
}

// Function to update double jump UI
function updateDoubleJumpUI() {
    const container = document.getElementById('double-jump-container');
    const cooldownIndicator = document.getElementById('double-jump-cooldown');
    
    if (!container || !cooldownIndicator) return;
    
    // Reset all classes
    container.classList.remove('double-jump-ready', 'double-jump-active');
    
    if (isLowGravity) {
        // Show active state
        container.classList.add('double-jump-active');
        // Show remaining time
        const remainingTime = Math.max(0, (lowGravityEndTime - Date.now()) / lowGravityDuration);
        cooldownIndicator.style.height = `${(1 - remainingTime) * 100}%`;
    } else if (doubleJumpCooldown) {
        // Show cooldown state
        const cooldownProgress = Math.min(1, (Date.now() - doubleJumpLastUsed) / doubleJumpCooldownTime);
        cooldownIndicator.style.height = `${(1 - cooldownProgress) * 100}%`;
    } else if (canDoubleJump) {
        // Show ready state
        container.classList.add('double-jump-ready');
        cooldownIndicator.style.height = '0%';
    } else {
        // Show default state
        cooldownIndicator.style.height = '0%';
    }
}

// Function to show double jump effect
function showDoubleJumpEffect() {
    // Create particle effect for double jump
    const particleCount = 20;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ccff,
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Position particle around player
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.5;
        particle.position.set(
            camera.position.x + Math.cos(angle) * radius,
            playerFeetY - 0.5,
            camera.position.z + Math.sin(angle) * radius
        );
        
        // Add velocity
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            Math.random() * 5 + 2,
            (Math.random() - 0.5) * 5
        );
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Add a point light for the effect
    const jumpLight = new THREE.PointLight(0x00ccff, 2, 5);
    jumpLight.position.copy(camera.position);
    jumpLight.position.y = playerFeetY - 0.5;
    scene.add(jumpLight);
    
    // Remove particles after animation
    const animateParticles = () => {
        particles.forEach(particle => {
            particle.position.add(particle.userData.velocity.clone().multiplyScalar(0.016));
            particle.userData.velocity.y -= 9.8 * 0.016; // Apply gravity to particles
            particle.material.opacity -= 0.02;
        });
        
        jumpLight.intensity -= 0.1;
        
        if (jumpLight.intensity > 0) {
            requestAnimationFrame(animateParticles);
        } else {
            // Remove particles and light
            particles.forEach(particle => scene.remove(particle));
            scene.remove(jumpLight);
        }
    };
    
    animateParticles();
}

// Crosshair animation
function updateCrosshair(moving) {
    const minGap = isAiming ? AIM_CROSSHAIR_MIN_GAP : NORMAL_CROSSHAIR_MIN_GAP;
    const maxGap = isAiming ? AIM_CROSSHAIR_MAX_GAP : NORMAL_CROSSHAIR_MAX_GAP;
    if (moving) {
        crosshairGap = Math.min(maxGap, crosshairGap + crosshairStep);
    } else {
        crosshairGap = Math.max(minGap, crosshairGap - crosshairStep);
    }
    
    // Update the crosshair lines directly
    updateCrosshairDOM();
}

// Crosshair style is updated directly in the mouse events

// Mouse events for aiming
function toggleAiming() {
    isAiming = !isAiming;
    
    // Update crosshair
    updateCrosshairDOM();
    
    // Handle weapon-specific aiming effects
    if (currentWeapon === WEAPONS.SNIPER) {
        const sniperScopeOverlay = document.getElementById('sniper-scope-overlay');
        
        if (isAiming) {
            // Show sniper scope overlay
            sniperScopeOverlay.style.display = 'block';
            
            // Moderate zoom for sniper (less extreme)
            camera.fov = 50;
        } else {
            // Hide sniper scope overlay
            sniperScopeOverlay.style.display = 'none';
            
            // Normal FOV
            camera.fov = 75;
        }
        camera.updateProjectionMatrix();
    } else if (currentWeapon === WEAPONS.SHOTGUN) {
        // Update shotgun spread pattern when aiming
        updateShotgunPattern();
    }
    
    console.log(`Aiming mode ${isAiming ? 'activated' : 'deactivated'} - switched to ${isAiming ? 'aiming' : 'normal'} crosshair`);
}

window.addEventListener('mousedown', (event) => {
    if (event.button === 2) { // Right mouse button
        toggleAiming();
    }
});

window.addEventListener('mouseup', (event) => {
    if (event.button === 2) { // Right mouse button
        toggleAiming();
    }
});

window.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent context menu

// Function to create a solar panel (for visual effects or power-ups)
function createSolarPanel() {
    const panel = new THREE.Group();
    


    // Panel base
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.1, 1),
        new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            metalness: 0.8
        })
    );
    
    // Solar cells
    const cells = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.05, 0.9),
        new THREE.MeshStandardMaterial({ 
            color: 0x0066ff,
            metalness: 0.5

        })
    );
    cells.position.y = 0.05;
    
    panel.add(base);
    panel.add(cells);
    
    // Position at camera
    panel.position.copy(camera.position);
    
    // Set velocity
    let shotDirection = new THREE.Vector3();
    camera.getWorldDirection(shotDirection);
    // Add spread based on movement state
    const isMoving = moveForward || moveBackward || moveLeft || moveRight;
    let spread = 0;
    if (isSprinting) {
        spread = NORMAL_SPREAD * 1.5; // Sprinting: less accurate
    } else if (isCrawling) {
        spread = NORMAL_SPREAD * 0.6; // Crawling: more accurate
    } else if (isMoving && !isAiming) {
        spread = NORMAL_SPREAD;
    } else if (isMoving && isAiming) {
        spread = AIM_SPREAD;
    } else if (!isMoving && isAiming) {
        spread = AIM_SPREAD / 2;
    } else {
        spread = NORMAL_SPREAD / 2;
    }
    if (spread > 0) {
        const randomSpread = (Math.random() - 0.5) * spread;
        const spreadAxis = new THREE.Vector3(0, 1, 0); // Yaw only
        shotDirection.applyAxisAngle(spreadAxis, randomSpread);
    }
    panel.userData.velocity = shotDirection.multiplyScalar(1);
    
    scene.add(panel);
    solarPanels.push(panel);
}

// Add this function to create cars
function createCar(x, z, rotation) {
    const car = new THREE.Group();
    
    // Car body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(4, 1.5, 2),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 })
    );
    car.add(body);
    
    // Car roof
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.5, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 })
    );
    roof.position.y = 1;
    car.add(roof);
    
    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 });
    
    const wheelPositions = [
        { x: 1.5, y: -0.75, z: 1 },
        { x: -1.5, y: -0.75, z: 1 },
        { x: 1.5, y: -0.75, z: -1 },
        { x: -1.5, y: -0.75, z: -1 }
    ];
    
    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(pos.x, pos.y, pos.z);
        wheel.rotation.x = Math.PI / 2;
        car.add(wheel);
    });
    
    car.position.set(x, 0.75, z);
    car.rotation.y = rotation;
    car.castShadow = true;
    car.receiveShadow = true;
    
    // Add userData to identify this as a car for collision detection
    body.userData = {
        isSolidObject: true,
        type: 'car'
    };
    
    // Add roof to solid surfaces too
    roof.userData = {
        isSolidObject: true,
        type: 'car_roof'
    };
    
    scene.add(car);
    
    // Add both body and roof to solid surfaces for comprehensive collision
    solidSurfaces.push(body);
    solidSurfaces.push(roof);
    
    return car;
}

// Sprint UI setup
if (!document.getElementById('sprint-indicator')) {
    const sprintDiv = document.createElement('div');
    sprintDiv.id = 'sprint-indicator';
    sprintDiv.style.position = 'fixed';
    sprintDiv.style.left = 'calc(50% - 100px)';
    sprintDiv.style.top = '20px';
    sprintDiv.style.transform = 'translateX(-50%)';
    sprintDiv.style.width = '50px';
    sprintDiv.style.height = '50px';
    sprintDiv.style.background = 'rgba(0, 0, 0, 0.7)';
    sprintDiv.style.border = '2px solid #ff6600';
    sprintDiv.style.borderRadius = '50%';
    sprintDiv.style.display = 'flex';
    sprintDiv.style.flexDirection = 'column';
    sprintDiv.style.alignItems = 'center';
    sprintDiv.style.justifyContent = 'center';
    sprintDiv.style.zIndex = '1001';
    sprintDiv.style.boxShadow = '0 0 10px rgba(255, 102, 0, 0.5)';
    sprintDiv.style.userSelect = 'none';
    sprintDiv.style.pointerEvents = 'none';
    sprintDiv.style.transition = 'opacity 0.2s';
    sprintDiv.style.opacity = '0';
    sprintDiv.style.overflow = 'hidden';
    // Sprint icon
    sprintDiv.innerHTML = `
        <div style="font-size: 24px; color: #ffffff; text-shadow: 0 0 5px rgba(255, 102, 0, 0.8); z-index: 2;">⚡</div>
    `;
    
    // Add a tooltip for Shift key
    sprintDiv.addEventListener('mouseenter', () => {
        const tooltip = document.createElement('div');
        tooltip.style.position = 'absolute';
        tooltip.style.bottom = '-25px';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.style.background = 'rgba(0, 0, 0, 0.7)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '3px 8px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '12px';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.textContent = 'Shift';
        tooltip.style.pointerEvents = 'none';
        sprintDiv.appendChild(tooltip);
    });
    document.body.appendChild(sprintDiv);
}

function updateSprintUI() {
    const sprintDiv = document.getElementById('sprint-indicator');
    if (!sprintDiv) return;
    // Always show unless dead or in menu
    if (!isDead) {
        sprintDiv.style.opacity = '1';
    } else {
        sprintDiv.style.opacity = '0';
    }
}

// Crawl UI setup
if (!document.getElementById('crawl-indicator')) {
    const crawlDiv = document.createElement('div');
    crawlDiv.id = 'crawl-indicator';
    crawlDiv.style.position = 'fixed';
    crawlDiv.style.left = '50%';
    crawlDiv.style.top = '20px';
    crawlDiv.style.transform = 'translateX(-50%)';
    crawlDiv.style.width = '50px';
    crawlDiv.style.height = '50px';
    crawlDiv.style.background = 'rgba(0, 0, 0, 0.7)';
    crawlDiv.style.border = '2px solid #33cc33';
    crawlDiv.style.borderRadius = '50%';
    crawlDiv.style.display = 'flex';
    crawlDiv.style.flexDirection = 'column';
    crawlDiv.style.alignItems = 'center';
    crawlDiv.style.justifyContent = 'center';
    crawlDiv.style.zIndex = '1001';
    crawlDiv.style.boxShadow = '0 0 10px rgba(51, 204, 51, 0.5)';
    crawlDiv.style.userSelect = 'none';
    crawlDiv.style.pointerEvents = 'none';
    crawlDiv.style.transition = 'opacity 0.2s';
    crawlDiv.style.opacity = '0';
    crawlDiv.style.overflow = 'hidden';
    // Crawl icon
    crawlDiv.innerHTML = `
        <div style="font-size: 24px; color: #ffffff; text-shadow: 0 0 5px rgba(51, 204, 51, 0.8); z-index: 2;">🕷️</div>
    `;
    
    // Add a tooltip for Ctrl key
    crawlDiv.addEventListener('mouseenter', () => {
        const tooltip = document.createElement('div');
        tooltip.style.position = 'absolute';
        tooltip.style.bottom = '-25px';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.style.background = 'rgba(0, 0, 0, 0.7)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '3px 8px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '12px';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.textContent = 'Ctrl';
        tooltip.style.pointerEvents = 'none';
        crawlDiv.appendChild(tooltip);
    });
    document.body.appendChild(crawlDiv);
}

function updateCrawlUI() {
    const crawlDiv = document.getElementById('crawl-indicator');
    if (!crawlDiv) return;
    // Always show unless dead or in menu
    if (!isDead) {
        crawlDiv.style.opacity = '1';
    } else {
        crawlDiv.style.opacity = '0';
    }
}

// Create scattered boxes around the map as solid objects
function createScatteredBoxes() {
    // Array to store box positions, sizes, colors, and rotation
    const boxData = [
        // Ammo crates (smaller boxes)
        { x: 10, z: 15, width: 1.5, height: 1.5, depth: 1.5, color: 0x8B4513, rotation: 0, type: 'crate' },  // Brown crate
        { x: -12, z: 8, width: 1.5, height: 1.5, depth: 1.5, color: 0x8B4513, rotation: 0.3, type: 'crate' },
        { x: 25, z: -18, width: 1.5, height: 1.5, depth: 1.5, color: 0x8B4513, rotation: 0.7, type: 'crate' },
        { x: -30, z: -25, width: 1.5, height: 1.5, depth: 1.5, color: 0x8B4513, rotation: 0.2, type: 'crate' },
        
        // Shipping containers (larger boxes)
        { x: 35, z: 10, width: 6, height: 2.5, depth: 2.5, color: 0x2E8B57, rotation: 0.2, type: 'container' },  // Green container
        { x: -25, z: 30, width: 6, height: 2.5, depth: 2.5, color: 0x4682B4, rotation: 0.5, type: 'container' },  // Blue container
        { x: 15, z: -35, width: 6, height: 2.5, depth: 2.5, color: 0xB22222, rotation: 0.8, type: 'container' },  // Red container
        
        // Metal barrels
        { x: 5, z: -8, width: 1, height: 1.5, depth: 1, color: 0x708090, rotation: 0, type: 'barrel' },  // Gray barrel
        { x: 6, z: -7, width: 1, height: 1.5, depth: 1, color: 0x708090, rotation: 0.2, type: 'barrel' },
        { x: 7, z: -9, width: 1, height: 1.5, depth: 1, color: 0x708090, rotation: 0.4, type: 'barrel' },
        
        // Concrete barriers
        { x: -15, z: -15, width: 3, height: 1, depth: 1, color: 0xA9A9A9, rotation: 0.3, type: 'barrier' },  // Gray barrier
        { x: -17, z: -15, width: 3, height: 1, depth: 1, color: 0xA9A9A9, rotation: 0.3, type: 'barrier' },
        { x: -19, z: -15, width: 3, height: 1, depth: 1, color: 0xA9A9A9, rotation: 0.3, type: 'barrier' },
        
        // Random boxes
        { x: 18, z: 5, width: 2, height: 2, depth: 2, color: 0xCD853F, rotation: 0.5, type: 'box' },
        { x: -8, z: 22, width: 2.5, height: 1.8, depth: 2.5, color: 0xDEB887, rotation: 0.1, type: 'box' },
        { x: -5, z: -28, width: 2.2, height: 2.2, depth: 2.2, color: 0xD2B48C, rotation: 0.9, type: 'box' },
    ];
    
    // Create each box and add it to the scene
    boxData.forEach(data => {
        // Create a group to hold the box and its collision mesh
        const boxGroup = new THREE.Group();
        
        // Create visible box geometry
        const geometry = new THREE.BoxGeometry(data.width, data.height, data.depth);
        
        // Create material with some texture
        const material = new THREE.MeshStandardMaterial({
            color: data.color,
            metalness: 0.3,
            roughness: 0.8
        });
        
        // Create visible mesh
        const box = new THREE.Mesh(geometry, material);
        box.castShadow = true;
        box.receiveShadow = true;
        boxGroup.add(box);
        
        // Add userData to identify this as a solid box
        box.userData = {
            isSolidBox: true,
            boxType: data.type
        };
        
        // Create a slightly larger collision box to prevent falling through gaps
        // EXACT SAME APPROACH AS BUILDINGS
        const collisionPadding = 0.2; // Add padding to collision box
        const collisionGeometry = new THREE.BoxGeometry(
            data.width + collisionPadding, 
            data.height, 
            data.depth + collisionPadding
        );
        
        // Create invisible collision mesh
        const collisionMesh = new THREE.Mesh(
            collisionGeometry,
            new THREE.MeshBasicMaterial({ visible: false }) // Invisible collision mesh
        );
        
        // Add userData to identify this as a collision mesh
        collisionMesh.userData = {
            isSolidBox: true,
            isCollisionMesh: true,
            boxType: data.type
        };
        
        // Add collision mesh to group
        boxGroup.add(collisionMesh);
        
        // Position and rotate the entire group
        boxGroup.position.set(data.x, data.height/2, data.z);
        boxGroup.rotation.y = data.rotation;
        
        // Add to scene
        scene.add(boxGroup);
        
        // Add both visible box and invisible collision mesh to solid surfaces
        solidSurfaces.push(box);
        solidSurfaces.push(collisionMesh);
        
        // Store in boxes array
        boxes.push(box);
    });
    
    console.log('Created', boxData.length, 'scattered boxes as solid objects');
}