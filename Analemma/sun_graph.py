import locale
import datetime
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import matplotlib.ticker as ticker
from matplotlib.collections import LineCollection
from matplotlib.colors import Normalize
from matplotlib.patches import Patch
from scipy.interpolate import UnivariateSpline


def to_num(t):
    return t.dt.hour * 60 + t.dt.minute


def load_data(filename):
    df = pd.read_csv(filename, sep=" ", skipinitialspace=True, index_col=False)
    days = df["day"].astype(int)
    months = df["month"].astype(int)
    year = 2025

    df["date"] = pd.to_datetime(
        {"year": year, "month": months, "day": days}, format="%Y-%m-%d"
    )

    df.drop(columns=["day", "month"], inplace=True)
    df["sunrise"] = to_num(pd.to_datetime(df["sunrise"], format="%Hh%M"))
    df["sunset"] = to_num(pd.to_datetime(df["sunset"], format="%Hh%M"))
    df["noon"] = to_num(pd.to_datetime(df["noon"], format="%Hh%M"))
    df["astr_start"] = to_num(pd.to_datetime(df["astr_start"], format="%Hh%M"))
    df["astr_end"] = to_num(pd.to_datetime(df["astr_end"], format="%Hh%M"))
    df["naut_start"] = to_num(pd.to_datetime(df["naut_start"], format="%Hh%M"))
    df["naut_end"] = to_num(pd.to_datetime(df["naut_end"], format="%Hh%M"))
    df["civ_start"] = to_num(pd.to_datetime(df["civ_start"], format="%Hh%M"))
    df["civ_end"] = to_num(pd.to_datetime(df["civ_end"], format="%Hh%M"))

    df["sunrise_angle"] = df["sunrise_angle"].astype(float)
    df["sunset_angle"] = df["sunset_angle"].astype(float)
    df["noon_angle"] = df["noon_angle"].astype(float)
    df["sun_distance"] = df["sun_distance"].astype(float)

    df2 = df.loc[df.index.repeat(2)].reset_index(drop=True)
    df2.loc[df2.index[:-1], "date"] = df2["date"].iloc[1:].values
    df2.loc[df2.index[-1], "date"] += datetime.timedelta(days=1)

    return df, df2


def format_hour(x, pos):
    h = int(x) // 60
    # m = int(x) % 60
    return f"{h:02d}"


def format_minutes(x, pos):
    h = int(x) // 60
    m = int(x) % 60
    return f"{h:02d}:{m:02d}"


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


def format_seconds(x, pos):
    h = int(x) // 60
    m = int(x) % 60
    s = int(x * 60) % 60
    return f"{h:02d}:{m:02d}:{s:02d}"


def set_ax_y(ax):
    ax.tick_params(axis="y", length=15, width=0.5, direction="out", pad=-14)
    for label in ax.get_yticklabels():
        label.set_va("bottom")
    ax.yaxis.set_major_locator(ticker.MultipleLocator(180))
    ax.yaxis.set_major_formatter(ticker.FuncFormatter(format_hour))
    ax.set_ylim(0, 23.99999 * 60)
    return


def set_ax_x(ax):
    ax.tick_params(axis="x", length=3, width=1, direction="out")
    # ax.xaxis.set_major_locator(mdates.MonthLocator())
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b"))
    for label in ax.get_xticklabels():
        label.set_ha("left")
        label.set_rotation(45)
    return


