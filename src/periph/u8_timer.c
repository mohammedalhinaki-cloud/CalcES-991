/* u8_timer.c — cycle-fed down counter with overflow flag and IRQ edge. */
#include "periph/u8_timer.h"

static unsigned div_of(uint8_t ctl)
{
    switch ((ctl & U8_TIMER_CTL_DIV) >> 1) {
        case 1:  return 4u;
        case 2:  return 16u;
        case 3:  return 64u;
        default: return 1u;
    }
}

void u8_timer_init(u8_timer *t)
{
    t->rld = 0;
    t->cnt = 0;
    t->ctl = 0;
    t->total_cycles = 0;
    t->accum = 0;
}

bool u8_timer_tick(u8_timer *t, unsigned cycles)
{
    t->total_cycles += cycles;
    if (!(t->ctl & U8_TIMER_CTL_EN)) return false;
    const unsigned div = div_of(t->ctl);
    t->accum += cycles;
    bool ovf = false;
    while (t->accum >= div) {
        t->accum -= (uint32_t)div;
        if (t->cnt == 0) {
            t->cnt = t->rld;
            t->ctl |= U8_TIMER_CTL_OVF;
            ovf = true;
        } else {
            t->cnt--;
        }
    }
    return ovf;
}

uint8_t u8_timer_ctl_write(u8_timer *t, uint8_t v)
{
    uint8_t ovf = (uint8_t)(t->ctl & U8_TIMER_CTL_OVF);
    if (v & U8_TIMER_CTL_OVF) ovf = 0; /* write 1 to clear */
    t->ctl = (uint8_t)((v & (U8_TIMER_CTL_EN | U8_TIMER_CTL_DIV |
                             U8_TIMER_CTL_IRQEN)) | ovf);
    if (!(t->ctl & U8_TIMER_CTL_EN)) t->accum = 0;
    return t->ctl;
}
