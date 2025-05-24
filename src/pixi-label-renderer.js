/*
 *  This renderer draws map labels on a transparent canvas that is
 *  stacked above the canvas used by the rest of the map.  It
 *  keeps that canvas in sync with the map's pan/zoom.
 *
 *  Usage (from src/map.js):
 *      import PixiLabelRenderer from './pixi-label-renderer.js';
 *      ...
 *      new PixiLabelRenderer(this, this.msgbus, {
 *          labelUrl: 'label_test/label_anchors.json'
 *      }),
 *
 *  Requirements: PIXI must be loaded **globally** (window.PIXI).  The
 *  easiest is to add the script tag
 *      <script src="https://pixijs.download/release/pixi.min.js"></script>
 *  to the HTML page that creates the map.
 */


import { vec3transform } from './mat4.js';

// Check for RBush (needed for collision detection)
const RBush = window.RBush;
if (!RBush) {
    console.error("RBush library not found. Make sure it's loaded correctly via CDN script tag.");
}

// Label class with interpolation support
class Label {
    constructor(id, text, position, rotation = 0, opacity = 1.0, step = 0) {
        this.id = id;
        this.text = text;
        this.pos = position;  // [x, y] in world coordinates
        this.rotation = rotation;
        this.opacity = opacity;
        this.step = step
    }
}

// Label interpolator class
class LabelInterpolator {
    constructor() {
        this.labels = new Map();  // Store labels by ID
        this.keySteps = new Set();  // Store all key steps
        this.stepHighs = new Map();  // Store step_high for each label
    }

    setStepHighs(stepHighs) {
        this.stepHighs = stepHighs;
    }

    addLabel(label) {
        if (!this.labels.has(label.id)) {
            this.labels.set(label.id, new Map());
        }
        this.labels.get(label.id).set(label.step, label);
        this.keySteps.add(label.step);
    }

    interpolatePosition(start, end, factor) {
        return [
            start[0] + (end[0] - start[0]) * factor,
            start[1] + (end[1] - start[1]) * factor
        ];
    }

    interpolateRotation(start, end, factor) {
        // Ensure angles are between 0 and 360
        start = ((start % 360) + 360) % 360;
        end = ((end % 360) + 360) % 360;

        // Find shortest path
        let diff = end - start;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        return start + diff * factor;
    }

    getInterpolatedLabel(id, currentStep) {
        const labelSteps = this.labels.get(id);
        if (!labelSteps || labelSteps.size === 0) return null;

        const stepHigh = this.stepHighs.get(id) || Infinity;
        const steps = Array.from(labelSteps.keys()).sort((a, b) => a - b);
        const firstStep = steps[0];
        const lastStep = steps[steps.length - 1];

        // Find surrounding key steps
        let prevStep = firstStep;
        let nextStep = firstStep;
        for (let i = 0; i < steps.length; i++) {
            if (steps[i] <= currentStep) prevStep = steps[i];
            if (steps[i] >= currentStep) {
                nextStep = steps[i];
                break;
            }
        }

        const prevLabel = labelSteps.get(prevStep);

        // At exact key step
        if (currentStep === prevStep && currentStep < stepHigh) {
            return new Label(
                prevLabel.id,
                prevLabel.text,
                prevLabel.pos,
                prevLabel.rotation,
                1.0,
                currentStep
            );
        }

        // Fade-out
        if (currentStep > lastStep && currentStep < stepHigh) {
            const denominator = stepHigh - lastStep;
            if (denominator <= 0) return null;

            const fadeFactor = 1 - ((currentStep - lastStep) / denominator);
            const lastLabel = labelSteps.get(lastStep);
            return new Label(
                lastLabel.id,
                lastLabel.text,
                lastLabel.pos,
                lastLabel.rotation,
                Math.max(0, fadeFactor),
                currentStep
            );
        }

        // Past stepHigh
        if (currentStep >= stepHigh) return null;

        // Interpolation between steps
        if (prevStep !== nextStep) {
            const nextLabel = labelSteps.get(nextStep);
            const denom = nextStep - prevStep;
            if (denom === 0) return prevLabel;

            const factor = (currentStep - prevStep) / denom;
            const pos = this.interpolatePosition(prevLabel.pos, nextLabel.pos, factor);
            const rotation = this.interpolateRotation(prevLabel.rotation, nextLabel.rotation, factor);

            return new Label(
                prevLabel.id,
                prevLabel.text,
                pos,
                rotation,
                1.0,
                currentStep
            );
        }

        return prevLabel;
    }
}

