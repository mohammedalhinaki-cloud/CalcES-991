/* u8_disasm.h — nX-U8/100 disassembler. */
#ifndef U8_DISASM_H
#define U8_DISASM_H
#ifdef __cplusplus
extern "C" {
#endif

#include <stddef.h>
#include <stdint.h>

/* Disassemble one instruction word. `ops` points at the following words in
 * memory (may be NULL); used to render address operands. Returns the number
 * of 16-bit words consumed (1 or 2). Output is NUL-terminated. */
int u8_disasm(uint16_t w, const uint16_t *ops, char *out, size_t outlen);

#ifdef __cplusplus
}
#endif
#endif /* U8_DISASM_H */
