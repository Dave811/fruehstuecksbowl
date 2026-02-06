import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer'

export type ShoppingListLine = {
  count: number
  portion: number
  unit: string
  name: string
  packages: number | null
  pkgLabel: string | null
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#fff',
    fontSize: 11,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  date: {
    fontSize: 11,
    marginBottom: 24,
    color: '#444',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginRight: 12,
  },
  itemText: {
    flex: 1,
  },
  itemBold: {
    fontFamily: 'Helvetica-Bold',
  },
})

export function ShoppingListDocument({
  lines,
  deliveryDate,
  formatDate,
  title = 'Einkaufsliste',
}: {
  lines: ShoppingListLine[]
  deliveryDate: string
  formatDate: (date: string) => string
  title?: string
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.date}>Lieferdatum: {formatDate(deliveryDate)}</Text>
        {lines.map((line, idx) => (
          <View key={idx} style={styles.listItem}>
            <View style={styles.checkbox} />
            <Text style={styles.itemText}>
              {line.count}× {line.portion}{line.unit} {line.name}
              {line.packages != null && line.pkgLabel && (
                <>
                  {' → '}
                  <Text style={styles.itemBold}>
                    {line.packages}× {line.pkgLabel}
                  </Text>
                </>
              )}
            </Text>
          </View>
        ))}
      </Page>
    </Document>
  )
}

export async function renderShoppingListPdf(
  lines: ShoppingListLine[],
  deliveryDate: string,
  formatDate: (date: string) => string,
  title?: string
): Promise<Blob> {
  const doc = (
    <ShoppingListDocument
      lines={lines}
      deliveryDate={deliveryDate}
      formatDate={formatDate}
      title={title}
    />
  )
  return pdf(doc).toBlob()
}
