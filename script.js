/* ================= RAF ================= */
window.requestAnimationFrame =
window.__requestAnimationFrame ||
window.requestAnimationFrame ||
window.webkitRequestAnimationFrame ||
window.mozRequestAnimationFrame ||
window.oRequestAnimationFrame ||
window.msRequestAnimationFrame ||
function (cb) { setTimeout(cb, 1000 / 60); };

/* ================= AUDIO ================= */
var MUSIC_SRC = "Arctic Monkeys - I Wanna Be Yours.mp3";
var audio = new Audio(MUSIC_SRC);
audio.loop = true;
audio.volume = 0.8;

var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioCtx = new AudioContext();
var source = audioCtx.createMediaElementSource(audio);
var analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;

source.connect(analyser);
analyser.connect(audioCtx.destination);

var data = new Uint8Array(analyser.frequencyBinCount);
var playing = false;

var control = document.getElementById("control");
control.onclick = () => {
    if (!playing) {
        audioCtx.resume();
        audio.play();
        playing = true;
        control.textContent = "⏸ Pause";
    } else {
        audio.pause();
        playing = false;
        control.textContent = "▶ Play";
    }
};

/* ================= INIT ================= */
var isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
var canvas = document.getElementById("heart");
var ctx = canvas.getContext("2d");

function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
}
resize();
window.addEventListener("resize", resize);

/* ================= MATRIX TEXT ================= */
var matrixText = (prompt("Texto del fondo Matrix:") || "AMOR").split("");
var matrixFontSize = 18;
var matrixColumns = Math.floor(canvas.width / matrixFontSize);
var matrixDrops = Array.from({ length: matrixColumns }, () => Math.random() * canvas.height);

/* ================= HEART SHAPE ================= */
function heartPosition(t) {
    return [
        Math.pow(Math.sin(t), 3),
        -(15 * Math.cos(t)
        - 5 * Math.cos(2*t)
        - 2 * Math.cos(3*t)
        - Math.cos(4*t))
    ];
}

function scale(pos, sx, sy, dx, dy) {
    return [dx + pos[0]*sx, dy + pos[1]*sy];
}

var pointsOrigin = [];
var dr = isMobile ? 0.3 : 0.1;

for (let i=0;i<Math.PI*2;i+=dr)
pointsOrigin.push(scale(heartPosition(i),210,13,0,0));
for (let i=0;i<Math.PI*2;i+=dr)
pointsOrigin.push(scale(heartPosition(i),150,9,0,0));
for (let i=0;i<Math.PI*2;i+=dr)
pointsOrigin.push(scale(heartPosition(i),90,5,0,0));

var heartCount = pointsOrigin.length;
var targetPoints = [];

/* ================= BEAT ================= */
var bassSmooth = 0;
var lastBass = 0;
var beatCooldown = 0;
var hueBase = 320;

function pulseFromAudio() {
    analyser.getByteFrequencyData(data);

    let bass = 0;
    for (let i=0;i<12;i++) bass += data[i];
    bass = bass / 12 / 255;

    bassSmooth += (bass - bassSmooth) * 0.15;

    if (bass > lastBass + 0.12 && bass > 0.35 && beatCooldown <= 0) {
        hueBase = (hueBase + 90) % 360;
        beatCooldown = 10;
    }

    lastBass = bass;
    beatCooldown--;

    let k = 1 + bassSmooth * 0.5;
    if (k > 1.6) k = 1.6;

    for (let i=0;i<pointsOrigin.length;i++) {
        targetPoints[i] = [
            pointsOrigin[i][0]*k + canvas.width/2,
            pointsOrigin[i][1]*k + canvas.height/2
        ];
    }
}

/* ================= PARTICLES ================= */
var traceCount = isMobile ? 20 : 50;
var particles = [];

for (let i=0;i<heartCount;i++) {
    let x = Math.random()*canvas.width;
    let y = Math.random()*canvas.height;

    particles[i] = {
        vx:0, vy:0,
        speed:Math.random()+5,
        q:~~(Math.random()*heartCount),
        D:2*(i%2)-1,
        force:0.2*Math.random()+0.7,
        trace:Array.from({length:traceCount},()=>({x,y}))
    };
}

/* ================= MATRIX DRAW ================= */
function drawMatrix() {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.font = matrixFontSize + "px monospace";
    ctx.fillStyle = `hsla(${hueBase},80%,60%,0.25)`;

    for (let i=0;i<matrixDrops.length;i++) {
        const char = matrixText[Math.floor(Math.random()*matrixText.length)];
        ctx.fillText(char,i*matrixFontSize,matrixDrops[i]*matrixFontSize);

        if (matrixDrops[i]*matrixFontSize > canvas.height && Math.random() > 0.97)
            matrixDrops[i] = 0;
        matrixDrops[i]++;
    }
}

/* ================= LOOP ================= */
function loop() {
    pulseFromAudio();

    drawMatrix(); // FONDO

    for (let i=particles.length;i--;) {
        let u = particles[i];
        let q = targetPoints[u.q];

        let dx = u.trace[0].x - q[0];
        let dy = u.trace[0].y - q[1];
        let len = Math.sqrt(dx*dx + dy*dy) || 1;

        if (len < 10) {
            if (Math.random() > 0.95) u.q = ~~(Math.random()*heartCount);
            else u.q = (u.q + u.D + heartCount) % heartCount;
        }

        u.vx += -dx/len * u.speed;
        u.vy += -dy/len * u.speed;

        u.trace[0].x += u.vx;
        u.trace[0].y += u.vy;

        u.vx *= u.force;
        u.vy *= u.force;

        for (let k=0;k<u.trace.length-1;k++) {
            u.trace[k+1].x -= 0.4*(u.trace[k+1].x-u.trace[k].x);
            u.trace[k+1].y -= 0.4*(u.trace[k+1].y-u.trace[k].y);
        }

        ctx.fillStyle = `hsla(${hueBase},80%,60%,.45)`;
        for (let k=0;k<u.trace.length;k++)
            ctx.fillRect(u.trace[k].x,u.trace[k].y,1,1);
    }

    requestAnimationFrame(loop);
}

loop();
