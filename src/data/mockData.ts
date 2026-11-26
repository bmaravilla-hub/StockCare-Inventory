import type {
  Batch,
  DemoAccount,
  EntryRecord,
  ExitRecord,
  MovementRecord,
  Product,
  SystemSettings,
} from '../types';

export const PRODUCT_CATEGORIES = [
  'Analgésicos',
  'Antibióticos',
  'Antiinflamatorios',
  'Antihipertensivos',
  'Antihistamínicos',
  'Antigripales',
  'Gastrointestinales',
  'Hidratación',
  'Respiratorios',
  'Antisépticos e Insumos',
  'Insumos Médicos',
];

export const COMMON_PROVIDERS = [
  'Droguería Central S.A.',
  'Laboratorios Medix',
  'Distribuidora Farmacéutica del Sur',
  'Droguería Santa Lucía',
  'FarmaLogística Nacional',
];

export const EXIT_REASONS = [
  'Venta',
  'Descarte por vencimiento',
  'Uso interno',
  'Devolución a proveedor',
  'Ajuste de inventario',
] as const;

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    fullName: 'Lic. Rebeca Marcela Orozco',
    email: 'rebeca.orozco@stockcare.edu.sv',
    role: 'ADMIN',
    roleLabel: 'Administrador',
    branch: 'Sucursal Central - Ciudadela Don Bosco',
    description:
      'Consulta inventario, movimientos, alertas, genera reportes y gestiona información general del sistema.',
  },
  {
    id: 'usr-bodega',
    username: 'bodega',
    fullName: 'Br. Alexis Ernesto Hernández',
    email: 'alexis.hernandez@stockcare.edu.sv',
    role: 'BODEGA',
    roleLabel: 'Encargado de Bodega / Dependiente',
    branch: 'Sucursal Central - Ciudadela Don Bosco',
    description:
      'Registra productos, entradas, salidas, lotes, fechas de vencimiento y consulta existencias y movimientos.',
  },
];

