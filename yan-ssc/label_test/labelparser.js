import { Label } from './labelrenderer.js';

export class LabelParser {
    constructor() {
        this.labels = new Map();
        this.labelStepHighs = new Map(); // Store step_high for each label
    }

    async loadLabels(url) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            this.parseLabelData(data);
            return {
                labels: this.labels,
                stepHighs: this.labelStepHighs
            };
        } catch (error) {
            console.error('Error loading labels:', error);
            return { labels: new Map(), stepHighs: new Map() };
        }
    }

    parseLabelData(data) {
        // Clear existing labels
        this.labels.clear();
        this.labelStepHighs.clear();

        // Process each label in the data
        data.forEach(labelData => {
            const id = labelData.label_trace_id.toString();
            const step = labelData.step_value;
            const stepHigh = labelData.step_high;
            const fits = labelData.fits || false; // Default to false if not specified

            // Store step_high for this label
            this.labelStepHighs.set(id, stepHigh);

            const label = new Label(
                id,
                labelData.name,
                labelData.anchor_geom.coordinates,
                labelData.angle || 0,
                1.0,
                step,
                fits // Add fits property to Label
            );

            if (!this.labels.has(id)) {
                this.labels.set(id, new Map());
            }
            this.labels.get(id).set(step, label);
        });

        console.log('Parsed labels:', this.labels);
        console.log('Label step highs:', this.labelStepHighs);
    }

    getLabels() {
        return this.labels;
    }

    getStepHighs() {
        return this.labelStepHighs;
    }
} 