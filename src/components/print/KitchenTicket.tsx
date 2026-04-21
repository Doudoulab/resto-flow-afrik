import { formatFCFA } from "@/lib/currency";

interface Props {
  orderNumber: number;
  tableNumber: string | null;
  notes: string | null;
  items: { name_snapshot: string; quantity: number }[];
  createdAt: string;
  stationName?: string | null;
  stationColor?: string | null;
}

export const KitchenTicket = ({ orderNumber, tableNumber, notes, items, createdAt, stationName, stationColor }: Props) => {
  const time = new Date(createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="ticket-print">
      <div style={{ textAlign: "center", borderBottom: "1px dashed #000", paddingBottom: "4px", marginBottom: "8px" }}>
        <div style={{ fontWeight: "bold", fontSize: "16px" }}>
          *** {stationName ? stationName.toUpperCase() : "CUISINE"} ***
        </div>
        {stationColor && (
          <div style={{ height: "4px", background: stationColor, margin: "2px 0" }} />
        )}
        <div style={{ fontSize: "20px", fontWeight: "bold", margin: "4px 0" }}>#{orderNumber}</div>
        {tableNumber && <div style={{ fontSize: "14px" }}>TABLE {tableNumber}</div>}
        <div style={{ fontSize: "11px" }}>{time}</div>
      </div>
      <div>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", fontSize: "14px" }}>
            <span style={{ fontWeight: "bold" }}>{it.quantity}x</span>
            <span style={{ flex: 1, marginLeft: "8px" }}>{it.name_snapshot}</span>
          </div>
        ))}
      </div>
      {notes && (
        <div style={{ borderTop: "1px dashed #000", marginTop: "8px", paddingTop: "4px", fontSize: "11px" }}>
          <strong>Note :</strong> {notes}
        </div>
      )}
      <div style={{ textAlign: "center", marginTop: "12px", fontSize: "10px" }}>--- Fin ---</div>
    </div>
  );
};

interface ReceiptProps {
  orderNumber: number;
  tableNumber: string | null;
  items: { name_snapshot: string; quantity: number; unit_price: number }[];
  total: number;
  restaurantName: string;
  restaurantAddress: string | null;
  restaurantPhone: string | null;
  createdAt: string;
}

export const CustomerReceipt = ({
  orderNumber, tableNumber, items, total, restaurantName,
  restaurantAddress, restaurantPhone, createdAt,
}: ReceiptProps) => {
  const dt = new Date(createdAt).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  return (
    <div className="ticket-print">
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <div style={{ fontWeight: "bold", fontSize: "15px" }}>{restaurantName}</div>
        {restaurantAddress && <div style={{ fontSize: "10px" }}>{restaurantAddress}</div>}
        {restaurantPhone && <div style={{ fontSize: "10px" }}>{restaurantPhone}</div>}
      </div>
      <div style={{ borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "4px 0", marginBottom: "8px", fontSize: "11px" }}>
        <div>Commande : #{orderNumber}</div>
        {tableNumber && <div>Table : {tableNumber}</div>}
        <div>{dt}</div>
      </div>
      <div>
        {items.map((it, i) => (
          <div key={i} style={{ margin: "4px 0", fontSize: "11px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{it.quantity}x {it.name_snapshot}</span>
              <span>{formatFCFA(Number(it.unit_price) * it.quantity)}</span>
            </div>
            <div style={{ fontSize: "10px", color: "#444" }}>
              {formatFCFA(it.unit_price)} / unité
            </div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid #000", marginTop: "8px", paddingTop: "6px", display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "14px" }}>
        <span>TOTAL</span>
        <span>{formatFCFA(total)}</span>
      </div>
      <div style={{ textAlign: "center", marginTop: "12px", fontSize: "10px" }}>
        Merci de votre visite !
      </div>
    </div>
  );
};