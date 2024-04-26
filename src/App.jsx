import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { XREstimatedLight } from 'three/examples/jsm/webxr/XREstimatedLight';
import './App.css';
import { initializeApp } from "firebase/app";

function App() {
  // Import the functions you need from the SDKs you need

  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {

    apiKey: "AIzaSyDBJumCMmUrPNXC2lWzbFHNN6OgQrAbIZc",
    authDomain: "lifetimefurnitureweb.firebaseapp.com",
    projectId: "lifetimefurnitureweb",
    storageBucket: "lifetimefurnitureweb.appspot.com",
    messagingSenderId: "53106587573",
    appId: "1:53106587573:web:7e2745111086d888ce4bfc"

  };



  // Initialize Firebase
  const app = initializeApp(firebaseConfig);

  const [scene, setScene] = useState(null);
  const [camera, setCamera] = useState(null);
  const [renderer, setRenderer] = useState(null);
  const [reticle, setReticle] = useState(null);
  const [hitTestSource, setHitTestSource] = useState(null);
  const [hitTestSourceRequested, setHitTestSourceRequested] = useState(false);
  const [models, setModels] = useState([
    './dylan_armchair_yolk_yellow.glb',
    './ivan_armchair_mineral_blue.glb',
    './marble_coffee_table.glb',
    './flippa_functional_coffee_table_w._storagewalnut.glb',
    './frame_armchairpetrol_velvet_with_gold_frame.glb',
    './elnaz_nesting_side_tables_brass__green_marble.glb'
  ]);
  const [modelScaleFactor, setModelScaleFactor] = useState([0.01, 0.01, 0.005, 0.01, 0.01, 0.01]);
  const [items, setItems] = useState([]);
  const [itemSelectedIndex, setItemSelectedIndex] = useState(0);
  const [controller, setController] = useState(null);

  useEffect(() => {
    init();
    setupFurnitureSelection();
    animate();

    return () => {
      // Clean up Three.js scene on unmount
      if (renderer) {
        renderer.setAnimationLoop(null);
        renderer.xr.enabled = false;
        renderer.dispose();
      }
    };
  }, []);

  function init() {
    const myCanvas = document.getElementById('canvas');
    const newScene = new THREE.Scene();
    const newCamera = new THREE.PerspectiveCamera(
      70,
      myCanvas.innerWidth / myCanvas.innerHeight,
      0.01,
      20
    );

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    newScene.add(light);

    const newRenderer = new THREE.WebGLRenderer({
      canvas: myCanvas,
      antialias: true,
      alpha: true
    });
    newRenderer.setPixelRatio(window.devicePixelRatio);
    newRenderer.setSize(myCanvas.innerWidth, myCanvas.innerHeight);
    newRenderer.xr.enabled = true;

    const xrLight = new XREstimatedLight(newRenderer);
    xrLight.addEventListener('estimationstart', () => {
      newScene.add(xrLight);
      newScene.remove(light);
      if (xrLight.environment) {
        newScene.environment = xrLight.environment;
      }
    });

    xrLight.addEventListener('estimationend', () => {
      newScene.add(light);
      newScene.remove(xrLight);
    });

    const arButton = ARButton.createButton(newRenderer, {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'light-estimation'],
      domOverlay: { root: document.body }
    });
    arButton.style.bottom = '20%';
    document.body.appendChild(arButton);

    const newController = newRenderer.xr.getController(0);
    newController.addEventListener('select', onSelect);
    newScene.add(newController);

    const newReticle = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial()
    );
    newReticle.matrixAutoUpdate = false;
    newReticle.visible = false;
    newScene.add(newReticle);

    setScene(newScene);
    setCamera(newCamera);
    setRenderer(newRenderer);
    setController(newController);
    setReticle(newReticle);

    loadModels(newScene);
  }

  function loadModels(scene) {
    const loaders = models.map(() => new GLTFLoader());
    Promise.all(loaders.map((loader, index) => loadModel(loader, index))).then(
      (loadedModels) => {
        setItems(loadedModels);
      }
    );
  }

  function loadModel(loader, index) {
    return new Promise((resolve) => {
      loader.load(models[index], (glb) => {
        const model = glb.scene;
        resolve(model);
      });
    });
  }

  function onSelect() {
    if (reticle.visible) {
      const newModel = items[itemSelectedIndex].clone();
      newModel.visible = true;
      reticle.matrix.decompose(
        newModel.position,
        newModel.quaternion,
        newModel.scale
      );
      const scaleFactor = modelScaleFactor[itemSelectedIndex];
      newModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
      scene.add(newModel);
    }
  }

  function onClicked(e, selectItem, index) {
    setItemSelectedIndex(index);
    for (let i = 0; i < models.length; i++) {
      const el = document.querySelector(`#item${i}`);
      el.classList.remove('clicked');
    }
    e.target.classList.add('clicked');
  }

  function setupFurnitureSelection() {
    for (let i = 0; i < models.length; i++) {
      const el = document.querySelector(`#item${i}`);
      el.addEventListener('beforexrselect', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClicked(e, items[i], i);
      });
    }
  }

  function animate() {
    if (renderer) {
      renderer.setAnimationLoop(render);
    }
  }

  function render(timestamp, frame) {
    if (frame) {
      const referenceSpace = renderer.xr.getReferenceSpace();
      const session = renderer.xr.getSession();

      if (!hitTestSourceRequested) {
        session.requestReferenceSpace('viewer').then((referenceSpace) => {
          session
            .requestHitTestSource({ space: referenceSpace })
            .then((source) => {
              setHitTestSource(source);
            });
        });

        session.addEventListener('end', () => {
          setHitTestSourceRequested(false);
          setHitTestSource(null);
        });

        setHitTestSourceRequested(true);
      }

      if (hitTestSource) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);

        if (hitTestResults.length) {
          const hit = hitTestResults[0];
          reticle.visible = true;
          reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
        } else {
          reticle.visible = false;
        }
      }

    }

    renderer.render(scene, camera);
  }

  return <div className="App"></div>;
}

export default App;
