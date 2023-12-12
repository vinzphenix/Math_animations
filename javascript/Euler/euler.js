// Layout parameters
const LW = window.innerWidth / 2000;  // line width
const ORANGE = "#fa7e19";
const BLUE = "#2d70b3";
const RED = "#c74440";
const GREEN = "#388c46";
const COLORS = [
    "#2e3440", "#3b4252", "#434c5e", "#4c566a", 
    "#d8dee9", "#e5e9f0", "#eceff4", 
    "#8fbcbb", "#88c0d0", "#81a1c1", "#5e81ac",
    "#bf616a", "#d08770", "#ebcb8b", "#a3be8c", "#b48ead",
    "#76c783", "#4a83ff", "#8194ff",
]

const origin_shift = 0.05;  // percentage of width
const min_pixel_per_unit = 50;
const dot_state_radius = 10 * LW;  // same as locus dot size
const px_per_step = 10;  // discretization of curves
const n_speed_lines = 20;  // number of speed lines
const GRAVITY = 9.81;

let G = 1.4;
let G1 = (G + 1.)/(G - 1);
let G2 = 2. * G / (G - 1.);
let G3 = 2. * G * (G - 1.);

let x_max = 8.;
let y_max;
let qq_max = [0., 1., -1., 1., 0., 1.];
let q_max = [-20., 20., 0., 40.];  // [q1, q2] max values
let f_max = [0.5*GRAVITY**1.5, 2*GRAVITY**2];  // [q1, q2] max values
let px_grid_size_x;  // nb of px
let px_grid_size_y;  // nb of px

let tsfm1A, tsfm1B, tsfm1C, tsfm2, tsfm3;

// Interaction parameters
let active_char = [true, true, true];
let entropy_fix = true;
let drag_flag = -1;
let hoover_position_q = [-1., 0.];
let hoover_position_xt = [0., -1.];

// Animation parameters
let anim_state = "init";  // init, play, pause, end
let last_clock = null;
let last_t = 0.;
let duration = 1.;
let speedup = 0.5;
let x_speed_lines = [];

// State parameters
let qL = [1., +2., 20.];  // left state
let qR = [2., -3., 12.];  // right state
let ql = [0., +0., 0.];  // middle left state (just for initialization)
let qr = [0., +0., 0.];  // middle right state (just for initialization)

let f_LF = [0., 0.];  // Lax-Friedrichs flux

let c_speeds = [0., 0., 0., 0.];
let lambdas = [[0., 0., 0.], [0., 0., 0.], [0., 0., 0.], [0., 0., 0.]];
let speeds = [0., 0., 0., 0.];
let wave_type = ["R", "R"];
const EPS = 1.e-14;

function main(canvas_axes, canvas_list) {
    [cv1A, cv1B, cv1C, cv2, cv3] = canvas_list;

    // y_max = canvas1.height * (2. * x_max) / canvas1.width * GRAVITY;
    tsfm1A = [
        cv1A.width / (2. * x_max), 0.,
        0., -cv1A.height/(qq_max[1] - qq_max[0]) * (1. - origin_shift),
        cv1A.width / 2., cv1A.height * (1. - origin_shift),
    ];
    tsfm1B = [
        cv1B.width / (2. * x_max), 0., 
        0., -cv1B.height / (qq_max[3] - qq_max[2]) * (1. - origin_shift),
        cv1B.width / 2., cv1B.height * (1. - origin_shift) * (qq_max[3]) / (qq_max[3] - qq_max[2]),
    ];
    tsfm1C = [
        cv1C.width / (2. * x_max), 0., 
        0., -cv1C.height / (qq_max[5] - qq_max[4]) * (1. - origin_shift),
        cv1C.width / 2., cv1C.height * (1. - origin_shift),
    ];
    

    tsfm2 = [
        cv2.width / (q_max[1] - q_max[0]), 0.,
        0., -cv2.height / (q_max[3] - q_max[2]) * (1. - origin_shift), 
        cv2.width / 2., cv2.height * (1. - origin_shift),
    ];
    tsfm3 = [
        cv3.width / (2. * x_max), 0., 
        0., -cv3.height / (duration) * (1. - origin_shift),
        cv3.width / 2., cv3.height * (1. - origin_shift),
    ];

    set_backgrounds_1(canvas_axes[0], canvas_axes[1], canvas_axes[2])
    set_background_2(canvas_axes[3]);
    set_background_3(canvas_axes[4]);

    handle_inputs(canvas_axes, canvas_list);  // Handle input interactions
    update_all_plots(canvas_list);  // Initial figure display
}

function handle_play_pause() {
    if ((anim_state == "init") || (anim_state == "end")) {
        anim_state = "play";
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

function init_non_vacuum(q) {
    q[0] = 1.;
    q[2] = 1.;
}

function handle_state_inputs(canvas_list, this_q, next_q, this_id) {
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
        }
    );
}

