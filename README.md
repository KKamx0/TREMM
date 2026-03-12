# TREMM 2.1

**Course:** CSS 360 (Winter 2026)  
**Project:** Travel Planning Discord Bot (Discord Slash Commands)

## Team Members
- Manraj Banga
- Kam Ekwueme
- Tanisha Thakare
- Raya Parsa
- Marco Chan

---

## Overview
TREMM is a Discord bot built for CSS 360 to help users plan trips without leaving the chat. It provides travel tools like weather lookups, activities, restaurants, flights, hotels, rental cars, and full trip planning through Discord slash commands.

TREMM 2.1 expands on the original bot by improving trip planning, adding hotel watchlists and trip-saving features, strengthening validation, improving command guidance, and making the bot more useful for real travel workflows.

---

## What's New in v2.1

### New Commands
- **`/watchlist`** — save hotels you are interested in for later viewing
- **`/help`** — explains how the bot works and gives usage details for each command
- **`/savedtrips`** — view your previously saved trip briefs
- **`/deletetrip`** — delete a saved trip by trip ID
- **`/rentalcars`** — find rental car options for a location

### Enhanced Features
- **`/tripbrief` save option** — users can now choose to save a generated trip brief
- Saved trips are stored in both **`.txt`** and **`.json`** formats for readability and structured reuse
- **`/newhotels`** now supports more specific destinations such as `"Newport Beach"` instead of only broader cities like `"Los Angeles"`
- **`/flights`** now prevents users from entering the same airport for both origin and destination
- **`/flights`** includes clearer validation and error messages
- Added a **Google Flights booking link/button** to flight results
- Enhanced **`/restaurants`** for better discovery and output quality

### Reliability and UX Improvements
- Better validation across commands
- Better error handling and user feedback
- Easier navigation of saved travel data
- Improved command discoverability through `/help`

---

## Commands

## `/help`
Display how the bot works and explain each command.

### Usage
- `/help`

### Output
- Overview of TREMM
- Explanation of available commands
- Inputs, outputs, and limitations for each command

### Notes / Limits
- Intended as an in-app user guide
- Helps new users understand command syntax and expected behavior

---

## `/tripbrief`
Generate a complete trip brief in one command.

### Usage
- `/tripbrief destination:<place> depart:<YYYY-MM-DD> return:<YYYY-MM-DD> adults:<1-9> origin:<IATA> save:<yes|no>`

### Example
- `/tripbrief destination:"Los Angeles, CA" depart:2026-03-10 return:2026-03-14 adults:1 origin:SEA save:yes`

### Output
- Summary (dates, trip length, resolved codes, section status)
- Weather snapshot
- Restaurants
- Activities
- Hotels
- Flights
- Optional save confirmation if the user chooses to save the trip

### Notes / Limits
- Weather is short-term and depends on provider coverage
- Activities, hotels, and flights depend on API availability
- Flights may require an origin IATA code
- Save defaults to **no** unless the user chooses **yes**

---

## `/savedtrips`
Display the user's previously saved trip briefs.

### Usage
- `/savedtrips`

### Output
- A list of trips saved by the current user
- Trip identifiers for each saved trip
- Saved trip summaries for quick review

### Notes / Limits
- Only shows saved trips for the current user
- Does not show trips from the broader community or other users

---

## `/deletetrip`
Delete one of the user's saved trips by trip ID.

### Usage
- `/deletetrip tripid:<ID>`

### Example
- `/deletetrip tripid:1034`

### Output
- Confirmation that the trip was deleted
- Error message if the trip ID does not exist or does not belong to the user

### Notes / Limits
- Only deletes trips belonging to the current user
- Removes the trip from saved trip storage

---

## `/watchlist`
Save hotels you may be interested in for later review.

### Usage
- `/watchlist`

### Output
- Stores selected hotels for later access
- Hotel entries displayed using Discord embeds

### Notes / Limits
- Intended for users comparing hotel options before booking
- Watchlist behavior depends on the hotel results currently available to the user

---

## `/newhotels`
Check hotel availability and pricing with more specific location support.

### Usage
- `/newhotels location:<place> check_in:<YYYY-MM-DD> check_out:<YYYY-MM-DD> adults:<number>`

### Example
- `/newhotels location:"Newport Beach, CA" check_in:2026-03-10 check_out:2026-03-14 adults:2`

### Output
- Hotel results displayed in Discord embeds
- Hotel name
- Rating
- Price
- Lookup or booking information

### Notes / Limits
- Supports more specific destinations, not just broad city names
- Date validation is enforced
- Coverage depends on API support for the requested location

