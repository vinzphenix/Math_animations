import numpy as np
import matplotlib.pyplot as plt

ftSz1, ftSz2 = 20, 15
plt.rcParams["text.usetex"] = False
plt.rcParams['font.family'] = 'monospace'
tol = 0.02  # tolerance for "mouse near point"


def bSpline(t, T, i, p):
    if p == 0:  # t appartient a intervalle ?
        return (T[i] <= t) * (t < T[i + 1])  # True ou False
    u = 0.
    if T[i + p] != T[i]:
        u += (t - T[i]) / (T[i + p] - T[i]) * bSpline(t, T, i, p - 1)
    if T[i + p + 1] != T[i + 1]:
        u += (T[i + p + 1] - t) / (T[i + p + 1] - T[i + 1]) * bSpline(t, T, i + 1, p - 1)
    return u


def plot_all_curves():
    nodes.set_data(T, np.zeros_like(T))
    zone.set(xy=(T[p], 0.), width=T[-p - 1] - T[p])
    for curve, b_value in zip(curves, b_values):
        curve.set_data(t, b_value)
    for Ti, Yi, slider in zip(T, Y, sliders):
        slider.set_data(Ti, Yi)
    return


def onClick(event):
    global node_idx
    ix, iy = event.xdata, event.ydata
    idx_list = np.argwhere(np.logical_and(np.abs(T - ix) / n < tol, np.abs(Y - iy) < tol))
    if len(idx_list) > 0:
        node_idx = idx_list[0][0]
    return


def whileClick(event):
    ix, iy = event.xdata, event.ydata
    if ix is None or iy is None:
        return

    if node_idx == -1:
        idx_maxima = np.argmax(b_values, axis=1)
        coord_max, value_max = t[idx_maxima], b_values[np.arange(n - p), idx_maxima]
        curve_idx = np.argwhere(np.logical_and(np.abs(coord_max - ix) / n < 3 * tol, np.abs(value_max - iy) < 3 * tol))
        if len(curve_idx) > 0:  # close to maximum value
            for curve in curves:
                curve.set_alpha(0.5)
                curve.set_linewidth(1.5)
            curves[curve_idx[0][0]].set_alpha(1.)
            curves[curve_idx[0][0]].set_linewidth(3.)
            curves[curve_idx[0][0]].set_zorder(0)
        else:
            for curve in curves:
                curve.set_alpha(1.)
                curve.set_linewidth(1.5)
    else:
        # T[idx] = ix
        T[node_idx:][T[node_idx:] < ix] = min(ix, n)
        T[:node_idx + 1][T[:node_idx + 1] > ix] = max(ix, 0.)
        for j in range(n - p):
            b_values[j] = bSpline(t, T, j, p)
        plot_all_curves()
    fig.canvas.draw()
    return


def offClick(_):
    global node_idx
    node_idx = -1
    return


if __name__ == "__main__":
    n_int = 3
    p = 3
    n = n_int + 2 * p
    nt = 500

    T = np.arange(0., n + 1.)  # initial position of the nodes
    t = np.linspace(0., n, nt)  # continuous coordinates

    node_idx = -1
    b_values = np.empty((n - p, nt))
    for i in range(n - p):
        b_values[i] = bSpline(t, T, i, p)

    fig, ax = plt.subplots(1, 1, figsize=(10., 6.))

    Y = -0.05 - np.arange(1, n + 2) * 0.02
    _ = [ax.plot(t, Y[i] * np.ones_like(t), color='grey', lw=1)[0] for i in range(n + 1)]
    sliders = [ax.plot([], [], color='black', ls='', marker='o', ms=10)[0] for i in range(n + 1)]
    nodes, = ax.plot([], [], ls='', marker='o', ms=5, color='black')
    curves = [ax.plot([], [], color=f'C{i:d}', label=r'$B_{{{:d}}}^{{{:d}}}$'.format(i, p))[0] for i in range(n - p)]
    zone = plt.Rectangle((T[p], 0.), T[-p - 1] - T[p], 1., alpha=0.25, color='grey')
    ax.add_patch(zone)
    plot_all_curves()

    ax.grid(ls=':')
    ax.legend(loc='upper right', fontsize=ftSz2)
    ax.set_xlabel("t", fontsize=ftSz2)
    ax.axis([-0.5, n + 0.5, Y[-1] - 0.05, 1.10])
    fig.canvas.mpl_connect('button_press_event', onClick)
    fig.canvas.mpl_connect('motion_notify_event', whileClick)
    fig.canvas.mpl_connect('button_release_event', offClick)

    fig.tight_layout()
    plt.show()
