// Layout parameters
const LW = window.innerWidth / 2000;  // line width
const ORANGE = "#fa7e19";
const BLUE = "#2d70b3";
const RED = "#c74440";
const GREEN = "#388c46";

const origin_shift = 0.05;  // percentage of width
const dot_state_radius = 10 * LW;  // same as locus dot size
const px_per_step = 10;  // discretization of curves
const n_speed_lines = 20;  // number of speed lines

const x_max = 8.;
let y_max;
let q_max = [7., 4.5];  // [q1, q2] max values
let f_max = [7., 20.5];  // [q1, q2] max values
let px_grid_size_x;  // nb of px
let px_grid_size_y;  // nb of px

let tsfm1, tsfm2, tsfm3, tsfm4;

// Interaction parameters
let active_char = [true, true];
let entropy_fix = true;
let drag_flag = -1;
let hoover_position = [0., -1.];

// Animation parameters
let anim_state = "init";  // init, play, pause, end
let last_clock = null;
let last_t = 0.;
let duration = 3.;
let speedup = 0.5;
let x_speed_lines = [];

// State parameters
let ql = [5., 0.];  // left state
let qr = [1., 0.];  // right state
let qm = [-1., 1.];  // middle state (just for initialization)

let f_LF = [0., 0.];  // Lax-Friedrichs flux

let lambdas = [0., 0., 0., 0., 0., 0.];
let speeds = [0., 0., 0., 0.];
let wave_type = ["", ""];
const EPS = 1.e-10;


