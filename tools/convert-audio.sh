#!/usr/bin/env bash

set -e

self_directory=$(dirname -- "$0")
project_directory=$(dirname -- "${self_directory}")

asset_directory="${project_directory}/public/assets"
music_directory="${asset_directory}/music"
sound_directory="${asset_directory}/sounds"

vbr_quality=80

self_directory=$(realpath -- "${0%/*}")

convert() {
    afconvert \
        --data "aac" \
        --quality 127 \
        --strategy 3 \
        --userproperty "vbrq" "${vbr_quality}" \
        --file "m4af" \
        "${1}" "${1%.*}.m4a"
}

for f in "${music_directory}/"* "${sound_directory}/"*; do
    case "${f}" in
        *".wav"|*".aiff" )
            echo "convert: ${f}"
            convert "${f}"
            unlink "${f}"
            ;;
    esac
done