export const INITIAL_SETTINGS: SystemSettings = {
  pharmacyName: 'Farmacia StockCare',
  branchName: 'Sucursal Central - Ciudadela Don Bosco',
  branchAddress: 'Calle Plan del Pino km 1.5, Soyapango, San Salvador',
  phone: '+503 2251-8200',
  expiryAlertDays: 60,
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-01',
    code: 'MED-001',
    name: 'Paracetamol 500 mg',
    category: 'Analgésicos',
    presentation: 'Caja x 20 tabletas',
    minStock: 30,
    status: 'Activo',
    description: 'Analgésico y antipirético de uso general para control de fiebre y dolor leve a moderado.',
    createdAt: '2026-05-10T09:00:00',
    updatedAt: '2026-10-28T14:20:00',
  },
  {
    id: 'prod-02',
    code: 'MED-002',
    name: 'Amoxicilina 500 mg',
    category: 'Antibióticos',
    presentation: 'Caja x 12 cápsulas',
    minStock: 25,
    status: 'Activo',
    description: 'Antibiótico de amplio espectro perteneciente al grupo de las penicilinas.',
    createdAt: '2026-05-10T09:15:00',
    updatedAt: '2026-10-28T14:25:00',
  },
  {
    id: 'prod-03',
    code: 'MED-003',
    name: 'Ibuprofeno 400 mg',
    category: 'Antiinflamatorios',
    presentation: 'Blíster x 10 tabletas',
    minStock: 20,
    status: 'Activo',
    description: 'Antiinflamatorio no esteroideo (AINE) indicado para dolor e inflamación.',
    createdAt: '2026-05-12T10:00:00',
    updatedAt: '2026-09-20T11:30:00',
  },
  {
    id: 'prod-04',
    code: 'MED-004',
    name: 'Omeprazol 20 mg',
    category: 'Gastrointestinales',
    presentation: 'Caja x 14 cápsulas',
    minStock: 20,
    status: 'Activo',
    description: 'Inhibidor de la bomba de protones para tratamiento gástrico.',
    createdAt: '2026-06-01T08:40:00',
    updatedAt: '2026-10-28T14:30:00',
  },
  {
    id: 'prod-05',
    code: 'MED-005',
    name: 'Loratadina 10 mg',
    category: 'Antihistamínicos',
    presentation: 'Caja x 10 tabletas',
    minStock: 15,
    status: 'Activo',
    description: 'Antihistamínico de segunda generación para alivio de síntomas alérgicos.',
    createdAt: '2026-06-05T11:10:00',
    updatedAt: '2026-10-28T14:35:00',
  },
  {
    id: 'prod-06',
    code: 'MED-006',
    name: 'Losartán Potásico 50 mg',
    category: 'Antihipertensivos',
    presentation: 'Caja x 30 tabletas',
    minStock: 25,
    status: 'Activo',
    description: 'Antagonista de los receptores de angiotensina II para control arterial.',
    createdAt: '2026-06-08T13:00:00',
    updatedAt: '2026-09-20T11:45:00',
  },
  {
    id: 'prod-07',
    code: 'MED-007',
    name: 'Salbutamol Inhalador 100 mcg',
    category: 'Respiratorios',
    presentation: 'Frasco inhalador x 200 dosis',
    minStock: 12,
    status: 'Activo',
    description: 'Broncodilatador de acción corta para alivio de broncoespasmo.',
    createdAt: '2026-06-10T15:20:00',
    updatedAt: '2026-09-20T11:50:00',
  },
  {
    id: 'prod-08',
    code: 'MED-008',
    name: 'Azitromicina 500 mg',
    category: 'Antibióticos',
    presentation: 'Caja x 3 tabletas',
    minStock: 15,
    status: 'Activo',
    description: 'Antibiótico macrólido de dosis diaria en presentaciones de ciclo corto.',
    createdAt: '2026-07-02T09:30:00',
    updatedAt: '2026-10-12T10:10:00',
  },
  {
    id: 'prod-09',
    code: 'MED-009',
    name: 'Dextrometorfano Jarabe 15 mg/5 ml',
    category: 'Antigripales',
    presentation: 'Frasco 120 ml',
    minStock: 10,
    status: 'Activo',
    description: 'Antitusivo oral en solución líquida.',
    createdAt: '2026-06-14T08:30:00',
    updatedAt: '2026-10-28T14:40:00',
  },
  {
    id: 'prod-10',
    code: 'MED-010',
    name: 'Suero Oral Pediátrico Fresa',
    category: 'Hidratación',
    presentation: 'Frasco 500 ml',
    minStock: 20,
    status: 'Activo',
    description: 'Solución de rehidratación oral balanceada con electrolitos.',
    createdAt: '2026-07-18T10:00:00',
    updatedAt: '2026-10-12T10:15:00',
  },
  {
    id: 'prod-11',
    code: 'INS-001',
    name: 'Alcohol Etílico 70%',
    category: 'Antisépticos e Insumos',
    presentation: 'Frasco 250 ml',
    minStock: 20,
    status: 'Activo',
    description: 'Antiséptico tópico y desinfectante de uso clínico y general.',
    createdAt: '2026-07-20T16:00:00',
    updatedAt: '2026-10-28T14:45:00',
  },
  {
    id: 'prod-12',
    code: 'INS-002',
    name: 'Guantes de Nitrilo Talla M',
    category: 'Insumos Médicos',
    presentation: 'Caja x 100 unidades',
    minStock: 10,
    status: 'Activo',
    description: 'Guantes descartables libres de látex para examinación.',
    createdAt: '2026-08-01T09:00:00',
    updatedAt: '2026-10-12T10:20:00',
  },
  {
    id: 'prod-13',
    code: 'MED-011',
    name: 'Complejo B Inyectable',
    category: 'Analgésicos',
    presentation: 'Caja x 3 ampollas',
    minStock: 10,
    status: 'Inactivo',
    description: 'Producto descontinuado temporalmente por cambio de proveedor.',
    createdAt: '2026-05-01T08:00:00',
    updatedAt: '2026-09-01T12:00:00',
  },
];

