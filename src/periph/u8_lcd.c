/* u8_lcd.c — read the VRAM raster out of data space. */
#include <string.h>

#include "periph/u8_lcd.h"

void u8_lcd_blit(const u8_bus *b, uint8_t *out)
{
    const uint8_t *vram = u8_bus_data((u8_bus *)b)
                        + (U8_LCD_VRAM_FLAT - U8_DATA_LOW);
    memset(out, 0, (size_t)U8_LCD_W * U8_LCD_H);
    for (int row = 0; row < U8_LCD_H; row++) {
        const uint8_t *line = vram + (size_t)row * 16; /* 12 usable of 16 */
        for (int col = 0; col < U8_LCD_W; col++) {
            /* LSB-first bit order (TODO(verify) against a real frame). */
            out[(size_t)row * U8_LCD_W + col] =
                (uint8_t)((line[col >> 3] >> (col & 7)) & 1u);
        }
    }
}

void u8_lcd_ctl_init(u8_lcd_ctl *lc)
{
    lc->display_on = false;
    lc->updates = 0;
}

bool u8_lcd_ctl_write(u8_lcd_ctl *lc, const u8_lcd_if *host, uint8_t v)
{
    lc->display_on = (v & 0x01u) != 0;
    if ((v & 0x02u) && host && host->update_disp) {
        host->update_disp(host->ud);
        lc->updates++;
        return true;
    }
    return false;
}

uint8_t u8_lcd_ctl_read(const u8_lcd_ctl *lc)
{
    return (uint8_t)(lc->display_on ? 0x01u : 0x00u);
}
