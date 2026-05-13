const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');

const kuchenCanvas = document.getElementById('kuchen-canvas');
const kuchenCtx = kuchenCanvas.getContext('2d');

let width, height;
let particles = [];
let kuchens = [];
const numParticles = 4000;
const numKuchens = 100;
const noiseScale = 0.002;
const particleSpeed = 0.6;

// Create simplex noise instance
const simplex = new SimplexNoise();

// Mouse interaction tracking
let mouse = { x: -1000, y: -1000, radius: 250 };

// Preload kuchen images
const kuchenImages = [];
const imagePaths = [
    'img/partikel/kuchen_01.png',
    'img/partikel/kuchen_02.png',
    'img/partikel/kuchen_03.png',
    'img/partikel/kuchen_04.png',
    'img/partikel/kuchen_05.png'
];

imagePaths.forEach(path => {
    const img = new Image();
    img.src = path;
    kuchenImages.push(img);
});

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    
    bgCanvas.width = width;
    bgCanvas.height = height;
    
    kuchenCanvas.width = width;
    kuchenCanvas.height = height;
}

window.addEventListener('resize', resize);
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('mouseout', () => {
    mouse.x = -1000;
    mouse.y = -1000;
});
window.addEventListener('touchmove', (e) => {
    if(e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
    }
});
window.addEventListener('touchend', () => {
    mouse.x = -1000;
    mouse.y = -1000;
});

// The glowy digital flow matrix particles
class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = 0;
        this.vy = 0;
        // Glowy blue colors with varying opacity
        this.hue = 200 + Math.random() * 40; // 200 to 240 (blue to purple-blue)
        this.baseAlpha = 0.3 + Math.random() * 0.5;
        this.size = Math.random() * 1.5 + 0.5;
        this.prevX = this.x;
        this.prevY = this.y;
        // Group into 4 distinct noise "layers" to create multiple thick datastreams
        this.noiseZ = Math.floor(Math.random() * 4) * 1000;
    }

    update() {
        this.prevX = this.x;
        this.prevY = this.y;

        // Use simplex noise to determine flow direction, slightly faster time evolution
        let angle = simplex.noise3D(this.x * noiseScale, this.y * noiseScale, this.noiseZ + Date.now() * 0.0001) * Math.PI * 2;
        
        // Matrix flow bias: Add a tendency to move downwards
        let downwardBias = 0.6;
        let flowDx = Math.cos(angle);
        let flowDy = Math.sin(angle) + downwardBias;
        
        let flowAngle = Math.atan2(flowDy, flowDx);

        let targetVx = Math.cos(flowAngle) * particleSpeed;
        let targetVy = Math.sin(flowAngle) * particleSpeed;

        // Mouse hover repulsion and color highlight
        let dx = this.x - mouse.x;
        let dy = this.y - mouse.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        let alpha = this.baseAlpha;

        if (distance < mouse.radius) {
            let force = (mouse.radius - distance) / mouse.radius;
            // Easing the force
            force = force * force;
            
            let pushAngle = Math.atan2(dy, dx);
            // Push away gently
            targetVx += Math.cos(pushAngle) * force * 3;
            targetVy += Math.sin(pushAngle) * force * 3;
            
            // Brighten up slightly when close to mouse
            alpha = Math.min(1, this.baseAlpha + force * 1);
            this.color = `hsla(200, 100%, 85%, ${alpha})`; // less intense bright cyan
        } else {
            this.color = `hsla(${this.hue}, 100%, 65%, ${alpha})`;
        }

        // Steer towards target velocity
        this.vx += (targetVx - this.vx) * 0.05;
        this.vy += (targetVy - this.vy) * 0.05;

        this.x += this.vx;
        this.y += this.vy;

        // Wrap around screen edges without drawing a line across
        if (this.x < 0) { this.x = width; this.prevX = width; }
        if (this.x > width) { this.x = 0; this.prevX = 0; }
        if (this.y < 0) { this.y = height; this.prevY = height; }
        if (this.y > height) { this.y = 0; this.prevY = 0; }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.prevX, this.prevY);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.size;
        ctx.stroke();
    }
}

