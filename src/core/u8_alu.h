/* u8_alu.h — ALU primitives with exact nX-U8/100 flag semantics. */
#ifndef U8_ALU_H
#define U8_ALU_H
#ifdef __cplusplus
extern "C" {
#endif

#include "u8_types.h"

uint8_t  u8_alu_add  (u8_psw *f, uint8_t d, uint8_t s);
uint8_t  u8_alu_addc (u8_psw *f, uint8_t d, uint8_t s);
uint16_t u8_alu_add_w(u8_psw *f, uint16_t d, uint16_t s);
void     u8_alu_cmp_w(u8_psw *f, uint16_t d, uint16_t s);
uint8_t  u8_alu_sub  (u8_psw *f, uint8_t d, uint8_t s);
uint8_t  u8_alu_subc (u8_psw *f, uint8_t d, uint8_t s);

uint8_t  u8_alu_and  (u8_psw *f, uint8_t d, uint8_t s);
uint8_t  u8_alu_or   (u8_psw *f, uint8_t d, uint8_t s);
uint8_t  u8_alu_xor  (u8_psw *f, uint8_t d, uint8_t s);

uint8_t  u8_alu_sll  (u8_psw *f, uint8_t d, uint8_t count);
uint8_t  u8_alu_srl  (u8_psw *f, uint8_t d, uint8_t count);
uint8_t  u8_alu_sra  (u8_psw *f, uint8_t d, uint8_t count);

uint8_t  u8_alu_daa  (u8_psw *f, uint8_t d);
uint8_t  u8_alu_das  (u8_psw *f, uint8_t d);
uint8_t  u8_alu_neg  (u8_psw *f, uint8_t d);

uint8_t  u8_alu_sb   (u8_psw *f, uint8_t d, uint8_t bit); /* set bit    */
void     u8_alu_tb   (u8_psw *f, uint8_t d, uint8_t bit); /* test bit   */
uint8_t  u8_alu_rb   (u8_psw *f, uint8_t d, uint8_t bit); /* reset bit  */

uint16_t u8_sext(uint16_t v, unsigned bits); /* sign-extend an n-bit value */

#ifdef __cplusplus
}
#endif
#endif /* U8_ALU_H */
