from manimlib import *


class Flow2D(Scene):

    def construct(self):
        # func = lambda x, y: np.array([-x, -y])
        # func = lambda x, y: np.array([-y, x]) + 2*np.exp(-((x-1.)**2+(y-0.)**2)/0.2) * np.array([1, 0.])
        func = lambda x, y: np.array([y, -0.1 * y - np.sin(x)])

        # ratio = 16. / 9.
        x_max = 2.5 * np.pi
        y_max = 3.5
        axes = Axes((-x_max, x_max, x_max), (-y_max, y_max, y_max), height=9, width=16)
        # axes.add_coordinate_labels(font_size=20, num_decimal_places=0)

        vector_field = VectorField(
            func,
            axes,
            step_multiple=0.1,
            magnitude_range=(0, 4),
            length_func=lambda norm: 0.45 * sigmoid(norm),
            stroke_width=1.,
            opacity=0.5,
        )
        stream_lines = StreamLines(
            func,
            axes,
            step_multiple=0.1,
            stroke_width=3.,
        )
        animated_stream_lines = AnimatedStreamLines(
            stream_lines,
        )

        self.add(axes, vector_field, animated_stream_lines)
        return
