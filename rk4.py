from manimlib import *


class RungeKutta(Scene):
    def construct(self):
        t_zero = -0.5
        u_zero = 1.
        dt = 1.5
        dudt = lambda u, t: -u * t
        ftz = 40

        # Create coordinate axes
        axes = Axes((-1., 2., 1.), (-1., 2., 1.), height=7, width=10)
        axes.add_coordinate_labels(font_size=20, num_decimal_places=0)
        axes.to_corner(DL)
        self.play(Write(axes, lag_ratio=0.01, run_time=1.5))
        # self.wait(1.)

        # Create vector field equation box
        equations_src = [
            Tex(r"\frac{\textrm{d}u}{\textrm{d}t}", "=", "f", "(", "u", ",", "t", ")", font_size=ftz),
            Tex(r"t_0", "=", "T", font_size=ftz),
            Tex("u", "(", r"t_0", ")", "=", "U", font_size=ftz)
        ]
        equations_dst = [
            Tex(r"\frac{\textrm{d}u}{\textrm{d}t}", "=", "-", "u", "t", font_size=ftz),
            Tex(r"t_0", "=", str(t_zero), font_size=ftz),
            Tex("u", "(", "t_0", ")", "=", str(u_zero), font_size=ftz)
        ]
        rectangles = [None for _ in equations_src]
        y_positions = [1.8, 1.1, 0.4, -0.3]

        for i, (eq_src, eq_dst, y_pos) in enumerate(zip(equations_src, equations_dst, y_positions)):
            eq_src.move_to(axes.c2p(2.6, y_pos))
            eq_dst.move_to(axes.c2p(2.6, y_pos))
            rectangles[i] = Rectangle(2.5, 1.25).move_to(axes.c2p(2.6, y_pos))
            rectangles[i].set_fill(BLACK, opacity=0.5).set_stroke(WHITE, 2)

        for rect, eq, y_pos in zip(rectangles, equations_src, y_positions):
            self.play(
                DrawBorderThenFill(rect),
                Write(eq),
                run_time=2.
            )
        self.wait(1)

        self.play(TransformMatchingShapes(equations_src[0], equations_dst[0]), run_time=2.)

        for eq_src, eq_dst, y_pos in zip(equations_src[1:], equations_dst[1:], y_positions[1:]):
            eq_dst.move_to(axes.c2p(2.6, y_pos))
            self.play(TransformMatchingTex(eq_src, eq_dst), run_time=2.)

        # Add initial value
        dot_t, dot_u = Dot(), Dot()
        dot_t.move_to(axes.c2p(t_zero, 0.))
        dot_u.move_to(axes.c2p(0., u_zero))
        dot_0 = Dot().scale(1.5)
        dot_0.move_to(axes.c2p(t_zero, u_zero))
        vline = DashedLine(dot_t, dot_0, stroke_width=2)
        hline = DashedLine(dot_u, dot_0, stroke_width=2)

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

        # Vector field display
        vector_field = VectorField(
            lambda x, y: np.array([1., dudt(y, x)]), axes,
            step_multiple=0.2,
            magnitude_range=(0, 4.),
            length_func=lambda norm: 0.15 * sigmoid(norm),
        )
        # self.add(vector_field.set_opacity(0.25))
        self.play(
            LaggedStartMap(GrowArrow, vector_field, lag_ratio=0.01),
            run_time=3.
        )
        self.wait(3.)
        self.play(
            vector_field.animate.set_opacity(0.25)
        )

        # # Axes.get_graph will return the graph of a function
        gauss_graph = axes.get_graph(
            function=lambda x: u_zero * math.exp(-(x * x - t_zero * t_zero) / 2.),
            x_range=(t_zero, 2., 0.01),
            color=YELLOW,
        )
        gauss_label = axes.get_graph_label(gauss_graph, Tex(r"U \exp(-\frac{{t^2-T^2}}{{2}})"))
        # self.add(gauss_label, gauss_graph)
        self.play(
            ShowCreation(gauss_graph),
            FadeIn(gauss_label, RIGHT),
            run_time=1.
        )
        self.wait(3.)
        self.play(
            gauss_graph.animate.set_stroke(opacity=0.10),
            FadeOut(gauss_label),
        )

        eq_dt = Tex(r"\Delta t = {:.1f}".format(dt), font_size=ftz).move_to(axes.c2p(2.6, y_positions[-1]))
        rect_dt = Rectangle(2.5, 1.25).move_to(axes.c2p(2.6, y_positions[-1]))
        rect_dt.set_fill(BLACK, opacity=0.5).set_stroke(WHITE, 2)
        self.play(
            DrawBorderThenFill(rect_dt),
            Write(eq_dt),
            run_time=2.
        )

        # Runge Kutta scheme
        alphas = [0., 0.5, 0.5, 1.]
        gammas = [1. / 6., 1. / 3., 1. / 3., 1. / 6.]
        colors = [WHITE, RED, GREEN, BLUE]

        arrow_base_pos, arrow_base_neg = u_zero, u_zero
        arrows = [None for _ in gammas]
        t_stack = t_zero + dt

        t_pos = ValueTracker(t_zero)
        u_pos = ValueTracker(u_zero)
        scale = ValueTracker(1.)

        # Nodes where f(u,t) is computed
        dots_eval = [Dot().set_color(color) for color in colors]

        # Nodes of the triangle with hypotenuse du/dt
        dot1 = Dot().set_opacity(0.)
        dot2 = Dot().set_opacity(0.)
        dot3 = Dot().move_to(axes.c2p(0., 0.)).set_opacity(0.)
        self.add(dot1, dot2, dot3)

        f_always(
            dot1.move_to,
            lambda: axes.c2p(t_pos.get_value(), u_pos.get_value())
        )
        f_always(
            dot2.move_to,
            lambda: axes.c2p(t_pos.get_value() + dt * scale.get_value(), u_pos.get_value())
        )

        text_dt, number_dt = label_dt = VGroup(
            Tex("\Delta t /", font_size=30),
            DecimalNumber(0, show_ellipsis=False, num_decimal_places=0, font_size=25)
        )
        label_dt.arrange(RIGHT, buff=SMALL_BUFF)

        dots_eval[0].move_to(axes.c2p(t_zero, u_zero)).scale(1.5)
        self.play(
            FadeIn(dots_eval[0]),
            run_time=0.5
        )

        for k, (alpha_k, gamma_k) in enumerate(zip(alphas, gammas)):

            self.play(
                t_pos.animate.set_value(axes.p2c(dots_eval[k].get_center())[0]),
                u_pos.animate.set_value(axes.p2c(dots_eval[k].get_center())[1]),
                run_time=0.
            )

            # slope_k UPDATE

            slope_k = dudt(t_pos.get_value(), u_pos.get_value())

            f_always(
                dot3.move_to,
                lambda: axes.c2p(t_pos.get_value() + dt * scale.get_value(),
                                 u_pos.get_value() + dt * slope_k * scale.get_value())
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

            self.play(
                scale.animate.set_value(gamma_k),
                run_time=1.,
            )
            arrows[k] = Arrow(dot3, dot2, tip_width_ratio=6)
            arrow_base = arrow_base_pos if slope_k > 0. else arrow_base_neg
            self.play(
                FadeIn(arrows[k]),
                arrows[k].animate.set_points_by_ends(axes.c2p(t_stack, arrow_base),
                                                     axes.c2p(t_stack, arrow_base + slope_k * dt * gamma_k)),
                run_time=1.
            )
            arrow_base_pos += max(slope_k * dt * gamma_k, 0)
            arrow_base_neg += min(slope_k * dt * gamma_k, 0)
            self.wait(1.)

            if k < len(gammas) - 1:
                self.play(
                    t_pos.animate.set_value(t_zero),
                    u_pos.animate.set_value(u_zero),
                    run_time=1.
                )
                self.play(
                    scale.animate.set_value(alphas[k + 1]),
                    run_time=1.,
                )
                dots_eval[k + 1].move_to(axes.c2p(t_zero + dt * alphas[k + 1], u_zero + slope_k * dt * alphas[k + 1]))
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
        u_next = u_zero + (arrow_base_pos - u_zero) + (arrow_base_neg - u_zero)
        du_arrow = Arrow(dot1, dot2, tip_width_ratio=3)
        du_arrow.set_points_by_ends(axes.c2p(t_stack, u_zero), axes.c2p(t_stack, u_next))
        self.play(
            FadeOut(arrows[0]),
            FadeOut(arrows[1]),
            FadeOut(arrows[2]),
            FadeOut(arrows[3]),
            FadeIn(du_arrow),
            run_time=4.
        )
        self.wait(1)
        next_dot = Dot().set_color(WHITE).scale(1.5).move_to(axes.c2p(t_zero + dt, u_next))
        self.play(
            du_arrow.animate.set_points_by_ends(axes.c2p(t_zero + dt, u_zero),
                                                axes.c2p(t_zero + dt, u_next)),
        )
        self.play(
            FadeIn(next_dot),
            FadeOut(du_arrow),
        )
        self.play(
            gauss_graph.animate.set_stroke(opacity=1.0),
        )