export const INITIAL_ENTRIES: EntryRecord[] = [
  {
    id: 'ent-001',
    documentNumber: 'FAC-2026-0198',
    provider: 'Droguería Central S.A.',
    date: '2026-06-15',
    notes: 'Recepción verificada contra factura física.',
    registeredBy: 'Br. Alexis Ernesto Hernández',
    createdAt: '2026-06-15T09:30:00',
    items: [
      {
        id: 'ent-001-1',
        productId: 'prod-09',
        quantity: 15,
        batchNumber: 'LOT-DEX-2601',
        expiryDate: '2026-10-18',
      },
      {
        id: 'ent-001-2',
        productId: 'prod-02',
        quantity: 20,
        batchNumber: 'LOT-AMX-2602',
        expiryDate: '2026-10-28',
      },
    ],
  },
  {
    id: 'ent-002',
    documentNumber: 'FAC-2026-0385',
    provider: 'Laboratorios Medix',
    date: '2026-09-20',
    notes: 'Reabastecimiento mensual de analgésicos y crónicos.',
    registeredBy: 'Br. Alexis Ernesto Hernández',
    createdAt: '2026-09-20T11:20:00',
    items: [
      {
        id: 'ent-002-1',
        productId: 'prod-01',
        quantity: 60,
        batchNumber: 'LOT-PAR-2609',
        expiryDate: '2027-05-30',
      },
      {
        id: 'ent-002-2',
        productId: 'prod-03',
        quantity: 55,
        batchNumber: 'LOT-IBU-2609',
        expiryDate: '2027-09-15',
      },
      {
        id: 'ent-002-3',
        productId: 'prod-06',
        quantity: 30,
        batchNumber: 'LOT-LOS-2609',
        expiryDate: '2027-04-20',
      },
      {
        id: 'ent-002-4',
        productId: 'prod-07',
        quantity: 18,
        batchNumber: 'LOT-SAL-2609',
        expiryDate: '2027-06-10',
      },
    ],
  },
  {
    id: 'ent-003',
    documentNumber: 'FAC-2026-0440',
    provider: 'Distribuidora Farmacéutica del Sur',
    date: '2026-10-12',
    notes: 'Pedido prioritario de hidratación, antibióticos e insumos.',
    registeredBy: 'Br. Alexis Ernesto Hernández',
    createdAt: '2026-10-12T10:05:00',
    items: [
      {
        id: 'ent-003-1',
        productId: 'prod-08',
        quantity: 30,
        batchNumber: 'LOT-AZI-2610',
        expiryDate: '2026-12-05',
      },
      {
        id: 'ent-003-2',
        productId: 'prod-10',
        quantity: 35,
        batchNumber: 'LOT-SUE-2610',
        expiryDate: '2026-11-26',
      },
      {
        id: 'ent-003-3',
        productId: 'prod-12',
        quantity: 12,
        batchNumber: 'LOT-GUA-2610',
        expiryDate: '2028-03-01',
      },
    ],
  },
  {
    id: 'ent-004',
    documentNumber: 'FAC-2026-0512',
    provider: 'Laboratorios Medix',
    date: '2026-10-28',
    notes: 'Ingreso de nuevos lotes para cobertura de cierre de año.',
    registeredBy: 'Br. Alexis Ernesto Hernández',
    createdAt: '2026-10-28T14:15:00',
    items: [
      {
        id: 'ent-004-1',
        productId: 'prod-01',
        quantity: 50,
        batchNumber: 'LOT-PAR-2610',
        expiryDate: '2027-11-30',
      },
      {
        id: 'ent-004-2',
        productId: 'prod-02',
        quantity: 45,
        batchNumber: 'LOT-AMX-2610',
        expiryDate: '2027-10-15',
      },
      {
        id: 'ent-004-3',
        productId: 'prod-04',
        quantity: 48,
        batchNumber: 'LOT-OME-2610',
        expiryDate: '2027-07-20',
      },
      {
        id: 'ent-004-4',
        productId: 'prod-05',
        quantity: 28,
        batchNumber: 'LOT-LOR-2610',
        expiryDate: '2026-12-22',
      },
      {
        id: 'ent-004-5',
        productId: 'prod-09',
        quantity: 18,
        batchNumber: 'LOT-DEX-2610',
        expiryDate: '2027-09-30',
      },
      {
        id: 'ent-004-6',
        productId: 'prod-11',
        quantity: 60,
        batchNumber: 'LOT-ALC-2610',
        expiryDate: '2028-06-30',
      },
    ],
  },
];

