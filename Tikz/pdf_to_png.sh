#!/bin/bash

# Dossier contenant les fichiers PDF
input_directory="./pdfs"

# Dossier de sortie pour les fichiers PNG
output_directory="./pngs"

# Créer le dossier de sortie s'il n'existe pas
mkdir -p "$output_directory"

# Boucle pour convertir chaque PDF en PNG avec fond blanc
for pdf in "$input_directory"/*.pdf; do
  output_file="$output_directory/$(basename "$pdf" .pdf).png"
  convert -density 300 "$pdf" -background white -alpha off "$output_file"
done

echo "Conversion terminée !"

