import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

const WORKER_URL = "https://autumn-king-2661.kirkjlemon.workers.dev";
const WS_URL = WORKER_URL.replace("https://", "wss://") + "/zone/lumbridge";

const container = document.getElementById("game");
const statusEl = document.getElementById("status");
const messagesEl = document.getElementById("messages");
const chatInput = document.getElementById("chatInput");

let socket;
let localId = null;
const remotePlayers = new Map();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87a878);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 18, 22);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1.4);
light.position.set(20, 40, 20);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.55));

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x4f7d3a })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const grid = new THREE.GridHelper(200, 100, 0x263b1f, 0x263b1f);
scene.add(grid);

const localPlayer = createPlayer(0x2f7cff);
scene.add(localPlayer.mesh);

const destination = new THREE.Vector3(0, 0, 0);

spawnTrees();
spawnRocks();

function createPlayer(color) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.45, 1.2, 4, 8),
    new THREE.MeshStandardMaterial({ color })
  );
  body.position.y = 1;
  group.add(body);

  const nameTag = document.createElement("div");

  return {
    mesh: group,
    nameTag,
    target: new THREE.Vector3()
  };
}

function spawnTrees() {
  for (let i = 0; i < 40; i++) {
    const tree = new THREE.Group();

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.32, 2),
      new THREE.MeshStandardMaterial({ color: 0x6b3f1f })
    );
    trunk.position.y = 1;
    tree.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 2.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x1f5c2e })
    );
    leaves.position.y = 2.8;
    tree.add(leaves);

    tree.position.set(random(-80, 80), 0, random(-80, 80));
    scene.add(tree);
  }
}

function spawnRocks() {
  for (let i = 0; i < 20; i++) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(random(0.6, 1.4)),
      new THREE.MeshStandardMaterial({ color: 0x777777 })
    );
    rock.position.set(random(-70, 70), 0.6, random(-70, 70));
    scene.add(rock);
  }
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

window.addEventListener("pointerdown", (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(ground);

  if (hits.length > 0) {
    destination.copy(hits[0].point);

    send({
      type: "move",
      x: destination.x,
      z: destination.z
    });
  }
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;

  const text = chatInput.value.trim();
  if (!text) return;

  send({
    type: "chat",
    text
  });

  chatInput.value = "";
});

function connect() {
  socket = new WebSocket(WS_URL);

  socket.addEventListener("open", () => {
    statusEl.textContent = "Connected";
  });

  socket.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "welcome") {
      localId = msg.id;
      return;
    }

    if (msg.type === "snapshot") {
      syncPlayers(msg.players);
      return;
    }

    if (msg.type === "chat") {
      addMessage(msg.name + ": " + msg.text);
    }
  });

  socket.addEventListener("close", () => {
    statusEl.textContent = "Disconnected. Reconnecting...";
    setTimeout(connect, 1500);
  });
}

function syncPlayers(players) {
  for (const player of players) {
    if (player.id === localId) continue;

    let remote = remotePlayers.get(player.id);

    if (!remote) {
      remote = createPlayer(0xc94c2f);
      scene.add(remote.mesh);
      remotePlayers.set(player.id, remote);
    }

    remote.target.set(player.x, 0, player.z);
  }
}

function send(payload) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function addMessage(text) {
  const div = document.createElement("div");
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function animate() {
  requestAnimationFrame(animate);

  localPlayer.mesh.position.lerp(destination, 0.08);

  for (const remote of remotePlayers.values()) {
    remote.mesh.position.lerp(remote.target, 0.15);
  }

  camera.position.x = localPlayer.mesh.position.x;
  camera.position.z = localPlayer.mesh.position.z + 22;
  camera.lookAt(localPlayer.mesh.position.x, 0, localPlayer.mesh.position.z);

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

connect();
animate();
