const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ensure the canvas is properly initialized
if (!canvas || !ctx) {
    console.error('Canvas or context not found. Ensure the HTML file has a canvas element with id "gameCanvas".');
}

// Set canvas dimensions
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Circle properties
const circle = {
    x: canvas.width / 2,
    y: canvas.height - 10,
    radius: 20,
    color: 'blue',
    speed: 4 // Increased the speed of the circle
};

// Key state tracking
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

// Event listeners for key presses
window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

const moveLeftButton = document.getElementById('moveLeft');
const moveRightButton = document.getElementById('moveRight');
let moveLeftHeld = false;
let moveRightHeld = false;

// Event listeners for button presses (support mobile touch events)
moveLeftButton.addEventListener('mousedown', () => moveLeftHeld = true);
moveLeftButton.addEventListener('mouseup', () => moveLeftHeld = false);
moveLeftButton.addEventListener('mouseleave', () => moveLeftHeld = false);
moveLeftButton.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent default touch behavior
    moveLeftHeld = true;
});
moveLeftButton.addEventListener('touchend', () => moveLeftHeld = false);

moveRightButton.addEventListener('mousedown', () => moveRightHeld = true);
moveRightButton.addEventListener('mouseup', () => moveRightHeld = false);
moveRightButton.addEventListener('mouseleave', () => moveRightHeld = false);
moveRightButton.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent default touch behavior
    moveRightHeld = true;
});
moveRightButton.addEventListener('touchend', () => moveRightHeld = false);

let gameRunning = false;
let score = 0;

let grassBlades = [];
let level = 1;

let lastCircleX = circle.x; // Track the circle's x position before it moves

let clouds = [
    { x: 50, y: 250, width: 100, height: 50 },
    { x: 300, y: 330, width: 120, height: 60 },
    { x: 600, y: 250, width: 90, height: 45 },
    { x: 200, y: 350, width: 110, height: 55 },
    { x: 400, y: 200, width: 130, height: 65 },
    { x: 700, y: 250, width: 140, height: 70 },
    { x: 100, y: 300, width: 80, height: 40 },
    { x: 500, y: 350, width: 150, height: 75 }
];

clouds.forEach(cloud => {
    cloud.y = Math.random() * 100; // Position clouds within the top 100 pixels of the canvas
});

clouds = clouds.concat(
    Array.from({ length: 20 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * 25, // Position within the top 100 pixels
        width: Math.random() * 100 + 50, // Random width between 50 and 150
        height: Math.random() * 30 + 20 // Random height between 20 and 50
    }))
);

let showRainbow = false;
let rainbowTimer = 0;
let rainbowOpacity = 0; // Track the opacity of the rainbow
let circleRotation = 0; // Track the rotation of the circle

let bladeHeightMultiplier = 2; // Initial multiplier for blade height
let lives = 3; // Track the number of lives

