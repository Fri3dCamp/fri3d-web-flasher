export interface Firmware {
  filename: string;
  flashArgs: string;
  partitions: {
    address: number;
    name: string;
    data: Uint8Array;
    progress: number;
  }[];
}
