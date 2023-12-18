// TODO : draw physics

// Layout parameters
const LW = window.innerWidth / 2000;  // line width
const COLORS = [
    "#2e3440", "#3b4252", "#434c5e", "#4c566a", 
    "#d8dee9", "#e5e9f0", "#eceff4", 
    "#8fbcbb", "#88c0d0", "#81a1c1", "#5e81ac",
    "#bf616a", "#d08770", "#ebcb8b", "#a3be8c", "#b48ead",
    "#76c783", "#4a83ff", "#8194ff",
]

const origin_shift = 0.05;  // percentage of width
const min_pixel_per_unit = 60;
const dot_state_radius = 10 * LW;  // same as locus dot size
const px_per_step = 10;  // discretization of curves
const n_speed_lines = 20;  // number of speed lines

// Simulation parameters
let G = 1.4;
let qL = [1., +0., 5.];  // left state
let qR = [.125, +0., .5];  // right state
let ql = [0., +0., 0.];  // middle left state (just for initialization)
let qr = [0., +0., 0.];  // middle right state (just for initialization)

let c_speeds = [0., 0., 0., 0.];
let lambdas = [[0., 0., 0.], [0., 0., 0.], [0., 0., 0.], [0., 0., 0.]];
let speeds = [0., 0., 0., 0.];
let wave_type = ["R", "R"];
const EPS = 1.e-14;

// Axes limits
let x_max = 8.;
let qq_max = [0., 1., -1., 1., 0., 1.];
let q_max = [-5., 5., 0., 10.];  // [q1, q2] max values
let tsfm1A, tsfm1B, tsfm1C, tsfm2, tsfm3;

// Interaction parameters
let state_map = ["r", "u", "p"];
let state_labels = ["\u03C1", "u", "p"];
let drag_flag = -1;
let entropy_fix = true;
let pan_init = [undefined, undefined];
let hoover_position_q = [-1., 0.];
let hoover_position_xt = [undefined, undefined];
let active_char = [true, true, true];

// Animation parameters
let anim_state = "init";  // init, play, pause, end
let last_clock = null;
let last_t = 0.;
let duration = 2.;
let speedup = 0.5;
let x_speed_lines = [];


function main(canvas_axes, canvas_list) {

    set_transforms();
    set_backgrounds_1(canvas_axes[0], canvas_axes[1], canvas_axes[2])
    set_background_2(canvas_axes[3]);
    set_background_3(canvas_axes[4]);

    handle_inputs(canvas_axes, canvas_list);  // Handle input interactions
    update_all_plots(canvas_list);  // Initial figure display
    adjust_frame();
}

function set_transforms() {

    [cv1A, cv1B, cv1C, cv2, cv3] = canvas_list;

    tsfm1A = [
        cv1A.width / (2. * x_max), 0.,
        0., -cv1A.height/(qq_max[1] - qq_max[0]),
        cv1A.width / 2., cv1A.height * (qq_max[1]) / (qq_max[1] - qq_max[0]),
    ];
    tsfm1B = [
        cv1B.width / (2. * x_max), 0., 
        0., -cv1B.height / (qq_max[3] - qq_max[2]),
        cv1B.width / 2., cv1B.height * (qq_max[3]) / (qq_max[3] - qq_max[2]),
    ];
    tsfm1C = [
        cv1C.width / (2. * x_max), 0., 
        0., -cv1C.height / (qq_max[5] - qq_max[4]),
        cv1C.width / 2., cv1C.height * (qq_max[5]) / (qq_max[5] - qq_max[4]),
    ];

    tsfm2 = [
        cv2.width / (q_max[1] - q_max[0]), 0.,
        0., -cv2.height / (q_max[3] - q_max[2]), 
        cv2.width * -q_max[0] / (q_max[1] - q_max[0]),
        cv2.height * q_max[3] / (q_max[3] - q_max[2]),
    ];
    tsfm3 = [
        cv3.width / (2. * x_max), 0., 
        0., -cv3.height / (duration) * (1. - origin_shift),
        cv3.width / 2., cv3.height * (1. - origin_shift),
    ];
}

function set_q_bounds() {
    q_max[0] = (0.         - tsfm2[4]) / tsfm2[0];
    q_max[1] = (cv2.width  - tsfm2[4]) / tsfm2[0];
    q_max[2] = (cv2.height - tsfm2[5]) / tsfm2[3];
    q_max[3] = (0.         - tsfm2[5]) / tsfm2[3];
}


///////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////  -  HANDLE ALL INPUTS  -  //////////////////////////////////

function handle_inputs(canvas_axes_list, canvas_list) {
    
    state_space_inputs(canvas_axes_list, canvas_list);
    characteristic_intputs(canvas_axes_list, canvas_list);
    limits_inputs(canvas_axes_list, canvas_list);
    animation_inputs();
    state_numeric_inputs(canvas_list, canvas_axes_list, qL, qR, "qL");
    state_numeric_inputs(canvas_list, canvas_axes_list, qR, qL, "qR");
    gamma_input(canvas_list);
    
}

function init_non_vacuum(q) {
    q[0] = 1.;
    q[2] = 1.;
}

function state_numeric_inputs(canvas_list, canvas_axes, this_q, next_q, this_id) {
    // Density input
    document.getElementById(this_id + 0).value = this_q[0];
    document.getElementById(this_id + 0).addEventListener(
        'keypress', function (e){
            if (e.key === 'Enter') this.blur();
        }
    );
    document.getElementById(this_id + 0).addEventListener(
        'blur', function (e){
            if (anim_state != "init") {
                this.value = this_q[0];
                return;
            }
            this.value = Math.max(0., this.value);
            if ((is_vacuum(next_q)) && (this.value < EPS)) this.value = this_q[0];
            else this_q[0] = Number(this.value);
            if (this_q[0] < EPS) {  // set vacuum
                set_vaccum(this_q);
            } else if (is_vacuum(this_q)) {  // leave vacuum
                this_q[1] = (q_max[0] + q_max[1]) / 2.;
                this_q[2] = 1.;
            }
            document.getElementById(this_id + 1).value = this_q[1];
            document.getElementById(this_id + 2).value = this_q[2];
            update_all_plots(canvas_list);
            adjust_frame();
        }
    );

    // Velocity input
    document.getElementById(this_id + 1).value = this_q[1];
    document.getElementById(this_id + 1).addEventListener(
        'keypress', function (e){
            if (e.key === 'Enter') this.blur();
        }
    );
    document.getElementById(this_id + 1).addEventListener(
        'blur', function (e){
            if ((anim_state != "init") || is_vacuum(this_q)) {
                this.value = this_q[1];
                return;
            }
            this_q[1] = Number(this.value);
            update_all_plots(canvas_list);
            adjust_frame();
        }
    );

    // Pressure input
    document.getElementById(this_id + 2).value = this_q[2];
    document.getElementById(this_id + 2).addEventListener(
        'keypress', function (e){
            if (e.key === 'Enter') this.blur();
        }
    );
    document.getElementById(this_id + 2).addEventListener(
        'blur', function (e){
            if (anim_state != "init") {
                this.value = this_q[2];
                return;
            }
            this.value = Math.max(0., this.value);
            if ((is_vacuum(next_q)) && (this.value < EPS)) this.value = this_q[2];
            else this_q[2] = Number(this.value);
            if (this_q[2] < EPS) {
                set_vaccum(this_q);
            } else if (is_vacuum(this_q)) {  // leave vacuum
                this_q[0] = 1.;
                this_q[1] = (q_max[0] + q_max[1]) / 2.;
            }
            document.getElementById(this_id + 0).value = this_q[0];
            document.getElementById(this_id + 1).value = this_q[1];
            update_all_plots(canvas_list);
            adjust_frame();
        }
    );
}

function state_space_inputs(canvas_axes_list, canvas_list) {
    let canvas = canvas_list[3];
    let canvas_axes = canvas_axes_list[3];

    canvas.addEventListener('mousedown', function(e){
        if (anim_state == "init") mouse_select_state(e, tsfm2);
        if (drag_flag == -1) start_pan(e);
    });
    canvas.addEventListener('mousemove', function(e){
        // if (anim_state == "init") 
        mouse_move_state(e, canvas_list);
        if ((pan_init[0] != undefined) && (canvas.style.cursor != "crosshair")) {
            pan(e, canvas, canvas_axes);
        }
    });

    canvas.addEventListener('wheel', function(e){
        zoom(e, canvas, canvas_axes);
    });
    canvas.addEventListener('mouseup', (e) => {
        if (drag_flag != -1) stop_move_state(canvas);
        if (pan_init[0] != undefined) stop_pan(canvas);
    });
    canvas.addEventListener('mouseout', (e) => {
        hoover_position_q[1] = -1;
        stop_move_state(canvas);
        // stop_pan(canvas);
        draw_loci(canvas, tsfm2);
    });
    canvas.addEventListener('mouseenter', (e) => {
        if (e.buttons != 1) stop_pan(canvas);
    });

    canvas.addEventListener('keydown', (e) => {
        if (e.shiftKey) {
            canvas.style.cursor = "row-resize";
        }
    });
    canvas.addEventListener('keyup', (e) => {
        if (e.key == "Shift") {
            canvas.style.cursor = "default";
        }
    });

    // Apply or not entropy condition
    document.getElementById("entropy").checked = entropy_fix;
    document.getElementById("entropy").addEventListener(
        'input', function (e) {
            entropy_fix = this.checked;
            draw_loci(canvas2, tsfm2);
        }
    );
}

