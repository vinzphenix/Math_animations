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
const GRAVITY = 10.;

let x_max = 8.;
let y_max;
let q_max = [7.*GRAVITY, 4.*GRAVITY**1.5];  // [q1, q2] max values
let f_max = [7.*GRAVITY**1.5, 20.5*GRAVITY**2];  // [q1, q2] max values
let px_grid_size_x;  // nb of px
let px_grid_size_y;  // nb of px

let tsfm1, tsfm2, tsfm3, tsfm4;

// Interaction parameters
let active_char = [true, true];
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
let ql = [GRAVITY * 5., 0. * GRAVITY];  // left state
let qr = [GRAVITY * 3., 0. * GRAVITY];  // right state
let qm = [GRAVITY * 0., 0. * GRAVITY];  // middle state (just for initialization)

let f_LF = [0., 0.];  // Lax-Friedrichs flux

let lambdas = [0., 0., 0., 0., 0., 0.];
let speeds = [0., 0., 0., 0.];
let wave_type = ["", ""];
const EPS = 1.e-10;

// phi = G (H)
// u phi = G (Hu)

// H  = phi/G
// Hu = u phi / G

// q2
// q2^2/q1 + 0.5*q1^2

// G (H u)
// G (H u u + 0.5 GHH)

// Hu
// Hu^2 + 0.5 gh^2

// phi = qmax --> end

