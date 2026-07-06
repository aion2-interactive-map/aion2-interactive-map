# The bitset operations are enough for small data now (e.g., ~100 bytes)
# We can use the bitarray library if this is a bottleneck

def _required_bytes(bit_count: int) -> int:
    if bit_count <= 0:
        return 0
    return (bit_count + 7) // 8


def ensure_bitset_size(bitset: bytes | None, bit_count: int) -> bytes:
    """Ensure bitset has enough bytes to store [0..bit_count-1] bits."""
    needed = _required_bytes(bit_count)
    if needed == 0:
        return b""

    if bitset is None:
        return b"\x00" * needed

    if len(bitset) >= needed:
        return bitset

    return bitset + b"\x00" * (needed - len(bitset))


def get_bit(bitset: bytes | None, index: int) -> bool:
    """Return True if bit at `index` is 1, False otherwise."""
    if bitset is None or index < 0:
        return False

    byte_index = index // 8
    bit_offset = index % 8

    if byte_index >= len(bitset):
        return False

    return bool(bitset[byte_index] & (1 << bit_offset))


def set_bit(bitset: bytes, index: int, value: bool) -> bytes:
    """Return a new bitset with bit[index] set/cleared."""
    if index < 0:
        return bitset

    byte_index = index // 8
    bit_offset = index % 8

    ba = bytearray(bitset)
    if byte_index >= len(ba):
        ba.extend(b"\x00" * (byte_index + 1 - len(ba)))

    mask = 1 << bit_offset
    if value:
        ba[byte_index] |= mask
    else:
        ba[byte_index] &= ~mask

    return bytes(ba)
