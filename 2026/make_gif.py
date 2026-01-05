from PIL import Image
import os


def make_gif(
    png_files, output="output.gif", skip=2, scale=0.5, colors=128, duration=100
):
    frames = []

    for f in png_files[::skip]:
        img = Image.open(f)
        w, h = img.size
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        img = img.convert("P", palette=Image.ADAPTIVE, colors=colors)
        frames.append(img)

    frames[0].save(
        output,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        optimize=True,
    )


if __name__ == "__main__":

    png_files = [
        os.path.join("./frames", f)
        for f in sorted(os.listdir("frames"))
        if f.endswith(".png")
    ]

    make_gif(png_files, skip=1, scale=0.3, colors=32, duration=25)
