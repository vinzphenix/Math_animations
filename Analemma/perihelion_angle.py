import numpy as np
from numpy import pi

def R(ax: int, theta: float) -> np.ndarray:
    c = np.cos(theta)
    s = np.sin(theta)

    if ax == 1:  # Rotation around x-axis
        return np.array([[1, 0, 0], [0, c, s], [0, -s, c]])
    elif ax == 2:  # Rotation around y-axis
        return np.array([[c, 0, -s], [0, 1, 0], [s, 0, c]])
    elif ax == 3:  # Rotation around z-axis
        return np.array([[c, s, 0], [-s, c, 0], [0, 0, 1]])
    else:
        raise ValueError("Axis must be 1 (x), 2 (y), or 3 (z).")


e = np.deg2rad(23.43928108)  # Earth Obliquity of the ecliptic


# JPL Approximate Positions of the Planets: https://ssd.jpl.nasa.gov/planets/approx_pos.html
# Report of the IAU Working Group on Cartographic Coordinates and Rotational Elements: 2009

data = {
    "Mercury": {
        "e": 0.20563661,
        "i": 7.00559432,
        "w": 77.45771895,
        "O": 48.33961819,
        "a": 281.0097,
        "d": 61.4144,
        "tilt_soluce": 0.035,
        "lambda_soluce": 104
    },
    "Venus": {
        "e": 0.00676399,
        "i": 3.39777545,
        "w": 131.76755713,
        "O": 76.67261496,
        "a": 272.76,  # Venus is retrograde
        "d": 67.16,  # Venus is retrograde
        "tilt_soluce": 180-177.36,
        "lambda_soluce": 253.7
    },
    "Earth": {
        "e": 0.01673163,
        "i": 0.0,
        "w": 102.93768193,
        "O": 0.0,
        "a": 0,
        "d": 90,
        "tilt_soluce": 23.44,
        "lambda_soluce": 282.94
    },
    "Mars" : {
        "e": 0.09336511,
        "i": 1.85181869,
        "w": -23.91744784,
        "O": 49.71320984,
        "a": 317.68143,
        "d": 52.88650,
        "tilt_soluce": 25.19,
        "lambda_soluce": 251.6
    },
    "Jupiter": {
        "e": 0.04853590,
        "i": 1.29861416,
        "w": 14.27495244,
        "O": 100.29282654,
        "a": 268.056595,
        "d": 64.495303, 
        "tilt_soluce": 3.13,
        "lambda_soluce": 57.0
    },
    "Saturn": {
        "e": 0.05550825,
        "i": 2.49424102,
        "w": 92.86136063,
        "O": 113.63998702,
        "a": 40.589,
        "d": 83.537,
        "tilt_soluce": 26.73,
        "lambda_soluce": 280.1
    },
    "Uranus": {
        "e": 0.04685740,
        "i": 0.77298127,
        "w": 172.43404441,
        "O": 73.96250215,
        "a": 257.311,  # Uranus is retrograde
        "d": -15.175,  # Uranus is retrograde
        "tilt_soluce": 180-97.77,
        "lambda_soluce": 182
    },
    "Neptune": {
        "e": 0.00895439,
        "i": 1.77005520,
        "w": 46.68158724,
        "O": 131.78635853,
        "a": 299.36,
        "d": 43.46,
        "tilt_soluce": 28.3,
        "lambda_soluce": 10.2
    }
}

# planet = "Mercury"
# planet = "Venus"
# planet = "Earth"
planet = "Mars"
# planet = "Jupiter"
# planet = "Saturn"
# planet = "Uranus"
# planet = "Neptune"
a = np.deg2rad(data[planet]["a"])  # North pole right ascension
d = np.deg2rad(data[planet]["d"])  # North pole declination
O = np.deg2rad(data[planet]["O"])  # Longitude of the ascending node
i = np.deg2rad(data[planet]["i"])  # Orbit inclination
w = np.deg2rad(data[planet]["w"])  # Longitude of periapsis
w -= O  # Argument of periapsis
tilt_soluce = data[planet].get("tilt_soluce", None)
lambda_soluce = data[planet].get("lambda_soluce", None)

RD = R(2, d)
RA = R(3, -a)
RE = R(1, e)
RO = R(3, O)
RI = R(1, i)
RW = R(3, w)

v = RW @ RI @ RO @ RE @ RA @ RD @ np.array([1, 0, 0])
w1, w2, w3 = v
w = np.hypot(w1, w2)
estimated_tilt = np.arccos(w3)
sinb = +w1 / w
cosb = -w2 / w
beta = np.arctan2(sinb, cosb)
peri_to_vernal = np.rad2deg(beta)
vernal_to_peri = (360 - peri_to_vernal) % 360
winter_to_peri = (90 - peri_to_vernal) % 360

print(f"Solution for {planet} (in degrees):")

print(f"Computed tilt: {np.rad2deg(estimated_tilt):7.4f}")
if tilt_soluce is not None:
    print(f"Expected tilt: {tilt_soluce:7.4f}")

print(f"Computed angle from vernal equinox to perihelion: {vernal_to_peri:7.4f}")
if lambda_soluce is not None:
    print(f"Expected angle from vernal equinox to perihelion: {lambda_soluce:7.4f}")
print(f"Computed angle from winter solst.  to perihelion: {winter_to_peri:7.4f}")
