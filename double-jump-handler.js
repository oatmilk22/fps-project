// Double jump handler functionality
console.log('Double jump handler loaded');

// Double jump state
const doubleJumpState = {
    available: false,        // Whether double jump is available
    used: false,            // Whether double jump has been used in current jump
    cooldown: 0,            // Cooldown timer
    cooldownDuration: 1.0,  // Cooldown duration in seconds
    force: 6.0,             // Upward force for double jump
    effectDuration: 0.5,    // Visual effect duration in seconds
    effectTimer: 0          // Visual effect timer
};

// Initialize double jump system
function init() {
    // Reset state
    doubleJumpState.available = false;
    doubleJumpState.used = false;
    doubleJumpState.cooldown = 0;
    doubleJumpState.effectTimer = 0;
    
    // Add event listeners for jump state changes
    document.addEventListener('jumpStart', onJumpStart);
    document.addEventListener('grounded', onGrounded);
    document.addEventListener('update', onUpdate);
    
    console.log('Double jump system initialized');
}

// Called when player starts jumping
function onJumpStart() {
    if (!doubleJumpState.available && !doubleJumpState.used) {
        // First jump - make double jump available
        doubleJumpState.available = true;
    } else if (doubleJumpState.available && !doubleJumpState.used) {
        // Double jump!
        performDoubleJump();
    }
}

// Called when player touches the ground
function onGrounded() {
    // Reset double jump when grounded
    doubleJumpState.available = false;
    doubleJumpState.used = false;
    doubleJumpState.cooldown = 0;
    
    // Update UI
    updateDoubleJumpUI();
}

// Perform the double jump
function performDoubleJump() {
    if (doubleJumpState.cooldown > 0) return;
    
    // Apply upward force
    if (window.playerState) {
        window.playerState.verticalVelocity = doubleJumpState.force;
    }
    
    // Set state
    doubleJumpState.used = true;
    doubleJumpState.available = false;
    doubleJumpState.cooldown = doubleJumpState.cooldownDuration;
    doubleJumpState.effectTimer = doubleJumpState.effectDuration;
    
    // Play sound effect
    playDoubleJumpSound();
    
    // Show visual effect
    showDoubleJumpEffect();
    
    // Update UI
    updateDoubleJumpUI();
    
    // Dispatch event
    const event = new CustomEvent('doubleJump');
    document.dispatchEvent(event);
}

// Update double jump state
function onUpdate(deltaTime) {
    // Update cooldown
    if (doubleJumpState.cooldown > 0) {
        doubleJumpState.cooldown = Math.max(0, doubleJumpState.cooldown - deltaTime);
    }
    
    // Update visual effect
    if (doubleJumpState.effectTimer > 0) {
        doubleJumpState.effectTimer = Math.max(0, doubleJumpState.effectTimer - deltaTime);
        updateDoubleJumpEffect(deltaTime);
    }
}

// Play double jump sound effect
function playDoubleJumpSound() {
    // Check if audio system is available
    if (window.audioManager) {
        audioManager.play('double_jump');
    } else {
        console.log('Double jump sound would play here');
    }
}

// Show double jump visual effect
function showDoubleJumpEffect() {
    // Create particle effect at player position
    if (window.createParticleEffect) {
        const position = window.camera.position.clone();
        position.y -= 0.5; // Adjust height
        createParticleEffect({
            position: position,
            count: 30,
            size: 0.2,
            color: 0x00ccff,
            speed: 2.0,
            lifetime: 0.8
        });
    }
    
    // Update UI effect
    const effect = document.getElementById('double-jump-effect');
    if (effect) {
        effect.style.opacity = '1';
        effect.style.transform = 'scale(1.5)';
        effect.style.transition = 'all 0.3s ease-out';
    }
}

// Update double jump visual effect
function updateDoubleJumpEffect(deltaTime) {
    const effect = document.getElementById('double-jump-effect');
    if (effect) {
        const progress = 1 - (doubleJumpState.effectTimer / doubleJumpState.effectDuration);
        const scale = 1.0 + (0.5 * progress);
        const opacity = 1 - (progress * 0.8);
        
        effect.style.transform = `scale(${scale})`;
        effect.style.opacity = opacity;
        
        if (progress >= 1) {
            effect.style.transition = 'none';
            effect.style.opacity = '0';
        }
    }
}

// Update double jump UI
function updateDoubleJumpUI() {
    const uiElement = document.getElementById('double-jump-ui');
    if (uiElement) {
        if (doubleJumpState.available && !doubleJumpState.used) {
            uiElement.style.opacity = '1';
            uiElement.textContent = 'Double Jump Ready';
        } else {
            uiElement.style.opacity = '0.5';
            uiElement.textContent = 'Double Jump';
        }
    }
}

// Public API
const doubleJumpHandler = {
    init: init,
    update: onUpdate,
    isDoubleJumpAvailable: () => doubleJumpState.available && !doubleJumpState.used,
    forceDoubleJump: () => {
        if (doubleJumpState.available && !doubleJumpState.used) {
            performDoubleJump();
            return true;
        }
        return false;
    }
};

export default doubleJumpHandler;