function handle_inputs(canvas_axes, canvas_list) {

    const canvas2 = canvas_list[3];
    const canvas3 = canvas_list[4];
    const canvas3_axes = canvas_axes[4];

    // Drag and drop left and right states in state space
    canvas2.addEventListener('mousedown', function(e){
        if (anim_state == "init") mouse_select_state(e, tsfm2);
    });
    canvas2.addEventListener('mousemove', function(e){
        if (anim_state == "init") mouse_move_state(e, canvas_list);
    });
    canvas2.addEventListener('mouseup', (e) => {
        drag_flag = -1;
    });
    canvas2.addEventListener('mouseout', (e) => {
        hoover_position_q[1] = -1;
    });
    
    // Display hoovered characteristics as bold
    canvas3.addEventListener('mousemove', function(e){
        mouse_move_hoover_char(e, canvas3);
    });
    canvas3.addEventListener('mouseout', (e) => {
        mouse_move_hoover_char(e, canvas3, reset=true);
    });

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
                set_background_3(canvas_axes[4]);
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
                set_backgrounds_1(canvas_axes[0], canvas_axes[1], canvas_axes[2]);
                set_background_3(canvas_axes[4]);
                draw_characteristics(canvas3, tsfm3);
                setup_animation();
            } else {
                this.value = x_max;
            }
        }
    );

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

    // Handle play/pause switch
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

    // Left density input
    handle_state_inputs(canvas_list, qL, qR, "qL");
    handle_state_inputs(canvas_list, qR, qL, "qR");

    // Handle with characteristics to display
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
    
    // Apply or not entropy condition
    document.getElementById("entropy").checked = entropy_fix;
    document.getElementById("entropy").addEventListener(
        'input', function (e) {
            entropy_fix = this.checked;
            draw_loci(canvas2, tsfm2, canvas4, tsfm4);
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

        if (Math.hypot(qs[0] - x, qs[1] - y) < 1.5*dot_state_radius) {
            drag_flag = i + 1;  // 1 or 2
        }
    }
}

function mouse_move_state(event, canvas_list) {
    
    function set_new_state(x, y, q, id) {
        base_x = Math.pow(10, 4 - Math.floor(Math.log10(q_max[1] - q_max[0])));
        base_y = Math.pow(10, 4 - Math.floor(Math.log10(q_max[3] - q_max[2])));
        q[1] = Math.round(x * base_x) / base_x;
        q[2] = Math.round(y * base_y) / base_y;
        document.getElementById(id + 1).value = q[1];
        document.getElementById(id + 2).value = q[2];
    }

    if (drag_flag != -1) {
        let x = event.offsetX - tsfm2[4];
        let y = event.offsetY - tsfm2[5];

        if ((y > 0.)) return;
        
        // Transform from back to state space
        det = 1. / (tsfm2[0] * tsfm2[3] - tsfm2[1] * tsfm2[2]);
        new_x = det * (+tsfm2[3] * x - tsfm2[2] * y);
        new_y = det * (-tsfm2[1] * x + tsfm2[0] * y);
        
        if (drag_flag == 1) set_new_state(new_x, new_y, qL, "qL");
        else set_new_state(new_x, new_y, qR, "qR");
        
        update_all_plots(canvas_list);
    }

    let x = event.offsetX;
    let y = event.offsetY;
    if (y > tsfm2[5]) return;
    hoover_position_q[0] = x;
    hoover_position_q[1] = y;
    draw_loci(canvas_list[3], tsfm2);
}

function mouse_move_hoover_char(event, canvas, reset=false) {
    let x = event.offsetX - tsfm3[4];
    let y = event.offsetY - tsfm3[5];
    if (y > 0.) return;
    det = 1. / (tsfm3[0] * tsfm3[3] - tsfm3[1] * tsfm3[2]);
    hoover_position_xt[0] = det * (+tsfm3[3] * x - tsfm3[2] * y);
    hoover_position_xt[1] = det * (-tsfm3[1] * x + tsfm3[0] * y);
    if (reset) hoover_position_xt[1] = -10.;
    draw_characteristics(canvas, tsfm3, last_t);
}

/**
 * At most one of two states is vacuum
 * Vacuum states are characterized by "undefined" velocity
 */
function update_all_plots(canvas_list) {
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

    // setup_animation();
}

