let current = undefined;
let ongoing = false;

function main() {
    handle_inputs();
}

function handle_inputs() {

    function handle_input_period(i) {
        let rect = document.getElementById("P" + i + "_box");
        rect.addEventListener("click", function (e) {
            if (ongoing) {
                return;
            }
            
            ongoing = true;
            if (current != undefined)
                anim_leave_period(current, i, duration = 0.5);

            if (current == i) {
                current = undefined;
            } else {
                anim_enter_period(i, duration = 1.);
                current = i;
            }
        });
    }

    handle_input_period(1);
    handle_input_period(2);
    handle_input_period(3);
    handle_input_period(4);
}

function easeInOut(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
}

function cumulativeOffset(element) {
    var top = 0, left = 0;
    do {
        top += element.offsetTop  || 0;
        left += element.offsetLeft || 0;
        element = element.offsetParent;
    } while(element);

    return {
        top: top,
        left: left
    };
};


function anim_enter_period(which, duration = 2.) {
    let start = null;
    duration *= 1000;

    let timeline = document.getElementById("tl" + which);
    if (timeline.style.display != "none") {
        return;
    } else {
        timeline.style.display = "flex";
    }
    
    // let box_org = document.getElementById("P" + which + "_ref");
    // let box_mve = document.getElementById("P" + which);
    // let box_dst = document.getElementById("P" + which + "_bis");
    // box_mve.style.display = "flex";
    // box_mve.style.transitionProperty = "none";
    // box_mve.style.position = "absolute";

    // let rect_org = cumulativeOffset(box_org);
    // let rect_dst = cumulativeOffset(box_dst);
    // let style = box_mve.currentStyle || window.getComputedStyle(box_mve);
    // let marginLeft = parseInt(style.marginLeft);
    // let marginTop = parseInt(style.marginTop);
    // let init_left = rect_org.left;
    // let init_top = rect_org.top + box_org.offsetHeight / 2. - box_mve.offsetHeight / 2.;

    let line_org = document.getElementById("P" + which + "_line");
    let line_mve = document.getElementById("P" + which + "_line_mv");
    let line_dst = document.getElementById("P" + which + "_line_bis");    
    line_mve.style.display = "flex";
    line_mve.style.position = "absolute";
    let line_org_ = cumulativeOffset(line_org);
    let line_dst_ = cumulativeOffset(line_dst);


    function step_line(timestamp) {
        if (!start) {    
            start = timestamp;
            // box_mve.style.top = init_top + "px";
            // box_mve.style.left = init_left + "px";
            line_mve.style.top = line_org_.top + "px";
            line_mve.style.left = line_org_.left + "px";
        } 
        let t = easeInOut((timestamp - start) / duration);
        if (timestamp - start < duration) {
            window.requestAnimationFrame(step_line);
        } else {
            t = 1.;
            start = null;
        }

        // box_mve.style.left = (init_left * (1. - t) + rect_dst.left * t) - marginLeft + "px";
        // box_mve.style.top = (init_top * (1. - t) + rect_dst.top * t) - marginTop + "px";
        line_mve.style.height = line_org.offsetHeight * (1. - t) + line_dst.offsetHeight * t + "px";
        line_mve.style.top = line_org_.top * (1. - t) + line_dst_.top * t + "px";
        line_mve.style.left = line_org_.left * (1. - t) + line_dst_.left * t + "px";

        if ((start == null)) {
            // box_mve.style.display = "none";
            // box_dst.style.opacity = 1.0;
            line_mve.style.display = "none";
            line_dst.style.opacity = 1.0;
            anim_events(which);
        }
    }

    window.requestAnimationFrame(step_line);
}

function anim_events(which, duration = 2.) {

    let all_events = document.getElementsByClassName("event");
    let events = []
    for (i = 0; i < all_events.length; i++) {
        if (all_events[i].parentElement.parentElement.id[2] == which) {
            events.push(all_events[i]);
        }
    }

    let event_start = [];
    let event_end = [];
    for (i = 0; i < events.length; i++) {
        let start = 0 + i*1.0;
        let end = start + 2.0;
        event_start.push(start);
        event_end.push(end);
    }
    let total = event_end[events.length - 1];
    for (i = 0; i < events.length; i++) {
        event_start[i] /= total;
        event_end[i] /= total;
    }

    let start = null;

    function step(timestamp) {
        if (!start) start = timestamp;
        let t = easeInOut((timestamp - start) / (duration * 1000));

        if (timestamp - start < duration * 1000) {
            window.requestAnimationFrame(step);
        } else {
            t = 1.;
            start = null;
        }

        for (i = 0; i < events.length; i++) {
            if (event_start[i] <= t && t < event_end[i]) {
                events[i].style.opacity = (t - event_start[i]) / (event_end[i] - event_start[i]);
            } else if (event_end[i] <= t) {
                events[i].style.opacity = 1.0;
            }
        }

        if (start == null) ongoing = false;
    }

    window.requestAnimationFrame(step);
}

function anim_leave_period(to_fadeout, to_fadein, duration = 5.) {
    
    let timeline = document.getElementById("tl" + to_fadeout);

    let start = null;
    duration *= 1000;
    
    // let box_title = document.getElementById("P" + which + "_bis");
    let line = document.getElementById("P" + to_fadeout + "_line_bis");
    
    let all_events = document.getElementsByClassName("event");
    let events = []
    for (i = 0; i < all_events.length; i++) {
        if (all_events[i].parentElement.parentElement.id[2] == to_fadeout) {
            events.push(all_events[i]);
        }
    }

    function step(timestamp) {
        if (!start) {    
            start = timestamp;
        } 
        let t = easeInOut((timestamp - start) / duration);
        if (timestamp - start < duration) {
            window.requestAnimationFrame(step);
        } else {
            t = 1.;
            start = null;
        }

        // box_title.style.opacity = 1. - t;
        line.style.opacity = 1. - t;
        for (i = 0; i < events.length; i++) {
            events[i].style.opacity = 1. - t;
        }

        if (start == null) {
            timeline.style.display = "none";
            if (to_fadeout == to_fadein) ongoing = false;
        }
    }

    window.requestAnimationFrame(step);

}