import fetch from "node-fetch"
import { prisma } from "@avuny/db"

const API_BASE =
  "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/"

async function fetchData(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}.json`)
  return response.json()
}

async function main() {
  console.log("🌍 Seeding started...")

  // 1️⃣ Seed Regions
  const regions = await fetchData("regions")
  await prisma.region.createMany({
    data: regions.map(({ name, translations, wikiDataId }) => ({
      name,
      translations,
      wikiDataId,
    })),
    skipDuplicates: true,
  })

  const regionMap = new Map(
    (await prisma.region.findMany()).map((r) => [r.name, r.id])
  )

  // 2️⃣ Seed Subregions
  const subregions = await fetchData("subregions")
  const subregionData = subregions
    .map(({ name, translations, wikiDataId, region }) => {
      const regionId = regionMap.get(region)
      return regionId ? { name, translations, wikiDataId, regionId } : null
    })
    .filter(Boolean)

  await prisma.subregion.createMany({
    data: subregionData,
    skipDuplicates: true,
  })

  const subregionMap = new Map(
    (await prisma.subregion.findMany()).map((sr) => [sr.name, sr.id])
  )

  // 3️⃣ Seed Currencies
  const countriesForCurrency = await fetchData("countries")

  const uniqueCurrencies = Array.from(
    new Map(
      countriesForCurrency
        .filter((c) => c.currency && c.currency_name)
        .map((c) => [
          c.currency,
          {
            code: c.currency,
            name: c.currency_name,
            symbol: c.currency_symbol,
          },
        ])
    ).values()
  )

  await prisma.currency.createMany({
    data: uniqueCurrencies,
    skipDuplicates: true,
  })

  const currencyMap = new Map(
    (await prisma.currency.findMany()).map((cur) => [cur.code, cur.id])
  )

  // 4️⃣ Seed Phone Codes
  const uniquePhoneCodes = Array.from(
    new Set(countriesForCurrency.map((c) => c.phone_code).filter(Boolean))
  ).map((code) => ({ code }))

  await prisma.phoneCode.createMany({
    data: uniquePhoneCodes,
    skipDuplicates: true,
  })

  const phoneCodeMap = new Map(
    (await prisma.phoneCode.findMany()).map((p) => [p.code, p.id])
  )

  // 5️⃣ Seed Time Zones
  const uniqueTimeZones = Array.from(
    new Set(
      countriesForCurrency.flatMap((c) =>
        Array.isArray(c.timezones) ? c.timezones.map((t) => t.zoneName) : []
      )
    )
  )
    .filter(Boolean)
    .map((name) => ({ name }))

  await prisma.timeZone.createMany({
    data: uniqueTimeZones,
    skipDuplicates: true,
  })

  const timeZoneMap = new Map(
    (await prisma.timeZone.findMany()).map((t) => [t.name, t.id])
  )

  // 6️⃣ Seed Countries
  const countries = countriesForCurrency
  const countryData = countries.map((country) => ({
    name: country.name,
    iso3: country.iso3,
    iso2: country.iso2,
    numericCode: country.numeric_code,
    capital: country.capital,
    tld: country.tld,
    native: country.native,
    latitude: country.latitude,
    longitude: country.longitude,
    emoji: country.emoji,
    emojiU: country.emojiU,
    wikiDataId: country.wikiDataId,
    regionId: regionMap.get(country.region) || null,
    subregionId: subregionMap.get(country.subregion) || null,
    currencyId: currencyMap.get(country.currency) || null,
    phoneCodeId: phoneCodeMap.get(country.phone_code) || null,
  }))

  await prisma.country.createMany({ data: countryData, skipDuplicates: true })

  const countryMap = new Map(
    (await prisma.country.findMany()).map((c) => [c.iso2, c.id])
  )

  // 7️⃣ Link Time Zones to Countries
  for (const country of countries) {
    const countryId = countryMap.get(country.iso2)
    if (!countryId) continue

    const tzList = Array.isArray(country.timezones)
      ? country.timezones.map((t) => t.zoneName)
      : []

    const timeZoneIds = tzList
      .map((tzName) => timeZoneMap.get(tzName))
      .filter(Boolean)

    for (const tzId of timeZoneIds) {
      await prisma.$executeRaw`
    INSERT INTO "_CountryTimeZones" ("A", "B")
    VALUES (${countryId}, ${tzId})
    ON CONFLICT DO NOTHING
  `
    }
  }

  // 8️⃣ Seed Translations
  const translationData = countries
    .filter((c) => c.translations && typeof c.translations === "object")
    .flatMap((c) =>
      Object.entries(c.translations).map(([lang, value]) => ({
        language: lang,
        value,
        countryId: countryMap.get(c.iso2) || null,
      }))
    )
    .filter((t) => t.countryId)

  await prisma.translation.createMany({
    data: translationData,
    skipDuplicates: true,
  })

  // 9️⃣ Seed States
  const states = await fetchData("states")
  const stateData = states
    .map(
      ({
        name,
        country_code,
        fips_code,
        iso2,
        type,
        latitude,
        longitude,
        wikiDataId,
        native,
      }) => {
        const countryId = countryMap.get(country_code)
        return countryId
          ? {
              name,
              fipsCode: fips_code,
              iso2,
              type,
              latitude,
              longitude,
              wikiDataId,
              countryId,
              native,
            }
          : null
      }
    )
    .filter(Boolean)

  await prisma.state.createMany({ data: stateData, skipDuplicates: true })

  const stateMap = new Map(
    (await prisma.state.findMany()).map((s) => [
      `${s.name}-${s.countryId}`,
      s.id,
    ])
  )

  // 🔟 Seed Cities
  // const cities = await fetchData("cities");
  // const cityData = cities
  //   .map(
  //     ({
  //       name,
  //       state_name,
  //       country_code,
  //       state_code,
  //       latitude,
  //       longitude,
  //       wikiDataId,
  //     }) => {
  //       const countryId = countryMap.get(country_code);
  //       const stateId = stateMap.get(`${state_name}-${countryId}`);
  //       return stateId && countryId
  //         ? {
  //             name,
  //             stateCode: state_code,
  //             countryCode: country_code,
  //             latitude,
  //             longitude,
  //             wikiDataId,
  //             stateId,
  //             countryId,
  //           }
  //         : null;
  //     }
  //   )
  //   .filter(Boolean);

  // await prisma.city.createMany({ data: cityData, skipDuplicates: true });

  console.log("✅ Seeding completed successfully!")
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
