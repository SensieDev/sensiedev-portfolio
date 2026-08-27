import * as THREE from "three";

const canvas = document.getElementById("scene");
const yearEl = document.getElementById("year");
const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");

if (yearEl) yearEl.textContent = String(new Date().getFullYear());

/* Mobile nav */
navToggle?.addEventListener("click", () => {
  const open = nav?.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
});

nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    navToggle?.setAttribute("aria-expanded", "false");
    navToggle?.setAttribute("aria-label", "Open menu");
  });
});

/* Scroll reveal */
const revealTargets = document.querySelectorAll(
  ".section h2, .section-lede, .stack-list, .stack-note, .expertise-item, .project, .course-list, .contact-inner .btn, .socials"
);

revealTargets.forEach((el) => el.classList.add("reveal"));

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
);

revealTargets.forEach((el) => revealObserver.observe(el));

/* 3D tilt on interactive blocks */
const tiltEls = document.querySelectorAll("[data-tilt]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

tiltEls.forEach((el) => {
  if (reduceMotion) return;

  el.addEventListener("pointermove", (e) => {
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 6}deg)`;
  });

  el.addEventListener("pointerleave", () => {
    el.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg)";
  });
});

/* ---------- Three.js scene ---------- */
if (!canvas || reduceMotion) {
  if (canvas) canvas.style.display = "none";
} else {
  initScene(canvas);
}

function initScene(canvasEl) {
  const renderer = new THREE.WebGLRenderer({
    canvas: canvasEl,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0.2, 6.5);

  const group = new THREE.Group();
  scene.add(group);

  const phosphor = new THREE.Color("#3ecf8e");
  const amber = new THREE.Color("#e8b84a");
  const ice = new THREE.Color("#4a9eff");
  const bone = new THREE.Color("#d7e0ea");

  // Core wireframe icosahedron
  const icoGeo = new THREE.IcosahedronGeometry(1.55, 1);
  const icoMat = new THREE.MeshBasicMaterial({
    color: phosphor,
    wireframe: true,
    transparent: true,
    opacity: 0.55,
  });
  const ico = new THREE.Mesh(icoGeo, icoMat);
  group.add(ico);

  // Inner solid with soft tone
  const coreGeo = new THREE.IcosahedronGeometry(0.72, 0);
  const coreMat = new THREE.MeshStandardMaterial({
    color: amber,
    roughness: 0.45,
    metalness: 0.55,
    flatShading: true,
    emissive: new THREE.Color("#3a2a08"),
    emissiveIntensity: 0.35,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  // Orbiting rings
  const ringMatA = new THREE.MeshBasicMaterial({
    color: phosphor,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
  });
  const ringMatB = new THREE.MeshBasicMaterial({
    color: ice,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });

  const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.012, 12, 120), ringMatA);
  ringA.rotation.x = Math.PI / 2.4;
  group.add(ringA);

  const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.01, 12, 140), ringMatB);
  ringB.rotation.x = Math.PI / 1.7;
  ringB.rotation.y = 0.4;
  group.add(ringB);

  // Floating nodes (octahedrons)
  const nodes = [];
  const nodeGeo = new THREE.OctahedronGeometry(0.1, 0);
  const nodeColors = [phosphor, amber, ice, bone];

  for (let i = 0; i < 14; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: nodeColors[i % nodeColors.length],
      roughness: 0.4,
      metalness: 0.5,
      flatShading: true,
    });
    const node = new THREE.Mesh(nodeGeo, mat);
    const theta = (i / 14) * Math.PI * 2;
    const phi = 0.4 + (i % 5) * 0.25;
    const radius = 2.8 + (i % 3) * 0.35;
    node.userData = {
      theta,
      phi,
      radius,
      speed: 0.15 + (i % 4) * 0.05,
      spin: 0.5 + i * 0.07,
    };
    group.add(node);
    nodes.push(node);
  }

  // Connecting lines from core toward nodes (static spokes)
  const spokeMat = new THREE.LineBasicMaterial({
    color: phosphor,
    transparent: true,
    opacity: 0.18,
  });
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(Math.cos(angle) * 2.4, Math.sin(angle * 1.3) * 0.8, Math.sin(angle) * 2.4),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    group.add(new THREE.Line(geo, spokeMat));
  }

  const ambient = new THREE.AmbientLight(0x1a2a22, 1.2);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0x3ecf8e, 0.9);
  key.position.set(4, 6, 5);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x4a9eff, 0.4);
  fill.position.set(-5, -2, -3);
  scene.add(fill);

  // Position group toward the right on desktop so copy stays readable
  function layoutGroup() {
    const w = window.innerWidth;
    if (w < 720) {
      group.position.set(0, 1.1, 0);
      group.scale.setScalar(0.72);
      camera.position.z = 7.2;
    } else if (w < 1100) {
      group.position.set(1.6, 0.35, 0);
      group.scale.setScalar(0.9);
      camera.position.z = 6.8;
    } else {
      group.position.set(2.4, 0.25, 0);
      group.scale.setScalar(1);
      camera.position.z = 6.5;
    }
  }
  layoutGroup();

  const mouse = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };

  window.addEventListener(
    "pointermove",
    (e) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true }
  );

  let scrollY = 0;
  window.addEventListener(
    "scroll",
    () => {
      scrollY = window.scrollY;
    },
    { passive: true }
  );

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    layoutGroup();
  }
  window.addEventListener("resize", onResize);

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    mouse.x += (target.x - mouse.x) * 0.04;
    mouse.y += (target.y - mouse.y) * 0.04;

    const scrollFactor = Math.min(scrollY / (window.innerHeight * 1.5), 1);

    ico.rotation.y = t * 0.18 + mouse.x * 0.25;
    ico.rotation.x = t * 0.08 + mouse.y * 0.15;
    core.rotation.y = -t * 0.35;
    core.rotation.z = t * 0.12;

    ringA.rotation.z = t * 0.22;
    ringB.rotation.z = -t * 0.16;

    nodes.forEach((node) => {
      const d = node.userData;
      const ang = d.theta + t * d.speed;
      node.position.set(
        Math.cos(ang) * Math.cos(d.phi) * d.radius,
        Math.sin(d.phi + t * 0.2) * d.radius * 0.55,
        Math.sin(ang) * Math.cos(d.phi) * d.radius
      );
      node.rotation.x = t * d.spin;
      node.rotation.y = t * d.spin * 0.7;
    });

    group.rotation.y = mouse.x * 0.35 + scrollFactor * 0.6;
    group.rotation.x = mouse.y * 0.2 - scrollFactor * 0.25;
    group.position.y = (window.innerWidth < 720 ? 1.1 : 0.25) - scrollFactor * 1.8;

    // Fade scene as user scrolls into content
    const opacity = Math.max(0.2, 1 - scrollFactor * 0.8);
    icoMat.opacity = 0.55 * opacity;
    ringMatA.opacity = 0.65 * opacity;
    ringMatB.opacity = 0.45 * opacity;

    renderer.render(scene, camera);
  }

  animate();
}
