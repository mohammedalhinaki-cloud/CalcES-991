/* u8_intc.c — request latching and delivery to the core. */
#include "sfr/u8_intc.h"

void u8_intc_init(u8_intc *ic)
{
    ic->flags = 0;
    ic->enable = 0;
    ic->first_index = 0; /* provisional: line n -> IRQ vector index n */
}

void u8_intc_request(u8_intc *ic, unsigned line)
{
    if (line < U8_INTC_LINES) ic->flags |= (uint8_t)(1u << line);
}

bool u8_intc_poll(u8_intc *ic, u8_core *c)
{
    const uint8_t pend = (uint8_t)(ic->flags & ic->enable);
    if (!pend) return false;
    for (unsigned n = 0; n < U8_INTC_LINES; n++) {
        if (!(pend & (1u << n))) continue;
        /* All lines share one core level, so if the core masks this one it
         * masks every pending line — stop after the first attempt. */
        if (u8_irq(c, ic->first_index + n)) {
            ic->flags &= (uint8_t)~(1u << n);
            return true;
        }
        return false;
    }
    return false;
}
