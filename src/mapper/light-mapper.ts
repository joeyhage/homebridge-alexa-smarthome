import * as O from 'fp-ts/Option';
import nearestColor from 'nearest-color';

// expected hue range: [0, 360]
// expected saturation range: [0, 1]
// expected lightness range: [0, 1]
// Based on http://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
function hslToRgb(h: number, s = 1, l = 1) {
  function padding(num: number) {
    const numBase16 = num.toString(16);
    if (numBase16.length < 2) {
      return `0${numBase16}`;
    }
    return numBase16;
  }

  let r = 0;
  let g = 0;
  let b = 0;
  h = h / 360;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = l * (1 - s);
  const q = l * (1 - f * s);
  const t = l * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0:
      r = l;
      g = t;
      b = p;
      break;

    case 1:
      r = q;
      g = l;
      b = p;
      break;

    case 2:
      r = p;
      g = l;
      b = t;
      break;

    case 3:
      r = p;
      g = q;
      b = l;
      break;

    case 4:
      r = t;
      g = p;
      b = l;
      break;

    case 5:
      r = l;
      g = p;
      b = q;
      break;
  }
  return `#${padding(Math.round(r * 255))}${padding(
    Math.round(g * 255),
  )}${padding(Math.round(b * 255))}`;
}

const colorNames = {
  medium_sea_green: '#57ffa0',
  dark_turquoise: '#01fbff',
  sky_blue: '#93e0ff',
  old_lace: '#fff7e8',
  light_salmon: '#ffa07a',
  ghost_white: '#f7f7ff',
  orange_red: '#ff4400',
  lime_green: '#40ff40',
  deep_pink: '#ff1491',
  hot_pink: '#ff68b6',
  sea_green: '#52ff9d',
  dodger_blue: '#1e8fff',
  goldenrod: '#ffc227',
  red: '#ff0000',
  blue: '#4100ff',
  fuchsia: '#ff00ff',
  green_yellow: '#afff2d',
  pale_goldenrod: '#fffab7',
  light_green: '#99ff99',
  light_sea_green: '#2ffff5',
  saddle_brown: '#ff7c1f',
  cornsilk: '#fff7db',
  dark_slate_gray: '#91ffff',
  gainsboro: '#ffffff',
  cadet_blue: '#96fbff',
  medium_blue: '#0000ff',
  wheat: '#ffe7ba',
  indian_red: '#ff7272',
  antique_white: '#fff0db',
  plum: '#ffb9ff',
  papaya_whip: '#ffefd6',
  web_maroon: '#ff0000',
  lavender_blush: '#ffeff4',
  cyan: '#00ffff',
  burlywood: '#ffd29c',
  floral_white: '#fff9ef',
  navajo_white: '#ffddad',
  medium_turquoise: '#57fff9',
  royal_blue: '#4876ff',
  light_goldenrod: '#ffffd6',
  navy_blue: '#0000ff',
  light_sky_blue: '#8ad2ff',
  medium_aquamarine: '#7fffd5',
  orchid: '#ff84fd',
  seashell: '#fff4ed',
  pale_turquoise: '#bcffff',
  yellow_green: '#bfff46',
  brown: '#ff3d3e',
  dark_khaki: '#fff891',
  spring_green: '#00ff7f',
  dark_violet: '#b300ff',
  purple: '#ab24ff',
  turquoise: '#48ffed',
  dim_gray: '#ffffff',
  dark_cyan: '#00ffff',
  tan: '#ffddab',
  pink: '#ffbfcc',
  dark_blue: '#0000ff',
  light_steel_blue: '#cae2ff',
  rebecca_purple: '#aa55ff',
  light_yellow: '#ffffe0',
  aqua: '#34feff',
  yellow: '#ffff00',
  dark_orchid: '#bf40ff',
  light_cyan: '#e0ffff',
  blue_violet: '#9b30ff',
  dark_salmon: '#ffa486',
  web_green: '#00ff3d',
  moccasin: '#ffe1b5',
  forest_green: '#3cff3c',
  gold: '#ffd400',
  lime: '#c7ff1e',
  olive: '#fffc4b',
  medium_orchid: '#e066ff',
  slate_blue: '#856fff',
  dark_green: '#00ff00',
  bisque: '#ffe2c4',
  coral: '#ff7e4f',
  salmon: '#ffa07a',
  powder_blue: '#c3f9ff',
  steel_blue: '#60b7ff',
  lawn_green: '#79ff41',
  firebrick: '#ff2f2f',
  olive_drab: '#bfff3f',
  white_smoke: '#ffffff',
  linen: '#fff5eb',
  alice_blue: '#eff7ff',
  medium_spring_green: '#1aff9d',
  violet: '#ff8bff',
  light_pink: '#ffb5c1',
  dark_magenta: '#ff00ff',
  web_gray: '#ffffff',
  maroon: '#ff468d',
  medium_violet_red: '#ff1aab',
  crimson: '#ff2545',
  tomato: '#ff6347',
  pale_green: '#9dff9d',
  white: '#ffffff',
  lavender: '#9f7fff',
  light_blue: '#c1f0ff',
  mint_cream: '#f4fff9',
  chocolate: '#ff8025',
  dark_red: '#ff0000',
  medium_slate_blue: '#8370ff',
  light_slate_gray: '#c6e1ff',
  magenta: '#ff00ff',
  dark_olive_green: '#a1ff6e',
  medium_purple: '#ac82ff',
  gray: '#ffffff',
  silver: '#ffffff',
  green: '#00ff00',
  chartreuse: '#7fff00',
  sienna: '#ff8248',
  peach_puff: '#ffd8ba',
  midnight_blue: '#3939ff',
  thistle: '#ffe2ff',
  indigo: '#9000ff',
  light_coral: '#ff8888',
  blanched_almond: '#ffeacc',
  web_purple: '#ff00ff',
  slate_gray: '#c9e4ff',
  rosy_brown: '#ffc1c1',
  sandy_brown: '#ffaa64',
  teal: '#34feff',
  misty_rose: '#ffe2e0',
  pale_violet_red: '#ff82ac',
  beige: '#ffffe5',
  dark_orange: '#ff8a25',
  dark_gray: '#ffffff',
  peru: '#ffa44f',
  deep_sky_blue: '#38bdff',
  dark_goldenrod: '#ffbb0e',
  ivory: '#ffffef',
  honeydew: '#efffef',
  dark_slate_blue: '#826fff',
  dark_sea_green: '#c1ffc1',
  light_gray: '#ffffff',
  cornflower: '#6b9eff',
  orange: '#ffa600',
  lemon_chiffon: '#fff9cc',
  azure: '#efffff',
  snow: '#fff9f9',
  aquamarine: '#7fffd2',
  khaki: '#fff495',
  black: '#ffffff',
};

const nearestColorMatcher = nearestColor.from(colorNames);

export const mapHomeKitHueToAlexaValue = (hue: number) =>
  O.fromNullable(nearestColorMatcher(hslToRgb(hue))?.name);
