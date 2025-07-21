import datetime
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import matplotlib.ticker as ticker


def set_ax_x(ax):
    ax.tick_params(axis="x", length=3, width=1, direction="out")
    # ax.xaxis.set_major_locator(mdates.MonthLocator())
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b"))
    for label in ax.get_xticklabels():
        label.set_ha("left")
        label.set_rotation(45)
    return


def format_shift(x, pos):
    y = abs(x)
    h = int(y) // 60
    m = int(y) % 60
    if x < 0:
        if h == 0:
            return f"-{y:.0f}m"
        elif m == 0:
            return f"-{h:d}h"
        else:
            return f"-{h:d}:{m:02d}"
    elif x > 0:
        if h == 0:
            return f"+{y:.0f}m"
        elif m == 0:
            return f"+{h:d}h"
        else:
            return f"+{h:d}:{m:02d}"
    else:
        return ""


def plot_noon_tilt():
    D = 86400.0
    N = 365
    N_Om = 2.0 * np.pi / D
    Om = N_Om / N

    def f_df(t, cc):
        tmp1 = np.sin(N_Om * t)
        tmp2 = 1.0 - cc * np.cos(Om * t) ** 2
        tmp3 = 0.5 * cc * np.cos(N_Om * t)
        tmp4 = np.sin(2.0 * Om * t)

        tmp5 = np.cos(N_Om * t) * N_Om
        tmp6 = cc * Om * np.sin(2 * Om * t)
        tmp7 = -0.5 * cc * np.sin(N_Om * t) * N_Om
        tmp8 = 2 * Om * np.cos(2 * Om * t)

        f = tmp1 * tmp2 - tmp3 * tmp4
        df = tmp5 * tmp2 + tmp1 * tmp6 - (tmp3 * tmp8 + tmp4 * tmp7)
        return -f / df

    x = np.linspace(0, 365, 366)
    t_plot = datetime.datetime(2024, 12, 21) + pd.to_timedelta(x, unit="D")

    fig, axs = plt.subplots(2, 1, figsize=(8, 5), sharex="all")
    # locale.setlocale(locale.LC_TIME, "fr_FR.UTF-8")
    set_ax_x(axs[0])
    set_ax_x(axs[1])
    colors = plt.get_cmap("Blues")(np.linspace(0.35, 1, 3))
    c3, c2, c1 = [(r, g, b, a) for r, g, b, a in colors]
    for ax in axs:
        ax.set_xlim(
            datetime.datetime(2024, 12, 21, 0, 0, 0),
            datetime.datetime(2025, 12, 20, 23, 59, 59),
        )

    epsilons = [23.44, 80.0]
    for ax, eps in zip(axs, epsilons):
        c = 1 - np.cos(np.deg2rad(eps))
        y_zero = x * D + D / 2.0
        y = y_zero.copy()
        for it in range(10):
            delta = f_df(y, c)
            y += delta
            print(f"{np.amax(np.abs(delta)):.5e}")
        s = y - y_zero
        num = np.sin(4 * np.pi * (x + 0.5) / N)
        den = 1 - c * np.cos(2 * np.pi * (x + 0.5) / N) ** 2
        approx1 = D / (2.0 * np.pi) * np.arctan(c / 2.0 * num / den)
        approx2 = D / (2.0 * np.pi) * c / 2.0 * num / den
        approx3 = D / (2.0 * np.pi) * c / 2.0 * num
        ax.axhline(0, color="k", ls="-", lw=0.5, alpha=0.25)
        ax.plot(t_plot, s / 60.0, "C1", lw=2.5, label="True solution")
        ax.plot(
            t_plot, approx1 / 60.0, "-", lw=0.75, label="Approx. 1", color=c1
        )
        ax.plot(
            t_plot, approx2 / 60.0, "-", lw=0.75, label="Approx. 2", color=c2
        )
        ax.plot(
            t_plot, approx3 / 60.0, "-", lw=0.75, label="Approx. 3", color=c3
        )
        ax.yaxis.set_major_formatter(ticker.FuncFormatter(format_shift))

    axs[0].yaxis.set_major_locator(ticker.MultipleLocator(5))
    axs[1].yaxis.set_major_locator(ticker.MultipleLocator(60))
    axs[0].legend(loc="upper right")
    axs[0].set_ylabel(r"$\epsilon=23.44^\circ$ (Earth)")
    axs[1].set_ylabel(r"$\epsilon=85^\circ$")
    fig.tight_layout()
    # fig.savefig("./Analemma/noon_computed.pdf")
    return


if __name__ == "__main__":
    plt.rcParams.update({"text.usetex": True})
    plot_noon_tilt()
    plt.show()
