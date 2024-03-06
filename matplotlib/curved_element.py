import numpy as np
import matplotlib.pyplot as plt

ftSz1, ftSz2 = 20, 15
plt.rcParams["text.usetex"] = False
plt.rcParams['font.family'] = 'monospace'


psi_1 = lambda x, y: (1. - x - y) * (1. - 2.*x - 2.*y)
psi_2 = lambda x, y: 4.*x * (1. - x - y)
psi_3 = lambda x, y: x * (2.*x - 1.)
psi_4 = lambda x, y: 4.*x*y
psi_5 = lambda x, y: y * (2.*y - 1.)
psi_6 = lambda x, y: 4.*y * (1. - x - y)
psi = [psi_1, psi_2, psi_3, psi_4, psi_5, psi_6]

dxp_1 = lambda x, y: -3. + 4.*x + 4.*y
dxp_2 = lambda x, y: 4. - 8.*x - 4.*y
dxp_3 = lambda x, y: 4*x - 1.
dxp_4 = lambda x, y: 4.*y
dxp_5 = lambda x, y: 0.
dxp_6 = lambda x, y: -4.*y
dx_psi = [dxp_1, dxp_2, dxp_3, dxp_4, dxp_5, dxp_6]

dyp_1 = lambda x, y: -3. + 4.*x + 4.*y
dyp_2 = lambda x, y: -4*x
dyp_3 = lambda x, y: 0.
dyp_4 = lambda x, y: 4.*x
dyp_5 = lambda x, y: 4*y - 1.
dyp_6 = lambda x, y: 4. - 4.*x - 8.*y
dy_psi = [dyp_1, dyp_2, dyp_3, dyp_4, dyp_5, dyp_6]


def reset():
    global phy_x, current_idx
    phy_x = np.copy(ref_x)
    current_idx = -1
    
    phy_pts.set_data(ref_pts.get_data())
    phy_edg.set_data(ref_edg.get_data())
    phy_map.set_data(ref_map.get_data())
    ref_cursor.set_data([np.nan], [np.nan])
    phy_cursor.set_data([np.nan], [np.nan])
    
    draw_map()
    draw_normals()

    return


def onClick(event):
    ix, iy = event.xdata, event.ydata
    global phy_x, current_idx
    if ix is None or iy is None or event.inaxes != ax2:
        current_idx = -1
        return

    if event.button == 1:
        idx = np.argwhere(np.logical_and(abs(phy_x[:, 0] - ix) < tol, abs(phy_x[:, 1] - iy) < tol))
        if len(idx) > 0:
            current_idx = idx[0, 0]
    
    return

def offClick(event):
    global current_idx
    current_idx = -1
    return

def draw_map():
    x = np.dot(sf_in, phy_x[:, 0])
    y = np.dot(sf_in, phy_x[:, 1])
    phy_map.set_data(x, y)
    x = np.dot(sf_bd, phy_x[:, 0])
    y = np.dot(sf_bd, phy_x[:, 1])
    phy_edg.set_data(x, y)
    phy_pts.set_data(phy_x[:, 0], phy_x[:, 1])
    return


def whileClick(event):

    global coords
    ix, iy = event.xdata, event.ydata
    if ix is None or iy is None:
        return
        
    if event.inaxes == ax1 and 0. <= ix and 0. <= iy and ix+iy <= 1.:
        x, y = 0., 0.
        for k in range(6):
            x += psi[k](ix, iy) * phy_x[k, 0]
            y += psi[k](ix, iy) * phy_x[k, 1]
        ref_cursor.set_data([ix], [iy])
        phy_cursor.set_data([x], [y])
        jac, n1, n2, n3 = compute_jacobian(ix, iy)
        text.set_text(f"J = {jac:.02f}")
        a = 0.2
        nx_concat = [x, x+a*n1[0], np.nan, x, x+a*n2[0], np.nan, x, x+a*n3[0], np.nan]
        ny_concat = [y, y+a*n1[1], np.nan, y, y+a*n2[1], np.nan, y, y+a*n3[1], np.nan]
        # normals.set_data(nx_concat, ny_concat)
        
    if event.inaxes == ax2 and event.button == 1 and current_idx != -1:
        phy_x[current_idx, 0] = ix
        phy_x[current_idx, 1] = iy
        draw_map()
        draw_normals()
        ref_cursor.set_data([np.nan], [np.nan])
        phy_cursor.set_data([np.nan], [np.nan])

    fig.canvas.draw()
    return


def onKey(event):
    if event.key == 'r':
        print('reset')
        reset()

    fig.canvas.draw()
    return
    