export default class PixiLabelRenderer {
    /**
     *  @param {Map}    map    the Map instance so we can query its Transform
     *  @param {object} msgbus the shared message bus
     *  @param {object} opts   { labelUrl : string }
     */
    constructor(map, msgbus, opts = {}) {
        // Check for PIXI
        if (!window.PIXI) {
            throw new Error('PixiLabelRenderer: window.PIXI not found. Make sure the pixi.js script is loaded.');
        }


        if (!window.PIXI.Application || !window.PIXI.Container || !window.PIXI.Text) {
            throw new Error('PixiLabelRenderer: Incomplete PIXI.js installation. Make sure you are using a complete version of PIXI.js');
        }

        this.map    = map;
        this.msgbus = msgbus;
        this.opts   = opts;
        this._labelSprites = [];

        // console.log('PixiLabelRenderer options:', opts); // Log the options

        // 1. Create an overlay PIXI application
        const baseCanvas = map.getCanvasContainer();
        if (!baseCanvas || !baseCanvas.parentNode) {
            throw new Error('PixiLabelRenderer: Invalid canvas container');
        }
        const parent = baseCanvas.parentNode;

        try {
            // Create a temporary canvas to test PIXI initialization
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = parent.clientWidth;
            tempCanvas.height = parent.clientHeight;

            // Initialize PIXI
            this.app = new window.PIXI.Application({
                view: tempCanvas,
                backgroundAlpha: 0,
                antialias: true,
                resolution: 1,
                autoDensity: false,
                width: parent.clientWidth,
                height: parent.clientHeight
            });

            if (!this.app || !this.app.view) {
                throw new Error('PixiLabelRenderer: Failed to create PIXI Application');
            }

            // Style the overlay so it sits exactly on top of the map canvas
            Object.assign(this.app.view.style, {
                position:        'absolute',
                left:            '0',
                top:             '0',
                width:           `${parent.clientWidth}px`,  // Use exact pixel values
                height:          `${parent.clientHeight}px`,
                pointerEvents:   'none',
                zIndex:          '1000' // Ensure it's on top
            });

            // Insert *after* the base canvas so it is rendered on top
            parent.appendChild(this.app.view);

            // Container that will be transformed instead of individual sprites
            this.container = new window.PIXI.Container();
            this.app.stage.addChild(this.container);

            // Initialize interpolator and collision detection
            this.interpolator = new LabelInterpolator();
            this.rbush = new RBush();
            this.currentStep = 0;
            
            // Keep a reference to an SSCLayer (if available) for step calculation later
            this.sscLayer = null;
            
            // Subscribe to step updates published by the map so that labels share the same step value
            this.msgbus.subscribe('map.step', (_topic, step) => {
                // Ensure the step value never goes below 0
                this.currentStep = Math.max(0, step);
            });
            
            // Enable or disable collision detection
            this.collisionDetectionEnabled = true;

            // Load label data (if provided) asynchronously
            if (opts.labelUrl) {
                console.log('Starting to load labels from:', opts.labelUrl);
                this._loadLabelData(opts.labelUrl);
            } else {
                console.warn('PixiLabelRenderer: No labelUrl provided in options');
            }

            // Keep overlay size in sync when map resizes
            msgbus.subscribe('map.resize', (_t, size) => {
                const [w, h] = size;
                this.setViewport(w, h);
            });

            // Log successful initialization
            console.log('PixiLabelRenderer initialized successfully');
        } catch (error) {
            console.error('PixiLabelRenderer initialization failed:', error);
            throw error;
        }
    }

