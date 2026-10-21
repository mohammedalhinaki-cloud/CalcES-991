/* u8_alu.c — ALU primitives with exact nX-U8/100 flag semantics.
 * Hardware behaviour derived from public reverse-engineering documentation
 * (overflow via carry-in/borrow-in of the top bit, half carry for BCD).
 */
#include "core/u8_alu.h"

uint16_t u8_sext(uint16_t v, unsigned bits)
{
    int16_t t = (int16_t)(uint16_t)(v << (16 - bits));
    return (uint16_t)(t >> (16 - bits));
}

/* 8-bit add: C/Z/S/OV/HC */
uint8_t u8_alu_add(u8_psw *f, uint8_t d, uint8_t s)
{
    uint16_t t = (uint16_t)(d + s);
    f->b.c  = (t & 0x100u) ? 1u : 0u;
    t &= 0xffu;
    f->b.z  = (t == 0);
    f->b.s  = (uint8_t)((t >> 7) & 1u);
    /* carry into bit 7 XOR carry out of bit 7 */
    f->b.ov = (unsigned)(((d & 0x7fu) + (s & 0x7fu)) >> 7) ^ (unsigned)f->b.c;
    f->b.hc = (((d & 0x0fu) + (s & 0x0fu)) & 0x10u) ? 1u : 0u;
    return (uint8_t)t;
}

/* 16-bit add */
uint16_t u8_alu_add_w(u8_psw *f, uint16_t d, uint16_t s)
{
    uint32_t t = (uint32_t)d + s;
    f->b.c  = (t & 0x10000u) ? 1u : 0u;
    t &= 0xffffu;
    f->b.z  = (t == 0);
    f->b.s  = (uint8_t)((t >> 15) & 1u);
    f->b.ov = (unsigned)(((d & 0x7fffu) + (s & 0x7fffu)) >> 15) ^ (unsigned)f->b.c;
    f->b.hc = (((d & 0x0fffu) + (s & 0x0fffu)) & 0x1000u) ? 1u : 0u;
    return (uint16_t)t;
}

/* 8-bit add with carry: Z is AND-ed with the previous Z (multi-precision) */
uint8_t u8_alu_addc(u8_psw *f, uint8_t d, uint8_t s)
{
    unsigned oc = f->b.c;
    uint16_t t = (uint16_t)(d + s + oc);
    f->b.c  = (t & 0x100u) ? 1u : 0u;
    t &= 0xffu;
    f->b.z  = (unsigned)f->b.z & (unsigned)(t == 0);
    f->b.s  = (uint8_t)((t >> 7) & 1u);
    f->b.ov = (unsigned)(((d & 0x7fu) + (s & 0x7fu) + oc) >> 7) ^ (unsigned)f->b.c;
    f->b.hc = (((d & 0x0fu) + (s & 0x0fu) + oc) & 0x10u) ? 1u : 0u;
    return (uint8_t)t;
}

/* 16-bit compare (subtract, discard result) */
void u8_alu_cmp_w(u8_psw *f, uint16_t d, uint16_t s)
{
    uint32_t t = (uint32_t)d - s;
    f->b.c  = (t & 0x10000u) ? 1u : 0u;
    t &= 0xffffu;
    f->b.z  = (t == 0);
    f->b.s  = (uint8_t)((t >> 15) & 1u);
    unsigned b6 = (((d & 0x7fffu) - (s & 0x7fffu)) >> 15) & 1u; /* borrow into top bit */
    f->b.ov = b6 ^ (unsigned)f->b.c;
    f->b.hc = (((d & 0x0fffu) - (s & 0x0fffu)) & 0x1000u) ? 1u : 0u;
}

/* 8-bit subtract / compare: C = borrow. Overflow = borrow-into-bit7 XOR
 * borrow-out-of-bit7 (the reference implementation misses the mask on the
 * borrow-in term for negative probes; this is the corrected formula). */
uint8_t u8_alu_sub(u8_psw *f, uint8_t d, uint8_t s)
{
    uint16_t t = (uint16_t)((unsigned)d - (unsigned)s);
    f->b.c  = (t & 0x100u) ? 1u : 0u;
    t &= 0xffu;
    f->b.z  = (t == 0);
    f->b.s  = (uint8_t)((t >> 7) & 1u);
    f->b.ov = (unsigned)(((d & 0x7fu) - (s & 0x7fu)) >> 7) ^ (unsigned)f->b.c;
    f->b.hc = (((d & 0x0fu) - (s & 0x0fu)) & 0x10u) ? 1u : 0u;
    return (uint8_t)t;
}

uint8_t u8_alu_subc(u8_psw *f, uint8_t d, uint8_t s)
{
    unsigned oc = f->b.c;
    uint16_t t = (uint16_t)((unsigned)d - (unsigned)s - oc);
    f->b.c  = (t & 0x100u) ? 1u : 0u;
    t &= 0xffu;
    f->b.z  = (unsigned)f->b.z & (unsigned)(t == 0);
    f->b.s  = (uint8_t)((t >> 7) & 1u);
    f->b.ov = (unsigned)(((d & 0x7fu) - (s & 0x7fu) - oc) >> 7) ^ (unsigned)f->b.c;
    f->b.hc = (((d & 0x0fu) - (s & 0x0fu) - oc) & 0x10u) ? 1u : 0u;
    return (uint8_t)t;
}

