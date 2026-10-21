/* test_mmu.c — region routing, banking, alignment and reset vectors. */
#include "test_common.h"

static void test_ram_roundtrip(void)
{
    tfx x; tfx_init(&x);
    /* MOV R3,#0x5A; ST R3,[0x8123]; MOV R3,#0; L R4,[0x8123] */
    const uint16_t p[] = { 0x035A, 0x9311, 0x8123, 0x0300, 0x9410, 0x8123 };
    load(&x, p, 6, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    CHECK_EQ(run(&x, 5), U8_OK);
    CHECK_EQ(REGS->gpr.r[4], 0x5A);
    CHECK_EQ(u8_bus_data(x.bus)[0x8123 - 0x8000], 0x5A);
    tfx_done(&x);
}

static void test_rom_window(void)
{
    tfx x; tfx_init(&x);
    poke16(&x, 0x0104u, 0xABCD);                 /* visible via data space */
    const uint16_t p[] = { 0x9210, 0x0104 };     /* L R2,[0x0104] */
    load(&x, p, 2, 0x0200);
    boot(&x, 0x8DFE, 0x0200);
    CHECK_EQ(run(&x, 1), U8_OK);
    CHECK_EQ(REGS->gpr.r[2], 0xCD);              /* low byte of the word */

    /* Writing into the ROM window fails and leaves memory untouched. */
    poke16(&x, 0x0300u, 0xBEEF);
    const uint16_t q[] = { 0x0177, 0x9111, 0x0300 }; /* MOV R1,#0x77; ST R1,[0x0300] */
    load(&x, q, 3, 0x0200);
    boot(&x, 0x8DFE, 0x0200);
    CHECK_EQ(run(&x, 2), U8_OK);
    CHECK_EQ(u8_last_mem_status(x.core), U8_ROM_WRITE);
    CHECK_EQ(u8_bus_code(x.bus, NULL)[0x0300], 0xEF); /* unchanged (low byte) */
    tfx_done(&x);
}

static void test_vram_holes(void)
{
    tfx x; tfx_init(&x);
    const uint16_t p[] = {
        0x01A3,                                  /* MOV R1,#0xA3      */
        0x9111, 0xF800,                          /* ST R1,[0xF800]    */
        0x9111, 0xF80C,                          /* ST R1,[0xF80C] hole */
        0x9210, 0xF80C,                          /* L  R2,[0xF80C]    */
        0x9210, 0xF800,                          /* L  R2,[0xF800]    */
    };
    load(&x, p, 9, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    CHECK_EQ(run(&x, 5), U8_OK);
    CHECK_EQ(u8_bus_data(x.bus)[0xF800 - 0x8000], 0xA3);
    CHECK_EQ(REGS->gpr.r[2], 0xA3);              /* last load: valid byte   */
    tfx_done(&x);
}

static void test_unaligned_word(void)
{
    tfx x; tfx_init(&x);
    const uint16_t p[] = {
        0x005A, 0x9011, 0x8000,                  /* MOV R0,#0x5A; ST R0,[0x8000] */
        0x00A5, 0x9011, 0x8001,                  /* MOV R0,#0xA5; ST R0,[0x8001] */
        0x9012, 0x8001,                          /* L ER0,[0x8001] (odd!)        */
    };
    load(&x, p, 8, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    CHECK_EQ(run(&x, 5), U8_OK);
    CHECK_EQ(u8_last_mem_status(x.core), U8_UNALIGNED_ACCESS);
    CHECK_EQ(REGS->gpr.r[0], 0x5A);              /* aligned down to 0x8000 */
    CHECK_EQ(REGS->gpr.r[1], 0xA5);
    tfx_done(&x);
}

static void test_unmapped(void)
{
    tfx x; tfx_init(&x);
    const uint16_t p[] = { 0x9210, 0xE000 };     /* L R2,[0xE000]: no region */
    load(&x, p, 2, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    CHECK_EQ(run(&x, 1), U8_OK);
    CHECK_EQ(REGS->gpr.r[2], 0x00);
    CHECK_EQ(u8_last_mem_status(x.core), U8_UNMAPPED_ACCESS);
    tfx_done(&x);
}

static void test_segment_mirroring(void)
{
    tfx x; tfx_init(&x);
    poke16(&x, 0x0100u, 0x1234);
    u8_status s1 = U8_OK, s2 = U8_OK, s3 = U8_OK;
    const uint16_t a = u8_fetch_word(x.bus, 0, 0x0100, &s1);
    const uint16_t b = u8_fetch_word(x.bus, 2, 0x0100, &s2);  /* mirror of 0 */
    const uint16_t c = u8_fetch_word(x.bus, 1, 0x0100, &s3);  /* real page 1 */
    CHECK_EQ(s1, U8_OK);
    CHECK_EQ(s2, U8_OK);
    CHECK_EQ(s3, U8_OK);
    CHECK_EQ(a, 0x1234);
    CHECK_EQ(b, 0x1234);
    (void)c;
    tfx_done(&x);
}

static void test_dsr_segment(void)
{
    tfx x; tfx_init(&x);
    u8_bus_poke_code16(x.bus, 0x10100u, 0x5A5Au); /* code page 1 content */
    /* MOV R3,#1; _LDSR R3; L R2,[0x0100]; L R2,[0x0100] */
    const uint16_t p[] = { 0x0301, 0x903f, 0x9210, 0x0100, 0x9210, 0x0100 };
    load(&x, p, 6, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    CHECK_EQ(run(&x, 3), U8_OK);
    CHECK_EQ(REGS->gpr.r[2], 0x5A);              /* via DSR=1 -> code page 1 */
    CHECK_EQ(run(&x, 1), U8_OK);
    CHECK_EQ(REGS->gpr.r[2], 0x01);              /* back to segment 0        */
    tfx_done(&x);
}

static void test_vectors(void)
{
    tfx x; tfx_init(&x);
    boot(&x, 0x8DFE, 0x0246);
    CHECK_EQ(REGS->sp, 0x8DFE);
    CHECK_EQ(REGS->pc, 0x0246);
    CHECK_EQ(REGS->psw.raw, 0x00);
    CHECK_EQ(REGS->csr, 0x00);
    tfx_done(&x);
}

int main(void)
{
    test_ram_roundtrip();
    test_rom_window();
    test_vram_holes();
    test_unaligned_word();
    test_unmapped();
    test_segment_mirroring();
    test_dsr_segment();
    test_vectors();
    return TEST_REPORT();
}
