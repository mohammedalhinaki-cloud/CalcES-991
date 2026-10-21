/* test_common.h — shared fixtures and assertions for the unit tests. */
#ifndef TEST_COMMON_H
#define TEST_COMMON_H

#include <stdio.h>
#include <string.h>

#include "core/u8_core.h"
#include "mem/u8_mem.h"

static int g_fail = 0;

#define CHECK(cond) \
    do { if (!(cond)) { printf("FAIL %s:%d: %s\n", __FILE__, __LINE__, #cond); g_fail++; } } while (0)

#define CHECK_EQ(a, b) \
    do { long long _a = (long long)(a), _b = (long long)(b); \
         if (_a != _b) { printf("FAIL %s:%d: %s == %s (%lld != %lld)\n", \
                                __FILE__, __LINE__, #a, #b, _a, _b); g_fail++; } } while (0)

#define TEST_REPORT() (g_fail ? printf("== %s: %d FAILURE(S)\n", __FILE__, g_fail) \
                              : printf("== %s: all passed\n", __FILE__), g_fail ? 1 : 0)

typedef struct {
    u8_bus  *bus;
    u8_core *core;
} tfx;

static void tfx_init(tfx *x)
{
    x->bus = u8_bus_create(U8_ESPLUS_CODE_PAGES);
    x->core = u8_core_create(x->bus);
}

static void tfx_done(tfx *x)
{
    u8_core_destroy(x->core);
    u8_bus_destroy(x->bus);
}

static void poke16(tfx *x, uint32_t flat, uint16_t w)
{
    u8_bus_poke_code16(x->bus, flat, w);
}

/* Writes the reset vectors (initial SP and PC) and resets the core. */
static void boot(tfx *x, uint16_t sp, uint16_t pc)
{
    poke16(x, 0x0000u, sp);
    poke16(x, 0x0002u, pc);
    u8_core_reset(x->core);
}

/* Loads a program of 16-bit words into code space. */
static void load(tfx *x, const uint16_t *w, unsigned n, uint16_t at)
{
    for (unsigned i = 0; i < n; i++) poke16(x, (uint32_t)(at + 2u * i), w[i]);
}

/* Runs up to n steps; stops early on terminal status. */
static u8_status run(tfx *x, unsigned n)
{
    u8_status s = U8_OK;
    for (unsigned i = 0; i < n; i++) {
        s = u8_step(x->core);
        if (s != U8_OK) break;
    }
    return s;
}

#define REGS  u8_regs_get(x.core)
#define FLAGS (u8_regs_get(x.core)->psw)

#endif /* TEST_COMMON_H */
