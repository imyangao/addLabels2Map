/*
 *  PIXI based Label renderer – minimal version
 *  ------------------------------------------------------
 *  This renderer draws map labels on a transparent canvas that is
 *  stacked above the WebGL canvas used by the rest of the map.  It
 *  keeps that canvas perfectly in sync with the map's pan/zoom by
 *  reading the single-step world→viewport matrix that Map already
 *  maintains.
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

// We rely on the lightweight math helpers that already exist in the
// codebase.
import { vec3transform } from './mat4.js';
// ────────────────────────────────────────────────────────────────────────────
class Label {
    constructor(id, text, position) {
        this.id   = id;
        this.text = text;
        this.pos  = position; // [x, y] in *world* coordinates
    }
}

export default class PixiLabelRenderer {
    /**
     *  @param {Map}    map    the Map instance so we can query its Transform
     *  @param {object} msgbus the shared message bus
     *  @param {object} opts   { labelUrl : string }
     */
    constructor(map, msgbus, opts = {}) {
        // Check for PIXI and its version
        if (!window.PIXI) {
            throw new Error('PixiLabelRenderer: window.PIXI not found. Make sure the pixi.js script is loaded.');
        }

        // Verify PIXI version and required components
        if (!window.PIXI.Application || !window.PIXI.Container || !window.PIXI.Text) {
            throw new Error('PixiLabelRenderer: Incomplete PIXI.js installation. Make sure you are using a complete version of PIXI.js');
        }

        this.map    = map;
        this.msgbus = msgbus;
        this.opts   = opts;
        this._labelSprites = []; // Initialize early to prevent undefined errors

        console.log('PixiLabelRenderer options:', opts); // Log the options

        // ── 1. Create an overlay PIXI application ─────────────────────────
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

            // Initialize PIXI with explicit options
            this.app = new window.PIXI.Application({
                view: tempCanvas,
                backgroundAlpha: 0,
                antialias: true,
                resolution: 1,  // Force 1:1 pixel ratio
                autoDensity: false,  // Disable auto density
                width: parent.clientWidth,
                height: parent.clientHeight
            });

            if (!this.app || !this.app.view) {
                throw new Error('PixiLabelRenderer: Failed to create PIXI Application');
            }

            // Style the overlay so it sits exactly on top of the WebGL canvas
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

            // Container that we'll transform instead of individual sprites
            this.container = new window.PIXI.Container();
            this.app.stage.addChild(this.container);

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
                console.log('Fetch response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text().then(text => {
                    console.log('Raw response:', text);
                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        console.error('Failed to parse JSON:', e);
                        throw e;
                    }
                });
            })
            .then((data) => {
                console.log('Received label data:', data);
                if (!Array.isArray(data)) {
                    throw new Error('Label data must be an array');
                }
                this._labels = data.map((rec) => {
                    if (!rec.name || !rec.anchor_geom || !rec.anchor_geom.coordinates) {
                        console.warn('Invalid label record:', rec);
                        return null;
                    }
                    return new Label(
                        (rec.label_trace_id !== undefined ? rec.label_trace_id : rec.id),
                        rec.name,
                        rec.anchor_geom.coordinates
                    );
                }).filter(label => label !== null);

                console.log('Created', this._labels.length, 'valid labels');
                if (this._labels.length === 0) {
                    console.warn('No valid labels were created from the data');
                }
                // Build sprites once the JSON arrives
                this._buildSprites();
            })
            .catch((err) => {
                console.error('PixiLabelRenderer – failed to load labels:', err);
                console.error('Error details:', err.message);
                this._labels = [];
            });
    }

    _buildSprites() {
        if (!this._labels || this._labels.length === 0) {
            console.warn('PixiLabelRenderer: No labels to build sprites for');
            return;
        }
        
        console.log('Building sprites for', this._labels.length, 'labels');
        
        const style = new window.PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize:   24, // Increased font size
            fill:       0xFF0000, // Bright red color
            align:      'center',
            stroke:     0xFFFFFF, // White outline
            strokeThickness: 2,
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 4,
            dropShadowDistance: 2
        });

        for (const lbl of this._labels) {
            const txt = new window.PIXI.Text(lbl.text, style);
            txt.anchor.set(0.5);
            this.container.addChild(txt);
            this._labelSprites.push({ label: lbl, sprite: txt });
            console.log('Created sprite for label:', lbl.text, 'at position:', lbl.pos);
        }
    }

    // ── Public API expected by Map ─────────────────────────────────────
    setViewport(w, h) {
        // Update both the renderer size and the canvas size
        this.app.renderer.resize(w, h);
        
        // Ensure the canvas size matches exactly
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
    update(_rectIgnored, _scaleIgnored, _matrixIgnored) {
        if (!this._labelSprites || this._labelSprites.length === 0) {
            return; // labels not loaded yet
        }

        // Fetch the up-to-date world→viewport matrix from the map
        const mat = this.map.getTransform().worldViewportMatrix;
        if (!mat) {
            console.warn('PixiLabelRenderer: No transform matrix available');
            return;
        }

        // Log transform details
        console.log('Transform details:', {
            scale: this.map.getTransform().getScaleDenominator(),
            matrix: mat,
            viewport: [this.app.renderer.width, this.app.renderer.height],
            container: [this.app.view.width, this.app.view.height]
        });

        // Position each sprite
        this._labelSprites.forEach(({ label, sprite }) => {
            const out = new Float64Array(3);
            vec3transform(out, [label.pos[0], label.pos[1], 0], mat);
            
            sprite.x = out[0];
            sprite.y = this.app.renderer.height - out[1];
        });

        // Make sure the container is visible
        this.container.visible = true;
        this.container.alpha = 1;

        // Finally let PIXI render
        this.app.renderer.render(this.app.stage);
    }
} 