import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

class Monster {
    constructor(x, y, z, type, scene) {
        this.type = type;
        this.correctAnswers = 0;
        this.incorrectAnswers = 0;
        this.position = new THREE.Vector3(x, y, z);
        this.blocks = [];
        this.scene = scene;
        this.createMonster();
    }

    createMonster() {
        // Create monster root group to handle overall rotation
        this.monsterGroup = new THREE.Group();
        this.monsterGroup.position.copy(this.position);
        this.scene.add(this.monsterGroup);

        // Create monster body
        const bodyColor = this.type === 'easy' ? 0xff0000 : 0x800000;
        const bodyGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: bodyColor,
            roughness: 0.7,
            metalness: 0.3,
            emissive: bodyColor,
            emissiveIntensity: 0.2
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.monsterGroup.add(this.body);
        this.blocks.push(this.body);

        // Create monster head as a group
        this.head = new THREE.Group();
        this.head.position.y = 1.5; // Position relative to body
        this.monsterGroup.add(this.head);
        
        // Head block
        const headGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        const headMesh = new THREE.Mesh(headGeometry, bodyMaterial);
        this.head.add(headMesh);

        // Create eyes
        const eyeGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.3); // Swapped dimensions to face forward
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 2.0,
            metalness: 0.3,
            roughness: 0.4
        });

        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.4, 0.2, 0.6);
        this.head.add(leftEye);

        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.4, 0.2, 0.6);
        this.head.add(rightEye);

        this.blocks.push(this.head);

        // Store initial orientation
        this.currentRotation = 0;
        this.targetRotation = 0;
    }

    updateFaceOrientation(playerPosition) {
        if (!this.monsterGroup) return;

        // Calculate direction to player
        const directionToPlayer = new THREE.Vector3()
            .subVectors(playerPosition, this.monsterGroup.position)
            .normalize();

        // Calculate target rotation
        this.targetRotation = Math.atan2(
            directionToPlayer.x,
            directionToPlayer.z
        );

        // Smoothly interpolate current rotation to target rotation
        const rotationDiff = this.targetRotation - this.currentRotation;
        
        // Handle rotation wrap-around
        if (rotationDiff > Math.PI) {
            this.currentRotation += Math.PI * 2;
        } else if (rotationDiff < -Math.PI) {
            this.currentRotation -= Math.PI * 2;
        }
        
        this.currentRotation += (this.targetRotation - this.currentRotation) * 0.1;
        this.monsterGroup.rotation.y = this.currentRotation;
    }

    remove() {
        if (this.monsterGroup) {
            this.scene.remove(this.monsterGroup);
        }
        this.blocks = [];
    }
}

