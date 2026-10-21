/* u8_lcd.h — LCD controller view over the ES+ VRAM (flat 0x00F800).
 *
 * The frame itself is memory-mapped VRAM; the LCDCTL control register
 * (phase 4, provisional) carries the display-enable bit and a frame-update
 * request that is dispatched to the host interface below.
 */
#ifndef U8_LCD_H_INCLUDED
#define U8_LCD_H_INCLUDED
#ifdef __cplusplus
extern "C" {
#endif

#include "core/u8_types.h"
#include "mem/u8_mem.h"

/* fx-991ES PLUS main matrix: 12 bytes per row = 96 dots wide, 32 rows.
 * (TODO(verify): confirm against a ROM dump; indicator icons may live in a
 * separate VRAM area.) */
#define U8_LCD_W 96
#define U8_LCD_H 32
#define U8_LCD_VRAM_FLAT 0x00F800u

/* Extract the frame: out[row * U8_LCD_W + col] = 0/1. */
void u8_lcd_blit(const u8_bus *b, uint8_t *out);

/* Host-facing display interface (implemented by the GUI layer). */
typedef struct {
    void (*set_pix)(void *ud, int x, int y, int c); /* c: 1 lit, 0 dark */
    void (*update_disp)(void *ud);                  /* frame is ready   */
    void *ud;
} u8_lcd_if;

/* LCD control register state (phase 4). */
typedef struct {
    bool     display_on;
    unsigned updates; /* update_disp dispatches since reset (diagnostic) */
} u8_lcd_ctl;

void    u8_lcd_ctl_init(u8_lcd_ctl *lc);
/* bit0 = display enable; bit1 = frame-update request (consumed when
 * dispatched). Returns true when a frame update was dispatched. */
bool    u8_lcd_ctl_write(u8_lcd_ctl *lc, const u8_lcd_if *host, uint8_t v);
uint8_t u8_lcd_ctl_read(const u8_lcd_ctl *lc);

#ifdef __cplusplus
}
#endif
#endif /* U8_LCD_H_INCLUDED */