function compute_state(x, t, flag="") {    
    let xi, h, u;
    if ((flag == "R1") || ((t * speeds[0] <= x) && (x <= t * speeds[1]))) { // 1-rarefaction (1-shock not possible as speeds[0]==speeds[1])
        xi = x / t;
        h = ((qL[1]/qL[0] + 2. * Math.sqrt(qL[0])) / 3. - xi / 3) ** 2 / 1.;
        u = (qL[1]/qL[0] + 2. * Math.sqrt(qL[0])) / 3. + 2. * xi / 3.;
        return [h, h*u]
    } else if ((flag == "R2") || ((t * speeds[2] <= x) && (x <= t * speeds[3]))) {  // 2-rarefaction (2-shock not possible as speeds[2]==speeds[3])
        xi = x / t;
        h = ((qR[1]/qR[0] - 2. * Math.sqrt(qR[0])) / 3. - xi / 3.) ** 2 / 1.;
        u = (qR[1]/qR[0] - 2. * Math.sqrt(qR[0])) / 3. + 2. * xi / 3.;
        return [h, h*u]
    }
    else if (x < t * speeds[0]) {  // left state
        return qL;
    } else if ((t * speeds[1] < x) && (x < t * speeds[2])) {  // middle state
        return qm; 
    } else {  // right state
        return qR;
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

function set_state_speeds(q, which) {
    if (is_vacuum(q)) {
        c_speeds[which] = undefined;
        lambdas[which] = [undefined, undefined, undefined];        
    } else {
        c_speeds[which] = Math.sqrt(G * q[2] / q[0]);
        lambdas[which] = [q[1] - c_speeds[which], q[1], q[1] + c_speeds[which]];
    }
}

function set_vaccum(q) {
    q[0] = 0.;
    q[1] = undefined;
    q[2] = 0.;
}

function is_vacuum(q) {
    return q[1] == undefined;
}

/**
 * 
 */
function setup_animation() {
    return;
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext("2d");        
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set vertical lines that depict the fluid velocity
    x_speed_lines.length = 0;
    for (i = 0; i < 2 * n_speed_lines + 2; i++) {
        x_speed_lines.push(-2.*x_max + 4. * x_max * i / (2. * n_speed_lines + 1.));
    }
    
    const canvas_xt = document.getElementById('canvas3');
    draw_physics([0., 0., 0., 0.], [], []);
    draw_characteristics(canvas_xt, tsfm3, 0.);

    let velocity;
    let velocities = [qL[1]/qL[0], qR[1]/qR[0]];
    for (v = 0; v < 2; v++) {
        velocity = velocities[v] * x_max / 10.;
        sign = (v == 0) ? -1. : 1.;
        // color = (v == 0) ? BLUE : ORANGE;
        color = (v == 0) ? COLORS[13] : COLORS[18];
        draw_arrow(
            ctx, 
            tsfm1[0] * (sign * x_max/2. - velocity/2.) + tsfm1[4],
            tsfm1[3] * y_max/2. + tsfm1[5], 
            tsfm1[0] * velocity, 
            0.,
            window.innerWidth/50,
            color
        );
    }
}

/**
 * CORE OF THE ANIMATION
 */
function animate(current_clock) {
    return;

    const canvas = document.getElementById('canvas1');
    const canvas_xt = document.getElementById('canvas3');
    const button = document.querySelector(".btn");
    
    let t = last_t;
    if (anim_state == "play") t += (current_clock - last_clock) * 1e-3 * speedup;

    if (duration < t) {
        anim_state = "end";
        t = duration;
    }

    // Update t range
    document.getElementById("range_t").value = t;
    document.getElementById("text_t").innerText = "t = " + (Math.round(100*t)/100).toFixed(2).padStart(4, ' ');
    
    // Do the plots !
    [positions, pts_1_wave, pts_2_wave] = compute_transitions_curves(t);
    draw_physics(positions, pts_1_wave, pts_2_wave);
    color_waves(pts_1_wave, pts_2_wave);
    draw_speed_lines(t);
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

function compute_transitions_curves(t) {
    const positions = [speeds[0] * t, speeds[1] * t, speeds[2] * t, speeds[3] * t];
    const dx_ref = px_per_step / tsfm1[0];
    let dx, n_step;
    
    let pts_1_wave = [[positions[0], qL[0]]];
    let pts_2_wave = [[positions[2], qm[0]]];
    if ((wave_type[0] == "R") && (EPS < t)) {  // Left rarefaction
        n_step = Math.ceil((positions[1] - positions[0]) / dx_ref);
        dx = (positions[1] - positions[0]) / n_step;
        let q1, q2;
        for (i = 1; i <= n_step; i++) {
            x = positions[0] + i * dx;
            [q1, q2] = compute_state(x, t, flag="R1");
            pts_1_wave.push([x, q1]);
        }
    } else {  // Left shock
        pts_1_wave.push([positions[1], qm[0]]);
    }
    
    if ((wave_type[1] == "R") && (EPS < t)) {  // Right rarefaction
        n_step = Math.ceil((positions[3] - positions[2]) / dx_ref);
        dx = (positions[3] - positions[2]) / n_step;
        for (i = 1; i <= n_step; i++) {
            x = positions[2] + i * dx;
            [q1, q2] = compute_state(x, t, flag="R2");
            pts_2_wave.push([x, q1]);
        }
    } else {  // Right shock
        pts_2_wave.push([positions[3], qR[0]]);
    }
    
    return [positions, pts_1_wave, pts_2_wave];
}

function draw_physics(positions, pts_1_wave, pts_2_wave) {
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.setTransform(...tsfm1);
    // ctx.fillStyle = "#5e8cd1";
    ctx.fillStyle = COLORS[10];

    ctx.beginPath();
    ctx.moveTo(-x_max, qL[0]);
    
    // Draw left state
    ctx.lineTo(positions[0], qL[0]);

    // Draw left wave
    for (i = 1; i < pts_1_wave.length; i++) {
        ctx.lineTo(pts_1_wave[i][0], pts_1_wave[i][1]);
    }

    // Draw middle state
    ctx.lineTo(positions[2], qm[0]);
    
    // Draw right wave
    for (i = 1; i < pts_2_wave.length; i++) {
        ctx.lineTo(pts_2_wave[i][0], pts_2_wave[i][1]);
    }
    ctx.lineTo(positions[3], qR[0]);
    
    
    // Draw right state
    ctx.lineTo(x_max, qR[0]);

    // Fill the area
    ctx.lineTo(x_max, 0.);
    ctx.lineTo(-x_max, 0.);
    ctx.closePath();
    ctx.fill();

    ctx.resetTransform();
    ctx.restore();
}

function color_waves(pts_1_wave, pts_2_wave) {
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext("2d");
    
    ctx.save();
    let pts_wave = [pts_1_wave, pts_2_wave];

    for (w = 0; w < 2; w++) {
        ctx.setTransform(...tsfm1);
        ctx.beginPath();
        ctx.moveTo(pts_wave[w][0][0], pts_wave[w][0][1]);
        for (i = 1; i < pts_wave[w].length; i++) {
            ctx.lineTo(pts_wave[w][i][0], pts_wave[w][i][1]);
        }
        ctx.lineTo(pts_wave[w][pts_wave[w].length-1][0], 0.);
        if (wave_type[w] == "R") {
            ctx.lineTo(pts_wave[w][0][0], 0.);
            ctx.closePath();
            ctx.resetTransform();
            // ctx.fillStyle = "#ffffff80";
            ctx.fillStyle = COLORS[5] + "80";
            ctx.fill();
        } else {
            ctx.resetTransform();
            ctx.lineWidth = 5 + LW;
            // ctx.strokeStyle = "#000000";
            ctx.strokeStyle = COLORS[6];
            ctx.stroke();
        }
    }
    ctx.restore();
}

function draw_speed_lines(t) {
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext("2d");

    ctx.save();
    ctx.lineWidth = 1. * LW;
    // ctx.strokeStyle = "#535353";
    ctx.strokeStyle = COLORS[9];

    for (i = 0; i < x_speed_lines.length; i++) {
        // RK2
        [q1, q2] = compute_state(x_speed_lines[i], last_t);
        x_mid_rk2 = x_speed_lines[i] + 0.5 * (t - last_t) * compute_u([q1, q2]);
        [q1, q2] = compute_state(x_mid_rk2, 0.5 * (last_t + t));
        x_speed_lines[i] += (t - last_t) * compute_u([q1, q2]);

        // trick for 1 px width
        ctx.beginPath();
        ctx.moveTo(Math.round(tsfm1[0] * x_speed_lines[i] + tsfm1[4]-0.5)+0.5, tsfm1[5]+0.5);
        ctx.lineTo(Math.round(tsfm1[0] * x_speed_lines[i] + tsfm1[4]-0.5)+0.5, Math.round(tsfm1[3] * q1 + tsfm1[5]) + 0.5);
        ctx.stroke();
    }
    ctx.restore();
}

/**
 * 
 */

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

function draw_loci(canvas, tsfm) {
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    [pts_1_integral, pts_1_hugoniot] = compute_locus(1, qL);
    [pts_2_integral, pts_2_hugoniot] = compute_locus(3, qR);

    display_supersonic(canvas.getContext("2d"), qL, COLORS[13]);
    display_supersonic(canvas.getContext("2d"), qR, COLORS[18]);
    display_supersonic(canvas.getContext("2d"), ql, COLORS[5]);
    display_supersonic(canvas.getContext("2d"), qr, COLORS[5]);

    plot_locus(canvas, tsfm, COLORS[13], pts_1_integral, pts_1_hugoniot);
    plot_locus(canvas, tsfm, COLORS[18], pts_2_integral, pts_2_hugoniot);
    draw_state(canvas, COLORS[13], qL, tsfm, true);
    draw_state(canvas, COLORS[18], qR, tsfm, true);
    draw_state(canvas, COLORS[6], ql, tsfm, false, "left");
    draw_state(canvas, COLORS[6], qr, tsfm, false, "right");
    draw_limit_state(canvas, COLORS[13], qL, tsfm, +1.);
    draw_limit_state(canvas, COLORS[18], qR, tsfm, -1.);
    display_middle_state(canvas, "density");
    display_middle_state(canvas, "others");

    /*
    canvas_flux.getContext("2d").clearRect(0, 0, canvas_flux.width, canvas_flux.height);

    // Map the loci from (q1, q2) domain to the flux domain (f1, f2)
    curves = [pts_1_hugoniot, pts_1_integral, pts_2_hugoniot, pts_2_integral]
    for (c = 0; c < curves.length; c++) {
        for (i = 0; i < curves[c].length; i++) {
            curves[c][i] = compute_flux(curves[c][i]);
        }
    }
    plot_locus(canvas_flux, tsfm_flux, COLORS[13], pts_1_integral, pts_1_hugoniot);
    plot_locus(canvas_flux, tsfm_flux, COLORS[18], pts_2_integral, pts_2_hugoniot);
    draw_state(canvas_flux, COLORS[13], compute_flux(qL), tsfm_flux);
    draw_state(canvas_flux, COLORS[18], compute_flux(qR), tsfm_flux);
    draw_state(canvas_flux, COLORS[6], compute_flux(qm), tsfm_flux);

    // Compute approximate Lax-Friedrichs flux
    [l1l, l2l] = [lambdas[0], lambdas[1]];
    [l1r, l2r] = [lambdas[4], lambdas[5]];
    let max_eig = Math.max(Math.abs(l1l), Math.abs(l2l), Math.abs(l2l), Math.abs(l2r));
    let f_ql = compute_flux(qL);
    let f_qr = compute_flux(qR);
    f_LF = [
        0.5 * (f_ql[0] + f_qr[0]) - 0.5 * max_eig * (qR[0] - qL[0]),
        0.5 * (f_ql[1] + f_qr[1]) - 0.5 * max_eig * (qR[1] - qL[1]),
    ];
    draw_state(canvas_flux, COLORS[0], f_LF, tsfm_flux);*/
}


function map_x(xi, x_zero, x_end) {
    return x_zero + (x_end-x_zero) * (Math.sqrt((xi / (x_end-x_zero))**2 + 1.) - 1.) / (Math.sqrt(2) - 1);
}

function compute_locus(which, qs) {
    if (is_vacuum(qs)) return [[[0., 0.]], [[0., 0.]]];

    const sign = (which == 1) ? +1. : -1.;
    const [rho_s, u_s, p_s] = qs;
    const alpha = (G + 1.) / (G - 1.);
    const c = (which == 1) ? c_speeds[0] : c_speeds[3];

    let dx_ref = px_per_step / tsfm2[0];
    let dx, n_step;
    let v, p;
    
    pts_hugoniot = [];
    pts_integral = []
    
    // Compute Integral curve (rarefaction)
    let p_end = (entropy_fix) ? p_s : q_max[3];
    n_step = Math.ceil((p_end - 0.) / dx_ref);
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
    ctx.setLineDash([10*LW, 10*LW]);
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
    ctx.fillStyle = color;
    ctx.beginPath();
    q_px = [
        tsfm[0] * q[1] + tsfm[2] * q[2] + tsfm[4],
        tsfm[1] * q[1] + tsfm[3] * q[2] + tsfm[5],
    ];
    
    let dist_to_hoover = Math.hypot(q_px[0] - hoover_position_q[0], q_px[1] - hoover_position_q[1]);
    let current_radius = ((intensify) && (dist_to_hoover < 2. * dot_state_radius)) ? 1.5 * dot_state_radius : dot_state_radius;
    let supersonic = Math.sqrt(G * q[2]/q[0]) < Math.abs(q[1]);

    if ((middle == "left") || (middle == "right")) {
        let sign = (middle == "left") ? -1.: +1.;
        // let 
        if (supersonic) {
            ctx.beginPath();
            ctx.moveTo(q_px[0]-sign/3. + sign * Math.sqrt(2) * current_radius, q_px[1]);
            ctx.lineTo(q_px[0]-sign/3., q_px[1] + Math.sqrt(2) * current_radius);
            ctx.lineTo(q_px[0]-sign/3., q_px[1] - Math.sqrt(2) * current_radius);
            ctx.closePath();
        } else {
            ctx.arc(q_px[0]-sign/3, q_px[1], current_radius, Math.PI/2., 1.5*Math.PI, middle=="right");
        }
    } else {
        if (supersonic) {
            ctx.translate(q_px[0], q_px[1]);
            ctx.rotate(Math.PI/4);
            ctx.rect(-1.*current_radius, -1.*current_radius, 2*current_radius, 2*current_radius);
            ctx.resetTransform()
        } else {  // subsonic
            ctx.arc(q_px[0], q_px[1], current_radius, 0, 2. * Math.PI, true);
        }
    }
    ctx.fill();
    ctx.restore();
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
    ctx.arc(q_px[0], q_px[1], 0.75*dot_state_radius, 0, 2. * Math.PI, true);
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
        ctx.textAlign = 'left';
        position = 0.01 * canvas.width;
    } else {
        q1_info = (Math.round(100*ql[1])/100).toFixed(2).padStart(4, ' ');
        q2_info = (Math.round(100*ql[2])/100).toFixed(2).padStart(5, ' ');
        if (is_vacuum(ql)) q1_info = " /";
        info = " u* = " + q1_info + "    p* = " + q2_info;
        ctx.textAlign = 'right';
        position = 0.99 * canvas.width;
    }

    ctx.save();
    ctx.font = canvas.width/30 + 'px Fira Mono';
    ctx.fillStyle = COLORS[6];
    ctx.textBaseline = 'top';
    ctx.fillText(info, position, 0.01*canvas.height);
    ctx.restore();
}

function draw_characteristics(canvas, tsfm, t=0.) {
    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // let colors = ["#4a83ff", "#f08080", "#1a62ff", "#e73232"];
    let colors = [COLORS[17], COLORS[11], COLORS[17]+"60", COLORS[11] + "40"]
    if (active_char[0]) draw_acoustic(ctx, tsfm, 1, colors[0]);
    if (active_char[1]) draw_entropic(ctx, tsfm, -1, COLORS[5]);
    if (active_char[1]) draw_entropic(ctx, tsfm, +1, COLORS[5]);
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
        // ctx.strokeStyle = "#999999b0";
        ctx.strokeStyle = COLORS[4];
        ctx.beginPath();
        ctx.setTransform(...tsfm);
        ctx.moveTo(-x_max, t);
        ctx.lineTo(+x_max, t);
        ctx.resetTransform();
        ctx.stroke();
    }
    ctx.restore();
}

function dist_pt_segment(p, v, w) {
    let l2 = Math.hypot(v[0] - w[0], v[1] - w[1]);
    if (l2 < EPS) return Math.hypot(p[0] - v[0], p[1] - v[1]);
    let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / (l2 * l2);
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (v[0] * (1. - t) + w[0] * t), p[1] - (v[1] * (1. - t) + w[1] * t))
}

