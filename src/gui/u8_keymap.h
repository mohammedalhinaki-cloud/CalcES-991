/* u8_keymap.h — provisional key labels for the GUI keypad.
 *
 * The six documented matrix anchors (docs/memory-map.md) are exact; every
 * other label is a best-effort placeholder for the GUI and must be verified
 * against a real ROM (TODO(verify)). Unknown cells return NULL.
 */
#ifndef U8_KEYMAP_H
#define U8_KEYMAP_H

#include <stdint.h>

/* Label for a matrix code (column = code >> 4, row = code & 0x0F),
 * or NULL when the cell is unknown. */
const char *u8_keymap_label(uint8_t code);

#endif /* U8_KEYMAP_H */
