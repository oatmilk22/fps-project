// Stats Screen for FPS Game
// Shows player statistics when Tab key is held

// Stats tracking variables
let playerStats = {
    kills: 0,
    headshots: 0,
    totalShots: 0,
    hitShots: 0,
    totalDamageDealt: 0,
    accuracy: 0,
    timePlayed: 0,
    highestKillStreak: 0,
    currentKillStreak: 0,
    deaths: 0,
    distanceTraveled: 0, // in meters
    jumps: 0,
    doubleJumps: 0
};

// DOM Elements - will be initialized when document is loaded
let statsScreen;
let statsVisible = false;

// Initialize the stats screen when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create stats UI elements if they don't exist
    createStatsUI();
    
    // Add event listeners
    setupEventListeners();
    
    // Start tracking time played
    startTimeTracking();
    
    console.log('Stats system initialized');
});

// Create the stats UI elements
function createStatsUI() {
    // Check if the stats screen already exists
    if (document.getElementById('stats-screen')) return;
    
    // Create stats screen container
    statsScreen = document.createElement('div');
    statsScreen.id = 'stats-screen';
    statsScreen.classList.add('stats-hidden');
    
    // Create stats header
    const statsHeader = document.createElement('div');
    statsHeader.id = 'stats-header';
    statsHeader.innerHTML = '<h2>Player Statistics</h2>';
    statsScreen.appendChild(statsHeader);
    
    // Create stats content container
    const statsContent = document.createElement('div');
    statsContent.id = 'stats-content';
    
    // Create left column for combat stats
    const combatStats = document.createElement('div');
    combatStats.id = 'combat-stats';
    combatStats.className = 'stats-column';
    
    combatStats.innerHTML = `
        <h3>Combat</h3>
        <div class="stat-row">
            <span class="stat-label">Kills:</span>
            <span id="stat-kills" class="stat-value">0</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Headshots:</span>
            <span id="stat-headshots" class="stat-value">0</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Damage Dealt:</span>
            <span id="stat-damage" class="stat-value">0</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Accuracy:</span>
            <span id="stat-accuracy" class="stat-value">0%</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Shots Fired:</span>
            <span id="stat-shots" class="stat-value">0</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Shots Hit:</span>
            <span id="stat-hits" class="stat-value">0</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Current Streak:</span>
            <span id="stat-current-streak" class="stat-value">0</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Highest Streak:</span>
            <span id="stat-highest-streak" class="stat-value">0</span>
        </div>
    `;
    
    // Create right column for general stats
    const generalStats = document.createElement('div');
    generalStats.id = 'general-stats';
    generalStats.className = 'stats-column';
    
    generalStats.innerHTML = `
        <h3>General</h3>
        <div class="stat-row">
            <span class="stat-label">Time Played:</span>
            <span id="stat-time" class="stat-value">00:00</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Deaths:</span>
            <span id="stat-deaths" class="stat-value">0</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Distance:</span>
            <span id="stat-distance" class="stat-value">0m</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Jumps:</span>
            <span id="stat-jumps" class="stat-value">0</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Double Jumps:</span>
            <span id="stat-double-jumps" class="stat-value">0</span>
        </div>
    `;
    
    // Add columns to content
    statsContent.appendChild(combatStats);
    statsContent.appendChild(generalStats);
    statsScreen.appendChild(statsContent);
    
    // Add instruction text
    const instruction = document.createElement('div');
    instruction.id = 'stats-instruction';
    instruction.textContent = 'Hold TAB to view stats';
    statsScreen.appendChild(instruction);
    
    // Add to game container
    document.getElementById('game-container').appendChild(statsScreen);
}

// Variable to store the update interval
let statsUpdateInterval;

// Set up event listeners for stats functionality
function setupEventListeners() {
    // Tab key to show stats
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            if (!statsVisible) {
                showStats();
            }
            // Start updating stats in real-time
            if (statsUpdateInterval) {
                clearInterval(statsUpdateInterval);
            }
            statsUpdateInterval = setInterval(updateStatsDisplay, 100); // Update 10 times per second
            e.preventDefault(); // Prevent tab from changing focus
        }
    });
    
    // Release Tab key to hide stats
    document.addEventListener('keyup', (e) => {
        if (e.key === 'Tab' && statsVisible) {
            hideStats();
            // Clear the update interval when hiding stats
            if (statsUpdateInterval) {
                clearInterval(statsUpdateInterval);
                statsUpdateInterval = null;
            }
        }
    });
    
    // Hide stats if window loses focus
    window.addEventListener('blur', () => {
        if (statsVisible) {
            hideStats();
            // Clear the update interval when hiding stats
            if (statsUpdateInterval) {
                clearInterval(statsUpdateInterval);
                statsUpdateInterval = null;
            }
        }
    });
}