function draw_entropic(ctx, tsfm, side, color) {
    [l1l, l2l, l1m, l2m, l1r, l2r] = lambdas;
    let w1 = qL[1]/qL[0] + 2.*Math.sqrt(qL[0]);
    let w2 = qR[1]/qR[0] - 2.*Math.sqrt(qR[0]);
    let wave = (side == -1) ? wave_type[0] : wave_type[1];
    
    const normal = 1 * LW;
    const bold =  3. * LW;

    let nc = 15;  // number of characteristics
    let xi_max = 1.5 * x_max;
    let dx = xi_max / nc;
    let n_pts;  // Discretization of nonlinear characteristics
    let xi, x, t, x1, t1, x2, t2, x3, t3, w;
    
    let dist_to_hoover, ref_dist, flag_close;
    let [xh, th] = hoover_position_xt;

    ctx.save();
    ctx.strokeStyle = color;

    // Draw 2-characteristic before 1-shock/1-fan, or 2-characteristic after 3-shock/3-fan
    let lbd, sigma, sh, st;
    let s = (side == -1) ? speeds[0] : speeds[4];

    for (i = 0; i < nc; i++) {
        ctx.beginPath();
        ctx.setTransform(...tsfm);
        flag_close = false;

        xi = side * (0.5 * dx + i * dx);
        ctx.moveTo(xi, 0.);

        if (((side == -1) && (!is_vacuum(qL))) || ((side == 1) && (!is_vacuum(qR)))) {  // No left/right vacuum state
            lbd = (side == -1) ? lambdas[0][1] : lambdas[3][1];
            ref_dist = 0.33 * (xi_max / nc) / Math.hypot(1., lbd);
            
            t1 = xi / (s - lbd);
            x1 = xi + lbd * t1;
            
            ctx.lineTo(x1, t1);
            dist_to_hoover = dist_pt_segment(hoover_position_xt, [xi, 0.], [x1, t1]);
            if ((0 <= side * (xh - s * th)) && (dist_to_hoover < ref_dist)) flag_close = true;
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
                if (Math.hypot(xh - x, th - t) < ref_dist) flag_close = true;
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
            ctx.lineTo(x3, t3);
            if (wave == "S")
                ref_dist = 0.33  * dx * ((speeds[0] - lbd)/(speeds[0] - lambdas[0][1])) / Math.hypot(1., lbd);
            if (wave == "S")
                ref_dist = 0.33  * dx * ((speeds[4] - lbd)/(speeds[4] - lambdas[3][1])) / Math.hypot(1., lbd);
            dist_to_hoover = dist_pt_segment(hoover_position_xt, [x2, t2], [x3, t3]);
            if ((speeds[1] * th <= xh) && (xh <= speeds[3]*th) && (dist_to_hoover < ref_dist)) flag_close = true;
        }

        ctx.resetTransform();
        ctx.lineWidth = flag_close ? bold : normal;
        ctx.stroke();   
    }

    ctx.restore();
}