def get_sf(grid):
    size = grid.shape[0]
    sf = np.empty((size, 6))
    for k in range(6):
        sf[:, k] = psi[k](grid[:, 0], grid[:, 1])

    return sf
    
    
def get_map(n, n_pts_01):
    size = 3 * (n_pts_01 + 1) * (n+2)
    coords = np.empty((size, 2))
    
    idx = 0
    idx_border = 0    
    for i in range(n+1):
    
        # horizontal stripes
        y = i / (n + 1)
        x_max = 1 - y
        n_pts_loc = int(np.ceil(n_pts_01 * x_max))
        coords[idx:idx + n_pts_loc] = np.c_[
            np.linspace(0., x_max, n_pts_loc),
            y * np.ones(n_pts_loc),
        ]
        coords[idx+n_pts_loc, :] = np.array([np.nan, np.nan])
        idx += n_pts_loc + 1
        
        # oblique stripes
        t = 1 - i / (n + 1)
        length = np.sqrt(2) * t
        n_pts_loc = int(np.ceil(n_pts_01 * length))
        coords[idx:idx + n_pts_loc] = np.c_[
            np.linspace(t, 0., n_pts_loc),
            np.linspace(0, t, n_pts_loc),
        ]
        coords[idx+n_pts_loc, :] = np.array([np.nan, np.nan])
        idx += n_pts_loc + 1
        
        # vertical stripes
        x = i / (n + 1)
        y_max = 1 - x
        n_pts_loc = int(np.ceil(n_pts_01 * y_max))
        coords[idx:idx + n_pts_loc] = np.c_[
            x * np.ones(n_pts_loc),
            np.linspace(y_max, 0., n_pts_loc),
        ]
        coords[idx+n_pts_loc, :] = np.array([np.nan, np.nan])
        idx += n_pts_loc + 1
        
        if i == 0:
            idx_border = idx
        
    return coords[:idx], idx_border


def compute_jacobian(x, y):
    dpsi = np.empty((6, 2))
    for k in range(6):
        dpsi[k, 0] = dx_psi[k](x, y)
        dpsi[k, 1] = dy_psi[k](x, y)

    dx_dxi = np.dot(phy_x.T, dpsi)
    jac = dx_dxi[0, 0] * dx_dxi[1, 1] - dx_dxi[1, 0] * dx_dxi[0, 1]

    n1 = np.array([0, -1])
    n2 = np.array([1, 1])
    n3 = np.array([-1, 0])
    cof = np.array([
        [+dx_dxi[1, 1], -dx_dxi[1, 0]],
        [-dx_dxi[0, 1], +dx_dxi[0, 0]],
    ])
    # cof = dx_dxi
    # print("{:.3f} {:.3f} {:.3f}".format(np.linalg.norm(np.dot(cof, n1)), np.linalg.norm(np.dot(cof, n2)), np.linalg.norm(np.dot(cof, n3))))
    n1 = np.dot(cof, n1) #/ np.linalg.norm(np.dot(cof, n1))
    n2 = np.dot(cof, n2) #/ np.linalg.norm(np.dot(cof, n2))
    n3 = np.dot(cof, n3) #/ np.linalg.norm(np.dot(cof, n3))
    
    return jac, n1, n2, n3


def draw_normals():
    l1 = draw_normal(0)
    l2 = draw_normal(1)
    l3 = draw_normal(2)
    text1.set_text(f"l1 = {l1:.3f}")
    text2.set_text(f"l2 = {l2:.3f}")
    text3.set_text(f"l3 = {l3:.3f}")

    return

def draw_normal(k):
    x_ref = grid_bd[:, 0]
    y_ref = grid_bd[:, 1]
    x = np.dot(sf_bd, phy_x[:, 0])
    y = np.dot(sf_bd, phy_x[:, 1])
    sep = np.argwhere(np.isnan(x)).reshape(-1)
    sep1, sep2, sep3 = sep
    if k == 0:
        x = x[:sep1]
        y = y[:sep1]
        x_ref = x_ref[:sep1]
        y_ref = y_ref[:sep1]
    elif k == 1:
        x = x[sep1+1:sep2]
        y = y[sep1+1:sep2]
        x_ref = x_ref[sep1+1:sep2]
        y_ref = y_ref[sep1+1:sep2]
    else:
        x = x[sep2+1:sep3]
        y = y[sep2+1:sep3]
        x_ref = x_ref[sep2+1:sep3]
        y_ref = y_ref[sep2+1:sep3]

    n_int_pts = len(x)
    integral = 0.
    a = 0.1
    data_x = []
    data_y = []
    
    n = compute_jacobian(x_ref[0], y_ref[0])[1+k]
    data_x += [x[0], x[0]+a*n[0], np.nan]
    data_y += [y[0], y[0]+a*n[1], np.nan]
    integral += 0.5 * 1.0 * np.linalg.norm(n) * 1. / (n_int_pts-1)

    for i in range(1, len(x)-1):
        n = compute_jacobian(x_ref[i], y_ref[i])[1+k]
        data_x += [x[i], x[i]+a*n[0], np.nan]
        data_y += [y[i], y[i]+a*n[1], np.nan]
        integral += 1.0 * np.linalg.norm(n) * 1. / (n_int_pts-1)
    
    n = compute_jacobian(x_ref[-1], y_ref[-1])[1+k]
    data_x += [x[-1], x[-1]+a*n[0], np.nan]
    data_y += [y[-1], y[-1]+a*n[1], np.nan]
    integral += 0.5 * 1.0 * np.linalg.norm(n) * 1. / (n_int_pts-1)

    normals[k].set_data(data_x, data_y)

    return integral


