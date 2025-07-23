import numpy as np
import matplotlib
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection
from matplotlib.patches import Patch
from numpy import pi, sin, cos

# fmt: off
Months = [f"Mo {i + 1:02d}" for i in range(12)]
offset = 0.0  # year start to perihelion in [0, 1)

# Months = [
#     "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
#     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
# ]
# offset = 3.0 / 365.0  # year start to perihelion in [0, 1)

# Months = [
#     "Sa-Dh", "Ca-Ma", "Aq-Kh", "Pi-Mi", "Ar-Me", "Ta-Ri", 
#     "Ge-Mi", "Ca-Ka", "Le-Si", "Vi-Ka", "Li-Tu", "Sc-Vr",
# ]
# offset = 0.7259  # Mars spring equinox (year start) to perihelion
# fmt: on


def project_analemma(x1, x2, x3):
    norm = np.sqrt(x1 * x1 + x2 * x2 + x3 * x3)
    x1[:] /= norm
    x2[:] /= norm
    x3[:] /= norm
    mask = x1 <= 0.0
    x1[mask] = np.nan
    x2[mask] = np.nan
    x3[mask] = np.nan
    return


def approx_analemma(eps, e, g, M_astro):
    assert 0.0 <= e < 1.0
    assert 0. <= eps <= np.pi / 2.0
    assert 0 <= g <= 2 * np.pi
    
    M = M_astro - offset * 2 * np.pi  # M astro -> M civil
    mu = M + g

    ce, se = np.cos(eps), np.sin(eps)

    x1 = (1 + ce) / 2 - (1 - ce) / 2 * np.cos(2 * mu)
    x2 = (1 - ce) / 2 * np.sin(2 * mu)
    x3 = -se * np.cos(mu)

    x1 -= e * (1 + ce) * np.cos(mu - g) / 2
    x2 += e * (1 + ce) * np.sin(mu - g)
    x1 += e * (1 - ce) * (3 * np.cos(mu + g) - np.cos(3 * mu - g)) / 4
    x2 -= e * (1 - ce) * (3 * np.sin(mu + g) - np.sin(3 * mu - g)) / 4
    x3 += e * se * (3 * np.cos(g) - np.cos(2 * mu - g)) / 2

    return x1, x2, x3


def solve_analemma(tilt, ecc, g, M_astro):
    """ Solve the analemma for given parameters.
    Args:
        tilt (float): planet obliquity
        ecc (float): planet eccentricity
        g (float): winter solstice to perihelion angle
        M (np.ndarray): mean anomaly, in radians
        offset (float, optional): Winter solstice to year start in [0, 1)

    Returns:
        x1, x2, x3 (np.ndarray): Planet-Sun vector in planet-centric coords.
    """
    M = M_astro - offset * 2 * np.pi  # M astro -> M civil
    E = np.copy(M) + ecc * np.sin(M)
    for it in range(10):
        f = E - ecc * np.sin(E) - M
        df = 1 - ecc * np.cos(E)
        E -= f / df
    r = 1 - ecc * np.cos(E)
    cos_nu = (np.cos(E) - ecc) / r
    sin_nu = np.sqrt(1 - ecc * ecc) * np.sin(E) / r
        
    cos_gm, sin_gm = np.cos(g), np.sin(g)
    cos_ep, sin_ep = np.cos(tilt), np.sin(tilt)
    cos_nu_g = cos_nu * cos_gm - sin_nu * sin_gm
    sin_nu_g = sin_nu * cos_gm + cos_nu * sin_gm
    cos_th = -np.cos(M + g)
    sin_th = -np.sin(M + g)
    
    x1 = r * (-cos_ep * cos_nu_g * cos_th - sin_nu_g * sin_th)
    x2 = r * (+cos_ep * cos_nu_g * sin_th - sin_nu_g * cos_th)
    x3 = r * (-sin_ep * cos_nu_g)
    return x1, x2, x3