class Game {
    constructor() {
        try {
            // Scene setup
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            
            // Initialize particles array first
            this.particles = [];
            
            // Setup background music
            this.setupBackgroundMusic();
            
            // Initialize questions and answers
            this.questions = [
                { question: "What is 8 + 5?", answer: 13 },
                { question: "If you have 12 apples and give 4 to your friend, how many apples do you have left?", answer: 8 },
                { question: "Lily has 15 marbles. She finds 7 more. How many marbles does she have now?", answer: 22 },
                { question: "What is 20 - 9?", answer: 11 },
                { question: "John has 18 pencils. He loses 5 of them. How many does he have left?", answer: 13 },
                { question: "What is 6 + 6 + 6?", answer: 18 },
                { question: "A bird lays 4 eggs in one nest and 3 eggs in another. How many eggs are there in total?", answer: 7 },
                { question: "If you have 25 cookies and eat 10, how many cookies are left?", answer: 15 },
                { question: "What is 3 x 4?", answer: 12 },
                { question: "A spider has 8 legs. How many legs do 3 spiders have in total?", answer: 24 },
                { question: "There are 5 baskets, and each basket has 2 apples. How many apples are there altogether?", answer: 10 },
                { question: "Divide 12 apples equally among 4 friends. How many apples does each friend get?", answer: 3 },
                { question: "Emma is planting flowers. She plants 3 rows with 5 flowers in each row. How many flowers did she plant?", answer: 15 },
                { question: "A train has 7 carriages, and each carriage holds 10 people. How many people can the train carry?", answer: 70 },
                { question: "There are 4 kids at a party. If each kid gets 2 balloons, how many balloons are there in total?", answer: 8 },
                { question: "A farmer has 9 cows and buys 5 more. How many cows does the farmer have now?", answer: 14 },
                { question: "What number comes next in the pattern: 2, 4, 6, 8, ...?", answer: 10 },
                { question: "What number is missing in this pattern: 5, 10, __, 20, 25?", answer: 15 },
                { question: "If a robot blinks 3 times, then 5 times, then 7 times, how many times will it blink next?", answer: 9 },
                { question: "What number comes next in the pattern: 1, 4, 7, 10, __?", answer: 13 }
            ];
            this.currentQuestionIndex = 0;
            
            // Renderer setup
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setClearColor(0x87CEEB); // Sky blue background
            document.body.appendChild(this.renderer.domElement);

            // Initialize arrays and points
            this.pathPoints = [];
            this.spawnPoints = [];
            this.monsters = [];

            // World parameters
            this.blockSize = 1;
            this.worldSize = 40;
            this.worldHeight = 10;
            this.moveSpeed = 0.1;
            this.jumpVelocity = 0;
            this.gravity = 0.002;
            this.jumpForce = 0.15;
            this.pathWidth = 4;
            this.pathColor = 0x8B4513;

            // Create world and path
            this.createWorld();

            // Verify path was created
            if (!this.pathPoints.length) {
                throw new Error('Path creation failed - no path points generated');
            }

            // Player setup - position on the first path point and orient along path
            this.playerHeight = 1.8;
            const startPoint = this.pathPoints[0];
            const nextPoint = this.pathPoints[1];
            
            // Set player position at start of path
            this.camera.position.set(startPoint.x, this.playerHeight, startPoint.z);
            
            // Calculate initial direction vector
            const direction = new THREE.Vector3()
                .subVectors(nextPoint, startPoint)
                .normalize();
            
            // Create controls after setting camera position
            this.controls = new PointerLockControls(this.camera, document.body);
            
            // Set initial rotation to face along path
            const angle = Math.atan2(direction.x, direction.z) + Math.PI; // Added Math.PI to rotate 180 degrees
            this.controls.getObject().rotation.y = angle;
            
            // Player state
            this.moveForward = false;
            this.moveBackward = false;
            this.moveLeft = false;
            this.moveRight = false;
            this.canJump = false;
            this.velocity = new THREE.Vector3();
            this.direction = new THREE.Vector3();

            // Setup controls and event listeners
            this.setupControls();

            // Monster system setup
            this.currentPathIndex = 0;
            this.lastMonsterSpawn = 0;
            this.monsterSpawnInterval = 5000;
            this.playerHealth = 8;
            this.currentMonster = null;
            this.isInCombat = false;

            // Handle window resize
            window.addEventListener('resize', () => this.onWindowResize(), false);

            // Start animation loop
            this.animate();

            // Add instructions overlay
            this.createInstructionsOverlay();

            // Add UI overlay container
            this.createUIOverlay();

            console.log('Game initialized successfully');
            console.log('Path points created:', this.pathPoints.length);
            console.log('Starting position:', startPoint);

        } catch (error) {
            console.error('Error initializing game:', error);
            alert('Error initializing game. Please check the console for details.');
            throw error; // Re-throw to prevent partial initialization
        }
    }