uint8_t u8_alu_and(u8_psw *f, uint8_t d, uint8_t s)
{
    uint8_t t = (uint8_t)(d & s);
    f->b.z = (t == 0);
    f->b.s = (uint8_t)((t >> 7) & 1u);
    return t;
}

uint8_t u8_alu_or(u8_psw *f, uint8_t d, uint8_t s)
{
    uint8_t t = (uint8_t)(d | s);
    f->b.z = (t == 0);
    f->b.s = (uint8_t)((t >> 7) & 1u);
    return t;
}

uint8_t u8_alu_xor(u8_psw *f, uint8_t d, uint8_t s)
{
    uint8_t t = (uint8_t)(d ^ s);
    f->b.z = (t == 0);
    f->b.s = (uint8_t)((t >> 7) & 1u);
    return t;
}

/* Shifts: a count of 0 leaves data and flags untouched. */

uint8_t u8_alu_sll(u8_psw *f, uint8_t d, uint8_t count)
{
    uint16_t t;
    count &= 7u;
    if (count == 0) return d;
    t = (uint16_t)((unsigned)d << count);
    f->b.c = (t & 0x100u) ? 1u : 0u;
    return (uint8_t)t;
}

uint8_t u8_alu_srl(u8_psw *f, uint8_t d, uint8_t count)
{
    uint16_t t;
    count &= 7u;
    if (count == 0) return d;
    t = (uint16_t)((((unsigned)d << 1)) >> count); /* spare bit for carry */
    f->b.c = (uint8_t)(t & 1u);
    return (uint8_t)((t >> 1) & 0xffu);
}

uint8_t u8_alu_sra(u8_psw *f, uint8_t d, uint8_t count)
{
    int16_t t;
    count &= 7u;
    if (count == 0) return d;
    t = (int16_t)((unsigned)d << 8);
    t = (int16_t)(t >> (count + 7));
    f->b.c = (uint8_t)(t & 1u);
    return (uint8_t)(((unsigned)t >> 1) & 0xffu);
}

/* Decimal adjust after addition (per AMD64 DAA semantics, as the hardware
 * documentation indicates). */
uint8_t u8_alu_daa(u8_psw *f, uint8_t d)
{
    uint16_t t = d;
    if ((t & 0x0fu) > 0x09u) {
        t += 0x06u;
        f->b.hc = 1;
    } else if (f->b.hc == 1) {
        t += 0x06u;
        f->b.hc = 0;
    }
    if (((t & 0xf0u) > 0x90u) || (f->b.c == 1) || (t & 0x100u)) {
        t += 0x60u;
    }
    f->b.c = (unsigned)f->b.c | (unsigned)((t & 0x100u) ? 1u : 0u);
    f->b.s = (uint8_t)((t >> 7) & 1u);
    f->b.z = ((uint8_t)t == 0);
    return (uint8_t)t;
}

/* Decimal adjust after subtraction. */
uint8_t u8_alu_das(u8_psw *f, uint8_t d)
{
    uint16_t t = d;
    if ((t & 0x0fu) > 0x09u) {
        t -= 0x06u;
        f->b.hc = 0;
    } else if (f->b.hc == 1) {
        t -= 0x06u;
        f->b.hc = ((t & 0x0fu) > 0x09u) ? 1u : 0u;
    }
    if (((t & 0xf0u) > 0x90u) || (f->b.c == 1)) {
        t -= 0x60u;
    }
    f->b.c = (unsigned)f->b.c | (unsigned)((t & 0x100u) ? 1u : 0u);
    f->b.s = (uint8_t)((t >> 7) & 1u);
    f->b.z = ((uint8_t)t == 0);
    return (uint8_t)t;
}

uint8_t u8_alu_neg(u8_psw *f, uint8_t d)
{
    f->b.hc = (d & 0x0fu) ? 1u : 0u;
    f->b.c  = d ? 1u : 0u;
    f->b.ov = (d == 0x80u) ? 1u : 0u;
    d = (uint8_t)(0u - d);
    f->b.s = (uint8_t)((d >> 7) & 1u);
    f->b.z = (d == 0);
    return d;
}

uint8_t u8_alu_sb(u8_psw *f, uint8_t d, uint8_t bit)
{
    uint8_t m = (uint8_t)(1u << (bit & 7u));
    f->b.z = ((d & m) == 0);
    return (uint8_t)(d | m);
}

void u8_alu_tb(u8_psw *f, uint8_t d, uint8_t bit)
{
    uint8_t m = (uint8_t)(1u << (bit & 7u));
    f->b.z = ((d & m) == 0);
}

uint8_t u8_alu_rb(u8_psw *f, uint8_t d, uint8_t bit)
{
    uint8_t m = (uint8_t)(1u << (bit & 7u));
    f->b.z = ((d & m) == 0);
    return (uint8_t)(d & (uint8_t)~m);
}
