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
}function deserializeU8(de) {
    return de.pop()
}function deserializeU16(de) {
    return de_varint(de, 16)
}function deserializeU32(de) {
    return de_varint(de, 32)
}function deserializeU64(de) {
    return de_varint(de, 64)
}function deserializeS8(de) {
    const buf = new ArrayBuffer(1);
    const view = new DataView(buf);

    buf[0] = view.setUint8(0, de.pop());

    return view.getInt8(0);
}function deserializeS16(de) {
    const n = de_varint(de, 16)

    return Number(((n >> 1) & 0xFFFF) ^ (-((n & 0b1) & 0xFFFF)))
}function deserializeS32(de) {
    const n = de_varint(de, 32)

    return Number(((n >> 1) & 0xFFFFFFFF) ^ (-((n & 0b1) & 0xFFFFFFFF)))
}function deserializeS64(de) {
    const n = de_varint(de, 64)

    return Number(((n >> 1) & 0xFFFFFFFFFFFFFFFF) ^ (-((n & 0b1) & 0xFFFFFFFFFFFFFFFF)))
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
function serializeU8(out, val) {
    return out.push(val)
}function serializeU16(out, val) {
    return ser_varint(out, 16, val)
}function serializeU32(out, val) {
    return ser_varint(out, 32, val)
}function serializeU64(out, val) {
    return ser_varint(out, 64, val)
}function serializeS8(out, val) {
    out.push(val)
}function serializeS16(out, val) {
    ser_varint(out, 16, (val << 1) ^ (val >> 15))
}function serializeS32(out, val) {
    ser_varint(out, 32, (val << 1) ^ (val >> 31))
}function serializeS64(out, val) {
    ser_varint(out, 64, (val << 1) ^ (val >> 63))
}

            /**
* @param {number} x 
*/
            export async function a1 (x) {
                const out = []
                serializeU8(out, x)

                return fetch('ipc://localhost/integers/a1', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
            }
        
            /**
* @param {number} x 
*/
            export async function a2 (x) {
                const out = []
                serializeS8(out, x)

                return fetch('ipc://localhost/integers/a2', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
            }
        
            /**
* @param {number} x 
*/
            export async function a3 (x) {
                const out = []
                serializeU16(out, x)

                return fetch('ipc://localhost/integers/a3', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
            }
        
            /**
* @param {number} x 
*/
            export async function a4 (x) {
                const out = []
                serializeS16(out, x)

                return fetch('ipc://localhost/integers/a4', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
            }
        
            /**
* @param {number} x 
*/
            export async function a5 (x) {
                const out = []
                serializeU32(out, x)

                return fetch('ipc://localhost/integers/a5', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
            }
        
            /**
* @param {number} x 
*/
            export async function a6 (x) {
                const out = []
                serializeS32(out, x)

                return fetch('ipc://localhost/integers/a6', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
            }
        
            /**
* @param {bigint} x 
*/
            export async function a7 (x) {
                const out = []
                serializeU64(out, x)

                return fetch('ipc://localhost/integers/a7', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
            }
        
            /**
* @param {bigint} x 
*/
            export async function a8 (x) {
                const out = []
                serializeS64(out, x)

                return fetch('ipc://localhost/integers/a8', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
            }
        
            /**
* @param {number} p1 
* @param {number} p2 
* @param {number} p3 
* @param {number} p4 
* @param {number} p5 
* @param {number} p6 
* @param {bigint} p7 
* @param {bigint} p8 
*/
            export async function a9 (p1, p2, p3, p4, p5, p6, p7, p8) {
                const out = []
                serializeU8(out, p1);
serializeS8(out, p2);
serializeU16(out, p3);
serializeS16(out, p4);
serializeU32(out, p5);
serializeS32(out, p6);
serializeU64(out, p7);
serializeS64(out, p8)

                return fetch('ipc://localhost/integers/a9', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
            }
        
            /**
* @returns {Promise<number>} 
*/
            export async function r1 () {
                const out = []
                

                return fetch('ipc://localhost/integers/r1', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeU8(de)
                })
            }
        
            /**
* @returns {Promise<number>} 
*/
            export async function r2 () {
                const out = []
                

                return fetch('ipc://localhost/integers/r2', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeS8(de)
                })
            }
        
            /**
* @returns {Promise<number>} 
*/
            export async function r3 () {
                const out = []
                

                return fetch('ipc://localhost/integers/r3', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeU16(de)
                })
            }
        
            /**
* @returns {Promise<number>} 
*/
            export async function r4 () {
                const out = []
                

                return fetch('ipc://localhost/integers/r4', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeS16(de)
                })
            }
        
            /**
* @returns {Promise<number>} 
*/
            export async function r5 () {
                const out = []
                

                return fetch('ipc://localhost/integers/r5', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeU32(de)
                })
            }
        
            /**
* @returns {Promise<number>} 
*/
            export async function r6 () {
                const out = []
                

                return fetch('ipc://localhost/integers/r6', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeS32(de)
                })
            }
        
            /**
* @returns {Promise<bigint>} 
*/
            export async function r7 () {
                const out = []
                

                return fetch('ipc://localhost/integers/r7', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeU64(de)
                })
            }
        
            /**
* @returns {Promise<bigint>} 
*/
            export async function r8 () {
                const out = []
                

                return fetch('ipc://localhost/integers/r8', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeS64(de)
                })
            }
        
            /**
* @returns {Promise<[bigint, number]>} 
*/
            export async function pairRet () {
                const out = []
                

                return fetch('ipc://localhost/integers/pair_ret', { method: "POST", body: Uint8Array.from(out), headers: { 'Content-Type': 'application/octet-stream' } })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return [deserializeS64(de), deserializeU8(de)]
                })
            }
        
