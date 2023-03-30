import matplotlib.pyplot as plt
from manimlib import *
from scipy.interpolate import CubicSpline
import numpy as np


class Stability(Scene):
    ax_limits = [-4., 2., -3., 3.]
    delta_x = ax_limits[1] - ax_limits[0]
    delta_y = ax_limits[3] - ax_limits[2]

    # Display parameters
    ftz = 40
    offset = (ax_limits[3] - ax_limits[2]) * 0.10
    y_positions = np.linspace(ax_limits[3] - offset, ax_limits[2] + offset, 5)
    # box_x_pos = ax_limits[1] + (ax_limits[1] - ax_limits[0]) * 0.5
    box_x_pos = FRAME_WIDTH / 2.
    time_per_symb = 0.2

    kwargs_tex = {
        "font_size": ftz,
        "tex_to_color_map": {
            "f(u_0)": GREEN,
            "\mu": GREEN,
            r"\left({ {{\partial f}} \over {{\partial u}} }\right)_{u_0}": RED,
            "\lambda": RED,
            "G": BLUE,
            # "\Delta t": GREEN
        }
    }

    axes, labels = None, None
    eq_ode = None
    remaining_eq = None

    def construct(self) -> None:
        order = 3
        animate_intro = False
        self.setup_axes()
        self.derive_linear_ode(animate=animate_intro)
        self.derive_amplification(animate=animate_intro)
        self.display_rk_amplification(order=order, animate=True)
        self.display_axes(animate=True)
        self.level_sets(order=order)

        return

    def setup_axes(self):
        scale = 0.9
        self.axes = Axes(
            (*self.ax_limits[:2], 1.), (*self.ax_limits[2:], 1.),
            width=scale * FRAME_HEIGHT * self.delta_x / self.delta_y, height=scale * FRAME_HEIGHT,
        ).shift(2 * LEFT)

        self.axes.add_coordinate_labels(font_size=20, num_decimal_places=0)
        self.labels = (
            self.axes.get_axis_label(r"\Re (\lambda \Delta t)", self.axes, RIGHT, RIGHT, MED_SMALL_BUFF),
            self.axes.get_axis_label(r"\Im (\lambda \Delta t)", self.axes, UP, RIGHT, LARGE_BUFF + MED_LARGE_BUFF)
        )
        return

    def display_axes(self, animate=True):
        if animate:
            self.play(Write(self.axes, lag_ratio=0.01, run_time=1.5), )
            self.play(
                AnimationGroup(
                    Write(self.labels[0], lag_ratio=0.01, run_time=1.5),
                    Write(self.labels[1], lag_ratio=0.01, run_time=1.5),
                    lag_ratio=0.2
                )
            )
        else:
            self.add(self.axes, *self.labels)

    def derive_linear_ode(self, animate=True):
        n = 5
        kwargs = self.kwargs_tex
        equals = [Tex("=", **kwargs) for _ in range(n)]
        equals[3] = Tex(":=", **kwargs)
        equals[0].to_edge(UP, buff=LARGE_BUFF).shift(4 * LEFT)
        for i in range(1, 5):
            equals[i].next_to(equals[i - 1], DOWN, buff=LARGE_BUFF)

        LHS = [
            Tex(r"{ {{\text{d}u}} \over {{\text{d}t}} }", **kwargs),
            None,
            None,
            Tex(r"v", **kwargs),
            Tex(r"{ {{\text{d}v}} \over {{\text{d}t}} }", **kwargs),
        ]
        RHS = [
            Tex(r"f(u)", **kwargs),
            Tex(r"f(u_0) + \left({ {{\partial f}} \over {{\partial u}} }\right)_{u_0}"
                r" (u - u_0) + \mathcal{O}(u-u_0)^2", **kwargs),
            Tex(r"\mu + \lambda (u - u_0) + \mathcal{O}(u-u_0)^2", **kwargs),
            Tex(r"\mu + \lambda (u - u_0)", **kwargs),
            Tex(r"\lambda { {{\text{d}u}} \over {{\text{d}t}} }", **kwargs),
            Tex(r"\lambda v", **kwargs),
        ]
        RHS[-1].next_to(equals[-1], RIGHT)

        if animate:
            for eq_sign, lhs, rhs in zip(equals, LHS, RHS):
                if lhs is not None:
                    lhs.next_to(eq_sign, LEFT)
                    n_symb = len(lhs.get_symbol_substrings())
                    self.play(Write(lhs), run_time=n_symb * self.time_per_symb)
                self.play(Write(eq_sign), run_time=1.)
                if rhs is not None:
                    n_symb = len(rhs.get_symbol_substrings())
                    rhs.next_to(eq_sign, RIGHT)
                    self.play(Write(rhs), run_time=n_symb * self.time_per_symb)
                self.wait(1.)
            self.play(FadeOut(RHS[-2]), FadeIn(RHS[-1]), run_time=2 * 1.)
            self.wait(1.)
        # else:
        #     RHS_to_add = [rhs for rhs in RHS[:-2] + [RHS[-1]]]
        #     self.add(*LHS, *equals, *RHS_to_add)

        always(LHS[-1].next_to, equals[-1], LEFT)
        always(RHS[-1].next_to, equals[-1], RIGHT)

        rect = Rectangle(2.75, 1.25)
        self.eq_ode = [
            Tex(r"{ {{\text{d}v}} \over {{\text{d}t}} }", **kwargs),
            Tex(r"=", **kwargs),
            Tex(r"\lambda v", **kwargs),
        ]
        self.eq_ode[1].move_to(self.axes.c2p(self.box_x_pos, self.y_positions[0]))
        self.eq_ode[0].next_to(self.eq_ode[1], LEFT)
        self.eq_ode[2].next_to(self.eq_ode[1], RIGHT)
        rect.move_to(self.axes.c2p(self.box_x_pos, self.y_positions[0]))
        rect.set_fill(BLACK, opacity=0.5).set_stroke(WHITE, 2)

        if animate:
            self.play(
                *[FadeOut(eq) for eq in LHS[:n - 1] + equals[:n - 1] + RHS[:n - 1] if eq is not None],
                equals[-1].animate.to_edge(UP, buff=LARGE_BUFF).shift(2 * RIGHT),
                DrawBorderThenFill(rect),
                TransformMatchingTex(LHS[-1].copy(), self.eq_ode[0]),
                TransformMatchingTex(equals[-1].copy(), self.eq_ode[1]),
                TransformMatchingTex(RHS[-1].copy(), self.eq_ode[2]),
                run_time=1.
            )
        else:
            self.add(rect, *self.eq_ode, LHS[-1], RHS[-1],
                     equals[-1].to_edge(UP, buff=LARGE_BUFF).shift(2 * RIGHT), )

        self.remaining_eq = [LHS[-1], equals[-1], RHS[-1]]
        return

    def derive_amplification(self, animate=True):
        n = 5
        kwargs = self.kwargs_tex

        equals = [Tex("=", **kwargs) for _ in range(n)]
        equals[0].next_to(self.remaining_eq[1], DOWN, buff=LARGE_BUFF)
        for i in range(1, n):
            equals[i].next_to(equals[i - 1], DOWN, buff=LARGE_BUFF)

        LHS = [
            Tex(r"v(t)", **kwargs),
            Tex(r"{ {{ v(t_{i+1}) }} \over {{v(t_i)}} }", **kwargs),
            None,
            None,
            Tex(r"G", **kwargs),
        ]
        RHS = [
            Tex(r"\exp(\lambda t)", **kwargs),
            Tex(r"{ {{\exp\left[\lambda (t_i + \Delta t)\right] }} \over {{\exp[\lambda t_i] }} }", **kwargs),
            Tex(r"\left| e^{\lambda \Delta t} \right|", **kwargs),
            Tex(r"\left| e^{\Re(\lambda \Delta t)}\right| \cdot"
                r" \left|e^{\imath \Im(\lambda \Delta t)} \right|",
                **kwargs),
            Tex(r"e^{\Re(\lambda \Delta t)}", **kwargs)
        ]
        others = []

        if animate:
            for i, (eq_sign, lhs, rhs) in enumerate(zip(equals, LHS, RHS)):

                if lhs is not None:
                    lhs.next_to(eq_sign, LEFT)
                    n_symb = len(lhs.get_symbol_substrings())
                    self.play(Write(lhs), run_time=n_symb * self.time_per_symb)
                self.play(Write(eq_sign), run_time=1.)
                if rhs is not None:
                    rhs.next_to(eq_sign, RIGHT)
                    n_symb = len(rhs.get_symbol_substrings())
                    if i == n - 1:
                        rhs.align_to(lhs, DOWN)
                    self.play(Write(rhs), run_time=n_symb * self.time_per_symb)
                self.wait(1.)

                if i == 1:  # display |.| and G :=
                    new_lhs = Tex(r"\left| { {{ v(t_{i+1}) }} \over {{v(t_i)}} } \right|", **kwargs).move_to(lhs)
                    new_rhs = Tex(r"\left| { {{\exp\left[\lambda (t_i + \Delta t)\right] }}"
                                  r" \over {{\exp[\lambda t_i]}} } \right|", **kwargs).move_to(rhs)
                    eq_left = Tex(":=", **kwargs).next_to(new_lhs, LEFT)
                    var_left = Tex("G", **kwargs).next_to(eq_left, LEFT)
                    others += [new_lhs, new_rhs, eq_left, var_left]
                    self.play(
                        FadeOut(lhs), FadeOut(rhs),
                        FadeIn(new_lhs), FadeIn(new_rhs),
                        run_time=2. * 1.
                    )
                    self.play(Write(eq_left), run_time=1.)
                    self.play(Write(var_left), run_time=1., )
                    self.wait(1.)

        rect = Rectangle(2.75, 1.25)
        eq_g = [
            Tex(r"G", **kwargs),
            Tex(r"=", **kwargs),
            Tex(r"e^{\Re (\lambda \Delta t)}", **kwargs),
        ]

        eq_g[1].move_to(self.axes.c2p(self.box_x_pos, self.y_positions[1])).shift(0.5 * LEFT)
        eq_g[0].next_to(eq_g[1], LEFT)
        eq_g[2].next_to(eq_g[1], RIGHT).align_to(eq_g[0], DOWN)
        rect.move_to(self.axes.c2p(self.box_x_pos, self.y_positions[1]))
        rect.set_fill(BLACK, opacity=0.5).set_stroke(WHITE, 2)

        if animate:
            self.play(
                DrawBorderThenFill(rect),
                TransformMatchingTex(LHS[-1].copy(), eq_g[0]),
                TransformMatchingTex(equals[-1].copy(), eq_g[1]),
                TransformMatchingTex(RHS[-1].copy(), eq_g[2]),
                run_time=2.
            )
            self.wait(1.)
        else:
            self.add(rect, *eq_g)

        to_be_removed = LHS[:1] + LHS[2:] + equals + RHS[:1] + RHS[2:] + others + self.remaining_eq
        if animate:
            self.play(
                *[FadeOut(eq) for eq in to_be_removed if eq is not None],
                run_time=2.
            )
            self.wait(1.)
        else:
            self.remove(*[eq for eq in to_be_removed if eq is not None])
        return

    def display_rk_amplification(self, order, animate=True):
        if order < 1:
            return

        terms = [r"G_{{ \text{{RK{:d} }} }} = \left|1".format(order), r"+\lambda \Delta t"] + \
                ["+{{ {{ (\lambda \Delta t)^{:d}}} \over {{ {:d}\;!}} }}".format(i, i) for i in
                 range(2, min(order, 6) + 1)]
        terms += [r" + ... \right|"] if order > 6 else [r"\right|"]

        eq_g = Tex(r"".join(terms), font_size=self.ftz)  # .center().to_edge(UP).shift(2. * LEFT)
        eq_small_g = Tex(
            r"G_{{ \text{{RK{:d} }} }} = \left|\sum_{{i=0}}^{{ {:d} }}"
            r" {{ {{(\lambda \Delta t)^i}} \over {{i !}} }}\right|".format(order, order),
            font_size=self.ftz * 7 // 10, tex_to_color_map={str(order): GREEN}
        )
        eq_small_g.move_to(self.axes.c2p(self.box_x_pos, self.y_positions[3]))

        rect = Rectangle(2.75, 1.25)
        rect.move_to(self.axes.c2p(self.box_x_pos, self.y_positions[3]))
        rect.set_fill(GREY_D, opacity=0.5).set_stroke(WHITE, 2)

        if animate:
            self.play(Write(eq_g), run_time=((1 + order) * 0.5)),
            self.play(DrawBorderThenFill(rect), TransformMatchingTex(eq_g, eq_small_g), run_time=2.)
            self.wait(1.)
        else:
            self.add(rect, *eq_small_g)
        return

    def level_sets(self, order=1):
        nx = int(self.delta_x / 0.05)
        ny = int(self.delta_y / 0.05)
        x_1d = np.linspace(*self.ax_limits[:2], nx)
        y_1d = np.linspace(*self.ax_limits[2:], ny)
        sigma, omega = np.meshgrid(x_1d, y_1d)
        z = sigma + 1j * omega

        # Compute G
        if order > 0:  # numerical solution
            G = np.ones_like(z)
            for i in range(1, order + 1):
                G += np.power(z, i) / np.math.factorial(i)
        else:  # otherwise analytical solution
            G = np.exp(z)
        G_data = np.abs(G)
        # G_data = np.angle(G)

        # Create label of G level set value
        g_tracker = ValueTracker(0.)
        g_str = r"G_{{ \text{{RK{:d} }} }}".format(order) if order > 0 else r"G"
        text_g, number_g = label_g = VGroup(
            Tex(g_str, "=", font_size=self.ftz),
            DecimalNumber(0., show_ellipsis=False, num_decimal_places=2, font_size=self.ftz)
        )
        root_color = rgba_to_color(plt.get_cmap("Blues")(1.))
        label_g.arrange(RIGHT, buff=SMALL_BUFF).move_to(self.axes.c2p(self.box_x_pos, self.y_positions[4]))
        # label_g.set_color(root_color)
        rect = Rectangle(2.75, 1.25)
        rect.move_to(self.axes.c2p(self.box_x_pos, self.y_positions[4]))
        rect.set_fill(root_color, opacity=0.5).set_stroke(WHITE, 2)

        # Show the zeros of G(z)
        roots = np.roots([1. / np.math.factorial(i) for i in range(order + 1)][::-1])
        root_pts = [Dot(self.axes.c2p(root.real, root.imag)).set_color(root_color) for root in roots]
        self.play(
            *[ShowCreation(root_pt) for root_pt in root_pts],
            run_time=1.
        )
        self.play(
            DrawBorderThenFill(rect), Write(label_g), run_time=2.
        )

        # Compute level set in the z domain
        # levels_small = np.geomspace(0.05, 1., 7)[:-1]
        # factor_step = levels_small[1] / levels_small[0]
        # n_needed = np.floor(np.log(3.5) / np.log(factor_step))
        # levels_large = np.geomspace(1., factor_step ** n_needed, int(n_needed) + 1)
        levels_small = np.arange(0.10, 1., 0.10)
        delta_g = 0.25 if order <= 4 else np.amax(G_data) / 50.
        levels_large = np.arange(1., np.amax(G_data), delta_g)
        levels = np.r_[levels_small, levels_large]
        res = plt.contour(sigma, omega, G_data, levels=levels)

        # Create color arrays
        colors_stable = plt.get_cmap("Blues")(np.linspace(1., 0., len(levels_small) + 1)[:-1])
        colors_unstable = plt.get_cmap("Reds")(np.linspace(0., 1., len(levels_large)))
        colors = np.r_[colors_stable, colors_unstable]
        color_fill = plt.get_cmap("Blues")(0.5)
        all_level_sets = res.allsegs
        all_curves, curves_marginal = [], []

        def func_get_color():
            g = g_tracker.get_value()
            if g < 1:
                return rgba_to_color(plt.get_cmap("Blues")(1. - g))
            else:
                return rgba_to_color(plt.get_cmap("Reds")((g - 1.) / (levels[-1] - 1.)))

        f_always(number_g.set_value, lambda: g_tracker.get_value())
        # f_always(label_g.set_color, func_get_color)
        f_always(rect.set_fill, func_get_color)

        # Display each level set
        for level_value, color, these_level_sets in zip(levels, colors, all_level_sets):
            curves = []

            for this_level_set in these_level_sets:
                coords = this_level_set
                t_array, dt = np.linspace(0., 1., coords.shape[0], retstep=True)
                spline_x = CubicSpline(t_array, coords[::-1, 0])
                spline_y = CubicSpline(t_array, coords[::-1, 1])

                level_func = lambda t: (spline_x(t), spline_y(t))
                # w = 2. if idx_level == len(levels_small) else 1.
                curves += [
                    self.axes.get_parametric_curve(
                        level_func, color=rgba_to_color(color), t_range=(0., 1., dt)
                    )  # .set_stroke(width=w * DEFAULT_STROKE_WIDTH)
                ]

            all_curves.append(curves) if level_value > 1. else None
            curves_marginal += curves if np.abs(level_value - 1.) < 1.e-3 else []

            current_run_time = 0.25 * np.exp((1. - level_value))
            self.play(
                g_tracker.animate.set_value(level_value),
                run_time=current_run_time / 2.
            )
            self.play(
                AnimationGroup(*[Write(curve) for curve in curves]),
                run_time=current_run_time
            )
            self.wait(current_run_time / 2.)
        self.wait()

        # Remove level sets with G > 1, and fill the ones with G < 1
        self.play(
            g_tracker.animate.set_value(1.),
            AnimationGroup(
                *[
                    AnimationGroup(
                        *[FadeOut(curve) for curve in curves],
                    ) for curves in all_curves[::-1]
                ],
                lag_ratio=1.
            ),
            run_time=5.
        )

        rect.clear_updaters()
        if order > 0:
            new_str_g = r"G_{{ \text{{RK{:d} }} }}".format(order)
            new_text_g = Tex(new_str_g, "\leq", font_size=self.ftz, tex_to_color_map={str(order): GREEN})
            new_text_g.move_to(text_g).shift(LEFT * 0.05)
            self.play(
                TransformMatchingTex(text_g, new_text_g),
                number_g.animate.shift(RIGHT * 0.05),
                *[curve.animate.set_fill(rgba_to_color(color_fill), opacity=0.75) for curve in curves_marginal],
                rect.animate.set_fill(rgba_to_color(color_fill)),
                run_time=3.
            )
        else:
            rect_stability = Rectangle(width=np.abs(self.ax_limits[0]),
                                       height=self.delta_y, stroke_width=0., )
            rect_stability.move_to(self.axes.c2p(0.5 * self.ax_limits[0], 0.)).scale(1.2)
            new_text_g = Tex("G \leq ", font_size=self.ftz)
            new_text_g.move_to(text_g).shift(LEFT * 0.05)
            self.play(
                TransformMatchingTex(text_g, new_text_g),
                number_g.animate.shift(RIGHT * 0.05),
                rect_stability.animate.set_fill(rgba_to_color(color_fill), opacity=0.75),
                rect.animate.set_fill(rgba_to_color(color_fill)),
                run_time=3.
            )

        return
