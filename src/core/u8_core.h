/* u8_core.h — nX-U8/100 CPU core public interface.
 *
 * Typical loop (matches the reference workflow):
 *     u8_bus *bus = u8_bus_create(U8_ESPLUS_CODE_PAGES);
 *     u8_bus_load_rom(bus, bytes, len);
 *     u8_core *c = u8_core_create(bus);
 *     u8_core_reset(c);
 *     while (running) u8_step(c);
 */
#ifndef U8_CORE_H
#define U8_CORE_H
#ifdef __cplusplus
extern "C" {
#endif

#include "u8_types.h"

typedef struct u8_bus  u8_bus;
typedef struct u8_core u8_core;

u8_core *u8_core_create(u8_bus *bus);
void     u8_core_destroy(u8_core *c);

/* Hardware reset: clears control registers, loads initial SP/PC from the
 * vector table (words at code addresses 0x0000 and 0x0002). General
 * registers keep their previous content. */
void u8_core_reset(u8_core *c);

/* Execute exactly one instruction. Returns U8_OK or a terminal status
 * (illegal/unimplemented). Per-instruction cycle count is available via
 * u8_cycles_last(). */
u8_status u8_step(u8_core *c);

/* Interrupt entry points (driven by peripherals or the debugger). */
void u8_nmi(u8_core *c);                       /* non-maskable, level 2   */
bool u8_irq(u8_core *c, unsigned index);       /* maskable, index < 59    */

/* Introspection for debugger / tests / GUI. */
const u8_regs *u8_regs_get(const u8_core *c);
int    u8_cycles_last(const u8_core *c);
u8_bus *u8_core_bus(const u8_core *c);
/* Last non-fatal memory condition of the most recent step (U8_OK if none). */
u8_status u8_last_mem_status(const u8_core *c);

#ifdef __cplusplus
}
#endif
#endif /* U8_CORE_H */
