import Rectangle from './rect.js';
import { Transform } from './transform.js';

// Access RBush from the global scope (loaded via CDN)
const RBush = window.RBush;

// Check if RBush loaded correctly
if (!RBush) {
    console.error("RBush library not found. Make sure it's loaded correctly via CDN script tag.");
    // Optionally, throw an error or disable collision detection
}

// Class to represent a label at a specific step
class Label {
    constructor(id, text, position, rotation, opacity, step, fits = false) {
        this.id = id;           // Unique identifier
        this.text = text;       // Label text
        this.position = position; // [x, y] coordinates in real-world coordinates
        this.rotation = rotation; // Rotation angle in degrees
        this.opacity = opacity;   // Opacity value (0-1)
        this.step = step;         // Key step number
        this.fits = fits;         // Whether the label fits in its current position
    }
}

// Class to handle label interpolation between steps
class LabelInterpolator {
    constructor() {
        this.labels = new Map(); // Store labels by ID
        this.keySteps = new Set(); // Store all key steps
        this.stepHighs = new Map(); // Store step_high for each label
    }

    setStepHighs(stepHighs) {
        this.stepHighs = stepHighs;
    }

    // Add a label at a specific key step
    addLabel(label) {
        if (!this.labels.has(label.id)) {
            this.labels.set(label.id, new Map());
        }
        this.labels.get(label.id).set(label.step, label);
        this.keySteps.add(label.step);
    }

