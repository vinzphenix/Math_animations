const COLORS = [
    "#2e3440", "#3b4252", "#434c5e", "#4c566a", 
    "#d8dee9", "#e5e9f0", "#eceff4", 
    "#8fbcbb", "#88c0d0", "#81a1c1", "#5e81ac",
    "#bf616a", "#d08770", "#ebcb8b", "#a3be8c", "#b48ead",
    "#76c783", "#4a83ff", "#8194ff",
]

const DOT_RADIUS = 7;
const DOT_COLOR = COLORS[7];
const LINE_COLOR = COLORS[4];
const LINE_WIDTH = 2;

const do_animate = false;

let canvas, canvas_overlay;
let ctx, ctx_overlay;
let points = [
    // [0.15, 0.1],
    // [0.9, 0.1],
    // [0.9, 0.9],
    // [0.1, 0.9],
    // [0.3, 0.3],
    // [0.2, 0.3],
    // [0.3, 0.7],
    // [0.7, 0.6],
    // [0.75, 0.25],
    // [0.55, 0.15],
    // [0.35, 0.95]
];

anim_queue = [];
anim_queue_args = [];

function main() {
    canvas = document.getElementById("canvas");
    canvas_overlay = document.getElementById("canvas_bis");
    ctx = canvas.getContext("2d");
    ctx_overlay = canvas_overlay.getContext("2d");
    
    for (let i = 0; i < points.length; i++) {
        points[i][0] = Math.round(points[i][0] * canvas.width);
        points[i][1] = Math.round(points[i][1] * canvas.height);
    }
    
    handle_inputs();
    
    for (let i = 0; i < points.length; i++) {
        if (do_animate) {
            anim_queue.push(draw_point_anim);
            anim_queue_args.push([0.5, points[i]]);
        } else {
            draw_point(ctx, points[i]);
        }
        if (0 < i) {
            // anim_queue.push(draw_line_anim);
            // anim_queue_args.push([0.5, points[i-1], points[i]]);
        }
    }
    if (do_animate) anim_queue.shift()(...anim_queue_args.shift());

    // res = circum_circle(points[0], points[3], points[4])
    // let theta = Math.atan2(points[0][1] - res[0][1], points[0][0] - res[0][0]);
    // draw_circle_anim(2., res[0], res[1], theta);

    // console.log(in_circle(points[0], points[3], points[4], points[1]));
    // console.log(ccw(points[0], points[3], points[4]));

}

function handle_inputs() {
    canvas_overlay.addEventListener("click", function (e) {
        let x = e.offsetX;
        let y = e.offsetY;
        points.push([x, y]);
        if (1 < points.length) {
            draw_line_anim(1., points[points.length - 2], points[points.length - 1]);
        }
        draw_point_anim(0.5, [x, y]);
        for (let i = 0; i < points.length; i++) {
            console.log(Math.round(points[i][0] * 1000) / 1000, Math.round(points[i][1] * 1000) / 1000);
        }
    });
}


function ccw(pa, pb, pc) {
    return 0 < -(pa[0] * (pb[1] - pc[1]) + pb[0] * (pc[1] - pa[1]) + pc[0] * (pa[1] - pb[1]));
}

function left_of(xy, edge) {
    return ccw(xy, edge[0], edge[1]);
}

function right_of(xy, edge) {
    return !ccw(xy, edge[0], edge[1]);

}

function in_circle(pa, pb, pc, pd) {
    let adx = pa[0] - pd[0];
    let ady = pa[1] - pd[1];
    let bdx = pb[0] - pd[0];
    let bdy = pb[1] - pd[1];
    let cdx = pc[0] - pd[0];
    let cdy = pc[1] - pd[1];
    
    let abdet = adx * bdy - bdx * ady;
    let bcdet = bdx * cdy - cdx * bdy;
    let cadet = cdx * ady - adx * cdy;
    
    let alift = adx * adx + ady * ady;
    let blift = bdx * bdx + bdy * bdy;
    let clift = cdx * cdx + cdy * cdy;

    return 0 < alift * bcdet + blift * cadet + clift * abdet;
}

