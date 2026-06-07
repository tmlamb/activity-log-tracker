"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.yellow = exports.white = exports.underline = exports.strikethrough = exports.reset = exports.red = exports.purple = exports.magenta = exports.italic = exports.inverse = exports.hidden = exports.green = exports.gray = exports.dim = exports.cyan = exports.bold = exports.blue = exports.black = exports.bgYellow = exports.bgWhite = exports.bgRed = exports.bgMagenta = exports.bgGreen = exports.bgCyan = exports.bgBlue = exports.bgBlack = void 0;
/* eslint-disable */
// ISC License

// Copyright (c) 2021 Alexey Raspopov, Kostiantyn Denysov, Anton Verinov

// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.

// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
//
// https://github.com/alexeyraspopov/picocolors/blob/b6261487e7b81aaab2440e397a356732cad9e342/picocolors.js#L1

const {
  env,
  stdout
} = globalThis?.process ?? {};
const enabled = env && !env.NO_COLOR && (env.FORCE_COLOR || stdout?.isTTY && !env.CI && env.TERM !== "dumb");
const replaceClose = (str, close, replace, index) => {
  const start = str.substring(0, index) + replace;
  const end = str.substring(index + close.length);
  const nextIndex = end.indexOf(close);
  return ~nextIndex ? start + replaceClose(end, close, replace, nextIndex) : start + end;
};
const formatter = (open, close, replace = open) => {
  if (!enabled) return String;
  return input => {
    const string = "" + input;
    const index = string.indexOf(close, open.length);
    return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close;
  };
};
const reset = exports.reset = enabled ? s => `\x1b[0m${s}\x1b[0m` : String;
const bold = exports.bold = formatter("\x1b[1m", "\x1b[22m", "\x1b[22m\x1b[1m");
const dim = exports.dim = formatter("\x1b[2m", "\x1b[22m", "\x1b[22m\x1b[2m");
const italic = exports.italic = formatter("\x1b[3m", "\x1b[23m");
const underline = exports.underline = formatter("\x1b[4m", "\x1b[24m");
const inverse = exports.inverse = formatter("\x1b[7m", "\x1b[27m");
const hidden = exports.hidden = formatter("\x1b[8m", "\x1b[28m");
const strikethrough = exports.strikethrough = formatter("\x1b[9m", "\x1b[29m");
const black = exports.black = formatter("\x1b[30m", "\x1b[39m");
const red = exports.red = formatter("\x1b[31m", "\x1b[39m");
const green = exports.green = formatter("\x1b[32m", "\x1b[39m");
const yellow = exports.yellow = formatter("\x1b[33m", "\x1b[39m");
const blue = exports.blue = formatter("\x1b[34m", "\x1b[39m");
const magenta = exports.magenta = formatter("\x1b[35m", "\x1b[39m");
const purple = exports.purple = formatter("\x1b[38;2;173;127;168m", "\x1b[39m");
const cyan = exports.cyan = formatter("\x1b[36m", "\x1b[39m");
const white = exports.white = formatter("\x1b[37m", "\x1b[39m");
const gray = exports.gray = formatter("\x1b[90m", "\x1b[39m");
const bgBlack = exports.bgBlack = formatter("\x1b[40m", "\x1b[49m");
const bgRed = exports.bgRed = formatter("\x1b[41m", "\x1b[49m");
const bgGreen = exports.bgGreen = formatter("\x1b[42m", "\x1b[49m");
const bgYellow = exports.bgYellow = formatter("\x1b[43m", "\x1b[49m");
const bgBlue = exports.bgBlue = formatter("\x1b[44m", "\x1b[49m");
const bgMagenta = exports.bgMagenta = formatter("\x1b[45m", "\x1b[49m");
const bgCyan = exports.bgCyan = formatter("\x1b[46m", "\x1b[49m");
const bgWhite = exports.bgWhite = formatter("\x1b[47m", "\x1b[49m");
//# sourceMappingURL=picocolors.js.map