function characteristic_intputs(canvas_axes_list, canvas_list) {
    let canvas = canvas_list[4];
    let canvas_axes = canvas_axes_list[4];

    // Display hoovered characteristics as bold
    canvas.addEventListener('mousemove', function(e){
        mouse_move_hoover_char(e, canvas);
    });
    canvas.addEventListener('mouseout', (e) => {
        mouse_move_hoover_char(e, canvas, reset=true);
    });

    // Handle which characteristics to display
    document.getElementById("1_char").checked = active_char[0];
    document.getElementById("1_char").addEventListener(
        'input', function (e) {
            active_char[0] = this.checked;
            draw_characteristics(canvas3, tsfm3, last_t);
        }
    );
    document.getElementById("2_char").checked = active_char[1];
    document.getElementById("2_char").addEventListener(
        'input', function (e) {
            active_char[1] = this.checked;
            draw_characteristics(canvas3, tsfm3, last_t);
        }
    );
    document.getElementById("3_char").checked = active_char[2];
    document.getElementById("3_char").addEventListener(
        'input', function (e) {
            active_char[2] = this.checked;
            draw_characteristics(canvas3, tsfm3, last_t);
        }
    );
}

function limits_inputs(canvas_axes_list, canvas_list) {
    // Set simulation duration
    document.getElementById("input_T").value = duration;
    document.getElementById("input_T").addEventListener(
        'keyup', function (e){
            if (e.key === 'Enter') this.blur();
        }
    );
    document.getElementById("input_T").addEventListener(
        'blur', function (e){
            let value = Number(this.value);
            if ((EPS < Number(this.value)) && (anim_state == "init")) {
                tsfm3[3] *= duration / value;
                duration = value;
                document.getElementById("range_t").max = duration;
                set_background_3(canvas_axes_list[4]);
                draw_characteristics(canvas_list[4], tsfm3, 0.);
            } else {
                this.value = duration;
            }
        }
    );

    // Set x limits
    document.getElementById("input_x").value = x_max;
    document.getElementById("input_x").addEventListener(
        'keyup', function (e){
            if (e.key === 'Enter') this.blur();
        }
    );
    document.getElementById("input_x").addEventListener(
        'blur', function (e){
            let value = Number(this.value);
            if ((EPS < Number(this.value)) && (anim_state == "init")) {
                let tsfms = [tsfm1A, tsfm1B, tsfm1C, tsfm3];
                for (i = 0; i < tsfms.length; i++) tsfms[i][0] *= x_max / value;
                x_max = value;
                set_backgrounds_1(canvas_axes_list[0], canvas_axes_list[1], canvas_axes_list[2]);
                set_background_3(canvas_axes_list[4]);
                draw_characteristics(canvas3, tsfm3);
                setup_animation();
            } else {
                this.value = x_max;
            }
        }
    );

    // Handle re-framing
    window.addEventListener('keydown', (e) => {
        if ((e.key != "z") || (anim_state != "init")) return;
        e.preventDefault();
        adjust_frame();
    });

    window.addEventListener('keydown', (e) => {
        if (e.key != "o") return;
        reset_axes(canvas_list[3], canvas_axes_list[3]);
    });
}

function handle_play_pause() {
    if ((anim_state == "init") || (anim_state == "end")) {
        anim_state = "play";
        drag_flag = -1;
        setup_animation();
        last_clock = performance.now();
        last_t = 0.;
        requestAnimationFrame(animate);
    } else if (anim_state == "pause") {
        anim_state = "play";
        last_clock = performance.now();
        requestAnimationFrame(animate);
    } else {  // playing
        anim_state = "pause";
    }
}

function handle_stop() {
    anim_state = "init";
    last_t = 0.;
    setup_animation();
}

function animation_inputs() {
    // Set simulation time
    document.getElementById("range_t").value = 0.;
    document.getElementById("range_t").min = 0.;
    document.getElementById("range_t").max = duration;
    document.getElementById("range_t").addEventListener(
        'input', function (e) {
            if (anim_state != "play") {
                anim_state = "pause";
                last_t = Number(this.value);
                last_clock = performance.now();
                requestAnimationFrame(animate);
            }
        }
    );

    // Set simulation speed
    document.getElementById("range_speed").value = Math.log2(speedup);
    document.getElementById("range_speed").min = -8;
    document.getElementById("range_speed").max = +2;
    document.getElementById("range_speed").addEventListener(
        'input', function (e) {
            speedup = 2 ** (Number(this.value));
            if (1 <= speedup) {
                document.getElementById("text_speed").innerText = "Speed x" + Math.round(speedup);
            } else {
                document.getElementById("text_speed").innerText = "Speed /" + Math.round(1./speedup);
            }
        }
    );

    // Handle play/pause and stop buttons
    document.getElementById("button_play").addEventListener("click", handle_play_pause);
    document.getElementById("button_stop").addEventListener("click", handle_stop);

    // And related keyboard shortcuts
    window.addEventListener('keydown', (e) => {
        if (e.key != " ") return;
        handle_play_pause();
    });
    window.addEventListener('keydown', (e) => {
        if (e.key != "r") return;
        handle_stop();
    });

    // Handle play/pause switch on button
    const button = document.querySelector(".btn");
    button.addEventListener(
        "click",
        function(e){
            e.preventDefault();
            if (this.classList.contains('play')) {
                this.classList.remove('play');
                this.classList.add('pause');
            } else {
                this.classList.remove('pause');
                this.classList.add('play');
            }
        }
    );
}

function gamma_input(canvas_list) {
    // Set gamma
    document.getElementById("range_g").value = G;
    document.getElementById("range_g").min = 1.1;
    document.getElementById("range_g").max = 1.67;
    document.getElementById("range_g").addEventListener(
        'input', function (e) {
            if (anim_state == "init") {
                G = Number(this.value);
                document.getElementById("text_g").innerText = "γ = " + G.toFixed(2);
                update_all_plots(canvas_list);
            } else {
                this.value = G;
            }
        }
    );
}

function mouse_select_state(event, tsfm) {
    var x = event.offsetX;
    var y = event.offsetY;
    q_list = [qL, qR];  // list of list

    for (i = 0; i < 2; i++) {
        qs = [
            tsfm[0] * q_list[i][1] + tsfm[2] * q_list[i][2] + tsfm[4],
            tsfm[1] * q_list[i][1] + tsfm[3] * q_list[i][2] + tsfm[5],
        ];

        if (Math.hypot(qs[0] - x, qs[1] - y) < dot_state_radius) {
            drag_flag = i + 1;  // 1 or 2
        }
    }
}

function mouse_move_state(event, canvas_list) {
    
    function set_new_state(x, y, q, q_other, id) {
        base_x = Math.pow(10, 3 - Math.floor(Math.log10(q_max[1] - q_max[0])));
        base_y = Math.pow(10, 3 - Math.floor(Math.log10(q_max[3] - q_max[2])));
        let new_u = Math.round(x * base_x) / base_x;
        let new_p = Math.round(y * base_y) / base_y;
        if (EPS < new_p) {  // new state is not vacuum
            q[1] = new_u;
            q[2] = new_p;
        } else if (!is_vacuum(q_other)) {  // other state not vacuum
            set_vaccum(q);
            drag_flag = -1;  // stop dragging as the state disappeared
        }
        document.getElementById(id + 1).value = q[1];
        document.getElementById(id + 2).value = q[2];
    }
    
    let x = event.offsetX;
    let y = event.offsetY;
    if (y > tsfm2[5]) return;

    hoover_position_q[0] = x;
    hoover_position_q[1] = y;
    
    if (drag_flag != -1) {
        x -= tsfm2[4];
        y -= tsfm2[5];
        
        // Transform from back to state space
        det = 1. / (tsfm2[0] * tsfm2[3] - tsfm2[1] * tsfm2[2]);
        new_x = det * (+tsfm2[3] * x - tsfm2[2] * y);
        new_y = det * (-tsfm2[1] * x + tsfm2[0] * y);

        if (drag_flag == 1) set_new_state(new_x, new_y, qL, qR, "qL");
        else set_new_state(new_x, new_y, qR, qL, "qR");
        
        update_all_plots(canvas_list);
    }

    draw_states(canvas_list[3], tsfm2);
}

function mouse_move_hoover_char(event, canvas, reset=false) {
    let x = event.offsetX - tsfm3[4];
    let y = event.offsetY - tsfm3[5];
    if ((y > 0.) || reset) {
        hoover_position_xt[0] = hoover_position_xt[1] = undefined;
    } else {
        det = 1. / (tsfm3[0] * tsfm3[3] - tsfm3[1] * tsfm3[2]);
        hoover_position_xt[0] = det * (+tsfm3[3] * x - tsfm3[2] * y);
        hoover_position_xt[1] = det * (-tsfm3[1] * x + tsfm3[0] * y);
    }
    draw_characteristics(canvas, tsfm3, last_t);
}

function set_mode(which, value){

    if (anim_state == "play") return;
    
    // Set state mapping
    state_map[which-1] = value;
    
    // Set state labels
    if (value == "r") state_labels[0] = "\u03C1";
    else if (value == "ru") state_labels[1] = "\u03C1u";
    else state_labels[which-1] = value;

    // Update the plots, and the bounding box
    setup_animation();
    adjust_frame();
}

function stop_move_state(canvas) {
    drag_flag = -1;
}

function start_pan(e) {
    pan_init = [e.offsetX - tsfm2[4], e.offsetY - tsfm2[5]];
}

function pan(e, canvas, canvas_axes) {
    canvas.style.cursor = "grabbing";
    tsfm2[4] = e.offsetX - pan_init[0];
    tsfm2[5] = e.offsetY - pan_init[1];
    set_q_bounds();
    set_background_2(canvas_axes);
    draw_loci(canvas, tsfm2);
}

function stop_pan(canvas) {
    pan_init = [undefined, undefined];
    canvas.style.cursor = "default";
}

function zoom(e, canvas, canvas_axes) {
    let cursor_coords = [
        (e.offsetX - tsfm2[4]) / tsfm2[0], 
        (e.offsetY - tsfm2[5]) / tsfm2[3],
    ];
    tsfm2[0] *= (1. - 0.001 * e.deltaY);
    tsfm2[4] = e.offsetX - tsfm2[0] * cursor_coords[0];
    if (!e.shiftKey) {
        tsfm2[3] *= (1. - 0.001 * e.deltaY);
        tsfm2[5] = e.offsetY - tsfm2[3] * cursor_coords[1];
    }
    set_q_bounds();
    set_background_2(canvas_axes);
    draw_loci(canvas, tsfm2);
}