function main(canvas1A, canvas1, canvas2A, canvas2, canvas3A, canvas3, canvas4A, canvas4) {

    y_max = canvas1.height * (2. * x_max) / canvas1.width * GRAVITY;
    tsfm1 = [
        canvas1.width / (2. * x_max), 0.,
        0., -canvas1.height/y_max,
        canvas1.width/2., canvas1.height,
    ];
    tsfm3 = [
        canvas3.width / (2. * x_max), 0., 
        0., -canvas3.height * (1. - origin_shift) / duration,
        canvas3.width/2., canvas3.height * (1. - origin_shift),
    ];

    tsfm2 = [
        canvas2.width * (1. - origin_shift) / q_max[0], 0.,
        0., -canvas2.height / (2. * q_max[1]), 
        canvas2.width * origin_shift, canvas2.height / 2.,
    ];
    tsfm4 = [
        canvas4.width / (2 * f_max[0]), 0., 
        0., -canvas4.height * (1. - origin_shift) / f_max[1], 
        canvas4.width / 2., canvas4.height * (1. - origin_shift),
    ];

    set_background_1(canvas1A);
    set_background_2(canvas2A);
    set_background_3(canvas3A);
    set_background_4(canvas4A);

    handle_inputs(canvas1, canvas2, canvas3, canvas4, canvas3A);  // Handle input interactions
    update_all_plots(canvas2, canvas3, canvas4);  // Initial figure display
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

function handle_inputs(canvas1, canvas2, canvas3, canvas4, canvas3A) {

    // Drag and drop left and right states in state space
    canvas2.addEventListener('mousedown', function(e){
        if (anim_state == "init") mouse_select_state(e, tsfm2);
    });
    canvas2.addEventListener('mousemove', function(e){
        if (anim_state == "init") mouse_move_state(e, canvas2, canvas3, canvas4);
    });
    canvas2.addEventListener('mouseup', (e) => {
        drag_flag = -1;
    });
    canvas2.addEventListener('mouseout', (e) => {
        hoover_position_q[0] = -1;
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
                set_background_3(canvas3A);
                draw_characteristics(canvas3, tsfm3, 0.);
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
                tsfm1[0] *= x_max / value;
                tsfm3[0] *= x_max / value;
                tsfm1[3] *= x_max / value;
                x_max = value;
                y_max = canvas1.height * (2. * x_max) / canvas1.width * GRAVITY;
                set_background_1(canvas1A);
                set_background_3(canvas3A);
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

    // Left height input
    document.getElementById("phi_L").value = ql[0] / GRAVITY;
    document.getElementById("phi_L").addEventListener(
        'keypress', function (e){
            if (e.key === 'Enter') this.blur();
        }
    );
    document.getElementById("phi_L").addEventListener(
        'blur', function (e){
            if (anim_state != "init") {
                this.value = ql[0] / GRAVITY;
                return;
            }
            // this.value = Math.min(Math.max(0., this.value), q_max[0]);
            this.value = Math.max(0., this.value);
            if ((qr[0] < EPS) && (this.value < EPS)) this.value = ql[0] / GRAVITY;
            else ql[0] = Number(this.value) * GRAVITY;
            if (ql[0] < EPS) ql[1] = 0.;
            document.getElementById("u_L").value = ql[1] / GRAVITY;
            update_all_plots(canvas2, canvas3, canvas4);
        }
    );

    // Left mass flux input
    document.getElementById("u_L").value = ql[1] / GRAVITY;
    document.getElementById("u_L").addEventListener(
        'keypress', function (e){
            if (e.key === 'Enter') this.blur();
        }
    );
    document.getElementById("u_L").addEventListener(
        'blur', function (e){
            if (anim_state != "init") {
                this.value = ql[1] / GRAVITY;
                return;
            }
            // this.value = Math.max(-q_max[1], Math.min(this.value, q_max[1]));
            if (ql[0] < EPS) this.value = 0.;
            ql[1] = Number(this.value) * GRAVITY;
            update_all_plots(canvas2, canvas3, canvas4);
        }
    );
    
    // Right height input
    document.getElementById("phi_R").value = qr[0] / GRAVITY;
    document.getElementById("phi_R").addEventListener(
        'keypress', function (e){
            if (e.key === 'Enter') this.blur();
        }
    );
    document.getElementById("phi_R").addEventListener(
        'blur', function (e){
            if (anim_state != "init") {
                this.value = qr[0] / GRAVITY;
                return;
            }
            // this.value = Math.min(Math.max(0., this.value), q_max[0]);
            this.value = Math.max(0., this.value);
            if ((ql[0] < EPS) && (this.value < EPS)) this.value = qr[0] / GRAVITY;
            else qr[0] = Number(this.value) * GRAVITY;
            if (qr[0] < EPS) qr[1] = 0.;
            document.getElementById("u_R").value = qr[1] / GRAVITY;
            update_all_plots(canvas2, canvas3, canvas4);
        }
    );

    // Right mass flux input
    document.getElementById("u_R").value = qr[1] / GRAVITY;
    document.getElementById("u_R").addEventListener(
        'keypress', function (e){
            if (e.key === 'Enter') this.blur();
        }
    );
    document.getElementById("u_R").addEventListener(
        'blur', function (e){
            if (anim_state != "init") {
                this.value = qr[1] / GRAVITY;
                return;
            }
            // this.value = Math.max(-q_max[1], Math.min(this.value, q_max[1]));
            if (qr[0] < EPS) this.value = 0.;
            qr[1] = Number(this.value) * GRAVITY;
            update_all_plots(canvas2, canvas3, canvas4);
        }
    );

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
    q_list = [ql, qr];  // list of list

    for (i = 0; i < 2; i++) {
        qs = [
            tsfm[0] * q_list[i][0] + tsfm[2] * q_list[i][1] + tsfm[4],
            tsfm[1] * q_list[i][0] + tsfm[3] * q_list[i][1] + tsfm[5],
        ];

        if (Math.hypot(qs[0] - x, qs[1] - y) < 1.5*dot_state_radius) {
            drag_flag = i + 1;  // 1 or 2
        }
    }
}

function mouse_move_state(event, canvas, canvas_xt, canvas_flux) {
    if (drag_flag != -1) {
        let x = event.offsetX - tsfm2[4];
        let y = event.offsetY - tsfm2[5];

        if ((x < 0.) || (canvas.width <= event.offsetX)) return;
        
        // Transform from back to state space
        det = 1. / (tsfm2[0] * tsfm2[3] - tsfm2[1] * tsfm2[2]);
        new_x = det * (+tsfm2[3] * x - tsfm2[2] * y);
        new_y = det * (-tsfm2[1] * x + tsfm2[0] * y);
        
        if (drag_flag == 1) {
            ql[0] = new_x;
            ql[1] = new_y;
            document.getElementById("phi_L").value = Math.round(ql[0] / GRAVITY * 100) / 100;
            document.getElementById("u_L").value = Math.round(ql[1] / GRAVITY * 100) / 100;
        } else {
            qr[0] = new_x;
            qr[1] = new_y;
            document.getElementById("phi_R").value = Math.round(qr[0] / GRAVITY * 100) / 100;
            document.getElementById("u_R").value = Math.round(qr[1] / GRAVITY * 100) / 100;
        }
        
        update_all_plots(canvas, canvas_xt, canvas_flux);
    }

    let x = event.offsetX;
    let y = event.offsetY;
    if (x < tsfm2[4]) return;
    hoover_position_q[0] = x;
    hoover_position_q[1] = y;
    draw_loci(canvas2, tsfm2, canvas4, tsfm4);
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

function update_all_plots(canvas_q, canvas_xt, canvas_f) {
    res = find_middle_state(ql, qr);
    qm[0] = res[0];
    qm[1] = res[1];
        
    [l1l, l2l] = compute_eigs(ql);
    [l1r, l2r] = compute_eigs(qr);
    if ((qm[0] < EPS) && (Math.abs(qm[1]) < EPS)) {  // dry state
        l1m = compute_u(ql) + 2. * Math.sqrt(ql[0]);
        l2m = compute_u(qr) - 2. * Math.sqrt(qr[0]);
        if (ql[0] < EPS) l1l = l1m = l2m - 1;
        if (qr[0] < EPS) l2m = l2r = l1m + 1;
    } else {
        [l1m, l2m] = compute_eigs(qm);
    }
    lambdas[0] = l1l; lambdas[1] = l2l;
    lambdas[2] = l1m; lambdas[3] = l2m; 
    lambdas[4] = l1r; lambdas[5] = l2r;

    speeds[0] = l1l; speeds[1] = l1m;
    speeds[2] = l2m; speeds[3] = l2r;
    if (l1l > l1m) speeds[0] = speeds[1] = compute_s(1);  // 1-shock
    if (l2m > l2r) speeds[2] = speeds[3] = compute_s(2);  // 2-shock

    wave_type[0] = (l1l <= l1m) ? "R" : "S";
    wave_type[1] = (l2m <= l2r) ? "R" : "S";

    draw_loci(canvas_q, tsfm2, canvas_f, tsfm4);
    draw_characteristics(canvas_xt, tsfm3);

    setup_animation();
}

function compute_state(x, t, flag="") {    
    let xi, h, u;
    if ((flag == "R1") || ((t * speeds[0] <= x) && (x <= t * speeds[1]))) { // 1-rarefaction (1-shock not possible as speeds[0]==speeds[1])
        xi = x / t;
        h = ((ql[1]/ql[0] + 2. * Math.sqrt(ql[0])) / 3. - xi / 3) ** 2 / 1.;
        u = (ql[1]/ql[0] + 2. * Math.sqrt(ql[0])) / 3. + 2. * xi / 3.;
        return [h, h*u]
    } else if ((flag == "R2") || ((t * speeds[2] <= x) && (x <= t * speeds[3]))) {  // 2-rarefaction (2-shock not possible as speeds[2]==speeds[3])
        xi = x / t;
        h = ((qr[1]/qr[0] - 2. * Math.sqrt(qr[0])) / 3. - xi / 3.) ** 2 / 1.;
        u = (qr[1]/qr[0] - 2. * Math.sqrt(qr[0])) / 3. + 2. * xi / 3.;
        return [h, h*u]
    }
    else if (x < t * speeds[0]) {  // left state
        return ql;
    } else if ((t * speeds[1] < x) && (x < t * speeds[2])) {  // middle state
        return qm; 
    } else {  // right state
        return qr;
    }
}

function compute_flux(q) {
    [q1, q2] = q;
    if ((q1 < EPS) && (Math.abs(q2) < EPS)) return [0., 0.];
    else return [q2, q2 * q2 / q1 + 0.5 * q1 * q1];
}

function compute_eigs(q) {
    [q1, q2] = q;
    if ((q1 < EPS) && (Math.abs(q2) < EPS)) return [0., 0.];
    else return [q2/q1 - Math.sqrt(q1), q2/q1 + Math.sqrt(q1),];
}

function compute_s(which) {
    if (which == 1) {
        return ql[1]/ql[0] - Math.sqrt(qm[0]/2 * (1+ qm[0]/qm[0]));
    } else {
        return qr[1]/qr[0] + Math.sqrt(qm[0]/2 * (1+ qm[0]/qr[0]));
    }
}

function compute_u(qs) {
    return (EPS < qs[0]) ? qs[1]/qs[0] : 0.;
}

/**
 * 
 */
function setup_animation() {
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
    let velocities = [ql[1]/ql[0], qr[1]/qr[0]];
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
    
    let pts_1_wave = [[positions[0], ql[0]]];
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
        pts_2_wave.push([positions[3], qr[0]]);
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
    ctx.moveTo(-x_max, ql[0]);
    
    // Draw left state
    ctx.lineTo(positions[0], ql[0]);

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
    ctx.lineTo(positions[3], qr[0]);
    
    
    // Draw right state
    ctx.lineTo(x_max, qr[0]);

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

function find_middle_state(ql, qr) {
    /**
     * Bissection method to find middle state
     */

    function f1(x) {
        if (x < ql[0]) return x * ql[1]/ql[0] + 2. * x * (Math.sqrt(ql[0]) - Math.sqrt(x));  // 1-integral curve
        else return x * ql[1]/ql[0] - (x - ql[0]) * (Math.sqrt(0.5 * x * (1. + x / ql[0])));  // 1-hugoniot locus
    }
    function f2(x) {
        if (x < qr[0]) return x * qr[1]/qr[0] - 2. * x * (Math.sqrt(qr[0]) - Math.sqrt(x));  // 2-integral curve
        else return x * qr[1]/qr[0] + (x - qr[0]) * (Math.sqrt(0.5 * x * (1. + x / qr[0])));  // 2-hugoniot locus
    }
    function f(x) {
        return f1(x) - f2(x);
    }
    function df(x) {
        res = ql[1]/ql[0] - qr[1]/qr[0];
        
        if (x < ql[0]) res += +2. * Math.sqrt(ql[0]) - 3. * Math.sqrt(x);
        else res += -0.5 * (4. * x * x + ql[0] * x - ql[0] * ql[0]) / Math.sqrt(2. * x * ql[0] * (ql[0] + x));
        
        if (x < qr[0]) res -= -(2. * Math.sqrt(qr[0]) - 3. * Math.sqrt(x));
        else res -= +0.5 * (4. * x * x + qr[0] * x - qr[0] * qr[0]) / Math.sqrt(2. * x * qr[0] * (qr[0] + x));
        
        return res;
    }

    // Handle dry states
    if (
        (ql[0] < EPS && Math.abs(ql[1]) < EPS) || 
        (qr[0] < EPS && Math.abs(qr[1]) < EPS) ||
        (ql[1]/ql[0] + 2. * Math.sqrt(ql[0]) < qr[1]/qr[0] - 2. * Math.sqrt(qr[0])) 
        ) {
            // console.log("Middle state is dry !");
            return [0., 0.];
    }

    let fl = f(ql[0]);
    let fr = f(qr[0]);
    let x;
    let tol = 1.e-6;
    let delta = 2. * tol;
    let n = 0;
    let max_iter = 20;

    // Initialize x in a smart way
    if (fl * fr < 0.) {  // RS or SR
        x = Math.max(ql[0], qr[0]);
    } else if (fl < 0.){  // RR (analytic solution)
        x = (ql[1]/ql[0] - qr[1]/qr[0] + 2. * (Math.sqrt(ql[0]) + Math.sqrt(qr[0]))) ** 2 / 16.;
        return [x, f1(x)];
    } else {  // SS
        x = (ql[1]/ql[0] - qr[1]/qr[0]) * Math.sqrt(2) / (1./Math.sqrt(ql[0]) + 1./Math.sqrt(qr[0]));
        x = Math.max(x, ql[0], qr[0]);
    }

    // Do Newton steps
    while ((n < max_iter) && (tol < Math.abs(delta))) {
        delta = f(x) / df(x);
        x -= delta;
        n ++;
    }
    
    return [x, f1(x)];
}

function draw_loci(canvas, tsfm, canvas_flux, tsfm_flux) {
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    canvas_flux.getContext("2d").clearRect(0, 0, canvas_flux.width, canvas_flux.height);

    [pts_1_integral, pts_1_hugoniot] = compute_locus(1, ql);
    [pts_2_integral, pts_2_hugoniot] = compute_locus(2, qr);

    plot_locus(canvas, tsfm, COLORS[13], pts_1_integral, pts_1_hugoniot);
    plot_locus(canvas, tsfm, COLORS[18], pts_2_integral, pts_2_hugoniot);
    draw_state(canvas, COLORS[13], ql, tsfm, 1);
    draw_state(canvas, COLORS[18], qr, tsfm, 1);
    draw_state(canvas, COLORS[6], qm, tsfm);
    display_middle_state(canvas);

    // Map the loci from (q1, q2) domain to the flux domain (f1, f2)
    curves = [pts_1_hugoniot, pts_1_integral, pts_2_hugoniot, pts_2_integral]
    for (c = 0; c < curves.length; c++) {
        for (i = 0; i < curves[c].length; i++) {
            curves[c][i] = compute_flux(curves[c][i]);
        }
    }
    plot_locus(canvas_flux, tsfm_flux, COLORS[13], pts_1_integral, pts_1_hugoniot);
    plot_locus(canvas_flux, tsfm_flux, COLORS[18], pts_2_integral, pts_2_hugoniot);
    draw_state(canvas_flux, COLORS[13], compute_flux(ql), tsfm_flux);
    draw_state(canvas_flux, COLORS[18], compute_flux(qr), tsfm_flux);
    draw_state(canvas_flux, COLORS[6], compute_flux(qm), tsfm_flux);

    // Compute approximate Lax-Friedrichs flux
    [l1l, l2l] = [lambdas[0], lambdas[1]];
    [l1r, l2r] = [lambdas[4], lambdas[5]];
    let max_eig = Math.max(Math.abs(l1l), Math.abs(l2l), Math.abs(l2l), Math.abs(l2r));
    let f_ql = compute_flux(ql);
    let f_qr = compute_flux(qr);
    f_LF = [
        0.5 * (f_ql[0] + f_qr[0]) - 0.5 * max_eig * (qr[0] - ql[0]),
        0.5 * (f_ql[1] + f_qr[1]) - 0.5 * max_eig * (qr[1] - qr[1]),
    ];
    draw_state(canvas_flux, COLORS[0], f_LF, tsfm_flux);
}


function map_x(xi, x_zero, x_end) {
    return x_zero + (x_end-x_zero) * (Math.sqrt((xi / (x_end-x_zero))**2 + 1.) - 1.) / (Math.sqrt(2) - 1);
}

function compute_locus(which, qs) {
    if ((qs[0] < EPS) && (Math.abs(qs[1]) < EPS)) {
        return [[[0., 0.]], [[0., 0.]]];
    }

    const sign = (which == 1) ? +1. : -1.;
    let dx_ref = px_per_step / tsfm2[0];
    let dx, n_step;
    
    pts_hugoniot = [];
    pts_integral = []
    
    // Compute Integral curve (rarefaction)
    let x_end = (entropy_fix) ? qs[0] : q_max[0];
    n_step = Math.ceil((x_end - 0.) / dx_ref);
    dx = (x_end - 0.) / n_step;
    for (i = 0; i <= n_step; i++) {
        x = map_x(i * dx, EPS, x_end);
        y = x * qs[1] / qs[0] + sign * 2. * x * (Math.sqrt(qs[0]) - Math.sqrt(x));
        pts_integral.push([x, y]);
    }

    // Compute Hugoniot locus (shock)
    let x_start = (entropy_fix) ? qs[0] : EPS;
    n_step = Math.ceil(Math.abs(q_max[0] - x_start) / dx_ref);
    dx = (q_max[0] - x_start) / n_step;
    for (i = 0; i <= n_step; i ++) {
        x = map_x(i * dx, x_start, q_max[0]);  // denser near 0.
        y = x * qs[1] / qs[0] - sign * (x - qs[0]) * Math.sqrt(0.5 * x * (1. + x / qs[0]));
        pts_hugoniot.push([x, y]);
    }
    
    return [pts_integral, pts_hugoniot];
}

function plot_locus(canvas, tsfm, color, pts_integral, pts_hugoniot) {
    
    let ctx = canvas.getContext("2d");

    ctx.save();
    ctx.lineWidth = 2 * LW;
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

function draw_state(canvas, color, q, tsfm, intensify=0) {
    // Draw dot for state q
    let ctx = canvas.getContext("2d");
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    q_px = [
        tsfm[0] * q[0] + tsfm[2] * q[1] + tsfm[4],
        tsfm[1] * q[0] + tsfm[3] * q[1] + tsfm[5],
    ];

    let dist_to_hoover = Math.hypot(q_px[0] - hoover_position_q[0], q_px[1] - hoover_position_q[1]);
    if ((intensify) && (dist_to_hoover < 2. * dot_state_radius)) {
        ctx.translate(q_px[0], q_px[1]);
        ctx.rotate(Math.PI/4);
        ctx.rect(-1.5*dot_state_radius, -1.5*dot_state_radius, 3*dot_state_radius, 3*dot_state_radius);
        ctx.resetTransform()
    } else {
        ctx.arc(q_px[0], q_px[1], dot_state_radius, 0, 2. * Math.PI, true);
    }
    ctx.fill();
    ctx.restore();
}

function display_middle_state(canvas) {
    let q1_info = (Math.round(100*qm[0]/GRAVITY)/100).toFixed(2).padStart(4, ' ');
    let q2_info = (Math.round(100*qm[1]/GRAVITY)/100).toFixed(2).padStart(5, ' ');
    // let info = "\u03C6M = " + q1_info + "   u\u03C6M = " + q2_info; 
    let info = "hM = " + q1_info + "   huM = " + q2_info; 
    let ctx = canvas.getContext("2d");
    // console.log("Middle state :  " + qm[0]/GRAVITY + "  " + qm[1]/GRAVITY);
    // console.log(ql[0], qr[0]);

    ctx.save();
    ctx.font = canvas.width/30 + 'px Fira Mono';
    ctx.fillStyle = COLORS[6];
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(info, 0.99*canvas.width, 0.99*canvas.height);
    ctx.restore();
}

function draw_characteristics(canvas, tsfm, t=0.) {
    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // let colors = ["#4a83ff", "#f08080", "#1a62ff", "#e73232"];
    let colors = [COLORS[17], COLORS[11], COLORS[17]+"60", COLORS[11] + "40"]
    if (active_char[0]) draw_characteristic(ctx, tsfm, 1, colors[0]);
    if (active_char[1]) draw_characteristic(ctx, tsfm, 2, colors[1]);

    ctx.save();

    // Draw shock and rarefaction waves
    ctx.moveTo(0., 0.);
    for (w = 0; w < 2; w++) {
        if (wave_type[w] == "R") {
            ctx.beginPath();
            ctx.setTransform(...tsfm);
            ctx.moveTo(0., 0.);
            for (i = 2*w; i < 2*w+2; i++) {
                ctx.lineTo(duration * speeds[i], duration);
            }
            ctx.closePath();
            ctx.resetTransform();
            ctx.fillStyle = colors[2+w];
            ctx.fill();
        } else {
            ctx.lineWidth = 6 * LW;
            ctx.beginPath();
            ctx.setTransform(...tsfm);
            ctx.moveTo(0., 0.);
            ctx.lineTo(1.1*duration * speeds[2*w], 1.1*duration);
            ctx.resetTransform();
            ctx.strokeStyle = colors[w];
            ctx.stroke();
        }
    }

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

function draw_characteristic(ctx, tsfm, which, color) {

    [l1l, l2l, l1m, l2m, l1r, l2r] = lambdas;
    let w1 = ql[1]/ql[0] + 2.*Math.sqrt(ql[0]);
    let w2 = qr[1]/qr[0] - 2.*Math.sqrt(qr[0]);
    let sign = (which == 1) ? -1. : +1.;
    
    const normal = 1 * LW;
    const bold =  3. * LW;

    let nc = 15;  // number of characteristics
    let xi_max = 1.5 * x_max;
    let dx = xi_max / nc;
    let n_pts;  // Discretization of nonlinear characteristics
    let xi, x, t, x1, t1, x2, t2, x3, t3, w;
    
    let dist_to_hoover, ref_dist;
    let [xh, th] = hoover_position_xt;

    ctx.save();
    ctx.strokeStyle = color;

    // Draw 1-characteristic before 1-shock/1-fan, or 2-characteristic after 2-shock/2-fan
    let lbd = (which == 1) ? lambdas[0] : lambdas[5];
    let s = (which == 1) ? speeds[0] : speeds[3];
    ref_dist = 0.33 * (xi_max / nc) / Math.hypot(1., lbd);

    if (EPS < ql[0] * (which == 1) + qr[0] * (which == 2)) {  // No left/right dry state
        for (i = 0; i < nc; i++) {
            xi = sign * (0.5 * dx + i * dx);
            // characteristic goes to infinity for rarefaction / collapses for shocks
            t1 = (wave_type[which-1] == "R") ? duration : xi / (s - lbd);
            x1 = xi + lbd * t1;
            
            ctx.beginPath();
            ctx.setTransform(...tsfm);
            ctx.moveTo(xi, 0.);
            ctx.lineTo(x1, t1);
            ctx.resetTransform();
            dist_to_hoover = dist_pt_segment(hoover_position_xt, [xi, 0.], [x1, t1]);
            ctx.lineWidth = ((0 <= sign * (xh - s * th)) && (dist_to_hoover < ref_dist)) ? bold : normal;
            ctx.stroke();
        }
    }

    // Draw 1-characteristic after 1-shock/1-fan, or 2-characteristic before 2-shock/2-fan
    ref_dist = 0.33 * (xi_max / nc) / Math.hypot(1., (which == 1) ? lambdas[4] : lambdas[1]);
    
    if (EPS < qr[0] * (which == 1) + ql[0] * (which == 2)) {  // No left/right dry state
        for (i = 0; i < nc; i++) {
            
            let flag_close = false;
            ctx.beginPath();
            ctx.setTransform(...tsfm);

            xi = -sign * (0.5 * dx + i * dx);
            ctx.moveTo(xi, 0.);
            
            // 1-characteristic after 2-shock/2-fan or 2-characteristic before 1-shock/1-fan
            [lbd, s] = (which == 1) ? [lambdas[4], speeds[3]] : [lambdas[1], speeds[0]];
            t1 = xi / (s - lbd);
            x1 = s * t1;
            ctx.lineTo(x1, t1);
            if (dist_pt_segment(hoover_position_xt, [xi, 0.], [x1, t1]) < ref_dist) flag_close = true;

            if (wave_type[3-which - 1] == "R") {  // 1-characteristic inside 2-fan or 2-characteristic inside 1-fan
                [lbd, w] = (which == 1) ? [l2m, w2] : [l1m, w1];
                t2 = (EPS < qm[0]) ? ((x1 - w*t1) / (lbd - w))**1.5 / Math.sqrt(t1) : duration;  // Handle dry middle state
                t2 = Math.min(duration, t2);  // Clip at maximum time
                n_pts = 100;
                dt = (t2 - t1) / n_pts;
                for (j = 1; j <= n_pts; j++) {
                    t = t1 + j * dt;
                    x = (x1 - w * t1) * Math.cbrt(t / t1) + w * t;
                    ctx.lineTo(x, t);
                    if (Math.hypot(xh - x, th - t) < ref_dist) flag_close = true;
                }
                x2 = x;  // should be equal to (l2m * t2) or (l1m * t2)
            } else {  // 1-characteristic at 2-shock or 2-characteristic at 1-shock
                t2 = t1;
                x2 = x1;
            }

            // 1-characteristic after 1-shock/1-fan or 2-characteristic before 2-shock/2-fan
            [lbd, s] = (which == 1) ? [lambdas[2], speeds[1]] : [lambdas[3], speeds[2]];
            t3 = (wave_type[which - 1] == "R") ? duration*1.1 : (lbd * t2 - x2) / (lbd - s);
            t3 = Math.min(t3, duration*1.1);
            // Characteristics not collapsing into the shock before Tend - and the ones collapsing
            x3 = (duration < t3) ? x2 + lbd * (t3 - t2) : x2 + lbd * (t2 * s - x2) / (lbd - s);
            ctx.lineTo(x3, t3);
            dist_to_hoover = dist_pt_segment(hoover_position_xt, [x2, t2], [x3, t3]);
            if (((xh - s * th) * sign <= 0.) && (dist_to_hoover < ref_dist)) flag_close = true;

            ctx.resetTransform();
            ctx.lineWidth = flag_close ? bold : normal;
            ctx.stroke();
        }
    }

    // Draw 1-characteristic inside 1-fan, or 2-characteristic inside 2-fan
    let [xa, xb] = [duration * speeds[2*which-2], duration * speeds[2*which-2+1]];
    ref_dist = 0.40 * (xi_max / nc) * th / duration;
    if ((wave_type[which - 1] == 'R') && (EPS < xb - xa)) {
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
            ctx.lineWidth = ((0 < th) && (th < duration) && (dist_to_hoover < ref_dist)) ? bold : normal;
            ctx.stroke()
            xi += (i+1) * dx * (2*(i%2) - 1);  // 0, -1, 1, -2, 2 ... 
        }
    }

    ctx.restore();
}

/**
 * 
 */

function set_background_1(canvas) {
    let ctx = canvas.getContext("2d");
    ctx.lineWidth = 3 * LW;
    ctx.strokeStyle = COLORS[4];
    ctx.setLineDash([5*LW, 5*LW]);
    ctx.beginPath();
    ctx.moveTo(tsfm1[4], tsfm1[5]);
    ctx.lineTo(tsfm1[4], tsfm1[3] * y_max + tsfm1[5]);
    ctx.stroke();
}

function set_background_2(canvas) {
    const ctx = canvas.getContext("2d");
    const h = canvas.height;
    const w = canvas.width;
    const s = origin_shift;
    
    // draw_axes(canvas, ctx, [w * s, h / 2], tsfm2[0], -tsfm2[3], ["\u03C6", "\u03C6 u"]);
    draw_axes(canvas, ctx, [w * s, h / 2], tsfm2[0] * GRAVITY, -tsfm2[3] * GRAVITY, ["h", "h u"], 1., COLORS[4]);
    
    // Show supersonic regions
    ctx.save();
    ctx.setTransform(...tsfm2);
    // ctx.fillStyle = "#ff000015";
    ctx.fillStyle = COLORS[4] + "20";
    let dx = px_per_step / tsfm2[0];
    let x, y;
    for (sign = -1; sign <= 1; sign += 2) {
        x = y = 0.;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (; (x < q_max[0]) && (Math.abs(y) < q_max[1]); x+=dx) {
            y = sign * x * Math.sqrt(x);
            ctx.lineTo(x, y);
        }
        ctx.lineTo(0., y);
        ctx.closePath();
        ctx.fill();
    }
    ctx.resetTransform()
    ctx.restore();
}

function set_background_3(canvas) {
    const ctx = canvas.getContext("2d");
    const h = canvas.height;
    const w = canvas.width;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw_axes(canvas, ctx, [w * 0.50, (1. - origin_shift) * h], tsfm3[0], -tsfm3[3], ["x", "t"], 1., COLORS[4]);
}

function set_background_4(canvas) {
    const ctx = canvas.getContext("2d");
    const h = canvas.height;
    const w = canvas.width;
    draw_axes(canvas, ctx, [w * 0.50, (1. - origin_shift) * h], tsfm4[0] * GRAVITY, -tsfm4[3]*GRAVITY, ["f1", "f2"], 1., COLORS[4]);
}

function draw_axes(canvas, ctx, origin, dx, dy, labels, k=1., color=COLORS[4]) {
    // dx = length in px of a unit

    var ctx = canvas.getContext("2d");
    var x_axis_starting_point = { number: 1, suffix: ''};
    var y_axis_starting_point = { number: 1, suffix: '' };
    const h = canvas.height;
    const w = canvas.width;
    const fontsize = k * window.innerWidth / 150;
    let base_1, base_2, base_5, base, n_ticks_per_label, delta, sign, label;

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
                ctx.beginPath();
                ctx.lineWidth = 1 * LW;
                // Draw a tick mark 6px long (-3 to 3)
                ctx.moveTo(x_pm[j], origin[1] - 4);
                ctx.lineTo(x_pm[j], origin[1] + 4);
                ctx.stroke();
                // Text value at that point
                if ((i % n_ticks_per_label == 0) && (w*0.02 < x_pm[j]) && (x_pm[j] < w*0.95)) {
                    ctx.font = fontsize + 'px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    label = Math.round(sign*i*delta/EPS)*EPS + y_axis_starting_point.suffix
                    ctx.fillText(label, x_pm[j], origin[1] + h * 0.015);
                }
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
                ctx.beginPath();
                ctx.lineWidth = 1 * LW;
                // Draw a tick mark 6px long (-3 to 3)
                ctx.moveTo(origin[0] - 4, y_pm[j]);
                ctx.lineTo(origin[0] + 4, y_pm[j]);
                ctx.stroke();
                // Text value at that point
                if ((i % n_ticks_per_label == 0) && (h*0.05 < y_pm[j]) && (y_pm[j] < h*0.98)) {
                    ctx.font = fontsize + 'px Arial';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'middle';
                    label = Math.round(sign*i*delta/EPS)*EPS + y_axis_starting_point.suffix
                    ctx.fillText(label, origin[0] - w * 0.01, y_pm[j]);
                }
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