// Show stats screen
function showStats() {
    statsVisible = true;
    statsScreen.classList.remove('stats-hidden');
    statsScreen.classList.add('stats-visible');
    
    // Update stats before showing
    updateStatsDisplay();
}

// Hide stats screen
function hideStats() {
    statsVisible = false;
    statsScreen.classList.remove('stats-visible');
    statsScreen.classList.add('stats-hidden');
}

// Update the stats display with current values
function updateStatsDisplay() {
    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
        // Update combat stats
        const combatStats = [
            { id: 'kills', value: playerStats.kills },
            { id: 'headshots', value: playerStats.headshots },
            { id: 'damage', value: Math.round(playerStats.totalDamageDealt) },
            { id: 'accuracy', value: `${playerStats.accuracy.toFixed(1)}%` },
            { id: 'shots', value: playerStats.totalShots },
            { id: 'hits', value: playerStats.hitShots },
            { id: 'current-streak', value: playerStats.currentKillStreak },
            { id: 'highest-streak', value: playerStats.highestKillStreak }
        ];

        // Update general stats
        const generalStats = [
            { id: 'time', value: formatTime(playerStats.timePlayed) },
            { id: 'deaths', value: playerStats.deaths },
            { id: 'distance', value: `${playerStats.distanceTraveled.toFixed(1)}m` },
            { id: 'jumps', value: playerStats.jumps },
            { id: 'double-jumps', value: playerStats.doubleJumps }
        ];

        // Batch DOM updates for better performance
        const updateStatElements = (prefix, stats) => {
            stats.forEach(stat => {
                const element = document.getElementById(`stat-${stat.id}`);
                if (element && element.textContent !== String(stat.value)) {
                    element.textContent = stat.value;
                }
            });
        };

        updateStatElements('stat-', [...combatStats, ...generalStats]);
    });
}

// Format time in MM:SS format
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Start tracking time played
function startTimeTracking() {
    setInterval(() => {
        // Only increment time if game is active (not paused or dead)
        if (window.animationRunning && !window.isDead) {
            playerStats.timePlayed += 1;
            
            // If stats are visible, update the display
            if (statsVisible) {
                document.getElementById('stat-time').textContent = formatTime(playerStats.timePlayed);
            }
        }
    }, 1000);
}

// Record a kill
function recordKill(isHeadshot = false) {
    playerStats.kills++;
    playerStats.currentKillStreak++;
    
    if (isHeadshot) {
        playerStats.headshots++;
    }
    
    // Update highest kill streak if needed
    if (playerStats.currentKillStreak > playerStats.highestKillStreak) {
        playerStats.highestKillStreak = playerStats.currentKillStreak;
    }
}

// Record player death
function recordDeath() {
    playerStats.deaths++;
    playerStats.currentKillStreak = 0;
}

// Record a shot
function recordShot(hit = false, damage = 0) {
    playerStats.totalShots++;
    
    if (hit) {
        playerStats.hitShots++;
        playerStats.totalDamageDealt += damage;
    }
    
    // Update accuracy
    playerStats.accuracy = (playerStats.totalShots > 0) 
        ? (playerStats.hitShots / playerStats.totalShots) * 100 
        : 0;
}

// Record a jump
function recordJump(isDoubleJump = false) {
    playerStats.jumps++;
    
    if (isDoubleJump) {
        playerStats.doubleJumps++;
    }
}

// Record distance traveled
function updateDistanceTraveled(distance) {
    playerStats.distanceTraveled += distance;
}

// Reset all stats
function resetStats() {
    playerStats = {
        kills: 0,
        headshots: 0,
        totalShots: 0,
        hitShots: 0,
        totalDamageDealt: 0,
        accuracy: 0,
        timePlayed: 0,
        highestKillStreak: 0,
        currentKillStreak: 0,
        deaths: 0,
        distanceTraveled: 0,
        jumps: 0,
        doubleJumps: 0
    };
}

// Public API
window.statsSystem = {
    recordKill,
    recordDeath,
    recordShot,
    recordJump,
    updateDistanceTraveled,
    resetStats,
    getStats: () => ({ ...playerStats })
};