function reset_axes(canvas, canvas_axes) {
    q_max = [-5., 5., 0., 10.];
    set_transforms();
    set_background_2(canvas_axes);
    draw_loci(canvas, tsfm2);
}


///////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////  -  MAIN FUNCTIONS FOR INTERACTIVE INTERFACE  -  ///////////////////////

function update_all_plots(canvas_list) {
    // At most one of two states is vacuum
    // Vacuum states are characterized by "undefined" velocity
    set_state_speeds(qL, 0);
    set_state_speeds(qR, 3);

    res = find_middle_state(qL, qR);
    [ql[1], ql[2]] = res;
    [qr[1], qr[2]] = res;
    
    set_middle_density(ql, qL, wave_type[0]);
    set_middle_density(qr, qR, wave_type[1]);

    set_state_speeds(ql, 1);
    set_state_speeds(qr, 2);

    // Evaluate shock/rarefaction speeds
    speeds[0] = lambdas[0][0]; // undefined if qL vacuum
    speeds[1] = ((is_vacuum(qL)) || (! is_vacuum(ql))) ? lambdas[1][0] : qL[1] + 2. * c_speeds[0] / (G - 1.);
    speeds[2] = lambdas[1][1]; // equal to lambdas[2][1], undefined when middle vacuum
    speeds[3] = ((is_vacuum(qR)) || (! is_vacuum(qr))) ? lambdas[2][2] : qR[1] - 2. * c_speeds[3] / (G - 1.);
    speeds[4] = lambdas[3][2];  //  undefined if qR vacuum
    if ((!is_vacuum(qL)) && (!is_vacuum(ql)) && (speeds[0] > speeds[1])) speeds[0] = speeds[1] = compute_s(1);  // 1-shock
    if ((!is_vacuum(qR)) && (!is_vacuum(qr)) && (speeds[3] > speeds[4])) speeds[3] = speeds[4] = compute_s(3);  // 3-shock

    draw_loci(canvas_list[3], tsfm2);
    draw_characteristics(canvas_list[4], tsfm3);

    setup_animation();
}

let qq_max_init, qq_max_target, frame_start_clock;
function adjust_frame() {
    let [x_array, y_arrays] = compute_fields(duration);
    let bounds, delta, y_value;
    qq_max_init = qq_max.slice();
    qq_max_target = qq_max.slice();

    for (f = 0; f < y_arrays.length; f++) {
        bounds = [+Infinity, -Infinity];
        for (i = 0; i < y_arrays[f].length; i++) {
            y_value = y_arrays[f][i];
            if (y_value != undefined) bounds[0] = Math.min(bounds[0], y_value);
            if (y_value != undefined) bounds[1] = Math.max(bounds[1], y_value);
        }
        delta = bounds[1] - bounds[0];
        if (delta < 1.e-8) delta = Math.max(0.25 * bounds[0], 11.)
        qq_max_target[2*f + 0] = bounds[0] - 0.1 * delta;
        qq_max_target[2*f + 1] = bounds[1] + 0.1 * delta;
    }

    // Clip to zero for nonegative fields
    if (state_map[0] == "r") qq_max_target[2*0 + 0] = Math.max(qq_max_target[2*0 + 0], 0.);
    if (state_map[1] == "c")  qq_max_target[2*1 + 0] = Math.max(qq_max_target[2*1 + 0], 0.);
    if (state_map[2] != "R3") qq_max_target[2*2 + 0] = Math.max(qq_max_target[2*2 + 0], 0.);

    requestAnimationFrame(move_frame);
    // set_transforms();
    // set_backgrounds_1(...canvas_axes_list);
    // setup_animation();
}

function easing(t) {
    let s = 1. - t;
    return t*t*t * (10. * s * s + 5. * s * t + t * t);
}

function move_frame(current_clock) {
    if (frame_start_clock == undefined) {
        frame_start_clock = current_clock;
    }
    
    let t = (current_clock - frame_start_clock) / 1000.;
    if (1. < t) {
        t = 1.;
        frame_start_clock = undefined;
    } else {
        requestAnimationFrame(move_frame);
    }

    t = easing(t);
    for (i = 0; i < 6; i++) {
        qq_max[i] = qq_max_init[i] * (1. - t) + t * qq_max_target[i];
    }

    let canvas_axes_list = [
        document.getElementById("canvas1A_Axes"),
        document.getElementById("canvas1B_Axes"),
        document.getElementById("canvas1C_Axes"),
    ]

    set_transforms();
    set_backgrounds_1(...canvas_axes_list);
    setup_animation();
}

function setup_animation() {

    const canvas_list = [
        document.getElementById("canvas1A"),
        document.getElementById("canvas1B"),
        document.getElementById("canvas1C"),
        document.getElementById("canvas2"),
    ]
    let canvas, ctx;
    let [x_array, y_arrays] = compute_fields(last_t);
    let tsfms = [tsfm1A, tsfm1B, tsfm1C];

    for (f = 0; f < 3; f++) {
        canvas = canvas_list[f];
        ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        draw_field(canvas, tsfms[f], x_array, y_arrays[f]);
    }

    draw_states(canvas_list[3], tsfm2);

    // Set vertical lines that depict the fluid velocity
    /*x_speed_lines.length = 0;
    for (i = 0; i < 2 * n_speed_lines + 2; i++) {
        x_speed_lines.push(-2.*x_max + 4. * x_max * i / (2. * n_speed_lines + 1.));
    }*/
    
    // draw_physics([0., 0., 0., 0.], [], []);

    set_time_cursor(last_t);

    canvas = document.getElementById("canvas3");
    draw_characteristics(canvas, tsfm3, last_t);
}

function set_time_cursor(t) {
    document.getElementById("range_t").value = t;
    document.getElementById("text_t").innerText = "t = " + (Math.round(100*t)/100).toFixed(2).padStart(4, ' ');
}

function animate(current_clock) {

    const canvas_list = [
        document.getElementById("canvas1A"),
        document.getElementById("canvas1B"),
        document.getElementById("canvas1C"),
        document.getElementById("canvas2"),
    ]
    const canvas_xt = document.getElementById('canvas3');
    const button = document.querySelector(".btn");
    
    let t = last_t;
    if (anim_state == "play") t += (current_clock - last_clock) * 1e-3 * speedup;

    if (duration < t) {
        anim_state = "end";
        t = duration;
    }

    // Update t range
    set_time_cursor(t);

    // Do the plots !
    const dx_ref = px_per_step / tsfm1A[0];
    let [x_array, y_arrays] = compute_fields(t)
    let tsfms = [tsfm1A, tsfm1B, tsfm1C];
    for (f = 0; f < 3; f++) {
        canvas = canvas_list[f];
        ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        draw_field(canvas, tsfms[f], x_array, y_arrays[f]);
    }

    // [positions, pts_1_wave, pts_2_wave] = compute_transitions_curves(t);
    // draw_physics(positions, pts_1_wave, pts_2_wave);
    // color_waves(pts_1_wave, pts_2_wave);
    // draw_speed_lines(t);
    draw_characteristics(canvas_xt, tsfm3, t);
    
    // Handle animation interaction
    if (anim_state == "play") {
        requestAnimationFrame(animate);
        button.classList.remove('play');
        button.classList.add('pause');
        last_clock = current_clock;
        last_t = t;
    } else {
        button.classList.remove('pause');
        button.classList.add('play');
        last_clock = null;
        if (anim_state == "init") {
            setup_animation();
        }
    }

}


///////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////  -  DO THE MATHS AND DRAW THE PHYSICS  -  //////////////////////////

function set_vaccum(q) {
    q[0] = 0.;
    q[1] = undefined;
    q[2] = 0.;
}

function is_vacuum(q) {
    return q[1] == undefined;
}

function set_state_speeds(q, which) {
    if (is_vacuum(q)) {
        c_speeds[which] = undefined;
        lambdas[which] = [undefined, undefined, undefined];        
    } else {
        c_speeds[which] = Math.sqrt(G * q[2] / q[0]);
        lambdas[which] = [q[1] - c_speeds[which], q[1], q[1] + c_speeds[which]];
    }
}

function set_middle_density(q_mid, q_ext, wave) {
    if (wave == "N") {  // Vacuum external state
        set_vaccum(q_mid);
    } else {
        let pp = q_mid[2] / q_ext[2];
        if (wave == "R") {  // Rarefaction wave
            q_mid[0] = q_ext[0] * Math.pow(pp, 1./G);
        } else {  // wave == "S" for Shock wave
            let alpha = (G - 1.) / (G + 1.);
            q_mid[0] = q_ext[0] * (pp + alpha) / (pp * alpha + 1.);
        }
    }
}

function compute_s(which) {
    let p_star = ql[2];  // equal to qr[2]
    if (which == 1) {
        let [rho, u, p] = qL;
        return u - c_speeds[0] * Math.sqrt((G+1)/(2*G) * p_star/p + (G-1)/(2*G));
    } else {
        let [rho, u, p] = qR;
        return u + c_speeds[3] * Math.sqrt((G+1)/(2*G) * p_star/p + (G-1)/(2*G));
    }
}

function compute_state_fan(x, t, which) {    
    let xi, r, u, p, R, U, P;
    let tmp;
    xi = x / t;
    if (which == 1) { // 1-rarefaction
        [R, U, P] = qL;
        tmp = 2.0 / (G+1.) + (G-1.) / (G+1.) * (U - xi) / c_speeds[0];
        tmp = Math.max(0., tmp);
        r = R * Math.pow(tmp, 2./(G-1.));
        u = 2. / (G+1.) * (xi + c_speeds[0] + (G-1.) / 2. * U);
        p = P * Math.pow(tmp, 2.*G/(G-1.));
    } else {  // 3-rarefaction
        [R, U, P] = qR;
        tmp = 2.0 / (G+1.) - (G-1.) / (G+1.) * (U - xi) / c_speeds[3];
        tmp = Math.max(0., tmp);
        r = R * Math.pow(tmp, 2./(G-1.));
        u = 2. / (G+1.) * (xi - c_speeds[3] + (G-1.) / 2. * U);
        p = P * Math.pow(tmp, 2.*G/(G-1.));
    }
    return [r, u, p]
}

