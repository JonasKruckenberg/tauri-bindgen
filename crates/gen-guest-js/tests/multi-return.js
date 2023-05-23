export class Deserializer {
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

function try_take_varint(de, type) {
    let out = 0n;

    for (let i = 0; i < varint_max(type); i++) {
        const val = de.pop();
        const carry = BigInt(val & 0x7F);
        out |= carry << (7n * BigInt(i));

        if ((val & 0x80) === 0) {
            if (i === varint_max(type) - 1 && val > max_of_last_byte(type)) {
                throw new Error('deserialize bad variant')
            } else {
                return out
            }
        }
    }

    throw new Error('deserialize bad variant')
}function deserializeU32(de) {
    return try_take_varint(de, 32)
}function deserializeF32(de) {
    const bytes = de.try_take_n(4);

    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);

    bytes.reverse().forEach((v, i) => view.setUint8(i, v));

    return view.getFloat32(0);
}

            /**
*/
            export async function mra () {
                return fetch('ipc://localhost/multi_return/mra', { method: "POST", body: JSON.stringify([]) })
            }
        
            /**
* @returns {Promise<[]>} 
*/
            export async function mrb () {
                return fetch('ipc://localhost/multi_return/mrb', { method: "POST", body: JSON.stringify([]) })
            }
        
            /**
* @returns {Promise<number>} 
*/
            export async function mrc () {
                return fetch('ipc://localhost/multi_return/mrc', { method: "POST", body: JSON.stringify([]) })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeU32(de)
                })
            }
        
            /**
* @returns {Promise<[number]>} 
*/
            export async function mrd () {
                return fetch('ipc://localhost/multi_return/mrd', { method: "POST", body: JSON.stringify([]) })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(new Uint8Array(bytes))

                    return deserializeU32(de)
                })
            }
        
            /**
* @returns {Promise<[number, number]>} 
*/
            export async function mre () {
                return fetch('ipc://localhost/multi_return/mre', { method: "POST", body: JSON.stringify([]) })
                .then(r => r.arrayBuffer())
                .then(bytes => {
                    const de = new Deserializer(Uint8Array.from(bytes))

                    return [deserializeU32(de), deserializeF32(de)]
                })
            }
        
