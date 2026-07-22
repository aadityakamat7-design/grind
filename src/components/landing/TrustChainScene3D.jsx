import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const NODE_DEFS = [
  { label: "Teen", icon: "🧑", pos: new THREE.Vector3(-2.3, 0.6, 0), appearAt: 0 },
  { label: "Parent", icon: "👪", pos: new THREE.Vector3(0, -0.5, 0.3), appearAt: 0.25 },
  { label: "Neighbor", icon: "🏠", pos: new THREE.Vector3(2.3, 0.6, 0), appearAt: 0.5 },
];

function clamp(v) {
  return Math.min(1, Math.max(0, v));
}

function makeLabelSprite(icon, text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "48px sans-serif";
  ctx.fillText(icon, 128, 44);
  ctx.font = "bold 30px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, 128, 96);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, opacity: 0 });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.8, 0.9, 1);
  return sprite;
}

function makeLine(start, end) {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, start.clone()]);
  const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
  const line = new THREE.Line(geometry, material);
  line.userData = { start, end };
  return line;
}

function updateLine(line, segProgress) {
  const { start, end } = line.userData;
  const p = clamp(segProgress);
  const currentEnd = start.clone().lerp(end, p);
  const positions = line.geometry.attributes.position;
  positions.setXYZ(0, start.x, start.y, start.z);
  positions.setXYZ(1, currentEnd.x, currentEnd.y, currentEnd.z);
  positions.needsUpdate = true;
}

// Full 3D "trust chain" scene: three floating nodes appear, lines draw between
// them, and a shield scales/pulses in — entirely driven by `progressRef.current`
// (0-1), which the parent updates from a scroll-linked GSAP ScrollTrigger.
// This component owns its own rAF loop purely to render smoothly; it never
// advances progress on its own — it only reads whatever the ref currently holds.
export default function TrustChainScene3D({ progressRef }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(3, 4, 5);
    scene.add(dirLight);

    const nodeMeshes = NODE_DEFS.map((def) => {
      const geo = new THREE.SphereGeometry(0.55, 24, 24);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(def.pos);
      mesh.scale.set(0.001, 0.001, 0.001);
      group.add(mesh);

      const sprite = makeLabelSprite(def.icon, def.label);
      sprite.position.copy(def.pos.clone().add(new THREE.Vector3(0, 1, 0)));
      group.add(sprite);

      return { mesh, sprite, appearAt: def.appearAt };
    });

    const line1 = makeLine(NODE_DEFS[0].pos, NODE_DEFS[1].pos);
    const line2 = makeLine(NODE_DEFS[1].pos, NODE_DEFS[2].pos);
    group.add(line1, line2);

    const shieldGroup = new THREE.Group();
    const bodyGeo = new THREE.OctahedronGeometry(0.5, 0);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.2,
      emissive: 0x222222,
      emissiveIntensity: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    shieldGroup.add(body);
    const shackleGeo = new THREE.TorusGeometry(0.28, 0.06, 8, 20, Math.PI);
    const shackle = new THREE.Mesh(shackleGeo, bodyMat);
    shackle.position.set(0, 0.4, 0);
    shieldGroup.add(shackle);
    shieldGroup.position.set(0, 0, 0.6);
    shieldGroup.scale.set(0, 0, 0);
    group.add(shieldGroup);

    let raf;
    const clock = new THREE.Clock();

    function animate() {
      raf = requestAnimationFrame(animate);
      const progress = progressRef.current || 0;
      const t = clock.getElapsedTime();

      const seg1 = clamp((progress - 0.25) / 0.25);
      const seg2 = clamp((progress - 0.5) / 0.25);
      const lockProgress = clamp((progress - 0.75) / 0.25);

      updateLine(line1, seg1);
      updateLine(line2, seg2);

      nodeMeshes.forEach((n) => {
        const s = clamp((progress - n.appearAt) / 0.15);
        const scale = 0.001 + s * 0.999;
        n.mesh.scale.set(scale, scale, scale);
        n.sprite.material.opacity = s;
      });

      const pulse = lockProgress >= 0.98 ? 1 + Math.sin(t * 2.5) * 0.04 : 1;
      const s = lockProgress * pulse;
      shieldGroup.scale.set(s, s, s);
      bodyMat.emissiveIntensity = 0.3 + (lockProgress >= 0.98 ? Math.abs(Math.sin(t * 2.5)) * 0.4 : 0);

      group.rotation.y = (progress - 0.5) * 0.4 + Math.sin(t * 0.3) * 0.03;
      group.rotation.x = Math.sin(progress * Math.PI) * 0.06;
      camera.position.z = 7 - progress * 0.6;

      renderer.render(scene, camera);
    }
    animate();

    function handleResize() {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      nodeMeshes.forEach((n) => {
        n.mesh.geometry.dispose();
        n.mesh.material.dispose();
        n.sprite.material.map.dispose();
        n.sprite.material.dispose();
      });
      line1.geometry.dispose();
      line1.material.dispose();
      line2.geometry.dispose();
      line2.material.dispose();
      bodyGeo.dispose();
      shackleGeo.dispose();
      bodyMat.dispose();
      renderer.dispose();
    };
  }, [progressRef]);

  return <div ref={mountRef} className="w-full h-full bg-slate-950" />;
}