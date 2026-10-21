/* u8_machine.h — machine-level integration: core + bus + SFR devices.
 *
 * Phase 4 wiring: the machine owns the SFR space and routes claimed
 * offsets to the peripherals (interrupt flags, two timers, keypad scan
 * lines, LCD control); it feeds the timers with the cycles of every
 * executed instruction and polls the interrupt controller after each
 * step. Provisional register addresses: docs/sfr-map.md.
 */
#ifndef U8_MACHINE_H
#define U8_MACHINE_H
#ifdef __cplusplus
extern "C" {
#endif

#include <stddef.h>
#include <stdint.h>

#include "core/u8_core.h"
#include "mem/u8_mem.h"
#include "periph/u8_keypad.h"
#include "periph/u8_lcd.h"
#include "periph/u8_timer.h"
#include "sfr/u8_intc.h"
#include "sfr/u8_sfr.h"

/* Provisional SFR offsets (flat = U8_SFR_BASE + off) — TODO(verify). */
#define U8_SFR_IRQF    0x00u  /* IRQ flags:  read = latch; write 1 clears */
#define U8_SFR_IRQEN   0x01u  /* IRQ enable mask                          */
#define U8_SFR_T1CNT   0x04u
#define U8_SFR_T1RLD   0x05u
#define U8_SFR_T1CTL   0x06u
#define U8_SFR_T2CNT   0x08u
#define U8_SFR_T2RLD   0x09u
#define U8_SFR_T2CTL   0x0Au
#define U8_SFR_KEYDRV  0x10u  /* keypad column drive (r/w)                */
#define U8_SFR_KEYIN   0x11u  /* keypad row input (read-only)             */
#define U8_SFR_LCDCTL  0x18u

#define U8_MACHINE_TIMERS 2u

typedef struct {
    u8_bus    *bus;
    u8_core   *core;
    u8_sfr     sfr;
    u8_intc    intc;
    u8_timer   timer[U8_MACHINE_TIMERS];
    u8_keypad  keypad;
    u8_lcd_ctl lcd;
    u8_lcd_if  lcd_host;      /* may be all-NULL */
    uint8_t    key_drive;     /* KEYDRV shadow   */
    unsigned   irq_delivered; /* diagnostic      */
} u8_machine;

void      u8_machine_init(u8_machine *m, unsigned code_pages);
void      u8_machine_dispose(u8_machine *m);
u8_status u8_machine_load_rom(u8_machine *m, const uint8_t *bytes, size_t len);

/* Core reset + peripheral state reset (keypad matrix and the attached host
 * interface survive: they model the physical machine, not the CPU). */
void      u8_machine_reset(u8_machine *m);
void      u8_machine_attach_lcd(u8_machine *m, const u8_lcd_if *lif);

/* One instruction + timer ticks + interrupt poll. */
u8_status u8_machine_step(u8_machine *m);

/* Up to max_steps instructions; *status_out receives the last step result.
 * Returns the number of steps executed (the failing step counts too). */
unsigned long u8_machine_run(u8_machine *m, unsigned long max_steps,
                             u8_status *status_out);

#ifdef __cplusplus
}
#endif
#endif /* U8_MACHINE_H */
