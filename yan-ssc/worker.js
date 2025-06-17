(function () {
    'use strict';

    //export var facecount = 0

    //export function setfacecount() {
    //    facecount = 0
    //}

    //export function readfacecount() {
    //    console.log('parse.js facecount:', facecount)
    //    return facecount
    //}

    function parse_obj(txt) {
        var fcolor = null;  //feature color
        var step_high = null;
        var class_color = generate_class_color();

        //let vertices = []
        //we will reverse the order of the groups to avoid drawing all the lower ssc levels 
        //(we only draw the immediate-lower level, useful for the case when we want to draw a level with transparency).
        //let trianglegroups = [] 
        //let output = {
        //    triangles: [], //each element is a point
        //    btriangles: [], //triangles of boundaries, each element is a point
        //    deltas: [] //deltas of boundaries, each element is a point
        //}

        var output = {
            vertices: [],
            triangles: [], //each element is a point
            boundaries: {
                triangles: [], //triangles of boundaries, each element is a point
                deltas: [] //deltas of boundaries, each element is a point
            }
        };

        //let grouped_triangles = [] //for webgl, it is important to keep the order of the triangles in a group

        var edgeId = null;

        txt.split('\n').forEach(function (line) {
            // skip empty line
            if (line.length == 0) {
                 return 
            }
            //if line = 'l 1 2 3 ', then line.split(' ') will return ['l', '1', '2', '3', '']
            //in order to remove the empty element, .replace(/\s*$/, '') is used.
            line = line.replace(/\s*$/, ''); //remove all the spaces at the end.
            var words = line.split(' ');
            

            // dispatch based on first character on the line
            switch (words[0])
            {
                case 'v': {
                    output.vertices.push([parseFloat(words[1]), parseFloat(words[2]), parseFloat(words[3])]);
                    break
                }

                case 'g': {
                    //trianglegroups.push(grouped_triangles)
                    //grouped_triangles = []
                    //facecount += 1
                    //console.log('parse.js reading facecount:', facecount)
                    //console.log('parse.js words:', words)
                    var feature_class = words[1].split('_')[0];
                    fcolor = class_color[feature_class];
                    //console.log('parse.js feature_class:', feature_class)
                    //console.log('parse.js fcolor:', fcolor)
                    if (fcolor === undefined) 
                    {
                        console.error('color not defined for feature class ' + feature_class);
                        fcolor = { r_frac: 223/255, g_frac: 242/255, b_frac: 206/255 };
                    }
                    break
                }

                case 'f': {
                    // 3 vertex indentifiers make a triangle; add coordinates and colors
                    for (var i = 1; i <= 3; i++) {
                        var vertex = output.vertices[parseInt(words[i]) - 1];
                        //the vertices of all the triangles are saved in the same list
                        //grouped_triangles.push([vertex[0], vertex[1], vertex[2], fcolor.r_frac, fcolor.g_frac, fcolor.b_frac])
                        output.triangles.push([vertex[0], vertex[1], vertex[2], fcolor.r_frac, fcolor.g_frac, fcolor.b_frac]);
                    }
                    break
                }

                case '#': {
                    // words[1]: step_high; words[2]: edge_id
                    if (words.length > 1) {
                        //console.log('')
                        //console.log('parse.js words[1]:', words[1])
                        step_high = parseFloat(words[1]);
                        edgeId = parseInt(words[2]);
                       // if (edgeId == 55636) {
                       //     console.log('parse.js step_high:', step_high, 'for edgeId 55636')
                       // }
                    }
                    break
                }

                case 'l': {
                    var polyline = [];
                    //console.log('words:', words)
                    //console.log('step_high:', step_high)
                    for (var i$1 = 1; i$1 < words.length; i$1++) {
                        polyline.push(output.vertices[words[i$1] - 1]);
                    }

                    var point_records = [];
                    for (var j = 0; j < polyline.length; j++) {
                        //console.log('')

                        //console.log('parse.js j:', j)
                        var pt = polyline[j];
                        //console.log('parse.js pt:', pt)
                        console.assert(pt[2] < step_high);
                        point_records.push([pt[0], pt[1], pt[2], step_high]); //pt[2] is step_low
                        //point_records.push([pt[0], pt[1], 0.0, step_high]); //pt[2] is step_low
                    }

                    if (edgeId === 22006) // 55636 || edgeId === 60833)
                    {
                        console.log(("parse.js polyline for " + edgeId + ":"), polyline);
                        console.log(("         point_records for " + edgeId + ":"), point_records);
                    }

                    for (var k = 0; k < point_records.length - 1; k++) {
                        var start = point_records[k];    //start point of a line segment
                        var end = point_records[k + 1];  //end point of the line segment
                        var start_xy = start.slice(0, 2);
                        var end_xy = end.slice(0, 2);
                        var v = make_vector_start_end(start_xy, end_xy);
                        var length = norm(v);

                        if (length != 0) {
                            var unitvec = div(v, length);
                            //The lengths of startr, startl, endr, and endl are sqrt(2)
                            var startr = add(mul(unitvec, -1), rotate90cw(unitvec));
                            var startl = add(mul(unitvec, -1), rotate90ccw(unitvec));
                            var endr = add(unitvec, rotate90cw(unitvec));
                            var endl = add(unitvec, rotate90ccw(unitvec));

                            //start consists of x, y, z (step_low), step_high, while
                            //startl consists of only x, y
                            output.boundaries.triangles.push(start, start, end, start, end, end);
                            output.boundaries.deltas.push(startl, startr, endl, startr, endr, endl);
                        }
                    }
                    break;
                }
            }
        });
        
        //trianglegroups.push(grouped_triangles)
        //let trianglegroup_dts = [] //a list of dictionaries; each dictionary stores a group of triangles
        //for (var i = 1; i < trianglegroups.length; i++) { //trianglegroups[0] is empty
        //    let maxz = - Number.MAX_VALUE        
        //    for (var j = 0; j < trianglegroups[i].length; j++) {
        //        let vt = trianglegroups[i][j]

        //        if (vt[2] > maxz) {
        //            maxz = vt[2]
        //        }
        //    }
        //    trianglegroup_dts.push({ 'maxz': maxz, 'trianglegroup': trianglegroups[i]})
        //}

        ////let original_triangles = []
        ////trianglegroup_dts.forEach(trianglegroup_dt =>
        ////    trianglegroup_dt.trianglegroup.forEach(triangle =>
        ////        original_triangles.push(triangle)
        ////    )
        ////)
        
        //trianglegroup_dts.sort((a, b) => b.maxz - a.maxz) //in descending order    
        //let triangles = []
        //trianglegroup_dts.forEach(trianglegroup_dt =>
        //    trianglegroup_dt.trianglegroup.forEach(triangle =>
        //        triangles.push(triangle)
        //    )
        //) 

        var triangles32 = new Float32Array(output.triangles.flat(1));
        var btriangles32 = new Float32Array(output.boundaries.triangles.flat(1));
        var deltas32 = new Float32Array(output.boundaries.deltas.flat(1));

        //we must return buffers intead of triangles32; see file worker.js for the reason
        return [triangles32.buffer, btriangles32.buffer, deltas32.buffer]
    }




    //#region vector computation
    function sub(a, b) {
        /*Subtract a vector b from a, or subtract a scalar*/
        var result_values = [];
        if (isNaN(b)) { //b is not a number; b is iterable
            if (a.length != b.length) {
                throw "Vector dimensions should be equal";
            }
            for (var i = 0; i < a.length; i++) {
                result_values.push(a[i] - b[i]);
            }
        }
        else {
            for (var j = 0; j < a.length; j++) {
                result_values.push(a[j] - b);
            }
        }

        return result_values;
    }

    function add(a, b) {
        /*Add a vector b to a, or add a scalar*/
        var result_values = [];
        if (isNaN(b)) {
            if (a.length != b.length) {
                throw "Vector dimensions should be equal";
            }
            for (var i = 0; i < a.length; i++) {
                result_values.push(a[i] + b[i]);
            }
        }
        else {
            for (var j = 0; j < a.length; j++) {
                result_values.push(a[j] + b);
            }
        }

        return result_values;
    }

    function mul(a, b) {
        /*Multiply a vector either element-wise with another vector, or with a
        scalar.*/
        var result_values = [];
        if (isNaN(b)) {
            if (a.length != b.length) {
                throw "Vector dimensions should be equal";
            }
            for (var i = 0; i < a.length; i++) {
                result_values.push(a[i] * b[i]);
            }
        }
        else {
            for (var j = 0; j < a.length; j++) {
                result_values.push(a[j] * b);
            }
        }

        return result_values;
    }

    function div(a, b) {
        /*Element-wise division with another vector, or with a scalar.*/
        var result_values = [];
        if (isNaN(b)) {
            if (a.length != b.length) {
                throw "Vector dimensions should be equal";
            }
            for (var i = 0; i < a.length; i++) {
                result_values.push(a[i] / b[i]);
            }
        }
        else {
            for (var j = 0; j < a.length; j++) {
                result_values.push(a[j] / b);
            }
        }

        return result_values;
    }


    //function make_vector(end, start) {
    //    /*Creates a vector from the start to the end.

    //    Vector is made based on two points{ end - (minus) start.
    //        */
    //    return sub(end, start);
    //}

    function make_vector_start_end(start, end) {
        /*Creates a vector from the start to the end.
        
        Vector is made based on two points{ end - (minus) start.
            */
        return sub(end, start);
    }

    function dot(v1, v2) {
        /*Returns dot product of v1 and v2 */
        if (v1.length != v2.length) {
            throw "Vector dimensions should be equal";
        }

        var dot_value = 0;
        for (var i = 0; i < v1.length; i++) {
            dot_value += v1[i] * v2[i];
        }
        return dot_value;
    }


    function norm2(v) {
        /*Returns the norm of v, *squared*.*/
        return dot(v, v);
    }


    function norm(a) {
        /*L2 norm*/
        return Math.sqrt(norm2(a));
    }


    //function dist(start, end) {
    //    /*Distance between two positons*/
    //    return norm(make_vector_start_end(start, end));
    //}


    //function unit(v) {
    //    /*Returns the unit vector in the direction of v.*/
    //    return div(v, norm(v));
    //}


    //function cross(a, b) {
    //    /*Cross product between a 3-vector or a 2-vector*/
    //    if (a.length != b.length) {
    //        throw "Vector dimensions should be equal";
    //    }
    //    if (a.length == 3) {
    //        return (
    //            a[1] * b[2] - a[2] * b[1],
    //            a[2] * b[0] - a[0] * b[2],
    //            a[0] * b[1] - a[1] * b[0]);
    //    }
    //    else if (a.length == 2) {
    //        return a[0] * b[1] - a[1] * b[0];
    //    }
    //    else {
    //        throw 'Vectors must be 2D or 3D';
    //    }
    //}

    //function angle(v1, v2) {
    //    /*angle between 2 vectors*/
    //    return Math.acos(dot(v1, v2) / (norm(v1) * norm(v2)));
    //}

    //function angle_unit(v1, v2) {
    //    /*angle between 2 *unit* vectors*/
    //    let d = dot(v1, v2)
    //    if (d > 1.0 || d < -1.0) {
    //        console.log("dot not in [-1, 1] -- clamp");
    //    }
    //    d = Math.max(-1.0, Math.min(1.0, d));
    //    return Math.acos(d);
    //}

    //function near_zero(val) {
    //    if (Math.abs(val) <= Math.pow(0.1, 8)) {
    //        return true;
    //    }
    //    else {
    //        return false;
    //    }
    //}

    //function bisector(u1, u2) {
    //    /*Based on two unit vectors perpendicular to the wavefront,
    //    get the bisector
        
    //    The magnitude of the bisector vector represents the speed
    //        in which a vertex has to move to keep up(stay at the intersection of)
    //    the 2 wavefront edges
    //    */
    //    let direction = add(u1, u2);

    //    var max_value = 0;
    //    for (var i = 0; i < direction.length; i++) {
    //        max_value = Math.max(max_value, Math.abs(direction[i]));
    //    }

    //    if (near_zero(max_value)) {
    //        return (0, 0);
    //    }
    //    let alpha = 0.5 * Math.PI + 0.5 * angle_unit(u1, u2);
    //    let magnitude = Math.sin(alpha); //if u1 and u2 are unit vectors, then magnitude = sqrt(2) / 2
    //    var bisector_result = div(unit(direction), magnitude);
    //    return bisector_result;
    //}


    function rotate90ccw(v) {
        /*Rotate 2d vector 90 degrees counter clockwise
        
            (x, y) -> (-y, x)
        */
        return [-v[1], v[0]];
    }


    function rotate90cw(v) {
        /*Rotate 2d vector 90 degrees clockwise
        
            (x, y) -> (y, -x)
        */
        return [v[1], -v[0]];
    }
    //#endregion



    function generate_class_color() {
        var class_color_raw_dt = {
            // atkis
            '2101': [223, 242, 206],
            '2112': [223, 242, 206],
            '2114': [223, 242, 206],
            '2201': [223, 242, 206],
            '2202': [223, 242, 206],
            '2213': [223, 242, 206],
            '2230': [223, 242, 206],
            '2301': [223, 242, 206],
            '3103': [223, 242, 206],
            '3302': [223, 242, 206],
            '4101': [223, 242, 206],
            '4102': [223, 242, 206],
            '4103': [223, 242, 206],
            '4104': [223, 242, 206],
            '4105': [223, 242, 206],
            '4107': [223, 242, 206],
            '4108': [223, 242, 206],
            '4109': [223, 242, 206],
            '4111': [223, 242, 206],
            '5112': [223, 242, 206],

            // top10nl
            // http://register.geostandaarden.nl/visualisatie/top10nl/1.2.0/BRT_TOP10NL_1.2_beschrijving_visualisatie.xlsx
            // aeroway / runway
            '10000': [248, 157, 46],
            '10001': [248, 157, 46],
            '10002': [248, 157, 46],
            '10100': [248, 157, 46],
            '10101': [248, 157, 46],
            '10102': [248, 157, 46],

            // road - highway
            '10200': [248, 157, 46],
            '10201': [248, 157, 46],
            '10202': [248, 157, 46],

            // road - main road
            '10300': [248, 157, 46],
            '10301': [248, 157, 46],
            '10302': [248, 157, 46],
            '10310': [248, 157, 46],
            '10311': [248, 157, 46],
            '10312': [248, 157, 46],

            //// road - regional road
            //10400': [255, 150, 0],   //check
            //10401': [255, 150, 0],   //check
            //10402': [255, 150, 0],   //check
            //10410': [255, 150, 0],   //check
            //10411': [255, 150, 0],   //check
            //10412': [255, 150, 0],   //check
            // road - regional road
            '10400': [248, 157, 46],   //check
            '10401': [248, 157, 46],   //check
            '10402': [248, 157, 46],   //check
            '10410': [248, 157, 46],   //check
            '10411': [248, 157, 46],   //check
            '10412': [248, 157, 46],   //check


            // road - local road
            '10500': [248, 157, 46],
            '10501': [248, 157, 46],
            '10502': [248, 157, 46],
            '10510': [248, 157, 46],
            '10511': [248, 157, 46],
            '10512': [248, 157, 46],

            // road: street
            '10600': [248, 157, 46],
            '10601': [248, 157, 46],
            '10602': [248, 157, 46],

            // road: other type
            '10700': [248, 157, 46],
            '10701': [248, 157, 46],
            '10702': [248, 157, 46],
            '10710': [248, 157, 46],
            '10711': [248, 157, 46],
            '10712': [248, 157, 46],
            '10790': [248, 157, 46],
            '10791': [248, 157, 46],
            '10792': [248, 157, 46],

            //// road: half paved
            //10720': [179, 179, 179],   //check
            //10721': [179, 179, 179],   //check
            //10722': [179, 179, 179],   //check
            // road: half paved
            '10720': [248, 157, 46],   //check
            '10721': [248, 157, 46],   //check
            '10722': [248, 157, 46],   //check

            // road: unpaved
            '10730': [248, 157, 46],
            '10731': [248, 157, 46],
            '10732': [248, 157, 46],

            // road - cyclists
            '10740': [248, 157, 46],
            '10741': [248, 157, 46],
            '10742': [248, 157, 46],

            // road - pedestrians
            '10750': [248, 157, 46],
            '10751': [248, 157, 46],
            '10752': [248, 157, 46],
            '10760': [248, 157, 46],
            '10761': [248, 157, 46],
            '10762': [248, 157, 46],
            '10770':[248, 157, 46],

            '10780': [248, 157, 46],
            '10800': [248, 157, 46],
            '10820':[248, 157, 46],
            '10830': [248, 157, 46],

            '12000': [159, 208, 251],
            '12100': [159, 208, 251],
            '12200': [159, 208, 251],
            '12300': [159, 208, 251],
            '12400': [159, 208, 251],
            '12405': [159, 208, 251],
            '12410': [159, 208, 251],
            '12420': [159, 208, 251],
            '12430': [159, 208, 251],
            '12415': [159, 208, 251],
            '12425': [159, 208, 251],
            '12435': [159, 208, 251],
            '12500': [159, 208, 251],
            '12505': [159, 208, 251],
            '12600': [159, 208, 251],
            '12610': [159, 208, 251],
            '12700': [159, 208, 251],

            '12800': [159, 208, 251],
            '12810': [159, 208, 251],
            '12820': [159, 208, 251],

            '13000': [168, 171, 171],
            '13100': [168, 171, 171],
            '13200': [168, 171, 171],
            '13300': [168, 171, 171],
            '13400': [168, 171, 171],

            // pier (aanlegsteiger)
            '14000': [223, 242, 206],
            '14002': [223, 242, 206],
            '14003': [223, 242, 206],

            '14010': [223, 242, 206],
            '14030': [223, 242, 206],
            '14040': [223, 242, 206],
            '14050': [223, 242, 206],
            '14060': [223, 242, 206],

            '14070': [223, 242, 206],
            '14072': [223, 242, 206],
            '14073': [223, 242, 206],

            '14080': [223, 242, 206],
            '14090': [223, 242, 206],

            // burial ground
            '14100': [223, 242, 206],
            '14102': [223, 242, 206],
            '14103': [223, 242, 206],
            '14110': [223, 242, 206],
            '14112': [223, 242, 206],
            '14113': [223, 242, 206],

            '14120': [223, 242, 206],

            // grassland
            '14130': [223, 242, 206],
            '14132': [223, 242, 206],
            '14133': [223, 242, 206],

            // hay
            '14140': [223, 242, 206],
            '14142': [223, 242, 206],
            '14143': [223, 242, 206],

            '14160': [223, 242, 206],
            '14162': [223, 242, 206],
            '14163': [223, 242, 206],
            '14170': [223, 242, 206],

            // rail body
            '14180': [223, 242, 206],
            '14182': [223, 242, 206],
            '14183': [223, 242, 206],

            '14190': [223, 242, 206],


            // according to dryness        
            'wet': [254, 229, 217],  //wet, normal
            'dry': [252, 174, 145],  //dry
            'verydry': [251, 106, 74],  //very dry
            'extremelydry': [203, 24, 29],  //extremely dry
            'drynessunknown': [128, 128, 128],  //dryness unknown
            
            '0': [254, 229, 217],  //wet, normal
            '1': [252, 174, 145],  //dry
            '2': [251, 106, 74],  //very dry
            '3': [203, 24, 29],  //extremely dry
            '-1': [128, 128, 128],  //dryness unknown
        };

        var class_color_dt = {};
        for (var key in class_color_raw_dt) {
            var rgb = class_color_raw_dt[key];  //rgb is a list of elements r, g, b
            var colordt = {};
            colordt.r = rgb[0];
            colordt.g = rgb[1];
            colordt.b = rgb[2];
            colordt.r_frac = rgb[0] / 255;
            colordt.g_frac = rgb[1] / 255;
            colordt.b_frac = rgb[2] / 255;
            class_color_dt[key] = colordt;
        }

        //console.log('parse.js class_color_dt:', class_color_dt)
        return class_color_dt;
    }

    self.onmessage = function(e) {    
        var id = e.data.id;
        var url = e.data.msg;

        console.log(("fetching " + url));
        fetch(url)  //e.g., url = "/gpudemo/2020/03/merge/0.1/data/sscgen_smooth.obj"
            .then(function (response) { return response.text() })  //e.g., the text (dataset) stored in an .obj file            
            .then(function (data_text) { 
                var arrays = parse_obj(data_text);
                console.log(arrays);
                // the arrays are transferable objects (ArrayBuffer objects)
                // (will be transferred without copy overhead to main process)
                postMessage({id: id, msg: arrays}, arrays);  
            })
            .catch(function (err) { console.error(err); });

    };

}());