function map_primitive(q) {
    let [r, u, p] = q;
    let v1, v2, v3;
    let vacuum = (r < EPS) || (p < EPS) || (u == undefined);

    let c = Math.sqrt(G * p / r);
    let p_r = p / r;

    if (state_map[0] == "r") v1 = r;
    else if (state_map[0] == "R1") v1 = (vacuum) ? undefined : u + 2. * c / (G - 1.);
    else if (state_map[0] == "s") v1 = (vacuum) ? undefined : Math.log(p / r**G);

    if (state_map[1] == "u") v2 = u;
    else if (state_map[1] == "ru") v2 = (vacuum) ? 0. : r * u;
    else if (state_map[1] == "c") v2 = (vacuum) ? 0. : c;

    if (state_map[2] == "p") v3 = p;
    else if (state_map[2] == "E") v3 = (vacuum) ? 0. : 0.5 * r * u * u + p / (G - 1.);
    else if (state_map[2] == "R3") v3 = (vacuum) ? undefined : u - 2. * c / (G - 1);
    else if (state_map[2] == "e") v3 = (vacuum) ? 0. : p_r / (G - 1.);
    else if (state_map[2] == "H") v3 = (vacuum) ? undefined : G * p_r / (G - 1.) + 0.5 * u * u;
    else if (state_map[2] == "h") v3 = (vacuum) ? 0. : G * p_r / (G - 1.);

    return [v1, v2, v3];
}

function compute_fields(t) {
    
    const canvas_width = document.getElementById("canvas1A").width;
    const dx_ref = (px_per_step / canvas_width) * (2. * x_max);
    const positions = [speeds[0] * t, speeds[1] * t, speeds[2] * t, speeds[3] * t, speeds[4] * t];
    
    let n_step, dx, x;
    let x_array = [];
    let y_array = [];
    // let y_array = [[], [], []];
    let q_map;
    
    // Add left state
    // if (!is_vacuum(qL)) {
        x_array.push(-x_max);
        q_map = map_primitive(qL);
        y_array.push(q_map);
    // }

    if (t < EPS) {

        // if (!is_vacuum(qL)) {
            x_array.push(0.);
            q_map = map_primitive(qL);
            y_array.push(q_map);
        // }
        // if (!is_vacuum(qR)) {
            x_array.push(0.);
            q_map = map_primitive(qR);
            y_array.push(q_map);
        // }

    } else {

        // 1-wave
        if (wave_type[0] == "R") {
            n_step = Math.ceil((positions[1] - positions[0]) / dx_ref);
            n_step = Math.max(100, n_step);
            dx = (positions[1] - positions[0]) / n_step;
            for (i = 0; i <= n_step; i++) {
                x = positions[0] + i * dx - EPS;
                q_map = compute_state_fan(x, t, 1);
                q_map = map_primitive(q_map);                
                x_array.push(x);
                y_array.push(q_map);
            }
        } else if (wave_type[0] == "S") {
            x_array.push(positions[0]);
            q_map = map_primitive(qL);
            y_array.push(q_map);
            q_map = map_primitive(ql);
            x_array.push(positions[1]);
            y_array.push(q_map);
        }

        // Contact-wave, when ql/qr non-vacuum
        if (!is_vacuum(qr)) {
            // Left of contact-wave
            q_map = map_primitive(ql);
            x_array.push(positions[2]);
            y_array.push(q_map);

            // Right of contact-wave
            q_map = map_primitive(qr);
            x_array.push(positions[2]);
            y_array.push(q_map);
        } else {
            x_array.push(positions[1]);
            q_map = map_primitive(ql);
            y_array.push(q_map);
            x_array.push(positions[3]);
            q_map = map_primitive(qr);
            y_array.push(q_map);
        }

        // 3-wave
        if (wave_type[1] == "R") {
            n_step = Math.ceil((positions[4] - positions[3]) / dx_ref);
            n_step = Math.max(100, n_step);
            dx = (positions[4] - positions[3]) / n_step;
            for (i = 0; i <= n_step; i++) {
                x = positions[3] + i * dx + EPS;
                q_map = compute_state_fan(x, t, 3);
                q_map = map_primitive(q_map);
                x_array.push(x);
                y_array.push(q_map);
            }
        } else if (wave_type[1] == "S") {
            x_array.push(positions[3]);
            q_map = map_primitive(qr);
            y_array.push(q_map);
            q_map = map_primitive(qR);
            x_array.push(positions[3]);
            y_array.push(q_map);
        }
    }

    // Right state
    // if (!is_vacuum(qR)) {
        q_map = map_primitive(qR);
        x_array.push(x_max);
        y_array.push(q_map);
    // }

    // transpose stuff
    let y_tsp = [[], [], []];
    for (i = 0; i < y_array.length; i++) {
        for (j = 0; j < y_tsp.length; j++) {
            y_tsp[j].push(y_array[i][j]);
        }
    }

    return [x_array, y_tsp];
}

function draw_field(canvas, tsfm, x, y) {
    let pen_up = false;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.setTransform(...tsfm);
    
    ctx.beginPath();
    // ctx.moveTo(x[0], y[0]);
    for (i = 0; i < x.length; i++) {
        
        if (y[i] == undefined) pen_up = true;
        
        if (pen_up) {
            ctx.moveTo(x[i], y[i]);
        } else {
            ctx.lineTo(x[i], y[i]);
        }
        if (y[i] != undefined) pen_up = false;
    }
    
    ctx.resetTransform();
    ctx.strokeStyle = COLORS[6];
    ctx.lineWidth = 5 * LW;
    ctx.stroke();
    ctx.restore();
}


///////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////  -  FIND MIDDLE STATE  -  //////////////////////////////////

function find_middle_state(qL, qR) {
    /**
     * Newton's method to find middle state
     */
    let alpha = (G + 1.) / (G - 1.);
    let cs1 = 2. * c_speeds[0] / Math.sqrt(2. * G * (G - 1.));
    let cr1 = 2. * c_speeds[0] / (G - 1.);
    let ds1 = 1. / Math.sqrt(2. * (G - 1.) * qL[0] * qL[2]);
    let dr1 = 1. / Math.sqrt(G * qL[0] * qL[2]);
    let cs3 = 2. * c_speeds[3] / Math.sqrt(2. * G * (G - 1.));
    let cr3 = 2. * c_speeds[3] / (G - 1.);
    let ds3 = 1. / Math.sqrt(2. * (G - 1.) * qR[0] * qR[2]);
    let dr3 = 1. / Math.sqrt(G * qR[0] * qR[2]);

    function f1(x) {
        if (x <= qL[2]) return qL[1] + cr1 * (1. - Math.pow(x/qL[2], (G-1) / (2*G)));  // 1-integral curve
        else return qL[1] - cs1 * (x / qL[2] - 1.) / Math.sqrt(1. + alpha * x / qL[2]);  // 1-hugoniot locus
    }
    function f2(x) {
        if (x <= qR[2]) return qR[1] - cr3 * (1. - Math.pow(x/qR[2], (G-1) / (2*G)));  // 1-integral curve
        else return qR[1] + cs3 * (x / qR[2] - 1.) / Math.sqrt(1. + alpha * x / qR[2]);  // 1-hugoniot locus
    }
    function f(x) {
        return f1(x) - f2(x);
    }
    function df(x) {
        res = 0.;
        
        if (x <= qL[2]) res -= dr1 * Math.pow(x / qL[2], -(G+1) / (2*G));
        else res -= ds1 * ((3*G-1) / (G-1) + alpha * x / qL[2]) / Math.pow(1. + alpha * x / qL[2], 1.5);
        
        if (x <= qR[2]) res -= dr3 * Math.pow(x / qR[2], -(G+1) / (2*G));
        else res -= ds3 * ((3*G-1) / (G-1) + alpha * x / qR[2]) / Math.pow(1. + alpha * x / qR[2], 1.5);
        
        return res;
    }

    // Handle vacuum states
    if (is_vacuum(qL) || is_vacuum(qR) || (qL[1] + cr1 < qR[1] - cr3)) {
        // console.log("Middle state is vacuum !");
        wave_type[0] = is_vacuum(qL) ? "N" : "R";
        wave_type[1] = is_vacuum(qR) ? "N" : "R";
        return [undefined, 0.];  // vacuum state
    }

    let fl = f(qL[2]);
    let fr = f(qR[2]);
    let x, delta, tmp1, tmp2;
    let tol = 1.e-8;
    let n = 0;
    let max_iter = 20;

    tmp1 = (c_speeds[0] + c_speeds[3] + 0.5 * (qL[1] - qR[1]) * (G-1.));
    tmp2 = c_speeds[0]/(Math.pow(qL[2], (G-1)/(2*G))) + c_speeds[3]/(Math.pow(qR[2], (G-1)/(2*G)));
    let p_rr = Math.pow(tmp1 / tmp2, 2*G/(G-1.));

    tmp1 = 1./Math.sqrt(qL[0]) + 1./Math.sqrt(qR[0]);
    tmp2 = (qL[2.]/Math.sqrt(qL[0]) + qR[2]/Math.sqrt(qR[0])) / tmp1;
    tmp1 = Math.sqrt(G + 1.) * (qL[1] - qR[1]) / tmp1;
    let p_ss = (tmp1 + Math.sqrt(tmp1*tmp1 + 8*tmp2))**2 / 8.;

    let p_min = Math.min(qL[2], qR[2]);

    // Initialize x in a smart way
    if (fl * fr < 0.) {  // RS or SR
        wave_type[0] = (0 < fl) ? "S" : "R";
        wave_type[1] = (0 < fr) ? "S" : "R";
        x = Math.min(p_ss, p_rr);
    } else if (fl > 0.) {  // SS
        wave_type[0] = wave_type[1] = "S";
        x = p_ss;
    } else {  // RR (analytic solution)
        wave_type[0] = wave_type[1] = "R";
        return [f1(p_rr), p_rr];
    }

    // Do Newton steps
    delta = 4 * x * tol;  // ensures enter loop
    while ((n < max_iter) && (tol < delta)) {
        delta = f(x) / df(x);
        x = Math.max(p_min, x - delta);  // avoids negative pressures... very very rare with such pressure guesses
        delta = 0.5 * Math.abs(delta) / (2 * x - delta);  // 1/2*[p(n+1) - p(n)]/[p(n+1) + p(n)] = 1/2|delta|/[2p(n) - delta]
        n ++;
    }
    
    return [f1(x), x];  // (velocity, pressure)
}


