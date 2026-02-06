import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer'

export type OrderForSlipPdf = {
  id: string
  delivery_date: string
  room: string | null
  allergies: string | null
  customers: { name: string } | null
}

export type LayerBlockPdf = {
  layerName: string
  layerIconUrl?: string
  items: { text: string; icon_url?: string }[]
}

type SlipData = { order: OrderForSlipPdf; layers: LayerBlockPdf[] }

const SLIPS_PER_PAGE = 3

const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    padding: 18,
    backgroundColor: '#fff',
    fontSize: 9,
  },
  slip: {
    flex: 1,
    padding: 12,
    marginHorizontal: 0,
  },
  cutLine: {
    width: 4,
    borderLeftWidth: 1,
    borderLeftColor: '#999',
    borderStyle: 'dashed',
    alignSelf: 'stretch',
  },
  slipWrapper: {
    flex: 1,
    minWidth: 0,
  },
  emptySlip: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#fafafa',
  },
  header: {
    backgroundColor: '#f8f8fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 10,
    marginBottom: 10,
  },
  name: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  row: {
    fontSize: 10,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginTop: 8,
    marginBottom: 2,
  },
  sectionText: {
    fontSize: 9,
    marginBottom: 6,
    lineHeight: 1.3,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemsRow: {
    flexDirection: 'row',
    flexWrap: true,
    alignItems: 'center',
    gap: 2,
  },
  itemInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconSmall: {
    width: 10,
    height: 10,
  },
  iconTiny: {
    width: 8,
    height: 8,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginVertical: 6,
  },
})

function SlipCard({
  order,
  layers,
  formatDate,
}: {
  order: OrderForSlipPdf
  layers: LayerBlockPdf[]
  formatDate: (date: string) => string
}) {
  return (
    <View style={styles.slip}>
      <View style={styles.header}>
        <Text style={styles.name}>{(order.customers?.name ?? '?').slice(0, 28)}</Text>
        <Text style={styles.row}>Datum: {formatDate(order.delivery_date)}</Text>
        <Text style={styles.row}>
          Klasse / Raum: {(order.room ?? '—').trim() || '—'}
        </Text>
        <Text style={styles.row}>
          Allergien: {order.allergies?.trim() || '—'}
        </Text>
      </View>
      {layers.map(({ layerName, layerIconUrl, items }) => (
        <View key={layerName}>
          <View style={styles.sectionTitleRow}>
            {layerIconUrl ? (
              <Image src={layerIconUrl} style={styles.iconSmall} />
            ) : null}
            <Text style={styles.sectionTitle}>{layerName}</Text>
          </View>
          <View style={[styles.sectionText, styles.itemsRow]}>
            {items.length
              ? items.map((item, idx) => (
                  <View key={idx} style={styles.itemInline}>
                    {item.icon_url ? (
                      <Image src={item.icon_url} style={styles.iconTiny} />
                    ) : null}
                    <Text>
                      {item.text}
                      {idx < items.length - 1 ? ', ' : ''}
                    </Text>
                  </View>
                ))
              : <Text>—</Text>}
          </View>
          <View style={styles.divider} />
        </View>
      ))}
    </View>
  )
}

export function OrderSlipsDocument({
  slipsData,
  formatDate,
}: {
  slipsData: SlipData[]
  formatDate: (date: string) => string
}) {
  const pages: SlipData[][] = []
  for (let i = 0; i < slipsData.length; i += SLIPS_PER_PAGE) {
    pages.push(slipsData.slice(i, i + SLIPS_PER_PAGE))
  }

  return (
    <Document>
      {pages.map((pageSlips, pageIndex) => {
        const a = pageSlips[0]
        const b = pageSlips[1]
        const c = pageSlips[2]
        return (
          <Page
            key={pageIndex}
            size="A4"
            orientation="landscape"
            style={styles.page}
          >
            <View style={{ flexDirection: 'row', flex: 1 }}>
              <View style={styles.slipWrapper}>
                {a ? (
                  <SlipCard
                    order={a.order}
                    layers={a.layers}
                    formatDate={formatDate}
                  />
                ) : (
                  <View style={styles.emptySlip} />
                )}
              </View>
              <View style={styles.cutLine} />
              <View style={styles.slipWrapper}>
                {b ? (
                  <SlipCard
                    order={b.order}
                    layers={b.layers}
                    formatDate={formatDate}
                  />
                ) : (
                  <View style={styles.emptySlip} />
                )}
              </View>
              <View style={styles.cutLine} />
              <View style={styles.slipWrapper}>
                {c ? (
                  <SlipCard
                    order={c.order}
                    layers={c.layers}
                    formatDate={formatDate}
                  />
                ) : (
                  <View style={styles.emptySlip} />
                )}
              </View>
            </View>
          </Page>
        )
      })}
    </Document>
  )
}

export async function renderOrderSlipsPdf(
  slipsData: SlipData[],
  formatDate: (date: string) => string
): Promise<Blob> {
  const doc = (
    <OrderSlipsDocument slipsData={slipsData} formatDate={formatDate} />
  )
  return pdf(doc).toBlob()
}
