/* u8_core.c — nX-U8/100 instruction fetch/decode/execute.
 *
 * Original clean-room implementation. Encoding groups, flag semantics,
 * vector table layout and per-instruction cycle counts follow the public
 * reverse-engineering documentation of the nX-U8/100 (docs/references.md).
 * Instruction words are 16 bits, little-endian, always even-aligned; the
 * primary decode index is ((w >> 8) & 0xf0) | (w & 0x0f).
 */
#include <stdlib.h>
#include <string.h>

#include "core/u8_alu.h"
#include "core/u8_core.h"
#include "mem/u8_mem.h"

/* Vector table (physical code addresses). */
#define VEC_SP   0x0000u  /* initial stack pointer                    */
#define VEC_PC   0x0002u  /* initial program counter                  */
#define VEC_BRK  0x0004u  /* BRK exception                            */
#define VEC_NMI  0x0008u  /* non-maskable interrupt                   */
#define VEC_IRQ  0x000Au  /* maskable IRQs: + index*2, index < 59     */
#define VEC_SWI  0x0080u  /* software interrupts: + index*2, < 64     */

struct u8_core {
    u8_regs  r;
    u8_bus  *bus;
    int      cycles;   /* cycles consumed by the last step            */
    int      ea_delay; /* +1 cycle penalty after an [EA+] access      */
    int      dsr_next; /* next step's data accesses use DSR (prefix)  */
    int      int_mask; /* remaining cycles with interrupts masked     */
    u8_status mem_status; /* last non-fatal memory condition           */
};

u8_core *u8_core_create(u8_bus *bus)
{
    u8_core *c = (u8_core *)calloc(1, sizeof(*c));
    if (c) c->bus = bus;
    return c;
}

void u8_core_destroy(u8_core *c) { free(c); }

const u8_regs *u8_regs_get(const u8_core *c) { return &c->r; }
int u8_cycles_last(const u8_core *c) { return c->cycles; }
u8_bus *u8_core_bus(const u8_core *c) { return c->bus; }
u8_status u8_last_mem_status(const u8_core *c) { return c->mem_status; }

static uint16_t vec_read(const u8_core *c, uint32_t addr)
{
    u8_status st = U8_OK;
    return u8_fetch_word(c->bus, 0u, (uint16_t)addr, &st);
}

/* Fetches a 16-bit operand word from code space at the current PC. */
static uint16_t fetch_op(u8_core *c, u8_status *st)
{
    const uint16_t v = u8_fetch_word(c->bus, c->r.csr & 0x0fu, c->r.pc, st);
    c->r.pc = (uint16_t)((c->r.pc + 2) & 0xfffeu);
    return v;
}

void u8_core_reset(u8_core *c)
{
    c->r.psw.raw = 0;
    c->r.csr = 0;
    c->r.dsr = 0;
    c->r.sp  = vec_read(c, VEC_SP);
    c->r.pc  = vec_read(c, VEC_PC);
    c->ea_delay = 0;
    c->dsr_next = 0;
    c->int_mask = 0;
    c->cycles   = 0;
}

/* Shared interrupt entry. Backs up return state for the new level and
 * vectors through segment 0. */
static void enter_int(u8_core *c, unsigned level, uint32_t vec, bool clear_mie)
{
    c->r.elr[level - 1]  = c->r.pc;
    c->r.ecsr[level - 1] = c->r.csr;
    c->r.epsw[level - 1] = c->r.psw;
    c->r.psw.b.elevel = (uint8_t)level;
    if (clear_mie) c->r.psw.b.mie = 0;
    c->r.csr = 0;
    c->r.pc  = vec_read(c, vec);
    c->cycles = 3 + c->ea_delay + c->int_mask;
}

void u8_nmi(u8_core *c)
{
    enter_int(c, 2u, VEC_NMI, false);
}

bool u8_irq(u8_core *c, unsigned index)
{
    if (index >= 59u) return false;
    if (c->r.psw.b.elevel > 1u || !c->r.psw.b.mie) return false;
    enter_int(c, 1u, VEC_IRQ + index * 2u, true);
    return true;
}

/* Software interrupt (used by the SWI instruction and by BRK-style traps). */
static void do_swi(u8_core *c, unsigned index, u8_status *st)
{
    if (index < 64u) {
        enter_int(c, 1u, VEC_SWI + index * 2u, true);
    } else {
        *st = U8_ILLEGAL_INSTRUCTION;
    }
}

/* Stack helpers (U8 mode: SP is kept even; multi-byte pushes are
 * little-endian, lowest byte at the lowest address). */
static void push(u8_core *c, uint64_t v, unsigned bytes, u8_status *st)
{
    if (bytes & 1u) c->r.sp--;
    c->r.sp = (uint16_t)(c->r.sp - bytes);
    for (unsigned i = 0; i < bytes; i++) {
        u8_data_write(c->bus, 0u, (uint16_t)(c->r.sp + i), 1u,
                      (v >> (8u * i)) & 0xffu, st);
    }
}