let birds = [
    { x: canvas.width / 2, y: canvas.height / 2, targetX: canvas.width / 2, targetY: canvas.height / 2 + 100, speed: 2, color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}` }
];

let wingFlapAngle = 0;
let wingFlapDirection = 1; // 1 for down, -1 for up

let borderFlashTimer = 0; // Timer to control the red border flash
let gameOver = false; // Track if the game is over

let shakeDuration = 0; // Duration of the shake effect
let shakeIntensity = 5; // Intensity of the shake effect

const birdSound = new Audio('bird.mp3'); // Load the bird sound file

const dropSound = new Audio('drop.mp3'); // Load the drop sound file

// Preload and unlock audio on user interaction
function unlockAudio(audioElement) {
    const unlock = () => {
        audioElement.play().then(() => {
            audioElement.pause();
            audioElement.currentTime = 0; // Reset the audio to the beginning
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
        }).catch(error => console.error('Error unlocking audio:', error));
    };

    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
}

// Unlock audio for drop and bird sounds
unlockAudio(dropSound);
unlockAudio(birdSound);

// Ensure the audio file is fully loaded before playing
dropSound.addEventListener('loadedmetadata', () => {
    console.log('Drop sound loaded. Duration:', dropSound.duration);
});

birdSound.addEventListener('loadedmetadata', () => {
    console.log('Bird sound loaded. Duration:', birdSound.duration);
});

function playRandomBirdSound() {
    if (!isFinite(birdSound.duration) || birdSound.duration <= 0.25) {
        console.error('Bird sound duration is not valid or too short.');
        return;
    }
    const randomStartTime = Math.random() * (birdSound.duration - 0.25); // Random start time, leaving 0.25 seconds buffer
    birdSound.currentTime = randomStartTime;
    birdSound.play().catch(error => console.error('Error playing bird sound:', error));

    // Stop the sound after 0.25 seconds
    setTimeout(() => {
        birdSound.pause();
        birdSound.currentTime = 0; // Reset the audio to the beginning
    }, 250);
}

function playRandomDropSound() {
    if (!isFinite(dropSound.duration) || dropSound.duration <= 0.25) {
        console.error('Drop sound duration is not valid or too short.');
        return;
    }
    const potentialStartTimes = [.5, 1.5, 2.7]; // Potential start times for the drop sound
    dropSound.currentTime = potentialStartTimes[Math.floor(Math.random() * potentialStartTimes.length)];
    dropSound.play().catch(error => console.error('Error playing drop sound:', error));

    // Stop the sound after 0.25 seconds
    setTimeout(() => {
        dropSound.pause();
        dropSound.currentTime = 0; // Reset the audio to the beginning
    }, 250);
}

function startGame() {
    if (!canvas || !ctx) return; // Ensure canvas and context are valid
    gameRunning = true;
    gameLoop();
}

function gameLoop() {
    if (!gameRunning) return;

    updateGameState();
    render();

    requestAnimationFrame(gameLoop);
}

// Removed the ability to move the circle up or down
function updateGameState() {
    // Move the circle horizontally based on key presses
    if (keys.ArrowLeft || moveLeftHeld) {
        circle.x -= circle.speed;
        circleRotation = Math.min(circleRotation + 0.1, Math.PI / 4); // Rotate clockwise, max 45 degrees
    }
    if (keys.ArrowRight || moveRightHeld) {
        circle.x += circle.speed;
        circleRotation = Math.max(circleRotation - 0.1, -Math.PI / 4); // Rotate counterclockwise, max -45 degrees
    }

    // Gradually rotate back to the original state if no input
    if (!keys.ArrowLeft && !keys.ArrowRight && !moveLeftHeld && !moveRightHeld) {
        if (circleRotation > 0) {
            circleRotation = Math.max(circleRotation - 0.05, 0); // Rotate back counterclockwise
        } else if (circleRotation < 0) {
            circleRotation = Math.min(circleRotation + 0.05, 0); // Rotate back clockwise
        }
    }

    // Automatically move the circle downward
    circle.y += circle.speed;

    // Prevent the circle from going out of bounds horizontally
    circle.x = Math.max(circle.radius, Math.min(canvas.width - circle.radius, circle.x));

    // Check if the circle touches the bottom of the canvas
    if (circle.y + circle.radius >= canvas.height) {
        playRandomDropSound(); // Play a random section of the drop sound
        score++; // Increment the score

        // Teleport the circle to a random spot at the top
        circle.x = Math.random() * (canvas.width - 2 * circle.radius) + circle.radius;
        circle.y = circle.radius;

        // Determine the height of the new blade of grass
        const lastBladeHeight = grassBlades.length > 0 ? grassBlades[grassBlades.length - 1].height : 10;
        const newBladeHeight = lastBladeHeight * bladeHeightMultiplier;

        // Add a new blade of grass at the circle's last x position with initial height 0
        grassBlades.push({
            x: lastCircleX - circle.radius, // Use the tracked x position
            height: 0, // Start with height 0 for animation
            targetHeight: newBladeHeight // Store the target height
        });
    }

    // Update the lastCircleX position
    lastCircleX = circle.x;

    // Check if any blade of grass reaches the top
    if (grassBlades.some(blade => blade.height >= canvas.height)) {
        grassBlades = []; // Remove all blades of grass
        level++; // Increase the level

        // Increase the lives by one
        lives++;

        // Add a new bird with a random color
        const randomHexColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
        birds.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            targetX: Math.random() * canvas.width,
            targetY: canvas.height / 2 + Math.random() * (canvas.height / 2),
            speed: 2,
            color: randomHexColor
        });

        // Decrease the blade height multiplier incrementally
        bladeHeightMultiplier = Math.max(1, bladeHeightMultiplier - 0.1); // Ensure it doesn't go below 1

        // Increase the speed of the circle after each level
        circle.speed += 0.25;

        // Reset the circle to the top of the canvas
        circle.x = Math.random() * (canvas.width - 2 * circle.radius) + circle.radius;
        circle.y = circle.radius;

        // Show the rainbow briefly
        showRainbow = true;
        rainbowTimer = 300; // Show the rainbow for 300 frames
        rainbowOpacity = 0; // Start with 0 opacity
    }

    // Decrease the rainbow timer and adjust opacity
    if (rainbowTimer > 0) {
        rainbowTimer--;
        if (rainbowTimer <= 150) {
            rainbowOpacity -= 0.02; // Fade out
        } else {
            rainbowOpacity += 0.02; // Fade in
        }
        rainbowOpacity = Math.max(0, Math.min(1, rainbowOpacity)); // Clamp opacity between 0 and 1

        if (rainbowTimer === 0) {
            showRainbow = false;
        }
    }

    // Animate grass growth
    grassBlades.forEach(blade => {
        if (blade.height < blade.targetHeight) {
            blade.height += 10; // Increased grass growth speed
        }
    });

    // Move clouds horizontally
    clouds.forEach(cloud => {
        cloud.x += 0.5; // Increased cloud movement speed
        if (cloud.x > canvas.width) {
            cloud.x = -cloud.width; // Reset cloud position when it goes off-screen
            cloud.width = Math.random() * 100 + 50; // Assign a random width between 50 and 150
        }
    });

    // Move each bird towards its target position
    birds.forEach(bird => {
        const dx = bird.targetX - bird.x;
        const dy = bird.targetY - bird.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) { // Ensure a minimum distance threshold to avoid flipping
            bird.x += (dx / distance) * bird.speed * 1.5; // Increased bird movement speed
            bird.y += (dy / distance) * bird.speed * 1.5;
        } else {
            // Assign a new target position far enough from the current position
            bird.targetX = Math.random() * canvas.width;
            bird.targetY = canvas.height / 2 + Math.random() * (canvas.height / 2);
        }
    });

    // Update wing flap angle at a constant lower speed
    wingFlapAngle += wingFlapDirection * 0.05; // Reduced wing flap speed
    if (wingFlapAngle > Math.PI / 6 || wingFlapAngle < -Math.PI / 6) {
        wingFlapDirection *= -1; // Reverse flap direction
    }

    // Check for collisions between the circle and birds
    birds.forEach(bird => {
        const dx = bird.x - circle.x;
        const dy = bird.y - circle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < circle.radius + 20) { // 20 is the bird's radius
            lives--; // Decrease a life
            borderFlashTimer = 30; // Set the border flash timer
            shakeDuration = 15; // Trigger the shake effect for 15 frames
            playRandomBirdSound(); // Play a random segment of the bird sound
            if (lives <= 0) {
                gameRunning = false; // Stop the game loop
                gameOver = true; // Set game over state
            }

            // Reset the circle to the top of the canvas
            circle.x = Math.random() * (canvas.width - 2 * circle.radius) + circle.radius;
            circle.y = circle.radius;
        }
    });
}

// Compass control for mobile devices
if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (event) => {
        const compassDirection = event.alpha; // Alpha represents the compass direction (0-360 degrees)

        if (compassDirection !== null) {
            if (compassDirection < 180) { // Facing right
                circle.x -= circle.speed;
                circleRotation = Math.min(circleRotation + 0.1, Math.PI / 4); // Rotate clockwise
            } else if (compassDirection > 180) { // Facing left
                circle.x += circle.speed;
                circleRotation = Math.max(circleRotation - 0.1, -Math.PI / 4); // Rotate counterclockwise
            }
        }
    });

    // Request permission for iOS devices
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    console.log('Compass access granted.');
                } else {
                    console.warn('Compass access denied.');
                }
            })
            .catch(error => {
                console.error('Error requesting compass access:', error);
                alert('An error occurred while requesting compass access. Please check your browser settings.');
            });
    }
}

let retryButtonListenerAdded = false; // Track if the retry button listener has been added

function render() {
    // Apply the shake effect
    applyShakeEffect();

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the ground
    ctx.fillStyle = 'green';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20); // Green rectangle at the bottom

    // Draw the circle as a raindrop shape with rotation
    ctx.save(); // Save the current canvas state
    ctx.translate(circle.x, circle.y); // Move the canvas origin to the circle's position
    ctx.rotate(circleRotation); // Apply the rotation
    ctx.beginPath();
    ctx.moveTo(0, -circle.radius * 1.5); // Top point of the raindrop
    ctx.bezierCurveTo(
        -circle.radius, -circle.radius * 0.5, // Left control point
        -circle.radius, circle.radius,     // Left bottom curve
        0, circle.radius                   // Bottom center
    );
    ctx.bezierCurveTo(
        circle.radius, circle.radius,     // Right bottom curve
        circle.radius, -circle.radius * 0.5, // Right control point
        0, -circle.radius * 1.5           // Back to top point
    );
    ctx.fillStyle = circle.color;
    ctx.fill();
    ctx.closePath();
    ctx.restore(); // Restore the canvas state

    // Draw grass blades
    grassBlades.forEach(blade => {
        ctx.fillStyle = 'green';
        ctx.fillRect(blade.x, canvas.height - blade.height - 20, 10, blade.height); // Adjusted for ground height
    });

    // Draw clouds
    ctx.fillStyle = 'white';
    clouds.forEach(cloud => {
        ctx.fillRect(cloud.x, cloud.y, cloud.width, cloud.height);
    });

    // Draw the rainbow if active
    if (showRainbow) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height - 20; // Move the rainbow to the bottom of the canvas
        const radius = 200;
        const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];

        colors.forEach((color, index) => {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius - index * 10, Math.PI, 0, false); // Flip the rainbow
            ctx.lineWidth = 10;
            ctx.strokeStyle = color;
            ctx.globalAlpha = rainbowOpacity; // Set opacity for fading effect
            ctx.stroke();
        });
        ctx.globalAlpha = 1; // Reset opacity to default
    }

    // Draw lives as larger blue tear drop icons at the top right
    for (let i = 0; i < lives; i++) {
        const x = canvas.width - (i + 1) * 50; // Adjusted spacing for larger icons
        const y = 30; // Adjusted vertical position
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.moveTo(0, -15); // Top point of the raindrop
        ctx.bezierCurveTo(
            -15, -7.5, // Left control point
            -15, 15,   // Left bottom curve
            0, 15      // Bottom center
        );
        ctx.bezierCurveTo(
            15, 15,    // Right bottom curve
            15, -7.5,  // Right control point
            0, -15     // Back to top point
        );
        ctx.fillStyle = 'blue';
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    }

    // Draw all birds
    birds.forEach(bird => {
        ctx.save();
        ctx.translate(bird.x, bird.y);

        // Flip the bird if it is moving rightward
        if (bird.targetX > bird.x) {
            ctx.scale(-1, 1);
        }

        // Draw the body (circle)
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fillStyle = bird.color;
        ctx.fill();
        ctx.closePath();

        // Draw the beak (triangle)
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-20, -5);
        ctx.lineTo(-20, 5);
        ctx.closePath();
        ctx.fillStyle = 'orange';
        ctx.fill();

        // Draw the eye (small circle)
        ctx.beginPath();
        ctx.arc(-5, -5, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.closePath();

        // Draw the wing (flapping)
        ctx.beginPath();
        ctx.ellipse(10, 10, 15, 10, wingFlapAngle, 0, Math.PI * 2);
        ctx.fillStyle = shadeColor(bird.color, -20); // Use a darker shade of the bird's body color
        ctx.fill();
        ctx.closePath();

        ctx.restore();
    });

    // Handle canvas border flash
    if (borderFlashTimer > 0) {
        borderFlashTimer--;
        canvas.style.borderColor = 'red'; // Set canvas border to red
        document.querySelectorAll('#controls button').forEach(button => {
            button.style.borderColor = 'red'; // Set button borders to red
        });
    } else {
        canvas.style.borderColor = 'white'; // Reset canvas border to white
        document.querySelectorAll('#controls button').forEach(button => {
            button.style.borderColor = 'white'; // Reset button borders to white
        });
    }

    // Draw the level counter within the canvas
    ctx.fillStyle = 'blue'; // Change color to blue
    ctx.font = '32px Arial'; // Increase font size
    ctx.textAlign = 'left';
    ctx.fillText(`Level: ${level}`, 10, 40); // Adjusted position for larger font

    // Render game over screen if the game is over
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Semi-transparent black background
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'white';
        ctx.font = '64px Arial'; // Font size for "Game Over"
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 40);

        ctx.font = '32px Arial'; // Font size for final score
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

        // Add retry button logic
        if (!retryButtonListenerAdded) {
            canvas.addEventListener('click', handleRetryClick);
            retryButtonListenerAdded = true;
        }
    }
}

function handleRetryClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if the click is within the retry button area
    if (
        x >= canvas.width / 2 - 75 &&
        x <= canvas.width / 2 + 75 &&
        y >= canvas.height / 2 + 40 &&
        y <= canvas.height / 2 + 90
    ) {
        canvas.removeEventListener('click', handleRetryClick); // Remove the event listener
        location.reload(); // Reload the page to restart the game
    }
}

// Helper function to darken a color
function shadeColor(color, percent) {
    const num = parseInt(color.slice(1), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        G = (num >> 8 & 0x00FF) + amt,
        B = (num & 0x0000FF) + amt;
    return `#${(0x1000000 + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 + (B < 255 ? (B < 1 ? 0 : B) : 255)).toString(16).slice(1)}`;
}

function applyShakeEffect() {
    if (shakeDuration > 0) {
        const offsetX = (Math.random() * 2 - 1) * shakeIntensity;
        const offsetY = (Math.random() * 2 - 1) * shakeIntensity;
        canvas.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        shakeDuration--;
    } else {
        canvas.style.transform = ''; // Reset the canvas position
    }
}

startGame();