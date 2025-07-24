import bpy
import os
import numpy as np

# Chemin vers votre fichier CSV
eps = 35.0
ecc = 0.1
path = f"~/Documents/Math_animations/Analemma/data/eps_{eps:02.0f}_ecc_{100*ecc:02.0f}"
x_filepath = os.path.expanduser(f"{path}_x.txt")
y_filepath = os.path.expanduser(f"{path}_y.txt")
z_filepath = os.path.expanduser(f"{path}_z.txt")
s_filepath = os.path.expanduser(f"{path}_s.txt")

x = np.loadtxt(x_filepath)
y = np.loadtxt(y_filepath)
z = np.loadtxt(z_filepath)
s = np.loadtxt(s_filepath)

assert (x.shape == y.shape)
assert (x.shape == z.shape)
assert (x.shape == s.shape)
n_p, n_t = x.shape

s = np.clip(s / np.amax(s), 0.05, None)
width = 2.0 / s ** 0.5
average_width = np.mean(width)

# Supprimer les objets existants
for obj in bpy.data.objects:
    if obj.name.startswith("CurveObject_"):
        bpy.data.objects.remove(obj, do_unlink=True)

for i in range(n_p):
    # Créer une nouvelle courbe
    curve_data = bpy.data.curves.new(name=f"Curve_{i}", type='CURVE')
    curve_data.dimensions = '3D'
    curve_data.resolution_u = 2
    
    curve_data.bevel_depth = 0.1  # Initial bevel depth, will be overridden by point radii
    curve_data.bevel_resolution = 1
    
    # Créer une nouvelle spline
    spline = curve_data.splines.new('POLY')
    spline.points.add(n_t + 1 - 1)
    
    # Remplir la spline avec les points
    for j in range(n_t):
        xpt, ypt, zpt = 1 - x[i, j], y[i, j], z[i, j]
        spline.points[j].co = (xpt, ypt, zpt, 1)
        spline.points[j].radius = width[i, j]
    spline.points[n_t].co = (1 - x[i, 0], y[i, 0], z[i, 0], 1)
    spline.points[n_t].radius = width[i, 0]
    
    # Créer un objet courbe
    curve_object = bpy.data.objects.new(f"CurveObject_{i}", curve_data)

    # Lier l'objet à la scène actuelle
    bpy.context.collection.objects.link(curve_object)
    
    # Set initial visibility to hidden
    curve_object.hide_viewport = True
    curve_object.hide_render = True
    curve_object.keyframe_insert(data_path="hide_viewport", frame=i)
    curve_object.keyframe_insert(data_path="hide_render", frame=i)

    # Set visibility to visible at the current frame
    curve_object.hide_viewport = False
    curve_object.hide_render = False
    curve_object.keyframe_insert(data_path="hide_viewport", frame=i + 1)
    curve_object.keyframe_insert(data_path="hide_render", frame=i + 1)

    # Set visibility to hidden at the next frame
    curve_object.hide_viewport = True
    curve_object.hide_render = True
    curve_object.keyframe_insert(data_path="hide_viewport", frame=i + 2)
    curve_object.keyframe_insert(data_path="hide_render", frame=i + 2)

# Configurer l'animation
bpy.context.scene.frame_start = 0
bpy.context.scene.frame_end = n_p