    _loadLabelData(url) {
        console.log('Loading label data from:', url);
        fetch(url)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                console.log('Received label data:', data);
                if (!Array.isArray(data)) {
                    throw new Error('Label data must be an array');
                }

                // Process labels and store step_high values
                this._labels = data.map((rec) => {
                    if (!rec.name || !rec.anchor_geom || !rec.anchor_geom.coordinates) {
                        console.warn('Invalid label record:', rec);
                        return null;
                    }

                    const label = new Label(
                        (rec.label_trace_id !== undefined ? rec.label_trace_id : rec.id),
                        rec.name,
                        rec.anchor_geom.coordinates,
                        rec.angle || 0,
                        1.0,
                        rec.step_value || 0
                    );

                    // Add to interpolator
                    this.interpolator.addLabel(label);
                    if (rec.step_high !== undefined) {
                        this.interpolator.stepHighs.set(label.id, rec.step_high);
                    }

                    return label;
                }).filter(label => label !== null);

                // console.log('Created', this._labels.length, 'valid labels');
                this._buildSprites();
            })
            .catch((err) => {
                console.error('PixiLabelRenderer failed to load labels:', err);
                this._labels = [];
            });
    }

    _buildSprites() {
        if (!this._labels || this._labels.length === 0) {
            console.warn('PixiLabelRenderer: No labels to build sprites for');
            return;
        }
        
        const style = new window.PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 16,
            fill: 0x000000,
            align: 'center',
            stroke: 0xFFFFFF,
            strokeThickness: 1
            // dropShadow: true,
            // dropShadowColor: '#000000',
            // dropShadowBlur: 4,
            // dropShadowDistance: 2
        });

        this._labelSprites = [];
        for (const lbl of this._labels) {
            const container = new window.PIXI.Container();
            const txt = new window.PIXI.Text(lbl.text, style);
            txt.anchor.set(0.5);
            container.addChild(txt);
            
            this.container.addChild(container);
            this._labelSprites.push({ 
                label: lbl, 
                sprite: container,
                bounds: null  // Will store screen-space bounds for collision detection
            });
        }
    }

    _getLabelBounds(sprite, screenX, screenY) {
        const bounds = sprite.getLocalBounds();
        const padding = 2; 
        
        const angleRad = sprite.rotation;
        const cosA = Math.cos(angleRad);
        const sinA = Math.sin(angleRad);
        
        // Calculate corners of the unrotated box relative to center (with padding)
        const corners = [
            [-bounds.width/2 - padding, -bounds.height/2 - padding],
            [bounds.width/2 + padding, -bounds.height/2 - padding],
            [bounds.width/2 + padding, bounds.height/2 + padding],
            [-bounds.width/2 - padding, bounds.height/2 + padding]
        ];
        
        // Rotate corners and find min/max X and Y
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        corners.forEach(([x, y]) => {
            // Rotate the corner
            const rotatedX = x * cosA - y * sinA;
            const rotatedY = x * sinA + y * cosA;
            
            // Translate to screen coordinates
            const worldX = screenX + rotatedX;
            const worldY = screenY + rotatedY;
            
            minX = Math.min(minX, worldX);
            minY = Math.min(minY, worldY);
            maxX = Math.max(maxX, worldX);
            maxY = Math.max(maxY, worldY);
        });
        
        return { minX, minY, maxX, maxY };
    }

    _resolveCollisions() {
        // Clear existing tree
        this.rbush.clear();

        // First pass: calculate bounds and sort by priority
        const labelBounds = this._labelSprites
            // Only consider sprites that are currently visible
            .filter(({ sprite }) => sprite.visible)
            .map(({ label, sprite }) => {
                const bounds = this._getLabelBounds(sprite, sprite.x, sprite.y);
                return {
                    id: label.id,
                    minX: bounds.minX,
                    minY: bounds.minY,
                    maxX: bounds.maxX,
                    maxY: bounds.maxY,
                    label,
                    sprite,
                    // Get step_high from interpolator
                    stepHigh: this.interpolator.stepHighs.get(label.id) || Infinity,
                    // Use text length as secondary priority
                    textLength: label.text.length
                };
            })
            .sort((a, b) => {
                // Sort by step_high (higher values first)
                if (a.stepHigh !== b.stepHigh) {
                    return b.stepHigh - a.stepHigh;
                }
                // If same step_high, prefer shorter text
                return a.textLength - b.textLength;
            });

        // Second pass: detect and resolve collisions with priority
        labelBounds.forEach((item) => {
            // Search for collisions
            const searchBounds = {
                minX: item.minX,
                minY: item.minY,
                maxX: item.maxX,
                maxY: item.maxY
            };
            
            const collisions = this.rbush.search(searchBounds);
                // .filter(other => other.id !== item.id); 

            if (collisions.length === 0) {
                // No collision, add to tree and show label
                this.rbush.insert(item);
                item.sprite.visible = true;
            } else {
                // Collision detected, hide this label
                item.sprite.visible = false;
            }
        });
    }


    setViewport(w, h) {
        // Update both the renderer size and the canvas size
        this.app.renderer.resize(w, h);
        
        // Ensure the canvas size matches
        this.app.view.width = w;
        this.app.view.height = h;
        
        // Update the style to match
        Object.assign(this.app.view.style, {
            width: `${w}px`,
            height: `${h}px`
        });
        
        console.log('Viewport resized:', {
            width: w,
            height: h,
            renderer: [this.app.renderer.width, this.app.renderer.height],
            canvas: [this.app.view.width, this.app.view.height],
            style: [this.app.view.style.width, this.app.view.style.height]
        });
    }

    /** Update is called by Map each animation frame. */
    /* eslint-disable-next-line no-unused-vars */
    update(_rectIgnored, scaleDenominator, _matrixIgnored) {
        if (!this._labelSprites || this._labelSprites.length === 0) {
            return; // labels not loaded yet
        }

        // Synchronise currentStep with the map
        // Try to reuse the SSCLayer's step calculation when available. This keeps label behaviour consistent with the map rendering logic.
        if (this.sscLayer === null && this.map && Array.isArray(this.map.renderers)) {
            const rendererWithLayer = this.map.renderers.find(r => r.layer && typeof r.layer.getStepFromDenominator === 'function');
            if (rendererWithLayer) {
                this.sscLayer = rendererWithLayer.layer;
            }
        }

        if (this.sscLayer && typeof this.sscLayer.getStepFromDenominator === 'function') {
            this.currentStep = Math.max(0, this.sscLayer.getStepFromDenominator(scaleDenominator));
        }



        // Fetch the up-to-date world->viewport matrix from the map
        const mat = this.map.getTransform().worldViewportMatrix;
        if (!mat) {
            console.warn('PixiLabelRenderer: No transform matrix available');
            return;
        }

        // Position each sprite and update interpolated states
        this._labelSprites.forEach(({ label, sprite }) => {
            // Get interpolated label state
            const interpolated = this.interpolator.getInterpolatedLabel(label.id, this.currentStep);
            if (!interpolated) {
                sprite.visible = false;
                return;
            }

            // Transform world coordinates to screen coordinates
            const out = new Float64Array(3);
            vec3transform(out, [interpolated.pos[0], interpolated.pos[1], 0], mat);
            
            // Update sprite properties
            sprite.x = out[0];
            sprite.y = this.app.renderer.height - out[1];
            
            // Calculate rotation
            const matrixRotation = Math.atan2(mat[1], mat[0]) * (180 / Math.PI);

            sprite.rotation = (-(interpolated.rotation + matrixRotation)) * (Math.PI / 180);
            sprite.alpha = interpolated.opacity;

            // Initially make visible
            sprite.visible = true;
        });

        // Perform collision detection if enabled
        if (this.collisionDetectionEnabled) {
            this._resolveCollisions();
        }

        // Make sure the container is visible
        this.container.visible = true;
        this.container.alpha = 1;

        // Finally let PIXI render
        this.app.renderer.render(this.app.stage);
    }

    setCollisionDetection(enabled) {
        this.collisionDetectionEnabled = enabled;
    }
} 