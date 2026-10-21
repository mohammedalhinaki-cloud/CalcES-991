/* u8_sfr.h — special function register space (0x0F000..0x0F04F).
 *
 * Phase 4: a default RAM-like register file plus an optional device hook.
 * The machine layer (src/machine) installs the hook; offsets it claims get
 * peripheral semantics (interrupt flags, timers, keypad scan, LCD control),
 * everything else stays RAM-like and is counted — so running a real ROM
 * still reveals untouched registers (see docs/sfr-map.md).
 */
#ifndef U8_SFR_H
#define U8_SFR_H
#ifdef __cplusplus
extern "C" {
#endif

#include <stdint.h>

#include "core/u8_types.h"

#define U8_SFR_BASE   0x00F000u
#define U8_SFR_SIZE   0x50u

typedef struct u8_sfr {
    uint8_t  regs[U8_SFR_SIZE];
    unsigned unhandled_reads;
    unsigned unhandled_writes;
    /* Device dispatch, installed by the machine layer (may be NULL).
     * rd: claim a read — fill *out and return true (side effects allowed).
     * wr: claim a write — return true when consumed (regfile untouched). */
    bool (*rd)(void *ud, uint32_t flat, uint8_t off, uint8_t *out);
    bool (*wr)(void *ud, uint32_t flat, uint8_t off, uint8_t v);
    void *ud;
} u8_sfr;

void    u8_sfr_init(u8_sfr *s);
uint8_t u8_sfr_read(u8_sfr *s, uint32_t flat);
void    u8_sfr_write(u8_sfr *s, uint32_t flat, uint8_t v);

#ifdef __cplusplus
}
#endif
#endif /* U8_SFR_H */
