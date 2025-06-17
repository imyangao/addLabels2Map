(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.varioscale = factory());
}(this, (function () { 'use strict';

    //glCreateProgram
    //glCreateShader
    //glShaderSource
    //glCompileShader
    //glAttachShader
    //glLinkProgram <- after this line opengl got everything it needs, 
    //                 you can free shader resources
    //glDetachShader
    //glDeleteShader
    //for{//render loop
    //   glUseProgram
    //   //...drawing operations
    //   glUseProgram(0);
    //}
    //glDeleteProgram

    /* from mapbox-gl-js - BSD licensed? */
    var _now = (function () {
        if (window.performance &&
            window.performance.now) {
            return window.performance.now.bind(window.performance);
        }
        else {
            return Date.now.bind(Date);
        }
    }());

    var frame = window.requestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.msRequestAnimationFrame;

    var _frame = function (fn) {
        return frame(fn);
    };

    //var count = 0


    //For example,
    //fn is one of the interpolating functions defined in map.js
    //dur is the duration in seconds
    //ctx is this, which is the Map class itself
    function timed(fn, dur, ctx) {
        if (!dur) {
            fn.call(ctx, 1);
            return null;
        }

        var abort = false;
        var start = _now();
        var durms = dur * 1000; // duration in milliseconds

        //console.log('animate.js durms:', durms)

        //the tick method runs about 60 times per second
        //see https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
        function tick(now) {
            if (abort) {
                return;
            }
            now = _now();
            //console.log("animate.js now:", now)

            if (now >= (start + durms)) {
                //count += 1
                //console.log("animate.js count:", count)
                //count = 0
                fn.call(ctx, 1);
            } else {
                //count += 1
                var k = (now - start) / durms;
                fn.call(ctx, k);
                _frame(tick);
            }
        }

        _frame(tick);

        return function () { abort = true; };
    }

    /**
    * Records the trace of the mouse
    */

    var Trace = function Trace(val)
    {
        this._trace = [];
        this.push(val);
    };

    Trace.prototype.shift = function shift (cutoff)  // value in msec
    {
        // remove old positions older than `cutoff` value (in milli seconds)
        var now = _now();
        while ((this._trace.length > 0) && (now - this._trace[0][0] > cutoff))
        {
            // remove at beginning of array
            this._trace.shift();
        }
    };

    Trace.prototype.push = function push (val)
    {
        var now = _now();
        this._trace.push([now, val]);
    };
        
    Trace.prototype.average = function average ()
    {
            var this$1 = this;

        var sum = 0;
        this._trace.forEach( function (record) {
            // let time = record[0]
            var val = record[1];
            sum += val/this$1._trace.length;
        });
        return sum
    };

    Trace.prototype.first = function first ()
    {
        return this._trace[0]
    };

    Trace.prototype.last = function last ()
    {
        return this._trace[this._trace.length - 1]
    };

    Trace.prototype.lastbutone = function lastbutone ()
    {
        return this._trace[this._trace.length - 2]
    };

    Trace.prototype.length = function length ()
    {
        return this._trace.length
    };

    function dragHandler(map) {

        var canvas = map.getCanvasContainer();
        canvas.addEventListener("mousedown", doMouseDown, { passive: false });
        // canvas.addEventListener("touchstart", doMouseDown, { passive: false });
        canvas.oncontextmenu = function (evt) {
            // prevent context menu from popping up
            evt.preventDefault();
        };

        var _trace = null;

        function doMouseDown(evt) {
            // prevent cursor to turn into text selection on chrome
            evt.preventDefault();
            canvas.removeEventListener("mousedown", doMouseDown, { passive: false });
            canvas.addEventListener("mousemove", doMouseDrag, { passive: false });
            canvas.addEventListener("mouseup", doMouseUp, { passive: false });
            

            // canvas.removeEventListener("touchstart", doMouseDown, { capture: true, passive: false });
            // canvas.addEventListener("touchmove", doMouseDrag, { capture: true, passive: false });
            // canvas.addEventListener("touchend", doMouseUp, { capture: true, passive: false });

            var r = canvas.getBoundingClientRect();
            var e = evt.touches ? evt.touches[0] : evt;

            var x = e.clientX - r.left - canvas.clientLeft;
            var y = e.clientY - r.top - canvas.clientTop;

            //        console.log('doMouseDown');
            //        console.log([x,y]);

            _trace = new Trace([x, y]);
            map.panBy(0, 0); // to cancel on going animations
            
        }

        function doMouseDrag(evt) {
            evt.preventDefault();
            var r = canvas.getBoundingClientRect();

            //console.log('mouse.drag.js swiper.style.transform:', document.getElementById('swiper').style.transform)

            // for mouse use raw evt, for touches, use first touch location
            var e = evt.touches ? evt.touches[0] : evt;

            var x = e.clientX - r.left - canvas.clientLeft;
            var y = e.clientY - r.top - canvas.clientTop;

            // how much did the map move since last time?
            var prev = _trace.last()[1];
            var dx = x - prev[0];
            var dy = y - prev[1];
            _trace.shift(200);
            _trace.push([x, y]);

            //        console.log([x,y]);

            // pan the map
            map.panBy(dx, dy);
        }

        function doMouseUp(evt) {

            canvas.removeEventListener("mousemove", doMouseDrag, { passive: false });
            canvas.removeEventListener("mouseup", doMouseUp, { passive: false });
            canvas.addEventListener("mousedown", doMouseDown, { passive: false });

            // canvas.removeEventListener("touchmove", doMouseDrag, { capture: true, passive: false });
            // canvas.removeEventListener("touchend", doMouseUp, { capture: true, passive: false });
            // canvas.addEventListener("touchstart", doMouseDown, { capture: true, passive: false });

            var r = canvas.getBoundingClientRect();
            // for mouse use raw evt, for touches, use first touch location
            var e = evt.changedTouches ? evt.changedTouches[0] : evt;

            var x = e.clientX - r.left - canvas.clientLeft;
            var y = e.clientY - r.top - canvas.clientTop;

            _trace.shift(200);
            _trace.push([x, y]);

            //        console.log('doMouseUp');
            //        console.log([x,y])

            // FIXME
            // if a user can influence the duration
            // then if the user did set duration = 0 we should not do any panning!
            //
            // furthermore, maybe more natural for moving is that the map slows down
            //
            // also: 
            // the map should move initially with the same speed (as the user was moving) and 
            // then slowly come to a halt
            var last = _trace.last();
            var first = _trace.first();
            // in seconds
            var time = (last[0] - first[0]) / 1000;

            // so then we can see given the desired duration
            // how far could the map travel with the same speed
            // then if we ease out, we travel a bit less far
            // so that it looks ok

            var start = first[1];
            var dx = (x - start[0]);
            var dy = (y - start[1]);

            // take percent of speed computed
            var percent = 1.0; // 0.7
            var vx = dx / time * percent;
            var vy = dy / time * percent;

            // const max_distance = 400 // 0.5 * screen size
            // var duration = parseFloat(document.getElementById('panduration').value);
            // // with combined speed  of departure and arrivale
            // // * departure (= speed of user action px/s) and
            // // * arrival (= 0 px /s)
            // // we can calcualte what will be the distance travelled
            // // we cap the distance moved at maximum of certain number of pixels
            // // (to prevent map moving too far: heuristic, half the window size)
            // var tx = Math.max(Math.min((vx * 0.5) * (duration / 1000), max_distance), -max_distance)
            // var ty = Math.max(Math.min((vy * 0.5) * (duration / 1000), max_distance), -max_distance)


            // map.panAnimated(tx, ty);

            // FIXME: settings
            var duration = parseFloat(map._interaction_settings.pan_duration);
            // var duration = 1000; // parseFloat(document.getElementById('panduration').value);
            var tx = (vx * 0.5) * duration;
            var ty = (vy * 0.5) * duration;

            console.log(duration);
            console.log(tx);
            console.log(ty);
            _trace = null;
            map.panAnimated(tx, ty);
            // console.log('mouseup')
        }

    }

    function scrollHandler (map) {

        var _map = map;
        var _canvas = map.getCanvasContainer();

        _canvas.addEventListener("wheel", doMouseWheel, { passive: false });
        _canvas.addEventListener("mousewheel", doMouseWheel, { passive: false });

        var _trace = null;
        var _prev = null;

        function doMouseWheel(evt)
        {
            // prevent from also scrolling the page -- not allowed when passive: true
            evt.preventDefault();
            // return if previous evt is shorter than n msec ago
            var now = _now();
            if ((now - _prev) < 5)
            {
                return 
            }
            // find the wheel value (this is implemented differently per browser)
            var value = undefined;
            if (evt.type === 'wheel')
            {
                value = evt.deltaY;
                // Firefox doubles the values on retina screens...
                // if (firefox && e.deltaMode === window.WheelEvent.DOM_DELTA_PIXEL) value /= browser.devicePixelRatio;
                // if (e.deltaMode === window.WheelEvent.DOM_DELTA_LINE) value *= 40;
            }
            else if (evt.type === 'mousewheel')
            {
                value = -evt.wheelDeltaY;
                // if (safari) value = value / 3;
            }
            // sometimes, we see a value of 0 
            // i.e. undetermined y-direction, so skip evt
            if (value === 0)
            {
                return
            }
            _prev = now;

            // standard value for zoom scroll_factor
            var scroll_factor = 0.1;
            var direction = Math.max(-1, Math.min(1, -value));
            if (_trace === null)
            {
                // FIXME: use the trace for determining the direction
                // i.e. average few wheel clicks
                _trace = new Trace(direction);
            }
            else
            {
                var prev = _trace.last();
                var delta = now - prev[0];
                _trace.push(direction);

                // FIXME: SETTINGS: 
                //var radios = document.getElementsByName('speed');
                //let speed = 1
                // FIXME: SETTINGS: 
                
                //for (var i = 0, length = radios.length; i < length; i++) {
                //    if (radios[i].checked) {
                //        // do whatever you want with the checked radio
                //        speed = parseFloat(radios[i].value)
                //        // only one radio can be logically checked, don't check the rest
                //        break;
                //    }
                //}
                
                //speed = getspeed()

                // make larger zoom scroll_factors if mousewheel went faster
                // FIXME: allow user to set multiplication scroll_factor, e.g.
                // (1, 2, 4) : (normal, fast, superfast) ?
                switch (true)
                {
                    case delta > 750:
                        scroll_factor = 0.0625;
                        break;
                    case delta > 500:
                        scroll_factor = 0.125;
                        break;
                    case delta > 50:
                        scroll_factor = 0.25;
                        break;
                    default:
                        scroll_factor = 0.5;
                        break;
                }
                scroll_factor *= _map._interaction_settings.zoom_factor;  //getspeed()
                _trace.shift(200);
    //            console.log(delta + " " + prev[1] + " " + scroll_factor);
            }
            // determine average dir
            direction = _trace.average() >= 0 ? +1 : -1;
            //if the canvas has size 800 x 800, 
            //evt.clientX: x-coordinate in pixel, starting from the left of the canvas (800 x 800)
            //evt.clientY: y-coordinate in pixel, starting from the top of the canvas (800 x 800)        
            //r has size 800 x 760 because of the bar (with height 39.92) at the top
            //r.left = 0 and r.top = 39.92
            var r = _canvas.getBoundingClientRect();
            var x = evt.clientX - r.left - _canvas.clientLeft;  //_canvas.clientLeft is often 0
            var y = evt.clientY - r.top - _canvas.clientTop;  //_canvas.clientTop is often 0

            switch(direction) 
            {
                case 1:
                    _map.zoomInAnimated(x, y, scroll_factor);
                    break;
                case -1:
                    _map.zoomOutAnimated(x, y, scroll_factor);
                    break;
            }
    //        console.log(_trace._trace);
            // console.log(_trace.length())
        }
    }



    function zoomButtonHandler(map) {
        var canvas = map.getCanvasContainer();

        document.getElementById("zoomInButton").addEventListener('click',
            function () {
                map.zoomInAnimated(canvas.width / 2, canvas.height / 2, map._interaction_settings.zoom_factor ); //getspeed())
            }
        );

        document.getElementById("zoomOutButton").addEventListener('click',
            function () {
                map.zoomOutAnimated(canvas.width / 2, canvas.height / 2, map._interaction_settings.zoom_factor );// getspeed())
            }
        );
    }

    /**
    * Handler for touch events
    * zooms the map if two fingers are used and the distance between them changes.
    * 
    */

    function touchPinchHandler (map) {
        var canvas = map.getCanvasContainer();

        canvas.addEventListener("touchstart", doPinchStart, false);
        canvas.oncontextmenu = function (evt) {
            // prevent context menu from popping up
            evt.preventDefault();
        };

        function dist(points) {
            var ref = vec(points);
            var dx = ref[0];
            var dy = ref[1];
            return Math.sqrt(dx * dx + dy * dy);
        }

        function center(points) {
            var ref = vec(points);
            var dx = ref[0];
            var dy = ref[1];
            var p0 = points[0];
            return [p0[0] + dx * 0.5,
                    p0[1] + dy * 0.5];
        }

        function vec(points) {
            var dx = points[1][0] - points[0][0];
            var dy = points[1][1] - points[0][1];
            return [dx, dy];
        }

        function getTouchPoints(event) {
            var r = canvas.getBoundingClientRect();
            var touches = event.touches;
            var points = [];
            // note: length hardcoded as 2
            for (var j = 0; j < 2; j++) {
                var x = touches[j].clientX - r.left - canvas.clientLeft;
                var y = touches[j].clientY - r.top - canvas.clientTop;
                points.push([x, y]);
            }
            return points;
        }

        var _prevDist = null;
        var _prevCenter = null;
        var _startTime = null;

        function doPinchStart(event) {
            if (!event.touches || event.touches.length !== 2) { return; }
            event.preventDefault();

            canvas.removeEventListener("touchstart", doPinchStart, false);
            canvas.addEventListener("touchmove", doPinchMove, { capture: true, passive: false });
            canvas.addEventListener("touchend", doPinchEnd, false);
            
            // let points = getTouchPoints(event);
            // console.log(points);
            // _startCenter = center(points);
            map.abortAndRender(); // to cancel on going animations
            var points = getTouchPoints(event);
            _prevDist = null;
            _prevCenter = center(points);
            center(points);
            _startTime = _now();

        }

        function doPinchMove(event) {
            // we discard the first few movement events at the beginning (30 ms since start)
            // these seem to be 'unstable', are rapidly fired after placing the fingers on 
            // the screen and they lead to wildly varying positions

            if (!event.touches || event.touches.length !== 2 || (_now() - _startTime) < 30) { return; }
            // console.log('time of touch ' + (_now() - _startTime));

            event.preventDefault();
            var points = getTouchPoints(event);
    //        _trace.shift(200);
    //        _trace.push(points);
            

    //        let distTrend = _trace._trace.map((pt, i) => {
    //            let [time, val] = pt
    //            let [firstTime, firstVal] = _trace._trace[i+1]
    ////            console.log(i + " " + time + " " + val + " "+ dist(val, firstVal))
    //            return dist(val, firstVal)
    //        })
    //        let distTrend = []
    //        let [firstTime, firstVal] = _trace._trace[0]
    //        for (let i = 1; i < _trace._trace.length; i++) {
    //            let [time, val] = _trace._trace[i]
    //            let d = dist(val, _trace._trace[i-1][1])
    //            distTrend.push(d)
    //        }
    //        console.log(distTrend)

            var curDist = dist(points);
            if (_prevDist !== null) {

                var scaleDelta = curDist / _prevDist;
                var currentCenter = center(points);
                var panDist = [currentCenter[0] - _prevCenter[0],
                               currentCenter[1] - _prevCenter[1]];


                var el = document.getElementById("touchCenter");
                el.style.left = Math.floor(currentCenter[0]) + "px";
                el.style.top = Math.floor(currentCenter[1]) + "px";

                el = document.getElementById("touchFirst");
                el.style.left = Math.floor(points[0][0]) + "px";
                el.style.top = Math.floor(points[0][1]) + "px";
                // el.innerHTML = "<span class='circle'>["+points[0][0].toFixed(1) + ","+ points[0][1].toFixed(1) + "]</span>"

                el = document.getElementById("touchSecond");
                el.style.left = Math.floor(points[1][0]) + "px";
                el.style.top = Math.floor(points[1][1]) + "px";
                // el.innerHTML = "<span class='circle'>["+points[1][0].toFixed(1) + ","+ points[1][1].toFixed(1) + "]</span>"

    //            map.nonAnimatedZoom(currentCenter[0], currentCenter[1] , scaleDelta );
                map.nonAnimatedZoomAndPan(currentCenter, scaleDelta, panDist);
                _prevCenter = currentCenter;
            }
            _prevDist = curDist;
        }

        function doPinchEnd(event) {
            if (event.touches.length !== 0) { return; }
            event.preventDefault();
    //        console.log('doPinchEnd');
    //        console.log('trace for pinch end ' + _trace.length());
    //        if (_trace.length() > 1)
    //        {
    //            // FIXME:
    //            // should the intent of the user be derived from 
    //            // comparing the last two touch points only?
    //            // or, should we compare begin and end of the gesture
    //            // or, should we detect some pattern in the gesture points?
    //            // or, ... 
    //            let last = _trace.last();
    //            let lastbutone = _trace.lastbutone();
    //            let curDist = dist(last[1]);
    //            let prevDist = dist(lastbutone[1]);
    //            if (prevDist !== null) {
    //                let scaleDelta = curDist / _prevDist;
    //                // let scaleDelta = curDist / prevDist;
    //                let [x, y] = center(last[1]);
    ////                let [x, y] = _startCenter;
    //                let step = 0.5;
    //                map.nonAnimatedZoom(x, y, Math.max(Math.min(scaleDelta, 1.1), 0.9));
    //            }
    ////            if (curDist < prevDist)
    ////            {
    ////                // distance between fingers has become smaller
    ////                // -> zoom out
    ////                map.zoomOut(x, y, step)
    ////            } else {
    ////                // distance between fingers has become larger
    ////                // -> zoom in
    ////                map.zoomIn(x, y, step)
    ////            }

    //            // FIXME: 
    //            // should we take the zoom step preference of the
    //            // user into account here? e.g. large zoom step -> 
    //            // allows larger change of the clamped scaledelta?
    //            // map.zoomAnimated(x, y, Math.max(Math.min(scaleDelta, 1.2), 0.8));
    //        }

            canvas.removeEventListener("touchmove", doPinchMove, { capture: true, passive: false });
            canvas.removeEventListener("touchend", doPinchEnd, false);
            canvas.addEventListener("touchstart", doPinchStart, false);
            _prevDist = null;
            _prevCenter = null;
            _startTime = null;
    //        _trace = null;
        }
    }

    function touchDragHandler(map) {
        var canvas = map.getCanvasContainer();
        canvas.addEventListener("touchstart", doTouchDragStart, false);
        // canvas.addEventListener("touchstart", doMouseDown, { passive: false });
        canvas.oncontextmenu = function (evt) {
            // prevent context menu from popping up
            evt.preventDefault();
        };

        function getTouchPoint(event) {
            var r = canvas.getBoundingClientRect();
            var touches = event.touches;
            var x = touches[0].clientX - r.left - canvas.clientLeft;
            var y = touches[0].clientY - r.top - canvas.clientTop;
            return [x, y];
        }

        var _trace = null;
        var _state = null;

        function doTouchDragStart(evt) {
            console.log(evt);
            if (!evt.touches || evt.touches.length > 1) {
                return;
            }
            // prevent cursor to turn into text selection on chrome
            evt.preventDefault();
            // map.abortAndRender(); // to cancel on going animations
            canvas.removeEventListener("touchstart", doTouchDragStart, false);
            canvas.addEventListener("touchmove", doTouchDragMove, { capture: true, passive: false });
            canvas.addEventListener("touchend", doTouchDragEnd, false);
            // canvas.removeEventListener("touchstart", doMouseDown, { capture: true, passive: false });
            // canvas.addEventListener("touchmove", doMouseDrag, { capture: true, passive: false });
            // canvas.addEventListener("touchend", doMouseUp, { capture: true, passive: false });
            
            //        console.log('doMouseDown');
            //        console.log([x,y]);
            var point = getTouchPoint(evt);
            _trace = new Trace(point);
            _state = 'pending';
        }
        function doTouchDragMove(evt) {
            
            // when we detect more than 1 finger on the screen
            // we obviously do not want to pan, so we set the state to
            // pending (i.e. currently we do not handle events for panning)
            if (!evt.touches || evt.touches.length > 1) 
            {
                _state = 'pending';
                return;
            }
            evt.preventDefault();
            var point = getTouchPoint(evt);

            var el = document.getElementById("touchFirst");
            el.style.left = Math.floor(point[0]) + "px";
            el.style.top = Math.floor(point[1]) + "px";
            el = document.getElementById("touchCenter");
            el.style.left = "0px";
            el.style.top = "0px";
            el = document.getElementById("touchSecond");
            el.style.left = "0px";
            el.style.top = "0px";

            // how much did the map move since last time?
            var prev = _trace.last()[1];
            var dx = point[0] - prev[0];
            var dy = point[1] - prev[1];
            _trace.shift(200);
            _trace.push(point);

            
            switch(_state)
            {
                case 'pending':
                    // enable the handler when:
                    // - we have moved our finger more than 3 pixels, or
                    // - we have 1 finger for more than 80ms on the screen
                    if (Math.sqrt(dx * dx, dy * dy) >= 3 || (_trace.last()[0] - _trace.first()[0])> 60) {
                        _state = 'active';
                    }
                    break;
                case 'active':
                    map.panBy(dx, dy);
                    break;
            }
        }
        function doTouchDragEnd(evt) {
            if (!evt.touches || evt.touches.length !== 0) { return; }
            console.log("doTouchDragEnd");
            // canvas.removeEventListener("touchmove", doMouseDrag, { capture: true, passive: false });
            // canvas.removeEventListener("touchend", doMouseUp, { capture: true, passive: false });
            // canvas.addEventListener("touchstart", doMouseDown, { capture: true, passive: false });
            // let point = getTouchPoint(evt);
            // _trace.shift(200);
            // _trace.push(point);
            //        console.log('doMouseUp');
            //        console.log([x,y])
            // FIXME
            // if a user can influence the duration
            // then if the user did set duration = 0 we should not do any panning!
            //
            // furthermore, maybe more natural for moving is that the map slows down
            //
            // also: 
            // the map should move initially with the same speed (as the user was moving) and 
            // then slowly come to a halt
            _trace.shift(200);
            if (_trace.length() <= 2)
            {
                _state = 'pending';
            }
            switch(_state)
            {
                case 'pending':
                {
                    console.log('touch drag end - SKIP');
                    break;
                }
                case 'active':
                {               
                    var last = _trace.last();   
                    var first = _trace.first();
                    // in seconds
                    var time = (last[0] - first[0]) / 1000;
                    // so then we can see given the desired duration
                    // how far could the map travel with the same speed
                    // then if we ease out, we travel a bit less far
                    // so that it looks ok
                    var start = first[1];
                    var dx = (last[1][0] - start[0]);
                    var dy = (last[1][1] - start[1]);
                    // take percent of speed computed
                    var percent = 1.0; // 0.7
                    var vx = dx / time * percent;
                    var vy = dy / time * percent;
                    // const max_distance = 400 // 0.5 * screen size
                    var duration = parseFloat(map._interaction_settings.pan_duration);
                    // var duration = parseFloat(document.getElementById('panduration').value);
                    // with combined speed  of departure and arrivale
                    // * departure (= speed of user action px/s) and
                    // * arrival (= 0 px /s)
                    // we can calcualte what will be the distance travelled
                    // we cap the distance moved at maximum of certain number of pixels
                    // (to prevent map moving too far: heuristic, half the window size)
                    // var tx = Math.max(Math.min((vx * 0.5) * (duration / 1000), max_distance), -max_distance)
                    // var ty = Math.max(Math.min((vy * 0.5) * (duration / 1000), max_distance), -max_distance)
                    var tx = (vx * 0.5) * duration;
                    var ty = (vy * 0.5) * duration;

                    console.log('touch drag end - ANIMATE');
                    console.log([tx, ty]);
                    map.panAnimated(tx, ty);
                    break;
                }
            }
            canvas.removeEventListener("touchmove", doTouchDragMove, { capture: true, passive: false });
            canvas.removeEventListener("touchend", doTouchDragEnd, false);
            canvas.addEventListener("touchstart", doTouchDragStart, false);
            _state = 'pending';
            _trace = null;
            console.log('touchend');
        }
    }

    /**
     * @name mat4
     * @class 4x4 Matrix
     */

    //exports.___ = function 


    // vector funcs !!!
    function vec3transform (out, a, m) {
        var x = a[0], y = a[1], z = a[2],
            w = m[3] * x + m[7] * y + m[11] * z + m[15];
        w = w || 1.0; //if w == 0 or w == null, the result is 1.0; otherwise, the result is w
    //    console.log(m[0] + " " + x + " " + m[4]);
        out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
        out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
        out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    //    console.log(out[0]);
        return out;
    }

    function createvec3() {
        var out = new Float64Array(3);
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
        return out;
    }


    /**
     * Creates a new identity mat4
     *
     * @returns {mat4} a new 4x4 matrix
     */
    function create() {
        var out = new Float64Array(16);
        out[0] = 1;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[4] = 0;
        out[5] = 1;
        out[6] = 0;
        out[7] = 0;
        out[8] = 0;
        out[9] = 0;
        out[10] = 1;
        out[11] = 0;
        out[12] = 0;
        out[13] = 0;
        out[14] = 0;
        out[15] = 1;
        return out;
    }


    /**
     * Creates a new mat4 initialized with values from an existing matrix
     *
     * @param {mat4} a matrix to clone
     * @returns {mat4} a new 4x4 matrix
     */
    function clone(a) {
        var out = new Float64Array(16);
        out[0] = a[0];
        out[1] = a[1];
        out[2] = a[2];
        out[3] = a[3];
        out[4] = a[4];
        out[5] = a[5];
        out[6] = a[6];
        out[7] = a[7];
        out[8] = a[8];
        out[9] = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
        return out;
    }

    /**
     * Inverts a mat4
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the source matrix
     * @returns {mat4} out
     */
    function invert(out, a) {
        var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
            a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
            a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
            a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

            b00 = a00 * a11 - a01 * a10,
            b01 = a00 * a12 - a02 * a10,
            b02 = a00 * a13 - a03 * a10,
            b03 = a01 * a12 - a02 * a11,
            b04 = a01 * a13 - a03 * a11,
            b05 = a02 * a13 - a03 * a12,
            b06 = a20 * a31 - a21 * a30,
            b07 = a20 * a32 - a22 * a30,
            b08 = a20 * a33 - a23 * a30,
            b09 = a21 * a32 - a22 * a31,
            b10 = a21 * a33 - a23 * a31,
            b11 = a22 * a33 - a23 * a32,

            // Calculate the determinant
            det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

        if (!det) {
            return null;
        }
        det = 1.0 / det;

        out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
        out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
        out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
        out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
        out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
        out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
        out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
        out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
        out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
        out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
        out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
        out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
        out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
        out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
        out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
        out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

        return out;
    }

    /**
     * Multiplies two mat4's explicitly
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the first operand
     * @param {mat4} b the second operand
     * @returns {mat4} out
     */
    function multiply(out, a, b) {
        var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
            a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
            a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
            a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

        // Cache only the current line of the second matrix
        var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
        out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
        out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
        out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
        out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        return out;
    }

    /**
     * Alias for {@link mat4.multiply}
     * @function
     */
    var _multiply = multiply;








    ///**

    // * Generates a perspective projection matrix with the given bounds.

    // * Passing null/undefined/no value for far will generate infinite projection matrix.

    // *

    // * @param {mat4} out mat4 frustum matrix will be written into

    // * @param {number} fovy Vertical field of view in radians

    // * @param {number} aspect Aspect ratio. typically viewport width/height

    // * @param {number} near Near bound of the frustum

    // * @param {number} far Far bound of the frustum, can be null or Infinity

    // * @returns {mat4} out

    // */

    //export function perspective(out, fovy, aspect, near, far) {

    //  let f = 1.0 / Math.tan(fovy / 2), nf;

    //  out[0] = f / aspect;

    //  out[1] = 0;

    //  out[2] = 0;

    //  out[3] = 0;

    //  out[4] = 0;

    //  out[5] = f;

    //  out[6] = 0;

    //  out[7] = 0;

    //  out[8] = 0;

    //  out[9] = 0;

    //  out[11] = -1;

    //  out[12] = 0;

    //  out[13] = 0;

    //  out[15] = 0;

    //  if (far != null && far !== Infinity) {

    //    nf = 1 / (near - far);

    //    out[10] = (far + near) * nf;

    //    out[14] = (2 * far * near) * nf;

    //  } else {

    //    out[10] = -1;

    //    out[14] = -2 * near;

    //  }

    //  return out;

    //}

    ///**

    // * Generates a perspective projection matrix with the given field of view.

    // * This is primarily useful for generating projection matrices to be used

    // * with the still experiemental WebVR API.

    // *

    // * @param {mat4} out mat4 frustum matrix will be written into

    // * @param {Object} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees

    // * @param {number} near Near bound of the frustum

    // * @param {number} far Far bound of the frustum

    // * @returns {mat4} out

    // */

    //export function perspectiveFromFieldOfView(out, fov, near, far) {

    //  let upTan = Math.tan(fov.upDegrees * Math.PI/180.0);

    //  let downTan = Math.tan(fov.downDegrees * Math.PI/180.0);

    //  let leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0);

    //  let rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0);

    //  let xScale = 2.0 / (leftTan + rightTan);

    //  let yScale = 2.0 / (upTan + downTan);

    //  out[0] = xScale;

    //  out[1] = 0.0;

    //  out[2] = 0.0;

    //  out[3] = 0.0;

    //  out[4] = 0.0;

    //  out[5] = yScale;

    //  out[6] = 0.0;

    //  out[7] = 0.0;

    //  out[8] = -((leftTan - rightTan) * xScale * 0.5);

    //  out[9] = ((upTan - downTan) * yScale * 0.5);

    //  out[10] = far / (near - far);

    //  out[11] = -1.0;

    //  out[12] = 0.0;

    //  out[13] = 0.0;

    //  out[14] = (far * near) / (near - far);

    //  out[15] = 0.0;

    //  return out;

    //}

    ///**

    // * Generates a orthogonal projection matrix with the given bounds

    // *

    // * @param {mat4} out mat4 frustum matrix will be written into

    // * @param {number} left Left bound of the frustum

    // * @param {number} right Right bound of the frustum

    // * @param {number} bottom Bottom bound of the frustum

    // * @param {number} top Top bound of the frustum

    // * @param {number} near Near bound of the frustum

    // * @param {number} far Far bound of the frustum

    // * @returns {mat4} out

    // */

    //export function ortho(out, left, right, bottom, top, near, far) {

    //  let lr = 1 / (left - right);

    //  let bt = 1 / (bottom - top);

    //  let nf = 1 / (near - far);

    //  out[0] = -2 * lr;

    //  out[1] = 0;

    //  out[2] = 0;

    //  out[3] = 0;

    //  out[4] = 0;

    //  out[5] = -2 * bt;

    //  out[6] = 0;

    //  out[7] = 0;

    //  out[8] = 0;

    //  out[9] = 0;

    //  out[10] = 2 * nf;

    //  out[11] = 0;

    //  out[12] = (left + right) * lr;

    //  out[13] = (top + bottom) * bt;

    //  out[14] = (far + near) * nf;

    //  out[15] = 1;

    //  return out;

    //}

    var Rectangle = function Rectangle(xmin, ymin, xmax, ymax)
    {
        this.xmin = xmin;
        this.ymin = ymin;
        this.xmax = xmax;
        this.ymax = ymax;
    };

    Rectangle.prototype.width = function width ()
    {
        return this.xmax - this.xmin
    };

    Rectangle.prototype.height = function height ()
    {
        return this.ymax - this.ymin
    };

    Rectangle.prototype.toString = function toString ()
    {
        return ("new Rectangle(" + (this.xmin) + ", " + (this.ymin) + ", " + (this.xmax) + ", " + (this.ymax) + ")")
    };

    Rectangle.prototype.area = function area ()
    {
        return this.width() * this.height()
    };

    Rectangle.prototype.center = function center ()
    {
        return [this.xmin + this.width() * 0.5,
                this.ymin + this.height() * 0.5]
    };

    // TODO
    // - Aspect ratio / resize of viewport --> update transform
    // - Take into account the z-value of the slice
    // - Remove duplication inside functions

    // let = block scoped
    // var = global / function scoped


    function pixelToMeter(pixel)
    {

        var inch = 0.0254; // 1 inch in meter
        // clamp? - firefox gets overwhelmed with too much data
        var ppi = 96.0; // * (window.devicePixelRatio || 1.0)
        var ratio = inch / ppi;
        //    let ratio = 0.00028
        return pixel * ratio

    }

    // not used at the moment
    //function createWorldSquareMatrix(box, ar)
    //{
    //    // Returns transform matrix to go from world to normalized square
    //    let sx = 2. / ((box.xmax - box.xmin) * ar)
    //    let sy = 2. / (box.ymax - box.ymin)
    //    let tx = -(box.xmax + box.xmin) / (box.xmax - box.xmin)
    //    let ty = -(box.ymax + box.ymin) / (box.ymax - box.ymin)
    //    let m = create()
    //    m[0] = sx
    //    m[5] = sy
    //    m[12] = tx
    //    m[13] = ty
    //    return m
    //}


    function createSquareViewportMatrix(box)
    {
        // Returns transform matrix to go from normalized square to viewport
        // FIXME: can overflow? better to first multiply with 1/2?
        var sx = (box.xmax - box.xmin) * .5;
        var sy = (box.ymax - box.ymin) * .5;
        var tx = (box.xmax + box.xmin)  * .5;
        var ty = (box.ymax + box.ymin)  * .5;
        var m = create();
        m[0] = sx;
        m[5] = sy;
        m[12] = tx;
        m[13] = ty;
        return m
    }


    // FIXME
    //
    // Check handedness of the 3D system and get it right + consistent!
    // https://github.com/g-truc/glm/blob/master/glm/gtc/matrix_transform.inl
    //
    // OrthoLH
    // OrthoRH

    var Transform = function Transform(centerWorld, viewportSize, scaleDenominator)
    {
        // matrices
        //
        // transform split in 2 steps: - worldSquareMatrix squareViewportMatrix
        this.viewportWorldMatrix = create();
        this.worldViewportMatrix = create();
        // for the whole transform: - viewportWorldMatrix worldViewportMatrix
        this.worldSquareMatrix = null;
        this.squareViewportMatrix = null;
        //
        this.viewport = null;
        // set up initial transformation
        this.initTransform(centerWorld, viewportSize, scaleDenominator);
    };

    Transform.prototype.initTransform = function initTransform (centerWorld, viewportSize, scaleDenominator)
    {
        // compute from the center of the world, the viewport size and the scale
        // scaleDenominator how much of the world is visible
        var cx = centerWorld[0],
            cy = centerWorld[1];
        var width = viewportSize[0],
            height = viewportSize[1];
        var halfw = 0.5 * width,
            halfh = 0.5 * height;
        // aspect ratio - not used
        // let aspect = width / height
        // console.log(`aspect ratio ${aspect}`)
        // size in real world of viewport
        // get half visible screen size in world units,
        // when we look at it at this map scale (1:scaleDenominator)
        var half_visible_screen = [pixelToMeter(halfw) * scaleDenominator,
                                   pixelToMeter(halfh) * scaleDenominator];
        var xmin = cx - half_visible_screen[0],
            xmax = cx + half_visible_screen[0],
            ymin = cy - half_visible_screen[1],
            ymax = cy + half_visible_screen[1];
        // the size of the viewport 
        this.viewport = new Rectangle(0, 0, width, height);
        // we arrive at what part of the world then is visible
        var visible_world = new Rectangle(xmin, ymin, xmax, ymax);
        // scaling/translating is then as follows:
        var scale = [2. / visible_world.width(),
                     2. / visible_world.height()];
        var translate = [-scale[0] * cx, -scale[1] * cy];
        // by means of which we can calculate a world -> ndc square matrix
        var worldSquareMatrix = create();
        worldSquareMatrix[0] = scale[0];
        worldSquareMatrix[5] = scale[1];
        worldSquareMatrix[12] = translate[0];
        worldSquareMatrix[13] = translate[1];
        this.worldSquareMatrix = worldSquareMatrix;
        // we can set up ndc square -> viewport matrix
        this.squareViewportMatrix = createSquareViewportMatrix(this.viewport);
        // and going from one to the other is then the concatenation of the 2
        // (and its inverse)
        this.updateSingleStepTransform();
    };

    /** from viewport coordinates back to world coordinates */
    Transform.prototype.backward = function backward (vec3)
    {
        var resultVec = createvec3();
        vec3transform(resultVec, vec3, this.viewportWorldMatrix);
        return resultVec
    };

    /** having the 2 parts of the transform (world -> ndc and ndc -> viewport)
        make the whole transform available */
    Transform.prototype.updateSingleStepTransform = function updateSingleStepTransform () {
        // and going from one to the other is then the concatenation of the 2 (and its inverse)
        _multiply(this.worldViewportMatrix, this.squareViewportMatrix, this.worldSquareMatrix);
        invert(this.viewportWorldMatrix, this.worldViewportMatrix);
    };

    Transform.prototype.updateTwoStepTransform = function updateTwoStepTransform () {
        // update the 2 steps of the transform: world<->ndc and ndc<->viewport
        // get what part of the world is visible
        var visibleWorld = this.getVisibleWorld();
        var center = visibleWorld.center();
        // scaling/translating is then as follows:
        var scale = [2. / visibleWorld.width(), 2. / visibleWorld.height()];
        var translate = [-scale[0] * center[0], -scale[1] * center[1]];
        // by means of which we can calculate a new world -> ndc square matrix
        var worldSquareMatrix = create();
        worldSquareMatrix[0] = scale[0];
        worldSquareMatrix[5] = scale[1];
        worldSquareMatrix[12] = translate[0];
        worldSquareMatrix[13] = translate[1];
        this.worldSquareMatrix = worldSquareMatrix;
        // and given the size of the viewport we can set up ndc square -> viewport matrix
        // this.viewport = new Rectangle(0, 0, width, height)
        this.squareViewportMatrix = createSquareViewportMatrix(this.viewport);
    };

    /** pan the view by a delta in screen coordinates */
    Transform.prototype.pan = function pan (dx, dy)
    {
        // update the ndc -> viewport matrix
        this.squareViewportMatrix[12] += dx;
        this.squareViewportMatrix[13] += dy;
        // and the transform chains
        this.updateSingleStepTransform();
        this.updateTwoStepTransform();
    };

    /** zoom around screen point (_x_, _y_) by scaling the map with _factor_ */
    Transform.prototype.zoom = function zoom (factor, x, y)
    {
        var tmp = create();
        // 1. translate
        {
            var eye = create();
            eye[12] = -x;
            eye[13] = -y;
            _multiply(tmp, eye, this.squareViewportMatrix);
        }
        // 2. scale
        {
            var eye$1 = create();
            eye$1[0] = factor;
            eye$1[5] = factor;
            _multiply(tmp, eye$1, tmp);
        }
        // 3. translate back
        {
            var eye$2 = create();
            eye$2[12] = x;
            eye$2[13] = y;
            _multiply(tmp, eye$2, tmp);
        }
        this.squareViewportMatrix = tmp;
        // update the transformation matrices
        this.updateSingleStepTransform();
        this.updateTwoStepTransform();
    };

    Transform.prototype.getVisibleWorld = function getVisibleWorld ()
    {
        var ll = this.backward([this.viewport.xmin, this.viewport.ymin, 0.0]);
        var tr = this.backward([this.viewport.xmax, this.viewport.ymax, 0.0]);
        return new Rectangle(ll[0], ll[1], tr[0], tr[1])
    };

    Transform.prototype.getCenterWorld = function getCenterWorld ()
    {
        var center = this.backward([this.viewport.xmin + (this.viewport.xmax - this.viewport.xmin) * 0.5, 
                                    this.viewport.ymin + (this.viewport.ymax - this.viewport.ymin) * 0.5, 0.0]);
        return center
    };

    Transform.prototype.getScaleDenominator = function getScaleDenominator () 
    {
        var viewportInMeter = new Rectangle(0, 0,
                                            pixelToMeter(this.viewport.width()), 
                                            pixelToMeter(this.viewport.height()));
        var worldInMeter = this.getVisibleWorld();
        return Math.sqrt(worldInMeter.area() / viewportInMeter.area())
    };

    var DrawProgram$2 = function DrawProgram(gl, vertexShaderText, fragmentShaderText) {

        var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderText);
        var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderText);

        // Create program: attach, link, validate, detach, delete
        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('ERROR linking program!', gl.getProgramInfoLog(shaderProgram));
            return;
        }
        gl.validateProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.VALIDATE_STATUS)) {
            console.error('ERROR validating program!', gl.getProgramInfoLog(shaderProgram));
            return;
        }

        this.shaderProgram = shaderProgram;
        this.gl = gl;

        // FIXME: when to call these detach/delete's? After succesful compilation?
        // gl.detachShader(this.shaderProgram, vertexShader);
        // gl.detachShader(this.shaderProgram, fragmentShader);
        // gl.deleteShader(vertexShader);
        // gl.deleteShader(fragmentShader);

        // creates a shader of the given type, uploads the source and
        // compiles it.
        function loadShader(gl, type, source) {

            var shader = gl.createShader(type);
            gl.shaderSource(shader, source); // Send the source of the shader
            gl.compileShader(shader); // Compile the shader program

            // See if it compiled successfully
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('ERROR occurred while compiling the shaders: ' + gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        }
    };

    DrawProgram$2.prototype._specify_data_for_shaderProgram = function _specify_data_for_shaderProgram (gl, shaderProgram, attribute_name, itemSize, stride, offset) {

        var attrib_location = gl.getAttribLocation(shaderProgram, attribute_name);
        gl.enableVertexAttribArray(attrib_location);
        gl.vertexAttribPointer(
            attrib_location,// * Attribute location
            itemSize,       // * Number of components per vertex attribute. Must be 1, 2, 3, or 4 (1d, 2d, 3d, or 4d).
            gl.FLOAT,       // * Type of elements
            false,          // * Is normalized?
            stride,         // * stride 
            offset          // * Offset from the beginning of 
        );

    };

    // from https://github.com/kelektiv/node-uuid
    // mit license

    // Lookup Table
    //let byteToHex = [];

    //for (let i = 0; i < 256; ++i) {
    //    byteToHex[i] = (i + 0x100).toString(16).substr(1);
    //}

    //function bytesToUuid(buf, offset) {
    //    let i = offset || 0;
    //    let bth = byteToHex;
    //    // join used to fix memory issue caused by concatenation: 
    //    // https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
    //    return ([bth[buf[i++]], bth[buf[i++]],
    //    bth[buf[i++]], bth[buf[i++]], '-',
    //    bth[buf[i++]], bth[buf[i++]], '-',
    //    bth[buf[i++]], bth[buf[i++]], '-',
    //    bth[buf[i++]], bth[buf[i++]], '-',
    //    bth[buf[i++]], bth[buf[i++]],
    //    bth[buf[i++]], bth[buf[i++]],
    //    bth[buf[i++]], bth[buf[i++]]]).join('');
    //}

    //function mathRNG() {
    //    let rnds = new Array(16);
    //    for (let i = 0, r; i < 16; i++) {
    //        if ((i & 0x03) === 0) {
    //            r = Math.random() * 0x100000000;
    //        }
    //        rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    //    }
    //    return rnds;
    //}

    function getUuid() {
    //    let x = mathRNG();
    //    return bytesToUuid(x);
        return Math.round(Math.random() * 1e18).toString(36).substring(0, 10)
    }
    // end: from https://github.com/kelektiv/node-uuid


    var MessageBus = function MessageBus() {
        this._topics = {}; // {topic: [subscriberFn, ...], ...}
    };

    MessageBus.prototype.publish = function publish (topic, message, sender) {
        // console.log('publish invoked ' + topic + ' ' + sender + ' ' + message);
        if (sender === null) {
            sender = 0;
        }
        var subscribers = this._topics[topic];
        if (!subscribers) {
            return false;
        }
        subscribers.forEach(function (subscriberFn) {
            setTimeout(subscriberFn(topic, message, sender), 0);
        });

        return true;
    };

    MessageBus.prototype.subscribe = function subscribe (topic, func) {
            var this$1 = this;

        // if the topic list does not exist yet, make one
        if (!this._topics[topic]) {
            this._topics[topic] = [];
        }
        // add the topic to the list
        this._topics[topic].push(func);
        // return reference to arrow function that removes subscription, once invoked
        return {
            remove: (function () {
                // console.log('Invoking remove')
                // console.log(this._topics[topic])
                // console.log('old length ' + this._topics[topic].length)
                var index = this$1._topics[topic].indexOf(func);
                // console.log(index)
                this$1._topics[topic].splice(index, 1);
                // console.log('new length ' + this._topics[topic].length)
                if (this$1._topics[topic].length === 0) {
                    delete this$1._topics[topic];
                }
            })
        }
    };

    var instance = new MessageBus();
    Object.freeze(instance);

    //all the different MessageBusConnectors share the same MessageBus (same topics)
    var MessageBusConnector = function MessageBusConnector() {
        this.id = getUuid();
    };

    MessageBusConnector.prototype.publish = function publish (topic, message) {
        return instance.publish(topic, message, this.id)
    };

    MessageBusConnector.prototype.subscribe = function subscribe (topic, func) {
        return instance.subscribe(topic, func)
    };

    // from Leaflet, BSD-license copyright

    /** hyperbolic sine function */
    function sinh(n) { return (Math.exp(n) - Math.exp(-n)) / 2; }

    /** hyperbolic cosine function */
    function cosh(n) { return (Math.exp(n) + Math.exp(-n)) / 2; }

    /** hyperbolic tangent function */
    function tanh(n) { return sinh(n) / cosh(n); }

    /** distance between two points */
    function distance(from, to) {
        var dx = to[0] - from[0],
            dy = to[1] - from[1];
        return Math.sqrt(dx*dx + dy*dy)
    }

    /** subtract vector b from vector a */
    function sub(a, b) {
        var result = [];
        for (var i = 0; i < a.length; i += 1) {
            result.push(a[i] - b[i]);
        }
        return result;
    }

    /** add vector a to vector b */
    function add(a, b) {
        var result = [];
        for (var i = 0; i < a.length; i += 1) {
            result.push(a[i] + b[i]);
        }
        return result;
    }

    /** multiply vector a with scalar b */
    function mul(a, b) {
        var result = [];
        for (var j = 0; j < a.length; j += 1) {
            result.push(a[j] * b);
        }
        return result;
    }

    /** Returns dot product of v1 and v2 */
    function dot(v1, v2) {
        var dot_value = 0;
        for (var i = 0; i < v1.length; i++) {
            dot_value += v1[i] * v2[i];
        }
        return dot_value;
    }

    /** Returns the norm of v, *squared*. */
    function norm2(v) {

        return dot(v, v);
    }

    /** L2 norm ~= euclidean length */
    function norm(a) {
        return Math.sqrt(norm2(a));
    }


    /** flyTo interpolation, produces a function
    that can interpolate for a fly to path, given the setup of
    start - end position and scale and total duration */
    function doFlyTo(startCenter, startDenominator, size, targetCenter, targetDenominator, durationSecs) {

        console.log(startCenter);
        console.log(startDenominator);

        console.log(size);

        console.log(targetCenter);
        console.log(targetDenominator);

        console.log(durationSecs);

        var travelVector = sub(targetCenter, startCenter);
        console.log(("travel vec := " + travelVector + " "));
        
        var travelDist = norm(travelVector);
        console.log (travelDist);
        // bail out -- no animation, just jump
        //    let options = options || {};
        //    if (options.animate === false || !Browser.any3d) {
        //        return this.setView(targetCenter, targetDenominator, options);
        //    }

        
        // this._stop();

        // get current center in pixel size
    //    let from = [] this.project(this.getCenter()),
    //        to = this.project(targetCenter),
    //        size = {x: ___, y: ___},
    //        startDenominator = this._zoom;

    //    targetCenter = toLatLng(targetCenter);
    //    targetDenominator = targetDenominator === undefined ? startDenominator : targetDenominator;

        var w0 = Math.max(size[0], size[1]),
            w1 = w0 * targetDenominator / startDenominator, // this.getZoomScale(startDenominator, targetDenominator),
            u1 = (distance(startCenter, targetCenter)) || 1,
            rho = Math.sqrt(2), // Parameter that we can use to influence the steepness of the arc
            rho2 = rho * rho;

    //    console.log(`w0 ${w0}`)
    //    console.log(`w1 ${w1}`)
    //    console.log(`u1 ${u1}`)
    //    console.log(`rho  ${rho}`)
    //    console.log(`rho2 ${rho2}`)

        function r(i) {
            var s1 = i ? -1 : 1,
                s2 = i ? w1 : w0,
                t1 = w1 * w1 - w0 * w0 + s1 * rho2 * rho2 * u1 * u1,
                b1 = 2.0 * s2 * rho2 * u1,
                b = t1 / b1,
                sq = Math.sqrt(b * b + 1) - b;
            // workaround for floating point precision bug when sq = 0, log = -Infinite,
            // thus triggering an infinite loop in flyTo
            var log = sq < 0.000000001 ? -18 : Math.log(sq);
            return log;
        }

        var r0 = r(0);
    //    console.log(r0)

        function w(s) { return w0 * (cosh(r0) / cosh(r0 + rho * s)); }
        function u(s) { return w0 * (cosh(r0) * tanh(r0 + rho * s) - sinh(r0)) / rho2; }
        function easeOut(t) { return 1 - Math.pow(1 - t, 1.5); }

    //    var start = Date.now(),
        var S = (r(1) - r0) / rho;
        
    //    console.log(S)
        
        var start = _now();
        var factor = 1.0;
        if (travelDist > 50000) {
            factor = 1.5;
        }

        var duration = durationSecs * factor * 1000;
        


            // duration = options.duration ? 1000 * options.duration : 1000 * S * 0.8;

        function interpolate(k)
        {
            var t = (_now() - start) / duration, 
                s = easeOut(t) * S;
    //            s = t * S

    //        console.log(u(s))
    //        console.log(u1)
    //        console.log( w0 / w(s) )
    //        console.log( w(s) / w0 * startDenominator)
    //        console.log("")

            if (t < 1) {
    //            console.log(`under way ${t} -> ${s}`)
                var center = add(startCenter, mul(sub(targetCenter, startCenter), u(s) / u1));
    //            console.log(`t: ${t}`)
    //            let center = add(startCenter, mul(travelVector, t))
                var scale = w(s) / w0 * startDenominator;
    //            console.log(center)
    //            console.log(scale)
                return [center, scale]
            } else {
    //            console.log('destination reached')
    //            console.log(targetCenter)
    //            console.log(targetDenominator)
                return [targetCenter, targetDenominator]
            }

        }
        return [interpolate, duration / 1000.0]
    }

    //function test() {

    //    let interpolator = doflyTo([76700.00, 438026], 48000, [730, 840], [74103.76, 445666.61], 48000.0, 3)

    //    // animate
    //    for (let time = 145000; time <= 145000+(6*1000); time += 500)
    //    {
    //        interpolator(time)
    //    }
    //}

    //test()

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

    // Check for RBush (needed for collision detection)
    var RBush = window.RBush;
    if (!RBush) {
        console.error("RBush library not found. Make sure it's loaded correctly via CDN script tag.");
    }

    // Label class with interpolation support
    var Label = function Label(id, text, position, rotation, opacity, step, feature_class) {
        if ( rotation === void 0 ) rotation = 0;
        if ( opacity === void 0 ) opacity = 1.0;
        if ( step === void 0 ) step = 0;
        if ( feature_class === void 0 ) feature_class = null;

        this.id = id;
        this.text = text;
        this.pos = position;  // [x, y] in world coordinates
        this.rotation = rotation;
        this.opacity = opacity;
        this.step = step;
        this.feature_class = feature_class;
    };

    // Label interpolator class
    var LabelInterpolator = function LabelInterpolator() {
        this.labels = new Map();  // Store labels by ID
        this.keySteps = new Set();  // Store all key steps
        this.stepHighs = new Map();  // Store step_high for each label
    };

    LabelInterpolator.prototype.setStepHighs = function setStepHighs (stepHighs) {
        this.stepHighs = stepHighs;
    };

    LabelInterpolator.prototype.addLabel = function addLabel (label) {
        if (!this.labels.has(label.id)) {
            this.labels.set(label.id, new Map());
        }
        this.labels.get(label.id).set(label.step, label);
        this.keySteps.add(label.step);
    };

    LabelInterpolator.prototype.interpolatePosition = function interpolatePosition (start, end, factor) {
        return [
            start[0] + (end[0] - start[0]) * factor,
            start[1] + (end[1] - start[1]) * factor
        ];
    };

    LabelInterpolator.prototype.interpolateRotation = function interpolateRotation (start, end, factor) {
        // Ensure angles are between 0 and 360
        start = ((start % 360) + 360) % 360;
        end = ((end % 360) + 360) % 360;

        // Find shortest path
        var diff = end - start;
        if (diff > 180) { diff -= 360; }
        if (diff < -180) { diff += 360; }

        return start + diff * factor;
    };

    LabelInterpolator.prototype.getInterpolatedLabel = function getInterpolatedLabel (id, currentStep) {
        var labelSteps = this.labels.get(id);
        if (!labelSteps || labelSteps.size === 0) { return null; }

        var stepHigh = this.stepHighs.get(id) || Infinity;
        var steps = Array.from(labelSteps.keys()).sort(function (a, b) { return a - b; });
        var firstStep = steps[0];
        var lastStep = steps[steps.length - 1];

        // Find surrounding key steps
        var prevStep = firstStep;
        var nextStep = firstStep;
        for (var i = 0; i < steps.length; i++) {
            if (steps[i] <= currentStep) { prevStep = steps[i]; }
            if (steps[i] >= currentStep) {
                nextStep = steps[i];
                break;
            }
        }

        var prevLabel = labelSteps.get(prevStep);

        // At exact key step
        if (currentStep === prevStep && currentStep < stepHigh) {
            return new Label(
                prevLabel.id,
                prevLabel.text,
                prevLabel.pos,
                prevLabel.rotation,
                1.0,
                currentStep,
                prevLabel.feature_class
            );
        }

        // Fade-out
        if (currentStep > lastStep && currentStep < stepHigh) {
            var denominator = stepHigh - lastStep;
            if (denominator <= 0) { return null; }

            var fadeFactor = 1 - ((currentStep - lastStep) / denominator);
            var lastLabel = labelSteps.get(lastStep);
            return new Label(
                lastLabel.id,
                lastLabel.text,
                lastLabel.pos,
                lastLabel.rotation,
                Math.max(0, fadeFactor),
                currentStep,
                lastLabel.feature_class
            );
        }

        // Past stepHigh
        if (currentStep >= stepHigh) { return null; }

        // Interpolation between steps
        if (prevStep !== nextStep) {
            var nextLabel = labelSteps.get(nextStep);
            var denom = nextStep - prevStep;
            if (denom === 0) { return prevLabel; }

            var factor = (currentStep - prevStep) / denom;
            var pos = this.interpolatePosition(prevLabel.pos, nextLabel.pos, factor);
            var rotation = this.interpolateRotation(prevLabel.rotation, nextLabel.rotation, factor);

            return new Label(
                prevLabel.id,
                prevLabel.text,
                pos,
                rotation,
                1.0,
                currentStep,
                prevLabel.feature_class
            );
        }

        return prevLabel;
    };

    var PixiLabelRenderer = function PixiLabelRenderer(map, msgbus, opts) {
        var this$1 = this;
        if ( opts === void 0 ) opts = {};

        // Check for PIXI
        if (!window.PIXI) {
            throw new Error('PixiLabelRenderer: window.PIXI not found. Make sure the pixi.js script is loaded.');
        }


        if (!window.PIXI.Application || !window.PIXI.Container || !window.PIXI.Text) {
            throw new Error('PixiLabelRenderer: Incomplete PIXI.js installation. Make sure you are using a complete version of PIXI.js');
        }

        this.map= map;
        this.msgbus = msgbus;
        this.opts   = opts;
        this._labelSprites = [];

        // console.log('PixiLabelRenderer options:', opts); // Log the options

        // 1. Create an overlay PIXI application
        var baseCanvas = map.getCanvasContainer();
        if (!baseCanvas || !baseCanvas.parentNode) {
            throw new Error('PixiLabelRenderer: Invalid canvas container');
        }
        var parent = baseCanvas.parentNode;

        try {
            // Create a temporary canvas to test PIXI initialization
            var tempCanvas = document.createElement('canvas');
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
                position:    'absolute',
                left:        '0',
                top:         '0',
                width:       ((parent.clientWidth) + "px"),  // Use exact pixel values
                height:      ((parent.clientHeight) + "px"),
                pointerEvents:   'none',
                zIndex:      '1000' // Ensure it's on top
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
            this.msgbus.subscribe('map.step', function (_topic, step) {
                // Ensure the step value never goes below 0
                this$1.currentStep = Math.max(0, step);
            });
                
            // Enable or disable collision detection
            this.collisionDetectionEnabled = true;

            // Zoom idle detection and opacity animation
            // this.previousScaleDenominator = null;
            this.zoomIdleFrames = 0;
            // this.zoomIdleThreshold = 30; // 30 frames ~0.5 seconds at 60fps
            this.isZoomIdle = false; // Controls when opacity animations are allowed to run
            this.opacityAnimationSpeed = 0.05; // Each frame, labels will fade in by 5% until reaching full opacity
            this.labelOpacityOverrides = new Map(); // Store opacity overrides for labels
            this.frameCount = 0; // Add frame counter
                
            // Zoom interaction tracking
            this.lastZoomTime = Date.now(); // The last time the user zoomed
            this.zoomIdleTimeout = 500; // milliseconds to wait after last zoom
                
            // Set up interaction listeners on the map's canvas
            var mapCanvas = this.map.getCanvasContainer();
            if (mapCanvas) {
                var updateZoomTime = function () {
                    // Refresh lastZoomTime whenever user zooms, reset idle clock
                    this$1.lastZoomTime = Date.now();
                    // If map was idle before:
                    if (this$1.isZoomIdle) {
                        console.log('Zoom interaction detected, marking zoom as active');
                        // Clear fade-in animations
                        this$1.labelOpacityOverrides.clear();
                        // Mark map as active again
                        this$1.isZoomIdle = false;
                        // Prepare to stop animation
                        this$1.zoomIdleFrames = 0;
                    }
                };
                    
                // Listen for zoom-specific events
                // Mouse wheel zoom
                mapCanvas.addEventListener('wheel', updateZoomTime);
                    
                // Pinch zoom detection
                var touchStartDistance = null;
                    
                // Remember how far apart the two fingers were at the beginning of the pinch
                // Calculate the distance between two fingers
                var getTouchDistance = function (touches) {
                    if (touches.length < 2) { return null; }
                    var dx = touches[0].clientX - touches[1].clientX;
                    var dy = touches[0].clientY - touches[1].clientY;
                    return Math.sqrt(dx * dx + dy * dy);
                };
                    
                // When two fingers touch, store the distance
                mapCanvas.addEventListener('touchstart', function (e) {
                    if (e.touches.length === 2) {
                        touchStartDistance = getTouchDistance(e.touches);
                    }
                });
                    

                // As the user moves fingers, check current pinch distance
                mapCanvas.addEventListener('touchmove', function (e) {
                    if (e.touches.length === 2 && touchStartDistance !== null) {
                        var currentDistance = getTouchDistance(e.touches);
                        if (currentDistance !== null) {
                            var distanceChange = Math.abs(currentDistance - touchStartDistance);
                            // Only count as zoom if pinch distance changed significantly
                            if (distanceChange > 10) {
                                updateZoomTime();
                                touchStartDistance = currentDistance;
                            }
                        }
                    }
                });
                    
                // When one or both fingers are lifted, stop tracking pinch distance
                mapCanvas.addEventListener('touchend', function (e) {
                    if (e.touches.length < 2) {
                        touchStartDistance = null;
                    }
                });
                    
                console.log('Zoom detection listeners set up successfully');
            }

            // Load label data (if provided) asynchronously
            if (opts.labelUrl) {
                console.log('Starting to load labels from:', opts.labelUrl);
                this._loadLabelData(opts.labelUrl);
            } else {
                console.warn('PixiLabelRenderer: No labelUrl provided in options');
            }

            // Keep overlay size in sync when map resizes
            msgbus.subscribe('map.resize', function (_t, size) {
                var w = size[0];
                var h = size[1];
                this$1.setViewport(w, h);
            });

            // Log successful initialization
            console.log('PixiLabelRenderer initialized successfully');
        } catch (error) {
            console.error('PixiLabelRenderer initialization failed:', error);
            throw error;
        }
    };

    PixiLabelRenderer.prototype._loadLabelData = function _loadLabelData (url) {
            var this$1 = this;

        console.log('Loading label data from:', url);
        fetch(url)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error(("HTTP error! status: " + (response.status)));
                }
                return response.json();
            })
            .then(function (data) {
                console.log('Received label data:', data);
                if (!Array.isArray(data)) {
                    throw new Error('Label data must be an array');
                }

                // Process labels and store step_high values
                this$1._labels = data.map(function (rec) {
                    if (!rec.name || !rec.anchor_geom || !rec.anchor_geom.coordinates) {
                        console.warn('Invalid label record:', rec);
                        return null;
                    }

                    var label = new Label(
                        (rec.label_trace_id !== undefined ? rec.label_trace_id : rec.id),
                        rec.name,
                        rec.anchor_geom.coordinates,
                        rec.angle || 0,
                        1.0,
                        rec.step_value || 0,
                        rec.feature_class || null
                    );

                    // Add to interpolator
                    this$1.interpolator.addLabel(label);
                    if (rec.step_high !== undefined) {
                        this$1.interpolator.stepHighs.set(label.id, rec.step_high);
                    }

                    return label;
                }).filter(function (label) { return label !== null; });

                // console.log('Created', this._labels.length, 'valid labels');
                this$1._buildSprites();
            })
            .catch(function (err) {
                console.error('PixiLabelRenderer failed to load labels:', err);
                this$1._labels = [];
            });
    };

    PixiLabelRenderer.prototype._buildSprites = function _buildSprites () {
        if (!this._labels || this._labels.length === 0) {
            console.warn('PixiLabelRenderer: No labels to build sprites for');
            return;
        }
            
        // Define styles for different feature classes
        var styles = {
            road: new window.PIXI.TextStyle({
                fontFamily: 'Arial',
                fontSize: 16,
                fill: 0xFF0000,  // Red
                align: 'center',
                stroke: 0xFFFFFF,
                strokeThickness: 4,
                fontWeight: 'bold'
            }),
            water: new window.PIXI.TextStyle({
                fontFamily: 'Arial',
                fontSize: 16,
                fill: 0x0000FF,  // Blue
                align: 'center',
                stroke: 0xFFFFFF,
                strokeThickness: 4,
                fontWeight: 'bold',
                fontStyle: 'italic'
            }),
            building: new window.PIXI.TextStyle({
                fontFamily: 'Arial',
                fontSize: 16,
                fill: 0x000000,  // Black
                align: 'center',
                stroke: 0xFFFFFF,
                strokeThickness: 4,
                fontWeight: 'bold'
            }),
            default: new window.PIXI.TextStyle({
                fontFamily: 'Arial',
                fontSize: 16,
                fill: 0x000000,  // Black
                align: 'center',
                stroke: 0xFFFFFF,
                strokeThickness: 4,
                fontWeight: 'bold'
            })
        };

        this._labelSprites = [];
        for (var i = 0, list = this._labels; i < list.length; i += 1) {
            var lbl = list[i];

                var container = new window.PIXI.Container();
                
            // Determine which style to use based on feature_class
            var style = styles.default;
            if (lbl.feature_class !== null) {
                if (lbl.feature_class >= 10000 && lbl.feature_class < 11000) {
                    style = styles.road;
                } else if (lbl.feature_class >= 12000 && lbl.feature_class < 13000) {
                    style = styles.water;
                } else if (lbl.feature_class >= 13000 && lbl.feature_class < 14000) {
                    style = styles.building;
                }
            }
                
            var txt = new window.PIXI.Text(lbl.text, style);
            txt.anchor.set(0.5);
            container.addChild(txt);
                
            this.container.addChild(container);
            this._labelSprites.push({ 
                label: lbl, 
                sprite: container,
                bounds: null  // Will store screen-space bounds for collision detection
            });
        }
    };

    PixiLabelRenderer.prototype._getLabelBounds = function _getLabelBounds (sprite, screenX, screenY) {
        var bounds = sprite.getLocalBounds();
        var padding = 2; 
            
        var angleRad = sprite.rotation;
        var cosA = Math.cos(angleRad);
        var sinA = Math.sin(angleRad);
            
        // Calculate corners of the unrotated box relative to center (with padding)
        var corners = [
            [-bounds.width/2 - padding, -bounds.height/2 - padding],
            [bounds.width/2 + padding, -bounds.height/2 - padding],
            [bounds.width/2 + padding, bounds.height/2 + padding],
            [-bounds.width/2 - padding, bounds.height/2 + padding]
        ];
            
        // Rotate corners and find min/max X and Y
        var minX = Infinity, minY = Infinity;
        var maxX = -Infinity, maxY = -Infinity;
            
        corners.forEach(function (ref) {
                var x = ref[0];
                var y = ref[1];

            // Rotate the corner
            var rotatedX = x * cosA - y * sinA;
            var rotatedY = x * sinA + y * cosA;
                
            // Translate to screen coordinates
            var worldX = screenX + rotatedX;
            var worldY = screenY + rotatedY;
                
            minX = Math.min(minX, worldX);
            minY = Math.min(minY, worldY);
            maxX = Math.max(maxX, worldX);
            maxY = Math.max(maxY, worldY);
        });
            
        return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
    };

    PixiLabelRenderer.prototype._resolveCollisions = function _resolveCollisions () {
            var this$1 = this;

        // Clear existing tree
        this.rbush.clear();

        // First pass: calculate bounds and sort by priority
        var labelBounds = this._labelSprites
            // Only consider sprites that are currently visible
            .filter(function (ref) {
                    var sprite = ref.sprite;

                    return sprite.visible;
            })
            .map(function (ref) {
                    var label = ref.label;
                    var sprite = ref.sprite;

                var bounds = this$1._getLabelBounds(sprite, sprite.x, sprite.y);
                return {
                    id: label.id,
                    minX: bounds.minX,
                    minY: bounds.minY,
                    maxX: bounds.maxX,
                    maxY: bounds.maxY,
                    label: label,
                    sprite: sprite,
                    // Get step_high from interpolator
                    stepHigh: this$1.interpolator.stepHighs.get(label.id) || Infinity,
                    // Use text length as secondary priority
                    textLength: label.text.length
                };
            })
            .sort(function (a, b) {
                // Sort by step_high (higher values first)
                if (a.stepHigh !== b.stepHigh) {
                    return b.stepHigh - a.stepHigh;
                }
                // If same step_high, prefer shorter text
                return a.textLength - b.textLength;
            });

        // Second pass: detect and resolve collisions with priority
        labelBounds.forEach(function (item) {
            // Search for collisions
            var searchBounds = {
                minX: item.minX,
                minY: item.minY,
                maxX: item.maxX,
                maxY: item.maxY
            };
                
            var collisions = this$1.rbush.search(searchBounds);
                // .filter(other => other.id !== item.id); 

            if (collisions.length === 0) {
                // No collision, add to tree and show label
                this$1.rbush.insert(item);
                item.sprite.visible = true;
            } else {
                // Collision detected, hide this label
                item.sprite.visible = false;
            }
        });
    };


    PixiLabelRenderer.prototype.setViewport = function setViewport (w, h) {
        // Update both the renderer size and the canvas size
        this.app.renderer.resize(w, h);
            
        // Ensure the canvas size matches
        this.app.view.width = w;
        this.app.view.height = h;
            
        // Update the style to match
        Object.assign(this.app.view.style, {
            width: (w + "px"),
            height: (h + "px")
        });
            
        console.log('Viewport resized:', {
            width: w,
            height: h,
            renderer: [this.app.renderer.width, this.app.renderer.height],
            canvas: [this.app.view.width, this.app.view.height],
            style: [this.app.view.style.width, this.app.view.style.height]
        });
    };

    /** Update is called by Map each animation frame. */
    /* eslint-disable-next-line no-unused-vars */
    PixiLabelRenderer.prototype.update = function update (_rectIgnored, scaleDenominator, _matrixIgnored) {
            var this$1 = this;

        if (!this._labelSprites || this._labelSprites.length === 0) {
            return; // labels not loaded yet
        }

        // Synchronise currentStep with the map
        // Try to reuse the SSCLayer's step calculation when available. This keeps label behaviour consistent with the map rendering logic.
        if (this.sscLayer === null && this.map && Array.isArray(this.map.renderers)) {
            var rendererWithLayer = this.map.renderers.find(function (r) { return r.layer && typeof r.layer.getStepFromDenominator === 'function'; });
            if (rendererWithLayer) {
                this.sscLayer = rendererWithLayer.layer;
            }
        }

        if (this.sscLayer && typeof this.sscLayer.getStepFromDenominator === 'function') {
            this.currentStep = Math.max(0, this.sscLayer.getStepFromDenominator(scaleDenominator));
        }

        // Check if zoom has been idle based on zoom time
        // this.lastZoomTime was updated via mouse/touch events
        var timeSinceLastZoom = Date.now() - this.lastZoomTime;
        var isZoomIdleNow = timeSinceLastZoom > this.zoomIdleTimeout;
            
        // Log zoom status periodically
        // Every 60 frames(~1 sec), print debug info
        if (this.frameCount % 60 === 0) {
            console.log('Zoom status:', {
                timeSinceLastZoom: timeSinceLastZoom,
                isZoomIdleNow: isZoomIdleNow,
                isZoomIdle: this.isZoomIdle,
                currentStep: this.currentStep
            });
                
            // Also log opacity override status
            if (this.labelOpacityOverrides.size > 0) {
                var overrides = Array.from(this.labelOpacityOverrides.entries()).map(function (ref) {
                        var id = ref[0];
                        var opacity = ref[1];

                        return ({
                    id: id,
                    opacity: opacity.toFixed(3)
                });
                    });
                console.log('Active opacity overrides:', overrides);
            }
        }
            
        // Update zoom idle state based on zoom interaction
        if (isZoomIdleNow && !this.isZoomIdle) {
            this.isZoomIdle = true;
            console.log('Zoom is idle! Starting label opacity animations');
                
            // Count and list labels with partial opacity
            var partialOpacityCount = 0;
            var partialOpacityLabels = [];
            this._labelSprites.forEach(function (ref) {
                    var label = ref.label;

                var interpolated = this$1.interpolator.getInterpolatedLabel(label.id, this$1.currentStep);
                if (interpolated && interpolated.opacity < 1.0) {
                    partialOpacityCount++;
                    partialOpacityLabels.push({
                        id: label.id,
                        text: label.text,
                        opacity: interpolated.opacity.toFixed(3)
                    });
                }
            });
                
            if (partialOpacityCount > 0) {
                console.log(("Found " + partialOpacityCount + " labels to animate:"), partialOpacityLabels);
            } else {
                console.log('No labels with partial opacity found at current zoom level');
            }
        } else if (!isZoomIdleNow && this.isZoomIdle) {
            // Zoom just became active
            this.isZoomIdle = false;
            console.log('Zoom active! Resetting label opacities');
            this.labelOpacityOverrides.clear();
            // Reset all label opacities to their interpolated values
            this._labelSprites.forEach(function (ref) {
                    var label = ref.label;
                    var sprite = ref.sprite;

                var interpolated = this$1.interpolator.getInterpolatedLabel(label.id, this$1.currentStep);
                if (interpolated) {
                    sprite.alpha = interpolated.opacity;
                }
            });
        }
            
        this.frameCount++;

        // Fetch the up-to-date world->viewport matrix from the map
        var mat = this.map.getTransform().worldViewportMatrix;
        if (!mat) {
            console.warn('PixiLabelRenderer: No transform matrix available');
            return;
        }

        // Position each sprite and update interpolated states
        this._labelSprites.forEach(function (ref) {
                var label = ref.label;
                var sprite = ref.sprite;

            // Get interpolated label state
            var interpolated = this$1.interpolator.getInterpolatedLabel(label.id, this$1.currentStep);
            if (!interpolated) {
                sprite.visible = false;
                return;
            }

            // Transform world coordinates to screen coordinates
            var out = new Float64Array(3);
            vec3transform(out, [interpolated.pos[0], interpolated.pos[1], 0], mat);
                
            // Update sprite properties
            sprite.x = out[0];
            sprite.y = this$1.app.renderer.height - out[1];
                
            // Calculate rotation
            var matrixRotation = Math.atan2(mat[1], mat[0]) * (180 / Math.PI);

            // Check if this is a building label (feature_class between 13000 and 14000)
            var isBuilding = label.feature_class >= 13000 && label.feature_class < 14000;
                
            // Set rotation to 0 for buildings, otherwise use the original rotation
            sprite.rotation = isBuilding ? 0 : (-(interpolated.rotation + matrixRotation)) * (Math.PI / 180);
                
            // Check if we have an opacity override first (from previous idle animation)
            // If label is already in the middle of animation
            if (this$1.labelOpacityOverrides.has(label.id)) {
                // Use the override opacity (which persists during panning)
                sprite.alpha = this$1.labelOpacityOverrides.get(label.id);
                    
                // Continue animating if zoom is still idle and not yet fully opaque
                if (this$1.isZoomIdle && sprite.alpha < 1.0) {
                    var newOpacity = Math.min(1.0, sprite.alpha + this$1.opacityAnimationSpeed);
                    this$1.labelOpacityOverrides.set(label.id, newOpacity);
                    sprite.alpha = newOpacity;
                        
                    if (newOpacity >= 1.0) {
                        console.log(("Opacity animation completed for label " + (label.id) + ":"), label.text);
                    }
                }
            } else {
                // No override, use interpolated opacity
                sprite.alpha = interpolated.opacity;
                    
                // Start animation if zoom is idle and opacity < 1
                if (this$1.isZoomIdle && interpolated.opacity < 1.0) {
                    // Add it to labelOpacityOverrides to it will be animated in the next frame
                    this$1.labelOpacityOverrides.set(label.id, interpolated.opacity);
                    console.log(("Starting opacity animation for label " + (label.id) + ":"), {
                        text: label.text,
                        startOpacity: interpolated.opacity
                    });
                }
            }
                
            // Clear overrides only when zoom becomes active again
            if (!this$1.isZoomIdle && this$1.labelOpacityOverrides.size > 0) {
                console.log('Clearing opacity overrides due to zoom activity');
                this$1.labelOpacityOverrides.clear();
            }

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
    };

    PixiLabelRenderer.prototype.setCollisionDetection = function setCollisionDetection (enabled) {
        this.collisionDetectionEnabled = enabled;
    };

    var DrawProgram$1 = function DrawProgram(gl, vertexShaderText, fragmentShaderText) {

        var vertexShader   = loadShader(gl, gl.VERTEX_SHADER,   vertexShaderText);
        var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderText);

        // create program: attach, link, validate, detach, delete
        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('ERROR linking program!', gl.getProgramInfoLog(shaderProgram));
            return;
        }
        gl.validateProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.VALIDATE_STATUS)) {
            console.error('ERROR validating program!', gl.getProgramInfoLog(shaderProgram));
            return;
        }

        this.shaderProgram = shaderProgram;
        this.gl = gl;

        // FIXME:
        // when to call these detach/delete's? After succesful compilation?
        // gl.detachShader(this.shaderProgram, vertexShader);
        // gl.detachShader(this.shaderProgram, fragmentShader);
        // gl.deleteShader(vertexShader);
        // gl.deleteShader(fragmentShader);

        // creates a shader of the given type, uploads the source and
        // compiles it.
        function loadShader(gl, type, source) {

            var shader = gl.createShader(type);
            gl.shaderSource(shader, source); // Send the source of the shader
            gl.compileShader(shader); // Compile the shader program

            // See if it compiled successfully
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('ERROR occurred while compiling the shaders: ' + gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        }
    };

    DrawProgram$1.prototype.clearColor = function clearColor () {
        var gl = this.gl;
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT); // clear color buffer
    };

    DrawProgram$1.prototype.draw = function draw (layer, opacity)
    {
        var triangleVertexPosBufr = layer.vertexCoordBuffer;
        // render
        var gl = this.gl;
        gl.useProgram(this.shaderProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);
        this.specifyData('pos', 2, 2*4, 0);

        var opacity_location = gl.getUniformLocation(this.shaderProgram, 'opacity');
        gl.uniform1f(opacity_location, opacity);

        gl.disable(gl.BLEND);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    DrawProgram$1.prototype.specifyData = function specifyData (attribute_name, itemSize, stride, offset) {
        var gl = this.gl, shaderProgram = this.shaderProgram;
        var attrib_location = gl.getAttribLocation(shaderProgram, attribute_name);
        gl.enableVertexAttribArray(attrib_location);
        gl.vertexAttribPointer(
            attrib_location,// * Attribute location
            itemSize,       // * Number of components per vertex attribute. Must be 1, 2, 3, or 4 (1d, 2d, 3d, or 4d).
            gl.FLOAT,       // * Type of elements
            false,          // * Is normalized?
            stride,         // * stride 
            offset          // * Offset from the beginning of 
        );
    };

    var BackgroundRenderer = function BackgroundRenderer(gl, msgbus)
    {
        this.gl = gl;
        this.msgbus = msgbus;
        this.vertexCoordBuffer = null;  // will be set by uploadPoints
        this.program = new DrawProgram$1(this.gl,
    "\nprecision mediump float;\nattribute vec2 pos;\nvarying vec4 fragColor;\nuniform float opacity;\nvoid main()\n{\n    fragColor = vec4(1.0, 1.0, 1.0, 1.0);\n    gl_Position = vec4(pos, 0.0, opacity);\n}\n"
    ,
    "\nprecision mediump float;\nvarying vec4 fragColor;\nvoid main()\n{\n    gl_FragColor = vec4(fragColor);\n}\n"
        );
        this.uploadPoints();
    };

    BackgroundRenderer.prototype.uploadPoints = function uploadPoints ()
    {
        var gl = this.gl;
        var xmin = -1.0, ymin = -1.0, xmax = 1.0, ymax = 1.0;

        this.vertexCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexCoordBuffer);
        var coords = new Float32Array([
            xmin, ymax,
            xmin, ymin,
            xmax, ymax,
            xmax, ymin
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STATIC_DRAW);
    };

    /** destroy the gpu resources that were allocated */
    BackgroundRenderer.prototype.dispose = function dispose ()
    {
        var gl = this.gl;
        // clear buffers 
        var buffers = [this.vertexCoordBuffer];
        buffers.forEach(
            function (buffer) {
                if (buffer !== null) {
                    gl.deleteBuffer(buffer);
                    buffer = null;
                }
            }
        );
    };

    BackgroundRenderer.prototype.update = function update (aabb, scaleDenominator, matrix, opacity) {
         this.program.draw(this, opacity);
    };

    BackgroundRenderer.prototype.clearColor = function clearColor () {
        console.log('clearColor in Background called');
        this.program.clearColor();
    };

    BackgroundRenderer.prototype.setViewport = function setViewport (width, height) {
        this.gl.viewport(0, 0, width, height);
    };

    var DrawProgram = function DrawProgram(gl, vertexShaderText, fragmentShaderText) {

        var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderText);
        var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderText);

        // Create program: attach, link, validate, detach, delete
        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('ERROR linking program!', gl.getProgramInfoLog(shaderProgram));
            return;
        }
        gl.validateProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.VALIDATE_STATUS)) {
            console.error('ERROR validating program!', gl.getProgramInfoLog(shaderProgram));
            return;
        }

        this.shaderProgram = shaderProgram;
        this.gl = gl;

        // creates a shader of the given type, uploads the source and
        // compiles it.
        function loadShader(gl, type, source) {

            var shader = gl.createShader(type);
            gl.shaderSource(shader, source); // Send the source of the shader
            gl.compileShader(shader); // Compile the shader program

            // See if it compiled successfully
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('ERROR occurred while compiling the shaders: ' + gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        }
    };

    DrawProgram.prototype._specify_data_for_shaderProgram = function _specify_data_for_shaderProgram (gl, shaderProgram, attribute_name, itemSize, stride, offset) {

        var attrib_location = gl.getAttribLocation(shaderProgram, attribute_name);
        gl.enableVertexAttribArray(attrib_location);
        gl.vertexAttribPointer(
            attrib_location,// * Attribute location
            itemSize,       // * Number of components per vertex attribute.
                                //   Must be 1, 2, 3, or 4 (1d, 2d, 3d, or 4d).
            gl.FLOAT,       // * Type of elements
            false,          // * Is normalized?
            stride,         // * stride 
            offset          // * Offset from the beginning of 
        );
    };


    var PolygonDrawProgram = /*@__PURE__*/(function (DrawProgram) {
        function PolygonDrawProgram(gl) {

            var vertexShaderText = "\nprecision highp float;\n\nattribute vec3 vertexPosition_modelspace;\nattribute vec3 vertexColor;\nuniform mat4 M;\nvarying vec4 fragColor;\nuniform float opacity;\n\nvoid main()\n{\n    fragColor = vec4(vertexColor, opacity);\n    gl_Position = M * vec4(vertexPosition_modelspace, 1);\n}\n";
            var fragmentShaderText = "\nprecision highp float;\n\nvarying vec4 fragColor;\nvoid main()\n{\n    gl_FragColor = vec4(fragColor);\n}\n";

            DrawProgram.call(this, gl, vertexShaderText, fragmentShaderText);
        }

        if ( DrawProgram ) PolygonDrawProgram.__proto__ = DrawProgram;
        PolygonDrawProgram.prototype = Object.create( DrawProgram && DrawProgram.prototype );
        PolygonDrawProgram.prototype.constructor = PolygonDrawProgram;

        PolygonDrawProgram.prototype.taint = function taint ()
        {

            //let gl = this.gl;
            //let shaderProgram = this.shaderProgram;
            //gl.useProgram(shaderProgram);
            //this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexPosition_modelspace', 3, 24, 0);
            //itemSize = 3: r_frac, g_frac, b_frac;   offset = 12: the first 12 bytes are for x, y, z
            //this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexColor', 3, 24, 12);
        };

        PolygonDrawProgram.prototype.clear = function clear ()
        {
            // clear both the color and the depth
            // instead of clearing per tile, 
            // we clear before and after all tiles have been rendered
            // this way the contents of the depth buffer is preserved between tiles (which is what we need, 
            // to guarantee the final image to be correct)
            var gl = this.gl;
            gl.clearDepth(1.0);
            gl.clear(gl.CLEAR_COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        };

        PolygonDrawProgram.prototype.drawTile = function drawTile (matrix, tile, opacity, denominator, step, boundaryWidth)
        {
        // drawTile(matrix, tile, tree_setting, width, height) {
            // guard: if no data in the tile, we will skip rendering
            var triangleVertexPosBufr = tile.polygon_triangleVertexPosBufr;
            if (triangleVertexPosBufr === null) {
                //console.log('drawprograms.js draw_tile, triangleVertexPosBufr:', triangleVertexPosBufr)
                return;
            }
            // render
            var gl = this.gl;
            var shaderProgram = this.shaderProgram;
            gl.useProgram(shaderProgram);
            gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);

            //var readout = new Uint8Array(4);
            //gl.readPixels(width / 2, height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
            //gl.readPixels(0.5, 0.5, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
            //console.log('drawprograms.js width / 2, height / 2:', width / 2, height / 2)
            //console.log('drawprograms.js color of the center before drawing:', readout)

            //stride = 24: each of the six values(x, y, z, r_frac, g_frac, b_frac) takes 4 bytes
            //itemSize = 3: x, y, z;   
            this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexPosition_modelspace', 3, 24, 0);
            //itemSize = 3: r_frac, g_frac, b_frac;   offset = 12: the first 12 bytes are for x, y, z
            this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexColor', 3, 24, 12);

            {
                var M_location = gl.getUniformLocation(shaderProgram, 'M');
                gl.uniformMatrix4fv(M_location, false, matrix);

                var opacity_location = gl.getUniformLocation(shaderProgram, 'opacity');
                gl.uniform1f(opacity_location, opacity);
            }

            gl.disable(gl.CULL_FACE);
            // gl.enable(gl.CULL_FACE); //must ENABLE       
            //if (tree_setting.draw_cw_faces == true) {
            //gl.cullFace(gl.BACK); //triangles from FME are clockwise
            //}
            //else {
            // gl.cullFace(gl.FRONT); //triangles from SSC are counterclockwise; 
            //}
            //gl.cullFace(gl.BACK);
            //gl.cullFace(gl.FRONT);

            //if (tree_setting.do_depth_test == true) {
            gl.enable(gl.DEPTH_TEST);
            //}
            //else {            
            //    gl.disable(gl.DEPTH_TEST);
            //}
            //if a fragment is closer to the camera, then it has a smaller depth value
            gl.depthFunc(gl.LESS); 

            

    //        gl.depthFunc(gl.LEQUAL); 

            //see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc

            //if (tree_setting.do_blend == false || tree_setting.opacity == 1) {
                //After an area merges another area, we can see a thin sliver.
                //disable blending can avoid those slivers,
                //but the alpha value does not have influence anymore
                //when the opacity is 1, we do not need to blend
                //gl.disable(gl.BLEND) 
            //}
            //else {
                gl.disable(gl.BLEND);
            //}        
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); //make it transparent according to alpha value
            //renderer._clearDepth()
            //gl.disable(gl.BLEND)
            gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPosBufr.numItems);
    //        gl.drawArrays(gl.LINES, 0, triangleVertexPosBufr.numItems);

            //gl.readPixels(width / 2, height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
            //gl.readPixels(0.5, 0.5, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
            //console.log('drawprograms.js width / 2, height / 2:', width / 2, height / 2)
            //console.log('drawprograms.js color of the center before drawing:', readout)
        };

        return PolygonDrawProgram;
    }(DrawProgram));


    var LineDrawProgram = /*@__PURE__*/(function (DrawProgram) {
        function LineDrawProgram(gl) {

            var vertexShaderText = "\nprecision highp float;\n\nattribute vec2 displacement;\nattribute vec4 vertexPosition_modelspace;\n\nuniform mat4 M;\nuniform float near;\nuniform float half_width_reality;\n\n\nvoid main()\n{\n    vec4 pos = vertexPosition_modelspace;\n    if (pos.z <= near && pos.w > near)\n    {\n        pos.x +=  displacement.x * half_width_reality;\n        pos.y +=  displacement.y * half_width_reality;\n        gl_Position = M * vec4(pos.xyz, 1.0);\n    } else {\n        gl_Position = vec4(-10.0,-10.0,-10.0,1.0);\n        return;\n    }\n}\n";

            var fragmentShaderText = "\nprecision highp float;\nuniform vec4 uColor;\n\nvoid main()\n{\n    gl_FragColor = uColor; // color of the lines\n}\n";

            DrawProgram.call(this, gl, vertexShaderText, fragmentShaderText);

    //        this.colors = [[141, 211, 199]
    //            , [190, 186, 218]
    //            , [251, 128, 114]
    //            , [128, 177, 211]
    //            , [253, 180, 98]
    //            , [179, 222, 105]
    //            , [252, 205, 229]
    //            , [217, 217, 217]
    //            , [188, 128, 189]
    //            , [204, 235, 197]
    //        ].map(x => { return [x[0] / 255., x[1] / 255., x[2] / 255.]; });
            this.colors = [
    //            [166,206,227],
    //            [31,120,180],
    //            [178,223,138],
    //            [51,160,44],
    //            [251,154,153],
    //            [227,26,28],
    //            [253,191,111],
    //            [255,127,0],
    //            [202,178,214],
    //            [106,61,154],
    //            [255,255,153],
    //            [177,89,40],

    // [27.,158.,119.],
    // [217.,95.,2.],
    // [117.,112.,179.],
    // [231.,41.,138.],
    // [102.,166.,30.],
    // [230.,171.,2.],
    // [166.,118.,29.],

    [0., 0., 0.]

            ].map(function (x) { return [x[0] / 255., x[1] / 255., x[2] / 255.]; });
            console.log(this.colors);
        }

        if ( DrawProgram ) LineDrawProgram.__proto__ = DrawProgram;
        LineDrawProgram.prototype = Object.create( DrawProgram && DrawProgram.prototype );
        LineDrawProgram.prototype.constructor = LineDrawProgram;
        
        LineDrawProgram.prototype.taint = function taint ()
        {
            //let gl = this.gl;
            //let shaderProgram = this.shaderProgram;
            //gl.useProgram(shaderProgram);
            //this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexPosition_modelspace', 4, 0, 0);
            ////itemSize = 3: r_frac, g_frac, b_frac;   offset = 12: the first 12 bytes are for x, y, z
            //this._specify_data_for_shaderProgram(gl, shaderProgram, 'displacement', 2, 0, 0);
        };
        

        LineDrawProgram.prototype.drawTile = function drawTile (matrix, tile, opacity, denominator, step, boundaryWidth)
        {
            var gl = this.gl;
            var shaderProgram = this.shaderProgram;
            var triangleVertexPosBufr = tile.line_triangleVertexPosBufr;
            var displacementBuffer = tile.displacementBuffer;

            if (triangleVertexPosBufr === null) {
                return;
            }
            gl.useProgram(shaderProgram);

            gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);
            this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexPosition_modelspace', 4, 0, 0);
                                                //(gl, shaderProgram, attribute_name, itemSize, stride, offset) 
            gl.bindBuffer(gl.ARRAY_BUFFER, displacementBuffer);
            this._specify_data_for_shaderProgram(gl, shaderProgram, 'displacement', 2, 0, 0);

            var half_width_reality = boundaryWidth * denominator / 1000 / 2;
            { // -- BEGIN scope region
            var M_location = gl.getUniformLocation(shaderProgram, 'M');
            gl.uniformMatrix4fv(M_location, false, matrix);
            // console.log(`matrix := ${matrix}`)

            var near_location = gl.getUniformLocation(shaderProgram, 'near');
            gl.uniform1f(near_location, step);
            // console.log(`near := ${step}`)

            var half_width_reality_location = gl.getUniformLocation(shaderProgram, 'half_width_reality');
            gl.uniform1f(half_width_reality_location, half_width_reality);
            // make color for this tile
    //        let r
    //        if (tile.id == 1) {
    //            r = 1.0
    //        } else {
    //            r = 0.0
    //        }
            // let c = this.colors[tile.id % this.colors.length]
            // let c = [0.663, 0.663, 0.663]; //dark gray
            var c = [0,0,0]; // all black
    //        let c = [1,1,1] // all white
            var color_location = gl.getUniformLocation(shaderProgram, 'uColor');
            gl.uniform4f(color_location, c[0], c[1], c[2], 0.5);
            } // -- END scope region
            // FIXME: should we be explicit about face orientation and use culling?
            gl.disable(gl.CULL_FACE);
            gl.disable(gl.DEPTH_TEST);

            //see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc
    //        if (tree_setting.do_blend == true) {
              //  gl.enable(gl.BLEND)
    //        }
    //        else {
            gl.disable(gl.BLEND);
    //        }
            //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA) //make it transparent according to alpha value
    //        console.log(`gl.TRIANGLES with numItems: ${triangleVertexPosBufr.numItems}`)
            gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPosBufr.numItems);
        };

        return LineDrawProgram;
    }(DrawProgram));

    var WorkerHelper = function WorkerHelper() {
        var this$1 = this;

        this.tasks = {};
        this.worker = new Worker('worker.js');
        this.worker.onmessage = function (evt) { this$1.receive(evt); }; //evt: {id: id, msg: arrays}, arrays; see worker.js
    };

    WorkerHelper.prototype.send = function send (url, callback) //e.g., callback: the function of makeBuffers in TileContent.load_ssc_tile(url, gl)
    {
        // use a random id
        var id = Math.round((Math.random() * 1e18)).toString(36).substring(0, 10);
        this.tasks[id] = callback;
        this.worker.postMessage({ id: id, msg: url }); //parse the data of the obj file specified by the url
    };

    WorkerHelper.prototype.receive = function receive (evt) {
        var id = evt.data.id;
        var msg = evt.data.msg; // e.g., arrays = parse_obj(data_text)
        this.tasks[id](msg); // execute the callback that was registered while sending
        delete this.tasks[id];
    };

    //import { LRU } from './lru';

    var GPUTile = function GPUTile(gl, id)
    {
        this.gl = gl;
        this.id = id;

        // FIXME: should we split these buffers into two separate 'layers' 
        // -> PolylineLayer / AreaLayer
        this.polygon_triangleVertexPosBufr = null;
        //
        this.line_triangleVertexPosBufr = null;
        this.displacementBuffer = null;

    };
        
    GPUTile.prototype.uploadArrays = function uploadArrays (data)
    {
        var gl = this.gl;
            
    //    console.log(`uploading data for tile ${this.id}`)
    //    console.log(data)
        // buffer for triangles of polygons
        // itemSize = 6: x, y, z, r_frac, g_frac, b_frac (see parse.js)
        //console.log('tilecontent.js data[0]:', data[0])
        //gl.bindFramebuffer(gl.FRAMEBUFFER, gl.fbo); //FIXME: could we remove this line?
        this.polygon_triangleVertexPosBufr = create_data_buffer(gl, new Float32Array(data[0]), 6);
        //gl.bindFramebuffer(gl.FRAMEBUFFER, null);  //FIXME: could we remove this line?

        // buffer for triangles of boundaries
        // itemSize = 4: x, y, z (step_low), w (step_high); e.g., start (see parse.js)
        this.line_triangleVertexPosBufr = create_data_buffer(gl, new Float32Array(data[1]), 4);

        // buffer for displacements of boundaries
        // itemSize = 2: x and y; e.g., startl (see parse.js)
        this.displacementBuffer = create_data_buffer(gl, new Float32Array(data[2]), 2);

        function create_data_buffer(gl, data_array, itemSize) {
            var data_buffer = gl.createBuffer();
            //Unfortunately, the data that is buffered must be with type Float32Array (not Float64Array)
            gl.bindBuffer(gl.ARRAY_BUFFER, data_buffer); 
            gl.bufferData(gl.ARRAY_BUFFER, data_array, gl.STATIC_DRAW);
            // FIXME: 
            data_buffer.itemSize = itemSize; //x, y, z, r_frac, g_frac, b_frac
            data_buffer.numItems = data_array.length / itemSize;
            return data_buffer;
        }
    };

    var SSCRenderer = function SSCRenderer(gl, msgBus, layer)
    {
        this.layer = layer;     // new SSCLayer(msgbus, tree_setting)
        this.gl = gl;
        this.msgBus = msgBus;

        // FIXME: LRU ???
        this.activeTiles = new Map();
        this.activeDownloads = new Map();

        this.lineDrawProgram = new LineDrawProgram(gl);
        this.polygonDrawProgram = new PolygonDrawProgram(gl);

        this.workerHelper = new WorkerHelper();
    };

    SSCRenderer.prototype.setViewport = function setViewport (width, height) {
        // console.error(`SSCRenderer not using the setViewport values yet ${width}, ${height}`)
    };

    SSCRenderer.prototype.prepareMatrix = function prepareMatrix (matrix, near, far) {
        // sets up the orthogonal projection for the z-axis (scale dimension)
        var m = clone(matrix);
        m[10] = -2.0 / (near - far);
        m[14] = (near + far) / (near - far);
        return m
    };

    SSCRenderer.prototype.update = function update (box2d, scaleDenominator, matrix, opacity) {
            var this$1 = this;

    //    console.log(`update of SSCRender called ${box2d} ${scaleDenominator}`)
        var step = this.layer.getStepFromDenominator(scaleDenominator);
        //let step = 30
        // let step = 9474
        // FIXME: for debugging it would be nice if we could set a fixed
        // step value in the interface, and then have it use that value
        //let step = 11963

        // tree traversal to get what to render
        // if the tree is not fully complete,
        // a traversal should load the tree parts that are not yet there
        // a mesage that the subtree is loaded could then trigger a re-render
        // it's most efficient if the traversal is done once
        // (and not in 2 separate phases, as was implemented earlier)

        // FIXME:
        // should this part not go to the SSCLayer, which is more a SSCDataSource
        // then a SSCDataSource can supply multiple layers 
        // (currently: line, area, future: point / poi / text ???)
        // Each layer comes with a specific program for drawing 
        // (and thus requires its own buffers with triangles / textures / etc
        var box3d = [box2d[0], box2d[1], step, box2d[2], box2d[3], step];
        var chunksInView = this.layer.chunksInView(box3d);

        var chunkIdsOnScreen = new Set();
        chunksInView.map(function (chunk) { 
            var chunkId = chunk.id;
            chunkIdsOnScreen.add(chunkId);
        });

        var gpuTiles = [];
        // let activeIdsDebug = []
        chunksInView.forEach(function (tile) {
            var tileId = tile.id;
            if (this$1.activeTiles.has(tileId)) {
                // activeIdsDebug.push(tileId)
                gpuTiles.push(this$1.activeTiles.get(tileId));
            } else {
                var gpuTile = new GPUTile(this$1.gl, tileId);
                // maybe this code should live in a worker
                // and the worker should be able to:
                // - queue requests
                // - cancel on-going fetch requests
                this$1.workerHelper.send(
                    tile.url,
                    // callback, once finished
                    function (arrays) {
                        gpuTile.uploadArrays(arrays);
                        this$1.activeDownloads.delete(tileId);
                        this$1.msgBus.publish('data.tile.loaded', 'tile.ready');
                    }
                );
                //let abortController = new AbortController();
                //const signal = abortController.signal;
                gpuTiles.push(gpuTile);
                this$1.activeTiles.set(tileId, gpuTile);
                this$1.activeDownloads.set(tileId, true);
                /*
                fetch(tile.url, { mode: 'cors', signal})
                    .then(response => { return response.text() })
                    .then(data_text => { 
                        let arrays = parse_obj(data_text)
                        // console.log(arrays)
                        return arrays
                    })
                    .then((arrays) => {
                        gpuTile.uploadArrays(arrays)
                        this.activeDownloads.delete(tileId)
                        this.msgBus.publish('data.tile.loaded', 'tile.ready')
                    })
                    
                */
            }
        });

        this.msgBus.publish('map.step', step);
        this.msgBus.publish('data.ssc.chunksInView', gpuTiles.length);
        this.msgBus.publish('data.ssc.chunksDownloading', this.activeDownloads.size);
        // console.log(step)
        {
            var m = this.prepareMatrix(matrix, step, 5176476); //288727)
            // this.polygonDrawProgram.taint()
            this.polygonDrawProgram.clear();
            gpuTiles.forEach(function (gpuTile) {
                this$1.polygonDrawProgram.drawTile(m, gpuTile, 
                    0.5, // 1.0, 
                    scaleDenominator, step, 0.5);
            });
            this.polygonDrawProgram.clear();
        }
        {
            var m$1 = this.prepareMatrix(matrix, step, -0.5);
            // this.lineDrawProgram.taint()
            gpuTiles.forEach(function (gpuTile) {
                this$1.lineDrawProgram.drawTile(m$1, gpuTile, 
                    0.5, // 1.0, 
                    scaleDenominator, step, 0.25);
            });
        }
    };

    var SSCLayer = function SSCLayer(msgbus, tree_setting) {
        this.msgbus = msgbus;
        this.tree = null;
        this.settings = tree_setting;
    };
    SSCLayer.prototype.load = function load () {
            var this$1 = this;
     // FIXME: rename? loadChunkIndex()
        var url = this.settings.tree_root_href + this.settings.tree_root_file_nm;
        console.log(("fetching " + url));
        fetch(url)
          .then(function (r) {
            return r.json()
          })
          .then(function (tree) {  //tree: the content in the json file
            this$1.tree = tree;
            // console.log(tree)
            //all the dataelements recorded in .json file
            var dataelements = this$1.obtainDataelements();
            //originally, each element has attributes "id", "box", "info"
            dataelements.forEach(function (element) { 
              element.content = null;
              element.last_touched = null;
              //e.g., element.href: node02145.obj
              element.url = this$1.settings.tile_root_href + element.href;
              element.loaded = false;
              // console.log(element.url)
            });
          })
          .then(function () {
            // Notify via PubSub that tree has loaded 
            // (this re-renders the map if not already rendering)
            this$1.msgbus.publish('data.tree.loaded', 'param?');
          });
    };

    // FIXME: rename method
    // note: tree has data and index nodes mixed (?)
    // returns the tree nodes with data
    SSCLayer.prototype.obtainDataelements = function obtainDataelements () {
        // FIXME: make iterator/generator function* 
        // to avoid making the whole result list in memory
        var root = this.tree;
        var dataelements = [];
        var stack = [root];
        while (stack.length > 0) {
            var node = stack.pop();

            if (node.hasOwnProperty('children') === true) {
                // visit chids, if they overlap
                node.children.forEach(function (child) {
                    stack.push(child);
                });
            }
            if (node.hasOwnProperty('dataelements') === true) {
                // add data elements to result list
                node.dataelements.forEach(function (element) {
                    dataelements.push(element);
                });
            }
        }
        return dataelements
    };


    SSCLayer.prototype.getStepFromDenominator = function getStepFromDenominator (denominator) {
        if (this.tree === null) {
            return 0
        }
        // reduction in percentage
        var reductionFactor = 1 - Math.pow(this.tree.metadata.start_scale_Sb / denominator, 2);
        //console.log('ssctree.js reductionf:', reductionf)
        var step = this.tree.metadata.no_of_objects_Nb * reductionFactor; //step is not necessarily an integer
        //let step = this.tree.metadata.no_of_steps_Ns * reductionf
        //console.log('ssctree.js step:', step)
        //console.log('ssctree.js Nt:', this.tree.metadata.no_of_objects_Nb - step)
        return parseInt(Math.max(0.0, Math.round(step)))
    };


    SSCLayer.prototype.chunksInView = function chunksInView (box3d) {
        var result = [];
        if (this.tree === null) {
            return result
        }
        var stack = [this.tree];
        var loop = function () {
            var node = stack.pop();
            if (node.hasOwnProperty('children') === true)
            {
                // visit chids, if they overlap
                node.children.forEach(function (child) {
                    if (overlaps3d(node.box, box3d)) {
                        stack.push(child);
                    }
                });
            }
            // add data elements to result list, if box overlaps
            if (node.hasOwnProperty('dataelements') === true)
            {
                node.dataelements.forEach(function (element) {
                    if (overlaps3d(element.box, box3d)) {
                        result.push(element);
                    }
                });
            }
        };

            while (stack.length > 0) loop();
        return result
    };





    function overlaps3d(sscbox, slicebox) {
        // Separating axes theorem, nD -> 3D
        // one represents the ssc, and other represents the slicing plane
        // e.g., one: [182000, 308000, 0, 191000, 317000, 7]
        // e.g., other: [185210.15625, 311220.96875, 0, 187789.84375, 313678.9375, 0]
        var dims = 3;
        var cmpbox = sscbox;
        var isOverlapping = true;
        for (var min = 0; min < dims; min++) {
            var max = min + dims;
            if (cmpbox[max] <= slicebox[min] || cmpbox[min] > slicebox[max]) { 
                isOverlapping = false;
                break
            }
        }
        return isOverlapping
    }

    /* eslint-disable no-unused-vars */



    var Map$1 = function Map(map_setting, canvasnm_in_cbnm) {
        var this$1 = this;


        var container = map_setting['canvas_nm'];
        if (typeof container === 'string') {
            this._container = window.document.getElementById(container);
        }
        else {
            this._container = container;
        }
        if (!this._container) {
            throw new Error(("Container '" + container + "' not found."))
        }

        // if we are zooming, we may want to snap to a valid state
        this._action = 'zoomAnimated'; 
        this._abort = null;

        this._transform = new Transform(
            map_setting.initialization.center2d,
            [this._container.width, this._container.height],
            map_setting.initialization.scale_den);

        /* settings for zooming and panning */
        this._interaction_settings = {
            zoom_factor: 1,
            zoom_duration: 1, //1 second
            time_factor: 1, //we changed the factor because we snap when merging parallelly
            pan_duration: 1,  //1 second
        };
        //this.if_snap = false //if we want to snap, then we only snap according to the first dataset

        this.msgbus = new MessageBusConnector();
        this.msgbus.subscribe('data.tile.loaded', function (topic, message, sender) {
            this$1.render();
        });

        this.msgbus.subscribe('data.tree.loaded', function (topic, message, sender) {
            this$1.panAnimated(0, 0); // animate for a small time, so that when new tiles are loaded, we are already rendering
        });

        this.msgbus.subscribe("settings.render.boundary-width", function (topic, message, sender) {
            // this.renderer.settings.boundary_width = parseFloat(message);
            console.log("new value for " + topic + " : " + parseFloat(message));
            this$1.abortAndRender();
        });

        this.msgbus.subscribe("settings.interaction.zoom-factor", function (topic, message, sender) {
            console.log("new value for " + topic + " : " + parseFloat(message));
            this$1._interaction_settings.zoom_factor = parseFloat(message);
        });

        this.msgbus.subscribe("settings.interaction.zoom-duration", function (topic, message, sender) {
            console.log("new value for " + topic + " : " + parseFloat(message));
            this$1._interaction_settings.zoom_duration = parseFloat(message);
        });
        this.msgbus.subscribe("settings.interaction.pan-duration", function (topic, message, sender) {
            console.log("new value for " + topic + " : " + parseFloat(message));
            this$1._interaction_settings.pan_duration = parseFloat(message);
        });

        this.gl = this.getWebGLContext();

    //    this.renderer = new Renderer(this.gl, this._container, this.ssctrees);
        //this.renderer.setViewport(this.getCanvasContainer().width,
        //                      this.getCanvasContainer().height)

        dragHandler(this);  // attach mouse handlers
        scrollHandler(this);

        // FIXME: the name of the buttons is fixed?
        zoomButtonHandler(this);

        //    moveHandler(this)
        touchPinchHandler(this); // attach touch handlers
        touchDragHandler(this);

        ///////////////////////////
        //  "opentopo"
        //  "2020_ortho25"
        //  "brtachtergrondkaart"
        //  "top25raster"
        //  "ahn2_05m_ruw"
        //  "lufolabels"
        // FIXME: this should be a series of layers!

        var backgroundRenderer = new BackgroundRenderer(this.getWebGLContext(), this.msgbus);
    //    backgroundRenderer.setViewport(this.getCanvasContainer().width, this.getCanvasContainer().height)

            
        var sscLayer = new SSCLayer(this.msgbus, {
            'tree_root_file_nm': 'tree.json',
            'tree_root_href': 'data/',
            'tile_root_href': 'data/',
        });
        sscLayer.load();

        this.renderers = [
            backgroundRenderer,
            // new BackgroundRenderer(this.getWebGLContext(), this.msgbus),
            // new WMTSRenderer(this.getWebGLContext(), this.msgbus, "Actueel_orthoHR", true),
            // new WMTSRenderer(this.getWebGLContext(), this.msgbus, "brtachtergrondkaart", false),
            new SSCRenderer(this.getWebGLContext(), this.msgbus, sscLayer),
            new PixiLabelRenderer(this, this.msgbus, { labelUrl: 'label_test/label_anchors_event.json' }) ];
        // update all renderers their size
        console.log(("map SIZE " + (this.getCanvasContainer().clientWidth) + ", " + (this.getCanvasContainer().clientHeight)));
        this.resize(this.getCanvasContainer().clientWidth, this.getCanvasContainer().clientHeight);
            

    };

    Map$1.prototype.getCanvasContainer = function getCanvasContainer () {
        return this._container;
    };

    Map$1.prototype.getWebGLContext = function getWebGLContext () {
        return this.getCanvasContainer().getContext('webgl',
            { antialias: true, alpha: false, premultipliedAlpha: false })
    };

    Map$1.prototype.getTransform = function getTransform () {
        return this._transform;
    };

    Map$1.prototype.render = function render () {
        var transform = this.getTransform();
        var visibleWorld = transform.getVisibleWorld();
        var scaleDenominator = transform.getScaleDenominator();
        var aabb = [visibleWorld.xmin, visibleWorld.ymin, visibleWorld.xmax, visibleWorld.ymax];
        var matrix = this.getTransform().worldSquareMatrix;

        this.msgbus.publish('map.scale', [this.getTransform().getCenterWorld(), scaleDenominator]);

    //    this.renderers[0].clearColor()
        this.renderers.forEach(
            function (renderer, i) {
                var opacity = 1.0;
                if (i==0) {
                    opacity = 1.0;
                } else {
                    opacity = 0.75;
                }
                /*
                switch (i) {
                    case 0:
                        opacity = 1.0
                        break
                    case 1:
                        opacity = 0.9
                        break
                    case 2:
                        opacity = 1.0
                        break
                    default:
                        break
                }
                */
                renderer.update(aabb, scaleDenominator, matrix, opacity);
            }
        );
        // this.getWebGLContext().flush()
    };

    Map$1.prototype.doEaseNone = function doEaseNone (start, end) {
            var this$1 = this;

        var interpolate = (function (k) {
            var m = new Float64Array(16);
            for (var i = 0; i < 16; i++) {
                var delta = start[i] + k * (end[i] - start[i]);
                m[i] = delta;
            }
            // update the worldSquareMatrix matrix
            this$1.getTransform().worldSquareMatrix = m;
            this$1.getTransform().updateSingleStepTransform();
            this$1.render(k);
            if (k == 1) {
                this$1._abort = null;
            }
        });
        return interpolate;
    };

    Map$1.prototype.doEaseInOutSine = function doEaseInOutSine (start, end) {
        function interpolate(k) {
            var m = new Float64Array(16);
            var D = Math.cos(Math.PI * k) + 1;
            for (var i = 0; i < 16; i++) {
                var c = end[i] - start[i];
                var delta = c * 0.5 * D + start[i];
                m[i] = delta;
            }
            // update the worldSquareMatrix matrix
            this.getTransform().worldSquareMatrix = m;
            this.getTransform().updateSingleStepTransform();
            this.render(k);
            if (k == 1) {
                this._abort = null;
            }
        }
        return interpolate;
    };

    Map$1.prototype.doEaseOutSine = function doEaseOutSine (start, end) {
            var this$1 = this;
     //start and end: the world squares
        var interpolate = function (k) {
            var m = new Float64Array(16);
            var D = Math.sin(k * Math.PI * 0.5);
            for (var i = 0; i < 16; i++) {
                var c = end[i] - start[i];
                var delta = c * D + start[i];
                m[i] = delta;
            }
            // update the worldSquareMatrix matrix
            this$1.getTransform().worldSquareMatrix = m;
            this$1.getTransform().updateSingleStepTransform();
            this$1.render(k);
            if (k === 1) {
                this$1._abort = null;
            }
        };
        return interpolate;
    };
        
    Map$1.prototype.doInterpolate = function doInterpolate ( start, end ) {
            var this$1 = this;

        var interpolate = function (k) {

            var transform = this$1.getTransform();
            transform.initTransform(centerWorld, viewportSize, scaleDenominator);

            this$1.render(k);
            if (k === 1) {
                this$1._abort = null;
            }
        };
        return interpolate
    };

    Map$1.prototype.doEaseOutQuint = function doEaseOutQuint (start, end) {
        function interpolate(k) {
            var t = k - 1;
            var t5p1 = Math.pow(t, 5) + 1;
            var m = new Float64Array(16);
            for (var i = 0; i < 16; i++) {
                var c = end[i] - start[i];
                var delta = c * t5p1 + start[i];
                m[i] = delta;
            }
            // update the worldSquareMatrix matrix
            this.getTransform().worldSquareMatrix = m;
            this.getTransform().updateSingleStepTransform();
            this.render(k);
            if (k == 1) {
                this._abort = null;
            }
        }
        return interpolate;
    };

    //animateZoom(x, y, zoom_factor) {
    //    const start = this.getTransform().worldSquareMatrix;
    //    this._interaction_settings.time_factor = this.getTransform().compute_zoom_parameters(
    //        this.ssctrees[0], zoom_factor, x, this.getCanvasContainer().getBoundingClientRect().height - y, this.ssctrees[0].if_snap);
    //    const end = this.getTransform().worldSquareMatrix;  //worldSquareMatrix is updated in function compute_zoom_parameters
    //    var interpolate = this.doEaseOutSine(start, end);
    //    //var interpolate = this.doEaseNone(start, end);
    //    return interpolate;
    //}


    Map$1.prototype.animateZoom = function animateZoom (x, y, factor)
    {
        var rect = this.getCanvasContainer().getBoundingClientRect();
        var start = this.getTransform().worldSquareMatrix;
        this.getTransform().zoom(factor, x, rect.height - y);
        var end = this.getTransform().worldSquareMatrix;
        var interpolate = this.doEaseOutSine(start, end);
        return interpolate;
    };

    Map$1.prototype.nonAnimatedZoom = function nonAnimatedZoom (x, y, factor)
    {
        var rect = this.getCanvasContainer().getBoundingClientRect();
        this.getTransform().zoom(factor, x, rect.height - y);
        this.abortAndRender();
    };

    Map$1.prototype.nonAnimatedZoomAndPan = function nonAnimatedZoomAndPan (zoomAround, zoomFactor, panDist)
    {
        var rect = this.getCanvasContainer().getBoundingClientRect();
        this.getTransform().zoom(zoomFactor, zoomAround[0], rect.height - zoomAround[1]);
        this.getTransform().pan(panDist[0], -panDist[1]);
        this.abortAndRender();
    };

    Map$1.prototype.animatePan = function animatePan (dx, dy) {
        var start = this.getTransform().worldSquareMatrix;
        this.getTransform().pan(dx, -dy);
        var end = this.getTransform().worldSquareMatrix;
        var interpolate = this.doEaseOutSine(start, end);
        //var interpolate = this.doEaseNone(start, end);
        return interpolate;
    };

    Map$1.prototype.jumpTo = function jumpTo (x, y, scale) {
        var center_world = [x, y];
        var r = this.getCanvasContainer();
        var viewportSize = [r.width, r.height];
        var denominator = scale;
        this.getTransform().initTransform(center_world, viewportSize, denominator);
        this.abortAndRender();
    };

    /** initiate a flyTo action */
    Map$1.prototype.flyTo = function flyTo (x, y, scale) {
            var this$1 = this;


        var targetCenter = [x, y];
        var targetDenominator = scale;
        var durationSecs = 5.0;

        var transform = this.getTransform();

        var visibleWorldCenter = transform.getVisibleWorld().center();
        var scaleDenominator = transform.getScaleDenominator();

        var container = this.getCanvasContainer();
        var viewportSize = [container.width, container.height];

        // get an interpolation function and adjusted duration (if large distance, we fly longer)
        var ref = doFlyTo(visibleWorldCenter, scaleDenominator, viewportSize, targetCenter, targetDenominator, durationSecs);
            var interpolate = ref[0];
            var durationSecsAdapted = ref[1];

        var goFly = function (x) {
            var result = interpolate(x); // get the center and scale denominator from the flyToInterpolator
            var container = this$1.getCanvasContainer();
            var viewportSize = [container.width, container.height];
            this$1.getTransform().initTransform(result[0], viewportSize, result[1]);
            this$1.render();
            // we could add argument to render: 
            // isInFlightRender:bool, then we can reduce tile level, while in flight (x<1)
            // while we can get the full detail / final map when x = 1
            this$1.msgbus.publish('map.scale', [this$1.getTransform().getCenterWorld(), this$1.getTransform().getScaleDenominator()]);
        };
        this._abort = timed(goFly, durationSecsAdapted, this);
    };

    Map$1.prototype.panBy = function panBy (dx, dy) {
        //console.log("_abort in map.js:", this._abort)
        if (this._abort !== null) {
            this._abort();
        }
        this.getTransform().pan(dx, -dy);
        this.render();
    };

    Map$1.prototype.abortAndRender = function abortAndRender () {
        // aborts running animation
        // and renders the map based on the current transform
        if (this._abort !== null) {
            this._abort();
            this._abort = null;
        }
        console.log('abortAndRender');
        this.getTransform().pan(0, 0);
        this.render();
    };

    Map$1.prototype.zoomInAnimated = function zoomInAnimated (x, y, step) {
        //e.g., op_factor: 0.0625; 1.0 + op_factor: 1.0625
        this.zoomAnimated(x, y, 1.0 + step); // 1.0 + op_factor * this._interaction_settings.zoom_factor)
    };

    Map$1.prototype.zoomOutAnimated = function zoomOutAnimated (x, y, step) {
        //e.g., op_factor: 0.0625; 1.0 / (1.0 + op_factor): 0.9411764705882353
        this.zoomAnimated(x, y, 1.0 / (1.0 + step)); //1.0 / (1.0 + op_factor * this._interaction_settings.zoom_factor))
    };

    Map$1.prototype.zoomAnimated = function zoomAnimated (x, y, zoom_factor) {
        if (this._abort !== null) {
            //console.log('map.js test1')
            this._abort();
        }
        this._action = 'zoomAnimated';
        //console.log('map.js this._interaction_settings.time_factor0:', this._interaction_settings.time_factor)
        //console.log('map.js zoom_factor:', zoom_factor)
        var interpolator = this.animateZoom(x, y, zoom_factor);

        var zoom_duration = this._interaction_settings.zoom_duration * this._interaction_settings.time_factor;
        //console.log('map.js this._interaction_settings.zoom_duration:', this._interaction_settings.zoom_duration)
        //console.log('map.js this._interaction_settings.time_factor:', this._interaction_settings.time_factor)
        //console.log('map.js zoom_duration:', zoom_duration)
        this._abort = timed(interpolator, zoom_duration, this);
    };

    Map$1.prototype.panAnimated = function panAnimated (dx, dy) {
        if (this._abort !== null) {
            //console.log('map.js this._abort !== null')
            this._abort();
        }
        // FIXME: settings
        this._action = 'panAnimated';
        var interpolator = this.animatePan(dx, dy);
        this._abort = timed(interpolator, this._interaction_settings.pan_duration, this);
    };

    // @!FIXME: check and use info of:
    // https://webglfundamentals.org/webgl/lessons/webgl-anti-patterns.html
    Map$1.prototype.resize = function resize (newWidth, newHeight) {
        //console.log("resize");
        var tr = this.getTransform();
        var center = tr.getCenterWorld();
        //console.log('map.js center:', center)
        var denominator = tr.getScaleDenominator();
        // re-initialize the transform
        console.log('map.js newWidth, newHeight:', newWidth, newHeight);
        var canvas = this.getCanvasContainer();
        canvas.width = newWidth;
        canvas.height = newHeight;
        //console.log('map.js center:', center)
        tr.initTransform(center, [newWidth, newHeight], denominator);
        // update the viewport size of the renderer
    //    this.renderer.setViewport(newWidth, newHeight)
    //        
        this.renderers.forEach(
            function (renderer, i) {
                renderer.setViewport(newWidth, newHeight);
            }
        );
        this.render();
    //    let gl = this.gl

    //    let fbo = gl.fbo;
    //    gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
    //    gl.bindRenderbuffer(gl.RENDERBUFFER, fbo.depthBuffer);
    //    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, newWidth, newHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    //    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, newWidth, newHeight);

    //    // Unbind the buffer object;
    //    gl.bindTexture(gl.TEXTURE_2D, null);
    //    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    };

    /* cursor as pointer for suggestions */
    /*
    .suggestion {
        cursor: pointer;
    }
    */

    /** a widget for geocoding via PDOK */
    var PdokSuggestWidget = function PdokSuggestWidget(map) {

        this.map = map;

        this.createElements();
        this.addEventListeners();

        this.state = {
            suggestions: [],
            highlight: -1
        };
            
        this.abortController = null;
            
        setVisibilityOff();
    };

    /** create some input elements that we can use for geo-coding*/
    PdokSuggestWidget.prototype.createElements = function createElements () {
        var inputElement = document.createElement('input');
        inputElement.setAttribute('id', 'search');
        inputElement.setAttribute('type', 'search');
        inputElement.setAttribute('placeholder', 'Search for a Dutch location...');
        inputElement.setAttribute('autocomplete', 'off');

        var buttonElement = document.createElement('button');
        buttonElement.setAttribute('id', 'clear-button');
        buttonElement.setAttribute('type', 'button');
        buttonElement.setAttribute('aria-label', 'clear');
        buttonElement.innerHTML = '&#10006;';

        // FIXME: instead of relying on the presence of this placeholder
        // we can give it while instantiating the widget
        var parent = document.getElementById('geocode-placeholder');
        parent.appendChild(inputElement);
        parent.appendChild(buttonElement);

        var divElement0 = document.createElement('div');
        parent.appendChild(divElement0);

        divElement0.style.position = 'relative';

        var divElement1 = document.createElement('div');
        divElement1.setAttribute('id', 'name-output');
        divElement1.setAttribute('class', 'container white');
        divElement1.style.position = 'absolute';
        divElement1.style.zIndex = 1;

        divElement0.appendChild(divElement1);

        var ulElement = document.createElement('ul');
        divElement1.setAttribute('id', 'suggestion-output');
        divElement1.setAttribute('class', 'ul white');

        divElement1.appendChild(ulElement);
    };

    /** add event listeners to the button and the search bar */
    PdokSuggestWidget.prototype.addEventListeners = function addEventListeners () {
            var this$1 = this;

        var clear = document.getElementById('clear-button');
        clear.addEventListener('click', 
            function () {
                var search = document.getElementById('search');
                search.value = '';
                // this.getSuggestions(search.value)
                search.focus();
    //            this.state.suggestions = []
    //            this.state.highlight = -1
            }
        );
        var search = document.getElementById('search');
        search.addEventListener('input', function () { debounce(this$1.getSuggestions(search.value), 750); } );
        search.addEventListener('keyup', function (evt) { this$1.onKeyUp (evt); });
    };

    /** Get suggestions for a text string */
    PdokSuggestWidget.prototype.getSuggestions = function getSuggestions (searchString) {
            var this$1 = this;

        this.pdokRequestSuggest(searchString)
            .then(function (response) { this$1.onSuggestReponse(response); });
    };

    /**  Perform a request to the PDOK suggest service */
    PdokSuggestWidget.prototype.pdokRequestSuggest = async function pdokRequestSuggest (searchString, options) {
        var parameters = {
            q: searchString,
            fq: '*' // 'type:gemeente'
        };
        if (options) {
            Object.assign(parameters, options);
        }
                /*
                let abortController = new AbortController();
                const signal = abortController.signal;
                // fire request for tile retrieval
                fetch(tile.getRequestUrl(), { mode: 'cors', signal})
                abortController.abort()
                */

        if (this.abortController !== null) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.abortController = new AbortController();
        var signal = this.abortController.signal;

        var endpoint_url = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest';
        var response = await fetch(endpoint_url + formatURL({
            query: parameters,
        }),  { mode: 'cors', signal: signal});
        if (!response.ok) {
            throw new Error('Response from locatieserver suggest endpoint not ok');
        }
            
        return await response.json();
    };
        
    /** Process the suggest response */
    PdokSuggestWidget.prototype.onSuggestReponse = function onSuggestReponse (input) {
        // parse the response into the suggestions array
        this.state.suggestions = this.parseSuggestReponse(input);

        // set the first item highlighted (for if the user presses enter)
        if (this.state.highlight == -1) {
            this.state.highlight = 0;
        }
        // and display the suggestions by modifying the DOM
        // and adding each suggestion onto the webpage
        this.displaySuggestions(this.state.suggestions);
        this.updateHighlight();
    };
        
    PdokSuggestWidget.prototype.parseSuggestReponse = function parseSuggestReponse (response) {
        var suggestions = [];
        var i = 0;
        for (var i$1 = 0, list = response.response.docs; i$1 < list.length; i$1 += 1) {
            var doc = list[i$1];

                if ('highlighting' in response && 'id' in doc && doc.id in response.highlighting && 'suggest' in response.highlighting[doc.id] && response.highlighting[doc.id].suggest.length > 0)
            {
                suggestions.push({
                    id: doc.id, 
                    suggestionHTML: response.highlighting[doc.id].suggest[0],
                    suggestion: doc.weergavenaam,
                    type: doc.type
                });
            }
            i += 1;
            if (i >= 4) { break }
        }
        return suggestions
    };

    PdokSuggestWidget.prototype.displaySuggestions = function displaySuggestions (suggestions) {
            var this$1 = this;

        // remove old suggestions, if any
        removeAllChilds('suggestion-output');

        // add new elements
        var ul = document.getElementById('suggestion-output');
        var loop = function () {
            var item = list[i];

                var li = document.createElement("li");
            li.setAttribute('class', 'suggestion is-marginless');
                
            var a = document.createElement("a");
            a.innerHTML = "<div style=\"display: inline-block; cursor: pointer; width: 100%;\">\n<div class=\"small\">" + (item.suggestion) + "</div>\n<div class=\"text-gray small\">" + (item.type) + "</div>\n</div>";
            a.addEventListener('click', 
                function (event) {
                    event.preventDefault();
                    this$1.performLookupForId(item);
                });
            li.appendChild(a);
            ul.appendChild(li);
        };

            for (var i = 0, list = suggestions; i < list.length; i += 1)
        loop();
    };

    /** Perform a lookup for the id */
    PdokSuggestWidget.prototype.performLookupForId = function performLookupForId (obj) {
            var this$1 = this;

        console.log(obj);
        // put the clicked value into the bar
        var el = document.getElementById('search');
        el.value = obj.suggestion;
        // make the lookup call for the interested one
        this.pdokLookup( obj.id ).then(function (response) { this$1.onLookupResult(response); });
        // remove all suggestions
        removeAllChilds('suggestion-output');
    };

    /** Perform a request to the lookup service */
    PdokSuggestWidget.prototype.pdokLookup = async function pdokLookup (id, options) {
        var parameters = {
            id: id,
        };
        if (options) {
            Object.assign(parameters, options);
        }

        if (this.abortController !== null) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.abortController = new AbortController();
        var signal = this.abortController.signal;

        var endpoint_url = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup';
        var response = await fetch(endpoint_url + formatURL({
            query: parameters,
        }),  { mode: 'cors', signal: signal});
        if (!response.ok) {
            throw new Error('Response from locatieserver lookup endpoint not ok');
        }
        return await response.json();
    };

    /** When a lookup result arrives, we jump the map to the coordinates */
    PdokSuggestWidget.prototype.onLookupResult = function onLookupResult (result) {
        if ('docs' in result.response && result.response.docs.length > 0)
        {
            var wkt = result.response.docs[0].centroide_rd;
            // poor mens wkt parse for POINT(.. ..) 
            // stripping off 'point(' [6 chars] and leaving out ')' [1 char] at the end
            var coords = wkt.slice(6, wkt.length-1).split(' ').map(Number);

            // dependent on the type, determine a relevant scale denominator
            // valid types:
            //    provincie; gemeente; woonplaats; weg;
            //    postcode; adres; perceel; hectometerpaal;
            //    wijk; buurt; waterschapsgrens; appartementsrecht.
            var scaleDenominator = 10000;
            switch(result.response.docs[0].type) {
                case "provincie":
                    scaleDenominator = 384000;
                    break
                case "gemeente":
                case "waterschapsgrens":
                    scaleDenominator = 48000;
                    break
                case "woonplaats":
                    scaleDenominator = 24000;
                    break
                case "postcode":
                    scaleDenominator = 6000;
                    break
                case "weg":
                case "adres":
                case "perceel":
                case "appartementsrecht":
                case "hectometerpaal":
                    scaleDenominator = 1500;
                    break
            }
            this.map.flyTo(coords[0], coords[1], scaleDenominator);
    //        this.map.jumpTo(coords[0], coords[1], scaleDenominator)

            // hide the suggestions
            setVisibilityOff();
            // reset the variables
            this.state.suggestions = [];
            this.state.highlight = -1;
        }
    };

    /*
    * Handle key events
    */
    PdokSuggestWidget.prototype.onKeyUp = function onKeyUp (e) {
        switch (e.code)
        {
            case ('ArrowUp'):
            {
                this.onArrowUp();
                break
            }
            case ('ArrowDown'):
            {
                this.onArrowDown();
                break
            }
            case ('Enter'):
            {
                if (this.state.suggestions.length > 0 && this.state.highlight != -1)
                {
                    this.onEnter();
                }
                break
            }
        }
    };

    PdokSuggestWidget.prototype.onEnter = function onEnter ()
    {
        this.performLookupForId(this.state.suggestions[this.state.highlight], null);
    };

    PdokSuggestWidget.prototype.onArrowDown = function onArrowDown ()
    {
        if (this.state.highlight < this.state.suggestions.length - 1) {
            this.state.highlight++;
        }
        else if (this.state.suggestions.length > 0)
        {
            this.state.highlight = 0;
        }
        this.updateHighlight();
    };

    PdokSuggestWidget.prototype.onArrowUp = function onArrowUp () {
        if (this.state.highlight > 0) {
            this.state.highlight--;
        }
        else if (this.state.suggestions.length > 0)
        {
            this.state.highlight = this.state.suggestions.length - 1;
        }
        this.updateHighlight();
    };

    PdokSuggestWidget.prototype.updateHighlight = function updateHighlight ()
    {
        var childs = document.getElementById("suggestion-output").childNodes;
        for (var i=0; i < childs.length; i++) 
        {
            childs[i].classList.remove("is-active");
            childs[i].classList.add("small");
        }
        if (childs.length > 0 && this.state.highlight >= 0 && this.state.highlight < childs.length) // FIXME:or length-1?
        {
            childs[this.state.highlight].classList.add("is-active");
        }
    };

    /** debounce many calls (prevent race conditions) */
    function debounce(callback, wait) {
        var this$1 = this;

        var timeout;
        return function () {
            var args = [], len = arguments.length;
            while ( len-- ) args[ len ] = arguments[ len ];

            var context = this$1;
            clearTimeout(timeout);
            timeout = setTimeout(function () { return callback.apply(context, args); }, wait);
        };
    }
    var setVisibilityOff = function () {
        removeAllChilds('suggestion-output');
    //    document.getElementById("name-output").classList.add("w3-hide")
    };

    /** format the parameters for use in a URL */
    var formatURL = function (options) {
        var url = '?';

        for (var parameterName in options.query) {
            url += (url.length > 1 ? '&' : '') + parameterName + '=' + options.query[parameterName];
        }

        return url;
    };

    /** Remove all DOM child nodes from an element that is selected by its id */
    var removeAllChilds = function (name) {
        var div = document.getElementById(name);

        // remove all child elements from a DOM node
        var child = div.firstElementChild;
        while(child)
        {
            div.removeChild(child);
            child = div.firstElementChild;
        }
    };

    // import  Rectangle from "./rect"
    //let r = new Rectangle(1, 2, 3, 4);
    //console.log(r);

    var exported = {
        Map: Map$1,
        MessageBusConnector: MessageBusConnector,
        PdokSuggestWidget: PdokSuggestWidget
    };

    return exported;

})));