def find_solstice_angle(e, nu):
    coef =  1.0 + e * np.cos(nu)
    cos_E = (e + np.cos(nu)) / coef
    sin_E = np.sqrt(1 - e * e) * np.sin(nu) / coef
    # E = shift + ecc * np.sin(shift)
    # delta, tol = 1., 1e-9
    # it, max_iter = 0, 10
    # while it < max_iter and tol < np.abs(delta):
    #     f = E - ecc * np.sin(E) - shift
    #     df = 1 - ecc * np.cos(E)
    #     delta = f / df
    #     E -= delta
    #     it += 1
    # if it == max_iter:
    #     print("Warning: did not converge in find_solstice_angle")
    return cos_E, sin_E


def find_cutoff(tilt, ax):
    if np.abs(tilt) < np.pi / 2:
        ts = np.array([])
    else:
        arg = (1.0 + np.cos(tilt)) / (1.0 - np.cos(tilt))
        t1 = np.arccos(arg) / 2.0
        t2 = np.pi - t1
        t3 = np.pi + t1
        t4 = 2 * np.pi - t1
        ts = np.array([t1, t2, t3, t4])
        ax.plot(
            -1 / 2 * (1 - np.cos(tilt)) * np.sin(2 * ts),
            -np.sin(tilt) * np.cos(ts),
            "o",
            alpha=1.0,
        )
    return ts


def add_legend(ax, colors, pos, kwargs=dict()):
    legend_elements = [
        Patch(facecolor=color, edgecolor="none", label=f"{month}")
        for color, month in zip(colors, Months)
    ]
    ax.legend(
        handles=legend_elements,
        loc="center right",
        ncols=1,
        labelspacing=1.0,
        bbox_to_anchor=pos,
        **kwargs
    )
    return


def add_directions(ax):
    ax.text(0, +1.20, "North", ha="center", va="top", fontsize=12)
    ax.text(0, -1.20, "South", ha="center", va="bottom", fontsize=12)
    ax.text(+1.20, 0, "West", ha="right", va="center", fontsize=12)
    ax.text(-1.20, 0, "East", ha="left", va="center", fontsize=12)
    return


def plot_analemma(tilt_list, ecc, shift, savefig=""):
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.set_aspect("equal")
    ax.set_xlim(-1.2, 1.2)
    ax.set_ylim(-1.2, 1.2)

    # Plot the analemma
    n = 150
    n_colors = 12
    t = np.linspace(0, 2.0 * np.pi, n_colors * n + 1)
    # t_labels = np.array([1, 1, 1, 1, 1, 1]) * (n * n_colors // 2)
    # t_labels[-1] = 550

    colors = plt.get_cmap("turbo")(np.linspace(0.0, 1.0, n_colors))
    line_colors = np.repeat(colors, n, axis=0)
    tilts = np.deg2rad(np.array(tilt_list))

    for i, eps in enumerate(tilts):
        x1, x2, x3 = approx_analemma(eps, ecc, shift, t)
        project_analemma(x1, x2, x3)
        x, y, z = -x2, x3, x1
        label = r"$\epsilon={:.0f}^\circ$".format(np.rad2deg(eps))
        sign = 1
        t_label = np.argmax(sign * y) if i < 5 else 500
        ha = "center" if i < 5 else "left"
        va = "bottom" if sign > 0 else "top"
        xl, yl = x[t_label], y[t_label]
        xl += 0.0 if i < 5 else 0.10
        ax.text(xl, yl, label, fontsize=12, ha=ha, va=va)
        # find_cutoff(eps, ax)
        x[z <= 0] = np.nan
        y[z <= 0] = np.nan

        points = np.array([x, y]).T.reshape(-1, 1, 2)
        segments = np.concatenate([points[:-1], points[1:]], axis=1)
        lc = LineCollection(segments, colors=line_colors)
        lc.set_linewidth(2)
        ax.add_collection(lc)

    ax.plot(np.cos(t), np.sin(t), color="k", lw=0.5, ls="-", alpha=0.5)
    ax.set_aspect("equal")
    add_legend(ax, colors, (1.20, +0.5))
    add_directions(ax)
    ax.axis("off")
    fig.tight_layout()
    if savefig:
        fig.savefig("./Analemma/analemma_plot.pdf")
    return


