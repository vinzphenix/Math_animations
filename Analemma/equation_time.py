import datetime
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import matplotlib.ticker as ticker
from scipy.interpolate import UnivariateSpline


def set_ax_x(ax):
    ax.tick_params(axis="x", length=0, width=1, direction="out")
    ax.set_xticks([datetime.datetime(2025, i + 1, 15) for i in range(12)])
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b"))
    ymin, ymax = ax.get_ylim()
    delta = 0.03 * (ymax - ymin)
    for i in range(11):
        x = datetime.datetime(2025, i + 2, 1, 0, 0, 0)
        ax.plot([x, x], [ymin, ymin + delta], color="k", lw=0.5, alpha=0.5)
        ax.plot([x, x], [ymax, ymax - delta], color="k", lw=0.5, alpha=0.5)
    ax.set_ylim(ymin, ymax)
    return


def format_shift(x, pos):
    y = abs(x)
    h = int(y) // 60
    m = int(y) % 60
    if x < 0:
        if h == 0:
            return f"-{y:.0f}m"
        elif m == 0:
            return f"-{h:02d}h"
        else:
            return f"-{h:d}h{m:02d}"
    elif x > 0:
        if h == 0:
            return f"+{y:.0f}m"
        elif m == 0:
            return f"+{h:02d}h"
        else:
            return f"+{h:d}h{m:02d}"
    else:
        return ""


def compute_M_to_nu(ecc, tol=1e-12, max_iter=20):
    M = np.linspace(0.0, 2 * np.pi, 1000)
    E = M + ecc * np.sin(M)
    it, max_delta = 0, 1.0
    while it < max_iter and tol < max_delta:
        f = E - ecc * np.sin(E) - M
        df = 1 - ecc * np.cos(E)
        E -= f / df
        it += 1
        max_delta = np.amax(np.abs(f / df))
        print(f"Kepler equation : {it:2d} -> max delta={max_delta:.5e}")
    r = 1 - ecc * np.cos(E)
    sin_E = np.sin(E)
    cos_E = np.cos(E)
    cos_nu = (cos_E - ecc) / r
    sin_nu = np.sqrt(1 - ecc * ecc) * sin_E / r
    cos_nu_spline = UnivariateSpline(M, cos_nu, s=0)
    sin_nu_spline = UnivariateSpline(M, sin_nu, s=0)
    # x = np.linspace(0, 2 * np.pi, 5000)
    # plt.plot(M, cos_nu, '.', label="cos(nu)")
    # plt.plot(M, sin_nu, '.', label="sin(nu)")
    # plt.plot(x, cos_nu_spline(x), label="cos(nu)")
    # plt.plot(x, sin_nu_spline(x), label="sin(nu)")
    # plt.show()
    # exit()
    return cos_nu_spline, sin_nu_spline


def approx_noon_shift(ecc, cos_eps, gam, N, offset=0.0):
    M_civil = np.linspace(0, 2 * np.pi, N, endpoint=False) + np.pi / N
    M_astro = M_civil - offset * 2 * np.pi / N
    mu = M_astro + gam
    den = 1 - (1 - cos_eps) * np.cos(mu) * np.cos(mu)
    num1 = 0.5 * (1 - cos_eps) * np.sin(2 * mu)
    num2 = 2 * ecc * cos_eps * np.sin(M_astro)
    approx1 = np.sign(N) * np.arctan(num1 / den + num2 / (den * den))
    # approx_medium = num1 / den + num2 / (den * den)
    approx2 = num1 + num2
    return M_civil, approx1 / N, approx2 / N


# Convergence is not guaranteed for all parameters !
def solve_noon_shift(ecc, cos_eps, gam, N, offs=0.0, tol=1e-9, max_iter=100):
    def f_df(M):
        cg, sg = np.cos(gam), np.sin(gam)
        c_nu, s_nu = cos_nu(M), sin_nu(M)
        cos_nu_gam = c_nu * cg - s_nu * sg
        sin_nu_gam = s_nu * cg + c_nu * sg
        sin_th = np.sin(gam + (1 + N) * M)
        cos_th = np.cos(gam + (1 + N) * M)
        zeta = (1 + ecc * c_nu) * (1 + ecc * c_nu)
        zeta /= (1 - ecc * ecc) * np.sqrt(1 - ecc * ecc)
        f = cos_eps * cos_nu_gam * sin_th - sin_nu_gam * cos_th
        df1 = ((1 + N) - zeta * cos_eps) * sin_nu_gam * sin_th
        df2 = ((1 + N) * cos_eps - zeta) * cos_nu_gam * cos_th
        return -f / (df1 + df2)

    cos_nu, sin_nu = compute_M_to_nu(ecc)
    M_mean_civil = np.linspace(0, 2 * np.pi, N, endpoint=False) + np.pi / N
    M_mean_astro = (M_mean_civil - offs * 2 * np.pi / N) % (2 * np.pi)
    M_sol_noon = M_mean_astro.copy()
    it, max_delta = 0, 1.0
    while it < max_iter and tol < max_delta:
        delta = f_df(M_sol_noon)  # 0.5
        M_sol_noon = M_sol_noon + delta  # might wanna clip
        max_delta = np.amax(np.abs(delta))
        it += 1
        print(f"Iteration {it:2d}: max delta = {max_delta:.5e}")
    if it == max_iter:
        print("Warning: Maximum iterations reached without convergence.")
    return M_mean_civil, M_sol_noon - M_mean_astro


