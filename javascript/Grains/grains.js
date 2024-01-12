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

let canvas;
let ctx;
let tsfm;

let duration_anim = 5.;

let coords_x = [
    [0., 4., 3, 0.],
    [4., 7., 7., 3.],
    [0., 3, 0.],
];
let coords_y = [
    [0., 0., 4., 3.],
    [0., 0., 4., 4.],
    [3., 4., 6.],
]

let coords_x_end = [
    [0., 6., 4.5, 0.],
    [6., 10.5, 10.5, 4.5],
    [0., 4.5, 0.],
];
let coords_y_end = [
    [0., 0., 4., 3.],
    [0., 0., 4., 4.],
    [3., 4., 6.],
]

let orientations = [  // Rigid orientation for each grain)
    0., 
    Math.PI/4,
    Math.PI/2
]
let orientation_end = [
    Math.PI/4,
    0.,
    Math.PI,
]

function main() {
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");

    let xmin = -3;
    let xmax = 12;
    let ymin = -1;
    let ymax = ymin + (xmax - xmin) * canvas.height / canvas.width;
    tsfm = [
        canvas.width / (xmax - xmin), 0.,
        0., -canvas.height/(ymax - ymin),
        -xmin * canvas.width / (xmax - xmin),
        canvas.height + ymin * canvas.height / (ymax - ymin)
    ];
    display_traction(duration_anim);
}



function display_traction(duration) {

    let start = null;
    duration *= 1000;
    
    function step(timestamp) {
        if (!start) start = timestamp;
        let t = (timestamp - start) / duration;
        if (timestamp < start + duration) {
            window.requestAnimationFrame(step);
        } else {
            t = 1.;
            start = null;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        draw_orientations(t);
        draw_grains(t);
    }

    window.requestAnimationFrame(step);
}

function draw_grains(t) {
    ctx.strokeStyle = LINE_COLOR;
    let x, y;
    for (let i = 0; i < coords_x.length; i++) {
        ctx.beginPath();
        ctx.setTransform(...tsfm);
        x = coords_x[i][0]*(1-t) + coords_x_end[i][0]*t;
        y = coords_y[i][0]*(1-t) + coords_y_end[i][0]*t;
        ctx.moveTo(x, y);
        for (let j = 0; j < coords_x[i].length; j++) {
            x = coords_x[i][j]*(1-t) + coords_x_end[i][j]*t;
            y = coords_y[i][j]*(1-t) + coords_y_end[i][j]*t;
            ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.resetTransform();
        ctx.lineWidth = 2*LINE_WIDTH;
        ctx.stroke();
    }
}

function draw_orientations(t) {
    for (i = 0; i < orientations.length; i++) {
        draw_orientation(t, i);
    }
}

show = 0;
function draw_orientation(t, i) {

    let cg = [0., 0.];  // center of gravity
    let pts_x = [];
    let pts_y = [];
    let n_sides = coords_x[i].length;  // number of sides of the grain

    for (let j = 0; j < n_sides; j++) {
        pts_x.push(coords_x[i][j]*(1-t) + coords_x_end[i][j]*t);
        pts_y.push(coords_y[i][j]*(1-t) + coords_y_end[i][j]*t);
        cg[0] += pts_x[j];
        cg[1] += pts_y[j];
    }
    cg[0] /= n_sides;
    cg[1] /= n_sides;

    let p, q, r, s, res;
    let endpts = [];
    let flag_continue;

    let alpha = orientations[i] * (1-t) + orientation_end[i] * t;

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
                p[0] -= sign * Math.sin(alpha);
                p[1] += sign * Math.cos(alpha);
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