/* u8_keymap.c — see u8_keymap.h for the provisional-label caveat.
 *
 * Table is [row][col]. Documented anchors (docs/memory-map.md):
 * 0x00="1", 0x20="3", 0x32="DEL", 0x40="-", 0x60="RETURN", 0x62="EXP".
 * Everything else is a best-effort layout guess — TODO(verify).
 */
#include "gui/u8_keymap.h"

static const char *const LABELS[8][7] = {
    { "1",    "2",    "3",    "/",     "-",  "x10x",  "RETURN" },
    { "4",    "5",    "6",    "*",     "+",  "S<=>D", "LEFT"   },
    { "7",    "8",    "9",    "DEL",   "=",  "sqrt",  "EXP"    },
    { "AC",   "MODE", "SHIFT", "ALPHA", "UP", "DOWN",  "RIGHT"  },
    { "x^2",  "x^3",  "1/x",  "(",     ")",  ",",     "pi"     },
    { "sin",  "cos",  "tan",  "log",   "ln", "STO",   "ANS"    },
    { 0, 0, 0, 0, 0, 0, 0 },
    { 0, 0, 0, 0, 0, 0, 0 },
};

const char *u8_keymap_label(uint8_t code)
{
    const unsigned c = code >> 4;
    const unsigned r = code & 0x0fu;
    if (c >= 7u || r >= 8u) return 0;
    return LABELS[r][c];
}
