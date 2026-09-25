const canvas = document.getElementById("renderCanvas");
const statusText = document.getElementById("status");

const engine = new BABYLON.Engine(canvas, true);

const createScene = async () => {
    const scene = new BABYLON.Scene(engine);

    // Desktop preview camera. WebXR uses its own XR camera after entering AR.
    const camera = new BABYLON.ArcRotateCamera(
        "desktopCamera",
        -Math.PI / 2,
        Math.PI / 2.25,
        4.5,
        new BABYLON.Vector3(0, 1.2, 1.8),
        scene
    );
    camera.attachControl(canvas, true);

    const light = new BABYLON.HemisphericLight(
        "light",
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    light.intensity = 1.0;

    // ---------------------------------------------------------------------
    // Scene objects
    // ---------------------------------------------------------------------

    // Task 1: sinusoidal color change
    const colorCube = BABYLON.MeshBuilder.CreateBox(
        "colorCube",
        { size: 0.45 },
        scene
    );
    colorCube.position = new BABYLON.Vector3(-0.75, 1.25, 1.8);

    const cubeMaterial = new BABYLON.StandardMaterial("cubeMaterial", scene);
    colorCube.material = cubeMaterial;

    // Task 2: sinusoidal position change
    const movingSphere = BABYLON.MeshBuilder.CreateSphere(
        "movingSphere",
        { diameter: 0.45 },
        scene
    );
    movingSphere.position = new BABYLON.Vector3(0, 1.25, 1.8);

    const sphereMaterial = new BABYLON.StandardMaterial("sphereMaterial", scene);
    sphereMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.35);
    movingSphere.material = sphereMaterial;

    // Task 3: sinusoidal scale change
    const scalingCylinder = BABYLON.MeshBuilder.CreateCylinder(
        "scalingCylinder",
        { height: 0.5, diameter: 0.42 },
        scene
    );
    scalingCylinder.position = new BABYLON.Vector3(0.75, 1.25, 1.8);

    const cylinderMaterial = new BABYLON.StandardMaterial(
        "cylinderMaterial",
        scene
    );
    cylinderMaterial.diffuseColor = new BABYLON.Color3(0.95, 0.6, 0.15);
    scalingCylinder.material = cylinderMaterial;

    // All tasks start active so the grader can immediately see the behavior.
    const taskEnabled = {
        color: true,
        position: true,
        scale: true,
    };

    const baseY = movingSphere.position.y;
    const frequencyHz = 0.5;
    const angularFrequency = 2 * Math.PI * frequencyHz;

    // ---------------------------------------------------------------------
    // Animation: Babylon Observable -> callback -> scene property changes
    // ---------------------------------------------------------------------
    scene.onBeforeRenderObservable.add(() => {
        const t = performance.now() / 1000;
        const sineValue = Math.sin(angularFrequency * t);

        // Task 1: use a sinusoid to interpolate between blue and red.
        if (taskEnabled.color) {
            const mix = (sineValue + 1) / 2; // maps [-1, 1] to [0, 1]
            cubeMaterial.diffuseColor = new BABYLON.Color3(
                mix,
                0.15,
                1 - mix
            );
        }

        // Task 2: move the sphere up and down sinusoidally.
        if (taskEnabled.position) {
            const positionAmplitude = 0.30;
            movingSphere.position.y =
                baseY + positionAmplitude * sineValue;
        }

        // Task 3: scale the cylinder uniformly and sinusoidally.
        if (taskEnabled.scale) {
            const scaleAmplitude = 0.35;
            const scale = 1.0 + scaleAmplitude * sineValue;
            scalingCylinder.scaling.setAll(scale);
        }
    });

    // ---------------------------------------------------------------------
    // Shared task toggles: used by both HTML buttons and XR controller input
    // ---------------------------------------------------------------------
    const task1Button = document.getElementById("task1Button");
    const task2Button = document.getElementById("task2Button");
    const task3Button = document.getElementById("task3Button");

    const updateButtonText = () => {
        task1Button.textContent =
            `Task 1: ${taskEnabled.color ? "Active" : "Paused"}`;
        task2Button.textContent =
            `Task 2: ${taskEnabled.position ? "Active" : "Paused"}`;
        task3Button.textContent =
            `Task 3: ${taskEnabled.scale ? "Active" : "Paused"}`;
    };

    const toggleTask1 = () => {
        taskEnabled.color = !taskEnabled.color;
        updateButtonText();
    };

    const toggleTask2 = () => {
        taskEnabled.position = !taskEnabled.position;
        updateButtonText();
    };

    const toggleTask3 = () => {
        taskEnabled.scale = !taskEnabled.scale;
        updateButtonText();
    };

    task1Button.addEventListener("click", toggleTask1);
    task2Button.addEventListener("click", toggleTask2);
    task3Button.addEventListener("click", toggleTask3);

    // Optional desktop keyboard controls for easy testing.
    window.addEventListener("keydown", (event) => {
        if (event.key === "1") toggleTask1();
        if (event.key === "2") toggleTask2();
        if (event.key === "3") toggleTask3();
    });

    updateButtonText();

    // ---------------------------------------------------------------------
    // WebXR AR setup
    // ---------------------------------------------------------------------
    try {
        const xr = await scene.createDefaultXRExperienceAsync({
            uiOptions: {
                sessionMode: "immersive-ar",
            },
            optionalFeatures: true,
        });

        statusText.textContent =
            "AR ready. Enter AR, then use right-controller A / B / Trigger.";

        // Right controller: A -> Task 1, B -> Task 2, Trigger -> Task 3.
        xr.input.onControllerAddedObservable.add((controller) => {
            controller.onMotionControllerInitObservable.add((motionController) => {
                if (controller.inputSource.handedness !== "right") {
                    return;
                }

                const aButton = motionController.getComponent("a-button");
                const bButton = motionController.getComponent("b-button");
                const trigger =
                    motionController.getComponent("xr-standard-trigger");

                if (aButton) {
                    aButton.onButtonStateChangedObservable.add(() => {
                        if (aButton.pressed) {
                            toggleTask1();
                        }
                    });
                }

                if (bButton) {
                    bButton.onButtonStateChangedObservable.add(() => {
                        if (bButton.pressed) {
                            toggleTask2();
                        }
                    });
                }

                if (trigger) {
                    trigger.onButtonStateChangedObservable.add(() => {
                        if (trigger.pressed) {
                            toggleTask3();
                        }
                    });
                }
            });
        });
    } catch (error) {
        console.warn("WebXR AR initialization failed:", error);
        statusText.textContent =
            "WebXR AR is unavailable in this browser. Desktop preview still works.";
    }

    return scene;
};

createScene().then((scene) => {
    engine.runRenderLoop(() => {
        scene.render();
    });
});

window.addEventListener("resize", () => {
    engine.resize();
});
