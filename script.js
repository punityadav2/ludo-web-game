
// Game State
const gameState = {
    players: ['red', 'green', 'yellow', 'blue'],
    playerNames: {}, // { red: "Alice", ... }
    finishedPlayers: [], // Stores 'red', 'blue' in order of finishing
    currentPlayerIndex: 0,
    diceValue: null,
    tokens: {
        red: [-1, -1, -1, -1],
        green: [-1, -1, -1, -1],
        yellow: [-1, -1, -1, -1],
        blue: [-1, -1, -1, -1]
    },
    isAnimating: false,
    isMuted: false,
    awaitingMove: false,
    consecutiveSixes: 0
};
// ...

let selectedPlayerCount = 4;

function prepareGame(count) {
    selectedPlayerCount = count;
    document.getElementById('player-select').style.display = 'none';
    const inputContainer = document.getElementById('input-container');
    const nameSection = document.getElementById('name-inputs');

    inputContainer.innerHTML = '';
    nameSection.style.display = 'flex';

    // Determine colors based on count
    let colors = [];
    if (count === 2) colors = ['red', 'yellow'];
    else if (count === 3) colors = ['red', 'green', 'yellow'];
    else colors = ['red', 'green', 'yellow', 'blue'];

    colors.forEach(color => {
        inputContainer.innerHTML += `
    < div class="player-input-group" >
                <label style="color: ${getColorHex(color)}">${color}</label>
                <input type="text" id="name-${color}" placeholder="${color.toUpperCase()} Name" value="${capitalize(color)}">
            </div>
`;
    });
}

// (Inside rollDice)


function resetStartScreen() {
    document.getElementById('name-inputs').style.display = 'none';
    document.getElementById('player-select').style.display = 'flex'; // Use flex if that was original, strictly it's usually block or flex
    // check css: .player-select { display: flex; gap: 10px; }
}

function submitNames() {
    let colors = [];
    if (selectedPlayerCount === 2) colors = ['red', 'yellow'];
    else if (selectedPlayerCount === 3) colors = ['red', 'green', 'yellow'];
    else colors = ['red', 'green', 'yellow', 'blue'];

    gameState.playerNames = {};
    colors.forEach(color => {
        const val = document.getElementById(`name-${color}`).value;
        gameState.playerNames[color] = val.trim() || capitalize(color);
    });

    startGame(selectedPlayerCount);
}

