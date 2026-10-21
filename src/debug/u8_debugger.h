/* u8_debugger.h — breakpoints, single-step, register/memory dumps. */
#ifndef U8_DEBUGGER_H
#define U8_DEBUGGER_H
#ifdef __cplusplus
extern "C" {
#endif

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "core/u8_core.h"

#define U8_DBG_MAX_BP 64

typedef struct {
    uint32_t bp[U8_DBG_MAX_BP]; /* flat code addresses (csr<<16 | pc) */
    unsigned n;
} u8_dbg;

void    u8_dbg_init(u8_dbg *d);
bool    u8_dbg_bp_add(u8_dbg *d, uint32_t flat);
void    u8_dbg_bp_clear(u8_dbg *d, uint32_t flat);
void    u8_dbg_bp_clear_all(u8_dbg *d);
bool    u8_dbg_at_bp(const u8_dbg *d, const u8_core *c);

/* Execute steps until a breakpoint is reached, a terminal status occurs,
 * or max_steps is hit. *status receives the last u8_step() result. */
unsigned long u8_dbg_run(u8_core *c, const u8_dbg *d,
                         unsigned long max_steps, u8_status *status);

/* Human-readable dumps (NUL-terminated into buf). */
void u8_dbg_dump_regs(const u8_core *c, char *buf, size_t n);
void u8_dbg_dump_mem(const u8_core *c, uint32_t flat, unsigned count,
                     char *buf, size_t n);

#ifdef __cplusplus
}
#endif
#endif /* U8_DEBUGGER_H */
