# Sample Inputs & Expected Guidance

These six reference scenarios correspond directly to the quick-select sample buttons in `SAMPLE_SCENARIOS` (`src/constants/samples.ts`) shown in the app's empty state. Because live AQI, PM2.5, PM10, and 24-hour forecast slots come dynamically from upstream air quality feeds (WAQI or Open-Meteo) at query time, expected outputs describe the structure and tailored guidance rather than fixed pollutant numbers.

---

## 1. Delhi · Parent with children

**Inputs to Enter**

- **City**: `Delhi` (or select **Delhi** from the India-only city suggestions)
- **Household Type**: `Nuclear family`
- **Household Sensitivities**: Check **Children in household** (`hasChildren = true`)
- **Primary Commute**: `Public transit`
- **Home Type**: `Apartment`

**What to Expect**

- **Live AQI Card**: Displays the current numeric AQI on the US scale (`AQI (US scale, as reported by WAQI and Open-Meteo)`), US EPA category badge, distinct `Station` name (when provided), timestamp, source badge (`Live WAQI` or `Live Open-Meteo`), PM2.5 (`WHO 24h: 15.0 ug/m3`) and PM10 (`WHO 24h: 45.0 ug/m3`, or `N/A` if unavailable), and an `"above scale"` badge if Delhi readings exceed `500`.
- **Today's Plan & Outdoor Window**: When hourly forecast data is available, shows **Morning** (`6 AM – 12 PM`), **Afternoon** (`12 PM – 5 PM`), and **Evening** (`5 PM – 10 PM`) slots alongside the **Best time for outdoor activity** 2-hour window.
- **Urgency Rules**: At AQI `101+` (`Unhealthy for Sensitive Groups`) or higher, a critical **Stay Indoors / Fitted N95 Mask** alert naming children moves to the top of the plan, plus apartment cross-ventilation/draft-sealing guidance.
- **Tailored Advice**: Parent-focused indoor play swaps, school-run timing tied to the cleanest forecast slot, wet mopping over dry sweeping, and closed-door HEPA CADR or DIY box-fan MERV-13 room filtration.

---

## 2. Noida · Senior citizen

**Inputs to Enter**

- **City**: `Noida` (pick **Noida, Uttar Pradesh, India** from Indian city search)
- **Household Type**: `Multi-generational`
- **Household Sensitivities**: Check **Older adults in household** (`hasElderly = true`) and **Respiratory sensitivity** (`hasRespiratoryCondition = true`)
- **Primary Commute**: `Private car`
- **Home Type**: `Apartment`

**What to Expect**

- **Urgency Rules**: Triggers the critical **Health Alert** threshold starting at AQI `101+` (`Unhealthy for Sensitive Groups`), explicitly naming people with respiratory sensitivity and older adults.
- **Tailored Advice**: Senior cardiovascular and respiratory pacing, keeping sleeping rooms warm and filtered without dry sweeping, in-cabin car HVAC recirculation reminders, and brief cross-ventilation strictly during cleaner midday hours shown in **Today's plan**.

---

## 3. Mumbai · Working professional

**Inputs to Enter**

- **City**: `Mumbai` (pick **Mumbai, Maharashtra, India**)
- **Household Type**: `Working professional`
- **Household Sensitivities**: Unchecked (`hasChildren = false`, `hasElderly = false`, `hasRespiratoryCondition = false`)
- **Primary Commute**: `Public transit`
- **Home Type**: `Apartment`

**What to Expect**

- **Urgency Rules**: Triggers the mandatory stay-indoors / fitted N95 critical alert across all households starting at AQI `151+` (`Unhealthy`), while adding compact-housing draft sealing and ventilation guidance.
- **Tailored Advice**: Office commute trade-offs (enclosed AC metro/bus vs. open roadside exposure, fitted N95/KF94 mask selection over surgical/cloth masks), shifting travel away from peak slots in **Today's plan**, and bedroom clean-air setup.

---

## 4. Kolkata · Student athlete

**Inputs to Enter**

- **City**: `Kolkata` (pick **Kolkata, West Bengal, India**)
- **Household Type**: `Student`
- **Household Sensitivities**: Unchecked (`hasChildren = false`, `hasElderly = false`, `hasRespiratoryCondition = false`)
- **Primary Commute**: `Walking or cycling`
- **Home Type**: `Shared housing`

**What to Expect**

- **Urgency Rules**: Automatically adds active-commute guidance (`Pause Active Outdoor Commuting During Smog Peaks`) and shared-housing corridor draft sealing (`Seal Shared Hallway and Window Drafts`).
- **Tailored Advice**: Scheduling college commute and outdoor sports or PT practice around the cleaner **Today's plan** slot and best 2-hour outdoor window, moving intense training indoors during elevated PM2.5 periods, and low-cost hostel/shared-room air protection (wet mopping, weatherstripping, DIY fan filtration).

---

## 5. Lucknow · Family with asthma

**Inputs to Enter**

- **City**: `Lucknow` (pick **Lucknow, Uttar Pradesh, India**)
- **Household Type**: `Multi-generational`
- **Household Sensitivities**: Check **Children in household** (`hasChildren = true`), **Older adults in household** (`hasElderly = true`), and **Respiratory sensitivity** (`hasRespiratoryCondition = true`)
- **Primary Commute**: `Private car`
- **Home Type**: `Detached house`

**What to Expect**

- **Urgency Rules**: Triggers the sensitive-household critical **Health Alert** starting at AQI `101+` (`Unhealthy for Sensitive Groups`), naming all three vulnerable groups, alongside default eco-trip carpooling/consolidated errand guidance for detached homes.
- **Tailored Advice**: Multi-generational asthma action planning (rescue medication readiness, fitted N95/KF94 for essential outdoor trips), sealing exterior doors/windows in a detached house, running room-sized HEPA filtration in main bedrooms, and using **Today's plan** to minimize peak-hour exposure.

---

## 6. Hyderabad · Remote household

**Inputs to Enter**

- **City**: `Hyderabad` (pick **Hyderabad, Telangana, India**)
- **Household Type**: `Single adult`
- **Household Sensitivities**: Unchecked (`hasChildren = false`, `hasElderly = false`, `hasRespiratoryCondition = false`)
- **Primary Commute**: `Work / study from home`
- **Home Type**: `Apartment`

**What to Expect**

- **Urgency Rules**: Triggers the universal stay-indoors / N95 critical alert at AQI `151+` (`Unhealthy`) and automatically appends compact apartment draft-sealing and clean-window ventilation rules.
- **Tailored Advice**: Indoor air hygiene during remote workdays (wet mopping, avoiding indoor incense/candles/smoke, sizing HEPA CADR to the study/bedroom with closed doors, treating houseplants strictly as minor support), and timing short errands or walks to the best 2-hour outdoor window.