function circum_circle(pa, pb, pc) {
    let adx = pa[0] - pc[0];
    let ady = pa[1] - pc[1];
    let bdx = pb[0] - pc[0];
    let bdy = pb[1] - pc[1];
    
    let abdet = adx * bdy - bdx * ady;
    
    let alift = adx * adx + ady * ady;
    let blift = bdx * bdx + bdy * bdy;

    let d = 2 * abdet;
    let x = (bdy * alift - ady * blift) / d;
    let y = (adx * blift - bdx * alift) / d;
    let r = Math.sqrt(x * x + y * y);
    return [[x + pc[0], y + pc[1]], r];

}

/////////////////////////////////////////////////////////////////

function smooth(t) {
    let s = 1. - t;
    return t*t*t * (10. * s * s + 5. * s * t + t * t);
}

function rush_into(t) {
    return 2 * smooth(0.5 * t)
}

function rush_from(t) {
    return 2 * smooth(0.5 * (t + 1)) - 1
}

function easeOutElastic(t) {
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -20 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

function easeInOut(t) {
    const k = 20;
    const tmp = (t < 0.5) ? Math.pow(2, k * (t - 0.5)) : 2 - Math.pow(2, -k * (t - 0.5));
    return (tmp - Math.pow(2, -k/2)) / (2 * (1 - Math.pow(2, -k/2.)));
}

function execute_animations() {

}

function draw_point(c, p, color=DOT_COLOR, radius=DOT_RADIUS) {
    c.beginPath();
    c.arc(p[0], p[1], radius, 0, 2 * Math.PI);
    c.fillStyle = color;
    c.fill();
}

function draw_point_anim(duration, p, color=DOT_COLOR, radius=DOT_RADIUS) {
    
    draw_point(ctx, p, color, radius);
    let start = null;
    duration *= 1000;
    
    function step(timestamp) {
        if (!start) start = timestamp;
        let t = easeInOut((timestamp - start) / duration);
        if (timestamp - start < duration) {
            window.requestAnimationFrame(step);
        } else {
            t = 1.;
            start = null;
        }
        
        ctx_overlay.clearRect(0, 0, canvas.width, canvas.height);
        let r = 5 * radius * (1. - t) + radius * t;
        draw_point(ctx_overlay, p, color, r);

        if ((start == null) && (0 < anim_queue.length)) {
            anim_queue.shift()(...anim_queue_args.shift());
        }
    }

    window.requestAnimationFrame(step);
}

function draw_line(p, q, color=LINE_COLOR, width=LINE_WIDTH) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(q[0], q[1]);
    ctx.stroke();
}

function draw_line_anim(duration, p, q, color=LINE_COLOR, width=LINE_WIDTH) {

    let start = null;
    duration *= 1000;
    
    function step(timestamp) {
        if (!start) start = timestamp;
        let t = easeInOut((timestamp - start) / duration);
        if (timestamp < start + duration) {
            window.requestAnimationFrame(step);
        } else {
            t = 1.;
            start = null;
        }
        let dst = [p[0]*(1-t) + q[0]*t, p[1]*(1-t) + q[1]*t];
        draw_line(p, dst, color, width);
        if ((start == null) && (0 < anim_queue.length)) {
            anim_queue.shift()(...anim_queue_args.shift());
        }
    }

    window.requestAnimationFrame(step);
}

function draw_circle(p, r, color=LINE_COLOR, width=LINE_WIDTH, start=0, end=2*Math.PI) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.arc(p[0], p[1], r, start, end);
    ctx.stroke();
}

function draw_circle_anim(duration, p, r, theta, color=LINE_COLOR, width=LINE_WIDTH) {

    let start = null;
    duration *= 1000;
    
    function step(timestamp) {
        if (!start) start = timestamp;
        let t = easeInOut((timestamp - start) / duration);
        if (timestamp < start + duration) {
            window.requestAnimationFrame(step);
        } else {
            t = 1.;
            start = null;
        }

        draw_circle(p, r, color, width, theta, theta + 2 * Math.PI * t);

        if ((start == null) && (0 < anim_queue.length)) {
            anim_queue.shift()(...anim_queue_args.shift());
        }
    }

    window.requestAnimationFrame(step);
}