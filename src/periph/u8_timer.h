/* u8_timer.h — 8-bit down-counting timer, clocked by CPU cycles.
 *
 * Phase 4 model (provisional register behaviour, see docs/sfr-map.md):
 *   ctl bit 0    EN     enable
 *   ctl bits 2:1 DIV    cycle divider 00=/1 01=/4 10=/16 11=/64
 *   ctl bit 3    IRQEN  overflow raises the timer's IRQ line (edge)
 *   ctl bit 4    OVF    overflow flag; cleared by writing 1 to it (W1C)
 *
 * The counter counts down once every DIV cycles; on underflow it reloads
 * from RLD and raises OVF. One overflow period is therefore
 * (RLD + 1) timer ticks = (RLD + 1) * DIV CPU cycles.
 */
#ifndef U8_TIMER_H
#define U8_TIMER_H
#ifdef __cplusplus
extern "C" {
#endif

#include <stdbool.h>
#include <stdint.h>

#define U8_TIMER_CTL_EN    0x01u
#define U8_TIMER_CTL_DIV   0x06u
#define U8_TIMER_CTL_IRQEN 0x08u
#define U8_TIMER_CTL_OVF   0x10u

typedef struct {
    uint8_t  cnt;          /* current count                       */
    uint8_t  rld;          /* reload value                        */
    uint8_t  ctl;
    uint64_t total_cycles; /* cycles fed since reset (diagnostic) */
    uint32_t accum;        /* sub-tick cycle accumulator          */
} u8_timer;

void u8_timer_init(u8_timer *t);

/* Feed `cycles` CPU cycles. Returns true when at least one overflow event
 * occurred during this call (the edge that drives the IRQ line). */
bool u8_timer_tick(u8_timer *t, unsigned cycles);

/* W1C semantics for the OVF bit; returns the new control value. */
uint8_t u8_timer_ctl_write(u8_timer *t, uint8_t v);

#ifdef __cplusplus
}
#endif
#endif /* U8_TIMER_H */
