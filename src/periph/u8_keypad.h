/* u8_keypad.h — key matrix model for the ES+ keyboard.
 *
 * Key codes follow the documented ES+ layout: 7 columns x 8 rows,
 * code = (column << 4) | row, e.g. 0x00 = "1", 0x42 = "=", 0x64 = "0".
 * The host (GUI or tests) presses/releases keys; the ROM drives column
 * lines through the KEYDRV SFR and reads row lines from KEYIN
 * (provisional addresses — docs/sfr-map.md).
 */
#ifndef U8_KEYPAD_H
#define U8_KEYPAD_H
#ifdef __cplusplus
extern "C" {
#endif

#include <stdint.h>

#define U8_KEY_COLS 7
#define U8_KEY_ROWS 8
#define U8_KEY_NONE 0xFFu

typedef struct {
    uint8_t col[U8_KEY_COLS]; /* bit per row: 1 = pressed */
} u8_keypad;

void u8_keypad_init(u8_keypad *k);
void u8_keypad_press(u8_keypad *k, uint8_t code);
void u8_keypad_release(u8_keypad *k, uint8_t code);
uint8_t u8_keypad_column_bits(const u8_keypad *k, unsigned col);

/* SFR view (phase 4): row bits of every driven column ORed together
 * (bit n = row n active under the KEYDRV column drive mask). */
uint8_t u8_keypad_scan(const u8_keypad *k, uint8_t drive);

#ifdef __cplusplus
}
#endif
#endif /* U8_KEYPAD_H */
