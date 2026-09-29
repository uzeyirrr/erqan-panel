// PocketBase koleksiyonlarının istemci tarafı tipleri (pocketbase/pb_migrations ile birebir).

export type BaseRecord = {
  id: string
  collectionId: string
  collectionName: string
  created: string
  updated: string
}

export type User = BaseRecord & {
  email: string
  name: string
  avatar: string
  verified: boolean
  credit: number
  role: "user" | "admin"
  rent_count: number
  reputation: number
  banned: boolean
  referral_code: string
  referred_by: string
  referral_count: number
}

export type Continent = BaseRecord & { name: string; sort: number; active: boolean }
export type Country = BaseRecord & {
  continent: string
  name: string
  code: string
  flag: string
  sort: number
  active: boolean
}
export type City = BaseRecord & {
  country: string
  name: string
  price_multiplier: number
  image: string
  sort: number
  active: boolean
  expand?: { country?: Country }
}

export type PropertyType = BaseRecord & {
  key: string
  name: string
  description: string
  price: number
  tenant_limit: number
  required_rent_count: number
  build_target: string
  build_cost: number
  color: string
  image: string
  sort: number
  active: boolean
}

export type CityStock = BaseRecord & { city: string; type: string; stock: number }
export type Feature = BaseRecord & { name: string; icon: string; sort: number; active: boolean }

export type Upgrade = BaseRecord & {
  name: string
  description: string
  cost: number
  tenant_limit_bonus: number
  rent_cap_bonus_pct: number
  types: string[]
  max_per_property: number
  sort: number
  active: boolean
}

export type PropertyStatus = "empty" | "rent" | "rented" | "sale" | "building"

export type Property = BaseRecord & {
  owner: string
  type: string
  city: string
  name: string
  description: string
  status: PropertyStatus
  rent_price: number
  sale_price: number
  tenant_limit: number
  tenant_count: number
  rent_cap_bonus_pct: number
  purchase_price: number
  invested: number
  area_m2: number
  rooms: number
  features: string[]
  image: string
  building_to: string
  build_ready_at: string
  expand?: {
    owner?: User
    type?: PropertyType
    city?: City & { expand?: { country?: Country } }
    features?: Feature[]
    building_to?: PropertyType
  }
}

export type PropertyUpgrade = BaseRecord & {
  property: string
  upgrade: string
  paid: number
  expand?: { upgrade?: Upgrade }
}

export type Rental = BaseRecord & {
  property: string
  tenant: string
  owner: string
  price: number
  started: string
  next_charge: string
  grace_until: string
  ended: string
  active: boolean
  cancel_at_period_end: boolean
  warned: boolean
  periods_paid: number
  ended_reason: "" | "cancelled" | "expired" | "insufficient_credit" | "sold" | "admin"
  expand?: { property?: Property; tenant?: User; owner?: User }
}

export type TransactionKind =
  | "purchase"
  | "rent_pay"
  | "rent_income"
  | "sale"
  | "sale_income"
  | "build"
  | "upgrade"
  | "offer_hold"
  | "offer_release"
  | "referral_bonus"
  | "signup_bonus"
  | "commission"
  | "admin_adjust"

export type Transaction = BaseRecord & {
  user: string
  amount: number
  balance_after: number
  kind: TransactionKind
  property: string
  counterparty: string
  note: string
  expand?: { property?: Property; counterparty?: User; user?: User }
}

export type OfferStatus = "pending" | "accepted" | "rejected" | "withdrawn" | "expired"

export type Offer = BaseRecord & {
  property: string
  buyer: string
  seller: string
  amount: number
  message: string
  status: OfferStatus
  expires: string
  expand?: { property?: Property; buyer?: User; seller?: User }
}

export type Notification = BaseRecord & {
  user: string
  kind: string
  title: string
  body: string
  link: string
  read: boolean
}

export type Settings = {
  general: {
    site_name: string
    /** Material 3 renk şemasının ana (seed) rengi, #RRGGBB */
    brand_color: string
    currency: string
    maintenance: boolean
    maintenance_message: string
    registration_open: boolean
    signup_credit: number
  }
  features: {
    buy: boolean
    rent: boolean
    sale: boolean
    offers: boolean
    build: boolean
    upgrades: boolean
    referral: boolean
    public_profiles: boolean
    notifications: boolean
  }
  rent: {
    period_days: number
    auto_renew: boolean
    grace_days: number
    min_price: number
    max_price: number
    commission_pct: number
    max_active_per_user: number
    warn_days_before: number
  }
  sale: {
    commission_pct: number
    min_price: number
    max_price: number
    allow_with_tenants: boolean
  }
  build: {
    only_when_target_out_of_stock: boolean
    build_days: number
  }
  offers: {
    expire_days: number
    min_pct_of_price: number
    max_pending_per_user: number
  }
  referral: {
    inviter_bonus: number
    invitee_bonus: number
    trigger: "signup" | "first_rent" | "first_purchase"
    max_rewards_per_user: number
  }
  reputation: {
    purchase: number
    rent_paid: number
    sale_completed: number
    rent_cancelled: number
  }
  notifications: Record<string, boolean>
}

export type Portfolio = {
  properties: number
  by_status: Record<PropertyStatus, number>
  invested: number
  monthly_rent_income: number
  active_tenants: number
  monthly_rent_expense: number
  active_rentals: number
  months: { month: string; income: number; expense: number }[]
}

export type PublicProfile = {
  user: { id: string; collectionId: string; name: string; avatar: string; reputation: number; created: string }
  stats: { properties: number; for_rent: number; for_sale: number; tenants: number }
  properties: {
    id: string
    name: string
    status: PropertyStatus
    type: string
    city: string
    rent_price: number
    sale_price: number
    image: string
  }[]
}

export type AdminStats = {
  users: number
  banned_users: number
  credit_in_circulation: number
  held_in_offers: number
  commission_revenue: number
  properties: number
  active_rentals: number
  monthly_rent_volume: number
  pending_offers: number
  referred_users: number
  by_status: Record<string, number>
  by_country: { country: string; flag: string; count: number }[]
  by_type: { type: string; sold: number; stock: number }[]
}