function draw_acoustic(ctx, tsfm, which, color) {

    [l1l, l2l, l1m, l2m, l1r, l2r] = lambdas;
    let w1 = qL[1]/qL[0] + 2.*Math.sqrt(qL[0]);
    let w2 = qR[1]/qR[0] - 2.*Math.sqrt(qR[0]);
    let sign = (which == 1) ? -1. : +1.;
    let wave = (which == 1) ? wave_type[0] : wave_type[1];
    let o_wave = (which == 1) ? wave_type[1] : wave_type[0];
    
    const normal = 1 * LW;
    const bold =  3. * LW;

    let nc = 15;  // number of characteristics
    let xi_max = 1.5 * x_max;
    let dx = xi_max / nc;
    let n_pts;  // Discretization of nonlinear characteristics
    let xi, x, t, x1, t1, x2, t2, x3, t3, w;
    
    let dist_to_hoover, ref_dist, flag_close;
    let [xh, th] = hoover_position_xt;

    ctx.save();
    ctx.strokeStyle = color;

    let lbd, sigma, sh, st;

    // Draw 1-characteristic before 1-shock/1-fan, or 3-characteristic after 3-shock/3-fan
    lbd = (which == 1) ? lambdas[0][0] : lambdas[3][2];
    sh = (which == 1) ? speeds[0] : speeds[4];
    ref_dist = 0.33 * (xi_max / nc) / Math.hypot(1., lbd);
        
    if (((which == 1) && (!is_vacuum(qL))) || ((which == 3) && (!is_vacuum(qR)))) {  // No left/right dry state
        for (i = 0; i < nc; i++) {
            xi = sign * (0.5 * dx + i * dx);
            // characteristic goes to infinity for rarefaction / collapses for shocks
            t1 = (wave == "R") ? duration : xi / (sh - lbd);
            x1 = xi + lbd * t1;
            
            ctx.beginPath();
            ctx.setTransform(...tsfm);
            ctx.moveTo(xi, 0.);
            ctx.lineTo(x1, t1);
            ctx.resetTransform();
            dist_to_hoover = dist_pt_segment(hoover_position_xt, [xi, 0.], [x1, t1]);
            ctx.lineWidth = ((0 <= sign * (xh - sh * th)) && (dist_to_hoover < ref_dist)) ? bold : normal;
            ctx.stroke();
        }
    }

    // Draw 1-characteristic after 1-shock/1-fan, or 2-characteristic before 2-shock/2-fan    
    if (((which == 1) && (!is_vacuum(qR))) || ((which == 3) && (!is_vacuum(qL)))) {
        for (i = 0; i < nc; i++) {
            
            flag_close = false;
            ctx.beginPath();
            ctx.setTransform(...tsfm);

            xi = -sign * (0.5 * dx + i * dx);
            ctx.moveTo(xi, 0.);
            
            // 1-characteristic after 3-shock/3-fan or 3-characteristic before 1-shock/1-fan
            [lbd, sh] = (which == 1) ? [lambdas[3][0], speeds[4]] : [lambdas[0][2], speeds[0]];
            t1 = xi / (sh - lbd);
            x1 = sh * t1;
            ctx.lineTo(x1, t1);
            ref_dist = 0.33 * dx / Math.hypot(1., lbd);
            dist_to_hoover = dist_pt_segment(hoover_position_xt, [xi, 0.], [x1, t1]);
            if ((dist_to_hoover < ref_dist) && (sign * (xh - sh * th) <= 0)) flag_close = true;


            if (o_wave == "R") {  // 1-characteristic inside 2-fan or 2-characteristic inside 1-fan
                [sh, st] = (which == 1) ? [speeds[4], speeds[3]] : [speeds[0], speeds[1]];
                if (which == 1) 
                    sigma = qR[1] - 2. * c_speeds[3] / (G-1.);
                else 
                    sigma = qL[1] + 2. * c_speeds[0] / (G-1.);
                t2 = (is_vacuum(ql)) ? duration : t1 * Math.pow((sigma - sh) / (sigma - st), (G+1.)/(2*(G-1.)));  // Handle vacuum middle state
                t2 = Math.min(duration, t2);  // Clip at maximum time
                n_pts = 100;
                dt = (t2 - t1) / n_pts;
                for (j = 1; j <= n_pts; j++) {
                    t = t1 + j * dt;
                    x = sigma * t + (sh - sigma) * t1 * Math.pow(t /t1, (3.-G)/(G+1.));
                    ctx.lineTo(x, t);
                    if (Math.hypot(xh - x, th - t) < ref_dist) flag_close = true;
                    console.log(Math.hypot(xh - x, th - t), 0.33*dx, lambdas[0][2], ref_dist, flag_close);
                }
                x2 = x;  // should be equal to (l3(qr) * t2) or (l1(ql) * t2)
            } else {  // 1-characteristic at 3-shock or 3-characteristic at 1-shock
                t2 = t1;
                x2 = x1;
            }

            ctx.resetTransform();
            ctx.lineWidth = flag_close ? bold : normal;
            ctx.stroke();
            continue;

            // 1-characteristic after 1-shock/1-fan or 2-characteristic before 2-shock/2-fan
            [lbd, s] = (which == 1) ? [lambdas[2], speeds[1]] : [lambdas[3], speeds[2]];
            t3 = (wave_type[which - 1] == "R") ? duration*1.1 : (lbd * t2 - x2) / (lbd - s);
            t3 = Math.min(t3, duration*1.1);
            // Characteristics not collapsing into the shock before Tend - and the ones collapsing
            x3 = (duration < t3) ? x2 + lbd * (t3 - t2) : x2 + lbd * (t2 * s - x2) / (lbd - s);
            ctx.lineTo(x3, t3);
            // Unusefully complicated formula to compute the shrinking of the space btw characteristics when crossing shock
            if ((which == 1) && (wave_type[1] == "S")) 
                ref_dist = 0.33  * dx * ((speeds[2] - lbd)/(speeds[2] - l1r)) / Math.hypot(1., lbd);
            if ((which == 2) && (wave_type[0] == "S")) 
                ref_dist = 0.33  * dx * ((speeds[1] - lbd)/(speeds[1] - l2l)) / Math.hypot(1., lbd);
            dist_to_hoover = dist_pt_segment(hoover_position_xt, [x2, t2], [x3, t3]);
            if ((speeds[1] * th <= xh) && (xh <= speeds[2]*th) && (dist_to_hoover < ref_dist)) flag_close = true;

            ctx.resetTransform();
            ctx.lineWidth = flag_close ? bold : normal;
            ctx.stroke();
        }
    }

    // Draw 1-characteristic inside 1-fan, or 3-characteristic inside 3-fan
    [sh, st] = (which == 1) ? [speeds[0], speeds[1]] : [speeds[3], speeds[4]];
    let [xa, xb] = [duration * sh, duration * st];
    ref_dist = 0.40 * (xi_max / nc) * th / duration;
    if ((wave == 'R')) {
        nc = 1 + 2 * Math.floor((xb - xa) / (2. * dx));
        xi = 0.5 * (xa + xb);
        for (i = 0; i < nc; i++) {
            ctx.beginPath();
            ctx.setTransform(...tsfm);
            ctx.moveTo(0., 0.);
            ctx.lineTo(xi, duration);
            ctx.resetTransform();
            ctx.setLineDash([15*LW, 10*LW]);
            dist_to_hoover = dist_pt_segment(hoover_position_xt, [0., 0.], [xi, duration]) * Math.sqrt(1+(xi/duration)**2);
            ctx.lineWidth = ((xa * th/duration <= xh) && (xh <= xb * th/duration) && (dist_to_hoover < ref_dist)) ? bold : normal;
            ctx.stroke()
            xi += (i+1) * dx * (2*(i%2) - 1);  // 0, -1, 1, -2, 2 ... 
        }
    }

    ctx.restore();
}