function getColorHex(color) {
    if (color === 'red') return '#ff4757';
    if (color === 'green') return '#2ed573';
    if (color === 'yellow') return '#ffa502';
    if (color === 'blue') return '#1e90ff';
    return 'white';
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function startGame(playerCount) {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none'; // Ensure hidden logic

    gameState.finishedPlayers = [];

    if (playerCount === 2) {
        gameState.players = ['red', 'yellow'];
    } else if (playerCount === 3) {
        gameState.players = ['red', 'green', 'yellow'];
    } else {
        gameState.players = ['red', 'green', 'yellow', 'blue'];
    }

    gameState.tokens = {
        red: [-1, -1, -1, -1],
        green: [-1, -1, -1, -1],
        yellow: [-1, -1, -1, -1],
        blue: [-1, -1, -1, -1]
    };
    gameState.currentPlayerIndex = 0;
    gameState.diceValue = null;
    gameState.awaitingMove = false;
    gameState.isAnimating = false;

    renderBoard();
    updateUI();

    // Start Music
    if (!gameState.isMuted) {
        playSound('bgm');
    }
}

function finalizeMove(color, tokenIndex, newPos) {
    gameState.tokens[color][tokenIndex] = newPos;
    gameState.isAnimating = false;

    // Check for Kill
    let killHappened = false;
    if (newPos < 100) {
        killHappened = checkForKill(color, newPos);
    }

    renderTokens();
    const val = gameState.diceValue;
    gameState.diceValue = null;
    const diceEl = document.getElementById(`dice-${color}`);
    if (diceEl) diceEl.innerText = val;

    // Check for Win (Finish)
    if (newPos === 57) {
        // Only play trivial sound or extra turn sound?
        // User requested: "play the win music when all the tokens... complete"
        // So for single token, we do NOT play win music.
        // Maybe play 'roll' or nothing.

        // Did player finish ALL tokens?
        if (gameState.tokens[color].every(p => p === 57)) {
            playSound('win'); // Play WIN music only here

            if (!gameState.finishedPlayers.includes(color)) {
                gameState.finishedPlayers.push(color);
                alert(`${color.toUpperCase()} Finished #${gameState.finishedPlayers.length} !`);
            }

            // Check Match Over (All but one finished)
            if (gameState.finishedPlayers.length >= gameState.players.length - 1) {
                showGameOver();
                return;
            }
        } else {
            // Single token finished
            playSound('roll'); // Simple feedback
            alert(`${color.toUpperCase()} Token Finished!`);
        }

        setTimeout(() => updateUI(), 500);

        // Extra turn for finishing? Yes.
        if (gameState.finishedPlayers.includes(color)) {
            nextTurn(); // If player is done, pass turn
            return;
        }

        // Extra turn (Standard Rule: reaching home gives extra turn)
        // Reset awaitingMove to allow rollDice
        gameState.isAnimating = false;
        gameState.awaitingMove = false;
        // Dice is already cleared in UI but logical value is null.
        // We need to enable dice for Current Player again.
        // checkPossibleMoves() would usually do this but we cleared dice.

        // Let's explicitly enable re-roll
        const diceEl = document.getElementById(`dice-${color}`);
        if (diceEl) {
            diceEl.style.pointerEvents = 'auto';
            diceEl.style.opacity = '1';
            diceEl.innerText = '🎲'; // Reset to icon for new roll
        }
        return;
    }

    if (val === 6 || killHappened) {
        updateUI(); // Same player
    } else {
        nextTurn();
    }
}

function nextTurn() {
    // Loop until we find a player who hasn't finished
    let loops = 0;
    do {
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
        loops++;
    } while (gameState.finishedPlayers.includes(gameState.players[gameState.currentPlayerIndex]) && loops < 5);

    // Update visuals
    const prevColor = gameState.players[(gameState.currentPlayerIndex - 1 + gameState.players.length) % gameState.players.length];
    if (document.getElementById(`dice-${prevColor}`)) {
        document.getElementById(`dice-${prevColor}`).innerText = '🎲';
    }

    updateUI();
}

function showGameOver() {
    const screen = document.getElementById('game-over-screen');
    const list = document.getElementById('winner-list');
    list.innerHTML = '';

    // Add winners
    gameState.finishedPlayers.forEach((color, i) => {
        list.innerHTML += `< div class="rank-item rank-${i + 1}" >
            <span>#${i + 1}</span>
            <span style="text-transform: capitalize;">${color}</span>
            <span>🏆</span>
        </div > `;
    });

    // Add the loser (the one remaining)
    const loser = gameState.players.find(p => !gameState.finishedPlayers.includes(p));
    if (loser) {
        list.innerHTML += `< div class="rank-item" >
            <span>Last</span>
            <span style="text-transform: capitalize;">${loser}</span>
            <span>😭</span>
        </div > `;
    }

    screen.style.display = 'flex';
    playSound('bgm'); // Maybe play fanfare?
}

const sounds = {
    roll: new Audio('assets/audio/dice-roll.mp3'),
    kill: new Audio('assets/audio/kill.mp3'),
    win: new Audio('assets/audio/win.mp3'),
    bgm: new Audio('assets/audio/bg-music.mp3')
};
if (sounds.bgm) {
    sounds.bgm.loop = true;
}

function playSound(key) {
    if (gameState.isMuted) return;
    const audio = sounds[key];
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio play failed (user interaction needed):", e));
    }
}

function toggleSound() {
    gameState.isMuted = !gameState.isMuted;

    // Toggle BGM
    if (sounds.bgm) {
        if (gameState.isMuted) {
            sounds.bgm.pause();
        } else {
            sounds.bgm.play().catch(e => console.log("BGM play failed:", e));
        }
    }

    updateUI();
}

