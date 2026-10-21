/* test_branch.c — jumps, calls, stack, interrupts and vectors. */
#include "test_common.h"

static void test_conditions(void)
{
    struct { uint8_t flags; unsigned cond; int taken; } cases[] = {
        { 0x40, 9, 1 },  /* Z=1:  EQ taken            */
        { 0x40, 8, 0 },  /* Z=1:  NE not taken        */
        { 0x00, 9, 0 },  /* Z=0:  EQ not taken        */
        { 0x80, 1, 1 },  /* C=1:  LT taken            */
        { 0x80, 0, 0 },  /* C=1:  GE not taken        */
        { 0x00, 0, 1 },  /* C=0:  GE taken            */
        { 0x80, 3, 1 },  /* C=1:  LE taken            */
        { 0x80, 2, 0 },  /* C=1:  GT not taken        */
        { 0x30, 11, 1 }, /* OV=1,S=1: OV taken        */
        { 0x30, 10, 0 }, /* OV=1: NV not taken        */
        { 0x30, 4, 1 },  /* OV^S=0: GES taken         */
        { 0x30, 5, 0 },  /* OV^S=0: LTS not taken     */
        { 0x00, 14, 1 }, /* AL always taken           */
    };
    for (size_t i = 0; i < sizeof(cases) / sizeof(cases[0]); i++) {
        tfx x; tfx_init(&x);
        const uint16_t p[] = {
            (uint16_t)(0xe900u | cases[i].flags),              /* MOV PSW,#fl */
            (uint16_t)(0xc000u | (cases[i].cond << 8) | 0x02), /* B<cond> +2  */
            0x01BB,                                            /* MOV R1,#0xBB */
            0xfe8f,                                            /* NOP          */
        };
        load(&x, p, 4, 0x0100);
        boot(&x, 0x8DFE, 0x0100);
        run(&x, 2);
        CHECK_EQ(u8_cycles_last(x.core), cases[i].taken ? 3 : 1);
        run(&x, 2);
        CHECK_EQ(REGS->gpr.r[1], cases[i].taken ? 0x00 : 0xBB);
        tfx_done(&x);
    }
}

static void test_bl_rt(void)
{
    tfx x; tfx_init(&x);
    const uint16_t p[] = {
        0xf001, 0x0110,             /* 0x0100: BL 0x0110 (CS0) */
        0x0221,                     /* 0x0104: MOV R2,#0x21    */
        0xfe8f,                     /* 0x0106: NOP             */
    };
    const uint16_t sub[] = {
        0x037F,                     /* 0x0110: MOV R3,#0x7F    */
        0xfe1f,                     /* 0x0112: RT              */
    };
    load(&x, p, 3, 0x0100);
    load(&x, sub, 2, 0x0110);
    boot(&x, 0x8DFE, 0x0100);
    CHECK_EQ(run(&x, 4), U8_OK);
    CHECK_EQ(REGS->gpr.r[3], 0x7F);
    CHECK_EQ(REGS->gpr.r[2], 0x21);
    CHECK_EQ(REGS->pc, 0x0106);     /* returned past the BL operand */
    tfx_done(&x);
}

static void test_b_register(void)
{
    tfx x; tfx_init(&x);
    const uint16_t p[] = {
        0x0420, 0x0501,             /* ER2 = 0x0120 */
        0xf042,                     /* B ER2        */
        0xfe8f, 0xfe8f,
    };
    const uint16_t tgt[] = { 0x0611 }; /* MOV R6,#0x11 at 0x0120 */
    load(&x, p, 5, 0x0100);
    load(&x, tgt, 1, 0x0120);
    boot(&x, 0x8DFE, 0x0100);
    CHECK_EQ(run(&x, 4), U8_OK);
    CHECK_EQ(REGS->pc, 0x0122);
    CHECK_EQ(REGS->gpr.r[6], 0x11);
    tfx_done(&x);
}

static void test_swi_rti(void)
{
    tfx x; tfx_init(&x);
    const uint16_t p[] = { 0xe908, 0xe503, 0xfe8f }; /* MOV PSW,#8; SWI 3; NOP */
    const uint16_t h[] = { 0x0677, 0xfe0f };         /* MOV R6,#0x77; RTI */
    load(&x, p, 3, 0x0100);
    load(&x, h, 2, 0x0300);
    poke16(&x, 0x0080u + 3u * 2u, 0x0300);           /* SWI 3 vector */
    boot(&x, 0x8DFE, 0x0100);
    CHECK_EQ(run(&x, 1), U8_OK);
    CHECK_EQ(u8_step(x.core), U8_OK);                /* SWI 3 */
    CHECK_EQ(REGS->pc, 0x0300);
    CHECK_EQ(REGS->psw.b.elevel, 1);
    CHECK_EQ(REGS->psw.b.mie, 0);
    CHECK_EQ(REGS->elr[0], 0x0104);  /* return = word after the 1-word SWI */
    CHECK(!u8_irq(x.core, 2));                       /* rejected at level 1, MIE=0 */
    CHECK_EQ(run(&x, 2), U8_OK);                     /* handler + RTI */
    CHECK_EQ(REGS->pc, 0x0104);
    CHECK_EQ(REGS->psw.b.elevel, 0);
    CHECK_EQ(REGS->psw.b.mie, 1);                    /* restored from EPSW1 */
    CHECK_EQ(REGS->gpr.r[6], 0x77);
    tfx_done(&x);
}

