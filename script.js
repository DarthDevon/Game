const canvas = document.getElementById('renderCanvas');
let engine, scene, camera;
let player = { health: 100, ammo: 12, reserve: 24 };
let wave = 0;
let enemies = [];

let activeEnemies = 0;
let totalEnemies = 0;
let maxActive = 0;
let playing = false;

let items = [];
function clearItems() {
  items.forEach(i => i.dispose());
  items = [];
}
let itemSpawns = [];
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
  createMap();

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
function createMap() {
  const size = 20;
  for (let i = 0; i < 3; i++) {
    const floor = BABYLON.MeshBuilder.CreateBox("floor"+i, {width:size, depth:size, height:0.5}, scene);
    floor.position = new BABYLON.Vector3(0, i*3, 0);
  }
  for (let i = 0; i < 3; i++) {
    const ramp = BABYLON.MeshBuilder.CreateBox("ramp"+i, {width:2, depth:4, height:0.5}, scene);
    ramp.position = new BABYLON.Vector3(size/2-1, i*3+0.25, -size/2+2);
    ramp.rotation.z = Math.PI/4;
  }
  itemSpawns = [
    new BABYLON.Vector3(5,0.5,5),
    new BABYLON.Vector3(-5,0.5,-5),
    new BABYLON.Vector3(0,3.5,0)
  ];
}

}

function spawnBot() {
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
function spawnDrone() {
  const enemy = BABYLON.MeshBuilder.CreateSphere("drone", {diameter:1}, scene);
  enemy.position = new BABYLON.Vector3((Math.random()-0.5)*80, 3, (Math.random()-0.5)*80);
  enemy.metadata = { enemy: true };
  enemy.health = 30 + wave * 8;
  enemy.move = () => {
    const dir = camera.position.subtract(enemy.position);
    dir.normalize();
    enemy.position.addInPlace(dir.scale(0.07 + wave*0.02));
    if (BABYLON.Vector3.Distance(enemy.position, camera.position) < 1.5) {
      player.health -= 10;
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

function spawnEnemy() {
  if (wave >= 2 && Math.random() < 0.3) {
    spawnDrone();
  } else {
    spawnBot();
  }
}

function spawnItem(type) {
  const pos = itemSpawns[Math.floor(Math.random()*itemSpawns.length)];
  let mesh;
  if (type === "health") {
    mesh = BABYLON.MeshBuilder.CreateBox("health", {size:0.5}, scene);
    const mat = new BABYLON.StandardMaterial("hm", scene);
    mat.diffuseColor = new BABYLON.Color3(1,0,0);
    mesh.material = mat;
    mesh.metadata = {item:"health"};
  } else if (type === "ammo") {
    mesh = BABYLON.MeshBuilder.CreateBox("ammo", {size:0.5}, scene);
    const mat = new BABYLON.StandardMaterial("am", scene);
    mat.diffuseColor = new BABYLON.Color3(0,1,0);
    mesh.material = mat;
    mesh.metadata = {item:"ammo"};
  }
  mesh.position = pos.clone();
  items.push(mesh);
}


function startWave() {
  wave++;
  maxActive = 3 + wave - 1;
  totalEnemies = maxActive + wave * 2;
  spawnItem("health");
  spawnItem("ammo");
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
  window.addEventListener("keydown", e => {
    if (!playing) return;
    if (e.key.toLowerCase() === "e") {
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if (BABYLON.Vector3.Distance(camera.position, item.position) < 2) {
          if (item.metadata.item === "health") {
            player.health = Math.min(100, player.health + 25);
          } else if (item.metadata.item === "ammo") {
            player.reserve += 12;
          }
          item.dispose();
          items.splice(i,1);
          updateUI();
        }
      }
    } else if (e.key.toLowerCase() === "r") {
      const need = 12 - player.ammo;
      if (need > 0 && player.reserve > 0) {
        const use = Math.min(need, player.reserve);
        player.ammo += use;
        player.reserve -= use;
        updateUI();
      }
    }
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
    clearItems();

    playing = true;
    startWave();
  });
});