---

## `/restaurants`
Find top restaurants in a location.

### Usage
- `/restaurants location:<place>`

### Example
- `/restaurants location:"Seattle, WA"`

### Output
- Restaurant name
- Category or cuisine
- Address
- Google search link

### Notes / Limits
- Results depend on API coverage
- Enhanced in v2.1 for better usability and output quality

---

## `/weather`
Get current weather and a short-term forecast.

### Usage
- `/weather place:<place>`

### Example
- `/weather place:"Paris, FR"`

### Output
- Current conditions:
  - Temperature
  - Feels-like
  - Wind
  - Humidity
- Short-term daily forecast

### Notes / Limits
- Forecast window is provider-limited

---

## `/plantrip`
Interactive flow to collect trip details in chat.

### Usage
- `/plantrip`

### Output
- Bot prompts the user for:
  1. Destination
  2. Trip dates
- Bot responds with a trip plan summary using the provided details

### Notes / Limits
- Only listens to the user who started the command

---

## `/trip activities`
Find tours and activities for a destination.

### Usage
- `/trip activities destination:<place>`

### Example
- `/trip activities destination:"Bali, Indonesia"`

### Output
- Activity name
- Price (when available)
- Description
- Booking link (when available)

### Notes / Limits
- If the provider returns limited or empty results, fallback suggestions may be shown

---

## `/flights`
Get up to 5 flight options for a trip.

### Usage
- `/flights origin:<IATA> destination:<IATA> date:<YYYY-MM-DD> adults:<number>`

### Example
- `/flights origin:SEA destination:LAX date:2026-03-10 adults:1`

### Output
- Up to 5 flight options including:
  - Airline
  - Price
  - Depart time
  - Arrive time
  - Number of stops
- Google Flights booking link/button for easier booking lookup

### Notes / Limits
- Requires valid IATA airport codes
- Origin and destination cannot be the same airport
- Returns clearer error messages for invalid inputs
- If no flights are found, the bot suggests trying different dates or airports

---

## `/rentalcars`
Find rental cars for a given location.

### Usage
- `/rentalcars location:<place>`

### Example
- `/rentalcars location:"San Diego, CA"`

### Output
- Rental car options for the specified location
- Available car details depending on provider response

### Notes / Limits
- Coverage depends on API/provider support
- Results may vary by location

---

## `/hoteldemo`
Demonstrates hotel API retry behavior in Discord for debugging and demo purposes.

### Usage
- `/hoteldemo city:<IATA_CITY>`

### Example
- `/hoteldemo city:NYC`

### Output
- Retry progress messages
- Final summary message

---

## Saved Trip Storage
When a user saves a trip brief, TREMM stores the trip in two formats:

- **`.txt`** — easy for users to read quickly
- **`.json`** — structured format for reuse, parsing, or future extensions

This makes saved trips both user-friendly and developer-friendly.

---

## Setup / Running Locally

### Install
```bash
npm install
```

### Build
```bash
npm run build
```

### Register Slash Commands
```bash
npm run register
```

### Start the Bot
```bash
npm start
```

---

## Environment Variables
Create a `.env` file or set secrets in your deployment environment.

### Discord
- `TOKEN=...`
- `CLIENT_ID=...`
- `GUILD_ID=...`

### Travel APIs
- `AMADEUS_CLIENT_ID=...`
- `AMADEUS_CLIENT_SECRET=...`
- `AMADEUS_BASE_URL=https://test.api.amadeus.com`
- `DEFAULT_ORIGIN_IATA=SEA`

---

## SBOM (Software Bill of Materials)
Example regeneration command using Syft:

```bash
syft . -o spdx-json > sbom.spdx.json
```

---

## Release Notes (TREMM 2.1)
- Added `/help`
- Added `/watchlist`
- Added `/savedtrips`
- Added `/deletetrip`
- Added `/rentalcar`
- Added save option to `/tripbrief`
- Stored saved trips in both `.txt` and `.json`
- Improved `/newhotels` to support more specific locations
- Improved `/flights` validation and error messaging
- Added Google Flights booking link/button to flight results
- Enhanced `/restaurants`
- Continued improving usability, validation, and travel workflow support

---

## Project Goal
TREMM is designed to make trip planning easier, faster, and more collaborative inside Discord. Instead of switching between multiple travel sites and apps, users can search, compare, save, and manage trip information directly in chat using slash commands.

TREMM 2.1 pushes the project closer to a more complete travel assistant by combining trip discovery, trip storage, hotel tracking, and improved booking workflows into one bot.