static void test_irq_nmi(void)
{
    tfx x; tfx_init(&x);
    const uint16_t p[] = { 0xe908, 0xfe8f, 0xfe8f, 0xfe8f };
    const uint16_t h1[] = { 0x0677, 0xfe0f };        /* IRQ handler  */
    const uint16_t h2[] = { 0x0788, 0xfe0f };        /* NMI handler  */
    load(&x, p, 4, 0x0100);
    load(&x, h1, 2, 0x0300);
    load(&x, h2, 2, 0x0340);
    poke16(&x, 0x000Au + 2u * 2u, 0x0300);           /* IRQ index 2  */
    poke16(&x, 0x0008u, 0x0340);                     /* NMI vector   */
    boot(&x, 0x8DFE, 0x0100);
    CHECK_EQ(run(&x, 1), U8_OK);                     /* enable MIE   */
    CHECK(u8_irq(x.core, 2));
    CHECK_EQ(REGS->pc, 0x0300);
    CHECK_EQ(REGS->psw.b.elevel, 1);
    CHECK_EQ(run(&x, 2), U8_OK);
    CHECK_EQ(REGS->pc, 0x0102);
    /* NMI vectors to level 2 regardless of MIE. */
    u8_nmi(x.core);
    CHECK_EQ(REGS->pc, 0x0340);
    CHECK_EQ(REGS->psw.b.elevel, 2);
    tfx_done(&x);
}

static void test_brk(void)
{
    tfx x; tfx_init(&x);
    const uint16_t p[] = { 0xffff, 0xfe8f };         /* BRK; NOP */
    const uint16_t h[] = { 0x0555 };                 /* MOV R5,#0x55 */
    load(&x, p, 2, 0x0100);
    load(&x, h, 1, 0x0380);
    poke16(&x, 0x0004u, 0x0380);
    boot(&x, 0x8DFE, 0x0100);
    CHECK_EQ(u8_step(x.core), U8_OK);
    CHECK_EQ(REGS->pc, 0x0380);
    CHECK_EQ(REGS->psw.b.elevel, 2);
    CHECK_EQ(REGS->elr[1], 0x0102);
    tfx_done(&x);
}

static void test_stack(void)
{
    tfx x; tfx_init(&x);
    /* PUSH R3 / POP R3 keeps SP even and restores the value */
    const uint16_t p[] = { 0x035C, 0xf34e, 0x0300, 0xf30e };
    load(&x, p, 4, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 2);
    CHECK_EQ(REGS->sp, 0x8DFC);
    run(&x, 2);
    CHECK_EQ(REGS->gpr.r[3], 0x5C);
    CHECK_EQ(REGS->sp, 0x8DFE);

    /* PUSH ER2 / POP ER6 */
    const uint16_t q[] = { 0x0412, 0x0534, 0xf45e, 0xfc1e };
    load(&x, q, 4, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 4);
    CHECK_EQ(REGS->gpr.r[12], 0x12);
    CHECK_EQ(REGS->gpr.r[13], 0x34);
    CHECK_EQ(REGS->sp, 0x8DFE);

    /* ADD SP,#4 / ADD SP,#-2 */
    const uint16_t r[] = { 0xe104, 0xe1fe };
    load(&x, r, 2, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    run(&x, 1);
    CHECK_EQ(REGS->sp, 0x8E02);
    run(&x, 1);
    CHECK_EQ(REGS->sp, 0x8E00);
    tfx_done(&x);
}

static void test_lepa(void)
{
    tfx x; tfx_init(&x);
    /* SC; LEA [0x0040]; PUSH {ELR,EPSW,LR}; MOV R0,#0x99; CPLC;
       POP {EA,LR,PSW}; NOP  -> flags/EA restored, execution continues */
    const uint16_t p[] = { 0xed80, 0xf00c, 0x0040, 0xffce, 0x0099, 0xfecf, 0xfd8e, 0xfe8f };
    load(&x, p, 8, 0x0100);
    boot(&x, 0x8DFE, 0x0100);
    CHECK_EQ(run(&x, 7), U8_OK);
    CHECK_EQ(FLAGS.b.c, 1);         /* restored by POP lepa (was CPLC'd to 0) */
    CHECK_EQ(REGS->ea, 0x0040);
    CHECK_EQ(REGS->gpr.r[0], 0x99);
    CHECK_EQ(REGS->pc, 0x0110);
    tfx_done(&x);
}

int main(void)
{
    test_conditions();
    test_bl_rt();
    test_b_register();
    test_swi_rti();
    test_irq_nmi();
    test_brk();
    test_stack();
    test_lepa();
    return TEST_REPORT();
}
