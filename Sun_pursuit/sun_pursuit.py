import numpy as np
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection
plt.rcParams["text.usetex"] = True
plt.rcParams["font.family"] = "serif"

def compute_path(l, s, n=500):
    dt = 2 * np.pi / n
    _2p = 2 * np.pi
    e = np.deg2rad(23.44)  # Earth's axial tilt in radians
    e = e * np.cos(s * _2p)
    if l + e >= np.pi / 2:
        t1 = 0.0
        t2 = _2p
    elif l - e >= np.pi / 2:
        return np.array([]), np.array([]), np.array([])
    else:
        t1 = +np.arccos(np.tan(e) * np.tan(l)) + 0.0
        t2 = -np.arccos(np.tan(e) * np.tan(l)) + _2p
    n = int(np.ceil((t2 - t1) / dt))
    t = np.linspace(t1, t2, n)
    ce, se = np.cos(e), np.sin(e)
    cl, sl = np.cos(l), np.sin(l)
    ct, st = np.cos(t), np.sin(t)
    x = -ce * ct + ce * np.cos(t1)
    y = ce * sl * st - ce * sl * np.sin(t1) + se * cl * (t - t1)
    return t / (2.0 * np.pi), x, y


def plot_paths(nl, ns):
    latitudes = np.linspace(0.0, np.deg2rad(90), nl)
    seasons = np.linspace(0.0, 1.0, ns + 1)[:-1] + 0 / 365.0
    box_scale = 1.3
    outer_scale = 1.4
    inner_scale = 0.33
    xsft, ysft = 2.5 * outer_scale, 0.25 * outer_scale
    w, h = outer_scale * ns + xsft, outer_scale * nl + ysft
    xmax, ymax = w, h

    fig, ax = plt.subplots(1, 1, figsize=(w, h))
    # ax.set_facecolor((0.9, 0.9, 0.9))
    kw = dict(ha="center", va="center", fontsize=13, multialignment='center')
    labels = [
        "Summer\nsolstice",
        "",
        "",
        "Autumn\nequinox",
        "",
        "",
        "Winter\nsolstice",
        "",
        "",
        "Spring\nequinox",
        "",
        "",
    ]

    for i, s in enumerate(seasons):
        xm = outer_scale * (i + 0.5) + xsft
        ax.text(xm, ysft / 4.0, labels[i], **kw)
        for j, l in enumerate(latitudes):
            t, x, y = compute_path(l, s)
            colors = plt.get_cmap("winter")(t)
            ym = outer_scale * (j + 0.5) + ysft

            x = inner_scale * x
            y = inner_scale * y
            x1 = xm - box_scale / 2
            x2 = xm + box_scale / 2
            y1 = ym - box_scale / 2
            y2 = ym + box_scale / 2
            x += xm
            y += ym
            if x.size > 0:
                ax.plot(x[+0], y[+0], "o", color=colors[+0], markersize=3)
                # ax.plot(x[-1], y[-1], "o", color=colors[-1], markersize=3)
                color = (0.9, 0.9, 0.9) if j != 5 else (0.82, 0.82, 0.82)
                ax.fill_between([x1, x2], y1, y2, color=color, zorder=-1)
        
            points = np.array([x, y]).T.reshape(-1, 1, 2)
            segments = np.concatenate([points[:-1], points[1:]], axis=1)
            lc = LineCollection(segments, colors=colors, alpha=1.0)
            lc.set_linewidth(2.0)
            ax.add_collection(lc)
            
            if i == 0:
                ax.text(xsft - 0.30, ym, f"{np.rad2deg(l):3.0f}°N", **kw)
            # ax.plot(x, y, color="black")
    
    ft = 13
    cx, cy = xsft + outer_scale * 6.5, ysft + outer_scale * 8.5
    ax.plot([cx, cx + 1.0], [cy, cy + 0.0], color="black", lw=2.0)
    ax.plot([cx, cx + 0.0], [cy, cy + 1.0], color="black", lw=2.0)
    ax.plot([cx, cx - 1.0], [cy, cy + 0.0], color="black", lw=2.0)
    ax.plot([cx, cx + 0.0], [cy, cy - 1.0], color="black", lw=2.0)
    ax.text(cx + 1.2, cy + 0.0, "East", ha="left", va="center", fontsize=ft)
    ax.text(cx + 0.0, cy + 1.2, "North", ha="center", va="bottom", fontsize=ft)
    ax.text(cx - 1.2, cy + 0.0, "West", ha="right", va="center", fontsize=ft)
    ax.text(cx + 0.0, cy - 1.2, "South", ha="center", va="top", fontsize=ft)
    
    text = f"What\n\nhappens\n\nwhen\n\nyou\n\nchase\n\nthe\n\nSun\n\nall\n\nday\n\nlong?"
    kw = dict(ha="center", va="center", fontsize=22, multialignment='center')
    ax.text(xsft / 3.0, ymax / 2.0, text, **kw)
    
    ax.axis('off')
    ax.axis([0.0, xmax, 0.0, ymax])
    ax.set_aspect("equal")# , "datalim")
    fig.tight_layout()
    fig.savefig("./sun_pursuit.pdf", dpi=600)
    # plt.show()


if __name__ == "__main__":
    plot_paths(nl=10, ns=12)
