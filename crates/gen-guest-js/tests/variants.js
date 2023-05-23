class Deserializer {
    source
    offset
    
    constructor(bytes) {
        this.source = bytes
        this.offset = 0
    }

    pop() {
        return this.source[this.offset++]
    }

    try_take_n(len) {
        const out = this.source.slice(this.offset, this.offset + len)
        this.offset += len
        return out
    }
}
function varint_max(type) {
    const BITS_PER_BYTE = 8;
    const BITS_PER_VARINT_BYTE = 7;

    const bits = type * BITS_PER_BYTE;

    const roundup_bits = bits + (BITS_PER_BYTE - 1);

    return Math.floor(roundup_bits / BITS_PER_VARINT_BYTE);
}
function max_of_last_byte(type) {
    let extra_bits = type % 7;
    return (1 << extra_bits) - 1;
}

function de_varint(de, type) {
    let out = 0;

    for (let i = 0; i < varint_max(type); i++) {
        const val = de.pop();
        const carry = val & 0x7F;
        out |= carry << (7 * i);

        if ((val & 0x80) === 0) {
            if (i === varint_max(type) - 1 && val > max_of_last_byte(type)) {
                throw new Error('deserialize bad variant')
            } else {
                return out
            }
        }
    }

    throw new Error('deserialize bad variant')
}function deserializeBool(de) {
    const val = de.pop();

    return val != 0
}function deserializeU8(de) {
    return de.pop()
}function deserializeU32(de) {
    return de_varint(de, 32)
}function deserializeU64(de) {
    return de_varint(de, 64)
}function deserializeS32(de) {
    const n = de_varint(de, 32)

    return Number(((n >> 1) & 0xFFFFFFFF) ^ (-((n & 0b1) & 0xFFFFFFFF)))
}function deserializeS64(de) {
    const n = de_varint(de, 64)

    return Number(((n >> 1) & 0xFFFFFFFFFFFFFFFF) ^ (-((n & 0b1) & 0xFFFFFFFFFFFFFFFF)))
}function deserializeF32(de) {
    const bytes = de.try_take_n(4);

    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);

    bytes.forEach((v, i) => view.setUint8(i, v));

    return view.getFloat32(0, true);
}function deserializeF64(de) {
    const bytes = de.try_take_n(8);

    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);

    bytes.forEach((v, i) => view.setUint8(i, v));

    return view.getFloat64(0, true);
}function deserializeString(de) {
    const sz = deserializeU64(de);

    let bytes = de.try_take_n(Number(sz));

    const decoder = new TextDecoder('utf-8');

    return decoder.decode(bytes);
}function deserializeBytes(de) {
    const sz = deserializeU64(de);

    let bytes = de.try_take_n(Number(sz));

    return bytes;
}function deserializeOption(de, inner) {
    const tag = de.pop()

    switch (tag) {
        case 0:
            return null
        case 1: 
            return inner(de)
        default:
            throw new Error(`Deserialize bad option ${tag}`)
    }
}function deserializeResult(de, ok, err) {
    const tag = de.pop()

    switch (tag) {
        case 0:
            return { Ok: ok(de) }
        case 1: 
            return { Err: err(de) }
        default:
            throw new Error(`Deserialize bad result ${tag}`)
    }
}function ser_varint(out, type, val) {
    let buf = []
    for (let i = 0; i < varint_max(type); i++) {
        const buffer = new ArrayBuffer(type / 8);
        const view = new DataView(buffer);
        view.setInt16(0, val, true);
        buf[i] = view.getUint8(0);
        if (val < 128) {
            out.push(...buf)
            return;
        }

        buf[i] |= 0x80;
        val >>= 7;
    }
    out.push(...buf)
}
function serializeBool(out, val) {
    out.push(val === true ? 1 : 0)
}function serializeU8(out, val) {
    return out.push(val)
}function serializeU32(out, val) {
    return ser_varint(out, 32, val)
}function serializeU64(out, val) {
    return ser_varint(out, 64, val)
}function serializeS32(out, val) {
    ser_varint(out, 32, (val << 1) ^ (val >> 31))
}function serializeS64(out, val) {
    ser_varint(out, 64, (val << 1) ^ (val >> 63))
}function serializeF32(out, val) {
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);

    view.setFloat32(0, val, true);

    out.push(...new Uint8Array(buf))
}function serializeF64(out, val) {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);

    view.setFloat64(0, val, true);

    out.push(...new Uint8Array(buf))
}function serializeString(out, val) {
    serializeU64(out, val.length);

    const encoder = new TextEncoder();

    out.push(...encoder.encode(val))
}function serializeBytes(out, val) {
    serializeU64(out, val.length);
    out.push(...val)
}function serializeOption(out, inner, val) {
    serializeU8(out, !!val ? 1 : 0)
    if (val) {
        inner(out, val)
    }
}function serializeResult(out, ok, err, val) {
    if (val.Ok) {
        serializeU8(out, 0);
        return ok(out, val.Ok);
    }

    if (val.Err) {
        serializeU8(out, 1);
        return err(out, val.Err);
    }

    throw new Error(`Serialize bad result ${val}`);
}function deserializeE1(de) {
                const tag = deserializeU32(de)

                switch (tag) {
                    case 0:
                return "A"
            
                    default:
                        throw new Error(`unknown enum case ${tag}`)
                }
        }function deserializeU1(de) {
                const tag = deserializeU32(de)

                switch (tag) {
                    case 0:
                return { U32: deserializeU32(de) }
            case 1:
                return { F32: deserializeF32(de) }
            
                    default:
                        throw new Error(`unknown union case ${tag}`)
                }
        }function deserializeEmpty(de) {
            return {
                
            }
        }function deserializeV1(de) {
                const tag = deserializeU32(de)

                switch (tag) {
                    case 0:
            return { A: null }
        case 1:
            return { B: deserializeU1(de) }
        case 2:
            return { C: deserializeE1(de) }
        case 3:
            return { D: deserializeString(de) }
        case 4:
            return { E: deserializeEmpty(de) }
        case 5:
            return { F: null }
        case 6:
            return { G: deserializeU32(de) }
        
                    default:
                        throw new Error(`unknown variant case ${tag}`)
                }
        }function deserializeCasts1(de) {
                const tag = deserializeU32(de)

                switch (tag) {
                    case 0:
            return { A: deserializeS32(de) }
        case 1:
            return { B: deserializeF32(de) }
        
                    default:
                        throw new Error(`unknown variant case ${tag}`)
                }
        }function deserializeCasts2(de) {
                const tag = deserializeU32(de)

                switch (tag) {
                    case 0:
            return { A: deserializeF64(de) }
        case 1:
            return { B: deserializeF32(de) }
        
                    default:
                        throw new Error(`unknown variant case ${tag}`)
                }
        }function deserializeCasts3(de) {
                const tag = deserializeU32(de)

                switch (tag) {
                    case 0:
            return { A: deserializeF64(de) }
        case 1:
            return { B: deserializeU64(de) }
        
                    default:
                        throw new Error(`unknown variant case ${tag}`)
                }
        }function deserializeCasts4(de) {
                const tag = deserializeU32(de)

                switch (tag) {
                    case 0:
            return { A: deserializeU32(de) }
        case 1:
            return { B: deserializeS64(de) }
        
                    default:
                        throw new Error(`unknown variant case ${tag}`)
                }
        }function deserializeCasts5(de) {
                const tag = deserializeU32(de)

                switch (tag) {
                    case 0:
            return { A: deserializeF32(de) }
        case 1:
            return { B: deserializeS64(de) }
        
                    default:
                        throw new Error(`unknown variant case ${tag}`)
                }
        }function deserializeCasts6(de) {
                const tag = deserializeU32(de)

                switch (tag) {
                    case 0:
            return { A: [deserializeF32(de), deserializeU32(de)] }
        case 1:
            return { B: [deserializeU32(de), deserializeU32(de)] }
        
                    default:
                        throw new Error(`unknown variant case ${tag}`)
                }
        }function deserializeMyErrno(de) {
                const tag = deserializeU32(de)

                switch (tag) {
                    case 0:
                return "Bad1"
            case 1:
                return "Bad2"
            
                    default:
                        throw new Error(`unknown enum case ${tag}`)
                }
        }function deserializeIsClone(de) {
            return {
                v1: deserializeV1(de)
            }
        }function serializeE1(out, val) {
                switch (val) {
                    case "A":
                    serializeU32(out, 0)
                    return
            
                    default:
                        throw new Error("unknown enum case")
                }
        }function serializeU1(out, val) {
                if (val.U32) {
                    serializeU32(out, 0);
                    return serializeU32(out, val.U32)
                }
                if (val.F32) {
                    serializeU32(out, 1);
                    return serializeF32(out, val.F32)
                }
                

                throw new Error("unknown union case")
        }function serializeEmpty(out, val) {
                
            }function serializeV1(out, val) {
                if (val.A) {
                    serializeU32(out, 0);
                    return 
                }
                if (val.B) {
                    serializeU32(out, 1);
                    return serializeU1(out, val.B)
                }
                if (val.C) {
                    serializeU32(out, 2);
                    return serializeE1(out, val.C)
                }
                if (val.D) {
                    serializeU32(out, 3);
                    return serializeString(out, val.D)
                }
                if (val.E) {
                    serializeU32(out, 4);
                    return serializeEmpty(out, val.E)
                }
                if (val.F) {
                    serializeU32(out, 5);
                    return 
                }
                if (val.G) {
                    serializeU32(out, 6);
                    return serializeU32(out, val.G)
                }
                

                throw new Error("unknown variant case")
        }function serializeCasts1(out, val) {
                if (val.A) {
                    serializeU32(out, 0);
                    return serializeS32(out, val.A)
                }
                if (val.B) {
                    serializeU32(out, 1);
                    return serializeF32(out, val.B)
                }
                

                throw new Error("unknown variant case")
        }function serializeCasts2(out, val) {
                if (val.A) {
                    serializeU32(out, 0);
                    return serializeF64(out, val.A)
                }
                if (val.B) {
                    serializeU32(out, 1);
                    return serializeF32(out, val.B)
                }
                

                throw new Error("unknown variant case")
        }function serializeCasts3(out, val) {
                if (val.A) {
                    serializeU32(out, 0);
                    return serializeF64(out, val.A)
                }
                if (val.B) {
                    serializeU32(out, 1);
                    return serializeU64(out, val.B)
                }
                

                throw new Error("unknown variant case")
        }function serializeCasts4(out, val) {
                if (val.A) {
                    serializeU32(out, 0);
                    return serializeU32(out, val.A)
                }
                if (val.B) {
                    serializeU32(out, 1);
                    return serializeS64(out, val.B)
                }
                

                throw new Error("unknown variant case")
        }function serializeCasts5(out, val) {
                if (val.A) {
                    serializeU32(out, 0);
                    return serializeF32(out, val.A)
                }
                if (val.B) {
                    serializeU32(out, 1);
                    return serializeS64(out, val.B)
                }
                

                throw new Error("unknown variant case")
        }function serializeCasts6(out, val) {
                if (val.A) {
                    serializeU32(out, 0);
                    return {serializeF32(out, val.A[0]);serializeU32(out, val.A[1])}
                }
                if (val.B) {
                    serializeU32(out, 1);
                    return {serializeU32(out, val.B[0]);serializeU32(out, val.B[1])}
                }
                

                throw new Error("unknown variant case")
        }function serializeIsClone(out, val) {
                serializeV1(out, val.v1)
            }

            /**
* @param {E1} x 
*/
            export async function e1Arg (x) {
                const out = []
                serializeE1(out, x)

                return fetch('ipc://localhost/variants/e1_arg', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
            }
        
            /**
* @returns {Promise<E1>} 
*/
            export async function e1Result () {
                const out = []
                

                return fetch('ipc://localhost/variants/e1_result', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeE1(de)
                })
            }
        
            /**
* @param {U1} x 
*/
            export async function u1Arg (x) {
                const out = []
                serializeU1(out, x)

                return fetch('ipc://localhost/variants/u1_arg', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
            }
        
            /**
* @returns {Promise<U1>} 
*/
            export async function u1Result () {
                const out = []
                

                return fetch('ipc://localhost/variants/u1_result', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeU1(de)
                })
            }
        
            /**
* @param {V1} x 
*/
            export async function v1Arg (x) {
                const out = []
                serializeV1(out, x)

                return fetch('ipc://localhost/variants/v1_arg', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
            }
        
            /**
* @returns {Promise<V1>} 
*/
            export async function v1Result () {
                const out = []
                

                return fetch('ipc://localhost/variants/v1_result', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeV1(de)
                })
            }
        
            /**
* @param {boolean} x 
*/
            export async function boolArg (x) {
                const out = []
                serializeBool(out, x)

                return fetch('ipc://localhost/variants/bool_arg', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
            }
        
            /**
* @returns {Promise<boolean>} 
*/
            export async function boolResult () {
                const out = []
                

                return fetch('ipc://localhost/variants/bool_result', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeBool(de)
                })
            }
        
            /**
* @param {boolean | null} a 
* @param {[] | null} b 
* @param {number | null} c 
* @param {E1 | null} d 
* @param {number | null} e 
* @param {U1 | null} f 
* @param {boolean | null | null} g 
*/
            export async function optionArg (a, b, c, d, e, f, g) {
                const out = []
                serializeOption(out, (out, v) => serializeBool(out, v), a);
serializeOption(out, (out, v) => {}, b);
serializeOption(out, (out, v) => serializeU32(out, v), c);
serializeOption(out, (out, v) => serializeE1(out, v), d);
serializeOption(out, (out, v) => serializeF32(out, v), e);
serializeOption(out, (out, v) => serializeU1(out, v), f);
serializeOption(out, (out, v) => serializeOption(out, (out, v) => serializeBool(out, v), v), g)

                return fetch('ipc://localhost/variants/option_arg', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
            }
        
            /**
* @returns {Promise<[boolean | null, [] | null, number | null, E1 | null, number | null, U1 | null, boolean | null | null]>} 
*/
            export async function optionResult () {
                const out = []
                

                return fetch('ipc://localhost/variants/option_result', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return [deserializeOption(de, (de) => deserializeBool(de)), deserializeOption(de, (de) => []), deserializeOption(de, (de) => deserializeU32(de)), deserializeOption(de, (de) => deserializeE1(de)), deserializeOption(de, (de) => deserializeF32(de)), deserializeOption(de, (de) => deserializeU1(de)), deserializeOption(de, (de) => deserializeOption(de, (de) => deserializeBool(de)))]
                })
            }
        
            /**
* @param {Casts1} a 
* @param {Casts2} b 
* @param {Casts3} c 
* @param {Casts4} d 
* @param {Casts5} e 
* @param {Casts6} f 
* @returns {Promise<[Casts1, Casts2, Casts3, Casts4, Casts5, Casts6]>} 
*/
            export async function casts (a, b, c, d, e, f) {
                const out = []
                serializeCasts1(out, a);
serializeCasts2(out, b);
serializeCasts3(out, c);
serializeCasts4(out, d);
serializeCasts5(out, e);
serializeCasts6(out, f)

                return fetch('ipc://localhost/variants/casts', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return [deserializeCasts1(de), deserializeCasts2(de), deserializeCasts3(de), deserializeCasts4(de), deserializeCasts5(de), deserializeCasts6(de)]
                })
            }
        
            /**
* @param {Result<_, _>} a 
* @param {Result<_, E1>} b 
* @param {Result<E1, _>} c 
* @param {Result<[], []>} d 
* @param {Result<number, V1>} e 
* @param {Result<string, Uint8Array[]>} f 
*/
            export async function resultArg (a, b, c, d, e, f) {
                const out = []
                serializeResult(out, (out, v) => {}, (out, v) => {}, a);
serializeResult(out, (out, v) => {}, (out, v) => serializeE1(out, v), b);
serializeResult(out, (out, v) => serializeE1(out, v), (out, v) => {}, c);
serializeResult(out, (out, v) => {}, (out, v) => {}, d);
serializeResult(out, (out, v) => serializeU32(out, v), (out, v) => serializeV1(out, v), e);
serializeResult(out, (out, v) => serializeString(out, v), (out, v) => serializeList(out, (out, v) => serializeU8(out, v), v), f)

                return fetch('ipc://localhost/variants/result_arg', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
            }
        
            /**
* @returns {Promise<[Result<_, _>, Result<_, E1>, Result<E1, _>, Result<[], []>, Result<number, V1>, Result<string, Uint8Array[]>]>} 
*/
            export async function resultResult () {
                const out = []
                

                return fetch('ipc://localhost/variants/result_result', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return [deserializeResult(de, () => {}, () => {}), deserializeResult(de, () => {}, deserializeE1(de)), deserializeResult(de, deserializeE1(de), () => {}), deserializeResult(de, [], []), deserializeResult(de, deserializeU32(de), deserializeV1(de)), deserializeResult(de, deserializeString(de), deserializeBytes(de))]
                })
            }
        
            /**
* @returns {Promise<Result<number, MyErrno>>} 
*/
            export async function returnResultSugar () {
                const out = []
                

                return fetch('ipc://localhost/variants/return_result_sugar', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeResult(de, deserializeS32(de), deserializeMyErrno(de))
                })
            }
        
            /**
* @returns {Promise<Result<_, MyErrno>>} 
*/
            export async function returnResultSugar2 () {
                const out = []
                

                return fetch('ipc://localhost/variants/return_result_sugar2', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeResult(de, () => {}, deserializeMyErrno(de))
                })
            }
        
            /**
* @returns {Promise<Result<MyErrno, MyErrno>>} 
*/
            export async function returnResultSugar3 () {
                const out = []
                

                return fetch('ipc://localhost/variants/return_result_sugar3', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeResult(de, deserializeMyErrno(de), deserializeMyErrno(de))
                })
            }
        
            /**
* @returns {Promise<Result<[number, number], MyErrno>>} 
*/
            export async function returnResultSugar4 () {
                const out = []
                

                return fetch('ipc://localhost/variants/return_result_sugar4', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeResult(de, [deserializeS32(de), deserializeU32(de)], deserializeMyErrno(de))
                })
            }
        
            /**
* @returns {Promise<number | null>} 
*/
            export async function returnOptionSugar () {
                const out = []
                

                return fetch('ipc://localhost/variants/return_option_sugar', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeOption(de, (de) => deserializeS32(de))
                })
            }
        
            /**
* @returns {Promise<MyErrno | null>} 
*/
            export async function returnOptionSugar2 () {
                const out = []
                

                return fetch('ipc://localhost/variants/return_option_sugar2', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeOption(de, (de) => deserializeMyErrno(de))
                })
            }
        
            /**
* @returns {Promise<Result<number, number>>} 
*/
            export async function resultSimple () {
                const out = []
                

                return fetch('ipc://localhost/variants/result_simple', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeResult(de, deserializeU32(de), deserializeS32(de))
                })
            }
        
            /**
* @param {IsClone} a 
*/
            export async function isCloneArg (a) {
                const out = []
                serializeIsClone(out, a)

                return fetch('ipc://localhost/variants/is_clone_arg', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
            }
        
            /**
* @returns {Promise<IsClone>} 
*/
            export async function isCloneReturn () {
                const out = []
                

                return fetch('ipc://localhost/variants/is_clone_return', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeIsClone(de)
                })
            }
        
            /**
* @returns {Promise<[number | null]>} 
*/
            export async function returnNamedOption () {
                const out = []
                

                return fetch('ipc://localhost/variants/return_named_option', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeOption(de, (de) => deserializeU8(de))
                })
            }
        
            /**
* @returns {Promise<[Result<number, MyErrno>]>} 
*/
            export async function returnNamedResult () {
                const out = []
                

                return fetch('ipc://localhost/variants/return_named_result', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeResult(de, deserializeU8(de), deserializeMyErrno(de))
                })
            }
        
