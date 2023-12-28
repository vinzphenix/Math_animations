let current_period = undefined;
let ongoing_period = false;

let current_event = undefined;
let ongoing_event = false;

function main() {
    handle_inputs();
}

function handle_inputs() {

    function handle_input_period(i) {
        let rect = document.getElementById("P" + i + "_box");
        rect.addEventListener("click", function (e) {
            if (ongoing_period) {
                return;
            }
            ongoing_period = true;
            if (current_period != undefined)
                anim_leave_period(current_period, i, duration = 0.5);

            if (current_period == i) {
                current_period = undefined;
            } else {
                anim_enter_period(i, duration = 0.5);
                current_period = i;
            }
        });
    }

    function handle_event(event_box) {
        let detail_box = document.getElementById("explainer");
        let children = event_box.children;
        let event_subbox = undefined;
        for (let j = 0; j < children.length; j++) {
            if (children[j].classList.contains("event-label")) {
                event_subbox = children[j];
            }
        }
        if (event_subbox == undefined) {
            console.log("Error: no event-label found in the event", event_box);
            return;
        }

        children = event_subbox.children;
        let event_title = undefined;
        let event_detail = undefined;
        for (let j = 0; j < children.length; j++) {
            if (children[j].classList.contains("detail")) {
                event_detail = children[j];
            } else if (children[j].tagName == "H3") {
                event_title = children[j];
            }
        }
        if (event_title == undefined) {
            console.log("Error: no title found in the event", event_box);
            return;
        }
        if (event_detail == undefined) {
            console.log("Error: no detail found in the event", event_box);
            return;
        }

        event_box.addEventListener("click", function (e) {
            if (ongoing_period || ongoing_event) {
                return;
            }
            ongoing_event = true;
            switch_description(event_subbox, detail_box, event_title, event_detail, 0.5);
        });
    }

    handle_input_period(1);
    handle_input_period(2);
    handle_input_period(3);
    handle_input_period(4);

    let events = document.getElementsByClassName("event");
    console.log(events);
    for (let event of events) {
        handle_event(event);
    }

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
    timeline.style.display = "flex";

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

        line_mve.style.height = line_org.offsetHeight * (1. - t) + line_dst.offsetHeight * t + "px";
        line_mve.style.top = line_org_.top * (1. - t) + line_dst_.top * t + "px";
        line_mve.style.left = line_org_.left * (1. - t) + line_dst_.left * t + "px";

        if ((start == null)) {
            line_mve.style.display = "none";
            line_dst.style.opacity = 1.0;
            anim_events(which);
        }
    }

    window.requestAnimationFrame(step_line);
}

function anim_events(which, duration = 1.) {

    let all_events = document.getElementsByClassName("event");
    let events = []
    for (i = 0; i < all_events.length; i++) {
        if (all_events[i].parentElement.id[2] == which) {
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

        if (start == null) ongoing_period = false;
    }

    window.requestAnimationFrame(step);
}

function anim_leave_period(to_fadeout, to_fadein, duration = 2.) {
    let start = null;
    duration *= 1000;

    let timeline = document.getElementById("tl" + to_fadeout);
    
    let line_org = document.getElementById("P" + to_fadeout + "_line");
    let line_mve = document.getElementById("P" + to_fadeout + "_line_mv");
    let line_dst = document.getElementById("P" + to_fadeout + "_line_bis");    
    line_mve.style.display = "flex";
    line_mve.style.position = "absolute";
    let line_org_ = cumulativeOffset(line_org);
    let line_dst_ = cumulativeOffset(line_dst);
    let dst_height = line_dst.offsetHeight;
    line_dst.style.opacity = 0;

    let all_events = document.getElementsByClassName("event");
    let events = []
    for (i = 0; i < all_events.length; i++) {
        if (all_events[i].parentElement.id[2] == to_fadeout) {
            events.push(all_events[i]);
        }
    }

    function step_line(timestamp) {
        if (!start) {    
            start = timestamp;
            line_mve.style.top = line_dst_.top + "px";
            line_mve.style.left = line_dst_.left + "px";
        } 
        let t = easeInOut((timestamp - start) / duration);
        if (timestamp - start < duration) {
            window.requestAnimationFrame(step_line);
        } else {
            t = 1.;
            start = null;
        }

        // Move back the line
        line_mve.style.height = line_org.offsetHeight * t + dst_height * (1. - t) + "px";
        line_mve.style.top = line_org_.top * t + line_dst_.top * (1. - t) + "px";
        line_mve.style.left = line_org_.left * t + line_dst_.left * (1. - t) + "px";

        // Fade out the events
        for (i = 0; i < events.length; i++) {
            events[i].style.opacity = 1. - t;
        }

        if (start == null) {
            timeline.style.display = "none";
            line_mve.style.display = "none";
            if (to_fadeout == to_fadein) ongoing_period = false;
        }
    }

    document.getElementById("explainer").style.opacity = 0.;
    window.requestAnimationFrame(step_line);
}

function switch_description(event_box, info_box, title_elem, detail_elem, duration=1.) {
    let start = null;
    let init_width = event_box.getBoundingClientRect().width;
    
    console.log(((current_event == undefined) || (current_event != event_box)));
    if ((current_event == undefined) || (current_event != event_box)) {
        // Complicated stuff, just to have the correct size, as fit-content is not dynamic !
        let outer_box = info_box.children[0];
        let inner_box = outer_box.children[0];
        let padding = parseInt(window.getComputedStyle(outer_box, null).getPropertyValue('padding-top'));
        inner_box.textContent = title_elem.textContent;
        outer_box.style.height = 2*padding + inner_box.offsetHeight + "px";
        
        outer_box = info_box.children[1];
        inner_box = outer_box.children[0];
        padding = parseInt(window.getComputedStyle(outer_box, null).getPropertyValue('padding-top'))
        inner_box.innerHTML = detail_elem.innerHTML;
        let inner_margin = 0.;
        inner_margin += parseInt(window.getComputedStyle(inner_box.children[0], null).getPropertyValue('margin-top'));
        inner_margin += parseInt(window.getComputedStyle(inner_box.children[inner_box.children.length-1], null).getPropertyValue('margin-bottom'));
        outer_box.style.height = 2*padding + inner_margin + inner_box.offsetHeight + "px";
        // End of complicated stuff
        
        info_box.style.opacity = 1.;
        current_event = event_box;
    } else {
        info_box.style.opacity = 0.;
        current_event = undefined;
    }


    function step(timestamp) {
        if (!start) start = timestamp;
        let t = easeInOut((timestamp - start) / (duration * 1000));

        if (timestamp - start < duration * 1000) {
            window.requestAnimationFrame(step);
        } else {
            t = 1.;
            start = null;
        }

        let delta = 4 * t * (1. - t) * 15;
        event_box.style.marginTop = delta + "px";
        event_box.style.marginBottom = delta + "px";
        event_box.style.paddingTop = delta + "px";
        event_box.style.paddingBottom = delta + "px";
        event_box.style.width = init_width - delta + "px";
        
        if (start == null) {
            ongoing_event = false;
        }
    }
    
    window.requestAnimationFrame(step);
}