def compare(tilt, ecc, shift, savefig=""):
    zoom = 2.0
    size_in = 4.5
    radius = size_in / 2.0 * zoom
    pad, pad_top = 0.05, 0.17
    size = size_in + pad
    size_x = size * 0.6
    n_cols = 3
    figsize = (n_cols * size_x, size * (1 + pad_top))
    fig, ax = plt.subplots(1, 1, figsize=figsize)

    n = 200
    m = 12
    t = np.linspace(0, 2 * np.pi, m * n + 1)
    colors = plt.get_cmap("turbo")(np.linspace(0.0, 1.0, m))
    line_colors = np.repeat(colors, n, axis=0)
    
    params = [
        (np.deg2rad(tilt), 0.0, 0.0, ":", 0.5),
        (np.deg2rad(tilt), ecc, 0.0, "--", 1.5),
        (np.deg2rad(tilt), ecc, shift, "-", 2.5),
    ]

    for col, (eps, e, g, ls, lw) in enumerate(params):
        cx = col * size_x
        cy = 0.0
        # Plot the approximation
        x1, x2, x3 = approx_analemma(eps, e, g, t)
        project_analemma(x1, x2, x3)
        x = cx + radius * (-x2)
        y = cy + radius * (+x3)
        # ax.plot(x, y, color="black", lw=0.5, alpha=1.0)
        
        # Plot the analemma
        x1, x2, x3 = solve_analemma(eps, e, g, t)
        project_analemma(x1, x2, x3)
        x = cx + radius * (-x2)
        y = cy + radius * (+x3)
        dx2 = np.gradient(x2, 2 * np.pi / (m * n))
        dx3 = np.gradient(x3, 2 * np.pi / (m * n))
        ref_speed = 0.5
        speed = np.sqrt(dx2 * dx2 + dx3 * dx3) / ref_speed
        points = np.array([x, y]).T.reshape(-1, 1, 2)
        segments = np.concatenate([points[:-1], points[1:]], axis=1)
        lc = LineCollection(segments, colors=line_colors)
        lc.set_linewidth(2.0 / speed ** 0.75)
        # lc.set_linewidth(2.5 / speed ** 0.60)
        ax.add_collection(lc)
        
        # Plot cardinal directions
        d = 0.15 * radius
        ax.plot([cx - d, cx + d], [cy, cy], "k", lw=0.5, alpha=0.5)
        ax.plot([cx, cx], [cy - 3 * d, cy + 3 * d], "k", lw=0.5, alpha=0.5)
        ax.text(cx - 1.05 * d, -0.10 * d, "E", ha="right", fontsize=12)
        ax.text(cx + 1.05 * d, -0.10 * d, "W", ha="left", fontsize=12)
        ax.text(cx - 0.05 * d, -3.1 * d, "S", va="top", fontsize=12)
        ax.text(cx - 0.05 * d, +3.05 * d, "N", va="bottom", fontsize=12)
        
        # Plot the horizon of the observer
        # x = cx + radius * np.cos(t)
        # y = cy + radius * np.sin(t)
        # ax.plot(x, y, color="lightgrey", lw=0.5, alpha=1)

        x_text = cx - 0.065 * size_in
        y_text = size / 2.0 + pad_top * size
        text = r"$\epsilon\:=\,{:.0f}^\circ$".format(np.rad2deg(eps))
        text += "\n" + r"$e\:=\,{:.3g}$".format(e)
        text += "\n" + r"$\gamma\,=\,{:.0f}^\circ$".format(np.rad2deg(g))
        ax.text(x_text, y_text, text, ha="left", va="top", fontsize=14)

    x_max = -size_x / 2.0 + n_cols * size_x + 0.4 * size_x
    add_legend(ax, colors, (x_max, 0.0), dict(bbox_transform=ax.transData))
    ax.set_aspect("equal")
    ax.set_xlim(-size_x / 2.0, n_cols * size_x - size_x / 2.0)
    ax.set_ylim(-size / 2.0, size / 2.0 + size * pad_top)
    ax.axis("off")
    fig.tight_layout()
    if savefig:
        fig.savefig(savefig)

    return