export const INITIAL_EXITS: ExitRecord[] = [
  {
    id: 'sal-001',
    productId: 'prod-09',
    batchId: 'lot-ent-001-1',
    batchNumber: 'LOT-DEX-2601',
    quantity: 9,
    reason: 'Venta',
    reference: 'VTA-2026-1041',
    date: '2026-10-05',
    notes: 'Despacho en mostrador.',
    registeredBy: 'Br. Alexis Ernesto Hernández',
    createdAt: '2026-10-05T15:10:00',
  },
  {
    id: 'sal-002',
    productId: 'prod-02',
    batchId: 'lot-ent-001-2',
    batchNumber: 'LOT-AMX-2602',
    quantity: 15,
    reason: 'Venta',
    reference: 'VTA-2026-1042',
    date: '2026-10-05',
    notes: 'Despacho según demanda semanal.',
    registeredBy: 'Br. Alexis Ernesto Hernández',
    createdAt: '2026-10-05T16:40:00',
  },
  {
    id: 'sal-003',
    productId: 'prod-01',
    batchId: 'lot-ent-002-1',
    batchNumber: 'LOT-PAR-2609',
    quantity: 25,
    reason: 'Venta',
    reference: 'VTA-2026-1102',
    date: '2026-10-20',
    registeredBy: 'Br. Alexis Ernesto Hernández',
    createdAt: '2026-10-20T10:30:00',
  },
  {
    id: 'sal-004',
    productId: 'prod-06',
    batchId: 'lot-ent-002-3',
    batchNumber: 'LOT-LOS-2609',
    quantity: 16,
    reason: 'Venta',
    reference: 'VTA-2026-1103',
    date: '2026-10-20',
    registeredBy: 'Br. Alexis Ernesto Hernández',
    createdAt: '2026-10-20T11:15:00',
  },
  {
    id: 'sal-005',
    productId: 'prod-12',
    batchId: 'lot-ent-003-3',
    batchNumber: 'LOT-GUA-2610',
    quantity: 12,
    reason: 'Venta',
    reference: 'VTA-2026-1108',
    date: '2026-10-20',
    notes: 'Entrega completa a clínica asociada.',
    registeredBy: 'Br. Alexis Ernesto Hernández',
    createdAt: '2026-10-20T17:00:00',
  },
  {
    id: 'sal-006',
    productId: 'prod-07',
    batchId: 'lot-ent-002-4',
    batchNumber: 'LOT-SAL-2609',
    quantity: 11,
    reason: 'Venta',
    reference: 'VTA-2026-1210',
    date: '2026-11-04',
    registeredBy: 'Br. Alexis Ernesto Hernández',
    createdAt: '2026-11-04T09:45:00',
  },
  {
    id: 'sal-007',
    productId: 'prod-08',
    batchId: 'lot-ent-003-1',
    batchNumber: 'LOT-AZI-2610',
    quantity: 8,
    reason: 'Venta',
    reference: 'VTA-2026-1211',
    date: '2026-11-04',
    registeredBy: 'Br. Alexis Ernesto Hernández',
    createdAt: '2026-11-04T11:20:00',
  },
  {
    id: 'sal-008',
    productId: 'prod-10',
    batchId: 'lot-ent-003-2',
    batchNumber: 'LOT-SUE-2610',
    quantity: 10,
    reason: 'Venta',
    reference: 'VTA-2026-1214',
    date: '2026-11-04',
    registeredBy: 'Br. Alexis Ernesto Hernández',
    createdAt: '2026-11-04T15:50:00',
  },
  {
    id: 'sal-009',
    productId: 'prod-11',
    batchId: 'lot-ent-004-6',
    batchNumber: 'LOT-ALC-2610',
    quantity: 12,
    reason: 'Uso interno',
    reference: 'INT-2026-0019',
    date: '2026-11-09',
    notes: 'Abastecimiento interno de área de despacho y limpieza.',
    registeredBy: 'Br. Alexis Ernesto Hernández',
    createdAt: '2026-11-09T08:30:00',
  },
  {
    id: 'sal-010',
    productId: 'prod-03',
    batchId: 'lot-ent-002-2',
    batchNumber: 'LOT-IBU-2609',
    quantity: 15,
    reason: 'Venta',
    reference: 'VTA-2026-1265',
    date: '2026-11-09',
    registeredBy: 'Br. Alexis Ernesto Hernández',
    createdAt: '2026-11-09T14:15:00',
  },
  {
    id: 'sal-011',
    productId: 'prod-04',
    batchId: 'lot-ent-004-3',
    batchNumber: 'LOT-OME-2610',
    quantity: 10,
    reason: 'Venta',
    reference: 'VTA-2026-1288',
    date: '2026-11-11',
    registeredBy: 'Br. Alexis Ernesto Hernández',
    createdAt: '2026-11-11T10:15:00',
  },
  {
    id: 'sal-012',
    productId: 'prod-05',
    batchId: 'lot-ent-004-4',
    batchNumber: 'LOT-LOR-2610',
    quantity: 6,
    reason: 'Venta',
    reference: 'VTA-2026-1289',
    date: '2026-11-11',
    registeredBy: 'Br. Alexis Ernesto Hernández',
    createdAt: '2026-11-11T16:40:00',
  },
];