    // Get interpolated label state for a given step
    getInterpolatedLabel(id, currentStep) {
        const labelSteps = this.labels.get(id);
        if (!labelSteps || labelSteps.size === 0) return null; // No steps for this label

        // Get this label's step_high, default if not provided
        const stepHigh = this.stepHighs.get(id) || Infinity; // Use Infinity to prevent premature fade if not set

        // Find the key steps sorted
        const steps = Array.from(labelSteps.keys()).sort((a, b) => a - b);
        const firstStep = steps[0];
        const lastStep = steps[steps.length - 1];
        // const firstLabel = labelSteps.get(firstStep); // State at the first key step

        // // --- 1. Fade-in Logic ---
        // // If currentStep is before the first appearance and the first step is after 0
        // if (currentStep < firstStep && firstStep > 0) {
        //     const fadeFactor = currentStep / firstStep;
        //     // Return the state of the *first* keyframe, but with reduced opacity
        //     return {
        //         id: id,
        //         text: firstLabel.text,
        //         position: firstLabel.position,
        //         rotation: firstLabel.rotation,
        //         opacity: fadeFactor,
        //         step: currentStep,
        //         fits: firstLabel.fits // Use 'fits' status from the first keyframe
        //     };
        // }

        // --- 2. Find Surrounding Key Steps for Interpolation/Fade-out ---
        let prevStep = firstStep;
        let nextStep = firstStep;
        // This loop finds the key step immediately before or at currentStep (prevStep)
        // and the key step immediately after or at currentStep (nextStep)
        for (let i = 0; i < steps.length; i++) {
            if (steps[i] <= currentStep) {
                prevStep = steps[i];
            }
            // Once we find a step >= currentStep, that's our nextStep, and we can stop
            if (steps[i] >= currentStep) {
                nextStep = steps[i];
                break;
            }
        }
        // If currentStep is beyond the last defined step, nextStep will remain as the last step.
        // We handle this in the fade-out logic.

        const prevLabel = labelSteps.get(prevStep);

        // --- 3. Exact Key Step ---
        // If we are exactly at a key step, return that state with full opacity
        // (unless it's the last step and we should be fading out - handled below).
        if (currentStep === prevStep && currentStep < stepHigh) {
             // Ensure opacity is 1 at key steps unless fading out
             // Manually create new object instead of spread syntax
            // return { ...prevLabel, opacity: 1.0, step: currentStep };
            return {
                id: prevLabel.id,
                text: prevLabel.text,
                position: prevLabel.position,
                rotation: prevLabel.rotation,
                opacity: 1.0, // Override opacity
                step: currentStep,
                fits: prevLabel.fits
            };
        }

        // --- 4. Fade-out Logic ---
        // If we're past the *last* defined key step but before the label's step_high
        if (currentStep > lastStep && currentStep < stepHigh) {
            const denominator = stepHigh - lastStep;
            // If stepHigh is equal or very close to lastStep, fade instantly (opacity 0) or avoid division by zero
            if (denominator <= 0) {
                // Return the state of the *last* keyframe with opacity 0
                 const lastLabelState = labelSteps.get(lastStep);
                 // return { ...lastLabelState, opacity: 0, step: currentStep };
                 return {
                    id: lastLabelState.id,
                    text: lastLabelState.text,
                    position: lastLabelState.position,
                    rotation: lastLabelState.rotation,
                    opacity: 0,
                    step: currentStep,
                    fits: lastLabelState.fits
                 };
            }

            const fadeFactor = 1 - ((currentStep - lastStep) / denominator);
            const lastLabelState = labelSteps.get(lastStep); // Get last label state for properties
            // Return the state of the *last* keyframe, but with reduced opacity
            return {
                id: id, // Or lastLabelState.id
                text: lastLabelState.text,
                position: lastLabelState.position,
                rotation: lastLabelState.rotation,
                opacity: Math.max(0, fadeFactor), // Clamp opacity >= 0
                step: currentStep,
                fits: lastLabelState.fits
            };
        }

        // --- 5. Past stepHigh ---
        // If currentStep is at or beyond stepHigh, the label should not be shown
        if (currentStep >= stepHigh) {
            return null;
        }

        // --- 6. Interpolation Logic ---
        // This is reached if prevStep < currentStep < nextStep
        if (prevStep !== nextStep) {
            const nextLabel = labelSteps.get(nextStep);
            // Prevent division by zero if prevStep and nextStep are the same (shouldn't happen here, but safe)
             const denom = nextStep - prevStep;
             // if (denom === 0) return { ...prevLabel, opacity: 1.0, step: currentStep }; // Should be at prevStep
             if (denom === 0) {
                 return {
                    id: prevLabel.id,
                    text: prevLabel.text,
                    position: prevLabel.position,
                    rotation: prevLabel.rotation,
                    opacity: 1.0,
                    step: currentStep,
                    fits: prevLabel.fits
                 };
             }

            const factor = (currentStep - prevStep) / denom;

            // Linear interpolation for position
            const interpolatedX = this.interpolatePosition(prevLabel.position, nextLabel.position, factor)[0];
            const interpolatedY = this.interpolatePosition(prevLabel.position, nextLabel.position, factor)[1];

            // Angle interpolation with proper wrapping
            const interpolatedAngle = this.interpolateRotation(prevLabel.rotation, nextLabel.rotation, factor);

            // Return the interpolated state with full opacity
            return {
                id: id,
                text: prevLabel.text, // Text typically doesn't change between keyframes
                position: [interpolatedX, interpolatedY],
                rotation: interpolatedAngle,
                opacity: 1.0,
                step: currentStep,
                // Use prevLabel's fits status during interpolation. Interpolating 'fits' is tricky.
                fits: prevLabel.fits
            };
        }

        // Fallback case: If none of the above conditions were met (should be unlikely)
        console.warn(`LabelInterpolator: Unhandled case for label ${id} at step ${currentStep}. Prev: ${prevStep}, Next: ${nextStep}, Last: ${lastStep}, High: ${stepHigh}`);
        // Maybe return the previous label state as a fallback?
         // return { ...prevLabel, opacity: 1.0, step: currentStep }; // Return state at prevStep if possible
         return {
            id: prevLabel.id,
            text: prevLabel.text,
            position: prevLabel.position,
            rotation: prevLabel.rotation,
            opacity: 1.0,
            step: currentStep,
            fits: prevLabel.fits
         };
    }

    // Helper interpolation functions
    interpolatePosition(start, end, factor) {
        return [
            start[0] + (end[0] - start[0]) * factor,
            start[1] + (end[1] - start[1]) * factor
        ];
    }

    interpolateRotation(start, end, factor) {
        // Handle angle wrapping (e.g., going from 350° to 10°)
        let diff = end - start;
        if (Math.abs(diff) > 180) {
            if (diff > 0) {
                diff -= 360;
            } else {
                diff += 360;
            }
        }
        return start + diff * factor;
    }
}

// Adapter class for scale/step conversion
class ScaleStepAdapter {
    constructor(startScale = 10000, totalObjects = 12112) {
        this.startScale = startScale;  // Base scale (1:10000)
        this.totalObjects = totalObjects;  // Total number of objects on base map
    }

