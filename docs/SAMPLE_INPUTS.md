# Sample Inputs & Expected Guidance

These four reference scenarios correspond directly to the quick-select sample buttons shown in the app's empty state. Because live AQI, PM2.5, PM10, and 24-hour forecast slots come dynamically from upstream air quality feeds (WAQI or Open-Meteo) at query time, expected outputs describe the structure and tailored guidance rather than fixed pollutant numbers.

---

## 1. Parent in Delhi

**Inputs to Enter**

- **City**: `Delhi` (or select **Delhi** from the India city suggestions)
- **Household Type**: `Nuclear family`
- **Household Sensitivities**: Check **Children in household** (`hasChildren = true`)
- **Primary Commute**: `Public transit`
- **Home Type**: `Apartment`

**What to Expect**

- **Live AQI Card**: Displays the current numeric AQI on the US scale (`AQI (US scale, as reported by WAQI and Open-Meteo)`), US EPA category badge, station/place name, timestamp, source (`Live WAQI` or `Live Open-Meteo`), PM2.5 and optional PM10 next to WHO 24h guidelines, and any `"above scale"` note if Delhi station readings exceed `500`.
- **Today's Plan & Outdoor Window**: When hourly forecast data is available, shows **Morning**, **Afternoon**, and **Evening** slots alongside the **Best time for outdoor activity** 2-hour window.
- **Urgency Rules**: At AQI `101+` (Unhealthy for Sensitive Groups) or higher, a critical **Stay Indoors / Fitted N95 Mask** alert for children moves to the top of the plan.
- **Tailored Advice**: Parent-focused outdoor play swaps, school-commute timing tied to the cleanest forecast slot, wet-mopping and closed-door HEPA CADR room setup (or DIY box-fan MERV-13 filter), and apartment draft sealing.

---

## 2. Senior in Noida

**Inputs to Enter**

- **City**: `Noida` (pick **Noida, Uttar Pradesh, India** from Indian city search)
- **Household Type**: `Multi-generational`
- **Household Sensitivities**: Check **Older adults in household** (`hasElderly = true`) and optionally **Respiratory sensitivity** (`hasRespiratoryCondition = true`)
- **Primary Commute**: `Private car`
- **Home Type**: `Apartment`

**What to Expect**

- **Urgency Rules**: Triggers the critical **Health Alert** threshold starting at AQI `101+` (`Unhealthy for Sensitive Groups`) specifically naming older adults / respiratory members.
- **Tailored Advice**: Senior cardiovascular and breathing pacing guidance, keeping sleeping rooms warm and filtered without dry sweeping, in-cabin car HVAC recirculation reminders, and afternoon cross-ventilation strictly during lower-PM2.5 hours shown in **Today's plan**.

---

## 3. Working Professional in Mumbai

**Inputs to Enter**

- **City**: `Mumbai` (pick **Mumbai, Maharashtra, India**)
- **Household Type**: `Working professional`
- **Household Sensitivities**: Unchecked unless applicable
- **Primary Commute**: `Public transit` (or `Mixed commute`)
- **Home Type**: `Apartment`

**What to Expect**

- **Urgency Rules**: Triggers the mandatory stay-indoors / N95 critical alert across all households at AQI `151+` (`Unhealthy`), while keeping moderate-level alerts contextual below `151`.
- **Tailored Advice**: Office commute trade-offs (enclosed AC metro/bus vs. open two-wheeler exposure, fitted N95/KF94 mask selection over loose cloth/surgical masks), shifting travel away from morning/evening slots in **Today's plan**, and compact bedroom filtration strategies.

---

## 4. Student in Kolkata

**Inputs to Enter**

- **City**: `Kolkata` (pick **Kolkata, West Bengal, India**)
- **Household Type**: `Student`
- **Household Sensitivities**: Unchecked unless applicable
- **Primary Commute**: `Walking or cycling`
- **Home Type**: `Shared housing`

**What to Expect**

- **Urgency Rules**: Automatically adds active-commute guidance (`Pause Active Outdoor Commuting During Smog Peaks`) and shared-housing corridor draft sealing (`Seal Shared Hallway and Window Drafts`).
- **Tailored Advice**: Aligning college/school commute and outdoor sports or PT practice with the cleaner **Today's plan** slot and best 2-hour outdoor window, moving intense athletic workouts indoors during elevated PM2.5 periods, and budget-friendly room/hostel air protection (wet mopping, weatherstripping, DIY fan filtration).
