import { useEffect, useRef } from "react";
import * as THREE from "three";
import setCharacter from "./utils/character";
import setLighting from "./utils/lighting";
import { useLoading } from "../../context/LoadingProvider";
import handleResize from "./utils/resizeUtils";
import {
  handleMouseMove,
  handleHeadRotation,
  handleTouchMove,
} from "./utils/mouseUtils";
import setAnimations from "./utils/animationUtils";
import { setProgress } from "../Loading";

const disposeObject = (object: THREE.Object3D) => {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    materials.forEach((material) => {
      if (!material) return;
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) value.dispose();
      });
      material.dispose();
    });
  });
};

const Scene = () => {
  const canvasDiv = useRef<HTMLDivElement | null>(null);
  const hoverDivRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef(new THREE.Scene());
  const { setLoading } = useLoading();

  useEffect(() => {
    if (canvasDiv.current) {
      let rect = canvasDiv.current.getBoundingClientRect();
      let container = { width: rect.width, height: rect.height };
      const aspect = container.width / container.height;
      const scene = sceneRef.current;

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        stencil: false,
        depth: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(container.width, container.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;
      canvasDiv.current.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(14.5, aspect, 0.1, 1000);
      camera.position.z = 10;
      camera.position.set(0, 13.1, 24.7);
      camera.zoom = 1.1;
      camera.updateProjectionMatrix();

      let headBone: THREE.Object3D | null = null;
      let screenLight: any | null = null;
      let mixer: THREE.AnimationMixer;
      let loadedCharacter: THREE.Object3D | null = null;
      let animationFrameId: number | null = null;
      let disposed = false;
      let isVisible = true;
      let introTimeout: number | undefined;
      let cleanupAnimations: (() => void) | undefined;

      const clock = new THREE.Clock();

      const light = setLighting(scene);
      let progress = setProgress((value) => setLoading(value));
      const { loadCharacter } = setCharacter(renderer, scene, camera);
      const onResize = () => {
        if (loadedCharacter) {
          handleResize(renderer, camera, canvasDiv, loadedCharacter);
        }
      };

      loadCharacter().then((gltf) => {
        if (gltf) {
          if (disposed) {
            disposeObject(gltf.scene);
            return;
          }
          const animations = setAnimations(gltf);
          cleanupAnimations = animations.dispose;
          hoverDivRef.current && animations.hover(gltf, hoverDivRef.current);
          mixer = animations.mixer;
          let character = gltf.scene;
          loadedCharacter = character;
          scene.add(character);
          headBone = character.getObjectByName("spine006") || null;
          screenLight = character.getObjectByName("screenlight") || null;
          progress.loaded().then(() => {
            if (disposed) return;
            introTimeout = window.setTimeout(() => {
              if (disposed) return;
              light.turnOnLights();
              animations.startIntro();
            }, 2500);
          });
          window.addEventListener("resize", onResize);
        }
      });

      let mouse = { x: 0, y: 0 },
        interpolation = { x: 0.1, y: 0.2 };

      const onMouseMove = (event: MouseEvent) => {
        handleMouseMove(event, (x, y) => (mouse = { x, y }));
      };
      const onTouchMove = (event: TouchEvent) => {
        handleTouchMove(event, (x, y) => (mouse = { x, y }));
      };
      const landingDiv = document.getElementById("landingDiv");
      if (landingDiv) {
        landingDiv.addEventListener("touchmove", onTouchMove, {
          passive: true,
        });
      }

      const render = () => {
        if (disposed || !isVisible || document.hidden) {
          animationFrameId = null;
          return;
        }
        animationFrameId = requestAnimationFrame(render);
        if (headBone) {
          handleHeadRotation(
            headBone,
            mouse.x,
            mouse.y,
            interpolation.x,
            interpolation.y,
            THREE.MathUtils.lerp
          );
          light.setPointLight(screenLight);
        }
        const delta = clock.getDelta();
        if (mixer) {
          mixer.update(delta);
        }
        renderer.render(scene, camera);
      };
      const visibilityObserver = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && animationFrameId === null) {
          render();
        } else if (!isVisible && animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      });
      visibilityObserver.observe(canvasDiv.current);
      const onVisibilityChange = () => {
        if (document.hidden && animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        } else if (!document.hidden && isVisible && animationFrameId === null) {
          render();
        }
      };
      document.addEventListener("visibilitychange", onVisibilityChange);
      document.addEventListener("mousemove", onMouseMove);
      render();
      return () => {
        disposed = true;
        if (introTimeout !== undefined) {
          clearTimeout(introTimeout);
        }
        cleanupAnimations?.();
        light.dispose();
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
        }
        document.removeEventListener("visibilitychange", onVisibilityChange);
        document.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("resize", onResize);
        visibilityObserver.disconnect();
        scene.clear();
        if (loadedCharacter) {
          disposeObject(loadedCharacter);
        }
        renderer.renderLists.dispose();
        renderer.dispose();
        if (canvasDiv.current) {
          renderer.domElement.remove();
        }
        if (landingDiv) {
          landingDiv.removeEventListener("touchmove", onTouchMove);
        }
      };
    }
  }, []);

  return (
    <>
      <div className="character-container">
        <div className="character-model" ref={canvasDiv}>
          <div className="character-rim"></div>
          <div className="character-hover" ref={hoverDivRef}></div>
        </div>
      </div>
    </>
  );
};

export default Scene;
