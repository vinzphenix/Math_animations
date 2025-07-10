class Point {
    #x;
    #y;
    constructor(x, y) {
        this.#x = x;
        this.#y = y;
    }
    get xy() {
        return [this.#x, this.#y];
    }
    get x() {
        return this.#x;
    }
    get y() {
        return this.#y;
    }
    set x(x) {
        this.#x = x;
    }
    set y(y) {
        this.#y = y;
    }
    set xy(xy) {
        this.#x = xy[0];
        this.#y = xy[1];
    }
}

class QuadEdge {
    #data;  // xy array
    #rot;  // QuadEdge
    #next; // QuadEdge
    constructor() {
        this.#data = null;
        this.#rot = null;
        this.#next = null;
    }
    get rot() {
        return this.#rot;
    }
    get sym() {
        return this.rot.rot;
    }
    get invRot() {
        return this.rot.rot.rot;
    }

    get onext() {
        return this.#next;
    }
    get lnext() {
        return this.invRot.onext.rot;
    }
    get rnext() {
        return this.rot.onext.invRot;
    }
    get dnext() {
        return this.sym.onext.sym;
    }

    get oprev() {
        return this.rot.onext.rot;
    }
    get lprev() {
        return this.onext.sym;
    }
    get rprev() {
        return this.sym.onext;
    }
    get dprev() {
        return this.invRot.onext.invRot;
    }

    get org() {
        return this.#data;
    }
    get dst() {
        return this.sym.org;
    }

    set org(data) {
        this.#data = data;
    }
    set rot(rot) {
        this.#rot = rot;
    }
    set onext(next) {
        this.#next = next;
    }

    static makeEdge(from, to) {  // p, q: Points
        let e1 = new QuadEdge();
        let e2 = new QuadEdge();
        let e3 = new QuadEdge();
        let e4 = new QuadEdge();

        e1.org = from;
        // e2.org = inf_point;
        e3.org = to;
        // e4.org = inf_point;

        e1.rot = e2;
        e2.rot = e3;
        e3.rot = e4;
        e4.rot = e1;

        e1.onext = e1;
        e2.onext = e4;
        e3.onext = e3;
        e4.onext = e2;
        return e1;
    }

    static splice(a, b) {  // a, b : QuadEdge
        let aa = a.onext.rot;
        let bb = b.onext.rot;

        let a_onext = a.onext;
        let b_onext = b.onext;
        let aa_onext = aa.onext;
        let bb_onext = bb.onext;

        a.onext = b_onext;
        b.onext = a_onext;
        aa.onext = bb_onext;
        bb.onext = aa_onext;
    }

    static connect(a, b) {  // a, b : QuadEdge
        let e = QuadEdge.makeEdge(a.dst, b.org);
        QuadEdge.splice(e, a.lnext);
        QuadEdge.splice(e.sym, b);
        return e;
    }

    static deleteEdge(e) {  // e : QuadEdge
        QuadEdge.splice(e, e.oprev);
        QuadEdge.splice(e.sym, e.sym.oprev);
    }

    static swap(e) {  // e : QuadEdge
        let a = e.oprev;
        let b = e.sym.oprev;
        QuadEdge.splice(e, a);
        QuadEdge.splice(e.sym, b);
        QuadEdge.splice(e, a.lnext);
        QuadEdge.splice(e.sym, b.lnext);
        e.org = a.dst;
        e.dst = b.dst;
    }
}


points_list = [
    [352, 960],
    [759, 629],
    [333, 606],
    [551, 800],
    [776, 991],
    [1355, 978],
    [1045, 835],
    [1170, 307],
    [681, 247],
];

function play_quad_edges() {
    a = QuadEdge.makeEdge(points_list[0], points_list[1]);
    b = QuadEdge.makeEdge(points_list[1], points_list[2]);
    QuadEdge.splice(a.sym, b);

    if (ccw(points_list[0], points_list[1], points_list[2])) {
        c = QuadEdge.connect(b, a);
        console.log("counterclockwise")
    } else if (ccw(points_list[0], points_list[2], points_list[1])) {
        c = QuadEdge.connect(b, a);
        console.log("clockwise")
    } else {
        console.log("colinear");
    }
    
    console.log(a.lprev == c);
    console.log(b.lprev == a);
    console.log(c == b.lnext);

    console.log(a.org, a.dst);
    console.log(a.lnext.org, a.lnext.dst);
    console.log(b.org, b.dst);

}
