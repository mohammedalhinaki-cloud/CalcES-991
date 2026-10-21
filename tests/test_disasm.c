/* test_disasm.c — disassembler output against known encodings. */
#include <string.h>

#include "test_common.h"
#include "disasm/u8_disasm.h"

static void expect(uint16_t w, const uint16_t *ops, const char *text, int words)
{
    char buf[64];
    memset(buf, 0, sizeof(buf));
    const int got = u8_disasm(w, ops, buf, sizeof(buf));
    if (got != words || strcmp(buf, text) != 0) {
        printf("FAIL %s:%d: 0x%04X -> \"%s\" (%d words), expected \"%s\" (%d)\n",
               __FILE__, __LINE__, w, buf, got, text, words);
        g_fail++;
    }
}

int main(void)
{
    expect(0x032A, NULL, "MOV R3, #0x2A", 1);
    expect(0x1001, NULL, "ADD R0, #0x01", 1);
    expect(0x8018, NULL, "SUB R0, R1", 1);
    expect(0x801a, NULL, "SLL R0, R1", 1);
    expect(0x923a, NULL, "SLL R2, #3", 1);
    expect(0xf466, NULL, "ADD ER2, ER3", 1);
    expect(0xf024, NULL, "MUL ER0, R2", 1);
    expect(0xf029, NULL, "DIV ER0, R2", 1);
    expect(0x9210, (const uint16_t[]){ 0x8123 }, "L R2, [0x8123]", 2);
    expect(0x9311, (const uint16_t[]){ 0x8123 }, "ST R3, [0x8123]", 2);
    expect(0x9040, NULL, "L R0, [ER2]", 1);
    expect(0x9230, NULL, "L R2, [EA]", 1);
    expect(0x9251, NULL, "ST R2, [EA+]", 1);
    expect(0x9034, NULL, "L XR0, [EA]", 1);
    expect(0x902f, NULL, "_LDSR R2", 1);
    expect(0xa230, NULL, "SB R2.3", 1);
    expect(0xc904, NULL, "B EQ, +8", 1);
    expect(0xf200, (const uint16_t[]){ 0x0122 }, "B 0x0122 (CS2)", 2);
    expect(0xf001, (const uint16_t[]){ 0x0110 }, "BL 0x0110 (CS0)", 2);
    expect(0xe410, NULL, "MOV ER2, #16", 1);
    expect(0xe104, NULL, "ADD SP, #4", 1);
    expect(0xe503, NULL, "SWI #3", 1);
    expect(0xf34e, NULL, "PUSH R3", 1);
    expect(0xf41e, NULL, "POP ER2", 1);
    expect(0xfe8f, NULL, "NOP", 1);
    expect(0xfe1f, NULL, "RT", 1);
    expect(0xfe0f, NULL, "RTI", 1);
    expect(0xfecf, NULL, "CPLC", 1);
    expect(0xffff, NULL, "BRK", 1);
    expect(0xcf00, NULL, ".word 0xCF00", 1);
    return TEST_REPORT();
}
