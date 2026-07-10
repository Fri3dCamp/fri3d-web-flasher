// A single full-image firmware binary, flashed at address 0x0.
export interface Firmware {
  filename: string;
  data: Uint8Array;
}
