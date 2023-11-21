from manimlib import *


def u_exact_example_1(t, u_zero, t_zero):
    return u_zero * np.exp(-(t * t - t_zero * t_zero) / 2.)


def u_exact_example_2(t, u_zero, t_zero):
    q = 1.5 * (u_zero + u_zero ** 3 / 3. + (t ** 3 - t_zero ** 3) / 3.)
    hyp = np.hypot(q, 0 * q + 1.)
    return np.cbrt(q + hyp) + np.cbrt(q - hyp)


odes = {
    "case_1": (-0.5, 1., 1.5,
               [-1., 2., -1., 2.],
               (lambda self, u, t: -u * t),
               (lambda self, t: u_exact_example_1(t, self.u_zero, self.t_zero)),
               r"-ut",
               r"U \exp(-\frac{{t^2-T^2}}{{2}})"),
    "case_2": (-1.75, -0.25, 2.,
               [-2., 2., -1., 3.],
               (lambda self, u, t: t * t / (1. + u * u)),
               (lambda self, t: u_exact_example_2(t, self.u_zero, self.t_zero)),
               r"{ {{t^2}} \over {{1}} + {{u^2}} }",
               r"\textrm{root}\left(\frac{u^3-U}{3} + u - U + \frac{T^3-t^3}{3}\right)"),
}

all_schemes = {
        "Euler": ([0.], [1.]),
        "RK2C": ([0., 0.5], [0., 1.0]),
        "Heun": ([0.0, 1.0], [0.5, 0.5]),
        "Heun 3": ([0., 1. / 3., 2. / 3.], [1. / 4., 0., 3. / 4.]),
        "RK4C": ([0., 0.5, 0.5, 1.], [1. / 6., 1. / 3., 1. / 3., 1. / 6.])
}


