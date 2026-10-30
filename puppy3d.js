import * as THREE from './vendor/three.module.js';

// A small articulated character, built locally from soft, rounded volumes.
// Every action shares the same rig so transitions preserve the current pose.
const room = document.querySelector('#room');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
} catch (error) {
  console.warn('3D rendering unavailable; the illustrated puppy remains available.', error);
}

if (renderer) {
  const canvas = renderer.domElement;
  canvas.className = 'puppy-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '圆滚滚的立体小金毛');
  room.append(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-6, 6, 3.8, -3.8, .1, 50);
  camera.position.set(0, 4.5, 12);
  camera.lookAt(0, 1.95, 0);
  scene.add(new THREE.HemisphereLight(0xfff8e5, 0xa69b7a, 1.6));
  const sun = new THREE.DirectionalLight(0xfff3dc, 3);
  sun.position.set(-3, 6, 5);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xf3f6ff, .7);
  fill.position.set(4, 2, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffe7ac, 1.8);
  rim.position.set(-1, 4, -4);
  scene.add(rim);

  const material = (color, roughness = .78) => new THREE.MeshStandardMaterial({ color, roughness });
  const fur = material(0xe9ad50);
  const faceFur = material(0xf1bb65);
  const earFur = material(0xc88839);
  const earInner = material(0xe2a75c);
  const cream = material(0xffdf9f);
  const toeFur = material(0xf4c882);
  const dark = material(0x30261f, .19);
  const mouthMat = material(0x70462b);
  const pink = material(0xe29788);
  const highlight = new THREE.MeshBasicMaterial({ color: 0xfff9ec });
  const sphere = new THREE.SphereGeometry(1, 32, 24);

  function puff(parent, mat, position, scale) {
    const mesh = new THREE.Mesh(sphere, mat);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }
  function group(parent, position) {
    const item = new THREE.Group();
    item.position.set(...position);
    parent.add(item);
    return item;
  }
  function stroke(parent, points, radius, mat) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius, 8, false), mat);
    parent.add(mesh);
    return mesh;
  }

  const traveler = group(scene, [0, 0, 0]);
  const pivot = group(traveler, [0, .95, 0]);
  const puppy = group(pivot, [0, -.95, 0]);
  const body = puff(puppy, fur, [0, .81, -.08], [.66, .73, .57]);
  const tummy = puff(puppy, cream, [0, .78, .4], [.45, .51, .19]);
  const haunches = [-1, 1].map(side => puff(puppy, fur, [side * .45, .35, -.15], [.34, .35, .4]));
  const limbs = [];
  for (const side of [-1, 1]) {
    for (const front of [false, true]) {
      const limb = group(puppy, [side * (front ? .38 : .43), .6, front ? .33 : -.35]);
      puff(limb, front ? faceFur : fur, [0, -.19, 0], [.22, .34, .23]);
      puff(limb, toeFur, [0, -.43, .085], [.25, .18, .3]);
      for (const offset of [-.065, .065]) {
        stroke(limb, [[offset, -.44, .366], [offset, -.48, .366]], .009, earInner);
      }
      limbs.push({ object: limb, side, front });
    }
  }

  const tail = group(puppy, [0, .7, -.51]);
  stroke(tail, [[0, 0, 0], [0, .14, -.32], [0, .46, -.55], [0, .68, -.49]], .15, fur);
  puff(tail, toeFur, [0, .66, -.49], [.17, .21, .17]);
  const head = group(puppy, [0, 1.77, .08]);
  puff(head, faceFur, [0, 0, 0], [.88, .75, .7]);
  // Cheeks and brows merge into the head rather than having drawn outlines.
  puff(head, faceFur, [-.48, -.22, .28], [.35, .33, .37]);
  puff(head, faceFur, [.48, -.22, .28], [.35, .33, .37]);
  puff(head, toeFur, [-.13, .63, -.02], [.17, .17, .21]).rotation.z = -.35;
  puff(head, faceFur, [.06, .66, -.03], [.15, .13, .18]).rotation.z = .3;

  const ears = [-1, 1].map(side => {
    const ear = group(head, [side * .76, .27, -.03]);
    puff(ear, earFur, [side * .1, -.4, .02], [.25, .51, .28]);
    puff(ear, earInner, [side * .11, -.44, .23], [.14, .3, .07]);
    ear.rotation.z = side * .13;
    return { object: ear, side };
  });

  const eyeGroups = [];
  for (const side of [-1, 1]) {
    const eye = group(head, [side * .29, .04, .652]);
    puff(eye, dark, [0, 0, 0], [.092, .115, .066]);
    puff(eye, highlight, [-.025, .037, .057], [.027, .03, .013]);
    puff(eye, highlight, [.027, -.033, .06], [.012, .013, .008]);
    eyeGroups.push(eye);
    puff(head, cream, [side * .16, -.255, .615], [.265, .205, .2]);
    puff(head, pink, [side * .49, -.17, .555], [.115, .055, .022]);
    stroke(head, [[side * .38, .245, .57], [side * .3, .26, .602], [side * .23, .25, .62]], .022, toeFur);
  }
  const nose = puff(head, dark, [0, -.16, .822], [.12, .085, .08]);
  puff(nose, highlight, [-.24, .27, .78], [.22, .16, .1]);
  const smile = group(head, [0, 0, 0]);
  stroke(smile, [[0, -.235, .809], [0, -.29, .818], [-.065, -.32, .797], [-.12, -.29, .776]], .014, mouthMat);
  stroke(smile, [[0, -.29, .818], [.065, -.32, .797], [.12, -.29, .776]], .014, mouthMat);
  const tongue = puff(head, pink, [.025, -.38, .797], [.075, .11, .035]);
  const howlMouth = puff(head, mouthMat, [0, -.325, .8], [.075, .105, .025]);
  tongue.visible = false;
  howlMouth.visible = false;

  // A feathered contact shadow grounds the character without a visible plane.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const context = shadowCanvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(78, 64, 38, .36)');
  gradient.addColorStop(.45, 'rgba(78, 64, 38, .2)');
  gradient.addColorStop(1, 'rgba(78, 64, 38, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2), new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false
  }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = .012;
  scene.add(shadow);

  let width = 0;
  let height = 0;
  let worldWidth = 0;
  let destination = 0;
  let action = room.dataset.action || '';
  let elapsed = 0;
  let actionStarted = 0;
  let previous = 0;
  let frame;
  let active = true;
  let paperProgress = null;
  let paperWeight = 0;
  const kickPaw = limbs.find(limb => limb.front && limb.side === -1).object;
  const projectedPaw = new THREE.Vector3();
  const weights = { roll: 0, run: 0, jump: 0, howl: 0, rest: 0 };
  const desiredRotation = new THREE.Quaternion();
  const desiredTilt = new THREE.Quaternion();
  const euler = new THREE.Euler();

  function resize() {
    width = room.clientWidth;
    height = room.clientHeight;
    // Keep the puppy's silhouette comfortably inside even narrow phone screens.
    const worldHeight = width < 600 ? 6.8 : 7.3;
    worldWidth = worldHeight * width / height;
    camera.left = -worldWidth / 2;
    camera.right = worldWidth / 2;
    camera.top = worldHeight / 2;
    camera.bottom = -worldHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    const limit = Math.max(0, worldWidth / 2 - 1.15);
    destination = THREE.MathUtils.clamp(destination, -limit, limit);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(room);
  resize();

  room.addEventListener('puppy-action', event => {
    action = event.detail.action;
    actionStarted = elapsed;
    // Keeping the current position avoids teleporting when a movement is stopped.
    if (action !== 'run') destination = traveler.position.x;
  });
  room.addEventListener('puppy-sound-start', event => {
    if (event.detail.action === action) actionStarted = elapsed;
  });
  room.addEventListener('puppy-walk', event => {
    destination = THREE.MathUtils.clamp((event.detail.fraction - .5) * worldWidth, -worldWidth / 2 + 1.1, worldWidth / 2 - 1.1);
  });
  room.addEventListener('puppy-paper-pose', event => {
    if (paperProgress === null && event.detail.progress !== null) destination = 0;
    paperProgress = event.detail.progress;
  });

  function animate(timestamp) {
    if (!active) return;
    const dt = Math.min((timestamp - (previous || timestamp)) / 1000, .04);
    previous = timestamp;
    elapsed += dt;
    const t = reducedMotion.matches ? 0 : elapsed - actionStarted;
    const ease = reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 8);
    const smooth = (current, target) => THREE.MathUtils.lerp(current, target, ease);
    paperWeight = smooth(paperWeight, paperProgress === null ? 0 : 1);
    const paperTime = paperProgress ?? 1;
    const step = (from, to) => THREE.MathUtils.smoothstep(paperTime, from, to);
    const paperTurn = step(0, .2) * (1 - step(.82, 1)) * paperWeight;
    const windup = step(.24, .44) * (1 - step(.44, .52)) * paperWeight;
    const strike = step(.44, .52) * (1 - step(.56, .72)) * paperWeight;
    for (const key of Object.keys(weights)) weights[key] = smooth(weights[key], key === action ? 1 : 0);
    const { roll, run, jump, howl, rest } = weights;
    const moving = !reducedMotion.matches && Math.abs(destination - traveler.position.x) > .025 && !action;
    const walk = moving ? Math.min(1, Math.abs(destination - traveler.position.x) * 3) : 0;
    const runSpan = Math.min(2.8, Math.max(.25, worldWidth / 2 - 1.15));
    const path = t * 1.4;
    const targetX = destination * (1 - run) + Math.sin(path) * runSpan * run;
    traveler.position.x = smooth(traveler.position.x, targetX);
    traveler.position.z = Math.cos(path) * .3 * run;
    const yaw = Math.atan2(Math.cos(path) * runSpan, -Math.sin(path) * .3);
    const turn = moving ? Math.sign(destination - traveler.position.x) * .7 : .13 + Math.sin(t * .5) * .05;
    desiredRotation.setFromEuler(euler.set(0, (turn * (1 - run) + yaw * run) * (1 - paperTurn) - paperTurn * 1.05, 0));
    traveler.quaternion.slerp(desiredRotation, 1 - Math.exp(-dt * 7));

    const cycle = (t % 1.55) / 1.55;
    const flight = cycle > .18 && cycle < .78 ? Math.sin((cycle - .18) / .6 * Math.PI) : 0;
    const crouch = cycle < .18 ? Math.sin(cycle / .18 * Math.PI) : cycle > .78 ? Math.sin((cycle - .78) / .22 * Math.PI) * .7 : 0;
    const stride = t * 13;
    const bounce = Math.abs(Math.sin(stride)) * .105 * run + Math.abs(Math.sin(t * 10)) * .035 * walk;
    pivot.position.y = .95 - roll * .35 + flight * 1.05 * jump - crouch * .11 * jump + bounce - windup * .08 + strike * .025;
    pivot.scale.set(1 + crouch * .09 * jump, 1 - crouch * .13 * jump + flight * .035 * jump, 1 + crouch * .06 * jump);
    // A floor roll rocks from shoulder to shoulder while the paws kick loosely.
    desiredTilt.setFromEuler(euler.set((-1.1 + Math.sin(t * 3) * .1) * roll + windup * .07 - strike * .08, 0, Math.sin(t * 2.6) * .85 * roll + Math.sin(stride) * .035 * run + windup * .1 - strike * .1));
    pivot.quaternion.slerp(desiredTilt, 1 - Math.exp(-dt * 10));
    const breathing = Math.sin(t * 2.1) * .012;
    body.scale.set(.72 + breathing, .66 * (1 - rest * .3 - run * .17) + breathing, .59 + rest * .22 + run * .2);
    body.position.y = .76 - rest * .2 - run * .08;
    tummy.position.y = .73 - rest * .2 - run * .16;
    tummy.position.z = .4 - run * .25;
    tummy.scale.y = .51 * (1 - rest * .3);
    haunches.forEach(part => { part.position.y = .35 - rest * .08; part.position.z = -.15 - run * .25; });
    head.position.y = 1.67 - rest * .64 - run * .34 + Math.sin(stride - .4) * .035 * run + Math.sin(t * 2) * .025 * (1 - run);
    head.position.z = .08 + rest * .43 + run * .48;
    head.rotation.x = -.14 * howl + Math.sin(t * 2.5) * .05 * howl + Math.sin(stride - .6) * .035 * run + .08 * rest;
    head.rotation.z = Math.sin(t * .9) * .045 * (1 - run) + Math.sin(t * 2.6 - .3) * .1 * roll;
    head.rotation.y = Math.sin(t * .55) * .06 * (1 - run);
    head.rotation.x += windup * .14 - strike * .08;

    for (const { object: limb, side, front } of limbs) {
      const phase = (side === 1 ? Math.PI : 0) + (front ? 0 : Math.PI);
      limb.rotation.x = Math.sin(stride + phase) * .75 * run + Math.sin(t * 10 + phase) * .35 * walk
        + Math.sin(t * 7 + phase) * .5 * roll - flight * .35 * jump - rest * .8;
      limb.rotation.z = side * (.08 + rest * .12 + roll * .23);
      limb.position.y = .6 - rest * .1;
      limb.position.z = (front ? .33 : -.35) + rest * (front ? .2 : -.12) + run * (front ? .18 : -.2);
      if (limb === kickPaw) limb.rotation.x += windup * .8 - strike * 1.35;
      else if (front) limb.rotation.x += windup * .1;
    }
    for (const { object: ear, side } of ears) {
      ear.rotation.z = side * (.13 + flight * .36 * jump + Math.sin(stride - .7) * .14 * run + Math.sin(t * 2.6 - .5) * .25 * roll);
      ear.rotation.x = Math.sin(t * 2 - .5) * .025 + Math.cos(stride - .8) * .17 * run + flight * .22 * jump;
      ear.rotation.x += strike * .18;
    }
    tail.rotation.y = Math.sin(t * (7 + run * 8)) * (.34 + run * .25) * (1 - rest * .8);
    tail.rotation.x = .14 + Math.sin(t * 3) * .08;
    const blinkPhase = t % 4.6;
    const blink = blinkPhase > 4.35 ? 1 - Math.sin((blinkPhase - 4.35) / .25 * Math.PI) * .94 : 1;
    eyeGroups.forEach(eye => { eye.scale.y = Math.max(.08, blink * (1 - rest * .92 - howl * .3)); });
    tongue.visible = run > .25 || jump > .25;
    tongue.scale.y = .11 * (1 + Math.sin(stride - 1) * .12 * run);
    howlMouth.visible = howl > .5;
    howlMouth.scale.y = .105 * (.8 + Math.sin(t * 4) * .2);
    smile.visible = !howlMouth.visible;
    shadow.position.x = traveler.position.x;
    shadow.position.z = traveler.position.z;
    shadow.scale.setScalar(1 - flight * .25 * jump + roll * .15);
    shadow.material.opacity = 1 - flight * .45 * jump;
    if (paperProgress !== null) {
      scene.updateMatrixWorld(true);
      kickPaw.localToWorld(projectedPaw.set(0, -.43, .38));
      projectedPaw.project(camera);
      room.dispatchEvent(new CustomEvent('puppy-paper-foot', { detail: {
        x: (projectedPaw.x + 1) * width / 2,
        y: (1 - projectedPaw.y) * height / 2
      } }));
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(animate);
  }

  function resume() {
    if (!active) return;
    cancelAnimationFrame(frame);
    previous = 0;
    frame = requestAnimationFrame(animate);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else resume();
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    active = false;
    cancelAnimationFrame(frame);
    room.classList.remove('has-3d-puppy');
    room.querySelector('.dog').removeAttribute('aria-hidden');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    active = true;
    room.classList.add('has-3d-puppy');
    room.querySelector('.dog').setAttribute('aria-hidden', 'true');
    resume();
  });
  window.addEventListener('pagehide', () => cancelAnimationFrame(frame));
  window.addEventListener('pageshow', resume);
  renderer.render(scene, camera);
  room.classList.add('has-3d-puppy');
  room.querySelector('.dog').setAttribute('aria-hidden', 'true');
  resume();
}
