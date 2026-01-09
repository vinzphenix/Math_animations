import numpy as np


def digit_0(l):
    mat_x = np.array([-1, +0, +1, +1, +0, -1]) * l
    mat_y = np.array([-1, -2, -1, +1, +2, +1]) * l
    mat_a = np.array([+1, +0, +1, +1, +0, +1]) * np.pi / 2.0
    mat_s = np.ones_like(mat_x)
    return mat_x, mat_y, mat_a, mat_s


def digit_1(l):
    mat_x = np.array([l, l])
    mat_y = np.array([-l, l])
    mat_a = np.array([0.5, 0.5]) * np.pi
    mat_s = np.ones_like(mat_x)
    return mat_x, mat_y, mat_a, mat_s


def digit_2(l):
    mat_x = np.array([0.0, l, 0.0, -l, 0.0])
    mat_y = np.array([2 * l, l, 0.0, -l, -2 * l])
    mat_a = np.array([0.0, 0.5, 0.0, 0.5, 0.0]) * np.pi
    mat_s = np.ones_like(mat_x)
    return mat_x, mat_y, mat_a, mat_s


def digit_6(l):
    mat_x = np.array([0.0, -l, -l, 0.0, l, 0.0])
    mat_y = np.array([2 * l, l, -l, -2 * l, -l, 0.0])
    mat_a = np.array([0.0, 0.5, 0.5, 0.0, 0.5, 0.0]) * np.pi
    mat_s = np.ones_like(mat_x)
    return mat_x, mat_y, mat_a, mat_s


def digit_8(l):
    mat_x = np.array([-1, +0, +1, +0, -1, +1, +0]) * l
    mat_y = np.array([-1, -2, -1, +0, +1, +1, +2]) * l
    mat_a = np.array([+1, +0, +1, +0, +1, +1, +0]) * np.pi / 2
    mat_s = np.ones_like(mat_x)
    return mat_x, mat_y, mat_a, mat_s


def digit_9(l):
    mat_x = np.array([+0, -1, +0, +1, +1, +0]) * l
    mat_y = np.array([+0, +1, +2, +1, -1, -2]) * l
    mat_a = np.array([+0, +1, +0, +1, +1, +0]) * np.pi / 2
    mat_s = np.ones_like(mat_x)
    return mat_x, mat_y, mat_a, mat_s


def digit_big_2(l):
    mat_x = np.array([+1, -1, -2, -2, -1, +1, +2, +2, +1, -1]) * l * 0.5
    mat_y = np.array([-4, -4, -3, -1, +0, +0, +1, +3, +4, +4]) * l * 0.5
    mat_a = np.array([+0, +0, +1, +1, +0, +0, +1, +1, +0, +0]) * np.pi / 2
    mat_s = np.ones_like(mat_x) * 0.5
    return mat_x, mat_y, mat_a, mat_s


def digit_big_8(l):
    mat_x = np.array([-2, +0, -2, +2, +2, +0, -2, +2, -2, +2, +0]) * l * 0.5
    mat_y = np.array([-3, -4, -1, -3, -1, +0, +1, +1, +3, +3, +4]) * l * 0.5
    mat_a = np.array([+1, +0, +1, +1, +1, +0, +1, +1, +1, +1, +0]) * np.pi / 2
    mat_s = np.array([+1, +2, +1, +1, +1, +2, +1, +1, +1, +1, +2]) * 0.5
    return mat_x, mat_y, mat_a, mat_s


def char_E(l):
    mat_x = np.array([0, -1, +0, -1, +0]) * l
    mat_y = np.array([2, +1, +0, -1, -2]) * l
    mat_a = np.array([0, 1, 0, 1, 0]) * np.pi / 2.0
    mat_s = np.ones_like(mat_x)
    return mat_x, mat_y, mat_a, mat_s


def char_L(l):
    mat_x = np.array([+0, -1, -1]) * l
    mat_y = np.array([-2, -1, +1]) * l
    mat_a = np.array([+0, +1, +1]) * np.pi / 2.0
    mat_s = np.ones_like(mat_x)
    return mat_x, mat_y, mat_a, mat_s


def char_P(l):
    mat_x = np.array([+0, +1, +0, -1, -1]) * l
    mat_y = np.array([+0, +1, +2, +1, -1]) * l
    mat_a = np.array([+0, +1, +0, +1, +1]) * np.pi / 2.0
    mat_s = np.ones_like(mat_x)
    return mat_x, mat_y, mat_a, mat_s


def get_character(name, l):
    if name == "0":
        return digit_0(l)
    elif name == "1":
        return digit_1(l)
    elif name == "2":
        return digit_2(l)
    elif name == "6":
        return digit_6(l)
    elif name == "8":
        return digit_8(l)
    elif name == "9":
        return digit_9(l)
    elif name == "big_2":
        return digit_big_2(l)
    elif name == "big_8":
        return digit_big_8(l)
    elif name == "E":
        return char_E(l)
    elif name == "L":
        return char_L(l)
    elif name == "P":
        return char_P(l)
    else:
        raise ValueError(f"Character {name} not recognized.")


def smooth(t):
    return t * t * (3 - 2 * t)


def smooth_2(t):
    c4 = (2 * np.pi) / 3
    res = np.zeros_like(t)
    res[t == 0.0] = 0.0
    res[t == 1.0] = 1.0
    mask = (t > 0.0) & (t < 1.0)
    res[mask] = pow(2, -10 * t[mask]) * np.sin((t[mask] * 10 - 0.75) * c4) + 1
    return res


def interp_angle(a1, a2, t):
    if np.abs(a2 - a1) > np.pi / 2.0:
        a2 -= np.pi if a1 < a2 else 0.0
        a1 -= np.pi if a1 > a2 else 0.0
    return (1.0 - t) * a1 + t * a2


def set_positions(i, times, bars, h, w, mat_x, mat_y, mat_a, mat_s):
    times = smooth(times)
    y_top = +h / 2.0
    y_bot = -h / 2.0
    x_lft = -w / 2.0
    x_mid = 0.0
    x_rgt = +w / 2.0
    for b, (bar, ti) in enumerate(zip(bars, times)):
        x1, x2 = mat_x[b, i], mat_x[b, i + 1]
        y1, y2 = mat_y[b, i], mat_y[b, i + 1]
        a1, a2 = mat_a[b, i], mat_a[b, i + 1]
        s1, s2 = mat_s[b, i], mat_s[b, i + 1]
        x = (1.0 - ti) * x1 + ti * x2
        y = (1.0 - ti) * y1 + ti * y2
        s = (1.0 - ti) * s1 + ti * s2
        a = interp_angle(a1, a2, ti)

        y_topp = +h / 2.0 * s
        y_bott = -h / 2.0 * s
        xy_ref = np.array(
            [
                [y_bott, x_mid],
                [y_bott + w / 2.0, x_rgt],
                [y_topp - w / 2.0, x_rgt],
                [y_topp, x_mid],
                [y_topp - w / 2.0, x_lft],
                [y_bott + w / 2.0, x_lft],
            ]
        )
        R = np.array([[np.cos(a), np.sin(a)], [-np.sin(a), np.cos(a)]])
        xy = (R @ xy_ref.T).T + np.array([x, y])
        bar.set_xy(xy)
    return
