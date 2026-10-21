/* u8_sfr.c — SFR space backing store and device dispatch. */
#include <string.h>

#include "sfr/u8_sfr.h"

void u8_sfr_init(u8_sfr *s)
{
    memset(s, 0, sizeof(*s));
}

uint8_t u8_sfr_read(u8_sfr *s, uint32_t flat)
{
    const uint32_t i = flat - U8_SFR_BASE;
    if (i >= U8_SFR_SIZE) {
        s->unhandled_reads++;
        return 0x00;
    }
    uint8_t v = 0;
    if (s->rd && s->rd(s->ud, flat, (uint8_t)i, &v)) return v;
    return s->regs[i];
}

void u8_sfr_write(u8_sfr *s, uint32_t flat, uint8_t v)
{
    const uint32_t i = flat - U8_SFR_BASE;
    if (i >= U8_SFR_SIZE) {
        s->unhandled_writes++;
        return;
    }
    if (s->wr && s->wr(s->ud, flat, (uint8_t)i, v)) return;
    s->regs[i] = v;
}
