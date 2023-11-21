from manimlib import *
from matplotlib.cm import get_cmap


class Birthday(Scene):
    def construct(self):
        ft_sz_1 = 250
        ft_sz_2 = 160
        ft_sz_3 = 80

        equation = VGroup(
            Tex(r"09", font_size=ft_sz_2),  # 0
            Tex(r"/", font_size=ft_sz_2),  # 1
            Tex(r"05", font_size=ft_sz_2),  # 2
            Tex(r"\vdots", font_size=ft_sz_3),  # 3
            Tex(r"3^{2}", font_size=ft_sz_3),  # 4
            Tex(r"3+2", font_size=ft_sz_3),  # 5
            Tex(r"\vdots", font_size=ft_sz_3),  # 6
            Tex(r"\vdots", font_size=ft_sz_3),  # 7
            Tex(r"2+3", font_size=ft_sz_3),  # 8
        )
        equation[:3].arrange(RIGHT, buff=LARGE_BUFF)
        equation[3].next_to(equation[0], DOWN, buff=MED_SMALL_BUFF)
        equation[4].next_to(equation[3], DOWN, buff=MED_SMALL_BUFF)
        equation[6].next_to(equation[2], DOWN, buff=MED_SMALL_BUFF)
        equation[5].next_to(equation[6], DOWN, buff=1.75 * MED_SMALL_BUFF)
        equation[7].next_to(equation[2], UP, buff=MED_SMALL_BUFF)
        equation[8].next_to(equation[7], UP, buff=MED_SMALL_BUFF)

        equation[6].rotate(180. * DEGREES)
        equation[7].rotate(180. * DEGREES)

        age = Tex(r"23", font_size=ft_sz_1)
        rect = Rectangle(3.5, 3.5)
        rect.move_to(age)
        rect.set_stroke(WHITE, 2)

        self.play(Write(equation[0]))
        self.show_dots(equation[3])
        self.play(Write(equation[4]))
        self.play(TransformMatchingTex(equation[4], equation[5]))
        self.show_dots(equation[6], equation[5])

        self.play(
            FadeIn(equation[1]),
            Write(equation[2]),
        )
        self.show_dots(equation[7])
        self.play(Write(equation[8]))

        self.play(
            FadeOut(equation[:4]),
            FadeOut(equation[6:]),
            TransformMatchingTex(equation[8], age),
        )

        self.play(
            DrawBorderThenFill(rect),
        )

        # age_above = Tex(r"23", font_size=ft_sz_1)
        # self.remove(age)
        # self.add(age_above)
        #
        # tracker = ValueTracker(0.)
        # colormap = "hsv"
        # a = 5.5
        #
        # map_t = lambda t: np.fmod(a * t, 1.) * (np.fmod(a * t, 2.) < 1.) \
        #                   + (1. - np.fmod(a * t, 1.)) * (np.fmod(a * t, 2.) > 1.)
        #
        # def func_get_color():
        #     t = tracker.get_value()
        #     ft = map_t(t)
        #     return rgba_to_color(get_cmap(colormap)(ft))
        #
        # def func_get_opacity():
        #     t = tracker.get_value()
        #     return min(min(1., 4. * t), 4. - 4. * t)
        #     # return np.exp(-50. * (t - 0.5) ** 4)
        #
        # def func_get_text_color():
        #     t = tracker.get_value()
        #     ft = map_t(t)
        #     # ft = np.fmod(ft + 0.5, 1.)
        #     ft = 1. - ft
        #     rgba = get_cmap(colormap)(ft)
        #     prc = min(min(1., 4. * t), 4. - 4. * t)
        #     rgba = (1 - prc) * np.array([1., 1., 1., 1.]) + prc * np.array(rgba)
        #     return rgba_to_color(rgba)
        #
        # f_always(rect.set_fill, func_get_color, func_get_opacity)
        # f_always(age_above.set_color, func_get_text_color)
        #
        # self.play(
        #     tracker.animate.set_value(1),
        #     # rect.animate.set_fill(rgba_to_color(get_cmap("hsv")(f(tracker.get_value())))),
        #     run_time=3.,
        #     rate_func=linear
        # )
        self.play(
            FadeOut(rect),
            FadeOut(age),
            run_time=0.5
        )
        print("end")

    def show_dots(self, eq, eq_rm=None):
        if eq_rm:
            self.play(
                Write(eq, lag_ratio=1.),
                FadeOut(eq_rm),
                run_time=0.5
            )
        else:
            self.play(Write(eq, lag_ratio=1.), run_time=0.5)
        self.remove(eq)
        self.play(Write(eq, lag_ratio=1., rate_func=lambda t: 1. - t, run_time=0.5))