class RungeKutta(Scene):
    # ODE parameters
    t_zero, u_zero, dt, ax_limits, dudt, u_exact, dudt_name, analytic_name = odes["case_1"]

    # RK4 parameters
    scheme_name = "RK4C"
    alphas, gammas = all_schemes[scheme_name]

    # Display parameters
    ftz = 40
    offset = (ax_limits[3] - ax_limits[2]) * 0.05
    y_positions = np.linspace(ax_limits[3] - offset, ax_limits[2] + offset, 5)
    box_x_pos = ax_limits[1] + (ax_limits[1] - ax_limits[0]) * 0.2
    colors = [RED, "#61AFEF", GOLD, GREEN]
    axes, gauss_graph = None, None

    def construct(self):
        animate_ode_intro = False
        animate_vector_field = False
        self.setup_axes(animate=animate_ode_intro)
        self.display_ode_info(animate=animate_ode_intro)
        self.display_ut_zero(animate=animate_ode_intro)
        self.display_vector_field(animate=animate_vector_field)
        self.display_analytical(animate=animate_vector_field)
        self.display_scheme_info(animate=False)
        self.do_rk_scheme()

    def setup_axes(self, animate=True):
        # Create coordinate axes
        self.axes = Axes((*self.ax_limits[:2], 1.), (*self.ax_limits[2:], 1.), height=7, width=10)
        self.axes.add_coordinate_labels(font_size=20, num_decimal_places=0)
        self.axes.to_corner(DL)
        if animate:
            self.play(Write(self.axes, lag_ratio=0.01, run_time=1.5))
        else:
            self.add(self.axes)

    def display_ode_info(self, animate=True):
        # Create vector field equation box
        equations_src = [
            Tex(r"{ {{\text{d}u}} \over {{\text{d}t}} }", "=", "f", "(", "u", ",", "t", ")", font_size=self.ftz),
            Tex(r"t_0", "=", "T", font_size=self.ftz),
            Tex("u", "(", r"t_0", ")", "=", "U", font_size=self.ftz)
        ]
        equations_dst = [  # r"\frac{\textrm{d}u}{\textrm{d}t}"
            Tex(r"{ {{\text{d}u}} \over {{\text{d}t}} }", "=", self.dudt_name, font_size=self.ftz),
            Tex(r"t_0", "=", str(self.t_zero), font_size=self.ftz),
            Tex("u", "(", "t_0", ")", "=", str(self.u_zero), font_size=self.ftz)
        ]
        rectangles = [Rectangle(2.5, 1.25) for _ in equations_src]

        for eq_src, eq_dst, rect, y_pos in zip(equations_src, equations_dst, rectangles, self.y_positions):
            eq_src.move_to(self.axes.c2p(self.box_x_pos, y_pos))
            eq_dst.move_to(self.axes.c2p(self.box_x_pos, y_pos))
            rect.move_to(self.axes.c2p(self.box_x_pos, y_pos))
            rect.set_fill(BLACK, opacity=0.5).set_stroke(WHITE, 2)

        if animate:
            for rect, eq_src, eq_dst, y_pos in zip(rectangles, equations_src, equations_dst, self.y_positions):
                self.play(
                    DrawBorderThenFill(rect),
                    Write(eq_src),
                    run_time=2.
                )
            self.wait(1)
            # self.play(TransformMatchingShapes(equations_src[0], equations_dst[0]), run_time=2.)
            self.play(TransformMatchingTex(equations_src[0], equations_dst[0], ), run_time=2.)
            for eq_src, eq_dst, y_pos in zip(equations_src[1:], equations_dst[1:], self.y_positions[1:]):
                self.play(TransformMatchingTex(eq_src, eq_dst), run_time=2.)
        else:
            self.add(*rectangles, *equations_dst)

    def display_ut_zero(self, animate=True):
        # Add initial value
        if np.abs(self.t_zero) < 1e-10 or np.abs(self.u_zero) < 1e-10:
            return

        dot_t, dot_u = Dot(), Dot()
        dot_t.move_to(self.axes.c2p(self.t_zero, 0.))
        dot_u.move_to(self.axes.c2p(0., self.u_zero))
        dot_0 = Dot().scale(1.5)
        dot_0.move_to(self.axes.c2p(self.t_zero, self.u_zero))
        vline = DashedLine(dot_t, dot_0, stroke_width=2)
        hline = DashedLine(dot_u, dot_0, stroke_width=2)

        if animate:
            self.play(
                ShowCreation(vline, run_time=1.0),
                ShowCreation(hline, run_time=1.0),
            )
            self.play(FadeIn(dot_0, scale=0.5))
            self.wait(1.)
            self.play(
                FadeOut(vline),
                FadeOut(hline),
            )
            self.wait(1.)
        # else:
        #     self.play(FadeIn(dot_0, scale=0.5))

    def display_vector_field(self, animate=True):
        # Vector field display
        vector_field = VectorField(
            lambda x, y: np.array([1., self.dudt(y, x)]), self.axes,
            step_multiple=(self.ax_limits[1] - self.ax_limits[0]) / 15.,
            magnitude_range=(0, 4.),
            length_func=lambda norm: (self.ax_limits[1] - self.ax_limits[0]) / 20. * sigmoid(norm),
        )
        # self.add(vector_field.set_opacity(0.25))
        if animate:
            self.play(
                LaggedStartMap(GrowArrow, vector_field, lag_ratio=0.05),
                run_time=2.
            )
            self.wait(2.)
            self.play(
                vector_field.animate.set_opacity(0.25)
            )
        else:
            vector_field.set_opacity(0.25)
            self.add(vector_field)

    def display_analytical(self, animate=True):
        self.gauss_graph = self.axes.get_graph(
            function=self.u_exact,
            x_range=(self.t_zero, self.ax_limits[1], (self.ax_limits[1] - self.t_zero) / 200),
            color=YELLOW,
        )
        gauss_label = self.axes.get_graph_label(self.gauss_graph, Tex(self.analytic_name))
        # self.add(gauss_label, self.gauss_graph)
        if animate:
            self.play(
                ShowCreation(self.gauss_graph),
                FadeIn(gauss_label, RIGHT),
                run_time=1.
            )
            self.wait(3.)
            self.play(
                self.gauss_graph.animate.set_stroke(opacity=0.10),
                FadeOut(gauss_label),
            )
        else:
            self.gauss_graph.set_stroke(opacity=0.10)
            self.add(self.gauss_graph)

    def display_scheme_info(self, animate=True):
        equations = [
            Text(self.scheme_name, font_size=self.ftz),
            Tex(r"\Delta t = {:.1f}".format(self.dt), font_size=self.ftz)
        ]
        rectangles = [Rectangle(2.5, 1.25) for _ in equations]
        for eq, rect, y_pos in zip(equations, rectangles, self.y_positions[3:]):
            eq.move_to(self.axes.c2p(self.box_x_pos, y_pos))
            rect.move_to(self.axes.c2p(self.box_x_pos, y_pos))
            rect.set_fill(GREY_C, opacity=0.5).set_stroke(WHITE, 2)
            if animate:
                self.play(
                    DrawBorderThenFill(rect),
                    Write(eq),
                    run_time=2.
                )
            else:
                self.add(rect, eq)

        # eq_dt.move_to(self.axes.c2p(self.box_x_pos, self.y_positions[-1]))
        # rect_dt = Rectangle(2.5, 1.25).move_to(self.axes.c2p(self.box_x_pos, self.y_positions[-1]))
        # rect_dt.set_fill(BLACK, opacity=0.5).set_stroke(WHITE, 2)

    def do_rk_scheme(self):
        # Runge Kutta scheme
        arrow_base_pos, arrow_base_neg = self.u_zero, self.u_zero
        arrows = [Arrow(DOWN, UP, tip_width_ratio=6).set_color(color) for color in self.colors]
        t_stack = self.t_zero + self.dt

        t_pos = ValueTracker(self.t_zero)
        u_pos = ValueTracker(self.u_zero)
        scale = ValueTracker(1.)

        # Nodes where f(u,t) is computed
        dots_eval = [Dot().set_color(color) for color in self.colors]

        # Nodes of the triangle with hypotenuse du/dt
        dot1 = Dot().set_opacity(0.)
        dot2 = Dot().set_opacity(0.)
        dot3 = Dot().move_to(self.axes.c2p(0., 0.)).set_opacity(0.)
        self.add(dot1, dot2, dot3)

        f_always(
            dot1.move_to,
            lambda: self.axes.c2p(t_pos.get_value(), u_pos.get_value())
        )
        f_always(
            dot2.move_to,
            lambda: self.axes.c2p(t_pos.get_value() + self.dt * scale.get_value(), u_pos.get_value())
        )

        text_dt, number_dt = label_dt = VGroup(
            Tex("\Delta t /", font_size=30),
            DecimalNumber(0, show_ellipsis=False, num_decimal_places=0, font_size=25)
        )
        label_dt.arrange(RIGHT, buff=SMALL_BUFF)

        dots_eval[0].move_to(self.axes.c2p(self.t_zero, self.u_zero)).scale(1.5)
        self.play(
            FadeIn(dots_eval[0]),
            run_time=0.5
        )
        self.wait(0.)

        for k, (alpha_k, gamma_k, color) in enumerate(zip(self.alphas, self.gammas, self.colors)):

            self.play(
                t_pos.animate.set_value(self.axes.p2c(dots_eval[k].get_center())[0]),
                u_pos.animate.set_value(self.axes.p2c(dots_eval[k].get_center())[1]),
                run_time=0.
            )

            # slope_k UPDATE
            slope_k = self.dudt(u_pos.get_value(), t_pos.get_value())

            f_always(
                dot3.move_to,
                lambda: self.axes.c2p(t_pos.get_value() + self.dt * scale.get_value(),
                                      u_pos.get_value() + self.dt * slope_k * scale.get_value())
            )
            hline = always_redraw(DashedLine, dot1.get_center(), dot2.get_center())
            vline = always_redraw(DashedLine, dot2.get_center(), dot3.get_center())
            dline = always_redraw(Line, dot1.get_center(), dot3.get_center())

            text_Ki, number_Ki = label_Ki = VGroup(
                Tex(f"K_{k + 1:d} /", font_size=30),
                DecimalNumber(0, show_ellipsis=False, num_decimal_places=0, font_size=25)
            )
            label_Ki.arrange(RIGHT, buff=SMALL_BUFF)

            always(label_Ki.next_to, vline, RIGHT)
            f_always(number_Ki.set_value, lambda: 1. / scale.get_value())
            up_or_down = DOWN if slope_k >= 0. else UP
            always(label_dt.next_to, hline, up_or_down)
            f_always(number_dt.set_value, lambda: 1. / scale.get_value())

            self.play(
                ShowCreation(dline, run_time=2.)
            )
            self.play(
                FadeIn(hline, run_time=1.0),
                FadeIn(vline, run_time=1.0),
                FadeIn(label_Ki, run_time=1.0),
                FadeIn(label_dt, run_time=1.0),
                run_time=0.75
            )
            self.wait(0.)

            if gamma_k > 1e-10:
                self.play(
                    scale.animate.set_value(gamma_k),
                    run_time=1.,
                )
                arrow_base = arrow_base_pos if slope_k > 0. else arrow_base_neg
                dot_1st, dot_2nd = (dot2, dot3) if slope_k > 0. else (dot3, dot2)
                arrows[k] = Arrow(dot_1st, dot_2nd, tip_width_ratio=6).set_color(color)
                arrows[k].set_points_by_ends(
                    self.axes.c2p(*self.axes.p2c(dot2.get_center())),
                    self.axes.c2p(*self.axes.p2c(dot3.get_center())),
                )
                self.play(
                    FadeIn(arrows[k]),
                    arrows[k].animate.set_points_by_ends(
                        self.axes.c2p(t_stack, arrow_base),
                        self.axes.c2p(t_stack, arrow_base + slope_k * self.dt * gamma_k),
                    ),
                    run_time=1.
                )
                arrow_base_pos += max(slope_k * self.dt * gamma_k, 0)
                arrow_base_neg += min(slope_k * self.dt * gamma_k, 0)
                self.wait(1.)

            if k < len(self.gammas) - 1:
                self.play(
                    t_pos.animate.set_value(self.t_zero),
                    u_pos.animate.set_value(self.u_zero),
                    run_time=1.
                )
                self.wait(0.)
                self.play(
                    scale.animate.set_value(self.alphas[k + 1]),
                    run_time=1.,
                )
                dots_eval[k + 1].move_to(
                    self.axes.c2p(self.t_zero + self.dt * self.alphas[k + 1],
                                  self.u_zero + slope_k * self.dt * self.alphas[k + 1])
                )
                self.play(FadeIn(dots_eval[k + 1]), run_time=1, )

            self.play(
                FadeOut(dline),
                FadeOut(hline),
                FadeOut(vline),
                FadeOut(label_dt),
                FadeOut(label_Ki),
                run_time=1
            )
            self.play(scale.animate.set_value(1.), run_time=0)
            self.wait(1)

        # Add (K1+2*K2+2*K3+K4)/6 to get the next u
        u_next = self.u_zero + (arrow_base_pos - self.u_zero) + (arrow_base_neg - self.u_zero)
        dot_1st, dot_2nd = (dot2, dot3) if u_next > self.u_zero else (dot3, dot2)
        du_arrow = Arrow(dot_1st, dot_2nd, tip_width_ratio=4)
        du_arrow.set_points_by_ends(self.axes.c2p(t_stack, self.u_zero), self.axes.c2p(t_stack, u_next))

        fades_to_do = [FadeOut(arrow) for arrow in arrows]
        nb_nnz_gamma = len([g for g in self.gammas if g > 0.])
        run_time_merge_arrows = 4. if nb_nnz_gamma > 1 else 1.
        self.play(
            *fades_to_do,
            FadeIn(du_arrow),
            run_time=run_time_merge_arrows
        )
        self.wait(1)
        next_dot = Dot().set_color(WHITE).scale(1.5).move_to(self.axes.c2p(self.t_zero + self.dt, u_next))
        self.play(
            FadeIn(next_dot),
            FadeOut(du_arrow),
        )
        self.play(
            self.gauss_graph.animate.set_stroke(opacity=1.0),
        )