///////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////  -  HUGONIOT LOCI AND INTEGRAL CURVES  -  //////////////////////////

function draw_loci(canvas, tsfm) {
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    [pts_1_integral, pts_1_hugoniot] = compute_locus(1, qL);
    [pts_2_integral, pts_2_hugoniot] = compute_locus(3, qR);

    display_supersonic(canvas, qL, COLORS[13]);
    display_supersonic(canvas, qR, COLORS[18]);
    display_supersonic(canvas, ql, COLORS[5]);
    display_supersonic(canvas, qr, COLORS[5]);

    plot_locus(canvas, tsfm, COLORS[13], pts_1_integral, pts_1_hugoniot);
    plot_locus(canvas, tsfm, COLORS[18], pts_2_integral, pts_2_hugoniot);
    
    draw_states(canvas, tsfm);
    draw_limit_state(canvas, COLORS[13], qL, tsfm, +1.);
    draw_limit_state(canvas, COLORS[18], qR, tsfm, -1.);
    display_middle_state(canvas, "density");
    display_middle_state(canvas, "others");
}

function draw_states(canvas, tsfm) {

    // Draw middle state
    draw_state(canvas, COLORS[6], ql, tsfm, false, "left");
    draw_state(canvas, COLORS[6], qr, tsfm, false, "right");

    // Draw the left and right states in color, or not
    let activeL, activeR;
    
    // Need to know if qR is active, so that qL is not drawn below it
    activeR = draw_state(canvas_list[3], COLORS[18], qR, tsfm2, (anim_state == "init") && (drag_flag != 1));
    activeL = draw_state(canvas_list[3], COLORS[13], qL, tsfm2, (anim_state == "init") && (drag_flag != 2) && (!activeR));
    // Need to draw qR again, so that it is on top of qL, as its locus
    activeR = draw_state(canvas_list[3], COLORS[18], qR, tsfm2, (anim_state == "init") && (drag_flag != 1));

    // Set cursor
    if (activeL || activeR) canvas_list[3].style.cursor = "crosshair";
    // Go back to default cursor if not panning
    else if (canvas_list[3].style.cursor == "crosshair") canvas_list[3].style.cursor = "default";
    
}


function map_x(xi, x_zero, x_end) {
    val = x_zero + (x_end-x_zero) * ((xi) / (x_end-x_zero)) ** 2.;
    return val;
}

function compute_locus(which, qs) {
    if (is_vacuum(qs)) return [[[0., 0.]], [[0., 0.]]];

    const sign = (which == 1) ? +1. : -1.;
    const [rho_s, u_s, p_s] = qs;
    const alpha = (G + 1.) / (G - 1.);
    const c = (which == 1) ? c_speeds[0] : c_speeds[3];

    let dx_ref = px_per_step / Math.abs(tsfm2[3]);
    let dx, n_step;
    let v, p;
    
    pts_hugoniot = [];
    pts_integral = []
    
    // Compute Integral curve (rarefaction)
    let p_end = (entropy_fix) ? p_s : q_max[3];
    n_step = Math.max(Math.ceil((p_end - 0.) / dx_ref), 50);
    dx = (p_end - 0.) / n_step;
    for (i = 0; i <= n_step; i++) {
        p = map_x(i * dx, 0., p_end);
        v = u_s + sign * 2. * c / (G - 1.) * (1. - Math.pow(p/p_s, (G-1) / (2*G)));
        pts_integral.push([v, p]);
    }

    // Compute Hugoniot locus (shock)
    let p_start = (entropy_fix) ? p_s : 0.;
    n_step = Math.ceil(Math.abs(q_max[3] - p_start) / dx_ref);
    dx = (q_max[3] - p_start) / n_step;
    for (i = 0; i <= n_step; i++) {
        p = map_x(i * dx, p_start, q_max[3]);  // denser near 0.
        v = u_s - sign * 2. * c / Math.sqrt(2. * G * (G-1)) * (p / p_s - 1.) / Math.sqrt(1. + alpha * p / p_s);
        pts_hugoniot.push([v, p]);
    }

    return [pts_integral, pts_hugoniot];
}

function plot_locus(canvas, tsfm, color, pts_integral, pts_hugoniot) {
    
    let ctx = canvas.getContext("2d");

    ctx.save();
    ctx.lineWidth = 4 * LW;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    // Draw Hugoniot locus (shock)
    ctx.setTransform(...tsfm);
    ctx.beginPath();
    ctx.moveTo(...pts_hugoniot[0]);
    for (i = 0; i < pts_hugoniot.length; i ++) {
        ctx.lineTo(...pts_hugoniot[i]);
    }
    ctx.resetTransform();
    ctx.stroke();

    // Draw Integral curve (rarefaction)
    ctx.setLineDash([5*LW, 5*LW]);
    ctx.setTransform(...tsfm);
    ctx.beginPath();
    ctx.moveTo(...pts_integral[0]);
    for (i = 0; i < pts_integral.length; i ++) {
        ctx.lineTo(...pts_integral[i]);
    }
    ctx.resetTransform();
    ctx.stroke();

    ctx.restore();
}

function draw_state(canvas, color, q, tsfm, intensify=false, middle="") {
    
    if (is_vacuum(q)) return;

    let ctx = canvas.getContext("2d");
    ctx.save();
    ctx.beginPath();
    q_px = [
        tsfm[0] * q[1] + tsfm[2] * q[2] + tsfm[4],
        tsfm[1] * q[1] + tsfm[3] * q[2] + tsfm[5],
    ];
    
    let dist_to_hoover = Math.hypot(q_px[0] - hoover_position_q[0], q_px[1] - hoover_position_q[1]);
    let radius = 1. * dot_state_radius;
    let supersonic = Math.sqrt(G * q[2]/q[0]) < Math.abs(q[1]);

    if ((middle == "left") || (middle == "right")) {
        let sign = (middle == "left") ? -1.: +1.;
        // let 
        if (supersonic) {
            ctx.beginPath();
            ctx.moveTo(q_px[0]-sign/3. + sign * Math.sqrt(2) * radius, q_px[1]);
            ctx.lineTo(q_px[0]-sign/3., q_px[1] + Math.sqrt(2) * radius);
            ctx.lineTo(q_px[0]-sign/3., q_px[1] - Math.sqrt(2) * radius);
            ctx.closePath();
        } else {
            ctx.arc(q_px[0]-sign/3, q_px[1], radius, Math.PI/2., 1.5*Math.PI, middle=="right");
        }
    } else {
        if (supersonic) {
            ctx.translate(q_px[0], q_px[1]);
            ctx.rotate(Math.PI/4);
            ctx.rect(-1.*radius, -1.*radius, 2*radius, 2*radius);
            ctx.resetTransform()
        } else {  // subsonic
            ctx.arc(q_px[0], q_px[1], radius, 0, 2. * Math.PI, true);
        }
    }
    
    let active = (intensify) && (dist_to_hoover < dot_state_radius);
    ctx.fillStyle = (active) ? COLORS[11] : color;

    ctx.fill();
    ctx.restore();
    return active;
}

function draw_limit_state(canvas, color, q, tsfm, sign) {
    let ctx = canvas.getContext("2d");
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    q_px = [
        tsfm[0] * (q[1] + sign * 2 * Math.sqrt(G * q[2]/q[0]) / (G-1)) + tsfm[2] * 0. + tsfm[4],
        tsfm[1] * 0. + tsfm[3] * 0. + tsfm[5],
    ];
    ctx.arc(q_px[0], q_px[1], 0.6*dot_state_radius, 0, 2. * Math.PI, true);
    ctx.fill();
    ctx.restore();
}

function display_middle_state(canvas, mode) {
    let q1_info, q2_info, info, position;
    let ctx = canvas.getContext("2d");

    if (mode == "density") {
        q1_info = (Math.round(100*ql[0])/100).toFixed(2).padStart(4, ' ');
        q2_info = (Math.round(100*qr[0])/100).toFixed(2).padStart(5, ' ');
        info = "\u03C1*l = " + q1_info + "   \u03C1*r = " + q2_info;
        ctx.textAlign = 'right';
        position = [0.97 * canvas.width, 0.03 * canvas.height];
    } else {
        q1_info = (Math.round(100*ql[1])/100).toFixed(2).padStart(4, ' ');
        q2_info = (Math.round(100*ql[2])/100).toFixed(2).padStart(5, ' ');
        if (is_vacuum(ql)) q1_info = " /";
        info = " u* = " + q1_info + "    p* = " + q2_info;
        ctx.textAlign = 'right';
        position = [0.97 * canvas.width, 0.09 * canvas.height];
    }

    ctx.save();
    ctx.font = canvas.width/30 + 'px Fira Mono';
    ctx.fillStyle = COLORS[6];
    ctx.textBaseline = 'top';
    ctx.fillText(info, ...position);
    ctx.restore();
}


///////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////  -  CHARACTERISTICS  -  ///////////////////////////////////

