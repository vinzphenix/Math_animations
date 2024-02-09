import matplotlib.pyplot as plt
import numpy as np


def is_left(pa, pb, pc):
    return (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0])


def compute_hull(P):
    n = len(P)
    L = [np.argmax(P[:, 0])]
    indexes = set(np.arange(n))
    i = 0

    while (i == 0) or (L[i] != L[0]):
        next_pt = next(iter(indexes - {L[i]}))

        for point in indexes - {next_pt}:
            if -1.e-6 < is_left(P[L[i]], P[next_pt], P[point]) < 1.e-6:
                if np.linalg.norm(P[L[i]] - P[point]) > np.linalg.norm(P[L[i]] - P[next_pt]):
                    next_pt = point
            elif 0. < is_left(P[L[i]], P[next_pt], P[point]):
                next_pt = point

        L.append(next_pt)
        indexes -= {next_pt}
        i += 1

    return L


if __name__ == "__main__":
    n_points = 15
    points = np.random.rand(n_points, 2)

    hull = compute_hull(points)
    print(hull)

    fig, ax = plt.subplots(1, 1, figsize=(8, 6), constrained_layout=True)
    ax.plot(points[:, 0], points[:, 1], ls='', marker='.', markersize=5)
    ax.plot(points[hull, 0], points[hull, 1], ls='-', marker='o')

    plt.show()
