/* test_alu.c — unit tests for ALU operations, flags and cycle counts.
 * Instruction encodings follow the documented nX-U8/100 opcode map. */
#include "test_common.h"

static void test_mov_imm(void)
{
    tfx x; tfx_init(&x);
    const uint16_t p[] = { 0x032A };            /* MOV R3, #0x2A */
    load(&x, p, 1, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    CHECK_EQ(run(&x, 1), U8_OK);
    CHECK_EQ(REGS->gpr.r[3], 0x2A);
    CHECK_EQ(FLAGS.b.z, 0);
    CHECK_EQ(FLAGS.b.s, 0);
    CHECK_EQ(u8_cycles_last(x.core), 1);

    const uint16_t z[] = { 0x0300 };            /* MOV R3, #0 */
    load(&x, z, 1, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 1);
    CHECK_EQ(FLAGS.b.z, 1);
    tfx_done(&x);
}

static void test_add_flags(void)
{
    tfx x; tfx_init(&x);
    /* 0x7F + 1 = 0x80: overflow, negative, no carry, half carry */
    const uint16_t p1[] = { 0x007F, 0x1001 };   /* MOV R0,#0x7F; ADD R0,#1 */
    load(&x, p1, 2, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 2);
    CHECK_EQ(REGS->gpr.r[0], 0x80);
    CHECK_EQ(FLAGS.b.ov, 1);
    CHECK_EQ(FLAGS.b.s, 1);
    CHECK_EQ(FLAGS.b.c, 0);
    CHECK_EQ(FLAGS.b.hc, 1);

    /* 0xFF + 1 = 0x00: carry, zero, half carry, no overflow */
    const uint16_t p2[] = { 0x00FF, 0x1001 };
    load(&x, p2, 2, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 2);
    CHECK_EQ(REGS->gpr.r[0], 0x00);
    CHECK_EQ(FLAGS.b.c, 1);
    CHECK_EQ(FLAGS.b.z, 1);
    CHECK_EQ(FLAGS.b.hc, 1);
    CHECK_EQ(FLAGS.b.ov, 0);
    tfx_done(&x);
}

static void test_addc_chain(void)
{
    tfx x; tfx_init(&x);
    /* MOV R0,#0xFF; ADD R0,#1 (C=1,Z=1); MOV R1,#0; ADDC R1,#0 -> R1=1 */
    const uint16_t p[] = { 0x00FF, 0x1001, 0x0100, 0x6100 };
    load(&x, p, 4, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 4);
    CHECK_EQ(REGS->gpr.r[1], 0x01);
    CHECK_EQ(FLAGS.b.c, 0);
    CHECK_EQ(FLAGS.b.z, 0);   /* Z is AND-ed across the ADDC chain */
    tfx_done(&x);
}

static void test_sub_flags(void)
{
    tfx x; tfx_init(&x);
    /* 0 - 1 = 0xFF: borrow (C=1), negative, half borrow, NO overflow */
    const uint16_t p1[] = { 0x0000, 0x0101, 0x8018 }; /* MOV R0,#0; MOV R1,#1; SUB R0,R1 */
    load(&x, p1, 3, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 3);
    CHECK_EQ(REGS->gpr.r[0], 0xFF);
    CHECK_EQ(FLAGS.b.c, 1);
    CHECK_EQ(FLAGS.b.s, 1);
    CHECK_EQ(FLAGS.b.hc, 1);
    CHECK_EQ(FLAGS.b.ov, 0);

    /* 0x80 - 1 = 0x7F: signed overflow, no borrow */
    const uint16_t p2[] = { 0x0080, 0x0101, 0x8018 };
    load(&x, p2, 3, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 3);
    CHECK_EQ(REGS->gpr.r[0], 0x7F);
    CHECK_EQ(FLAGS.b.ov, 1);
    CHECK_EQ(FLAGS.b.c, 0);
    tfx_done(&x);
}

static void test_logic(void)
{
    tfx x; tfx_init(&x);
    const uint16_t p[] = { 0x00F0, 0x200F };    /* MOV R0,#0xF0; AND R0,#0x0F */
    load(&x, p, 2, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 2);
    CHECK_EQ(REGS->gpr.r[0], 0x00);
    CHECK_EQ(FLAGS.b.z, 1);

    const uint16_t q[] = { 0x00F0, 0x300F };    /* OR */
    load(&x, q, 2, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 2);
    CHECK_EQ(REGS->gpr.r[0], 0xFF);
    CHECK_EQ(FLAGS.b.s, 1);

    const uint16_t r[] = { 0x00F0, 0x40FF };    /* XOR R0,#0xFF */
    load(&x, r, 2, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 2);
    CHECK_EQ(REGS->gpr.r[0], 0x0F);
    tfx_done(&x);
}

static void test_cmp_no_write(void)
{
    tfx x; tfx_init(&x);
    const uint16_t p[] = { 0x0005, 0x7005 };    /* MOV R0,#5; CMP R0,#5 */
    load(&x, p, 2, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 2);
    CHECK_EQ(REGS->gpr.r[0], 0x05);             /* unchanged */
    CHECK_EQ(FLAGS.b.z, 1);
    CHECK_EQ(FLAGS.b.c, 0);
    tfx_done(&x);
}

static void test_word_add_cmp(void)
{
    tfx x; tfx_init(&x);
    /* ER2 = 0x7FFF (r4=low, r5=high), ER3 = 1; ADD ER2,ER3 -> 0x8000 */
    const uint16_t p[] = { 0x04FF, 0x057F, 0x0601, 0x0700, 0xf466 };
    load(&x, p, 5, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 5);
    CHECK_EQ(REGS->gpr.r[4], 0x00);
    CHECK_EQ(REGS->gpr.r[5], 0x80);
    CHECK_EQ(FLAGS.b.ov, 1);
    CHECK_EQ(FLAGS.b.s, 1);
    CHECK_EQ(FLAGS.b.c, 0);

    /* CMP ER3, ER2 (1 - 0x8000): borrow, negative */
    const uint16_t q[] = { 0x04FF, 0x057F, 0x0601, 0x0700, 0xf647 };
    load(&x, q, 5, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 5);
    CHECK_EQ(FLAGS.b.c, 1);
    CHECK_EQ(FLAGS.b.s, 1);
    CHECK_EQ(FLAGS.b.z, 0);
    tfx_done(&x);
}

static void test_shifts(void)
{
    tfx x; tfx_init(&x);
    /* SLL twice: 0x40 -> 0x80 (C=0) -> 0x00 (C=1, Z=1) */
    const uint16_t p[] = { 0x0040, 0x0101, 0x801a, 0x801a };
    load(&x, p, 4, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 4);
    CHECK_EQ(REGS->gpr.r[0], 0x00);
    CHECK_EQ(FLAGS.b.c, 1);

    /* SRA 0x82 >> 1 = 0xC1 (sign fill), C=0 */
    const uint16_t q[] = { 0x0082, 0x0101, 0x801e };
    load(&x, q, 3, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 3);
    CHECK_EQ(REGS->gpr.r[0], 0xC1);
    CHECK_EQ(FLAGS.b.c, 0);

    /* SRLC R5 through ER2/R6: 0x01 -> 0x00, C=1 */
    const uint16_t r[] = { 0x0400, 0x0501, 0x0101, 0x851d };
    load(&x, r, 4, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 4);
    CHECK_EQ(REGS->gpr.r[5], 0x00);
    CHECK_EQ(FLAGS.b.c, 1);
    tfx_done(&x);
}

static void test_mul_div(void)
{
    tfx x; tfx_init(&x);
    /* 12 * 10 = 120 -> ER0 = 0x0078, 9 cycles */
    const uint16_t p[] = { 0x000C, 0x020A, 0xf024 };
    load(&x, p, 3, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 3);
    CHECK_EQ(REGS->gpr.r[0], 0x78);
    CHECK_EQ(REGS->gpr.r[1], 0x00);
    CHECK_EQ(FLAGS.b.z, 0);
    CHECK_EQ(u8_cycles_last(x.core), 9);

    /* 0x80 / 10 = 12 rem 8; 17 cycles; remainder in R2 */
    const uint16_t q[] = { 0x0080, 0x020A, 0xf029 };
    load(&x, q, 3, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 3);
    CHECK_EQ(REGS->gpr.r[0], 0x0C);
    CHECK_EQ(REGS->gpr.r[1], 0x00);
    CHECK_EQ(REGS->gpr.r[2], 0x08);
    CHECK_EQ(u8_cycles_last(x.core), 17);

    /* Division by zero: quotient 0xFFFF, remainder = dividend low byte, C=1 */
    const uint16_t r[] = { 0x0078, 0x0200, 0xf029 };
    load(&x, r, 3, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 3);
    CHECK_EQ(REGS->gpr.r[0], 0xFF);
    CHECK_EQ(REGS->gpr.r[1], 0xFF);
    CHECK_EQ(REGS->gpr.r[2], 0x78);
    CHECK_EQ(FLAGS.b.c, 1);
    tfx_done(&x);
}

static void test_daa(void)
{
    tfx x; tfx_init(&x);
    /* DAA 0x0F -> 0x15 with half carry */
    const uint16_t p[] = { 0x000F, 0x801f };
    load(&x, p, 2, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 2);
    CHECK_EQ(REGS->gpr.r[0], 0x15);
    CHECK_EQ(FLAGS.b.hc, 1);
    CHECK_EQ(FLAGS.b.c, 0);
    tfx_done(&x);
}

static void test_inc_ea_keeps_carry(void)
{
    tfx x; tfx_init(&x);
    /* SC; LEA [0x8100]; MOV R3,#0x41; ST R3,[EA]; INC [EA]; NOP */
    const uint16_t p[] = { 0xed80, 0xf00c, 0x8100, 0x0341, 0x9331, 0xfe2f, 0xfe8f };
    load(&x, p, 7, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 7);
    CHECK_EQ(FLAGS.b.c, 1);                     /* preserved by INC [EA] */
    CHECK_EQ(u8_bus_data(x.bus)[0x8100 - 0x8000], 0x42);
    tfx_done(&x);
}

int main(void)
{
    test_mov_imm();
    test_add_flags();
    test_addc_chain();
    test_sub_flags();
    test_logic();
    test_cmp_no_write();
    test_word_add_cmp();
    test_shifts();
    test_mul_div();
    test_daa();
    test_inc_ea_keeps_carry();
    return TEST_REPORT();
}