def anomaly_to_x(M, shift, N, D, dates):
    s = D * N / (2 * np.pi)
    d = (M + shift) * s / D
    if dates:
        return datetime.datetime(2025, 1, 1, 12) + pd.to_timedelta(d, unit="D")
    else:
        return 100 * d / N


def plot_noon_tilt(parameters, N: int, D: float, offset: int, dates=True):

    # figsize = (7.0, 2.75)
    # figsize = (7.0, 4.0)
    # figsize = (7.0, 5.0)
    figsize = (7.0, 9.25)
    fig, axs = plt.subplots(
        len(parameters), 1, figsize=figsize, sharex="all", sharey="all"
    )
    colors = plt.get_cmap("Blues")(np.linspace(0.35, 1, 3))
    c3, c2, c1 = [(r, g, b, a) for r, g, b, a in colors]
    offset = int(np.round(offset))
    
    if len(parameters) == 1:
        axs = [axs]
    for ax in axs:
        if dates:
            ax.set_xlim(
                datetime.datetime(2025, 1, 1, 0, 0, 0),
                datetime.datetime(2025, 12, 31, 23, 59, 59),
            )
        else:
            ax.set_xlim(0.0, 100.0)

    for ax, (eps, ecc, gam) in zip(axs, parameters):
        print(f"\nParameters : epsilon={eps}° e={ecc} \u03b3={gam}°")
        cos_eps = np.cos(np.deg2rad(eps))
        gam = np.deg2rad(gam)

        s = D * N / (2 * np.pi)
        MA, approx1, approx2 = approx_noon_shift(ecc, cos_eps, gam, N, offset)
        ME, shift = solve_noon_shift(ecc, cos_eps, gam, N, offset)
        # print(np.amax(np.abs(shift)))
        # print(np.amax(np.abs(approx1)))

        t1 = anomaly_to_x(MA, approx1, N, D, dates)
        t2 = anomaly_to_x(MA, approx2, N, D, dates)
        tE = anomaly_to_x(ME, shift, N, D, dates)
        shift = shift * s
        approx1, approx2 = approx1 * s, approx2 * s

        data = np.loadtxt("./Analemma/noon_Perdido.txt")
        # data = np.loadtxt("./Analemma/data_EoT.txt")
        MD, shift_ref = data[:, 0] / N * 2 * np.pi, data[:, 1] / s
        tD = anomaly_to_x(MD, shift_ref, N, D, dates)
        kwargs = dict(ls="", marker="o", markerfacecolor="none", ms=4)
        # ax.plot(tD, shift_ref * s, label="Monte Perdido", color=c3, **kwargs)

        ax.axhline(0, color="k", ls="-", lw=0.5, alpha=0.25)
        ax.plot(tE, shift, "C1", lw=2.5, label="Num. solution")
        ax.plot(t1, approx1, "-", lw=0.75, label="Approx. 1", color=c1)
        ax.plot(t2, approx2, "--", lw=0.75, label="Approx. 2", color=c2)
        ax.yaxis.set_major_formatter(ticker.FuncFormatter(format_shift))
        text = (
            r"$\epsilon={:.2f}^\circ$ ".format(eps)
            # + "\n"
            # + r"$e={:.4f}$ ".format(ecc)
            # + "\n"
            # r"$\gamma={:.2f}^\circ$".format(np.rad2deg(gam))
        )
        ax.set_ylabel(text)
        if dates:
            set_ax_x(ax)

    if not dates:
        axs[-1].set_xlabel(r"Year fraction [\%]")
        
    # axs[0].yaxis.set_major_locator(ticker.MultipleLocator(5))
    axs[0].yaxis.set_major_locator(ticker.MultipleLocator(15))
    # axs[1].yaxis.set_major_locator(ticker.MultipleLocator(60))
    axs[0].legend(loc="upper right")
    fig.tight_layout()
    # fig.savefig("./Analemma/noon_computed_easy.pdf")
    # fig.savefig("./Analemma/noon_computed_Earth.pdf")
    # fig.savefig("./Analemma/noon_computed_Mars.pdf")
    # fig.savefig("./Analemma/noon_computed_extreme.pdf")
    # fig.savefig("./Analemma/noon_low_e.pdf")
    return


if __name__ == "__main__":
    plt.rcParams.update({"text.usetex": True})
    # plot_noon_tilt(
    #     [(23.44, 0.0, 12.93), (85.00, 0.0, 12.93)],
    #     N=365,
    #     D=24 * 60,
    #     offset=2.5,
    #     dates=True,
    # )

    # plot_noon_tilt(
    #     [(23.44, 0.0167, 12.93)],
    #     N=365,
    #     D=24 * 60,
    #     offset=2.5,
    #     dates=True,
    # )
    
    # plot_noon_tilt(
    #     [(23.44, 0.0167, 12.93)],
    #     N=365,
    #     D=24 * 60,
    #     offset=2.5,
    #     dates=True,
    # )
    
    # plot_noon_tilt(
    #     [(25.19, 0.0934, 341.0324)],
    #     N=687,
    #     D=24 * 60,
    #     offset=0.72*687,
    #     dates=False,
    # )
    
    # plot_noon_tilt(
    #     [(10, 0.5, 60.0)],
    #     N=500,
    #     D=24 * 60,
    #     offset=0,
    #     dates=False,
    # )
    
    plot_noon_tilt(
        [
            (35, 0.05, 0.0),
            (35, 0.05, 45),
            (35, 0.05, 90),
            (35, 0.05, 135),
            (35, 0.05, 180),
        ],
        N=365,
        D=24 * 60,
        offset=0,
        dates=False,
    )
    
    plt.show()
