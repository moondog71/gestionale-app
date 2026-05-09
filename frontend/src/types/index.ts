export interface Client {
  id: string
  type: 'privato' | 'azienda'
  name: string
  fiscalCode?: string
  vatNumber?: string
  sdi?: string
  pec?: string
  address?: string
  city?: string
  zip?: string
  province?: string
  phone?: string
  email?: string
  notes?: string
  createdAt: string
}

export interface DocItem {
  description: string
  qty: number
  unitPrice: number
}

export interface Preventivo {
  id: string; number: string; year: number; sequence: number
  clientId: string; client?: Client
  date: string; expiryDate?: string; status: string
  items: DocItem[]; notes?: string
  stampDuty: boolean; totalAmount: number
  driveUrl?: string; createdAt: string
}

export interface Intervento {
  id: string; number: string; year: number; sequence: number
  clientId: string; client?: Client
  preventivoId?: string
  date: string; addressOverride?: string
  applianceType: string; brand?: string; model?: string; serial?: string
  workType: string; description?: string
  parts: DocItem[]; laborHours?: number; laborRate?: number
  totalAmount: number; stampDuty: boolean; outcome: string; notes?: string
  driveUrl?: string; createdAt: string
}

export interface DDT {
  id: string; number: string; year: number; sequence: number
  clientId: string; client?: Client
  date: string; reason: string
  items: { description: string; qty: number; unit: string }[]
  carrier?: string; notes?: string; driveUrl?: string; createdAt: string
}

export interface Fattura {
  id: string; number: string; year: number; sequence: number
  clientId: string; client?: Client
  preventivoId?: string; interventoId?: string
  date: string; dueDate?: string
  items: DocItem[]; paymentMethod: string; status: string
  stampDuty: boolean; totalAmount: number
  driveUrl?: string; xmlUrl?: string; paidAt?: string; notes?: string; createdAt: string
}

export interface Scontrino {
  id: string; date: string; amount: number
  paymentType: string; clientId?: string; interventoId?: string
  driveFileId: string; driveUrl: string; filename: string
  notes?: string; createdAt: string
}

export interface Settings { [key: string]: string }