function draw_characteristics(canvas, tsfm, t=0.) {
    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // let colors = ["#4a83ff", "#f08080", "#1a62ff", "#e73232"];
    let colors = [COLORS[17], COLORS[11], COLORS[17]+"60", COLORS[11] + "40"]
    if (active_char[0]) draw_acoustic(ctx, tsfm, 1, colors[0]);
    if (active_char[1]) draw_entropic(ctx, tsfm, COLORS[5]);
    if (active_char[2]) draw_acoustic(ctx, tsfm, 3, colors[1]);

    ctx.save();

    // Draw 1-3-shock and 1-3-rarefaction waves
    for (w = 0; w < 2; w++) {
        let i = (w == 0) ? 0 : 3;
        if (wave_type[w] == "R") {
            ctx.beginPath();
            ctx.setTransform(...tsfm);
            ctx.moveTo(0., 0.);
            ctx.lineTo(duration * speeds[i], duration);
            ctx.lineTo(duration * speeds[i+1], duration);
            ctx.closePath();
            ctx.resetTransform();
            ctx.fillStyle = colors[2+w];
            ctx.fill();
        } else if (wave_type[w] == "S") {
            ctx.lineWidth = 6 * LW;
            ctx.beginPath();
            ctx.setTransform(...tsfm);
            ctx.moveTo(0., 0.);
            ctx.lineTo(1.1*duration * speeds[i], 1.1*duration);
            ctx.resetTransform();
            ctx.strokeStyle = colors[w];
            ctx.stroke();
        }
    }

    // Draw contact wave
    ctx.lineWidth = 6 * LW;
    ctx.beginPath();
    ctx.setTransform(...tsfm);
    ctx.moveTo(0., 0.);
    ctx.lineTo(1.1*duration * speeds[2], 1.1*duration);
    ctx.resetTransform();
    ctx.setLineDash([15*LW, 10*LW]);
    ctx.strokeStyle = COLORS[5];
    ctx.stroke();


    if ((EPS < t) && (t + EPS < duration)) {
        ctx.lineWidth = 5 * LW;
        ctx.setLineDash([]);
        ctx.strokeStyle = COLORS[6] + "80";
        ctx.beginPath();
        ctx.setTransform(...tsfm);
        ctx.moveTo(-x_max, t);
        ctx.lineTo(+x_max, t);
        ctx.resetTransform();
        ctx.stroke();
    }
    ctx.restore();
}

function dist_pt_segment(pp, vv, ww, tsfm) {
    let p = [tsfm[0]*pp[0] + tsfm[4], tsfm[3]*pp[1] + tsfm[5]];
    let v = [tsfm[0]*vv[0] + tsfm[4], tsfm[3]*vv[1] + tsfm[5]];
    let w = [tsfm[0]*ww[0] + tsfm[4], tsfm[3]*ww[1] + tsfm[5]];
    if (p[0] == undefined) return Infinity;
    let l2 = Math.hypot(v[0] - w[0], v[1] - w[1]);
    if (l2 < EPS) return Math.hypot(p[0] - v[0], p[1] - v[1]);
    let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / (l2 * l2);
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (v[0] * (1. - t) + w[0] * t), p[1] - (v[1] * (1. - t) + w[1] * t))
}

function dist_pt_pt(p, q, tsfm) {
    return Math.hypot(tsfm[0]*(p[0] - q[0]), tsfm[3]*(p[1] - q[1]));
}

function draw_acoustic(ctx, tsfm, which, color) {
    
    const normal = 1 * LW;
    const bold =  3. * LW;

    let nc = 15;  // number of characteristics on each side
    let xi_max = 1.5 * x_max;
    let dx = xi_max / nc;
    let xi;

    let ref_dist = 25;  // max nb pixels away from which to highlight the curve
    let min_dist = 2 * ref_dist;  // initialize higher than ref_dist
    let cur_dist, xi_close, kind;
    
    // Draw 1-characteristic or 3-characteristic
    for (side = -1; side <= 1; side += 2) {
        for (i = 0; i < nc; i++) {
            xi = side * (0.5 * dx + Math.floor(i) * dx);
            cur_dist = draw_one_acoustic_char(ctx, tsfm, which, xi, color, normal);
            if (cur_dist < min_dist) {
                min_dist = cur_dist;
                xi_close = xi;
                kind = "classic";
            }
        }
    }

    let wave = (which == 1) ? wave_type[0] : wave_type[1];
    if (wave == "R") {
        // Draw 1-"characteristic" inside 1-fan, or 3-"characteristic" inside 3-fan
        let [sh, st] = (which == 1) ? [speeds[0], speeds[1]] : [speeds[3], speeds[4]];
        let [xa, xb] = [duration * sh, duration * st];
        let T = duration * Math.abs(tsfm[3]) / tsfm[0];
        let [phi, psi] = [Math.atan(xb / T), Math.atan(xa / T)];
        let theta = phi - psi;
        let delta = Math.atan(dx / T);
        nc = Math.floor(theta / (2*delta));

        for (i = -nc; i <= nc; i++) {
            xi = T * Math.tan(psi + theta / 2. + i * delta);
            cur_dist = draw_one_acoustic_fan(ctx, tsfm, which, xi, color, normal);
            if (cur_dist < min_dist) {
                min_dist = cur_dist;
                xi_close = xi;
                kind = "fan";
            }
        }
    }

    // Draw the closest one to the pointer with bold curve
    if ((kind == "classic") && (min_dist < ref_dist)) 
        draw_one_acoustic_char(ctx, tsfm, which, xi_close, color, bold);
    else if ((kind == "fan") && (min_dist < ref_dist))
        draw_one_acoustic_fan(ctx, tsfm, which, xi_close, color, bold); 
    
    return;
}

function draw_entropic(ctx, tsfm, color) {
    const normal = 1 * LW;
    const bold =  3. * LW;

    let nc = 15;  // number of characteristics on each side
    let xi_max = 1.5 * x_max;
    let dx = xi_max / nc;
    let xi;

    let ref_dist = 25;  // max nb pixels away from which to highlight the curve
    let min_dist = 2 * ref_dist;  // initialize higher than ref_dist
    let cur_dist, xi_close, kind;
    
    // Draw 1-characteristic or 3-characteristic
    for (side = -1; side <= 1; side += 2) {
        for (i = 0; i < nc; i++) {
            xi = side * (0.5 * dx + Math.floor(i) * dx);
            cur_dist = draw_one_entropic_char(ctx, tsfm, xi, color, normal);
            if (cur_dist < min_dist) {
                min_dist = cur_dist;
                xi_close = xi;
                kind = "classic";
            }
        }
    }

    // Draw the closest one to the pointer with bold curve
    if ((kind == "classic") && (min_dist < ref_dist)) 
        draw_one_entropic_char(ctx, tsfm, xi_close, color, bold);
    
    return;
}

function draw_one_acoustic_char(ctx, tsfm, which, xi, color, lw) {
    let wave = (which == 1) ? wave_type[0] : wave_type[1];
    let o_wave = (which == 1) ? wave_type[1] : wave_type[0];

    let lbd, sigma, sh, st;
    let dist_to_hoover;
    let [xh, th] = hoover_position_xt;
    let min_dist = Infinity;

    let x, x1, x2, x3, x4;
    let t, t1, t2, t3, t4;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.setTransform(...tsfm);
    ctx.moveTo(xi, 0.);

    // Draw 1-characteristic before 1-shock/1-fan --- or --- 3-characteristic after 3-shock/3-fan
    // Requires non-vacuum left state --- non-vacuum right state
    if (((which == 1) && (xi < 0.) && (!is_vacuum(qL))) || ((which == 3) && (0. < xi) && (!is_vacuum(qR)))) {

        lbd = (which == 1) ? lambdas[0][0] : lambdas[3][2];
        sh = (which == 1) ? speeds[0] : speeds[4];

        // characteristic goes to infinity for rarefaction / collapses for shocks
        t1 = (wave == "R") ? duration : xi / (sh - lbd);
        x1 = xi + lbd * t1;
        
        ctx.lineTo(x1, t1);
        dist_to_hoover = dist_pt_segment(hoover_position_xt, [xi, 0.], [x1, t1], tsfm);
        min_dist = Math.min(min_dist, dist_to_hoover);
        ctx.resetTransform();
        ctx.lineWidth = lw;
        ctx.stroke();
    }

    // Draw 1-characteristic after 1-shock/1-fan --- or --- 3-characteristic before 3-shock/3-fan
    // Requires non-vacuum right state --- non-vacuum left state
    if (((which == 1) && (0. < xi) && (!is_vacuum(qR))) || ((which == 3) && (xi < 0.) && (!is_vacuum(qL)))) {
        
        // 1-characteristic after 3-shock/3-fan or 3-characteristic before 1-shock/1-fan
        [lbd, sh] = (which == 1) ? [lambdas[3][0], speeds[4]] : [lambdas[0][2], speeds[0]];
        t1 = xi / (sh - lbd);
        x1 = sh * t1;
        x1 = xi + lbd * t1;
        ctx.lineTo(x1, t1);
        dist_to_hoover = dist_pt_segment(hoover_position_xt, [xi, 0.], [x1, t1], tsfm);
        min_dist = Math.min(min_dist, dist_to_hoover);

        // 1-characteristic inside 3-fan --- or --- 3-characteristic inside 1-fan
        if (o_wave == "R") {  
            [sh, st] = (which == 1) ? [speeds[4], speeds[3]] : [speeds[0], speeds[1]];
            sigma = (which == 1) ? qR[1] - 2. * c_speeds[3] / (G-1.) : qL[1] + 2. * c_speeds[0] / (G-1.);
            t2 = (is_vacuum(ql)) ? duration : t1 * Math.pow((sigma - sh) / (sigma - st), (G+1.)/(2*(G-1.)));  // Handle vacuum middle state
            t2 = Math.min(duration, t2);  // Clip at maximum time
            n_pts = 100;
            dt = (t2 - t1) / n_pts;
            for (j = 1; j <= n_pts; j++) {
                t = t1 + j * dt;
                x = sigma * t + (sh - sigma) * t1 * Math.pow(t /t1, (3.-G)/(G+1.));
                ctx.lineTo(x, t);
                dist_to_hoover = dist_pt_pt([x, t], [xh, th], tsfm);
                min_dist = Math.min(min_dist, dist_to_hoover);
            }
            x2 = x;  // should be equal to (l3(qr) * t2) or (l1(ql) * t2)
        } else {  // 1-characteristic at 3-shock or 3-characteristic at 1-shock
            t2 = t1;
            x2 = x1;
        }
        
        if (!is_vacuum(ql)) {  // No middle left/ middle right vacuum state
            // 1-characteristic after 2-contact-wave --- or --- 3-characteristic before 2-contact-wave
            [lbd, s] = (which == 1) ? [lambdas[2][0], speeds[2]] : [lambdas[1][2], speeds[2]];
            t3 = (x2 - lbd * t2) / (s - lbd);
            t3 = Math.min(t3, duration*1.1);
            x3 = x2 + lbd * (t3 - t2);
            dist_to_hoover = dist_pt_segment(hoover_position_xt, [x2, t2], [x3, t3], tsfm);
            min_dist = Math.min(min_dist, dist_to_hoover);
            ctx.lineTo(x3, t3);

            // 1-characteristic before 2-contact-wave --- or --- 3-characteristic after 2-contact-wave
            [lbd, s] = (which == 1) ? [lambdas[1][0], speeds[1]] : [lambdas[2][2], speeds[3]];
            t4 = (wave == "R") ? duration : (x3 - lbd * t3) / (s - lbd);
            t4 = Math.min(t4, duration);
            x4 = x3 + lbd * (t4 - t3);
            dist_to_hoover = dist_pt_segment(hoover_position_xt, [x3, t3], [x4, t4], tsfm);
            min_dist = Math.min(min_dist, dist_to_hoover);
            ctx.lineTo(x4, t4);
        }

        ctx.resetTransform();
        ctx.lineWidth = lw;
        ctx.stroke();
    }
    
    ctx.restore();
    return min_dist;
}

