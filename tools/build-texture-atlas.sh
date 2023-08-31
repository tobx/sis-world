#!/usr/bin/env bash

set -e

self_directory=$(dirname -- "$0")
project_directory=$(dirname -- "${self_directory}")

project_file="${project_directory}/assets/textures/atlas.ftpp"
output_directory="${project_directory}/public/assets/atlases"

quality=9

if [ $# -eq 1 ]; then
    quality="$1"
fi

"${self_directory}/create-free-texture-packer-project-file.js"
npx free-tex-packer-cli --project "${project_file}" --output "${output_directory}"
"${self_directory}/convert-aseprite-spritesheets.js"
cwebp -z "${quality}" -mt -progress -o "${output_directory}/atlas.webp" -- "${output_directory}/atlas.png"