def mosaic(tilt, ecc_list, shift_list, savefig=""):
    size_in = 1.5
    radius = size_in / 2.0
    pad = 0.1
    size = size_in + pad
    n_cols = len(ecc_list)
    n_rows = len(shift_list)
    pad_top = 0.0
    figsize = (n_cols * size, (1 + n_rows) * size)
    fig, ax = plt.subplots(1, 1, figsize=figsize)

    n = 200
    m = 12
    t = np.linspace(0, 2 * np.pi, m * n + 1)
    eps = np.deg2rad(tilt)
    ecc_list = np.array(ecc_list)
    shift_list = np.array(shift_list) * 2 * np.pi

    colors = plt.get_cmap("turbo")(np.linspace(0.0, 1.0, m))
    line_colors = np.repeat(colors, n, axis=0)    

    # for row, g in enumerate(shift_list):
    #     cx = -size - 0.5
    #     cy = -row * size
    #     text = r"$\gamma={:.2f}\cdot2\pi$".format(g / (2 * np.pi))
    #     ax.text(cx, cy, text, fontsize=12, ha="left", va="center")

    for col, e in enumerate(ecc_list):
        cx = col * size
        cy_top = size * (1 + pad_top)
        b = np.sqrt(1 - e * e)
        x_sun = cx + radius * e
        ax.plot(x_sun, cy_top, "ok", ms=4, markerfacecolor='none')
        x = cx + radius * np.cos(t)
        y = cy_top + radius * np.sin(t) * b
        ax.plot(x, y, color="k", lw=0.5, ls="-")
        for row, g in enumerate(shift_list):
            cy = -row * size
            # Plot the approximation
            x1, x2, x3 = approx_analemma(eps, e, g, t)
            project_analemma(x1, x2, x3)
            x = cx + radius * (-x2)
            y = cy + radius * (+x3)
            ax.plot(x, y, color="grey", lw=0.75)
            
            # Plot the analemma
            x1, x2, x3 = solve_analemma(eps, e, g, t)
            project_analemma(x1, x2, x3)
            x = cx + radius * (-x2)
            y = cy + radius * (+x3)
            points = np.array([x, y]).T.reshape(-1, 1, 2)
            segments = np.concatenate([points[:-1], points[1:]], axis=1)
            lc = LineCollection(segments, colors=line_colors)
            lc.set_linewidth(1.25)
            ax.add_collection(lc)

            # Plot the horizon of the observer
            x = cx + radius * np.cos(t)
            y = cy + radius * np.sin(t)
            ax.plot(x, y, color="lightgrey", lw=0.5, ls="-", alpha=1)
            # Plot the solstice position on ellipse
            cos_Eg, sin_Eg = find_solstice_angle(e, g)
            x = +radius * cos_Eg
            y = -radius * sin_Eg * b
            ax.plot(cx + x, cy_top + y, "-o", lw=0.5, color="k", ms=2.0)
            # dd = 0.4
            # xx = x + np.array([-pad, pad]) * x * dd
            # yy = y + np.array([-pad, pad]) * y / b * dd
            # ax.plot(cx + xx, cy_top + yy, ls="-", lw=0.5, color="k")

    ax.set_aspect("equal")
    ax.set_xlim(-size / 2.0, n_cols * size - size / 2.0)
    ax.set_ylim(-n_rows * size + size / 2.0, size * (1 + pad_top) + size / 2.0)
    ax.axis("off")
    fig.tight_layout()
    if savefig:
        fig.savefig(savefig)

    return


if __name__ == "__main__":
    plt.rcParams.update({"text.usetex": True})

    # plot_analemma(
    #     tilt_list=[15, 23.44, 35, 50, 85],
    #     # tilt_list=[23.44],
    #     ecc=0.0,
    #     shift=0.0,
    #     # savefig="./Analemma/analemma_plot.pdf",
    # )
    # plt.show()
    
    # compare(
    #     tilt=23.44,
    #     ecc=0.017,
    #     shift=np.deg2rad(12.93),
    #     # tilt=25.19,
    #     # ecc=0.093,
    #     # shift=np.deg2rad(341),
    #     # savefig="./Analemma/comparison.pdf",
    # )
    # plt.show()

    mosaic(
        tilt=35,
        ecc_list=[0.01, 0.05, 0.15, 0.3, 0.6, 0.9],
        shift_list=np.linspace(0, 0.5, 7, endpoint=True),
        savefig="./Analemma/mosaic.pdf",
    )
    plt.show()