static uint64_t pop(u8_core *c, unsigned bytes, u8_status *st)
{
    uint64_t v = 0;
    for (unsigned i = bytes; i > 0u; i--) {
        v = (v << 8) | u8_data_read(c->bus, 0u, (uint16_t)(c->r.sp + i - 1u), 1u, st);
    }
    c->r.sp = (uint16_t)(c->r.sp + ((bytes + 1u) & 0xfffeu));
    return v;
}

/* Current-level register selection (level 0 uses LR/LCSR/PSW directly). */
static uint16_t *curr_elr(u8_regs *r) { return r->psw.b.elevel ? &r->elr[r->psw.b.elevel - 1] : &r->lr; }
static uint8_t  *curr_ecsr(u8_regs *r) { return r->psw.b.elevel ? &r->ecsr[r->psw.b.elevel - 1] : &r->lcsr; }
static u8_psw   *curr_epsw(u8_regs *r) { return &r->epsw[r->psw.b.elevel ? r->psw.b.elevel - 1 : 0]; }

static int cond_take(const u8_psw *f, unsigned cond, u8_status *st)
{
    switch (cond) {
        case 0:  return !f->b.c;                          /* GE  */
        case 1:  return  f->b.c;                          /* LT  */
        case 2:  return !(f->b.c | f->b.z);               /* GT  */
        case 3:  return  (f->b.c | f->b.z);               /* LE  */
        case 4:  return !(f->b.ov ^ f->b.s);              /* GES */
        case 5:  return  (f->b.ov ^ f->b.s);              /* LTS */
        case 6:  return !((f->b.ov ^ f->b.s) | f->b.z);   /* GTS */
        case 7:  return  ((f->b.ov ^ f->b.s) | f->b.z);   /* LES */
        case 8:  return !f->b.z;                          /* NE  */
        case 9:  return  f->b.z;                          /* EQ  */
        case 10: return !f->b.ov;                         /* NV  */
        case 11: return  f->b.ov;                         /* OV  */
        case 12: return !f->b.s;                          /* PS  */
        case 13: return  f->b.s;                          /* NS  */
        case 14: return 1;                                /* AL  */
        default: *st = U8_ILLEGAL_INSTRUCTION; return 0;  /* 15: reserved */
    }
}

