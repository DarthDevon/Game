const canvas = document.getElementById('renderCanvas');
let engine, scene, camera;
let player = { health: 100, ammo: 12, reserve: 24 };
let wave = 0;
let enemies = [];
let activeEnemies = 0;
let totalEnemies = 0;
let maxActive = 0;
let playing = false;

function createScene() {
  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

  const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);

  camera = new BABYLON.UniversalCamera('camera', new BABYLON.Vector3(0, 1.7, 0), scene);
  camera.attachControl(canvas, true);
  camera.inertia = 0;
  camera.angularSensibility = 4000;

  const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 100, height: 100 }, scene);
  ground.position.y = 0;

  for (let i = 0; i < 20; i++) {
    const box = BABYLON.MeshBuilder.CreateBox('box' + i, { size: 2 }, scene);
    box.position = new BABYLON.Vector3((Math.random() - 0.5) * 80, 1, (Math.random() - 0.5) * 80);
  }

  scene.onPointerDown = () => {
    if (!playing) return;
    if (player.ammo <= 0) return;
    player.ammo--;
    updateUI();
    const ray = new BABYLON.Ray(camera.position, camera.getDirection(BABYLON.Axis.Z), 100);
    const hit = scene.pickWithRay(ray, mesh => mesh.metadata && mesh.metadata.enemy);
    if (hit && hit.pickedMesh) {
      hit.pickedMesh.health -= 20;
      if (hit.pickedMesh.health <= 0) {
        hit.pickedMesh.dispose();
        activeEnemies--;
        if (--totalEnemies <= 0) nextWave();
      }
    }
  };

  return scene;
}

function spawnEnemy() {
  const enemy = BABYLON.MeshBuilder.CreateSphere('enemy', { diameter: 1.5 }, scene);
  enemy.position = new BABYLON.Vector3((Math.random() - 0.5) * 80, 0.75, (Math.random() - 0.5) * 80);
  enemy.metadata = { enemy: true };
  enemy.health = 40 + wave * 10;
  enemy.actionManager = new BABYLON.ActionManager(scene);
  enemy.move = () => {
    const dir = camera.position.subtract(enemy.position);
    dir.y = 0;
    dir.normalize();
    enemy.position.addInPlace(dir.scale(0.05 + wave * 0.01));
    if (BABYLON.Vector3.Distance(enemy.position, camera.position) < 1.5) {
      player.health -= 5;
      updateUI();
      if (player.health <= 0) gameOver();
      enemy.dispose();
      activeEnemies--;
      if (--totalEnemies <= 0) nextWave();
    }
  };
  enemies.push(enemy);
  activeEnemies++;
  totalEnemies++;
}

function startWave() {
  wave++;
  maxActive = 3 + wave - 1;
  totalEnemies = maxActive + wave * 2;
  document.getElementById('wave').innerText = 'Wave ' + wave;
  const spawnInterval = setInterval(() => {
    if (!playing) { clearInterval(spawnInterval); return; }
    if (activeEnemies < maxActive && totalEnemies > activeEnemies) spawnEnemy();
    if (totalEnemies <= 0) clearInterval(spawnInterval);
  }, 1000);
}

function nextWave() {
  playing = false;
  document.getElementById('wave').innerText = 'Next wave in 20...';
  let countdown = 20;
  const interval = setInterval(() => {
    countdown--;
    document.getElementById('wave').innerText = 'Next wave in ' + countdown + '...';
    if (countdown <= 0) {
      clearInterval(interval);
      playing = true;
      startWave();
    }
  }, 1000);
}

function gameOver() {
  playing = false;
  document.getElementById('menu').style.display = 'flex';
  document.getElementById('wave').innerText = 'Game Over';
}

function updateUI() {
  document.getElementById('health').innerText = player.health;
  document.getElementById('ammoCount').innerText = player.ammo + '/' + player.reserve;
}

window.addEventListener('DOMContentLoaded', () => {
  engine = new BABYLON.Engine(canvas, true);
  scene = createScene();
  engine.runRenderLoop(() => {
    if (scene) {
      enemies.forEach(e => e.move && e.move());
      scene.render();
    }
  });
  window.addEventListener('resize', () => {
    engine.resize();
  });

  document.getElementById('playButton').addEventListener('click', () => {
    document.getElementById('menu').style.display = 'none';
    player.health = 100;
    player.ammo = 12;
    player.reserve = 24;
    updateUI();
    wave = 0;
    enemies.forEach(e => e.dispose());
    enemies = [];
    playing = true;
    startWave();
  });
});