def plot_sun_graph(df, df2):
    fig, axs = plt.subplots(
        3,
        1,
        figsize=(8, 6),
        sharex=True,
        gridspec_kw={"height_ratios": [2.0, 1, 1]},
    )
    # locale.setlocale(locale.LC_TIME, "fr_FR.UTF-8")

    colors = plt.get_cmap("Blues")(np.linspace(0.25, 1, 5))
    colors = [(r, g, b, a) for r, g, b, a in colors]
    # colors = [
    #     "#2F454DFF",
    #     "#586A70FF",
    #     "#6F8F9AFF",
    #     "#96BBC9FF",
    #     "#B0DAE8FF",
    # ]

    shifts = [0, 88, 298, len(df)]
    shift1 = datetime.datetime(2025, 3, 30)
    shift2 = datetime.datetime(2025, 10, 26)
    t0 = 0
    t1 = df["astr_start"]
    t2 = df["naut_start"]
    t3 = df["civ_start"]
    t4 = df["sunrise"]
    t5 = df["sunset"]
    t6 = df["civ_end"]
    t7 = df["naut_end"]
    t8 = df["astr_end"]
    t9 = 24 * 60
    x = df["date"]

    ax = axs[0]
    ax.fill_between(x, t0, t1, color=colors[4], label="Night")
    ax.fill_between(x, t1, t2, color=colors[3], label="Astronomical twilight")
    ax.fill_between(x, t2, t3, color=colors[2], label="Nautical twilight")
    ax.fill_between(x, t3, t4, color=colors[1], label="Civil twilight")
    ax.fill_between(x, t4, t5, color=colors[0], label="Daylight")
    ax.fill_between(x, t5, t6, color=colors[1])
    ax.fill_between(x, t6, t7, color=colors[2])
    ax.fill_between(x, t7, t8, color=colors[3])
    ax.fill_between(x, t8, t9, color=colors[4])

    tu = np.array(t4[2:]) + 24 * 60
    td = np.array(t5[:-2])
    midnight = (tu + td) / 2.0 - 24 * 60
    midnight[[174, 175]] -= 30
    midnight[[594, 595]] += 30

    ax.plot(x, (t4 + t5) * 0.5, color="white", lw=0.5)  # , label="Noon")
    ax.plot(x[2:], midnight, color="k", lw=0.5)  # , label="Midnight")

    # ax.axvline(shift1, color='C2', lw=2.5, ls='-')
    # ax.axvline(shift2, color='C2', lw=2.5, ls='-')

    set_ax_x(axs[-1])
    set_ax_y(ax)
    ax.legend(
        loc="upper center",
        bbox_to_anchor=(0.5, +1.15),
        ncol=5,
        columnspacing=1.75,
    )
    ax.set_xlim(
        datetime.datetime(2025, 1, 1, 0, 0, 0),
        datetime.datetime(2025, 12, 31, 23, 59, 59),
    )

    s1, s2 = 88, 298
    noon = (df2["sunrise"] + df2["sunset"]) / 2.0
    noon[s1:s2] -= 60
    spline = UnivariateSpline(np.arange(365), noon, s=15.0)
    noon_smooth = spline(np.arange(365))
    length = np.diff(noon_smooth) + 24 * 60

    ax = axs[1]
    mean_noon = np.mean(noon_smooth)
    ax.axhline(mean_noon, color="C1", lw=0.5)
    ax.plot(df2["date"], noon_smooth, color="C1", lw=1.5, label="Noon (CET)")
    ax.set_ylim(noon.min() - 10, noon.max() + 10)
    ax.tick_params(axis="y", length=3, width=0.5, direction="in", pad=-30)
    ax.yaxis.set_major_formatter(ticker.FuncFormatter(format_minutes))
    ax.yaxis.set_major_locator(ticker.MultipleLocator(10))
    # ax.set_ylabel("Noon time", color="C1")
    ax.legend(loc="upper center")

    ax = axs[2]
    x = df2["date"][:-1] + datetime.timedelta(days=1)
    ax.plot(x, length, color="C0", lw=1.5, label="Day length")
    ax.fill_between(x, length, 24 * 60, color="C0", alpha=0.2)

    ax.set_ylim(24 * 60 - 0.70, 24 * 60 + 0.70)
    ax.tick_params(axis="y", length=3, width=0.5, direction="in", pad=-42)
    ax.yaxis.set_major_formatter(ticker.FuncFormatter(format_seconds))
    ax.yaxis.set_major_locator(ticker.MultipleLocator(0.25))
    # ax.set_ylabel("Day length", color="C0")
    ax.legend(loc="upper center")

    fig.tight_layout()
    # fig.savefig("./Analemma/sun_graph.pdf")
    return


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


