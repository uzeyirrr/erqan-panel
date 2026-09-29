"use client"

import { pb } from "./pb"
import type { City, CityStock, Continent, Country, Feature, PropertyType, Upgrade } from "./types"

// Katalog (tipler, konumlar, özellikler, yükseltmeler) nadiren değişir;
// sayfa geçişlerinde tekrar tekrar istenmemesi için kısa süreli önbellek.
const TTL = 60_000
const cache = new Map<string, { at: number; value: Promise<unknown> }>()

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.value as Promise<T>
  const value = fn().catch((err) => {
    cache.delete(key)
    throw err
  })
  cache.set(key, { at: Date.now(), value })
  return value
}

/** Admin bir katalog kaydını değiştirdikten sonra çağırmalı. */
export function invalidateCatalog() {
  cache.clear()
}

export type Catalog = {
  types: PropertyType[]
  continents: Continent[]
  countries: Country[]
  cities: City[]
  features: Feature[]
  upgrades: Upgrade[]
  typeById: Record<string, PropertyType>
  cityById: Record<string, City>
  countryById: Record<string, Country>
  featureById: Record<string, Feature>
}

/** Tüm katalog. `includeInactive` yalnızca admin ekranları içindir. */
export function loadCatalog(includeInactive = false): Promise<Catalog> {
  return cached(`catalog:${includeInactive}`, async () => {
    const active = includeInactive ? undefined : "active = true"
    const [types, continents, countries, cities, features, upgrades] = await Promise.all([
      pb.collection("property_types").getFullList<PropertyType>({ sort: "sort,name", filter: active }),
      pb.collection("continents").getFullList<Continent>({ sort: "sort,name", filter: active }),
      pb.collection("countries").getFullList<Country>({ sort: "sort,name", filter: active }),
      pb.collection("cities").getFullList<City>({ sort: "sort,name", filter: active }),
      pb.collection("features").getFullList<Feature>({ sort: "sort,name", filter: active }),
      pb.collection("upgrades").getFullList<Upgrade>({ sort: "sort,name", filter: active }),
    ])
    const by = <T extends { id: string }>(list: T[]) => Object.fromEntries(list.map((x) => [x.id, x]))
    return {
      types,
      continents,
      countries,
      cities,
      features,
      upgrades,
      typeById: by(types),
      cityById: by(cities),
      countryById: by(countries),
      featureById: by(features),
    }
  })
}

export function loadStock(): Promise<CityStock[]> {
  return pb.collection("city_stock").getFullList<CityStock>()
}

/** "İstanbul, Türkiye 🇹🇷" */
export function cityLabel(cat: Catalog, cityId: string): string {
  const city = cat.cityById[cityId]
  if (!city) return ""
  const country = cat.countryById[city.country]
  return country ? `${city.name}, ${country.name}` : city.name
}

/** Merkezi stok satış fiyatı = tip fiyatı × şehir çarpanı (sunucuyla aynı hesap). */
export function unitPrice(type: PropertyType, city: City): number {
  return Math.round(type.price * city.price_multiplier * 100) / 100
}

/** Mülkler için standart expand. */
export const PROPERTY_EXPAND = "type,city,city.country,owner"
