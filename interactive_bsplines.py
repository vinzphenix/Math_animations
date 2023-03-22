import numpy as np
import matplotlib.pyplot as plt

ftSz1, ftSz2 = 20, 15
plt.rcParams["text.usetex"] = False
plt.rcParams['font.family'] = 'monospace'


def reset():
    global coords, currentIdx, displayPoly, typePolygon, typeCurve
    coords = np.array([[]]).reshape((0, 2))
    points.set_data([], [])
    edge.set_data([], [])
    curve.set_data([], [])
    currentIdx, displayPoly, typePolygon, typeCurve = -1, 1, 1, -1


def bSpline(t, T, i, p):
    if p == 0:  # t appartient a intervalle ?
        return (T[i] <= t) * (t < T[i + 1])  # True ou False
    u = 0.
    if T[i + p] != T[i]:
        u += (t - T[i]) / (T[i + p] - T[i]) * bSpline(t, T, i, p - 1)
    if T[i + p + 1] != T[i + 1]:
        u += (T[i + p + 1] - t) / (T[i + p + 1] - T[i + 1]) * bSpline(t, T, i + 1, p - 1)
    return u


def evalSpline(n, p, knots, control_X, control_Y, nEval):
    t = np.linspace(knots[p], knots[n], nEval, endpoint=False)
    B = np.zeros((n, len(t)))
    for i in range(n):
        B[i, :] = bSpline(t, knots, i, p)

    eval_x = np.dot(np.array(control_X), B)
    eval_y = np.dot(np.array(control_Y), B)
    return eval_x, eval_y


def getCurve(coords, p=3, openCurve=1, nEval=500):
    X = coords[:, 0]
    Y = coords[:, 1]
    cut = len(X)

    if openCurve:
        n = len(X)
        T = np.r_[np.zeros(p), np.arange(n - p + 1) / (n - p), np.ones(p)]
    else:
        X = np.r_[X, X[:p]]
        Y = np.r_[Y, Y[:p]]
        n = len(X)
        T = np.arange(n + p + 1) / (n + p)
        cut = -p + 1

    x, y = evalSpline(n, p, T, X, Y, nEval)
    return X[:cut], Y[:cut], x, y


def onClick(event):
    ix, iy = event.xdata, event.ydata
    global coords, currentIdx, displayPoly, typePolygon, typeCurve
    if ix is None or iy is None:
        return

    if event.button == 1:
        displayPoly = 1
        idx = np.argwhere(np.logical_and(abs(coords[:, 0] - ix) < tol, abs(coords[:, 1] - iy) < tol))
        if len(idx) > 0:
            currentIdx = idx[0, 0]
        else:
            coords = np.vstack([coords, [ix, iy]])
    elif event.button == 3 and 0 < len(coords):  # if there are points to be removed
        idx = np.argwhere(np.logical_and(abs(coords[:, 0] - ix) < tol, abs(coords[:, 1] - iy) < tol))
        coords = np.delete(coords, idx, axis=0)

    points.set_data(coords[:, 0], coords[:, 1])
    if typePolygon == 0:
        if 0 < len(coords):
            edge.set_data(coords[np.r_[-1:1]].T)
        else:
            edge.set_data([], [])
            typePolygon = 1

    if typeCurve != -1:
        if len(coords) < p + typeCurve:  # not enough points
            typeCurve = -1
            curve.set_data([], [])
        else:
            X, Y, x, y = getCurve(coords, p, openCurve=typeCurve, nEval=500)
            curve.set_data(x, y)

    fig.canvas.draw()
    return


def offClick(event):
    global currentIdx
    currentIdx = -1
    return


def whileClick(event):
    if event.button != 1 or currentIdx == -1:
        return

    global coords
    ix, iy = event.xdata, event.ydata

    coords[currentIdx] = np.array([ix, iy])
    points.set_data(coords[:, 0], coords[:, 1])
    if typePolygon == 0:
        edge.set_data(coords[np.r_[-1:1]].T)

    if typeCurve != -1:
        X, Y, x, y = getCurve(coords, p, openCurve=typeCurve, nEval=500)
        curve.set_data(x, y)

    fig.canvas.draw()
    return


def onKey(event):
    # enter : open curve
    # ctrl+enter : closed curve
    global displayPoly, typePolygon, typeCurve
    if event.key == 'C':
        reset()

    if event.key == ' ' and 3 <= len(coords):
        typePolygon = 1 - typePolygon
        if typePolygon == 0:
            edge.set_data(coords[np.r_[-1:1]].T)
        else:
            edge.set_data([], [])

    if event.key == 'h':
        displayPoly = 1 - displayPoly
        if displayPoly:
            points.set_data(coords[:, 0], coords[:, 1])
            if typePolygon == 0:
                edge.set_data(coords[np.r_[-1:1]].T)
        else:
            points.set_data([], [])
            edge.set_data([], [])

    if event.key == 'ctrl+enter' or event.key == 'enter':
        typeCurve = 0 if event.key == 'ctrl+enter' else 1
        if len(coords) < p + typeCurve:  # not enough points
            typeCurve = -1
            print("Not enough points to draw the B-spline")
            return
        X, Y, x, y = getCurve(coords, p, openCurve=typeCurve, nEval=500)
        curve.set_data(x, y)

    fig.canvas.draw()
    return


if __name__ == '__main__':

    coords = np.array([[]]).reshape((0, 2))
    p = 2
    tol = 0.05
    W, H = 10, 6

    currentIdx = -1
    displayPoly = 1
    typePolygon = 1  # 0
    typeCurve = -1  # -1 for nothing, 0 for closed, 1 for open

    fig, ax = plt.subplots(1, 1, figsize=(W, H), constrained_layout=False)
    ax.set_xlim([-W / H, W / H])
    ax.set_ylim([-1., 1.])
    ax.set_aspect('equal')

    title_1 = "[left click] to add     -   [right click] to delete   -   [space] to close polygon \n"
    title_2 = "drag and drop enabled   -   [maj+c] to clear          -   [h] to hide control points\n"
    title_3 = "[enter] for B-spline    -   [ctrl+enter] for closed B-spline"
    ax.set_title(title_1 + title_2 + title_3, loc='left')
    fig.tight_layout()

    points, = ax.plot(coords[:, 0], coords[:, 1], color='C0', alpha=0.75,
                      marker='o', markersize=10, markeredgecolor='none')
    edge, = ax.plot([], [], ls='--', color='C0', alpha=0.75, marker='o', markersize=10, markeredgecolor='none')
    curve, = ax.plot([], [], ls='-', lw=1.5, color='C1')

    left, width = .25, .5
    bottom, height = .25, .5
    right, top = left + width, bottom + height

    fig.canvas.mpl_connect('button_press_event', onClick)
    fig.canvas.mpl_connect('button_release_event', offClick)
    fig.canvas.mpl_connect('motion_notify_event', whileClick)
    fig.canvas.mpl_connect('key_press_event', onKey)

    plt.show()
    if len(coords) > 0:
        np.savetxt("coords_interactive.txt", coords, fmt="%.3e")
