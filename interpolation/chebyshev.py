import numpy as np
import matplotlib.pyplot as plt
from scipy.special import chebyt


def plot(N, n=1000):
    x = np.linspace(-1, 1, n)
    fig, ax = plt.subplots(1, 1, figsize=(12, 12))
    
    for k in range(N + 1):
        y = chebyt(k)(x)
        ax.plot(y, x, "k", lw=0.3)
    
    for k in range(5):
        y = chebyt(k)(x)
        ax.plot(y, x, lw=2.5)
        
    ax.set_xlim(-1.0, 1.0)
    ax.set_ylim(-1.0, 1.0)
    ax.set_xlabel(r"$T_n(x)$")
    ax.xaxis.set_inverted(True)
    ax.set_ylabel(r"$x$")
    fig.tight_layout()
    # fig.savefig("chebyshev_1.png", dpi=300, bbox_inches="tight")
    plt.show()
    return


if __name__ == "__main__":
    plot(60)