const COLORS = [
    "#2e3440", "#3b4252", "#434c5e", "#4c566a", 
    "#d8dee9", "#e5e9f0", "#eceff4", 
    "#8fbcbb", "#88c0d0", "#81a1c1", "#5e81ac",
    "#bf616a", "#d08770", "#ebcb8b", "#a3be8c", "#b48ead",
    "#76c783", "#4a83ff", "#8194ff",
]

const LINE_COLOR = COLORS[4];
const LINE_WIDTH = 3;
let TOL = 1e-6;
let scale = 0.01;
let duration_anim = 10.;  //duration simu

let canvas;
let ctx;
let tsfm;

let amplitude = 10;  // should be 1 !!!
let scale_comp = 0.2;  // should be 0 !!!


// definition orentation debut et fin 
function main() {
    canvas = document.getElementById("canvas");  //creer le plot
    ctx = canvas.getContext("2d");  //ecrire avec du 2D

    let xmin = -0.75;
    let xmax = 1.50;
    let ymin = -0.15;
    let ymax = ymin + (xmax - xmin) * canvas.height / canvas.width;
    tsfm = [
        canvas.width / (xmax - xmin), 0.,
        0., -canvas.height/(ymax - ymin),
        -xmin * canvas.width / (xmax - xmin),
        canvas.height + ymin * canvas.height / (ymax - ymin)
    ];
    document.getElementById('input-file').addEventListener('change', getFile);
}


let times;
let coords_x_new;
let coords_y_new;
let angles_new;
let polygons;

// gestion des fichiers input (peut surement faire mieux)
function getFile(event) {
    let name;
    const input = event.target;
    
    for (let i = 0; i < input.files.length; i++) {
        name = input.files[i].name;
        if (name.startsWith('time') && name.endsWith('.txt')) {
            readFileContent(input.files[i]).then(
                content => {
                    // console.log("Time file");
                    times = text_to_array(content);
                    // console.log(times);
                    if (coords_x_new && coords_y_new && angles_new && times && polygons) {
                        display_traction(duration_anim);
                    }
                }
            ).catch(error => console.log(error));                
        } else if (name.startsWith('nodes_x') && name.endsWith('.txt')) {
            readFileContent(input.files[i]).then(
                content => {
                    // console.log("X file");
                    coords_x_new = text_to_array(content);
                    // console.log(coords_x_new);
                    if (coords_x_new && coords_y_new && angles_new && times && polygons) {
                        display_traction(duration_anim);
                    }
                }
            ).catch(error => console.log(error));
        } else if (name.startsWith('nodes_y') && name.endsWith('.txt')) {
            readFileContent(input.files[i]).then(
                content => {
                    // console.log("Y file");
                    coords_y_new = text_to_array(content);
                    // console.log(coords_y_new);
                    if (coords_x_new && coords_y_new && angles_new && times && polygons) {
                        display_traction(duration_anim);
                    }
                }
            ).catch(error => console.log(error));
        } else if (name.startsWith('angles') && name.endsWith('.txt')) {
            readFileContent(input.files[i]).then(
                content => {
                    // console.log("A file");
                    angles_new = text_to_array(content);
                    // console.log(angles_new);
                    if (coords_x_new && coords_y_new && angles_new && times && polygons) {
                        display_traction(duration_anim);
                    }
                }
            ).catch(error => console.log(error));
        } else if (name.startsWith('polygons') && name.endsWith('.txt')) {
            readFileContent(input.files[i]).then(
                content => {
                    // console.log("P file");
                    polygons = text_to_array(content);
                    // console.log(polygons);
                    if (coords_x_new && coords_y_new && angles_new && times && polygons) {
                        display_traction(duration_anim);
                    }
                }
            ).catch(error => console.log(error));
        }
    }
}

function readFileContent(file) {
	const reader = new FileReader()
    return new Promise((resolve, reject) => {
        reader.onload = event => resolve(event.target.result);
        reader.onerror = error => reject(error);
        reader.readAsText(file);
        setTimeout(function() {
            resolve();
        }, 1000);
    })
}

function text_to_array(text) {
    let lines = text.split('\n');
    let array = [];
    let line;
    let n = lines.length;
    for (let i = 0; i < n; i++) {
        line = lines[i].split(' ');
        if ((0 < line.length) && (line[0] != '')) {
            array.push([]);
            for (let j = 0; j < line.length; j++) {
                if (line[j] != '') {
                    array[i].push(parseFloat(line[j]));
                }
            }
        }
    }
    return array;
}

function add_fictitious_deformation(x, y) {
    for (let j = 0; j < x[0].length; j++) {
        dx = x[0][j] * scale_comp;
        dy = -y[0][j] * scale_comp;
        for (let i = 0; i < x.length; i++) {
            x[i][j] += dx * (i+1) / x.length;
            y[i][j] += dy * (i+1) / x.length;
        }
    }
}

// fonction qui va faire le refresh de mon ecran
function display_traction(duration) {

    let start = null;
    duration *= 1000;
    let current_idx = 0;

    add_fictitious_deformation(coords_x_new, coords_y_new);
    
    function step(timestamp) {
        if (!start) start = timestamp; 
        let t = (timestamp - start) / duration * times[times.length-1];
        if (timestamp < start + duration) {
            window.requestAnimationFrame(step);
        } else {
            t = times[times.length-1] - 1e-10;
            start = null;
        }

        if (times[current_idx + 1] < t) {
            current_idx += 1;
        }
        console.log(t);

        ctx.clearRect(0, 0, canvas.width, canvas.height);  //tt efacer 
        draw_orientations(t, current_idx);  //tt redessiner
        draw_grains(t, current_idx);
    }

    window.requestAnimationFrame(step);
}