    setupBackgroundMusic() {
        // Create audio element with local file
        const audio = new Audio('/audio/background-music.mp3');
        audio.loop = true;
        audio.volume = 0.2; // Initial volume at 20%

        // Create volume control container
        const volumeControl = document.createElement('div');
        volumeControl.style.position = 'fixed';
        volumeControl.style.top = '20px';
        volumeControl.style.right = '20px';
        volumeControl.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        volumeControl.style.padding = '15px';
        volumeControl.style.borderRadius = '10px';
        volumeControl.style.zIndex = '1000';
        volumeControl.style.display = 'flex';
        volumeControl.style.alignItems = 'center';
        volumeControl.style.gap = '15px';
        volumeControl.style.border = '2px solid #ffffff33';

        // Create play button
        const playButton = document.createElement('button');
        playButton.textContent = '⏸️';  // Start with pause icon since music autoplays
        playButton.style.backgroundColor = 'transparent';
        playButton.style.border = 'none';
        playButton.style.color = 'white';
        playButton.style.fontSize = '24px';
        playButton.style.cursor = 'pointer';
        playButton.style.padding = '5px';
        
        // Create mute button
        const muteButton = document.createElement('button');
        muteButton.textContent = '🔊';
        muteButton.style.backgroundColor = 'transparent';
        muteButton.style.border = 'none';
        muteButton.style.color = 'white';
        muteButton.style.fontSize = '24px';
        muteButton.style.cursor = 'pointer';
        muteButton.style.padding = '5px';

        // Create volume slider
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '100';
        slider.value = '20';
        slider.style.width = '100px';
        slider.style.accentColor = '#ffffff';

        let isPlaying = true;  // Start as true since we're autoplaying

        // Play button click handler
        playButton.onclick = () => {
            if (isPlaying) {
                audio.pause();
                playButton.textContent = '▶️';
                isPlaying = false;
            } else {
                audio.play().catch(console.error);
                playButton.textContent = '⏸️';
                isPlaying = true;
            }
        };

        // Volume control
        slider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            audio.volume = volume;
            muteButton.textContent = volume === 0 ? '🔇' : '🔊';
        });

        // Mute button handler
        muteButton.addEventListener('click', () => {
            if (audio.volume > 0) {
                audio.volume = 0;
                slider.value = '0';
                muteButton.textContent = '🔇';
            } else {
                audio.volume = 0.2;
                slider.value = '20';
                muteButton.textContent = '🔊';
            }
        });

        // Add elements to container
        volumeControl.appendChild(playButton);
        volumeControl.appendChild(muteButton);
        volumeControl.appendChild(slider);
        document.body.appendChild(volumeControl);

        // Try to autostart audio as soon as possible
        const startAudio = () => {
            audio.play().catch(console.error);
        };

        // Try multiple ways to start audio
        document.addEventListener('click', startAudio, { once: true });
        document.addEventListener('touchstart', startAudio, { once: true });
        document.addEventListener('keydown', startAudio, { once: true });
        window.addEventListener('load', startAudio, { once: true });

        // Store audio element for later use (like game over)
        this.backgroundMusic = audio;

        // Also try to start immediately
        startAudio();
    }

    createInstructionsOverlay() {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '50%';
        overlay.style.left = '50%';
        overlay.style.transform = 'translate(-50%, -50%)';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.color = 'white';
        overlay.style.padding = '20px';
        overlay.style.borderRadius = '10px';
        overlay.style.textAlign = 'center';
        overlay.style.zIndex = '1000';
        overlay.innerHTML = `
            <h2>Math Monsters</h2>
            <p>Click to start</p>
            <p>WASD or Arrow keys to move</p>
            <p>Space to jump</p>
            <p>Follow the brown path and defeat the monsters!</p>
            <p style="font-size: 14px; color: #aaa;">Music controls in top-right corner</p>
        `;
        document.body.appendChild(overlay);

        // Remove overlay when game starts
        document.addEventListener('click', () => {
            overlay.style.display = 'none';
        }, { once: true });
    }

    setupControls() {
        // Click to start
        document.addEventListener('click', () => {
            this.controls.lock();
        });

        // Movement controls
        document.addEventListener('keydown', (event) => {
            if (!this.controls.isLocked) return; // Only process input when controls are locked
            
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = true;
                    break;
                case 'Space':
                    if (this.canJump) {
                        this.jumpVelocity = this.jumpForce;
                        this.canJump = false;
                    }
                    break;
                case 'KeyE':
                    if (this.isInCombat) {
                        this.showMathProblem();
                    }
                    break;
            }
        });

        document.addEventListener('keyup', (event) => {
            if (!this.controls.isLocked) return; // Only process input when controls are locked
            
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = false;
                    break;
            }
        });

        // Add pointer lock change event listener
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === document.body) {
                console.log('Controls locked');
            } else {
                console.log('Controls unlocked');
                // Reset movement flags when controls are unlocked
                this.moveForward = false;
                this.moveBackward = false;
                this.moveLeft = false;
                this.moveRight = false;
            }
        });
    }

    createWorld() {
        // Create ground with slight variation
        this.createTerrain();

        // Create path
        this.createPath();

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);

        // Add fog for depth
        this.scene.fog = new THREE.Fog(0x87CEEB, 20, 40);

        // Generate vegetation (but avoid the path)
        this.generateVegetation();
    }

    createTerrain() {
        // Create base ground
        const groundGeometry = new THREE.BoxGeometry(this.worldSize, 1, this.worldSize);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2d5a27, // Dark green for rainforest floor
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.position.set(0, -0.5, 0);
        this.scene.add(ground);

        // Add some terrain variation
        for (let x = -this.worldSize/2; x < this.worldSize/2; x += 2) {
            for (let z = -this.worldSize/2; z < this.worldSize/2; z += 2) {
                const height = Math.random() * 2;
                if (height > 0.5) {
                    this.createBlock(x, height - 0.5, z, 0x3a6a34); // Slightly lighter green for terrain
                }
            }
        }
    }

    createPath() {
        try {
            // Create a winding path through the world
            const pathLength = 30;
            let x = -this.worldSize/2 + 5; // Start a bit inward from the edge
            let z = 0;
            let angle = 0;

            // Clear existing path points
            this.pathPoints = [];

            // Create only the main path blocks
            for (let i = 0; i < pathLength; i++) {
                // Add path point
                const pathPoint = new THREE.Vector3(x, 0, z);
                this.pathPoints.push(pathPoint);

                // Create only the main path block
                this.createPathBlock(x, 0, z);

                // Randomly change direction less frequently
                if (Math.random() < 0.15) { // 15% chance to change direction
                    angle += (Math.random() - 0.5) * Math.PI/4; // Smaller angle changes
                }

                // Move to next point with larger steps
                x += Math.cos(angle) * 3;
                z += Math.sin(angle) * 3;

                // Add spawn points every 5 units
                if (i % 5 === 0) {
                    this.spawnPoints.push(new THREE.Vector3(x, 0, z));
                }
            }

            if (this.pathPoints.length === 0) {
                throw new Error('No path points were created');
            }

        } catch (error) {
            console.error('Error creating path:', error);
            throw error;
        }
    }

    createPathBlock(x, y, z) {
        const geometry = new THREE.BoxGeometry(this.pathWidth, 0.5, 3); // Made path blocks longer
        const material = new THREE.MeshStandardMaterial({ 
            color: this.pathColor,
            roughness: 0.5,
            metalness: 0.3,
            emissive: 0x4a2f10,
            emissiveIntensity: 0.4 // Increased glow
        });
        const block = new THREE.Mesh(geometry, material);
        block.position.set(x, y, z);
        this.scene.add(block);
        return block;
    }

    generateVegetation() {
        // Generate trees (avoiding the path)
        for (let i = 0; i < 20; i++) {
            const x = (Math.random() - 0.5) * this.worldSize;
            const z = (Math.random() - 0.5) * this.worldSize;
            
            // Check if position is near path
            if (!this.isNearPath(x, z)) {
                this.createTree(x, 0, z);
            }
        }

        // Generate bushes (avoiding the path)
        for (let i = 0; i < 30; i++) {
            const x = (Math.random() - 0.5) * this.worldSize;
            const z = (Math.random() - 0.5) * this.worldSize;
            
            // Check if position is near path
            if (!this.isNearPath(x, z)) {
                this.createBush(x, 0, z);
            }
        }
    }

    isNearPath(x, z) {
        for (let point of this.pathPoints) {
            const distance = Math.sqrt(
                Math.pow(x - point.x, 2) + 
                Math.pow(z - point.z, 2)
            );
            if (distance < this.pathWidth) {
                return true;
            }
        }
        return false;
    }

    createTree(x, y, z) {
        // Tree trunk
        const trunkHeight = 4 + Math.random() * 2;
        for (let i = 0; i < trunkHeight; i++) {
            this.createBlock(x, y + i, z, 0x4a2f10); // Brown trunk
        }

        // Tree leaves (simple pyramid shape)
        const leafColor = 0x2d5a27; // Dark green for leaves
        for (let i = 0; i < 3; i++) {
            const size = 3 - i;
            for (let dx = -size; dx <= size; dx++) {
                for (let dz = -size; dz <= size; dz++) {
                    if (Math.abs(dx) + Math.abs(dz) <= size) {
                        this.createBlock(x + dx, y + trunkHeight + i, z + dz, leafColor);
                    }
                }
            }
        }
    }

    createBush(x, y, z) {
        const bushColor = 0x3a6a34; // Medium green for bushes
        const size = 1 + Math.random();
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                if (Math.abs(dx) + Math.abs(dz) <= size) {
                    this.createBlock(x + dx, y, z + dz, bushColor);
                }
            }
        }
    }

    createBlock(x, y, z, color) {
        const geometry = new THREE.BoxGeometry(this.blockSize, this.blockSize, this.blockSize);
        const material = new THREE.MeshStandardMaterial({ 
            color: color,
            roughness: 0.7,
            metalness: 0.3
        });
        const block = new THREE.Mesh(geometry, material);
        block.position.set(x, y, z);
        this.scene.add(block);
        return block;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updatePlayer() {
        // Don't update player movement if math problem is showing
        if (this.controls.isLocked && this.mathOverlay.style.display !== 'block') {
            // Get movement direction
            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize();

            // Apply movement
            if (this.moveForward || this.moveBackward) {
                this.velocity.z = -this.direction.z * this.moveSpeed;
            }
            if (this.moveLeft || this.moveRight) {
                this.velocity.x = -this.direction.x * this.moveSpeed;
            }

            // Apply gravity and jumping
            this.velocity.y -= this.gravity;
            this.jumpVelocity -= this.gravity;

            // Update position
            this.controls.moveRight(-this.velocity.x);
            this.controls.moveForward(-this.velocity.z);

            // Update vertical position
            this.camera.position.y += this.jumpVelocity;

            // Simple ground collision
            if (this.camera.position.y < this.playerHeight) {
                this.camera.position.y = this.playerHeight;
                this.jumpVelocity = 0;
                this.canJump = true;
            }

            // Apply friction
            this.velocity.x *= 0.9;
            this.velocity.z *= 0.9;
        }
    }

    spawnMonster() {
        const now = Date.now();
        if (now - this.lastMonsterSpawn >= this.monsterSpawnInterval) {
            // Get player position
            const playerPosition = this.camera.position;
            
            // Find a spawn point ahead of the player
            let validSpawnPoints = this.spawnPoints.filter(point => {
                const distance = playerPosition.distanceTo(point);
                return distance > 10 && distance < 30; // Spawn between 10 and 30 units ahead
            });

            if (validSpawnPoints.length > 0) {
                const spawnPoint = validSpawnPoints[Math.floor(Math.random() * validSpawnPoints.length)];
                const type = Math.random() > 0.5 ? 'easy' : 'hard';
                
                console.log('Spawning monster at:', spawnPoint);
                
                const monster = new Monster(
                    spawnPoint.x,
                    1, // Raise monster slightly above ground
                    spawnPoint.z,
                    type,
                    this.scene
                );
                this.monsters.push(monster);
                this.lastMonsterSpawn = now;
            }
        }
    }

    checkMonsterCollision() {
        if (this.isInCombat) return;

        const playerPosition = this.camera.position;
        for (let monster of this.monsters) {
            const distance = playerPosition.distanceTo(monster.position);
            if (distance < 4) {
                this.startCombat(monster);
                break;
            }
        }
    }

    startCombat(monster) {
        this.isInCombat = true;
        this.currentMonster = monster;
        this.showMathProblem(); // Show problem immediately
    }

    createParticle(position, color) {
        const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const material = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 1
        });
        const particle = new THREE.Mesh(geometry, material);
        
        // Set initial position to monster's position
        particle.position.copy(position);
        
        // Add random velocity
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            Math.random() * 0.2,
            (Math.random() - 0.5) * 0.3
        );
        
        // Add to scene and particle array
        this.scene.add(particle);
        this.particles.push({
            mesh: particle,
            life: 1.0 // Life counter (1.0 to 0.0)
        });
    }

    updateParticles() {
        // Check if particles array exists
        if (!this.particles) {
            this.particles = [];
            return;
        }
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update position based on velocity
            particle.mesh.position.add(particle.mesh.velocity);
            
            // Add gravity effect
            particle.mesh.velocity.y -= 0.01;
            
            // Reduce life
            particle.life -= 0.02;
            
            // Update opacity based on life
            particle.mesh.material.opacity = particle.life;
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.scene.remove(particle.mesh);
                this.particles.splice(i, 1);
            }
        }
    }

    createDefeatAnimation(position, monsterType) {
        // Create explosion effect with particles
        const particleCount = 50;
        const color = monsterType === 'easy' ? 0xff0000 : 0x800000;
        
        for (let i = 0; i < particleCount; i++) {
            this.createParticle(position, color);
        }
    }

    createGameOverEffect() {
        // Stop the music when game over
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
        }

        // Create red flash overlay
        const flashOverlay = document.createElement('div');
        flashOverlay.style.position = 'fixed';
        flashOverlay.style.top = '0';
        flashOverlay.style.left = '0';
        flashOverlay.style.width = '100%';
        flashOverlay.style.height = '100%';
        flashOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        flashOverlay.style.zIndex = '1000';
        flashOverlay.style.transition = 'opacity 0.5s';
        document.body.appendChild(flashOverlay);

        // Create game over text
        const gameOverText = document.createElement('div');
        gameOverText.textContent = 'Game Over!';
        gameOverText.style.position = 'fixed';
        gameOverText.style.top = '50%';
        gameOverText.style.left = '50%';
        gameOverText.style.transform = 'translate(-50%, -50%)';
        gameOverText.style.color = 'red';
        gameOverText.style.fontSize = '48px';
        gameOverText.style.fontWeight = 'bold';
        gameOverText.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
        gameOverText.style.zIndex = '1001';
        document.body.appendChild(gameOverText);

        // Create particles around the player
        const playerPosition = this.camera.position.clone();
        const particleCount = 100;
        for (let i = 0; i < particleCount; i++) {
            this.createParticle(playerPosition, 0xff0000);
        }

        // Add shake effect
        let intensity = 0.5;
        const originalPosition = this.camera.position.clone();
        const shake = () => {
            if (intensity > 0) {
                this.camera.position.x = originalPosition.x + (Math.random() - 0.5) * intensity;
                this.camera.position.y = originalPosition.y + (Math.random() - 0.5) * intensity;
                this.camera.position.z = originalPosition.z + (Math.random() - 0.5) * intensity;
                intensity *= 0.95;
                requestAnimationFrame(shake);
            }
        };
        shake();

        // Reload the game after effects
        setTimeout(() => {
            location.reload();
        }, 2000);
    }

    generateMathProblem() {
        const operations = ['+', '-', '*'];
        const operation = operations[Math.floor(Math.random() * operations.length)];
        let num1, num2, problem;

        switch (operation) {
            case '+':
                // Addition with numbers up to 20
                num1 = Math.floor(Math.random() * 11) + 5; // 5 to 15
                num2 = Math.floor(Math.random() * 6); // 0 to 5
                
                // Create word problems for addition
                const additionTemplates = [
                    `You have ${num1} marbles and find ${num2} more. How many marbles do you have now?`,
                    `There are ${num1} birds in a tree and ${num2} more join them. How many birds are there now?`,
                    `${num1} + ${num2} = ?`
                ];
                problem = additionTemplates[Math.floor(Math.random() * additionTemplates.length)];
                return { question: problem, answer: num1 + num2 };

            case '-':
                // Subtraction with numbers up to 20, ensuring positive results
                num1 = Math.floor(Math.random() * 11) + 10; // 10 to 20
                num2 = Math.floor(Math.random() * 6) + 1; // 1 to 6
                
                // Create word problems for subtraction
                const subtractionTemplates = [
                    `You have ${num1} cookies and eat ${num2} of them. How many cookies are left?`,
                    `There are ${num1} kids playing and ${num2} go home. How many kids are still playing?`,
                    `${num1} - ${num2} = ?`
                ];
                problem = subtractionTemplates[Math.floor(Math.random() * subtractionTemplates.length)];
                return { question: problem, answer: num1 - num2 };

            case '*':
                // Simple multiplication with small numbers
                num1 = Math.floor(Math.random() * 5) + 1; // 1 to 5
                num2 = Math.floor(Math.random() * 3) + 2; // 2 to 4
                
                // Create word problems for multiplication
                const multiplicationTemplates = [
                    `There are ${num1} baskets with ${num2} apples in each. How many apples are there in total?`,
                    `${num1} groups of ${num2} = ?`,
                    `${num1} × ${num2} = ?`
                ];
                problem = multiplicationTemplates[Math.floor(Math.random() * multiplicationTemplates.length)];
                return { question: problem, answer: num1 * num2 };
        }
    }

    showMathProblem() {
        if (!this.currentMonster || !this.isInCombat) return;

        // Reset all movement flags when showing math problem
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.velocity.set(0, 0, 0);
        
        const problem = this.generateMathProblem();
        
        // Update math overlay content
        this.mathOverlay.innerHTML = '';
        this.mathOverlay.appendChild(document.createElement('div')).textContent = problem.question;
        
        // Reset and add input field
        this.answerInput.value = '';
        this.mathOverlay.appendChild(this.answerInput);
        
        // Update status display
        this.statusDisplay.textContent = `Correct: ${this.currentMonster.correctAnswers}/4 | Lives: ${2 - this.currentMonster.incorrectAnswers}`;
        this.mathOverlay.appendChild(this.statusDisplay);
        
        // Show overlay and focus input
        this.mathOverlay.style.display = 'block';
        this.answerInput.focus();

        // Create a new handler for this problem
        const handleAnswer = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const userAnswer = parseFloat(this.answerInput.value);
                
                if (!isNaN(userAnswer)) {
                    this.answerInput.removeEventListener('keypress', handleAnswer);
                    
                    if (userAnswer === problem.answer) {
                        this.currentMonster.correctAnswers++;
                        console.log('Correct answers:', this.currentMonster.correctAnswers);
                        
                        if (this.currentMonster.correctAnswers >= 4) {
                            console.log('Monster defeated!');
                            this.mathOverlay.style.display = 'none';
                            
                            // Store monster info before removing
                            const monsterPosition = this.currentMonster.position.clone();
                            const monsterType = this.currentMonster.type;
                            
                            // Create defeat animation
                            this.createDefeatAnimation(monsterPosition, monsterType);
                            
                            // Remove monster and update state
                            this.currentMonster.remove();
                            this.monsters = this.monsters.filter(m => m !== this.currentMonster);
                            this.isInCombat = false;
                            this.currentMonster = null;
                            
                            // Show victory message
                            const victoryMsg = document.createElement('div');
                            victoryMsg.textContent = 'Monster Defeated! Continue along the path!';
                            victoryMsg.style.position = 'fixed';
                            victoryMsg.style.top = '50%';
                            victoryMsg.style.left = '50%';
                            victoryMsg.style.transform = 'translate(-50%, -50%)';
                            victoryMsg.style.backgroundColor = 'rgba(0, 255, 0, 0.8)';
                            victoryMsg.style.color = 'white';
                            victoryMsg.style.padding = '20px';
                            victoryMsg.style.borderRadius = '10px';
                            victoryMsg.style.fontSize = '24px';
                            victoryMsg.style.textAlign = 'center';
                            victoryMsg.style.zIndex = '1000';
                            this.uiContainer.appendChild(victoryMsg);
                            
                            // Remove victory message after 2 seconds and re-enable controls
                            setTimeout(() => {
                                victoryMsg.remove();
                                // Re-lock controls to enable movement
                                this.controls.unlock();
                                this.controls.lock();
                            }, 2000);
                        } else {
                            this.showMathProblem();
                        }
                    } else {
                        this.currentMonster.incorrectAnswers++;
                        if (this.currentMonster.incorrectAnswers >= 2) {
                            this.mathOverlay.style.display = 'none';
                            this.createGameOverEffect();
                        } else {
                            this.showMathProblem();
                        }
                    }
                }
            }
        };

        // Clean up any existing event listeners
        const newInput = this.answerInput.cloneNode(true);
        this.answerInput.parentNode.replaceChild(newInput, this.answerInput);
        this.answerInput = newInput;
        
        // Add the event listener to the new input
        this.answerInput.addEventListener('keypress', handleAnswer);
        this.answerInput.focus();
    }

    updateMonsters() {
        // Update each monster's face orientation
        const playerPosition = this.camera.position;
        for (const monster of this.monsters) {
            monster.updateFaceOrientation(playerPosition);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.updatePlayer();
        this.spawnMonster();
        this.updateMonsters();
        this.checkMonsterCollision();
        this.updateParticles(); // Add particle system update
        this.renderer.render(this.scene, this.camera);
    }

    createUIOverlay() {
        // Create main UI container
        this.uiContainer = document.createElement('div');
        this.uiContainer.style.position = 'fixed';
        this.uiContainer.style.width = '100%';
        this.uiContainer.style.height = '100%';
        this.uiContainer.style.pointerEvents = 'none';
        document.body.appendChild(this.uiContainer);

        // Create math problem overlay
        this.mathOverlay = document.createElement('div');
        this.mathOverlay.style.position = 'fixed';
        this.mathOverlay.style.top = '50%';
        this.mathOverlay.style.left = '50%';
        this.mathOverlay.style.transform = 'translate(-50%, -50%)';
        this.mathOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.mathOverlay.style.color = '#ffff00';
        this.mathOverlay.style.padding = '20px';
        this.mathOverlay.style.borderRadius = '10px';
        this.mathOverlay.style.textAlign = 'center';
        this.mathOverlay.style.fontFamily = 'Arial, sans-serif';
        this.mathOverlay.style.fontSize = '24px';
        this.mathOverlay.style.border = '2px solid #ff0000';
        this.mathOverlay.style.display = 'none';
        this.mathOverlay.style.pointerEvents = 'auto';
        this.uiContainer.appendChild(this.mathOverlay);

        // Create input field for answers
        this.answerInput = document.createElement('input');
        this.answerInput.type = 'number';
        this.answerInput.style.fontSize = '20px';
        this.answerInput.style.padding = '5px';
        this.answerInput.style.margin = '10px';
        this.answerInput.style.width = '100px';
        this.answerInput.style.textAlign = 'center';
        this.answerInput.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        this.answerInput.style.border = '2px solid #ffff00';
        this.answerInput.style.borderRadius = '5px';

        // Create status display
        this.statusDisplay = document.createElement('div');
        this.statusDisplay.style.marginTop = '10px';
        this.statusDisplay.style.color = '#ffffff';
        this.statusDisplay.style.fontSize = '18px';
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    try {
        new Game();
    } catch (error) {
        console.error('Error starting game:', error);
        alert('Error starting game. Please check the console for details.');
    }
}); 