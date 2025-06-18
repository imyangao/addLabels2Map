## About This Project

This project builds upon the original [sscview-js](https://github.com/bmmeijers/sscview-js/tree/develop) by [Martijn Meijers](https://github.com/bmmeijers), and is developed as part of my master thesis on **labeling vario-scale maps**.

The main logic for label rendering, such as combining labels with the underlying maps, interpolation labels and text rendering, is implemented in [`pixi-label-renderer.js`](./src/pixi-label-renderer.js).

### Usage Example

To use the label renderer in the map viewer setup, you can import and initialize it like this:

```javascript
import PixiLabelRenderer from './pixi-label-renderer.js';

new PixiLabelRenderer(this, this.msgbus, {
    labelUrl: 'label_test/label_anchors.json'
});
```

This implementation supports interactive visualization of how labels move over scale in vario-scale mapping systems, and forms an improtant component of my thesis research.