if __name__ == '__main__':
    
    ref_x = np.array([
        [0., 0.],
        [0.5, 0.],
        [1., 0.],
        [0.5, 0.5],
        [0., 1.],
        [0., 0.5],
    ])
    # phy_x = np.dot(
    #     ref_x.copy() - np.array([0.5, 0.5]),
    #     np.array([
    #         [0.4, -0.2],
    #         [0.2, 0.7]
    #     ])
    # ) + np.array([0.5, 0.5])
    phy_x = np.array([
        [0.        , 0.        ],
        [0.5       , 0.        ],
        [1.        , 0.        ],
        [1.04544681, 0.97290144],
        [0.        , 1.        ],
        [-0.13927716, 0.50282329],
    ])
    
    n_grid = 10
    n_pts = 50
    grid, k_bd = get_map(n_grid, n_pts)
    grid_bd = grid[:k_bd]
    grid_in = grid[k_bd:]
    
    sf = get_sf(grid)
    sf_bd = sf[:k_bd]
    sf_in = sf[k_bd:]

    p = 2
    W, H = 10, 5
    current_idx = -1
    tol = 0.05

    fig, axs = plt.subplots(1, 2, figsize=(W, H), constrained_layout=False, sharey='all')
    ax1 = axs[0]
    ax2 = axs[1]
    for ax in axs:
        #ax.set_xlim([-W / H, W / H])
        ax.set_ylim([-0.2, 1.2])
        ax.set_aspect('equal', 'datalim')

    fig.tight_layout()
    
    ref_pts, = ax1.plot(ref_x[:, 0], ref_x[:, 1], 'o', color='C0', alpha=0.75, markersize=10, markeredgecolor='none')
    ref_edg, = ax1.plot(grid_bd[:, 0], grid_bd[:, 1], ls='-', color='C0', lw=2)
    ref_map, = ax1.plot(grid_in[:, 0], grid_in[:, 1], ls='-', color='grey', lw=0.5, alpha=0.75)
    
    ref_cursor, = ax1.plot([np.nan], [np.nan], 'o', ms=5, color='red', alpha=0.75)
    phy_cursor, = ax2.plot([np.nan], [np.nan], 'o', ms=5, color='red', alpha=0.75)
    # normals, = ax2.plot([np.nan], [np.nan], '-o', ms=5, color='C2', alpha=0.75)

    phy_pts, = ax2.plot(phy_x[:, 0], phy_x[:, 1], 'o', color='C1', alpha=0.75, markersize=10, markeredgecolor='none')
    phy_edg, = ax2.plot([], [], ls='-', color='C1', lw=2)
    phy_map, = ax2.plot([], [], ls='-', color='grey', lw=0.5, alpha=0.75)
    normals = [ax2.plot([], [], '-o', color='C2', markevery=(1,3), markeredgecolor='none')[0] for _ in range(3)]
    
    text = ax1.text(0.70, 0.90, "J = ", transform=ax1.transAxes, fontsize=15, va='center', ha='left')
    text1 = ax1.text(0.70, 0.85, "l1 = ", transform=ax1.transAxes, fontsize=12, va='center', ha='left')
    text2 = ax1.text(0.70, 0.80, "l2 = ", transform=ax1.transAxes, fontsize=12, va='center', ha='left')
    text3 = ax1.text(0.70, 0.75, "l3 = ", transform=ax1.transAxes, fontsize=12, va='center', ha='left')

    draw_map()
    draw_normals()

    fig.canvas.mpl_connect('button_press_event', onClick)
    fig.canvas.mpl_connect('button_release_event', offClick)
    fig.canvas.mpl_connect('motion_notify_event', whileClick)
    fig.canvas.mpl_connect('key_press_event', onKey)

    plt.show()

