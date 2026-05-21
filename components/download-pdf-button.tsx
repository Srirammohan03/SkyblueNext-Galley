// components\download-pdf-button.tsx
"use client";

import React from "react";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    color: "#0f172a",
  },

  header: {
    marginBottom: 24,
    paddingBottom: 14,
    borderBottom: "1 solid #cbd5e1",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  brandBlock: {
    flexDirection: "column",
  },

  brandTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },

  brandSub: {
    fontSize: 11,
    color: "#475569",
  },

  statusBadge: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 6,
    textAlign: "center",
  },

  section: {
    marginBottom: 22,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    backgroundColor: "#f1f5f9",
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  infoCard: {
    width: "48%",
    backgroundColor: "#f8fafc",
    border: "1 solid #e2e8f0",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },

  infoLabel: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 4,
    textTransform: "uppercase",
  },

  infoValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
  },

  table: {
    width: "100%",
    border: "1 solid #e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 8,
    paddingRight: 8,
    fontSize: 10,
    fontWeight: "bold",
  },

  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #e2e8f0",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 8,
    paddingRight: 8,
    alignItems: "center",
  },

  colItem: {
    width: "25%",
    paddingRight: 6,
  },

  colVendor: {
    width: "24%",
    paddingRight: 6,
  },

  colQty: {
    width: "5%",
    textAlign: "center",
  },

  colPrice: {
    width: "10%",
    textAlign: "right",
    paddingRight: 6,
  },

  colTotal: {
    width: "10%",
    textAlign: "right",
    paddingRight: 6,
  },

  colNotes: {
    width: "28%",
    textAlign: "left",
  },

  itemName: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 2,
  },

  itemCategory: {
    fontSize: 8,
    color: "#64748b",
  },

  vendorText: {
    fontSize: 9,
    color: "#0f172a",
  },

  notesText: {
    fontSize: 8,
    color: "#475569",
  },

  summaryCard: {
    marginTop: 18,
    border: "1 solid #e2e8f0",
    borderRadius: 10,
    overflow: "hidden",
  },

  summaryHeader: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderBottom: "1 solid #e2e8f0",
    fontSize: 12,
    fontWeight: "bold",
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 12,
    borderBottom: "1 solid #f1f5f9",
    fontSize: 10,
  },

  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 12,
    paddingRight: 12,
    fontSize: 13,
    fontWeight: "bold",
  },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    borderTop: "1 solid #e2e8f0",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    color: "#64748b",
  },
});

function OrderPDF({ order }: any) {
  const vendorTotals = order.items?.reduce((acc: any, item: any) => {
    const key = item.vendorName || item.vendor?.name || "Grocery Catalog";

    const total = Number(item.price || 0) * Number(item.quantity || 0);

    acc[key] = (acc[key] || 0) + total;

    return acc;
  }, {});

  const grandTotal =
    order.items?.reduce((sum: number, item: any) => {
      return sum + Number(item.price || 0) * Number(item.quantity || 0);
    }, 0) || 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandTitle}>SKYBLUE GALLEY</Text>

            <Text style={styles.brandSub}>
              Premium Flight Catering Order Sheet
            </Text>
          </View>

          <View>
            <Text>Date: {new Date(order.date).toLocaleDateString()}</Text>

            <Text style={styles.statusBadge}>{order.status}</Text>
          </View>
        </View>

        {/* FLIGHT DETAILS */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flight Details</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Flight Number</Text>

              <Text style={styles.infoValue}>{order.flightNumber || "-"}</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Tail Number</Text>

              <Text style={styles.infoValue}>{order.tailNumber || "-"}</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Route</Text>

              <Text style={styles.infoValue}>
                {order.departure} → {order.arrival}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Passengers / Crew</Text>

              <Text style={styles.infoValue}>
                {order.paxCount} Pax / {order.crewCount} Crew
              </Text>
            </View>

            {order.pickupLocation && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Pickup Location</Text>

                <Text style={styles.infoValue}>{order.pickupLocation}</Text>
              </View>
            )}

            {order.dietaryNotes && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Dietary Notes</Text>

                <Text style={styles.infoValue}>{order.dietaryNotes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ORDER ITEMS */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flight Items</Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colItem}>Item</Text>

              <Text style={styles.colVendor}>Source</Text>

              <Text style={styles.colQty}>Qty</Text>

              <Text style={styles.colPrice}>Price</Text>

              <Text style={styles.colTotal}>Total</Text>

              <Text style={styles.colNotes}>Notes</Text>
            </View>

            {order.items?.map((item: any, index: number) => {
              const total =
                Number(item.price || 0) * Number(item.quantity || 0);

              const isOnboard = item.name?.includes("(ONBOARD)");
              return (
                <View
                  key={index}
                  style={{
                    ...styles.tableRow,

                    backgroundColor: isOnboard ? "#eff6ff" : "#ffffff",
                  }}
                >
                  <View style={styles.colItem}>
                    <Text
                      style={{
                        ...styles.itemName,

                        color: isOnboard ? "#2563eb" : "#0f172a",
                      }}
                    >
                      {item.name}
                    </Text>

                    <Text style={styles.itemCategory}>
                      {item.category || "General"}
                    </Text>
                  </View>

                  <View style={styles.colVendor}>
                    <Text style={styles.vendorText}>
                      {isOnboard
                        ? "Aircraft Inventory"
                        : item.vendorName ||
                          item.vendor?.name ||
                          "Grocery Catalog"}
                    </Text>
                  </View>

                  <Text style={styles.colQty}>{item.quantity}</Text>

                  <Text style={styles.colPrice}>
                    {Number(item.price || 0).toLocaleString()}
                  </Text>

                  <Text style={styles.colTotal}>{total.toLocaleString()}</Text>

                  <View style={styles.colNotes}>
                    <Text style={styles.notesText}>
                      {isOnboard
                        ? `Onboard • Reusable / Warehouse Allocation`
                        : item.notes || "-"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* SUMMARY */}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryHeader}>Cost Summary</Text>

          {Object.entries(vendorTotals || {}).map(
            ([vendorName, total]: any) => (
              <View key={vendorName} style={styles.summaryRow}>
                <Text>{vendorName}</Text>

                <Text>
                  Rs.
                  {total.toLocaleString()}
                </Text>
              </View>
            ),
          )}

          <View style={styles.grandTotal}>
            <Text>Grand Total</Text>

            <Text>
              Rs.
              {grandTotal.toLocaleString()}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default function DownloadPDFButton({ order }: any) {
  return (
    <PDFDownloadLink
      document={<OrderPDF order={order} />}
      fileName={`flight-order-${order.flightNumber}.pdf`}
      className="
        inline-flex
        items-center
        justify-center
        rounded-2xl
        bg-blue-600
        px-5
        py-2.5
        text-sm
        font-semibold
        text-white
        transition-colors
        hover:bg-blue-700
      "
    >
      {({ loading }) => (loading ? "Generating PDF..." : "Download PDF")}
    </PDFDownloadLink>
  );
}
