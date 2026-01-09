import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
from move_digits import set_positions, get_character


def initialize_positions(h, d, p, w):
    N = 16
    l = 0.5 * h + d

    xl1 = (4 * h + 3 * p) * (-0.5)
    xr1 = (4 * h + 3 * p) * (+0.5)
    xl2 = (4 * h + 3 * p) * (-0.5)
    xr2 = (4 * h + 3 * p) * (+0.5)

    mat_x = np.zeros((N, 4))
    mat_y = np.zeros((N, 4))
    mat_a = np.zeros((N, 4))
    mat_s = np.zeros((N, 4))

    k1 = k2 = 0
    # Letter L
    mx, my, ma, ms = get_character("L", l)
    k2 += mx.size
    mat_x[k1:k2, 0] = mx + xl1 + l
    mat_y[k1:k2, 0] = my
    mat_a[k1:k2, 0] = ma
    mat_s[k1:k2, 0] = ms
    k1 = k2
    # Letter E
    mx, my, ma, ms = get_character("E", l)
    k2 += mx.size
    mat_x[k1:k2, 0] = mx + xl1 + 1 * (h + p) + l
    mat_y[k1:k2, 0] = my
    mat_a[k1:k2, 0] = ma
    mat_s[k1:k2, 0] = ms
    k1 = k2
    # Letter P
    mx, my, ma, ms = get_character("P", l)
    k2 += mx.size
    mat_x[k1:k2, 0] = mx + xl1 + 2 * (h + p) + l
    mat_y[k1:k2, 0] = my
    mat_a[k1:k2, 0] = ma
    mat_s[k1:k2, 0] = ms
    k1 = k2
    # Letter L
    mx, my, ma, ms = get_character("L", l)
    # mx, my, ma = mx[::-1], my[::-1], ma[::-1]
    k2 += mx.size
    mat_x[k1:k2, 0] = mx + xl1 + 3 * (h + p) + l
    mat_y[k1:k2, 0] = my
    mat_a[k1:k2, 0] = ma
    mat_s[k1:k2, 0] = ms
    k1 = k2
    print(k2)

    k1 = k2 = 0
    # Digit 1
    mx, my, ma, ms = get_character("1", l)
    k2 += mx.size
    mat_x[k1:k2, 1] = mx + xl1 + l
    mat_y[k1:k2, 1] = my
    mat_a[k1:k2, 1] = ma
    mat_s[k1:k2, 1] = ms
    k1 = k2
    # Central dot
    k2 += 1
    mat_x[k1:k2, 1] = np.array([+0]) * l + xl1 + 2 * (h + p) + l
    mat_y[k1:k2, 1] = np.array([+0]) * l
    mat_a[k1:k2, 1] = np.array([+0]) * np.pi / 2.0
    mat_s[k1:k2, 1] = np.array([+1]) * w
    k1 = k2
    # Digit 2
    mx, my, ma, ms = get_character("2", l)
    k2 += mx.size
    mat_x[k1:k2, 1] = mx + xl1 + 1 * (h + p) + l
    mat_y[k1:k2, 1] = my
    mat_a[k1:k2, 1] = ma
    mat_s[k1:k2, 1] = ms
    k1 = k2
    # Digit 0
    mx, my, ma, ms = get_character("0", l)
    mx, my, ma = np.roll(mx, -2), np.roll(my, -2), np.roll(ma, -2)
    k2 += mx.size
    mat_x[k1:k2, 1] = mx + xl1 + 2 * (h + p) + l
    mat_y[k1:k2, 1] = my
    mat_a[k1:k2, 1] = ma
    mat_s[k1:k2, 1] = ms
    k1 = k2
    # Digit 1
    mx, my, ma, ms = get_character("1", l)
    k2 += mx.size
    mat_x[k1:k2, 1] = mx + xl1 + 3 * (h + p) + l
    mat_y[k1:k2, 1] = my
    mat_a[k1:k2, 1] = ma
    mat_s[k1:k2, 1] = ms
    k1 = k2
    print(k2)

    mat_x[:, 2] = mat_x[:, 0]
    mat_y[:, 2] = mat_y[:, 0]
    mat_a[:, 2] = mat_a[:, 0]
    mat_s[:, 2] = mat_s[:, 0]

    return mat_x, mat_y, mat_a, mat_s


def main(h, w, d, p, ta: int, tw: int, dt: int):
    xy_ref = np.zeros((6, 2))

    width = 4 * h + 3 * p
    xmin = -width * 0.55
    xmax = +width * 0.55
    ymin = -h * 1.35
    ymax = +h * 1.35
    matrices = initialize_positions(h, d, p, w)
    mat_x, mat_y, mat_a, mat_s = matrices
    N, _ = mat_x.shape

    kw = dict(facecolor="black", edgecolor="none")
    bars = [Polygon(xy_ref, closed=True, **kw) for _ in range(N)]
    fig, ax = plt.subplots(1, 1, figsize=(6, 3))

    for b, bar in enumerate(bars):
        ax.add_patch(bar)

    ax.axis([xmin, xmax, ymin, ymax])
    ax.set_aspect("equal")  # , "datalim")
    ax.set_xticklabels([])
    ax.set_yticklabels([])
    ax.set_xticks([])
    ax.set_yticks([])
    ax.spines[["left", "right", "top", "bottom"]].set_visible(False)
    fig.tight_layout()

    dir_name = "Digits/frames_1201"

    f = 0
    for t in range(tw):
        times = np.zeros(N)
        set_positions(0, times, bars, h, w, *matrices)
        fig.savefig(f"./{dir_name}/frame_{f:04d}.png", dpi=150)
        f += 1
    for t in range(ta + (N - 1) * dt):
        times = t - dt * np.arange(N)
        times = np.clip(times, 0, ta - 1) / ta
        set_positions(0, times, bars, h, w, *matrices)
        fig.savefig(f"./{dir_name}/frame_{f:04d}.png", dpi=150)
        f += 1
    for t in range(tw):
        times = np.zeros(N)
        set_positions(1, times, bars, h, w, *matrices)
        fig.savefig(f"./{dir_name}/frame_{f:04d}.png", dpi=150)
        f += 1
    for t in range(ta + (N - 1) * dt):
        times = t - dt * np.arange(N)
        times = np.clip(times, 0, ta - 1) / ta
        set_positions(1, times, bars, h, w, *matrices)
        fig.savefig(f"./{dir_name}/frame_{f:04d}.png", dpi=150)
        f += 1
    
    return


if __name__ == "__main__":
    # fmt: off
    main(
        h=1.0,
        w=0.1,
        d=0.015,
        p=0.4,
        ta=100,
        tw=50,
        dt=2
    )