function display_supersonic(ctx, qs, color) {

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
        t = q_max[0];
        [x, y] = compute_xy(qs[0], t, d);
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (; t <= q_max[1]; t+=dx) {
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
    set_background_1(cv1A, tsfm1A, "\u03C1");
    set_background_1(cv1B, tsfm1B, "u");
    set_background_1(cv1C, tsfm1C, "p");
}

function set_background_1(canvas, tsfm, label) {
    const ctx = canvas.getContext("2d");
    const h = canvas.height;
    const w = canvas.width;
    const s = origin_shift;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw_axes(canvas, ctx, [tsfm[4], tsfm[5]], tsfm[0], -tsfm[3], ["x", label], 1., COLORS[4]);
}

function set_background_2(canvas) {

    const ctx = canvas.getContext("2d");
    const h = canvas.height;
    const w = canvas.width;
    const s = origin_shift;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw_axes(canvas, ctx, [w / 2., h * (1 - s)], tsfm2[0], -tsfm2[3], ["u", "p"], 1., COLORS[4]);
}

function set_background_3(canvas) {
    const ctx = canvas.getContext("2d");
    const h = canvas.height;
    const w = canvas.width;
    const s = origin_shift;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw_axes(canvas, ctx, [w / 2., h * (1 - s)], tsfm3[0], -tsfm3[3], ["x", "t"], 1., COLORS[4]);
}

function draw_axes(canvas, ctx, origin, dx, dy, labels, k=1., color=COLORS[4]) {
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
                ctx.lineWidth = 1 * LW;
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