    // Convert step to scale
    get_St_from_step(step) {
        if (step >= this.totalObjects) return Infinity;
        try {
            return this.startScale * Math.sqrt(this.totalObjects / (this.totalObjects - step));
        } catch (e) {
            return Infinity;
        }
    }

    // Convert scale to step
    get_step_from_St(scale) {
        const reductionFactor = 1 - Math.pow(this.startScale / scale, 2);
        return this.totalObjects * reductionFactor;
    }

    // Get time factor for animation (simplified version)
    get_time_factor() {
        // Fixed time factor for now
        return 1;
    }

    // Get the snapped step for zooming
    get_zoom_snappedstep_from_St(scale) {
        const step = this.get_step_from_St(scale);
        // Simple rounding to nearest integer
        return Math.round(step);
    }
}

// Main renderer class
class LabelRenderer {
    constructor(canvas, initialization = {}) {
        console.log('Creating LabelRenderer with canvas:', canvas);
        
        // Create PIXI application
        this.app = new window.PIXI.Application({
            view: canvas,
            width: canvas.width,
            height: canvas.height,
            backgroundColor: 0xFFFFFF,
            clearBeforeRender: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });

        // Create container for labels
        this.labelContainer = new window.PIXI.Container();
        this.app.stage.addChild(this.labelContainer);

        // Store labels for easy access
        this.labels = new Map();
        
        // Initialize viewport
        this.viewport = new Rectangle(0, 0, canvas.width, canvas.height);
        
        // Initialize transform with provided or default values
        const centerWorld = initialization.center2d || [86374.76216448813, 446068.2661266453];
        const viewportSize = [canvas.width, canvas.height];
        const scaleDenominator = initialization.scale_den || 10000;
        
        console.log('Initializing transform with:', {
            centerWorld,
            viewportSize,
            scaleDenominator
        });
        
        this.transform = new Transform(centerWorld, viewportSize, scaleDenominator);
        
        // Add coordTransformer as a reference to this for backward compatibility
        this.coordTransformer = this;
        
        // Initialize visibleWorld based on the transform
        this.visibleWorld = this.transform.getVisibleWorld();
        
        // Create scale/step adapter
        this.scaleStepAdapter = new ScaleStepAdapter(
            initialization.start_scale_Sb || 10000,
            initialization.no_of_objects_Nb || 12112
        );
        
        // Font configuration
        this.fontFamily = 'Arial';
        this.fontSize = 12;
        this.fontWeight = 'normal';
        this.fontStyle = 'normal';
        this.labelPadding = 2; // Add default padding

        this.interpolator = new LabelInterpolator();
        this.currentStep = 0;

        // Add collision detection flag
        this.collisionDetectionEnabled = true;
    }

    // Set font configuration
    setFont(family = 'Arial', size = 12, weight = 'normal', style = 'normal') {
        this.fontFamily = family;
        this.fontSize = size;
        this.fontWeight = weight;
        this.fontStyle = style;
    }

