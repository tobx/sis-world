#!/usr/bin/env bash

set -e

self_directory=$(dirname -- "$0")
project_directory=$(dirname -- "${self_directory}")

tileset_directory="${project_directory}/public/assets/tilesets"

for file in "${tileset_directory}"/*.png; do
    if [ -f "${file}" ]; then
        cwebp -z 9 -progress -o "${file%.*}.webp" -- "${file}"
    fi
done

