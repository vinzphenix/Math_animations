import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
from move_digits import set_positions, smooth, interp_angle


def initialize_positions(h, w, d, p):
    N = 22
    l = 0.5 * h + d

    xL = (5 * h + 4 * p) * (-0.5)
    xR = (5 * h + 4 * p) * (+0.5)
    xl = (4 * h + 3 * p) * (-0.5)
    xr = (4 * h + 3 * p) * (+0.5)

    mat_x = np.zeros((N, 4))
    mat_y = np.zeros((N, 4))
    mat_a = np.zeros((N, 4))
    mat_s = np.zeros((N, 4))

    # Initial positions
    mat_x[:, 0] = np.linspace(xL, xR, N)
    mat_y[:, 0] = 0.0
    mat_a[:, 0] = np.pi / 2.0

    # Digit 2
    x_shift = xl + l
    mat_x[0:5, 1] = np.array([0.0, l, 0.0, -l, 0.0]) + x_shift
    mat_y[0:5, 1] = np.array([2 * l, l, 0.0, -l, -2 * l])
    mat_a[0:5, 1] = np.array([0.0, 0.5, 0.0, 0.5, 0.0]) * np.pi
    # Digit 0
    x_shift = xl + h + p + l
    mat_x[5:11, 1] = np.array([-l, 0.0, l, l, 0.0, -l]) + x_shift
    mat_y[5:11, 1] = np.array([-l, -2 * l, -l, l, 2 * l, l])
    mat_a[5:11, 1] = np.array([0.5, 0.0, 0.5, 0.5, 0.0, 0.5]) * np.pi
    # Digit 2
    mat_x[11:16, 1] = mat_x[0:5, 1] + 2 * (h + p)
    mat_y[11:16, 1] = mat_y[0:5, 1]
    mat_a[11:16, 1] = mat_a[0:5, 1]
    # Digit 6
    x_shift = xl + 3 * (h + p) + l
    mat_x[16:22, 1] = np.array([0.0, -l, -l, 0.0, l, 0.0]) + x_shift
    mat_y[16:22, 1] = np.array([2 * l, l, -l, -2 * l, -l, 0.0])
    mat_a[16:22, 1] = np.array([0.0, 0.5, 0.5, 0.0, 0.5, 0.0]) * np.pi

    # Letter E
    x_shift = xL + l
    mat_x[0:5, 2] = np.array([0.0, -l, 0.0, -l, 0.0]) + x_shift
    mat_y[0:5, 2] = np.array([2 * l, l, 0.0, -l, -2 * l])
    mat_a[0:5, 2] = np.array([0.0, 0.5, 0.0, 0.5, 0.0]) * np.pi
    # Letter U
    x_shift = xL + h + p + l
    mat_x[5:8, 2] = np.array([-l, 0.0, l]) + x_shift
    mat_y[5:8, 2] = np.array([-l, -2 * l, -l])
    mat_a[5:8, 2] = np.array([0.5, 0.0, 0.5]) * np.pi
    # Letter L
    x_shift = xL + 2 * (h + p) + l
    mat_x[8:11, 2] = np.array([0.0, -l, -l]) + x_shift
    mat_y[8:11, 2] = np.array([-2 * l, -l, l])
    mat_a[8:11, 2] = np.array([0.0, 0.5, 0.5]) * np.pi
    # Letter E
    mat_x[11:16, 2] = mat_x[0:5, 2] + 3 * (h + p)
    mat_y[11:16, 2] = mat_y[0:5, 2]
    mat_a[11:16, 2] = mat_a[0:5, 2]
    # Letter R
    x_shift = xL + 4 * (h + p) + l
    mat_x[16:22, 2] = np.array([0.0, -l, -l, 0.05*l, 0.0, l]) + x_shift
    mat_y[16:22, 2] = np.array([2 * l, l, -l, -1.05*l, 0.0, l])
    mat_a[16:22, 2] = np.array([0.0, 0.5, 0.5, 0.25, 0.0, 0.5]) * np.pi

    # Randomize final positions
    tmp = np.random.permutation(N)
    perm = np.empty(N, dtype=int)
    for i in range(N):
        perm[tmp[i]] = tmp[(i + 1) % N]
    mat_x[:, 3] = mat_x[:, 0]  # mat_x[perm, 0]
    mat_y[:, 3] = mat_y[:, 0]  # mat_y[perm, 0]
    mat_a[:, 3] = mat_a[:, 0]  # mat_a[perm, 0]
    
    # Set lengths
    mat_s[:, :] = 1.0
    mat_s[19, 2] = 0.94*np.sqrt(2)

    return mat_x, mat_y, mat_a, mat_s


def main(h, w, d, p, ta: int, tw: int, dt: int):
    xy_ref = np.zeros((6, 2))
    
    width = 5 * h + 4 * p
    xmin = -width * 0.55
    xmax = +width * 0.55
    ymin = -h * 1.25
    ymax = +h * 1.25
    matrices = initialize_positions(h, w, d, p)
    mat_x, mat_y, mat_a, mat_s = matrices
    N, _ = mat_x.shape
    
    kw = dict(facecolor="black", edgecolor="none")
    bars = [Polygon(xy_ref, closed=True, **kw) for _ in range(N)]
    fig, ax = plt.subplots(1, 1, figsize=(10, 5))

    for b, bar in enumerate(bars):
        ax.add_patch(bar)
    
    ax.axis([xmin, xmax, ymin, ymax])
    ax.set_aspect("equal")#, "datalim")
    ax.set_xticklabels([])
    ax.set_yticklabels([])
    ax.set_xticks([])
    ax.set_yticks([])
    ax.spines[['left', 'right', 'top', 'bottom']].set_visible(False)
    fig.tight_layout()
    
    f = 0
    for t in range(tw):
        times = np.zeros(N)
        set_positions(0, times, bars, h, w, *matrices)
        fig.savefig(f"./frames/frame_{f:04d}.png", dpi=150)
        f += 1
    for t in range(ta + (N - 1) * dt):
        times = t - dt * np.arange(N)
        times = np.clip(times, 0, ta - 1) / ta
        set_positions(0, times, bars, h, w, *matrices)
        fig.savefig(f"./frames/frame_{f:04d}.png", dpi=150)
        f += 1
    for t in range(tw):
        times = np.zeros(N)
        set_positions(1, times, bars, h, w, *matrices)
        fig.savefig(f"./frames/frame_{f:04d}.png", dpi=150)
        f += 1
    for t in range(ta + (N - 1) * dt):
        times = t - dt * np.arange(N)
        times = np.clip(times, 0, ta - 1) / ta
        set_positions(1, times, bars, h, w, *matrices)
        fig.savefig(f"./frames/frame_{f:04d}.png", dpi=150)
        f += 1
    for t in range(tw):
        times = np.zeros(N)
        set_positions(2, times, bars, h, w, *matrices)
        fig.savefig(f"./frames/frame_{f:04d}.png", dpi=150)
        f += 1
    for t in range(ta + (N - 1) * dt):
        times = t - dt * np.arange(N)
        times = np.clip(times, 0, ta - 1) / ta
        set_positions(2, times, bars, h, w, *matrices)
        fig.savefig(f"./frames/frame_{f:04d}.png", dpi=150)
        f += 1
    
    return


if __name__ == "__main__":
    # fmt: off
    main(
        h=1.0,
        w=0.1,
        d=0.015,
        p=0.4,
        ta=50,
        tw=100,
        dt=2
    )
