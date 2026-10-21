/* u8_intc.h — interrupt controller glue between peripheral IRQ lines and
 * the core's u8_irq() entry point.
 *
 * Clean-room note: the real ES+ interrupt controller (source list,
 * priorities, per-source levels) is only partially documented publicly;
 * this model keeps a small fixed set of request lines with one enable
 * register. The mapping from a line to the core vector index is
 * configurable (first_index) and provisional — see docs/sfr-map.md.
 */
#ifndef U8_INTC_H
#define U8_INTC_H
#ifdef __cplusplus
extern "C" {
#endif

#include <stdbool.h>
#include <stdint.h>

#include "core/u8_core.h"

#define U8_INTC_LINES 8u

typedef struct {
    uint8_t  flags;       /* request latch: bit n = line n pending         */
    uint8_t  enable;      /* bit n = line n enabled                        */
    unsigned first_index; /* core IRQ vector index of line 0 (provisional) */
} u8_intc;

void u8_intc_init(u8_intc *ic);

/* Latch a request (edge from a peripheral; harmless if already pending). */
void u8_intc_request(u8_intc *ic, unsigned line);

/* If a pending enabled line can be delivered, enter the interrupt and
 * clear the latch. Returns true when a request reached the core. */
bool u8_intc_poll(u8_intc *ic, u8_core *c);

#ifdef __cplusplus
}
#endif
#endif /* U8_INTC_H */