function interp(x, x0, x1, y0, y1) {
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
}

function draw_grains(t, t_idx) {
    ctx.strokeStyle = LINE_COLOR;  //definir la couleur de ma ligne
    let t_prev = times[t_idx  ];
    let t_next = times[t_idx+1];
    let x, y;
    let nodes;
    for (let i = 0; i < polygons.length; i++) {
        nodes = polygons[i];
        ctx.beginPath();
        ctx.setTransform(...tsfm);
        x = interp(t, t_prev, t_next, coords_x_new[t_idx][nodes[0]], coords_x_new[t_idx+1][nodes[0]]);
        y = interp(t, t_prev, t_next, coords_y_new[t_idx][nodes[0]], coords_y_new[t_idx+1][nodes[0]]);
        ctx.moveTo(x, y);
        for (let j = 0; j < nodes.length; j++) {
            x = interp(t, t_prev, t_next, coords_x_new[t_idx][nodes[j]], coords_x_new[t_idx+1][nodes[j]]);
            y = interp(t, t_prev, t_next, coords_y_new[t_idx][nodes[j]], coords_y_new[t_idx+1][nodes[j]]);
            ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.resetTransform();
        ctx.lineWidth = 2*LINE_WIDTH;
        ctx.stroke();
    }
}

function draw_orientations(t, t_idx) {
    for (i = 0; i < polygons.length; i++) {
        draw_orientation(t, i, t_idx);
    }
}

show = 0;
function draw_orientation(t, i, t_idx) {

    let cg = [0., 0.];  // center of gravity
    let pts_x = [];  // liste des sommets du grains
    let pts_y = [];  
    let n_sides = polygons[i].length;  // number of sides of the grain
    let nodes = polygons[i];  // nombre de cote du polygone
    let t_prev = times[t_idx  ];
    let t_next = times[t_idx+1];

    //fonction pour trouver CG
    for (let j = 0; j < n_sides; j++) {
        x = interp(t, t_prev, t_next, coords_x_new[t_idx][nodes[j]], coords_x_new[t_idx+1][nodes[j]]);
        y = interp(t, t_prev, t_next, coords_y_new[t_idx][nodes[j]], coords_y_new[t_idx+1][nodes[j]]);
        pts_x.push(x);
        pts_y.push(y);
        cg[0] += pts_x[j];
        cg[1] += pts_y[j];
    }
    cg[0] /= n_sides;
    cg[1] /= n_sides;

    let p, q, r, s, res;
    let endpts = [];
    let flag_continue;

    // let alpha = orientations[i] * (1-t) + orientation_end[i] * t;
    let alpha_prev = angles_new[t_idx  ][i] * amplitude;
    let alpha_next = angles_new[t_idx+1][i] * amplitude;
    let s_ap = Math.sin(alpha_prev);
    let c_ap = Math.cos(alpha_prev);
    let s_an = Math.sin(alpha_next);
    let c_an = Math.cos(alpha_next);
    let alpha = Math.atan2(
        interp(t, times[t_idx], times[t_idx+1], s_ap, s_an),
        interp(t, times[t_idx], times[t_idx+1], c_ap, c_an)
    );

    for (sign = -1; sign <= 1; sign += 2) {
        p = [cg[0], cg[1]];
        flag_continue = true;
        
        while (flag_continue) {
            // console.log("\n", "New level set", p, alpha*180/Math.PI);
            endpts.length = 0;  // clear array
            q = [p[0] + Math.cos(alpha), p[1] + Math.sin(alpha)];  // unit vector along the orientation line
            
            // look for an intersection with each side of the grain
            for (j = 0; j < n_sides; j++) {
                // console.log("side " + (j+1));
                r = [pts_x[j], pts_y[j]];
                s = [pts_x[(j+1)%n_sides], pts_y[(j+1)%n_sides]];
                res = get_line_segment_intersection(p, q, r, s);
                // if (show<10000) {console.log(i, r, s, res, p, q, alpha); show+=1;}
                if (res != null) {
                    if ((endpts.length > 0) && (Math.hypot(endpts[0][0] - res[0], endpts[0][1] - res[1]) < TOL)) {
                        continue;
                    } else {
                        endpts.push(res);
                    }
                }
            }

            if (endpts.length != 2) {
                flag_continue = false;
            } else {
                draw_line(endpts[0], endpts[1], COLORS[11+(i%5)], LINE_WIDTH/2.);
                p[0] -= sign * Math.sin(alpha) * scale;
                p[1] += sign * Math.cos(alpha) * scale;
            }
        }
    }

}

function get_line_segment_intersection(p_org, p_dst, q_org, q_dst) {
    let [x1, y1] = p_org;
    let [x2, y2] = p_dst;
    let [x3, y3] = q_org;
    let [x4, y4] = q_dst;

    let denom = (x2-x1)*(y4-y3) - (x4-x3)*(y2-y1);
    if (Math.abs(denom) < TOL) {  // parallel lines
        return null;
    }

    // let s = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    let t = ((y1 - y2) * (x1 - x3) + (x2 - x1) * (y1 - y3)) / denom;

    if ((0 <= t) && (t <= 1)) {  // intersection is on q segment (p is infinite)
        return [x3*(1-t) + x4*t, y3*(1-t) + y4*t];
    } else {
        return null;
    }
}

function draw_line(p, q, color=LINE_COLOR, width=LINE_WIDTH) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.setTransform(...tsfm);
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(q[0], q[1]);
    ctx.resetTransform();
    ctx.lineWidth = width;
    ctx.stroke();
}