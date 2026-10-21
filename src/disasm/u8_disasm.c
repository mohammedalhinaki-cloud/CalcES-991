/* u8_disasm.c — text rendering of nX-U8/100 instruction words.
 * Group layout mirrors the hardware decode (see core/u8_core.c).
 */
#include <stdbool.h>
#include <stdio.h>

#include "disasm/u8_disasm.h"

static const char *COND[16] = {
    "GE", "LT", "GT", "LE", "GES", "LTS", "GTS", "LES",
    "NE", "EQ", "NV", "OV", "PS", "NS", "AL", "?15"
};

static const char *ALU8[8] = {
    "MOV", "ADD", "AND", "OR", "XOR", "CMPC", "ADDC", "CMP"
};

int u8_disasm(uint16_t w, const uint16_t *ops, char *out, size_t n)
{
    int words = 1;
    const unsigned di  = ((w >> 8) & 0xf0u) | (w & 0x0fu);
    const unsigned dst = (w >> 8) & 0x0fu;
    const unsigned src = (w >> 4) & 0x0fu;
    const unsigned imm = w & 0xffu;
    const uint16_t op1 = ops ? ops[0] : 0u;

    if (di < 0x80u) {
        snprintf(out, n, "%s R%u, #0x%02X", ALU8[(w >> 12) & 7u], dst, imm);
    } else if (di <= 0x8eu) {
        static const char *N[15] = {
            "MOV", "ADD", "AND", "OR", "XOR", "CMPC", "ADDC", "CMP",
            "SUB", "SUBC", "SLL", "SLLC", "SRL", "SRLC", "SRA"
        };
        snprintf(out, n, "%s R%u, R%u", N[di - 0x80u], dst, src);
    } else if (di == 0x8fu) {
        if ((w & 0xf11fu) == 0x810fu)      snprintf(out, n, "EXTBW");
        else if ((w & 0xf0ffu) == 0x801fu) snprintf(out, n, "DAA R%u", dst);
        else if ((w & 0xf0ffu) == 0x803fu) snprintf(out, n, "DAS R%u", dst);
        else if ((w & 0xf0ffu) == 0x805fu) snprintf(out, n, "NEG R%u", dst);
        else goto bad;
    } else if (di <= 0x97u) {
        static const char *M[2] = { "L", "ST" };
        const bool store = (di & 1u) != 0;
        const unsigned size = (di >= 0x92u) ? ((di >= 0x94u) ? ((di >= 0x96u) ? 8u : 4u) : 2u) : 1u;
        const char *sz = (size == 1u) ? "" : (size == 2u) ? " ER" : (size == 4u) ? " XR" : " QR";
        const unsigned reg = (size == 1u) ? dst : (size == 2u) ? (dst >> 1) : (size == 4u) ? (dst >> 2) : (dst >> 3);
        const unsigned form = (w >> 4) & 0x7u;
        if (size == 1u) {
            if ((w & 0x0010u) == 0u)
                snprintf(out, n, "%s R%u, [ER%u]", M[store], dst, src >> 1);
            else if (form == 1u) { snprintf(out, n, "%s R%u, [0x%04X]", M[store], dst, op1); words = 2; }
            else if (form == 3u) snprintf(out, n, "%s R%u, [EA]", M[store], dst);
            else if (form == 5u) snprintf(out, n, "%s R%u, [EA+]", M[store], dst);
            else goto bad;
        } else {
            if ((w & 0x0110u) == 0u)
                snprintf(out, n, "%s%s%u, [ER%u]", M[store], sz, reg, src >> 1);
            else if (form == 1u) { snprintf(out, n, "%s%s%u, [0x%04X]", M[store], sz, reg, op1); words = 2; }
            else if (form == 3u) snprintf(out, n, "%s%s%u, [EA]", M[store], sz, reg);
            else if (form == 5u) snprintf(out, n, "%s%s%u, [EA+]", M[store], sz, reg);
            else goto bad;
        }
    } else if (di <= 0x99u) {
        if (di == 0x98u)      { snprintf(out, n, "L R%u, 0x%04X[ER%u]", dst, op1, src >> 1); words = 2; }
        else if (di == 0x99u) { snprintf(out, n, "ST R%u, 0x%04X[ER%u]", dst, op1, src >> 1); words = 2; }
        else goto bad;
    } else if (di <= 0x9eu) {
        static const char *S[5] = { "SLL", "SLLC", "SRL", "SRLC", "SRA" };
        snprintf(out, n, "%s R%u, #%u", S[di - 0x9au], dst, src);
    } else if (di == 0x9fu) {
        snprintf(out, n, "_LDSR R%u", src);
    } else if (di <= 0xa2u) {
        static const char *B[3] = { "SB", "TB", "RB" };
        const unsigned bit = src & 7u;
        if (w & 0x0080u) { snprintf(out, n, "%s [0x%04X].%u", B[di - 0xa0u], op1, bit); words = 2; }
        else              snprintf(out, n, "%s R%u.%u", B[di - 0xa0u], dst, bit);
    } else if (di <= 0xa7u) {
        static const char *M2[5] = { "PSW", "EPSW", "ELR", "?CR", "ECSR" };
        if (di == 0xa5u) snprintf(out, n, "MOV ER%u, ELR", dst >> 1);
        else if (di == 0xa6u) { snprintf(out, n, "MOV R%u, CR%u (unimplemented)", dst, src); }
        else snprintf(out, n, "MOV R%u, %s", dst, M2[di - 0xa3u]);
    } else if (di <= 0xa9u) {
        snprintf(out, n, "%s ER%u, 0x%04X[ER%u]", (di == 0xa8u) ? "L" : "ST",
                 dst >> 1, op1, src >> 1);
        words = 2;
    } else if (di == 0xaau) {
        if ((w & 0x01f0u) == 0x0010u) snprintf(out, n, "MOV ER%u, SP", dst >> 1);
        else                          snprintf(out, n, "MOV SP, ER%u", src >> 1);
    } else if (di <= 0xafu) {
        static const char *M3[5] = { "PSW", "EPSW", "ELR", "?CR", "ECSR" };
        if (di == 0xaeu) snprintf(out, n, "MOV CR%u, R%u (unimplemented)", dst, src);
        else if (di == 0xadu) snprintf(out, n, "MOV ELR, ER%u", dst >> 1);
        else snprintf(out, n, "MOV %s, R%u", M3[di - 0xabu], src);
    } else if (di <= 0xbfu) {
        const char *d = ((w & 0x3fu) & 0x20u) ? "-" : "+";
        const unsigned v = (w & 0x3fu) & 0x1fu;
        snprintf(out, n, "%s ER%u, [ER1%c+%s0x%02X]", (w & 0x0180u) ? "ST" : "L",
                 dst >> 1, (w & 0x0040u) ? '5' : '2', d, v);
    } else if (di <= 0xcfu) {
        const unsigned cond = (w >> 8) & 0x0fu;
        if (cond == 0x0fu) goto bad;                 /* reserved condition */
        const int8_t r = (int8_t)(w & 0xffu);
        snprintf(out, n, "B %s, %+d", COND[cond], (int)r * 2);
    } else if (di <= 0xdfu) {
        const char *d = ((w & 0x3fu) & 0x20u) ? "-" : "+";
        const unsigned v = (w & 0x3fu) & 0x1fu;
        snprintf(out, n, "%s R%u, [ER1%c+%s0x%02X]", (w & 0x0180u) ? "ST" : "L",
                 dst, (w & 0x0040u) ? '5' : '2', d, v);
    } else if (di <= 0xefu) {
        if ((w & 0x0180u) == 0x0000u)      snprintf(out, n, "MOV ER%u, #%d", dst >> 1, (int)(int16_t)((int16_t)(w & 0x7fu) << 9) >> 9);
        else if ((w & 0x0180u) == 0x0080u) snprintf(out, n, "ADD ER%u, #%d", dst >> 1, (int)(int16_t)((int16_t)(w & 0x7fu) << 9) >> 9);
        else switch (w & 0x0f00u) {
            case 0x0100u: snprintf(out, n, "ADD SP, #%d", (int)(int8_t)(w & 0xffu)); break;
            case 0x0300u: snprintf(out, n, "_LDSR #0x%02X", imm); break;
            case 0x0500u: snprintf(out, n, "SWI #%u", imm); break;
            case 0x0900u: snprintf(out, n, "MOV PSW, #0x%02X", imm); break;
            case 0x0b00u:
                if (w == 0xeb7fu)      snprintf(out, n, "RC");
                else if (w == 0xebf7u) snprintf(out, n, "DI");
                else goto bad;
                break;
            case 0x0d00u:
                if (w == 0xed08u)      snprintf(out, n, "EI");
                else if (w == 0xed80u) snprintf(out, n, "SC");
                else goto bad;
                break;
            default: goto bad;
        }
    } else if (di == 0xf0u) { snprintf(out, n, "B 0x%04X (CS%u)", op1, dst); words = 2; }
    else if (di == 0xf1u) { snprintf(out, n, "BL 0x%04X (CS%u)", op1, dst); words = 2; }
    else if (di == 0xf2u) { snprintf(out, n, "B ER%u", src >> 1); }
    else if (di == 0xf3u) { snprintf(out, n, "BL ER%u", src >> 1); }
    else if (di == 0xf4u) { snprintf(out, n, "MUL ER%u, R%u", dst >> 1, src); }
    else if (di <= 0xf7u) {
        static const char *M4[3] = { "MOV", "ADD", "?" };
        if (di == 0xf7u) snprintf(out, n, "CMP ER%u, ER%u", dst >> 1, src >> 1);
        else snprintf(out, n, "%s ER%u, ER%u", M4[di - 0xf5u], dst >> 1, src >> 1);
    } else if (di == 0xf9u) { snprintf(out, n, "DIV ER%u, R%u", dst >> 1, src); }
    else if (di <= 0xfcu) {
        if (di == 0xfau)      snprintf(out, n, "LEA [ER%u]", src >> 1);
        else if (di == 0xfbu) { snprintf(out, n, "LEA [ER%u+0x%04X]", src >> 1, op1); words = 2; }
        else                  { snprintf(out, n, "LEA [0x%04X]", op1); words = 2; }
    } else if (di == 0xfdu) { snprintf(out, n, "MOV CRn, [EA] (unimplemented)"); }
    else if (di == 0xfeu) {
        switch (w & 0x00f0u) {
            case 0x0000u: snprintf(out, n, "POP R%u", dst); break;
            case 0x0010u: snprintf(out, n, "POP ER%u", dst >> 1); break;
            case 0x0020u: snprintf(out, n, "POP XR%u", dst >> 2); break;
            case 0x0030u: snprintf(out, n, "POP QR%u", dst >> 3); break;
            case 0x0040u: snprintf(out, n, "PUSH R%u", dst); break;
            case 0x0050u: snprintf(out, n, "PUSH ER%u", dst >> 1); break;
            case 0x0060u: snprintf(out, n, "PUSH XR%u", dst >> 2); break;
            case 0x0070u: snprintf(out, n, "PUSH QR%u", dst >> 3); break;
            case 0x0080u: snprintf(out, n, "POP {EA,PC,PSW,LR} mask=0x%X", dst); break;
            case 0x00c0u: snprintf(out, n, "PUSH {ELR,EPSW,LR,EA} mask=0x%X", dst); break;
            default: goto bad;
        }
    } else {
        switch (w) {
            case 0xfe0fu: snprintf(out, n, "RTI"); break;
            case 0xfe1fu: snprintf(out, n, "RT"); break;
            case 0xfe2fu: snprintf(out, n, "INC [EA]"); break;
            case 0xfe3fu: snprintf(out, n, "DEC [EA]"); break;
            case 0xfe8fu: snprintf(out, n, "NOP"); break;
            case 0xfe9fu: snprintf(out, n, "_UDSR"); break;
            case 0xfecfu: snprintf(out, n, "CPLC"); break;
            case 0xffffu: snprintf(out, n, "BRK"); break;
            default: goto bad;
        }
    }
    return words;

bad:
    snprintf(out, n, ".word 0x%04X", w);
    return 1;
}
