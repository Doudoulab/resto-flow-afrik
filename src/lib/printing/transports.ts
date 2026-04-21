// Universal print transports: WebUSB → WebBluetooth → Local Agent (HTTP)
import { toast } from "sonner";

export type PrinterConfig = {
  id?: string;
  name: string;
  connection_mode: "usb" | "bluetooth" | "agent";
  address?: string | null; // agent URL or BT device id
  open_drawer?: boolean;
  paper_width?: number;
};

const isSecureForHardware = () => location.protocol === "https:" || location.hostname === "localhost";

// ---------- WebUSB ----------
const ESCPOS_USB_FILTERS = [
  { vendorId: 0x04b8 }, // Epson
  { vendorId: 0x0519 }, // Star
  { vendorId: 0x0fe6 }, // ICS Advent
  { vendorId: 0x154f }, // SNBC
  { vendorId: 0x1504 }, // Bixolon
  { vendorId: 0x0416 }, // Winbond
];

export async function printViaUSB(data: Uint8Array): Promise<void> {
  if (!("usb" in navigator)) throw new Error("WebUSB non supporté sur ce navigateur");
  if (!isSecureForHardware()) throw new Error("HTTPS requis pour WebUSB");
  // @ts-ignore
  const device = await navigator.usb.requestDevice({ filters: ESCPOS_USB_FILTERS });
  await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
  const iface = device.configuration!.interfaces[0];
  await device.claimInterface(iface.interfaceNumber);
  const ep = iface.alternates[0].endpoints.find((e: any) => e.direction === "out");
  if (!ep) throw new Error("Endpoint OUT introuvable");
  await device.transferOut(ep.endpointNumber, data);
  await device.close();
}

// ---------- WebBluetooth ----------
// Common ESC/POS BLE service UUIDs (varies by manufacturer)
const BLE_SERVICE = "000018f0-0000-1000-8000-00805f9b34fb";
const BLE_CHAR = "00002af1-0000-1000-8000-00805f9b34fb";

export async function printViaBluetooth(data: Uint8Array): Promise<void> {
  if (!("bluetooth" in navigator)) throw new Error("WebBluetooth non supporté");
  if (!isSecureForHardware()) throw new Error("HTTPS requis pour Bluetooth");
  // @ts-ignore
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [BLE_SERVICE],
  });
  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService(BLE_SERVICE);
  const ch = await service.getCharacteristic(BLE_CHAR);
  // BLE MTU: write in 100-byte chunks
  for (let i = 0; i < data.length; i += 100) {
    await ch.writeValueWithoutResponse(data.slice(i, i + 100));
  }
  device.gatt!.disconnect();
}

// ---------- Local Agent ----------
// Expects an HTTP service running locally that accepts POST /print with raw bytes
export async function printViaAgent(data: Uint8Array, agentUrl: string): Promise<void> {
  const url = agentUrl.replace(/\/$/, "") + "/print";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: data,
  });
  if (!res.ok) throw new Error(`Agent HTTP ${res.status}`);
}

// ---------- Auto-fallback ----------
export async function print(printer: PrinterConfig, data: Uint8Array): Promise<void> {
  const tries: Array<() => Promise<void>> = [];
  if (printer.connection_mode === "usb") tries.push(() => printViaUSB(data));
  else if (printer.connection_mode === "bluetooth") tries.push(() => printViaBluetooth(data));
  else if (printer.connection_mode === "agent" && printer.address) tries.push(() => printViaAgent(data, printer.address!));

  // Auto-fallback chain
  if (printer.connection_mode !== "agent" && printer.address) {
    tries.push(() => printViaAgent(data, printer.address!));
  }

  let lastErr: any;
  for (const t of tries) {
    try { await t(); return; } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("Aucun transport d'impression disponible");
}

export async function openCashDrawer(printer: PrinterConfig) {
  // ESC p 0 25 250  → kick drawer pin 2
  const cmd = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
  try {
    await print(printer, cmd);
    toast.success("Tiroir-caisse ouvert");
  } catch (e: any) {
    toast.error(`Tiroir non ouvert : ${e.message}`);
  }
}