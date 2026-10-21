/**
 * What this technician network services — and nothing else. Every picker,
 * filter and parts list in the app is built from these tables, so a brand or
 * appliance that is not here cannot turn up anywhere on screen.
 */

export const BRANDS = ['samsung', 'lg', 'bosch', 'ifb'] as const
export type Brand = (typeof BRANDS)[number]

export const BRAND_LABEL: Record<Brand, string> = {
  samsung: 'Samsung',
  lg: 'LG',
  bosch: 'Bosch',
  ifb: 'IFB',
}

export const APPLIANCES = ['washer', 'fridge', 'oven', 'ac', 'geyser'] as const
export type Appliance = (typeof APPLIANCES)[number]

export const APPLIANCE_LABEL: Record<Appliance, string> = {
  washer: 'Washing Machine',
  fridge: 'Refrigerator',
  oven: 'Oven',
  ac: 'AC',
  geyser: 'Geyser',
}

/** Visit + labour, before parts. Applied when a bill is first opened. */
export const LABOUR_RATE: Record<Appliance, number> = {
  washer: 549,
  fridge: 649,
  oven: 499,
  ac: 699,
  geyser: 449,
}

export const FAULT_CATEGORIES: Record<Appliance, string[]> = {
  washer: ['Drainage', 'Motor / drive', 'Water inlet', 'Electrical / PCB', 'Mechanical / drum', 'Leakage'],
  fridge: ['Cooling / gas', 'Compressor', 'Defrost system', 'Electrical / PCB', 'Door / gasket', 'Leakage'],
  oven: ['Heating', 'Thermostat / sensor', 'Fan / convection', 'Electrical / PCB', 'Door / seal'],
  ac: ['Cooling / gas', 'Airflow / fan', 'Drainage', 'Electrical / PCB', 'Compressor', 'Installation'],
  geyser: ['Heating element', 'Thermostat', 'Leakage', 'Electrical / tripping', 'Valve / pressure'],
}

export interface CatalogPart {
  sku: string
  name: string
  price: number
  /** In the van right now. False means it ships from the hub. */
  inVan: boolean
}

export const PARTS: Record<Appliance, CatalogPart[]> = {
  washer: [
    { sku: 'WM-DP01', name: 'Drain pump motor', price: 1450, inVan: true },
    { sku: 'WM-IV02', name: 'Water inlet valve (dual)', price: 650, inVan: true },
    { sku: 'WM-DB03', name: 'Drive belt', price: 450, inVan: true },
    { sku: 'WM-DL04', name: 'Door lock / interlock', price: 890, inVan: true },
    { sku: 'WM-BK05', name: 'Drum bearing & seal kit', price: 1650, inVan: false },
    { sku: 'WM-PC06', name: 'Main control PCB', price: 4200, inVan: false },
    { sku: 'WM-DH07', name: 'Drain hose (1.5 m)', price: 280, inVan: true },
    { sku: 'WM-SA08', name: 'Shock absorber (pair)', price: 780, inVan: true },
  ],
  fridge: [
    { sku: 'RF-TH01', name: 'Thermostat', price: 650, inVan: true },
    { sku: 'RF-DT02', name: 'Defrost timer', price: 550, inVan: true },
    { sku: 'RF-DH03', name: 'Defrost heater', price: 720, inVan: true },
    { sku: 'RF-RL04', name: 'Compressor relay & OLP', price: 480, inVan: true },
    { sku: 'RF-GS05', name: 'Refrigerant R600a recharge', price: 1800, inVan: true },
    { sku: 'RF-GK06', name: 'Door gasket', price: 1250, inVan: false },
    { sku: 'RF-FM07', name: 'Evaporator fan motor', price: 1100, inVan: true },
    { sku: 'RF-PC08', name: 'Inverter PCB', price: 4800, inVan: false },
  ],
  oven: [
    { sku: 'OV-HT01', name: 'Top heating element', price: 1350, inVan: true },
    { sku: 'OV-HB02', name: 'Bottom heating element', price: 1250, inVan: false },
    { sku: 'OV-TS03', name: 'Oven thermostat', price: 850, inVan: true },
    { sku: 'OV-FM04', name: 'Convection fan motor', price: 1200, inVan: true },
    { sku: 'OV-DS05', name: 'Door seal', price: 600, inVan: true },
    { sku: 'OV-TF06', name: 'Thermal fuse', price: 300, inVan: true },
    { sku: 'OV-PC07', name: 'Control PCB', price: 3900, inVan: false },
  ],
  ac: [
    { sku: 'AC-CP01', name: 'Run capacitor (35+5 µF)', price: 450, inVan: true },
    { sku: 'AC-GS02', name: 'Refrigerant R32 top-up', price: 2200, inVan: true },
    { sku: 'AC-FM03', name: 'Indoor blower motor', price: 2400, inVan: false },
    { sku: 'AC-OF04', name: 'Outdoor fan motor', price: 2100, inVan: false },
    { sku: 'AC-PC05', name: 'Indoor PCB', price: 4500, inVan: false },
    { sku: 'AC-TH06', name: 'Thermistor sensor', price: 380, inVan: true },
    { sku: 'AC-CN07', name: 'Contactor', price: 550, inVan: true },
    { sku: 'AC-DP08', name: 'Drain pipe (3 m)', price: 220, inVan: true },
  ],
  geyser: [
    { sku: 'GY-HE01', name: 'Heating element 2 kW', price: 780, inVan: true },
    { sku: 'GY-TH02', name: 'Thermostat', price: 450, inVan: true },
    { sku: 'GY-SV03', name: 'Safety / pressure valve', price: 350, inVan: true },
    { sku: 'GY-AR04', name: 'Magnesium anode rod', price: 420, inVan: true },
    { sku: 'GY-TC05', name: 'Thermal cut-out', price: 380, inVan: false },
    { sku: 'GY-CP06', name: 'Connector pipes (pair)', price: 260, inVan: true },
    { sku: 'GY-IL07', name: 'Indicator lamp', price: 120, inVan: true },
  ],
}

export const CONDITIONS = ['Good', 'Fair', 'Poor', 'Not working'] as const
export type Condition = (typeof CONDITIONS)[number]

export function applianceTitle(brand: Brand, appliance: Appliance): string {
  return `${BRAND_LABEL[brand]} ${APPLIANCE_LABEL[appliance]}`
}

export const inr = (n: number) =>
  '₹' + Math.round(n).toLocaleString('en-IN')