u8_status u8_step(u8_core *c)
{
    u8_status st = U8_OK;
    c->mem_status = U8_OK;
    int cyc = 0;
    int is_dsr = 0, is_ea_inc = 0;
    const int delay = c->ea_delay;   /* bus-conflict penalty from [EA+] */
    c->ea_delay = 0;
    const unsigned dseg = c->dsr_next ? (unsigned)c->r.dsr : 0u;
    c->dsr_next = 0;

    u8_status fst = U8_OK;
    const uint16_t w = u8_fetch_word(c->bus, c->r.csr & 0x0fu, c->r.pc, &fst);
    c->r.pc = (uint16_t)((c->r.pc + 2) & 0xfffeu);

    const unsigned di  = ((w >> 8) & 0xf0u) | (w & 0x0fu);
    const unsigned dst = (w >> 8) & 0x0fu;
    const unsigned src = (w >> 4) & 0x0fu;
    const unsigned imm = w & 0xffu;
    u8_gpr *g = &c->r.gpr;
    u8_psw *f = &c->r.psw;

/* Fetches a 16-bit operand word from code space. */
#define NEXT16() fetch_op(c, &st)

    if (!c->bus) { c->cycles = 0; return U8_MEM_UNINIT; }

    if (di < 0x80u) {
        /* Rn, #imm8 groups: MOV/ADD/AND/OR/XOR/CMPC/ADDC/CMP */
        const unsigned op = (w >> 12) & 0x07u;
        uint8_t *rd = &g->r[dst];
        cyc = 1;
        switch (op) {
            case 0: f->b.z = (imm == 0); f->b.s = (uint8_t)((imm >> 7) & 1u);
                    *rd = (uint8_t)imm; break;                              /* MOV  */
            case 1: *rd = u8_alu_add (f, *rd, (uint8_t)imm); break;         /* ADD  */
            case 2: *rd = u8_alu_and (f, *rd, (uint8_t)imm); break;         /* AND  */
            case 3: *rd = u8_alu_or  (f, *rd, (uint8_t)imm); break;         /* OR   */
            case 4: *rd = u8_alu_xor (f, *rd, (uint8_t)imm); break;         /* XOR  */
            case 5: (void)u8_alu_sub (f, *rd, (uint8_t)imm); break;         /* CMPC */
            case 6: *rd = u8_alu_addc(f, *rd, (uint8_t)imm); break;         /* ADDC */
            case 7: (void)u8_alu_sub (f, *rd, (uint8_t)imm); break;         /* CMP  */
        }
    }
    else if (di <= 0x8eu) {
        /* Rn, Rm register operations */
        uint8_t *rd = &g->r[dst];
        const uint8_t rs = g->r[src];
        cyc = 1 + ((di >= 0x8au) ? delay : 0);
        switch (di) {
            case 0x80: f->b.z = (rs == 0); f->b.s = (uint8_t)((rs >> 7) & 1u);
                       *rd = rs; break;                                     /* MOV  */
            case 0x81: *rd = u8_alu_add (f, *rd, rs); break;
            case 0x82: *rd = u8_alu_and (f, *rd, rs); break;
            case 0x83: *rd = u8_alu_or  (f, *rd, rs); break;
            case 0x84: *rd = u8_alu_xor (f, *rd, rs); break;
            case 0x85: (void)u8_alu_sub (f, *rd, rs); break;                /* CMPC */
            case 0x86: *rd = u8_alu_addc(f, *rd, rs); break;
            case 0x87: (void)u8_alu_sub (f, *rd, rs); break;                /* CMP  */
            case 0x88: *rd = u8_alu_sub (f, *rd, rs); break;                /* SUB  */
            case 0x89: *rd = u8_alu_subc(f, *rd, rs); break;                /* SUBC */
            case 0x8a: *rd = u8_alu_sll(f, *rd, rs); break;                 /* SLL  */
            case 0x8c: *rd = u8_alu_srl(f, *rd, rs); break;                 /* SRL  */
            case 0x8e: *rd = u8_alu_sra(f, *rd, rs); break;                 /* SRA  */
            case 0x8b: {                                                    /* SLLC */
                unsigned cnt = rs & 7u;
                if (cnt) {
                    uint32_t t = ((uint32_t)g->r[dst] << 8) | g->r[(dst - 1u) & 0x0fu];
                    t >>= (8u - cnt);
                    f->b.c = (uint8_t)((t >> 8) & 1u);
                    g->r[dst] = (uint8_t)t;
                }
            } break;
            case 0x8d: {                                                    /* SRLC */
                unsigned cnt = rs & 7u;
                if (cnt) {
                    uint32_t t = ((uint32_t)g->r[(dst + 1u) & 0x0fu] << 9)
                               | ((uint32_t)g->r[dst] << 1);
                    t >>= cnt;
                    f->b.c = (uint8_t)(t & 1u);
                    g->r[dst] = (uint8_t)((t >> 1) & 0xffu);
                }
            } break;
            default: st = U8_ILLEGAL_INSTRUCTION; break;
        }
    }
    else if (di == 0x8fu) {
        if ((w & 0xf11fu) == 0x810fu) {
            /* EXTBW: sign fill. The encoding pins the destination nibble to
             * r1; the source nibble is odd. (Encoding kept as documented.) */
            const uint8_t v = g->r[src];
            f->b.s = (uint8_t)((v >> 7) & 1u);
            f->b.z = (v == 0);
            g->r[dst] = f->b.s ? 0xffu : 0x00u;
            cyc = 1;
        } else {
            switch (w & 0xf0ffu) {
                case 0x801fu: cyc = 1; g->r[dst] = u8_alu_daa(f, g->r[dst]); break;
                case 0x803fu: cyc = 1; g->r[dst] = u8_alu_das(f, g->r[dst]); break;
                case 0x805fu: cyc = 1; g->r[dst] = u8_alu_neg(f, g->r[dst]); break;
                default: st = U8_ILLEGAL_INSTRUCTION; break;
            }
        }
    }
    else if (di <= 0x93u) {
        /* L/ST Rn and L/ST ERn: [ERm] / [adr] / [EA] / [EA+] */
        const bool is_store = (di == 0x91u || di == 0x93u);
        const bool is_word  = (di >= 0x92u);
        const unsigned size = is_word ? 2u : 1u;
        unsigned m;
        if (is_word) {
            if ((dst & 1u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
            if ((w & 0x0010u) == 0u) { m = g->er[src >> 1]; cyc += delay; }
            else {
                const unsigned form = (w >> 4) & 0x7u;
                if (form == 1u)      { m = NEXT16(); cyc += delay; }
                else if (form == 3u) { m = c->r.ea; }
                else if (form == 5u) { m = c->r.ea; c->r.ea = (uint16_t)((c->r.ea + 2u) & 0xfffeu); is_ea_inc = 1; cyc += delay; }
                else { st = U8_ILLEGAL_INSTRUCTION; goto out; }
            }
        } else {
            if ((w & 0x0010u) == 0u) { m = g->er[src >> 1]; cyc += delay; }
            else {
                const unsigned form = (w >> 4) & 0x7u;
                if (form == 1u)      { m = NEXT16(); cyc += delay; }
                else if (form == 3u) { m = c->r.ea; }
                else if (form == 5u) { m = c->r.ea; c->r.ea = (uint16_t)(c->r.ea + 1u); is_ea_inc = 1; cyc += delay; }
                else { st = U8_ILLEGAL_INSTRUCTION; goto out; }
            }
        }
        if (is_store) {
            u8_data_write(c->bus, dseg, (uint16_t)m, size,
                          is_word ? g->er[dst >> 1] : g->r[dst], &st);
            cyc += size;
        } else {
            const uint64_t v = u8_data_read(c->bus, dseg, (uint16_t)m, size, &st);
            cyc += size + u8_bus_take_romwin(c->bus);
            f->b.s = (uint8_t)((v >> (8u * size - 1u)) & 1u);
            f->b.z = (v == 0);
            if (is_word) g->er[dst >> 1] = (uint16_t)v; else g->r[dst] = (uint8_t)v;
        }
    }
    else if (di <= 0x97u) {
        /* L/ST XRn (4 bytes) and QRn (8 bytes): [EA] / [EA+] only */
        const bool is_store = (di == 0x95u);
        const unsigned size = (di <= 0x95u) ? 4u : 8u;
        unsigned m;
        if (((size == 4u) ? (dst & 3u) : (dst & 7u)) != 0u) {
            st = U8_ILLEGAL_INSTRUCTION;
            goto out;
        }
        const unsigned form = (w >> 4) & 0x7u;
        if (form == 3u)      { m = c->r.ea; }
        else if (form == 5u) { m = c->r.ea; c->r.ea = (uint16_t)((c->r.ea + size) & 0xfffeu); is_ea_inc = 1; }
        else { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        if (is_store) {
            uint64_t v = (size == 4u) ? g->xr[dst >> 2] : g->qr[dst >> 3];
            u8_data_write(c->bus, dseg, (uint16_t)m, size, v, &st);
            cyc = size;
        } else {
            const uint64_t v = u8_data_read(c->bus, dseg, (uint16_t)m, size, &st);
            cyc = size + u8_bus_take_romwin(c->bus);
            f->b.s = (uint8_t)((v >> (8u * size - 1u)) & 1u);
            f->b.z = (v == 0);
            if (size == 4u) g->xr[dst >> 2] = (uint32_t)v; else g->qr[dst >> 3] = v;
        }
    }
    else if (di == 0x98u || di == 0x99u) {
        /* L/ST Rn, d16[ERm] */
        const bool is_store = (di == 0x99u);
        if ((w & 0xf01fu) != (is_store ? 0x9009u : 0x9008u)) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        unsigned m = (unsigned)((g->er[src >> 1] + NEXT16()) & 0xffffu);
        if (is_store) {
            u8_data_write(c->bus, dseg, (uint16_t)m, 1u, g->r[dst], &st);
            cyc = 2 + delay;
        } else {
            const uint64_t v = u8_data_read(c->bus, dseg, (uint16_t)m, 1u, &st);
            g->r[dst] = (uint8_t)v;
            f->b.s = (uint8_t)((v >> 7) & 1u);
            f->b.z = (v == 0);
            cyc = 2 + u8_bus_take_romwin(c->bus) + delay;
        }
    }
    else if (di <= 0x9eu) {
        /* SLL/SLLC/SRL/SRLC/SRA Rn, #width */
        if ((w & 0x0080u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        uint8_t *rd = &g->r[dst];
        cyc = 1 + delay;
        switch (di) {
            case 0x9a: *rd = u8_alu_sll(f, *rd, (uint8_t)src); break;
            case 0x9c: *rd = u8_alu_srl(f, *rd, (uint8_t)src); break;
            case 0x9e: *rd = u8_alu_sra(f, *rd, (uint8_t)src); break;
            case 0x9b: {                                   /* SLLC Rn, #width */
                unsigned cnt = src;
                if (cnt) {
                    uint32_t t = ((uint32_t)g->r[dst] << 8) | g->r[(dst - 1u) & 0x0fu];
                    t >>= (8u - cnt);
                    f->b.c = (uint8_t)((t >> 8) & 1u);
                    g->r[dst] = (uint8_t)t;
                }
            } break;
            case 0x9d: {                                   /* SRLC Rn, #width */
                unsigned cnt = src;
                if (cnt) {
                    uint32_t t = ((uint32_t)g->r[(dst + 1u) & 0x0fu] << 9)
                               | ((uint32_t)g->r[dst] << 1);
                    t >>= cnt;
                    f->b.c = (uint8_t)(t & 1u);
                    g->r[dst] = (uint8_t)((t >> 1) & 0xffu);
                }
            } break;
            default: st = U8_ILLEGAL_INSTRUCTION; break;
        }
    }
    else if (di == 0x9fu) {
        /* _LDSR Rd: DSR prefix — the NEXT step's data accesses use DSR */
        if ((w & 0x0f00u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        c->r.dsr = g->r[src];
        is_dsr = 1;
        cyc = 1;
    }
    else if (di <= 0xa2u) {
        /* SB/TB/RB on register bit or memory bit ([adr] form) */
        const unsigned bit = src & 7u;
        if (w & 0x0080u) {
            if ((w & 0x0f80u) != 0x0080u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
            const uint16_t adr = NEXT16();
            const uint8_t v = (uint8_t)u8_data_read(c->bus, dseg, adr, 1u, &st);
            if (di == 0xa1u) {
                u8_alu_tb(f, v, (uint8_t)bit);
                cyc = 2 + u8_bus_take_romwin(c->bus) + delay;
            } else {
                const uint8_t r2 = (di == 0xa0u) ? u8_alu_sb(f, v, (uint8_t)bit)
                                                 : u8_alu_rb(f, v, (uint8_t)bit);
                u8_data_write(c->bus, dseg, adr, 1u, r2, &st);
                cyc = 2 + delay;
            }
        } else {
            uint8_t *rd = &g->r[dst];
            cyc = 1;
            if (di == 0xa0u)      *rd = u8_alu_sb(f, *rd, (uint8_t)bit);
            else if (di == 0xa1u)  u8_alu_tb(f, *rd, (uint8_t)bit);
            else                  *rd = u8_alu_rb(f, *rd, (uint8_t)bit);
        }
    }
    else if (di == 0xa3u) {  /* MOV Rn, PSW */
        if ((w & 0x00f0u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        g->r[dst] = f->raw;
        cyc = 1;
    }
    else if (di == 0xa4u) {  /* MOV Rn, EPSW (current level) */
        if ((w & 0x00f0u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        if (f->b.elevel != 0u) g->r[dst] = curr_epsw(&c->r)->raw;
        cyc = 2;
    }
    else if (di == 0xa5u) {  /* MOV ERn, ELR */
        if ((w & 0x01f0u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        g->er[dst >> 1] = *curr_elr(&c->r);
        cyc = 3;
    }
    else if (di == 0xa6u) { st = U8_UNIMPLEMENTED; goto out; }  /* MOV Rn, CRm */
    else if (di == 0xa7u) {  /* MOV Rn, ECSR */
        if ((w & 0x00f0u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        g->r[dst] = *curr_ecsr(&c->r);
        cyc = 2;
    }
    else if (di == 0xa8u || di == 0xa9u) {
        /* L/ST ERn, d16[ERm] */
        const bool is_store = (di == 0xa9u);
        if ((w & 0xf11fu) != (is_store ? 0xa009u : 0xa008u)) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        unsigned m = (unsigned)((g->er[src >> 1] + NEXT16()) & 0xffffu);
        if (is_store) {
            u8_data_write(c->bus, dseg, (uint16_t)m, 2u, g->er[dst >> 1], &st);
            cyc = 3 + delay;
        } else {
            const uint64_t v = u8_data_read(c->bus, dseg, (uint16_t)m, 2u, &st);
            g->er[dst >> 1] = (uint16_t)v;
            f->b.s = (uint8_t)((v >> 15) & 1u);
            f->b.z = (v == 0);
            cyc = 3 + u8_bus_take_romwin(c->bus) + delay;
        }
    }
    else if (di == 0xaau) {
        if ((w & 0x01f0u) == 0x0010u) {           /* MOV ERn, SP */
            g->er[dst >> 1] = c->r.sp;
            cyc = 2;
        } else if ((w & 0x0f10u) == 0x0100u) {    /* MOV SP, ERm */
            c->r.sp = g->er[src >> 1];
            cyc = 1;
        } else {
            st = U8_ILLEGAL_INSTRUCTION;
        }
    }
    else if (di == 0xabu) {  /* MOV PSW, Rm */
        if ((w & 0x0f00u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        f->raw = g->r[src];
        cyc = 1;
    }
    else if (di == 0xacu) {  /* MOV EPSW, Rm */
        if ((w & 0x0f00u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        if (f->b.elevel != 0u) curr_epsw(&c->r)->raw = g->r[src];
        cyc = 1;
    }
    else if (di == 0xadu) {  /* MOV ELR, ERm */
        if ((w & 0x01f0u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        *curr_elr(&c->r) = g->er[dst >> 1];
        cyc = 3;
    }
    else if (di == 0xaeu) { st = U8_UNIMPLEMENTED; goto out; }  /* MOV CRn, Rm */
    else if (di == 0xafu) {  /* MOV ECSR, Rm */
        if ((w & 0x0f00u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        *curr_ecsr(&c->r) = (uint8_t)(g->r[src] & 0x0fu);
        cyc = 2;
    }
    else if (di <= 0xbfu) {
        /* L/ST ERn, disp6[BP] / disp6[FP] */
        const unsigned sub = w & 0x01c0u;
        const int16_t disp = (int16_t)u8_sext((uint16_t)(w & 0x3fu), 6);
        const bool is_store = (sub & 0x0080u) != 0u;
        const unsigned base = (sub & 0x0040u) ? g->er[7]  /* FP = ER14 */
                                              : g->er[6]; /* BP = ER12 */
        const unsigned m = (unsigned)((base + disp) & 0xffffu);
        if (is_store) {
            u8_data_write(c->bus, dseg, (uint16_t)m, 2u, g->er[dst >> 1], &st);
            cyc = 3 + delay;
        } else {
            const uint64_t v = u8_data_read(c->bus, dseg, (uint16_t)m, 2u, &st);
            g->er[dst >> 1] = (uint16_t)v;
            f->b.s = (uint8_t)((v >> 15) & 1u);
            f->b.z = (v == 0);
            cyc = 3 + u8_bus_take_romwin(c->bus) + delay;
        }
    }
    else if (di <= 0xcfu) {
        /* B<cond> rel8 */
        const unsigned cond = (w >> 8) & 0x0fu;
        if (cond_take(f, cond, &st)) {
            c->r.pc = (uint16_t)((c->r.pc + ((int16_t)u8_sext((uint8_t)imm, 8) << 1)) & 0xffffu);
            cyc = 3;
        } else {
            cyc = 1;
        }
        if (st != U8_OK) goto out;
    }
    else if (di <= 0xdfu) {
        /* L/ST Rn, disp6[BP] / disp6[FP] (byte) */
        const unsigned sub = w & 0x01c0u;
        const int16_t disp = (int16_t)u8_sext((uint16_t)(w & 0x3fu), 6);
        const bool is_store = (sub & 0x0080u) != 0u;
        const unsigned base = (sub & 0x0040u) ? g->er[7] : g->er[6];
        const unsigned m = (unsigned)((base + disp) & 0xffffu);
        if (is_store) {
            u8_data_write(c->bus, dseg, (uint16_t)m, 1u, g->r[dst], &st);
            cyc = 3 + delay;
        } else {
            const uint64_t v = u8_data_read(c->bus, dseg, (uint16_t)m, 1u, &st);
            g->r[dst] = (uint8_t)v;
            f->b.s = (uint8_t)((v >> 7) & 1u);
            f->b.z = (v == 0);
            cyc = 3 + u8_bus_take_romwin(c->bus) + delay;
        }
    }
    else if (di <= 0xefu) {
        if ((w & 0x0180u) == 0x0000u) {           /* MOV ERn, #imm7 */
            const int16_t v = (int16_t)u8_sext((uint16_t)(w & 0x7fu), 7);
            g->er[dst >> 1] = (uint16_t)v;
            f->b.z = (v == 0);
            f->b.s = (uint8_t)((v >> 15) & 1u);
            cyc = 2;
        } else if ((w & 0x0180u) == 0x0080u) {    /* ADD ERn, #imm7 */
            const int16_t v = (int16_t)u8_sext((uint16_t)(w & 0x7fu), 7);
            g->er[dst >> 1] = u8_alu_add_w(f, g->er[dst >> 1], (uint16_t)v);
            cyc = 2;
        } else {
            switch (w & 0x0f00u) {
                case 0x0100u: /* ADD SP, #signed8 */
                    c->r.sp = (uint16_t)(c->r.sp + u8_sext((uint8_t)imm, 8));
                    cyc = 2;
                    break;
                case 0x0300u: /* _LDSR #imm8 */
                    c->r.dsr = (uint8_t)imm;
                    is_dsr = 1;
                    cyc = 1;
                    break;
                case 0x0500u: /* SWI #snum */
                    do_swi(c, imm, &st);
                    cyc = 3 + delay + c->int_mask;
                    break;
                case 0x0900u: /* MOV PSW, #unsigned8 */
                    f->raw = (uint8_t)imm;
                    cyc = 1;
                    break;
                case 0x0b00u:
                    if (w == 0xeb7fu)      { f->b.c = 0; cyc = 1; }   /* RC */
                    else if (w == 0xebf7u) { f->b.mie = 0; cyc = 3; } /* DI */
                    else st = U8_ILLEGAL_INSTRUCTION;
                    break;
                case 0x0d00u:
                    if (w == 0xed08u)      { f->b.mie = 1; cyc = 1; } /* EI */
                    else if (w == 0xed80u) { f->b.c = 1; cyc = 1; }   /* SC */
                    else st = U8_ILLEGAL_INSTRUCTION;
                    break;
                default:
                    st = U8_ILLEGAL_INSTRUCTION;
                    break;
            }
        }
    }
    else if (di == 0xf0u) {  /* B Cadr (segment in the dest nibble) */
        if ((w & 0x00f0u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        c->r.pc = (uint16_t)(NEXT16() & 0xfffeu);
        c->r.csr = (uint8_t)dst;
        cyc = 2 + delay;
    }
    else if (di == 0xf1u) {  /* BL Cadr */
        if ((w & 0x00f0u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        const uint16_t t = NEXT16();
        c->r.lr = c->r.pc;       /* return address = past the operand */
        c->r.lcsr = c->r.csr;
        c->r.pc = (uint16_t)(t & 0xfffeu);
        c->r.csr = (uint8_t)dst;
        cyc = 2 + delay;
    }
    else if (di == 0xf2u) {  /* B ERn */
        if ((w & 0x0f10u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        c->r.pc = (uint16_t)(g->er[src >> 1] & 0xfffeu);
        cyc = 2 + delay;
    }
    else if (di == 0xf3u) {  /* BL ERn */
        if ((w & 0x0f10u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        c->r.lr = c->r.pc;       /* one-word instruction: PC already past it */
        c->r.lcsr = c->r.csr;
        c->r.pc = (uint16_t)(g->er[src >> 1] & 0xfffeu);
        cyc = 2 + delay;
    }
    else if (di == 0xf4u) {  /* MUL ERn, Rm */
        if ((w & 0x0100u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        const uint16_t p = (uint16_t)((unsigned)g->r[dst] * g->r[src]);
        f->b.z = (p == 0);
        g->er[dst >> 1] = p;
        cyc = 9;
    }
    else if (di <= 0xf7u) {
        /* MOV/ADD/CMP ERn, ERm */
        if ((w & 0x0110u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        cyc = 2;
        if (di == 0xf5u) {
            const uint16_t v = g->er[src >> 1];
            f->b.z = (v == 0);
            f->b.s = (uint8_t)((v >> 15) & 1u);
            g->er[dst >> 1] = v;
        } else if (di == 0xf6u) {
            g->er[dst >> 1] = u8_alu_add_w(f, g->er[dst >> 1], g->er[src >> 1]);
        } else {
            u8_alu_cmp_w(f, g->er[dst >> 1], g->er[src >> 1]);
        }
    }
    else if (di == 0xf9u) {  /* DIV ERn, Rm */
        if ((w & 0x0100u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        const uint16_t dvd = g->er[dst >> 1];
        const uint8_t  dvs = g->r[src];
        cyc = 17;
        f->b.z = (dvd < dvs);
        f->b.c = 0;
        if (dvs == 0) {
            f->b.c = 1;
            g->r[src] = (uint8_t)(dvd & 0xffu);   /* remainder */
            g->er[dst >> 1] = 0xffffu;
        } else {
            g->r[src] = (uint8_t)(dvd % dvs);
            g->er[dst >> 1] = (uint16_t)(dvd / dvs);
        }
    }
    else if (di <= 0xfcu) {  /* LEA family */
        if ((w & 0x0010u) != 0u) { st = U8_ILLEGAL_INSTRUCTION; goto out; }
        if (di == 0xfau)      { c->r.ea = g->er[src >> 1]; cyc = 1; }
        else if (di == 0xfbu) { c->r.ea = (uint16_t)((g->er[src >> 1] + NEXT16()) & 0xffffu); cyc = 2; }
        else                  { c->r.ea = NEXT16(); cyc = 2; }
    }
    else if (di == 0xfdu) { st = U8_UNIMPLEMENTED; goto out; }  /* CRn <-> [EA] */
    else if (di == 0xfeu) {
        const unsigned sub = w & 0x00f0u;
        switch (sub) {
            case 0x0000u: g->r[dst] = (uint8_t)pop(c, 1u, &st); cyc = 2 + delay; break;
            case 0x0010u:
                if (dst & 1u) { st = U8_ILLEGAL_INSTRUCTION; break; }
                g->er[dst >> 1] = (uint16_t)pop(c, 2u, &st); cyc = 2 + delay; break;
            case 0x0020u:
                if (dst & 3u) { st = U8_ILLEGAL_INSTRUCTION; break; }
                g->xr[dst >> 2] = (uint32_t)pop(c, 4u, &st); cyc = 4 + delay; break;
            case 0x0030u:
                if (dst & 7u) { st = U8_ILLEGAL_INSTRUCTION; break; }
                g->qr[dst >> 3] = pop(c, 8u, &st); cyc = 8 + delay; break;
            case 0x0040u: push(c, g->r[dst], 1u, &st); cyc = 2 + delay; break;
            case 0x0050u:
                if (dst & 1u) { st = U8_ILLEGAL_INSTRUCTION; break; }
                push(c, g->er[dst >> 1], 2u, &st); cyc = 2 + delay; break;
            case 0x0060u:
                if (dst & 3u) { st = U8_ILLEGAL_INSTRUCTION; break; }
                push(c, g->xr[dst >> 2], 4u, &st); cyc = 4 + delay; break;
            case 0x0070u:
                if (dst & 7u) { st = U8_ILLEGAL_INSTRUCTION; break; }
                push(c, g->qr[dst >> 3], 8u, &st); cyc = 8 + delay; break;
            case 0x0080u: { /* POP lepa — EA/LR/PSW/PC by mask bits 0,3,2,1 */
                int sum = 0;
                if (dst & 0x01u) { c->r.ea = (uint16_t)pop(c, 2u, &st); sum += 2; }
                if (dst & 0x08u) { c->r.lr = (uint16_t)pop(c, 2u, &st);
                                   c->r.lcsr = (uint8_t)(pop(c, 1u, &st) & 0x0fu); sum += 4; }
                if (dst & 0x04u) { f->raw = (uint8_t)pop(c, 1u, &st); sum += 2; }
                if (dst & 0x02u) { c->r.pc = (uint16_t)(pop(c, 2u, &st) & 0xfffeu);
                                   c->r.csr = (uint8_t)(pop(c, 1u, &st) & 0x0fu); sum += 5; }
                /* NOTE: the reference reports a flat 1 cycle here; we keep the
                 * per-part sum (documented deviation, see README). */
                cyc = sum ? sum : (delay ? delay : 1);
            } break;
            case 0x00c0u: { /* PUSH lepa — ELR/EPSW/LR/EA by mask bits 1,2,3,0 */
                int sum = 0;
                if (dst & 0x02u) { push(c, *curr_ecsr(&c->r), 1u, &st);
                                   push(c, *curr_elr(&c->r), 2u, &st); sum += 4; }
                /* EPSW part: save the LIVE PSW. Level 0 has no EPSW bank
                 * (epsw[] is written only on interrupt entry), so pushing
                 * the bank would save a stale value; the live PSW is what
                 * a later POP lepa / nesting round-trip needs. */
                if (dst & 0x04u) { push(c, f->raw, 1u, &st); sum += 2; }
                if (dst & 0x08u) { push(c, c->r.lcsr, 1u, &st);
                                   push(c, c->r.lr, 2u, &st); sum += 4; }
                if (dst & 0x01u) { push(c, c->r.ea, 2u, &st); sum += 2; }
                cyc = sum ? sum : (delay ? delay : 1);
            } break;
            default: st = U8_ILLEGAL_INSTRUCTION; break;
        }
    }
    else { /* di == 0xff: exact-word specials */
        switch (w) {
            case 0xfe0fu: /* RTI */
                c->r.csr = *curr_ecsr(&c->r);
                c->r.pc  = *curr_elr(&c->r);
                f->raw   = curr_epsw(&c->r)->raw;
                cyc = 2 + delay;
                break;
            case 0xfe1fu: /* RT */
                c->r.csr = c->r.lcsr;
                c->r.pc  = c->r.lr;
                cyc = 2 + delay;
                break;
            case 0xfe2fu: { /* INC [EA] — carry preserved */
                const uint8_t old = f->b.c;
                const uint8_t v = (uint8_t)u8_data_read(c->bus, dseg, c->r.ea, 1u, &st);
                u8_data_write(c->bus, dseg, c->r.ea, 1u, u8_alu_add(f, v, 1u), &st);
                f->b.c = old;
                cyc = 2 + delay;
            } break;
            case 0xfe3fu: { /* DEC [EA] — carry preserved */
                const uint8_t old = f->b.c;
                const uint8_t v = (uint8_t)u8_data_read(c->bus, dseg, c->r.ea, 1u, &st);
                u8_data_write(c->bus, dseg, c->r.ea, 1u, u8_alu_sub(f, v, 1u), &st);
                f->b.c = old;
                cyc = 2 + delay;
            } break;
            case 0xfe8fu: cyc = 1; break;                       /* NOP    */
            case 0xfe9fu: is_dsr = 1; cyc = 1; break;           /* _UDSR  */
            case 0xfecfu: f->b.c ^= 1; cyc = 1; break;          /* CPLC   */
            case 0xffffu: /* BRK */
                if (f->b.elevel > 1u) {
                    u8_core_reset(c);
                } else {
                    c->r.elr[1] = c->r.pc;
                    c->r.ecsr[1] = c->r.csr;
                    c->r.epsw[1] = c->r.psw;
                    c->r.psw.b.elevel = 2u;
                    c->r.csr = 0;
                    c->r.pc = vec_read(c, VEC_BRK);
                }
                cyc = 7 + delay;
                break;
            default: st = U8_ILLEGAL_INSTRUCTION; break;
        }
    }

#undef NEXT16

out:
    if (st != U8_OK && st != U8_ILLEGAL_INSTRUCTION && st != U8_UNIMPLEMENTED) {
        /* Non-fatal memory condition (bad access): record it and continue,
         * matching the machine (bad reads give 0, bad writes are dropped). */
        c->mem_status = st;
        st = U8_OK;
    }
    if (st == U8_OK) {
        c->ea_delay = is_ea_inc ? 1 : 0;
        c->dsr_next = is_dsr ? 1 : 0;
        c->int_mask -= cyc;
        if (c->int_mask < 0) c->int_mask = 0;
        if (is_dsr && c->int_mask == 0) c->int_mask = 1;
    }
    c->cycles = cyc;
    return st;
}
