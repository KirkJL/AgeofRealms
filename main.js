import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

const WORKER_URL = "https://autumn-king-2661.kirkjlemon.workers.dev";
const WS_URL = WORKER_URL.replace("https://", "wss://") + "/zone/lumbridge";

const els = {
  game: document.getElementById("game"),
  loginPanel: document.getElementById("loginPanel"),
  loginBtn: document.getElementById("loginBtn"),
  username: document.getElementById("username"),
  password: document.getElementById("password"),
  loginMsg: document.getElementById("loginMsg"),
  hud: document.getElementById("hud"),
  status: document.getElementById("status"),
  coords: document.getElementById("coords"),
  rightPanel: document.getElementById("rightPanel"),
  skills: document.getElementById("skills"),
  inventory: document.getElementById("inventory"),
  bank: document.getElementById("bank"),
  bankBtn: document.getElementById("bankBtn"),
  actionPanel: document.getElementById("actionPanel"),
  targetName: document.getElementById("targetName"),
  actionBtn: document.getElementById("actionBtn"),
  chat: document.getElementById("chat"),
  messages: document.getElementById("messages"),
  chatInput: document.getElementById("chatInput")
};

let token = localStorage.getItem("aor_token") || "";
let socket;
let localId = null;
let selectedTarget = null;
let playerState = null;

const remotePlayers = new Map();
const worldObjects = new Map();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x82a565);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 600);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
els.game.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sun = new THREE.DirectionalLight(0xffffff, 1.35);
sun.position.set(25, 45, 20);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(220, 220),
  new THREE.MeshStandardMaterial({ color: 0x4f7d3a })
);
ground.rotation.x = -Math.PI / 2;
ground.userData.type = "ground";
scene.add(ground);

scene.add(new THREE.GridHelper(220, 110, 0x263b1f, 0x263b1f));

const localPlayer = createPlayer(0x2f7cff);
scene.add(localPlayer.mesh);
const destination = new THREE.Vector3(0, 0, 0);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

els.loginBtn.addEventListener("click", login);
els.bankBtn.addEventListener("click", () => send({ type: "bank_toggle" }));
els.actionBtn.addEventListener("click", () => {
  if (!selectedTarget) return;
  send({ type: "interact", targetId: selectedTarget.id });
});

els.chatInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const text = els.chatInput.value.trim();
  if (!text) return;
animate();