    // Get the current font string
    getFontString() {
        return `${this.fontStyle} ${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
    }

    // Set the visible world area
    setVisibleWorld(visibleWorld) {
        this.visibleWorld = visibleWorld;
        this.updateTransform();
        // Clear the internal Map tracking labels
        this.labels.clear(); 
        // ALSO remove all existing PIXI objects from the container
        this.labelContainer.removeChildren(); 
    }

    // Get the current visible world area
    getVisibleWorld() {
        return this.visibleWorld;
    }

    // Set the viewport
    setViewport(viewport) {
        this.viewport = viewport;
        this.updateTransform();
    }

    // Add setStep method
    setStep(step) {
        // Ensure step doesn't go below 0 or exceed reasonable limits if needed
        this.currentStep = Math.max(0, step);
        console.log(`Renderer step set to: ${this.currentStep}`); // Add log for debugging
    }

    // Update current step (kept for potential external use, but setStep is preferred)
    update(currentStep) {
        this.setStep(currentStep);
    }

    // Add label data
    addLabel(label) {
        // Skip labels with null or empty text
        if (!label || !label.text || label.text === 'null') {
            console.log('Skipping invalid label:', label);
            return;
        }
        console.log('Adding label:', label);
        this.interpolator.addLabel(label);
    }

    // Clear all labels
    clearLabels() {
        this.interpolator = new LabelInterpolator();
        this.labelContainer.removeChildren();
        this.labels.clear();
    }

    // Get the bounding box of a label in screen coordinates
    getLabelBoundingBox(label) {
        const [screenX, screenY] = this.worldToScreen(
            label.position[0],
            label.position[1]
        );

        // Create temporary PIXI.Text to measure dimensions
        const tempText = new window.PIXI.Text(label.text, {
            fontFamily: this.fontFamily,
            fontSize: this.fontSize,
            fontWeight: this.fontWeight,
            fontStyle: this.fontStyle
        });

        const textWidth = tempText.width;
        const textHeight = tempText.height;
        tempText.destroy(); // Clean up the temporary object

        // Calculate bounding box with padding, centered on the anchor point
        const halfWidth = (textWidth / 2) + this.labelPadding;
        const halfHeight = (textHeight / 2) + this.labelPadding;

        // Adjust for rotation - for simplicity, we'll use an Axis-Aligned Bounding Box (AABB)
        // that encompasses the rotated text. A more precise check would use Oriented Bounding Boxes (OBB).
        const angleRad = this.worldToScreenRotation(label.rotation) * Math.PI / 180;
        const cosA = Math.cos(angleRad);
        const sinA = Math.sin(angleRad);

        // Calculate corners of the unrotated box relative to center
        const corners = [
            [-halfWidth, -halfHeight],
            [ halfWidth, -halfHeight],
            [ halfWidth,  halfHeight],
            [-halfWidth,  halfHeight]
        ];

        // Rotate corners and find min/max X and Y
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        corners.forEach(([x, y]) => {
            const rotatedX = x * cosA - y * sinA;
            const rotatedY = x * sinA + y * cosA;
            minX = Math.min(minX, screenX + rotatedX);
            minY = Math.min(minY, screenY + rotatedY);
            maxX = Math.max(maxX, screenX + rotatedX);
            maxY = Math.max(maxY, screenY + rotatedY);
        });

        return {
            id: label.id, // Keep track of which label this box belongs to
            minX: minX,   // Use minX for rbush
            minY: minY,   // Use minY for rbush
            maxX: maxX,   // Use maxX for rbush
            maxY: maxY,   // Use maxY for rbush
            // Store the original label object for reference
            label: label
        };
    }

    // Check if two bounding boxes overlap (AABB intersection test)
    doBoxesOverlap(box1, box2) {
        // Check for no overlap in x-axis
        if (box1.x + box1.width < box2.x || box2.x + box2.width < box1.x) {
            return false;
        }
        // Check for no overlap in y-axis
        if (box1.y + box1.height < box2.y || box2.y + box2.height < box1.y) {
            return false;
        }
        // Overlap exists if none of the above conditions are met
        return true;
    }

    // Resolve collisions between labels using rbush for efficiency
    resolveCollisions(potentialLabels) {
        if (!potentialLabels || potentialLabels.length === 0) {
            return [];
        }

        // 1. Initialize RBush tree
        const tree = new RBush();

        // 2. Calculate bounding boxes suitable for rbush
        const labelBoxes = potentialLabels.map(label => this.getLabelBoundingBox(label));

        // 3. Sort labels by priority (higher step_high first, then shorter text)
        labelBoxes.sort((a, b) => {
            const stepHighA = this.interpolator.stepHighs.get(a.label.id) || 0;
            const stepHighB = this.interpolator.stepHighs.get(b.label.id) || 0;

            if (stepHighA !== stepHighB) {
                return stepHighB - stepHighA; // Higher step_high first
            }
            return a.label.text.length - b.label.text.length; // Shorter text first
        });

        const resolvedLabels = []; // Store the actual label objects to render

        // 4. Iterate through sorted boxes, query tree, and insert if no collision
        for (const currentBox of labelBoxes) {
            // Define the search area based on the current box
            const searchArea = {
                minX: currentBox.minX,
                minY: currentBox.minY,
                maxX: currentBox.maxX,
                maxY: currentBox.maxY
            };

            // Query the tree for potential collisions
            const collisions = tree.search(searchArea);

            // If no collisions found with already placed labels
            if (collisions.length === 0) {
                // Add the current box to the tree
                tree.insert(currentBox);
                // Add the original label object to the list of labels to render
                resolvedLabels.push(currentBox.label);
            }
            // If collision, this label is implicitly hidden (not added to resolvedLabels)
        }

        // 5. Return the original label objects that were successfully placed
        return resolvedLabels;
    }

    // Add method to toggle collision detection
    setCollisionDetection(enabled) {
        this.collisionDetectionEnabled = enabled;
        // Trigger a re-render when collision detection is toggled
        this.render();
    }

    // Modify the render method to respect collision detection setting
    render() {
        // Explicitly clear the renderer (though clearBeforeRender should handle this)
        this.app.renderer.clear();

        // 1. Get all potentially visible interpolated labels for the current step
        const potentialLabels = [];
        for (const id of this.interpolator.labels.keys()) {
            const label = this.interpolator.getInterpolatedLabel(id, this.currentStep);
            // Basic filtering: check if label exists, has text, is opaque, and is within world bounds
            if (label && label.text && label.text !== 'null' && label.opacity > 0 && this.isLabelVisible(label)) {
                potentialLabels.push(label);
            }
        }

        // 2. Resolve collisions only if collision detection is enabled
        const labelsToRender = this.collisionDetectionEnabled ? 
            this.resolveCollisions(potentialLabels) : 
            potentialLabels;
        const labelsToRenderIds = new Set(labelsToRender.map(l => l.id));

        // 3. Clean up PIXI objects for labels that are no longer rendered
        for (const [id, pixiText] of this.labels.entries()) {
            if (!labelsToRenderIds.has(id)) {
                this.labelContainer.removeChild(pixiText);
                pixiText.destroy(); // Free resources
                this.labels.delete(id);
            }
        }

        // 4. Render the resolved labels
        for (const label of labelsToRender) {
            this.renderLabel(label);
        }
    }

    // Render a single label
    renderLabel(label) {
        // Create or update PIXI.Text
        let pixiText;
        if (this.labels.has(label.id)) {
            pixiText = this.labels.get(label.id);
        } else {
            pixiText = new window.PIXI.Text(label.text, {
                fontFamily: this.fontFamily,
                fontSize: this.fontSize,
                fontWeight: this.fontWeight,
                fontStyle: this.fontStyle,
                fill: 0x000000,
                align: 'center'
            });
            this.labels.set(label.id, pixiText);
            this.labelContainer.addChild(pixiText);
        }

        // Update text properties
        pixiText.text = label.text;
        pixiText.style.fontFamily = this.fontFamily;
        pixiText.style.fontSize = this.fontSize;
        pixiText.style.fontWeight = this.fontWeight;
        pixiText.style.fontStyle = this.fontStyle;
        pixiText.alpha = label.opacity;

        // Position using Transform's worldToScreen method
        const [screenX, screenY] = this.worldToScreen(
            label.position[0],
            label.position[1]
        );
        
        // Set the position with the anchor point at the center
        pixiText.x = screenX;
        pixiText.y = screenY;
        pixiText.anchor.set(0.5); // Center the text
        
        // Convert rotation from degrees to radians
        pixiText.rotation = this.worldToScreenRotation(label.rotation) * Math.PI / 180;
    }

    // Check if a label's *position* is within the visible world
    isLabelVisible(label) {
        // Get the current visible world from the transform
        const visibleWorld = this.transform.getVisibleWorld();
        
        const [x, y] = label.position;
        return (
            x >= visibleWorld.xmin &&
            x <= visibleWorld.xmax &&
            y >= visibleWorld.ymin &&
            y <= visibleWorld.ymax &&
            label.opacity > 0 // Also check opacity
        );
    }

    // Update transform when viewport or visible world changes
    updateTransform() {
        // Get the center of the visible world
        const centerWorld = this.visibleWorld.center();
        const viewportSize = [this.viewport.width(), this.viewport.height()];
        const scaleDenominator = this.transform.getScaleDenominator();
        
        // Reinitialize transform with new parameters
        this.transform.initTransform(centerWorld, viewportSize, scaleDenominator);
        
        // Update the visible world to reflect the actual transform state
        this.visibleWorld = this.transform.getVisibleWorld();
        
        // Log the transformation parameters for debugging
        console.log('Transform updated:', {
            centerWorld,
            viewportSize,
            scaleDenominator,
            visibleWorld: this.visibleWorld
        });
    }

    // Convert world coordinates to screen coordinates using Transform
    worldToScreen(worldX, worldY) {
        // Use the transform's forward method
        const worldVec = [worldX, worldY, 0];
        
        // Transform from world to viewport coordinates
        const result = this.transform.forward(worldVec);
        
        return [result[0], result[1]];
    }

    // Convert screen coordinates to world coordinates using Transform
    screenToWorld(screenX, screenY) {
        // Use the transform's backward method
        const vec3 = [screenX, screenY, 0];
        const worldVec3 = this.transform.backward(vec3);
        return [worldVec3[0], worldVec3[1]];
    }

    // Convert rotation angle from world to screen coordinates
    worldToScreenRotation(worldAngle) {
        // No transformation needed for rotation in this system
        return worldAngle;
    }

    // --- MODIFIED Handle zooming ---
    zoom(factor, x, y) {
        // 1. Apply smooth visual zoom using the transform
        // Assuming compute_zoom_parameters updates the transform's scale based on factor/x/y
        // We call it with snapping DISABLED (false)
        this.transform.compute_zoom_parameters(
            this.scaleStepAdapter, // Pass adapter if needed by the method internally
            factor,
            x,
            y,
            false // Disable snapping for smooth visual zoom
        );

        // 2. Update the visible world based on the new transform state
        this.visibleWorld = this.transform.getVisibleWorld();

        // 3. Get the new scale that resulted from the smooth zoom
        const newScale = this.transform.getScaleDenominator();

        // 4. Calculate the snapped step corresponding to this new scale
        const snappedStep = this.scaleStepAdapter.get_zoom_snappedstep_from_St(newScale);

        // 5. Update the renderer's current step for label interpolation
        this.setStep(snappedStep);

        // Return the new scale and step for the UI to update sliders
        return { newScale, snappedStep };
    }

    // --- NEW Method to set scale directly ---
    setScale(scale) {
        console.log(`[renderer.setScale] Attempting to set scale to: ${scale}`);

        // Get the current viewport size
        const viewportSize = [this.viewport.width(), this.viewport.height()];

        // --- FIX: Get center from current visibleWorld, not assuming transform property ---
        // const centerWorld = this.transform.centerWorld; // Assumes centerWorld is reliably stored on transform (Incorrect assumption)
        let centerWorld = null;
        if (this.visibleWorld && typeof this.visibleWorld.center === 'function') {
             centerWorld = this.visibleWorld.center(); // Get center from the current Rectangle
        } else {
             console.error("[renderer.setScale] Cannot get center from visibleWorld!", this.visibleWorld);
             // Fallback: Try to get it from transform if it *might* exist sometimes?
             // Or use a default known center? For now, we will let the check below handle it.
             centerWorld = this.transform.centerWorld; // Keep original attempt as last resort maybe?
        }
        // -----------------------------------------------------------------------------

        console.log(`[renderer.setScale] Using center: ${JSON.stringify(centerWorld)}, viewport: ${JSON.stringify(viewportSize)}, scale: ${scale}`);

        // Check if we have valid parameters BEFORE trying to init
        if (centerWorld && centerWorld.length === 2 && !isNaN(centerWorld[0]) && !isNaN(centerWorld[1]) && viewportSize[0] > 0 && viewportSize[1] > 0 && scale > 0) {
             this.transform.initTransform(centerWorld, viewportSize, scale);
             console.log(`[renderer.setScale] Transform scale after init: ${this.transform.getScaleDenominator()}`);
        } else {
             console.warn(`[renderer.setScale] Could not set scale ${scale}. Invalid parameters. Center: ${JSON.stringify(centerWorld)}, Viewport: ${JSON.stringify(viewportSize)}`);
             return; // Don't proceed if scale couldn't be set
        }

        // 3. Update the visible world
        this.visibleWorld = this.transform.getVisibleWorld();
        console.log(`[renderer.setScale] Visible world after setScale:`, this.visibleWorld);

        // 4. Calculate the corresponding snapped step
        const snappedStep = this.scaleStepAdapter.get_zoom_snappedstep_from_St(scale);

        // 5. Set the renderer's current step
        this.setStep(snappedStep);

        console.log(`[renderer.setScale] Scale set to ${scale}, corresponding step set to ${snappedStep}`);
    }

    // Handle panning
    pan(dx, dy) {
        this.transform.pan(dx, dy);
        // Update visible world after panning
        this.visibleWorld = this.transform.getVisibleWorld();
    }
}

export { Label, LabelRenderer, ScaleStepAdapter }; 