// Coordinate mapping for the main 52-step path (entering from Red start)
// 0 is Red Start (6,1). The path goes clockwise.
// We need to construct this path array of [row, col] coordinates.
const mainPath = [
    // Red Start Arm (Bottom side of Red Home) -> Right
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    // Up Green Arm (Left side of Green Home)
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    // Across Green home top (Right)
    [0, 7], [0, 8],
    // Down Green Arm (Right side)
    [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    // Right Yellow Arm (Top side)
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    // Down Yellow End (Right)
    [7, 14], [8, 14],
    // Left Yellow Arm (Bottom side)
    [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
    // Down Blue Arm (Right side of Blue Home)
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    // Left Blue Home bottom
    [14, 7], [14, 6],
    // Up Blue Arm (Left side)
    [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],

];

function generatePath() {
    let p = [];
    // Red Side Bottom Row (L->R)
    p.push([6, 1], [6, 2], [6, 3], [6, 4], [6, 5]);
    // Green Side Left Col (B->T)
    p.push([5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6]);
    // Top Turn
    p.push([0, 7], [0, 8]);
    // Green Side Right Col (T->B)
    p.push([1, 8], [2, 8], [3, 8], [4, 8], [5, 8]); // Removed [6,8]
    // Yellow Side Top Row (L->R)
    p.push([6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14]);
    // Right Turn
    p.push([7, 14], [8, 14]);
    // Yellow Side Bottom Row (R->L)
    p.push([8, 13], [8, 12], [8, 11], [8, 10], [8, 9]); // Removed [8,8]
    // Blue Side Right Col (T->B)
    p.push([9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8]);
    // Bottom Turn
    p.push([14, 7], [14, 6]);
    // Blue Side Left Col (B->T)
    p.push([13, 6], [12, 6], [11, 6], [10, 6], [9, 6]); // Removed [8,6]
    // Red Side Top Row (R->L)
    p.push([8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0]);
    // Left Turn
    p.push([7, 0], [6, 0]);

    return p; // Should be 52
}
const globalPath = generatePath();

document.addEventListener('DOMContentLoaded', () => {
    // Wait for user to select players
    // Start screen is visible by default (via CSS)
});

function startGame(playerCount) {
    document.getElementById('start-screen').style.display = 'none';

    // Setup Players
    if (playerCount === 2) {
        gameState.players = ['red', 'yellow']; // Standard opposites
    } else if (playerCount === 3) {
        gameState.players = ['red', 'green', 'yellow'];
    } else {
        gameState.players = ['red', 'green', 'yellow', 'blue'];
    }

    gameState.tokens = {
        red: [-1, -1, -1, -1],
        green: [-1, -1, -1, -1],
        yellow: [-1, -1, -1, -1],
        blue: [-1, -1, -1, -1]
    };
    gameState.currentPlayerIndex = 0;
    gameState.diceValue = null;
    gameState.awaitingMove = false;

    renderBoard();
    updateUI();
}

function renderBoard() {
    const boardContainer = document.getElementById('ludo-board');
    boardContainer.innerHTML = '';

    for (let row = 0; row < 15; row++) {
        for (let col = 0; col < 15; col++) {
            const cell = document.createElement('div');
            cell.id = `cell-${row}-${col}`;

            // Homes
            if (row < 6 && col < 6) {
                if (row === 0 && col === 0) boardContainer.appendChild(createHome('red', 'home-red', gameState.playerNames['red']));
                continue;
            }
            if (row < 6 && col > 8) {
                if (row === 0 && col === 9) boardContainer.appendChild(createHome('green', 'home-green', gameState.playerNames['green']));
                continue;
            }
            if (row > 8 && col < 6) {
                if (row === 9 && col === 0) boardContainer.appendChild(createHome('blue', 'home-blue', gameState.playerNames['blue']));
                continue;
            }
            if (row > 8 && col > 8) {
                if (row === 9 && col === 9) boardContainer.appendChild(createHome('yellow', 'home-yellow', gameState.playerNames['yellow']));
                continue;
            }
            // Center
            if (row >= 6 && row <= 8 && col >= 6 && col <= 8) {
                if (row === 6 && col === 6) {
                    const center = document.createElement('div');
                    center.className = 'center-area';
                    center.id = 'finish-zone';
                    boardContainer.appendChild(center);
                }
                continue;
            }

            // Path defaults
            cell.className = 'cell path-cell';

            if (row === 7 && col >= 1 && col <= 5) cell.classList.add('path-red');
            if (col === 7 && row >= 1 && row <= 5) cell.classList.add('path-green');
            if (row === 7 && col >= 9 && col <= 13) cell.classList.add('path-yellow');
            if (col === 7 && row >= 9 && row <= 13) cell.classList.add('path-blue');

            if (row === 6 && col === 1) cell.classList.add('safe-spot', 'path-red');
            if (row === 1 && col === 8) cell.classList.add('safe-spot', 'path-green');
            if (row === 8 && col === 13) cell.classList.add('safe-spot', 'path-yellow');
            if (row === 13 && col === 6) cell.classList.add('safe-spot', 'path-blue');
            if (row === 2 && col === 6) cell.classList.add('safe-spot');
            if (row === 6 && col === 12) cell.classList.add('safe-spot');
            if (row === 12 && col === 8) cell.classList.add('safe-spot');
            if (row === 8 && col === 2) cell.classList.add('safe-spot');

            boardContainer.appendChild(cell);
        }
    }
    renderTokens();
}

function createHome(color, className, playerName) {
    const home = document.createElement('div');
    home.className = `home-area ${className}`;

    // Name Label
    const nameLabel = document.createElement('div');
    nameLabel.className = 'home-name';
    nameLabel.innerText = playerName || color.toUpperCase();
    home.appendChild(nameLabel);

    ['0', '1', '2', '3'].forEach((idx, i) => {
        const pocket = document.createElement('div');
        pocket.className = `token-pocket tp-${i}`; // Use CSS positions
        pocket.id = `${color}-home-${idx}`;
        home.appendChild(pocket);
    });

    // Add Dice to Home
    const diceDiv = document.createElement('div');
    diceDiv.className = `home-dice dice-${color}`;
    diceDiv.id = `dice-${color}`;
    diceDiv.onclick = () => rollDice(color);
    // Initial Text
    diceDiv.innerText = '🎲';
    home.appendChild(diceDiv);

    return home;
}

function renderTokens() {
    document.querySelectorAll('.token').forEach(t => t.remove());

    const players = ['red', 'green', 'yellow', 'blue']; // Check all potential tokens
    players.forEach(color => {
        // Only render if player is active or we want to show empty homes? 
        // Let's render all. inactive ones stay home.
        // But gameState.tokens only initialized for active players in startGame.
        // We should ensure we don't crash.
        if (!gameState.tokens[color]) return;

        const positions = gameState.tokens[color];
        positions.forEach((pos, idx) => {
            let targetContainer;
            if (pos === -1) {
                targetContainer = document.getElementById(`${color}-home-${idx}`);
            } else if (pos === 57) {
                targetContainer = document.getElementById('finish-zone');
            } else {
                const coords = getCoordinates(color, pos);
                if (coords) targetContainer = document.getElementById(`cell-${coords[0]}-${coords[1]}`);
            }

            if (targetContainer) {
                const token = document.createElement('div');
                token.className = `token ${color}`;
                token.setAttribute('data-index', idx);
                token.onclick = (e) => {
                    e.stopPropagation();
                    handleTokenClick(color, idx);
                };
                targetContainer.appendChild(token);

                // Stack handling for Center is different? Maybe just pile them.
                if (targetContainer.children.length > 1 && pos !== 57) {
                    const offset = (targetContainer.children.length - 1) * 5;
                    token.style.transform = `translate(${offset}px, ${offset}px)`;
                } else if (pos === 57 && targetContainer.children.length > 1) {
                    // Optional: slight scatter for finished tokens?
                    // Let's leave it stacked for now to ensure centering works.
                }
            }
        });
    });
}

function getCoordinates(color, steps) {
    // Returns [row, col] for a given step count for a specific color
    // "steps" = 0 to 51 (Main path) relative to color start?
    // Let's standardize: 
    // gameState stores abstract steps: 
    // 0 = Start Position (e.g. Red 6,1)
    // 50 = Last common cell
    // 51-56 = Home stretch
    // 57 = Finish

    // We need offsets.
    // Red Start Index in globalPath is 0.
    // Green Start Index in globalPath is 13 (5+6+2 = 13).
    // Yellow Start Index in globalPath is 26.
    // Blue Start Index in globalPath is 39.

    let offset = 0;
    if (color === 'green') offset = 13;
    if (color === 'yellow') offset = 26;
    if (color === 'blue') offset = 39;

    if (steps < 51) {
        let globalIndex = (steps + offset) % 52;
        return globalPath[globalIndex];
    } else {
        // Home Stretch Logic
        const stretchIndex = steps - 51; // 0 to 5
        // Red: (7, 1) -> (7, 5)
        if (color === 'red') return [7, 1 + stretchIndex];
        if (color === 'green') return [1 + stretchIndex, 7];
        if (color === 'yellow') return [7, 13 - stretchIndex];
        if (color === 'blue') return [13 - stretchIndex, 7];
    }
    return null;
}

function rollDice(clickedColor) {
    // Verify it's this player's turn
    const activeColor = gameState.players[gameState.currentPlayerIndex];
    if (clickedColor !== activeColor) return;

    if (gameState.awaitingMove || gameState.isAnimating) return;

    const val = Math.floor(Math.random() * 6) + 1;
    gameState.diceValue = val;

    // Triple 6 Rule Logic
    if (val === 6) {
        gameState.consecutiveSixes++;
        if (gameState.consecutiveSixes === 3) {
            // Animate 3rd val then skip
            const diceEl = document.getElementById(`dice-${activeColor}`);
            playSound('roll');
            diceEl.classList.add('rolling');

            setTimeout(() => {
                diceEl.classList.remove('rolling');
                diceEl.innerText = val;
                setTimeout(() => {
                    alert("Three consecutive 6s! Turn Skipped.");
                    gameState.consecutiveSixes = 0;
                    nextTurn();
                }, 500);
            }, 500);
            return;
        }
    } else {
        gameState.consecutiveSixes = 0;
    }

    // Animate Dice
    const diceEl = document.getElementById(`dice-${activeColor}`);

    // Play Sound
    playSound('roll');

    diceEl.classList.add('rolling');
    // Disable clicks during animation
    diceEl.style.pointerEvents = 'none';

    setTimeout(() => {
        diceEl.classList.remove('rolling');
        diceEl.innerText = val;

        // Logic: specific rules
        checkPossibleMoves();
    }, 500);
}

function checkPossibleMoves() {
    const color = gameState.players[gameState.currentPlayerIndex];
    const tokens = gameState.tokens[color];
    const val = gameState.diceValue;
    const diceEl = document.getElementById(`dice-${color}`);

    // Clear previous highlights
    document.querySelectorAll('.token').forEach(t => t.classList.remove('valid-move'));

    let canMove = false;

    tokens.forEach((pos, idx) => {
        let isMoveable = false;
        if (pos === -1 && val === 6) isMoveable = true;
        if (pos !== -1 && pos + val <= 57) isMoveable = true;

        if (isMoveable) {
            canMove = true;
            highlightToken(color, idx);
        }
    });

    if (!canMove) {
        if (val === 6) {
            console.log("Rolled 6 but no moves. Extra roll!");
            diceEl.style.pointerEvents = 'auto'; // Re-enable for same player
            gameState.awaitingMove = false;
        } else {
            setTimeout(nextTurn, 1000);
        }
    } else {
        gameState.awaitingMove = true;
    }
}

function highlightToken(color, idx) {
    const pos = gameState.tokens[color][idx];
    let container;
    if (pos === -1) {
        container = document.getElementById(`${color}-home-${idx}`);
    } else {
        const coords = getCoordinates(color, pos);
        if (coords) {
            container = document.getElementById(`cell-${coords[0]}-${coords[1]}`);
        }
    }
    if (container) {
        const token = container.querySelector(`.token.${color}[data-index='${idx}']`);
        if (token) token.classList.add('valid-move');
    }
}

function handleTokenClick(color, tokenIndex) {
    if (!gameState.awaitingMove || gameState.isAnimating) return;
    if (color !== gameState.players[gameState.currentPlayerIndex]) return;

    const currentPos = gameState.tokens[color][tokenIndex];
    const val = gameState.diceValue;

    if (currentPos === -1 && val !== 6) return;
    if (currentPos !== -1 && currentPos + val > 57) return;

    // Start Animation
    gameState.awaitingMove = false;
    gameState.isAnimating = true;

    // Clear highlights immediately
    document.querySelectorAll('.token').forEach(t => t.classList.remove('valid-move'));

    if (currentPos === -1) {
        // Moving out of home is instant or simple
        finalizeMove(color, tokenIndex, 0);
    } else {
        animateMovement(color, tokenIndex, currentPos, currentPos + val);
    }
}

async function animateMovement(color, tokenIndex, startPos, endPos) {
    // Find the specific token element
    // We assume renderTokens was last called, so DOM is fresh.
    // We need to find the token in the start cell with the right data-index.
    let currentStep = startPos;

    // We need to move step by step
    for (let step = 1; step <= (endPos - startPos); step++) {
        currentStep++;

        let targetCell;
        if (currentStep === 57) {
            targetCell = document.getElementById('finish-zone');
        } else {
            // Calculate next coord
            const coords = getCoordinates(color, currentStep);
            if (coords) { // Should not happen if logic is correct
                targetCell = document.getElementById(`cell-${coords[0]}-${coords[1]}`);
            }
        }

        if (targetCell) {
            // Locate the token. 
            // Note: It might have moved from previous step, so we look for it by data-index
            const token = document.querySelector(`.token.${color}[data-index='${tokenIndex}']`);
            if (token) {
                targetCell.appendChild(token); // Moves it physically
                playSound('roll'); // Reuse roll sound for step? sticky. Maybe 'move' sound later.
            }
        }

        await new Promise(r => setTimeout(r, 200)); // 200ms delay per step
    }

    finalizeMove(color, tokenIndex, endPos);
}



function isSafeSpot(row, col) {
    const safeSpots = [
        [6, 1], [1, 8], [8, 13], [13, 6],
        [2, 6], [6, 12], [12, 8], [8, 2]
    ];
    return safeSpots.some(spot => spot[0] === row && spot[1] === col);
}

function checkForKill(myColor, posStepIndex) {
    const myCoords = getCoordinates(myColor, posStepIndex);
    if (!myCoords) return false;

    if (isSafeSpot(myCoords[0], myCoords[1])) return false;

    let killed = false;

    gameState.players.forEach(pColor => {
        if (pColor === myColor) return;

        // Check active players only?
        if (!gameState.tokens[pColor]) return;

        gameState.tokens[pColor].forEach((pPos, pIdx) => {
            if (pPos !== -1 && pPos < 51) {
                const pCoords = getCoordinates(pColor, pPos);
                if (pCoords && pCoords[0] === myCoords[0] && pCoords[1] === myCoords[1]) {
                    console.log(`KiLl! ${myColor} killed ${pColor} `);
                    gameState.tokens[pColor][pIdx] = -1;
                    killed = true;
                    playSound('kill');
                }
            }
        });
    });

    return killed;
}

function nextTurn() {
    // Reset previous    // Update visuals
    const prevColor = gameState.players[(gameState.currentPlayerIndex - 1 + gameState.players.length) % gameState.players.length];
    if (document.getElementById(`dice-${prevColor}`)) {
        document.getElementById(`dice-${prevColor}`).innerText = '🎲';
    }

    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    updateUI();
}

function updateUI() {
    const color = gameState.players[gameState.currentPlayerIndex];
    const name = gameState.playerNames[color] || color.toUpperCase();
    const msg = document.getElementById('status-message');
    if (msg) msg.innerText = `${name}'s Turn`;

    // Highlight Active Dice
    document.querySelectorAll('.home-dice').forEach(d => {
        d.classList.remove('active-dice');
        d.style.pointerEvents = 'none';
        d.style.opacity = '0.5';
    });

    const activeDice = document.getElementById(`dice-${color}`);
    if (activeDice) {
        activeDice.classList.add('active-dice');
        activeDice.style.pointerEvents = 'auto'; // Enable
        activeDice.style.opacity = '1';
    }

    const soundBtn = document.getElementById('sound-btn');
    if (soundBtn) {
        soundBtn.innerText = gameState.isMuted ? '🔇' : '🔊';
    }
}

function restartMatch() {
    if (!confirm('Are you sure you want to restart? Current progress will be lost.')) return;

    // Reset State but keep players
    gameState.tokens = {
        red: [-1, -1, -1, -1],
        green: [-1, -1, -1, -1],
        yellow: [-1, -1, -1, -1],
        blue: [-1, -1, -1, -1]
    };
    gameState.currentPlayerIndex = 0;
    gameState.diceValue = null;
    gameState.awaitingMove = false;

    // Reset UI
    renderBoard(); // Will re-render tokens at home
    updateUI();
}

function exitGame() {
    if (!confirm('Are you sure you want to exit to Main Menu?')) return;
    location.reload();
}