function draw_one_acoustic_fan(ctx, tsfm, which, xi, color, lw) {
    let wave = (which == 1) ? wave_type[0] : wave_type[1];
    if (wave != 'R') return;

    ctx.save();
    ctx.strokeStyle = color;
    let dist_to_hoover;
    dist_to_hoover = dist_pt_segment(hoover_position_xt, [0., 0.], [xi, duration], tsfm);
    
    ctx.beginPath();
    ctx.setTransform(...tsfm);
    ctx.moveTo(0., 0.);
    ctx.lineTo(xi, duration);
    ctx.resetTransform();
    ctx.setLineDash([15*LW, 10*LW]);
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.restore();

    return dist_to_hoover;
}

function draw_one_entropic_char(ctx, tsfm, xi, color, lw) {
    
    let side = (xi < 0.) ? -1 : +1;
    let wave = (side == -1) ? wave_type[0] : wave_type[1];
    let lbd, sigma, sh, st;
    let dist_to_hoover;
    let [xh, th] = hoover_position_xt;
    let min_dist = Infinity;

    let x, x1, x2, x3;
    let t, t1, t2, t3;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.setTransform(...tsfm);
    ctx.moveTo(xi, 0.);

    if (((side == -1) && (!is_vacuum(qL))) || ((side == 1) && (!is_vacuum(qR)))) {  // No left/right vacuum state
        lbd = (side == -1) ? lambdas[0][1] : lambdas[3][1];
        s = (side == -1) ? speeds[0] : speeds[4];
        
        t1 = xi / (s - lbd);
        x1 = xi + lbd * t1;
        
        ctx.lineTo(x1, t1);
        dist_to_hoover = dist_pt_segment(hoover_position_xt, [xi, 0.], [x1, t1], tsfm);
        min_dist = Math.min(min_dist, dist_to_hoover);
    }

    if (wave == "R") {  // 2-characteristic inside 1-fan or 3-fan
        [sh, st] = (side == -1) ? [speeds[0], speeds[1]] : [speeds[4], speeds[3]];
        sigma = (side == -1) ? qL[1] + 2. * c_speeds[0] / (G-1) : qR[1] - 2. * c_speeds[3] / (G-1);
        t2 = (is_vacuum(ql)) ? duration : t1 * Math.pow((sigma - sh) / (sigma - st), (G+1.)/(G-1.));  // Handle vacuum middle state
        t2 = Math.min(duration, t2);  // Clip at maximum time
        n_pts = 100;
        dt = (t2 - t1) / n_pts;
        for (j = 1; j <= n_pts; j++) {
            t = t1 + j * dt;
            x = sigma * t + (sh - sigma) * t1 * Math.pow(t /t1, 2./(G+1.));
            ctx.lineTo(x, t);
            dist_to_hoover = dist_pt_pt([x, t], [xh, th], tsfm);
            min_dist = Math.min(min_dist, dist_to_hoover);
        }
        x2 = x;  // should be equal to (l1(ql) * t2) or (l3(qr) * t2)
    } else {  // 2-characteristic at 1-shock or 3-shock
        t2 = t1;
        x2 = x1;
    }

    if (!is_vacuum(ql)) {  // No middle left/ middle right vacuum state
        lbd = (side == -1) ? lambdas[1][1] : lambdas[2][1];
        t3 = duration;
        x3 = x2 + lbd * (t3 - t2);
        dist_to_hoover = dist_pt_segment(hoover_position_xt, [x2, t2], [x3, t3], tsfm);
        min_dist = Math.min(min_dist, dist_to_hoover);
        ctx.lineTo(x3, t3);
    }

    ctx.resetTransform();
    ctx.lineWidth = lw;
    ctx.stroke();
    
    ctx.restore();
    return min_dist;
}


///////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////  -  BACKGROUNDS  -  /////////////////////////////////////