// The floating kuchen elements
class Kuchen {
    constructor() {
        this.reset();
        // Give them an initial random rotation and rotation speed
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.01;
        // Pick a random image
        this.img = kuchenImages[Math.floor(Math.random() * kuchenImages.length)];
    }

    reset() {
        this.x = Math.random() * width;
        // Start above the screen
        this.y = -100 - Math.random() * 800;
        this.vx = (Math.random() - 0.5) * 0.5;
        // Fall downwards slowly
        this.vy = Math.random() * 0.5 + 0.2;
        // Random sizes
        this.size = Math.random() * 20 + 15; // 15px to 35px
    }

    update() {
        // Subtle flow field influence on kuchens
        let angle = simplex.noise3D(this.x * noiseScale, this.y * noiseScale, Date.now() * 0.00005) * Math.PI * 2;
        this.vx += Math.cos(angle) * 0.005;
        this.vy += Math.sin(angle) * 0.005;

        // Mouse hover interaction for kuchens (gentle push)
        let dx = this.x - mouse.x;
        let dy = this.y - mouse.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < mouse.radius * 1.2) {
            let force = (mouse.radius * 1.2 - distance) / (mouse.radius * 1.2);
            let pushAngle = Math.atan2(dy, dx);
            this.vx += Math.cos(pushAngle) * force * 0.3;
            this.vy += Math.sin(pushAngle) * force * 0.3;
            // Spin faster when hit
            this.rotationSpeed += (Math.random() - 0.5) * 0.01 * force;
        }

        // Friction to prevent infinite acceleration
        this.vx *= 0.98;
        this.vy *= 0.99; // Less vertical friction so they keep falling
        
        // Base falling gravity
        this.vy += 0.01;

        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        
        // Dampen rotation speed over time
        this.rotationSpeed *= 0.99;

        // Reset if they fall off screen
        if (this.y > height + 100 || this.x < -100 || this.x > width + 100) {
            this.reset();
            this.img = kuchenImages[Math.floor(Math.random() * kuchenImages.length)];
        }
    }

    draw(ctx) {
        // If image hasn't loaded or broken, draw a glowing placeholder circle
        if (!this.img || !this.img.complete || this.img.naturalWidth === 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = 'rgba(0, 150, 255, 0.1)';
            ctx.strokeStyle = 'rgba(0, 150, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
            return;
        }

        // Draw actual image with a subtle glow
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Add a glow behind the image
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0, 150, 255, 0.5)';
        
        ctx.globalAlpha = 0.85;
        // Center the image draw
        ctx.drawImage(this.img, -this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
    }
}

function init() {
    resize();
    particles = [];
    kuchens = [];
    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle());
    }
    for (let i = 0; i < numKuchens; i++) {
        kuchens.push(new Kuchen());
    }
}

function animate() {
    // Fading background on the bg-canvas to create the "Matrix Line" trail effect
    // Dark sleek blue-black color with slightly higher opacity for faster fade (cleaner)
    bgCtx.fillStyle = 'rgba(2, 6, 17, 0.15)'; 
    bgCtx.fillRect(0, 0, width, height);

    // No lighter composite here, it prevents the messy black residue

    // Update and draw matrix flow particles on bgCanvas
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw(bgCtx);
    }
    
    // (Composite operation reset removed, using standard source-over)

    // Kuchen canvas is completely cleared every frame (no trails for them)
    kuchenCtx.clearRect(0, 0, width, height);

    // Update and draw floating kuchens on kuchenCanvas
    for (let i = 0; i < kuchens.length; i++) {
        kuchens[i].update();
        kuchens[i].draw(kuchenCtx);
    }

    requestAnimationFrame(animate);
}

// Start everything
init();
animate();