/**
 * Construye lotes y movimientos iniciales reproduciendo cronológicamente
 * las entradas y salidas para garantizar 100% coherencia matemática.
 */
export function buildInitialInventoryState(): {
  batches: Batch[];
  movements: MovementRecord[];
} {
  const batchesMap = new Map<string, Batch>();
  const stockByProduct = new Map<string, number>();

  interface TimelineEvent {
    createdAt: string;
    date: string;
    kind: 'ENTRY' | 'EXIT';
    payload: EntryRecord | ExitRecord;
  }

  const events: TimelineEvent[] = [
    ...INITIAL_ENTRIES.map((e) => ({
      createdAt: e.createdAt,
      date: e.date,
      kind: 'ENTRY' as const,
      payload: e,
    })),
    ...INITIAL_EXITS.map((s) => ({
      createdAt: s.createdAt,
      date: s.date,
      kind: 'EXIT' as const,
      payload: s,
    })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const movements: MovementRecord[] = [];

  for (const event of events) {
    if (event.kind === 'ENTRY') {
      const entry = event.payload as EntryRecord;
      entry.items.forEach((item, idx) => {
        const batchId = `lot-${item.id}`;
        batchesMap.set(batchId, {
          id: batchId,
          productId: item.productId,
          batchNumber: item.batchNumber,
          quantity: item.quantity,
          initialQuantity: item.quantity,
          expiryDate: item.expiryDate,
          entryId: entry.id,
          createdAt: entry.createdAt,
        });

        const nextStock = (stockByProduct.get(item.productId) ?? 0) + item.quantity;
        stockByProduct.set(item.productId, nextStock);

        movements.push({
          id: `mov-${entry.id}-${idx + 1}`,
          date: entry.date,
          createdAt: entry.createdAt,
          productId: item.productId,
          batchNumber: item.batchNumber,
          type: 'Entrada',
          quantity: item.quantity,
          user: entry.registeredBy,
          reference: entry.documentNumber,
          detail: `Recepción de ${entry.provider}`,
          resultingStock: nextStock,
        });
      });
    } else {
      const exit = event.payload as ExitRecord;
      const batch = batchesMap.get(exit.batchId);
      if (batch) {
        batch.quantity = Math.max(0, batch.quantity - exit.quantity);
      }
      const nextStock = Math.max(
        0,
        (stockByProduct.get(exit.productId) ?? 0) - exit.quantity
      );
      stockByProduct.set(exit.productId, nextStock);

      movements.push({
        id: `mov-${exit.id}`,
        date: exit.date,
        createdAt: exit.createdAt,
        productId: exit.productId,
        batchNumber: exit.batchNumber,
        type: 'Salida',
        quantity: exit.quantity,
        user: exit.registeredBy,
        reference: exit.reference,
        detail: exit.reason,
        resultingStock: nextStock,
      });
    }
  }

  return {
    batches: Array.from(batchesMap.values()),
    movements: movements.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

