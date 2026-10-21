/* u8_keypad.c — matrix state handling. */
#include <string.h>

#include "periph/u8_keypad.h"

void u8_keypad_init(u8_keypad *k)
{
    memset(k, 0, sizeof(*k));
}

void u8_keypad_press(u8_keypad *k, uint8_t code)
{
    if (code == U8_KEY_NONE) return;
    const unsigned c = code >> 4;
    const unsigned r = code & 0x0fu;
    if (c < U8_KEY_COLS && r < U8_KEY_ROWS) k->col[c] |= (uint8_t)(1u << r);
}

void u8_keypad_release(u8_keypad *k, uint8_t code)
{
    if (code == U8_KEY_NONE) return;
    const unsigned c = code >> 4;
    const unsigned r = code & 0x0fu;
    if (c < U8_KEY_COLS && r < U8_KEY_ROWS) k->col[c] &= (uint8_t)~(1u << r);
}

uint8_t u8_keypad_column_bits(const u8_keypad *k, unsigned col)
{
    return (col < U8_KEY_COLS) ? k->col[col] : 0u;
}

uint8_t u8_keypad_scan(const u8_keypad *k, uint8_t drive)
{
    uint8_t rows = 0;
    for (unsigned c = 0; c < U8_KEY_COLS; c++) {
        if (drive & (1u << c)) rows |= u8_keypad_column_bits(k, c);
    }
    return rows;
}
