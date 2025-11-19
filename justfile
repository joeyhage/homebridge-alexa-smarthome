set shell := ["bash", "-cu"]

bootstrap:
    [[ -f "$HOME"/.homebridge/config.json ]] && echo "homebridge config already exists" || cp -R ./.homebridge/* "$HOME"/.homebridge/
    npm install
    -ln -s "$(pwd)"/node_modules/homebridge-config-ui-x/ ../

run:
    npm run build
    npx hb-service run \
        --plugin-path ../ \
        --strict-plugin-resolution \
        --user-storage-path ~/.homebridge \
        --stdout