/* u8_debugger.c — debugging facilities over the core/bus API. */
#include <stdio.h>
#include <string.h>

#include "debug/u8_debugger.h"
#include "mem/u8_mem.h"

void u8_dbg_init(u8_dbg *d) { d->n = 0; }

bool u8_dbg_bp_add(u8_dbg *d, uint32_t flat)
{
    if (d->n >= U8_DBG_MAX_BP) return false;
    for (unsigned i = 0; i < d->n; i++)
        if (d->bp[i] == flat) return true;
    d->bp[d->n++] = flat;
    return true;
}

void u8_dbg_bp_clear(u8_dbg *d, uint32_t flat)
{
    for (unsigned i = 0; i < d->n; i++) {
        if (d->bp[i] == flat) {
            d->bp[i] = d->bp[--d->n];
            return;
        }
    }
}

void u8_dbg_bp_clear_all(u8_dbg *d) { d->n = 0; }

bool u8_dbg_at_bp(const u8_dbg *d, const u8_core *c)
{
    const u8_regs *r = u8_regs_get(c);
    const uint32_t flat = ((uint32_t)(r->csr & 0x0fu) << 16) | r->pc;
    for (unsigned i = 0; i < d->n; i++)
        if (d->bp[i] == flat) return true;
    return false;
}

unsigned long u8_dbg_run(u8_core *c, const u8_dbg *d,
                         unsigned long max_steps, u8_status *status)
{
    u8_status st = U8_OK;
    unsigned long i = 0;
    for (; i < max_steps; i++) {
        st = u8_step(c);
        if (st != U8_OK) break;
        if (u8_dbg_at_bp(d, c)) { i++; break; }
    }
    if (status) *status = st;
    return i;
}

void u8_dbg_dump_regs(const u8_core *c, char *buf, size_t n)
{
    const u8_regs *r = u8_regs_get(c);
    size_t used = 0;
    used += (size_t)snprintf(buf + used, (used < n) ? n - used : 0,
        "PC=0x%04X CS=%u SP=0x%04X EA=0x%04X LR=0x%04X DSR=0x%02X\n",
        r->pc, r->csr, r->sp, r->ea, r->lr, r->dsr);
    used += (size_t)snprintf(buf + used, (used < n) ? n - used : 0,
        "PSW=0x%02X [C=%u Z=%u S=%u OV=%u HC=%u MIE=%u EL=%u]\n",
        r->psw.raw, r->psw.b.c, r->psw.b.z, r->psw.b.s, r->psw.b.ov,
        r->psw.b.hc, r->psw.b.mie, r->psw.b.elevel);
    for (unsigned row = 0; row < 4; row++) {
        used += (size_t)snprintf(buf + used, (used < n) ? n - used : 0,
            "R%02u-R%02u: %02X %02X %02X %02X\n",
            row * 4u, row * 4u + 3u,
            r->gpr.r[row * 4u], r->gpr.r[row * 4u + 1u],
            r->gpr.r[row * 4u + 2u], r->gpr.r[row * 4u + 3u]);
    }
}

void u8_dbg_dump_mem(const u8_core *c, uint32_t flat, unsigned count,
                     char *buf, size_t n)
{
    size_t used = 0;
    u8_bus *b = u8_core_bus(c);
    for (unsigned i = 0; i < count && used + 8u < n; i++) {
        u8_status st = U8_OK;
        const uint8_t v = (uint8_t)u8_data_read(b, (unsigned)(flat >> 16),
                                                (uint16_t)(flat & 0xffffu),
                                                1u, &st);
        used += (size_t)snprintf(buf + used, n - used, "%s%02X",
                                 (i && (i % 16u == 0u)) ? "\n" : (i ? " " : ""), v);
    }
}