def plot_analemma():
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.set_aspect("equal")
    ax.set_xlim(-1.2, 1.2)
    ax.set_ylim(-1.2, 1.2)

    # Plot the analemma
    n = 2000
    e = [15, 23.44, 35, 50, 85, 120]
    t = np.linspace(0, 2 * np.pi, n)
    t += 12.0 / 365.0
    t_labels = np.array([1, 1, 1, 1, 1, 1]) * 989
    t_labels[-1] = 550

    n_colors = 12
    bins = np.linspace(t.min(), t.max(), n_colors + 1)
    color_indices = np.digitize(t[:-1], bins)
    colors = plt.get_cmap("turbo")(np.linspace(0.0, 1.0, n_colors + 1)[:-1])
    # colors = np.r_[colors[::2], colors[1::2]]
    line_colors = [colors[i - 1] for i in color_indices]

    for i, (eps, tl) in enumerate(zip(e, t_labels)):
        eps = np.deg2rad(eps)
        z = (1 + np.cos(eps)) / 2 - (1 - np.cos(eps)) / 2 * np.cos(2 * t)
        x = -1 / 2 * (1 - np.cos(eps)) * np.sin(2 * t)
        y = -np.sin(eps) * np.cos(t)
        ax.text(
            x[tl],
            y[tl] + 0.06 * (i < 5),
            r"$\epsilon={:.0f}^\circ$".format(eps * 180 / np.pi),
            fontsize=12,
            ha="center"*(i < 5) + "left"*(i >= 5),
            va="top",
        )
        x[z <= 0] = np.nan
        y[z <= 0] = np.nan
        if eps > np.pi / 2:
            arg = (1.0 + np.cos(eps)) / (1.0 - np.cos(eps))
            t1 = np.arccos(arg) / 2.0
            t2 = np.pi - t1
            t3 = np.pi + t1
            t4 = 2 * np.pi - t1
            ts = np.array([t1, t2, t3, t4])
            ax.plot(
                -1 / 2 * (1 - np.cos(eps)) * np.sin(2 * ts),
                -np.sin(eps) * np.cos(ts),
                "o", alpha=0
            )
        points = np.array([x, y]).T.reshape(-1, 1, 2)
        segments = np.concatenate([points[:-1], points[1:]], axis=1)
        # norm = Normalize(vmin=c.min(), vmax=c.max())
        # lc = LineCollection(segments, cmap="hsv", norm=norm)
        lc = LineCollection(segments, colors=line_colors)
        # lc.set_array(c)
        lc.set_linewidth(2)
        ax.add_collection(lc)

    Months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ]
    legend_elements = [
        Patch(facecolor=colors[i], edgecolor="none", label=f"{Months[i]}")
        for i in range(n_colors)
    ]
    ax.legend(
        handles=legend_elements,
        loc="center right",
        ncols=1,
        labelspacing=1.0,
        bbox_to_anchor=(1.20, +0.5),
    )

    ax.set_aspect("equal")
    ax.text(0, +1.20, "North", ha="center", va="top", fontsize=12)
    ax.text(0, -1.20, "South", ha="center", va="bottom", fontsize=12)
    ax.text(+1.20, 0, "West", ha="right", va="center", fontsize=12)
    ax.text(-1.20, 0, "Est", ha="left", va="center", fontsize=12)
    ax.plot(np.cos(t), np.sin(t), color="k", lw=0.5, ls="-", alpha=0.5)
    # ax.plot([-1.0, -1.0], [+1.0, -1.0], color="k", lw=0.5, ls="-")
    # ax.plot([-1.0, +1.0], [+1.0, +1.0], color="k", lw=0.5, ls="-")
    # ax.plot([-1.0, +1.0], [-1.0, -1.0], color="k", lw=0.5, ls="-")
    # ax.plot([+1.0, +1.0], [-1.0, +1.0], color="k", lw=0.5, ls="-")
    ax.axis("off")

    fig.tight_layout()
    fig.savefig("./Analemma/analemma_plot.pdf")
    return


if __name__ == "__main__":
    filename = "./Analemma/data_perdido.txt"
    df_one, df_dup = load_data(filename)
    plt.rcParams.update({"text.usetex": True})

    # plot_sun_graph(df_dup, df_one)
    # plot_noon_tilt()
    plot_analemma()

    plt.show()
