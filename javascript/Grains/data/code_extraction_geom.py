# -*- coding: utf-8 -*-
"""
Created on Mon Jan 29 11:33:00 2024

@author: ghanon
"""
import numpy as np
#from scipy.spatial import ConvexHull
from convex_hull import compute_hull_full, is_left
import matplotlib.pyplot as plt

node_definition=np.loadtxt(r"./voro2Dnodes.inp",delimiter=", ",skiprows=1)
element_definition = np.loadtxt(r"./voro2Delements.inp",delimiter=" ,",skiprows=1)
#grain_definition = np.loadtxt(r"C:\Users\ghanon\Desktop\animation Vincent\geometrie\voro2Delements.inp",skiprows=1)
chemin_du_fichier = r"./voro2Delements.inp"

class ElementSet:
    def __init__(self, name):
        self.name = name
        self.elements = []

def analyser_elements(data):
    sets = {}
    current_set = None

    for line in data:
        if line.startswith('*ELSET'):
            #print("true")
            if current_set:
                sets[current_set.name] = current_set
            set_name = line.split('=')[1].strip()
            current_set = ElementSet(set_name)
        elif current_set:
            
            elements = [int(elem) for elem in line.replace('\n', '').rstrip(',').split(',')]
            current_set.elements.extend(elements)

    if current_set:
        sets[current_set.name] = current_set

    return sets

def analyser_fichier(fichier):
    with open(fichier, 'r') as file:
        #print("ici")
        data = file.readlines()
        #print(data)
    return analyser_elements(data)

chemin_fichier = r"./voro2DsetElements.inp"  # Remplacez cela par le chemin réel de votre fichier
resultats = analyser_fichier(chemin_fichier)
#for i: #explorer tous les grains 
 #recupere tous les elements de chacun des grains:
  #recuperer tous kes noeuds de chacun des elemnts 7
  #extraire le convxer de HUll pour chacun des grains

map_unique = {}


coords_x = open('nodes_x.txt', 'w')
coords_y = open('nodes_y.txt', 'w')
polygons = open('polygons.txt', 'w')

x_str = ""
y_str = ""

for i in range(len(resultats)):
    name = "GRAIN"+str(i+1)
    print(name)
    el_set = resultats[name].elements
    
    noeuds_dans_element_set = [node for element in element_definition if element[0] in el_set for node in element[1:]]
    noeuds_dans_element_set = np.unique(np.array(noeuds_dans_element_set).astype(int))
    node_coords = node_definition[np.isin(node_definition[:, 0], noeuds_dans_element_set),1:]
    
    # hull = ConvexHull(node_coords)
    indices_enveloppe = compute_hull_full(node_coords)[:-1]
    
    for idx_env in indices_enveloppe:
        node_hull = noeuds_dans_element_set[idx_env]
        if node_hull not in map_unique:
            x_str += f"{node_coords[idx_env, 0]:.3e} "
            y_str += f"{node_coords[idx_env, 1]:.3e} "
            coords_x.write(f"{node_coords[idx_env, 0]:.3e} ")
            coords_y.write(f"{node_coords[idx_env, 1]:.3e} ")
            map_unique[node_hull] = len(map_unique)
        polygons.write(f'{map_unique[node_hull]:d} ')
    polygons.write('\n')
    
    coordonnees_enveloppe = node_coords[indices_enveloppe]
    
    #if i % 100 == 0:
    # Plot the points and the convex hull    
    plt.plot(node_coords[:, 0], node_coords[:, 1], '.', alpha=0.75, ms=2)
    plt.plot(
        np.r_[node_coords[indices_enveloppe, 0], node_coords[indices_enveloppe[0], 0]], 
        np.r_[node_coords[indices_enveloppe, 1], node_coords[indices_enveloppe[0], 1]], 
        '-o', color='C0', ms=3, lw=1.5
    )
    # for idx in indices_enveloppe:
    #     plt.text(node_coords[idx, 0], node_coords[idx, 1], f"{map_unique[noeuds_dans_element_set[idx]]}", fontsize=8)

plt.show()

polygons.close()

## static nodes --> copy paste
nt = 275

coords_x.write("\n")
coords_y.write("\n")
for t in range(1, nt):
    coords_x.write(x_str + "\n")
    coords_y.write(y_str + "\n")

coords_x.close()
coords_y.close()