function display_supersonic(canvas, qs, color) {

    function compute_xy(rho, t, d) {
        [xi, yi] = [t, rho * t * t / G];
        xi = tsfm2[0] * xi + tsfm2[4];
        yi = tsfm2[3] * yi + tsfm2[5];
        [nx, ny] = [-2. * rho/G * t, +1.];
        nx = tsfm2[0] * nx;
        ny = tsfm2[3] * ny;
        nx /= Math.hypot(nx, ny);
        ny /= Math.hypot(nx, ny);
        xi -= nx * d;
        yi -= ny * d;
        return [xi, yi];
    }

    function transition_fade(x) {
        k = 2.;
        // return (Math.exp(-k) - Math.exp(-k*x)) / (Math.exp(-k) - 1.);
        return Math.pow(1. - x, 2);
    }

    if (is_vacuum(qs)) return;

    // Show supersonic regions
    let ctx = canvas.getContext("2d");
    let n_layers = 60;
    let dx = px_per_step / tsfm2[0];
    let n_step = Math.ceil((q_max[1] - q_max[0]) / dx);
    dx = (q_max[1] - q_max[0]) / n_step;
    let t, x, y, d;
    
    ctx.save();
    for (layer = 0; layer < n_layers; layer++) {
        d = layer * LW * .5;
        ctx.lineWidth = LW * .5;
        ctx.strokeStyle = color + Math.floor(127 * transition_fade(layer/n_layers)).toString(16).padStart(2, '0');
        ctx.beginPath();
        t = 0.;
        [x, y] = compute_xy(qs[0], t, d);
        ctx.moveTo(x, y);
        for (; x <= canvas.width; t+=dx) {
            [x, y] = compute_xy(qs[0], t, d);
            ctx.lineTo(x, y);
        }
        t = 0.;
        [x, y] = compute_xy(qs[0], t, d);
        ctx.moveTo(x, y);
        for (; 0. <= x; t-=dx) {
            [x, y] = compute_xy(qs[0], t, d);
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.restore();
}

/**
 * 
 */

function set_backgrounds_1(cv1A, cv1B, cv1C) {

    set_background_1(cv1A, tsfm1A, state_labels[0]);
    set_background_1(cv1B, tsfm1B, state_labels[1]);
    set_background_1(cv1C, tsfm1C, state_labels[2]);

}

function set_background_1(canvas, tsfm, label) {
    const ctx = canvas.getContext("2d");
    const h = canvas.height;
    const w = canvas.width;
    const s = origin_shift;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // draw_axes(canvas, ctx, [tsfm[4], tsfm[5]], tsfm[0], -tsfm[3], ["x", label], 1.);
 
    let kwargs = {
        "fontsize": 1. * window.innerWidth / 200.,
        "color": COLORS[5],
        "unit": "",
        "axis": true,
    }
    draw_ext_axes(canvas, ctx, tsfm, "x", ["bottom", true, "x"], kwargs);
    draw_ext_axes(canvas, ctx, tsfm, "x", ["top", false, ""], kwargs);
    draw_ext_axes(canvas, ctx, tsfm, "y", ["left", true, label], kwargs);
    draw_ext_axes(canvas, ctx, tsfm, "y", ["right", false, ""], kwargs);


    // Draw horizontal line of zero velocity
    ctx.save();
    ctx.strokeStyle = COLORS[0];
    ctx.lineWidth = 2. * LW;
    ctx.beginPath();
    ctx.moveTo(0., tsfm[5]);
    ctx.lineTo(cv1B.width, tsfm[5]);
    ctx.stroke();
    ctx.restore();
}

function set_background_2(canvas) {

    const ctx = canvas.getContext("2d");
    const h = canvas.height;
    const w = canvas.width;
    const s = origin_shift;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // draw_axes(canvas, ctx, [w / 2., h * (1 - s)], tsfm2[0], -tsfm2[3], ["u", "p"], 1., COLORS[5]);

    let kwargs = {
        "fontsize": 1. * window.innerWidth / 200.,
        "color": COLORS[5],
        "unit": "",
        "axis": true,
    }
    draw_ext_axes(canvas, ctx, tsfm2, "x", ["bottom", true, "u"], kwargs);
    draw_ext_axes(canvas, ctx, tsfm2, "x", ["top", false, ""], kwargs);
    draw_ext_axes(canvas, ctx, tsfm2, "y", ["left", true, "p"], kwargs);
    draw_ext_axes(canvas, ctx, tsfm2, "y", ["right", false, ""], kwargs);

}

function set_background_3(canvas) {
    const ctx = canvas.getContext("2d");
    const h = canvas.height;
    const w = canvas.width;
    const s = origin_shift;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw_axes(canvas, ctx, [w / 2., h * (1 - s)], tsfm3[0], -tsfm3[3], ["x", "t"], 1., COLORS[5]);
}

function draw_axes(canvas, ctx, origin, dx, dy, labels, k=1., color=COLORS[0]) {
    // dx = length in px of a unit

    var ctx = canvas.getContext("2d");
    var x_axis_starting_point = { number: 1, suffix: ''};
    var y_axis_starting_point = { number: 1, suffix: ''};
    const h = canvas.height;
    const w = canvas.width;
    const fontsize = k * window.innerWidth / 200;
    let base_1, base_2, base_5, base, n_ticks_per_label, delta, sign, label, tick_size;

    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    draw_arrow(ctx, 0., origin[1], w, 0., 3, color);
    draw_arrow(ctx, origin[0], h, 0., -h, 3, color);

    // Ticks marks along the X-axis
    base_1 = 1 * Math.pow(10, Math.ceil(Math.log10(min_pixel_per_unit / (1*dx))));
    base_2 = 2 * Math.pow(10, Math.ceil(Math.log10(min_pixel_per_unit / (2*dx))));
    base_5 = 5 * Math.pow(10, Math.ceil(Math.log10(min_pixel_per_unit / (5*dx))));
    base = Math.min(base_1, base_2, base_5);
    n_ticks_per_label = (base_2 == base) ? 4 : 5;
    delta = base / n_ticks_per_label;    
    let x_pm = [origin[0] - delta*dx, origin[0] + delta*dx];
    
    for(i=1; (w*0.02 < x_pm[0]) || (x_pm[1] < w*0.98); i++, x_pm[0]-=delta*dx, x_pm[1]+=delta*dx) {
        for (j = 0; j < 2; j++) {
            if ((w*0.02 < x_pm[j]) && (x_pm[j] < w*0.98)) {
                sign = (j == 0) ? -1 : 1;
                // Text value at that point
                if ((i % n_ticks_per_label == 0) && (w*0.02 < x_pm[j]) && (x_pm[j] < w*0.95)) {
                    ctx.font = fontsize + 'px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    label = Math.round(sign*i*delta*1e6)/1e6 + x_axis_starting_point.suffix
                    ctx.fillText(label, x_pm[j], origin[1] + h * 0.015);
                    tick_size = 9;
                } else {
                    tick_size = 6;
                }
                ctx.beginPath();
                ctx.lineWidth = 1. * LW;
                // Draw a tick mark
                ctx.moveTo(x_pm[j], origin[1] - tick_size / 2.);
                ctx.lineTo(x_pm[j], origin[1] + tick_size / 2.);
                ctx.stroke();
            }
        }
    }
    
    
    // 1 ticklabel every 5 --> remove intermediary ticks
    // Ticks marks along the Y-axis
    base_1 = 1 * Math.pow(10, Math.ceil(Math.log10(min_pixel_per_unit / (1*dy))));
    base_2 = 2 * Math.pow(10, Math.ceil(Math.log10(min_pixel_per_unit / (2*dy))));
    base_5 = 5 * Math.pow(10, Math.ceil(Math.log10(min_pixel_per_unit / (5*dy))));
    base = Math.min(base_1, base_2, base_5);
    n_ticks_per_label = (base_2 == base) ? 4 : 5;
    delta = base / n_ticks_per_label;
    let y_pm = [origin[1] + delta*dy, origin[1] - delta*dy];
    for(i=1; (h*0.02 < y_pm[1]) || (y_pm[0] < h*0.98); i++) {
        y_pm[0] = origin[1] + i*delta*dy;
        y_pm[1] = origin[1] - i*delta*dy;
        for (j = 0; j < 2; j++) {
            if ((h*0.02 < y_pm[j]) && (y_pm[j] < h*0.98)) {
                sign = (j == 0) ? -1 : 1;
                // Text value at that point
                if ((i % n_ticks_per_label == 0) && (h*0.05 < y_pm[j]) && (y_pm[j] < h*0.98)) {
                    ctx.font = fontsize + 'px Arial';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'middle';
                    label = Math.round(sign*i*delta*1e6)/1e6 + y_axis_starting_point.suffix
                    ctx.fillText(label, origin[0] - w * 0.01, y_pm[j]);
                    tick_size = 8;
                } else {
                    tick_size = 6;
                }
                ctx.beginPath();
                ctx.lineWidth = 1 * LW;
                // Draw a tick mark 6px long (-3 to 3)
                ctx.moveTo(origin[0] - tick_size/2., y_pm[j]);
                ctx.lineTo(origin[0] + tick_size/2., y_pm[j]);
                ctx.stroke();
            }
        }
    }

    // Label axes
    ctx.font = (2. * fontsize) + 'px Arial';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'right';
    ctx.fillText(labels[0], w * 0.975, origin[1] - w * 0.02);  // x-label
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(labels[1], origin[0] + w * 0.02, 0.01 * w);  // y-label

    ctx.restore();
}

function draw_ext_axes(canvas, ctx, tsfm, which, args, kwargs) {
    // dx = length in px of a unit

    var ctx = canvas.getContext("2d");
    const canvas_L = (which == "x") ? canvas.width : canvas.height;
    let [ticks, ticklabels, axis_label] = args;
    
    let [unit_px, shift, sign] = (which == "x") ? [tsfm[0], tsfm[4], 1] : [tsfm[3], tsfm[5], -1];
    let base_1, base_2, base_5, base, n_ticks_per_label, delta, label, tick_size;
    
    ctx.save();
    ctx.fillStyle = kwargs["color"];
    ctx.strokeStyle = kwargs["color"];
    ctx.font = kwargs["fontsize"] + 'px Arial';
    ctx.lineWidth = 1. * LW;

    // Ticks marks along the X-axis
    base_1 = 1 * Math.pow(10, Math.ceil(Math.log10(min_pixel_per_unit / (1*Math.abs(unit_px)))));
    base_2 = 2 * Math.pow(10, Math.ceil(Math.log10(min_pixel_per_unit / (2*Math.abs(unit_px)))));
    base_5 = 5 * Math.pow(10, Math.ceil(Math.log10(min_pixel_per_unit / (5*Math.abs(unit_px)))));
    base = Math.min(base_1, base_2, base_5);
    n_ticks_per_label = (base_2 == base) ? 4 : 5;
    delta = base / n_ticks_per_label;    
    
    let corner_coord = -shift / unit_px;
    let k_start, coord, coords;
    
    // K_start = Math.ceil(corner_coord / base);
    k_start = (which == "x") ? Math.ceil(corner_coord / delta) : Math.floor(corner_coord / delta);

    let positioning;
    if ((which == "x") && (ticks == "top"))    positioning = [            0, +1, "top"   , "center"];
    if ((which == "x") && (ticks == "bottom")) positioning = [canvas.height, -1, "bottom", "center"];
    if ((which == "y") && (ticks == "left"))   positioning = [            0, +1, "middle", "left" ];
    if ((which == "y") && (ticks == "right"))  positioning = [ canvas.width, -1, "middle", "right"  ];
    let [where, dir, txt_v, txt_h] = positioning;

    for(i=k_start; shift + i * delta * unit_px <= canvas_L; i += sign) {
        coord = shift + i * delta * unit_px;

        // Text value at that point
        if ((i % n_ticks_per_label == 0) && (0.02 * canvas_L < coord) && (coord < canvas_L * 0.98)) {
            ctx.textAlign = txt_h;
            ctx.textBaseline = txt_v;
            label = Math.round(i * delta * 1e6) / 1e6 + kwargs["unit"];
            tick_size = 7;
            coords = (which == "x") ? [coord, where + dir*tick_size] : [where + 1.25*dir*tick_size, coord];
            if (ticklabels) ctx.fillText(label, coords[0], coords[1]);
        } else {
            tick_size = 4;
        }
        ctx.beginPath();
        coords = (which == "x") ? [coord, where] : [where, coord];
        ctx.moveTo(...coords);
        coords = (which == "x") ? [coord, where + dir*tick_size] : [where + dir*tick_size, coord];
        ctx.lineTo(...coords);
        ctx.stroke();
    }

    // Label axes
    ctx.font = (2.5 * kwargs["fontsize"]) + 'px Arial';
    if ((which == "x") && (ticks == "bottom")) {
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(axis_label, canvas.width * 0.98, canvas.height * 0.98);
    } else if ((which == "y") && (ticks == "left")) {
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(axis_label, canvas.width * 0.015, canvas.height * 0.02);
    }

    ctx.strokeStyle = COLORS[0];
    ctx.lineWidth = 2. * LW;
    ctx.beginPath();
    if (which == "x") {
        ctx.moveTo(0., tsfm[5]);
        ctx.lineTo(canvas.width, tsfm[5]);
    } else {
        ctx.moveTo(tsfm[4], 0.);
        ctx.lineTo(tsfm[4], canvas.height);
    }
    ctx.stroke();

    ctx.restore();
}

function draw_arrow(ctx, fromx, fromy, dx, dy, max_width, color=COLORS[4]) {
    var tox = fromx + dx;
    var toy = fromy + dy;
    var angle = Math.PI * (1. - 1./9.);
    var norm = Math.hypot(dx, dy);
    
    dx = dx / norm * Math.min(20, norm * 0.5);
    dy = dy / norm * Math.min(20, norm * 0.5);
    P = [tox, toy];
    Q = [tox + Math.cos(angle) * dx + Math.sin(angle) * dy, toy - Math.sin(angle) * dx + Math.cos(angle) * dy];
    R = [tox + Math.cos(angle) * dx - Math.sin(angle) * dy, toy + Math.sin(angle) * dx + Math.cos(angle) * dy];

    ctx.save();

    ctx.lineWidth = Math.min(norm/10, max_width) * LW;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox - dx / 2, toy - dy / 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(P[0], P[1]);
    ctx.lineTo(Q[0], Q[1]);
    ctx.bezierCurveTo(tox - 0.7 * dx, toy - dy * 0.7, tox - dx * 0.7, toy - dy * 0.7, R[0], R[1]);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
}