function main(canvas1A, canvas1, canvas2A, canvas2, canvas3A, canvas3, canvas4A, canvas4) {

    y_max = canvas1.height * (2. * x_max) / canvas1.width;
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

    update_all_plots(canvas2, canvas3, canvas4);  // Initial figure display
    handle_inputs(canvas1, canvas2, canvas3, canvas4, canvas3A);  // Handle input interactions
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
        drag_flag = -1;
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
    document.getElementById("phi_L").value = ql[0];
    document.getElementById("phi_L").addEventListener(
        'keypress', function (e){
            if (e.key === 'Enter') this.blur();
        }
    );
    document.getElementById("phi_L").addEventListener(
        'blur', function (e){
            if (anim_state != "init") {
                this.value = ql[0];
                return;
            }
            this.value = Math.min(Math.max(0., this.value), q_max[0]);
            if ((qr[0] < EPS) && (this.value < EPS)) this.value = ql[0];
            else ql[0] = Number(this.value);
            if (ql[0] < EPS) ql[1] = 0.;
            document.getElementById("u_L").value = ql[1];
            update_all_plots(canvas2, canvas3, canvas4);
        }
    );

    // Left mass flux input
    document.getElementById("u_L").value = ql[1];
    document.getElementById("u_L").addEventListener(
        'keypress', function (e){
            if (e.key === 'Enter') this.blur();
        }
    );
    document.getElementById("u_L").addEventListener(
        'blur', function (e){
            if (anim_state != "init") {
                this.value = ql[1];
                return;
            }
            this.value = Math.max(-q_max[1], Math.min(this.value, q_max[1]));
            if (ql[0] < EPS) this.value = 0.;
            ql[1] = Number(this.value);
            update_all_plots(canvas2, canvas3, canvas4);
        }
    );
    
    // Right height input
    document.getElementById("phi_R").value = qr[0];
    document.getElementById("phi_R").addEventListener(
        'keypress', function (e){
            if (e.key === 'Enter') this.blur();
        }
    );
    document.getElementById("phi_R").addEventListener(
        'blur', function (e){
            if (anim_state != "init") {
                this.value = qr[0];
                return;
            }
            this.value = Math.min(Math.max(0., this.value), q_max[0]);
            if ((ql[0] < EPS) && (this.value < EPS)) this.value = qr[0];
            else qr[0] = Number(this.value);
            if (qr[0] < EPS) qr[1] = 0.;
            document.getElementById("u_R").value = qr[1];
            update_all_plots(canvas2, canvas3, canvas4);
        }
    );

    // Right mass flux input
    document.getElementById("u_R").value = qr[1];
    document.getElementById("u_R").addEventListener(
        'keypress', function (e){
            if (e.key === 'Enter') this.blur();
        }
    );
    document.getElementById("u_R").addEventListener(
        'blur', function (e){
            if (anim_state != "init") {
                this.value = qr[1];
                return;
            }
            this.value = Math.max(-q_max[1], Math.min(this.value, q_max[1]));
            if (qr[0] < EPS) this.value = 0.;
            qr[1] = Number(this.value);
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

        if (Math.hypot(qs[0] - x, qs[1] - y) < dot_state_radius) {
            drag_flag = i + 1;  // 1 or 2
        }
    }
}

function mouse_move_state(event, canvas, canvas_xt, canvas_flux) {
    if (drag_flag != -1) {
        let x = event.offsetX - tsfm2[4];
        let y = event.offsetY - tsfm2[5];

        if (x < 0.) return;
        
        // Transform from back to state space
        det = 1. / (tsfm2[0] * tsfm2[3] - tsfm2[1] * tsfm2[2]);
        new_x = det * (+tsfm2[3] * x - tsfm2[2] * y);
        new_y = det * (-tsfm2[1] * x + tsfm2[0] * y);
        
        if (drag_flag == 1) {
            ql[0] = new_x;
            ql[1] = new_y;
            document.getElementById("phi_L").value = Math.round(ql[0] * 100) / 100;
            document.getElementById("u_L").value = Math.round(ql[1] * 100) / 100;
        } else {
            qr[0] = new_x;
            qr[1] = new_y;
            document.getElementById("phi_R").value = Math.round(qr[0] * 100) / 100;
            document.getElementById("u_R").value = Math.round(qr[1] * 100) / 100;
        }
        
        update_all_plots(canvas, canvas_xt, canvas_flux);
    }
}

function mouse_move_hoover_char(event, canvas, reset=false) {
    let x = event.offsetX - tsfm3[4];
    let y = event.offsetY - tsfm3[5];
    if (y > 0.) return;
    det = 1. / (tsfm3[0] * tsfm3[3] - tsfm3[1] * tsfm3[2]);
    hoover_position[0] = det * (+tsfm3[3] * x - tsfm3[2] * y);
    hoover_position[1] = det * (-tsfm3[1] * x + tsfm3[0] * y);
    if (reset) hoover_position[1] = -10.;
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
    let xi, q1, u;
    if ((flag == "R1") || ((t * speeds[0] <= x) && (x <= t * speeds[1]))) { // 1-rarefaction (1-shock not possible as speeds[0]==speeds[1])
        if (flag == 1) {
            console.log(t * speeds[0], x, t * speeds[1]);
        }
        xi = x / t;
        q1 = ((ql[1]/ql[0] + 2. * Math.sqrt(ql[0])) / 3. - xi / 3) ** 2;
        u = (ql[1]/ql[0] + 2. * Math.sqrt(ql[0])) / 3. + 2. * xi / 3.;
        return [q1, q1*u]
    } else if ((flag == "R2") || ((t * speeds[2] <= x) && (x <= t * speeds[3]))) {  // 2-rarefaction (2-shock not possible as speeds[2]==speeds[3])
        xi = x / t;
        q1 = ((qr[1]/qr[0] - 2. * Math.sqrt(qr[0])) / 3. - xi / 3.) ** 2;
        u = (qr[1]/qr[0] - 2. * Math.sqrt(qr[0])) / 3. + 2. * xi / 3.;
        return [q1, q1*u]
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
        return ql[1]/ql[0] - Math.sqrt(qm[0]/2 * (1+ qm[0]/ql[0]));
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
        color = (v == 0) ? BLUE : ORANGE;
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
    ctx.fillStyle = "#5e8cd1";

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
            ctx.fillStyle = "#ffffff80";
            ctx.fill();
        } else {
            ctx.resetTransform();
            ctx.lineWidth = 5 + LW;
            ctx.strokeStyle = "#000000";
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
    ctx.strokeStyle = "#535353";

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

function find_middle_state_bissect(ql, qr) {
    /**
     * Bissection method to find middle state
     */

    function f1(x) {
        if (x < ql[0]) {  // 1-integral curve
            return x * ql[1]/ql[0] + 2. * x * (Math.sqrt(ql[0]) - Math.sqrt(x));
        }
        else {  // 1-hugoniot locus
            return x * ql[1]/ql[0] - (x - ql[0]) * (Math.sqrt(0.5 * x * (1. + x / ql[0])));
        }
    }
    function f2(x) {
        if (x < qr[0]) {  // 2-integral curve
            return x * qr[1]/qr[0] - 2. * x * (Math.sqrt(qr[0]) - Math.sqrt(x));
        }
        else {  // 2-hugoniot locus
            return x * qr[1]/qr[0] + (x - qr[0]) * (Math.sqrt(0.5 * x * (1. + x / qr[0])));;
        }
    }
    function f(x) {
        return f1(x) - f2(x);
    }
    function df(x) {
        res = ql[1]/ql[0] - qr[1]/qr[0];
        if (x < ql[0]) {
            res += +2. * Math.sqrt(ql[0]) - 3. * Math.sqrt(x);
        } else {
            res += -0.5 * (4. * x * x + ql[0] * x - ql[0] * ql[0]) / Math.sqrt(2. * x * ql[0] * (ql[0] + x));
        }
        if (x < qr[0]) {
            res -= -2. * Math.sqrt(qr[0]) - 3. * Math.sqrt(x);
        } else {
            res -= +0.5 * (4. * x * x + qr[0] * x - qr[0] * qr[0]) / Math.sqrt(2. * x * qr[0] * (qr[0] + x));
        }
        return res;
    }
    
    if (
        (ql[0] < EPS && Math.abs(ql[1]) < EPS) || 
        (qr[0] < EPS && Math.abs(qr[1]) < EPS) ||
        (ql[1]/ql[0] + 2. * Math.sqrt(ql[0]) < qr[1]/qr[0] - 2. * Math.sqrt(qr[0])) 
        ) {  // Dry middle state
            console.log("Middle state is dry !");
            return [0., 0.];
    }

    let x_min = ql[0];
    let x_max = qr[0];
    let f_min = f(x_min);
    let f_max = f(x_max);
    let n = 0;

    if (Math.abs(f_min) < EPS) {
        return [ql[0], ql[1]];
    } 
    else if (Math.abs(f_max) < EPS) {
        return [qr[0], qr[1]];
    } 
    else if (f_min * f_max < 0.) {  // RS or SR
        x_min = Math.min(ql[0], qr[0]);
        x_max = Math.max(ql[0], qr[0]);
    } else if (f_min < 0.){  // RR
        // x_min = EPS/2.;
        // x_max = Math.min(ql[0], qr[0]) + EPS;
        let x_analytic = (ql[1]/ql[0] - qr[1]/qr[0] + 2. * (Math.sqrt(ql[0]) + Math.sqrt(qr[0]))) ** 2 / 16.;
        return [x_analytic, f1(x_analytic)];
    } else {  // SS
        x_min = Math.max(ql[0], qr[0]);
        x_max = 2. * x_min;
        while ((f(x_max) > 0.) && (n < 30)) {  // find bracket with root inside 
            x_max *= 1.5;
            n++;
        }
        if (n == 30) {
            console.log("Error with middle state computation. Bracket not found !");
            return [-1., 0.];
        }
    }
    
    n = 0;
    f_min = f(x_min);
    f_max = f(x_max);
    let x_mid, f_mid;
    let tol = 1.e-5;
    while (n < 100) {
        x_mid = (x_min + x_max) * 0.5;
        f_mid = f(x_mid);
        if ((Math.abs(f_mid) < EPS) || (x_max - x_min < 2. * tol)) {
            console.log("Middle state " + x_mid);
            return [x_mid, f1(x_mid)];
        }
        n++;
        if (f_min * f_mid < 0.) {
            x_max = x_mid;
        } else {
            x_min = x_mid;
        }
    }
    
    console.log("Middle state not precise, too many computations needed" + x_mid);
    return [x_mid, f1(x_mid)];
}

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
        else res += -0.5 * (4. * x * x + ql[0] * x - ql[0] * ql[0]) / Math.sqrt(2. * x * ql[0] * (ql[0] + x))
        
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

    plot_locus(canvas, tsfm, BLUE, pts_1_integral, pts_1_hugoniot);
    plot_locus(canvas, tsfm, ORANGE, pts_2_integral, pts_2_hugoniot);
    draw_state(canvas, BLUE, ql, tsfm);
    draw_state(canvas, ORANGE, qr, tsfm);
    draw_state(canvas, GREEN, qm, tsfm);
    display_middle_state(canvas);

    // Map the loci from (q1, q2) domain to the flux domain (f1, f2)
    curves = [pts_1_hugoniot, pts_1_integral, pts_2_hugoniot, pts_2_integral]
    for (c = 0; c < curves.length; c++) {
        for (i = 0; i < curves[c].length; i++) {
            curves[c][i] = compute_flux(curves[c][i]);
        }
    }
    plot_locus(canvas_flux, tsfm_flux, BLUE, pts_1_integral, pts_1_hugoniot);
    plot_locus(canvas_flux, tsfm_flux, ORANGE, pts_2_integral, pts_2_hugoniot);
    draw_state(canvas_flux, BLUE, compute_flux(ql), tsfm_flux);
    draw_state(canvas_flux, ORANGE, compute_flux(qr), tsfm_flux);
    draw_state(canvas_flux, GREEN, compute_flux(qm), tsfm_flux);

    // Compute approximate Lax-Friedrichs flux
    [l1l, l2l] = [lambdas[0], lambdas[1]];
    [l1r, l2r] = [lambdas[4], lambdas[5]];
    let max_eig = Math.max(Math.abs(l1l), Math.abs(l2l), Math.abs(l2l), Math.abs(l2r));
    let f_ql = compute_flux(ql);
    let f_qr = compute_flux(qr);
    f_LF = [
        0.5 * (f_ql[0] + f_qr[0]) - 0.5 * max_eig * (qr[0] - ql[0]),
        0.5 * (f_ql[1] + f_qr[1]) - 0.5 * max_eig * (qr[1] - ql[1]),
    ];
    draw_state(canvas_flux, RED, f_LF, tsfm_flux);
}


function map_x(xi, x_zero, x_end) {
    return x_zero + (x_end-x_zero) * (Math.sqrt((xi / (x_end-x_zero))**2 + 1.) - 1.) / (Math.sqrt(2) - 1);
}

function compute_locus(which, qs) {
    if ((qs[0] < EPS) && (Math.abs(qs[1]) < EPS)) {
        return [[[0., 0.]], [[0., 0.]]];
    }

    const sign = (which == 1) ? +1. : -1.;
    let dx = px_per_step / tsfm2[0];
    let n_step;
    
    pts_hugoniot = [];
    pts_integral = []
    
    // Compute Integral curve (rarefaction)
    let x_end = (entropy_fix) ? qs[0] : q_max[0];
    n_step = Math.ceil((x_end - 0.) / dx);
    dx = (x_end - 0.) / n_step;
    for (i = 1; i <= n_step; i++) {
        x = map_x(i * dx, 0., x_end);
        y = x * qs[1] / qs[0] + sign * 2. * x * (Math.sqrt(qs[0]) - Math.sqrt(x));
        pts_integral.push([x, y]);
    }

    // Compute Hugoniot locus (shock)
    let x_start = (entropy_fix) ? qs[0] : 0.;
    n_step = Math.ceil((q_max[0] - x_start) / dx);
    dx = (q_max[0] - x_start) / n_step;
    for (i = 1; i <= n_step; i ++) {
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

function draw_state(canvas, color, q, tsfm) {
    // Draw dot for state q
    let ctx = canvas.getContext("2d");
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    q_px = [
        tsfm[0] * q[0] + tsfm[2] * q[1] + tsfm[4],
        tsfm[1] * q[0] + tsfm[3] * q[1] + tsfm[5],
    ];
    ctx.arc(q_px[0], q_px[1], dot_state_radius, 0, 2. * Math.PI, true);
    ctx.fill();
    ctx.restore();
}

function display_middle_state(canvas) {
    let q1_info = (Math.round(100*qm[0])/100).toFixed(2).padStart(4, ' ');
    let q2_info = (Math.round(100*qm[1])/100).toFixed(2).padStart(5, ' ');
    // let info = "\u03C6M = " + q1_info + "   u\u03C6M = " + q2_info; 
    let info = "hM = " + q1_info + "   huM = " + q2_info; 
    let ctx = canvas.getContext("2d");

    ctx.save();
    ctx.font = canvas.width/30 + 'px Fira Mono';
    ctx.fillStyle = GREEN;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(info, 0.99*canvas.width, 0.99*canvas.height);
    ctx.restore();
}

function draw_characteristics(canvas, tsfm, t=0.) {
    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (active_char[0]) draw_characteristic(ctx, tsfm, 1);
    if (active_char[1]) draw_characteristic(ctx, tsfm, 2);

    ctx.save();

    // Draw shock and rarefaction waves
    ctx.moveTo(0., 0.);
    for (w = 0; w < 2; w++) {
        if (wave_type[w] == "R") {
            ctx.fillStyle = "#c7c7c7b0";
            ctx.beginPath();
            ctx.setTransform(...tsfm);
            ctx.moveTo(0., 0.);
            for (i = 2*w; i < 2*w+2; i++) {
                ctx.lineTo(duration * speeds[i], duration);
            }
            ctx.closePath();
            ctx.resetTransform();
            ctx.fill();
        } else {
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 5 * LW;
            ctx.beginPath();
            ctx.setTransform(...tsfm);
            ctx.moveTo(0., 0.);
            ctx.lineTo(duration * speeds[2*w], duration);
            ctx.resetTransform();
            ctx.stroke();
        }
    }

    if ((EPS < t) && (t + EPS < duration)) {
        ctx.lineWidth = 5 * LW;
        ctx.strokeStyle = "#999999b0";
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

function draw_characteristic(ctx, tsfm, which) {

    [l1l, l2l, l1m, l2m, l1r, l2r] = lambdas;
    let lbd_l = lambdas[2*0+(which-1)];
    let lbd_m = lambdas[2*1+(which-1)];
    let lbd_r = lambdas[2*2+(which-1)];
    
    let T = duration;
    const normal = 1 * LW;
    const bold =  4 * LW;

    let nc = 15;  // number of characteristics
    let x_max_ = 1.5 * x_max;
    let dx = x_max_ / nc;
    let xi, t_max;
    let x, y;
    let dist_to_hoover, ref_dist;
    let [xh, th] = hoover_position;

    let pts_intersection_1 = [];
    let pts_intersection_2 = [];

    ctx.save();

    // Left state characteristics
    // If hoover near a line, closer than 33% of characteristics spacing, make it bold
    ref_dist = 0.33 * dx / Math.hypot(1., lbd_l);
    if (ql[0] > EPS) {  // if left state is not dry
        ctx.strokeStyle = BLUE + "80";
        for (i = 0; i < nc; i++) {
            xi = -x_max_ + x_max_ * (i + 0.5) / nc;
            if ((wave_type[0] == "R") && (which == 1)) {
                // draw until the top of the domain
                t_max = T;
                [x, y] = [xi + t_max * lbd_l, t_max];
            } else {
                // draw until the intersection with the middle state
                t_max = xi / (speeds[0] - lbd_l);
                [x, y] = [xi + t_max * lbd_l, t_max];
                // save the intersection point so that we can draw the middle state characteristics
                pts_intersection_1.push([xi + t_max * lbd_l, t_max]);
            }
            ctx.beginPath();
            ctx.setTransform(...tsfm);
            ctx.moveTo(xi, 0.);
            ctx.lineTo(x, y);
            ctx.resetTransform();
            dist_to_hoover = dist_pt_segment(hoover_position, [xi, 0.], [x, y]);
            ctx.lineWidth = ((xh <= speeds[0] * th) && (dist_to_hoover < ref_dist)) ? bold : normal;
            ctx.stroke();
        }
    }
    if (pts_intersection_1.length == 0) {
        for (xi = T * speeds[1] + dx / 2.; xi < T * speeds[2]; xi += dx) {
            pts_intersection_1.push([xi, T]);
        }
    }

    // Right state characteristics
    ref_dist = 0.33 * dx / Math.hypot(1., lbd_r);
    if (qr[0] > EPS) {
        ctx.strokeStyle = ORANGE + "80";
        for (i = 0; i < nc; i++) {
            xi = 0. + x_max_ * (i+0.5) / nc;
            if ((wave_type[1] == "R") && (which == 2)) {
                t_max = T;
                [x, y] = [xi + t_max * lbd_r, t_max];
            } else {
                t_max = xi / (speeds[3] - lbd_r);
                [x, y] = [xi + t_max * lbd_r, t_max];
                pts_intersection_2.push([x, y]);
            }
            ctx.beginPath();
            ctx.setTransform(...tsfm);
            ctx.moveTo(xi, 0.);
            ctx.lineTo(x, y);
            ctx.resetTransform();
            dist_to_hoover = dist_pt_segment(hoover_position, [xi, 0.], [x, y]);
            ctx.lineWidth = ((speeds[3] * th <= xh) && (dist_to_hoover < ref_dist)) ? bold : normal;
            ctx.stroke();
        }
    }
    if (pts_intersection_2.length == 0) {
        for (xi = T * speeds[2] - dx / 2.; xi > T * speeds[1]; xi -= dx) {
            pts_intersection_2.push([xi, T]);
        }
    }

    // Middle state characteristics
    let x0, t0, num;
    let pts_intersection = (which == 1) ? pts_intersection_1 : pts_intersection_2;
    if (2 <= pts_intersection.length) {  // distance btw two middle characteristics
        num = (pts_intersection[1][0] - pts_intersection[0][0]) - lbd_m * (pts_intersection[1][1] - pts_intersection[0][1]);
    } else {
        num = dx;
    }
    ref_dist = 0.33 * Math.abs(num) / Math.hypot(1., lbd_m);
    
    if (qm[0] > EPS) {
        ctx.strokeStyle = GREEN + "80";
        for (i = 0; i < pts_intersection.length; i++) {
            ctx.beginPath();
            ctx.setTransform(...tsfm);
            if (which == 1) {
                [x0, t0] = pts_intersection[i];
                xi = x0 - t0 * lbd_m;
                t_max = xi / (speeds[2] - lbd_m);
                [x, y] = [speeds[2] * t_max, t_max];
                ctx.moveTo(x0, t0);
                ctx.lineTo(x, y);
            }
            else {
                [x0, t0] = pts_intersection[i];
                xi = x0 - t0 * lbd_m;
                t_max = xi / (speeds[1] - lbd_m);
                [x, y] = [speeds[1] * t_max, t_max];
                ctx.moveTo(x0, t0);
                ctx.lineTo(x, y);
            }
            ctx.resetTransform();
            dist_to_hoover = dist_pt_segment(hoover_position, [x0, t0], [x, y]);
            ctx.lineWidth = ((speeds[1] * th <= xh) && (xh <= speeds[2] * th) && (dist_to_hoover < ref_dist)) ? bold : normal;
            ctx.stroke();
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
    ctx.strokeStyle = "#c5c5c5";
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
    draw_axes(canvas, ctx, [w * s, h / 2], tsfm2[0], -tsfm2[3], ["h", "h u"]);
    
    // Show supersonic regions
    ctx.setTransform(...tsfm2);
    ctx.fillStyle = "#ff000015";
    let dx = px_per_step / tsfm1[0];
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
}

function set_background_3(canvas) {
    const ctx = canvas.getContext("2d");
    const h = canvas.height;
    const w = canvas.width;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw_axes(canvas, ctx, [w * 0.50, (1. - origin_shift) * h], tsfm3[0], -tsfm3[3], ["x", "t"]);
}

function set_background_4(canvas) {
    const ctx = canvas.getContext("2d");
    const h = canvas.height;
    const w = canvas.width;
    draw_axes(canvas, ctx, [w * 0.50, (1. - origin_shift) * h], tsfm4[0], -tsfm4[3], ["f1", "f2"], k=1.);
}

function draw_axes(canvas, ctx, origin, dx, dy, labels, k=1.) {

    var ctx = canvas.getContext("2d");
    var x_axis_starting_point = { number: 1, suffix: ''};
    var y_axis_starting_point = { number: 1, suffix: '' };
    const h = canvas.height;
    const w = canvas.width;
    const fontsize = k * window.innerWidth / 150;

    ctx.save();
    ctx.strokeStyle = "black";
    draw_arrow(ctx, 0., origin[1], w, 0., 3);
    draw_arrow(ctx, origin[0], h, 0., -h, 3);

    // Ticks marks along the X-axis
    let x_pm = [origin[0] - dx, origin[0] + dx];
    for(i=1; (w*0.02 < x_pm[0]) || (x_pm[1] < w*0.92); i++, x_pm[0]-=dx, x_pm[1]+=dx) {
        for (j = 0; j < 2; j++) {
            if ((w*0.02 < x_pm[j]) && (x_pm[j] < w*0.95)) {
                sign = (j == 0) ? -1 : 1;
                ctx.beginPath();
                ctx.lineWidth = 1 * LW;
                ctx.strokeStyle = "#000000";
                // Draw a tick mark 6px long (-3 to 3)
                ctx.moveTo(x_pm[j], origin[1] - 3);
                ctx.lineTo(x_pm[j], origin[1] + 3);
                ctx.stroke();
                // Text value at that point
                ctx.font = fontsize + 'px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(x_axis_starting_point.number*(sign*i) + x_axis_starting_point.suffix, x_pm[j], origin[1] + h * 0.015);
            }
        }
    }

    // Ticks marks along the Y-axis
    let y_pm = [origin[1] + dy, origin[1] - dy];
    for(i=1; (h*0.08 < y_pm[1]) || (y_pm[0] < h*0.98); i++, y_pm[0]+=dy, y_pm[1]-=dy) {
        for (j = 0; j < 2; j++) {
            if ((h*0.08 < y_pm[j]) && (y_pm[j] < h*0.98)) {
                sign = (j == 0) ? -1 : 1;
                ctx.beginPath();
                ctx.lineWidth = 1 * LW;
                ctx.strokeStyle = "#000000";
                // Draw a tick mark 6px long (-3 to 3)
                ctx.moveTo(origin[0] - 3, y_pm[j]);
                ctx.lineTo(origin[0] + 3, y_pm[j]);
                ctx.stroke();
                // Text value at that point
                ctx.font = fontsize + 'px Arial';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText(y_axis_starting_point.number*(sign*i) + y_axis_starting_point.suffix, origin[0] - w * 0.01, y_pm[j]);
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

function draw_arrow(ctx, fromx, fromy, dx, dy, max_width, color="#fffff") {
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
