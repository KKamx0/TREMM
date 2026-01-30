# TREMM

**Course:** CSS 360  
**Project:** Travel Planning Discord Bot

## Team Members
- Manraj Banga
- Kam Ekwueme
- Tanisha Thakare
- Raya Parsa
- Marco Chan

## Overview
TREMM is a team project for CSS 360 focused on designing, developing, and deploying a Discord bot that helps friend groups plan trips together. The bot provides travel-relevant info and supports planning features through slash commands.

## Current Features (Slash Commands)

### ✅ Weather
**User story:** As a Discord server member, I want the bot to show the current weather and forecast for a location so I can decide whether it’s a good time to travel there.  
**Command:**  
- `/weather <destination>`  
**What it does:** Shows current conditions and a short-term forecast summary for the next 7 days (based on available API limits).

### ✅ Trip Planning
**User story:** As a Discord server member, I want to start a trip plan by entering a destination and trip length so that my group can begin planning a vacation together.  
**Command:**  
- `/plantrip <destination> <trip_length>` *(or your exact option names)*  
**What it does:** Starts a trip plan that the group can build on.

### ✅ Suggested Activities
**User story:** As a Discord server member, I want the bot to suggest popular activities at a destination so that I don’t have to research attractions myself.  
**Command:**  
- `/trip activities <destination>` *(or your exact command structure)*  
**What it does:** Suggests popular activities/attractions for the chosen destination.

## Status
- ✅ Task 1 complete: project environment set up, Discord servers created, and GitHub project board created.
- ✅ Sprint progress: core slash commands implemented (weather, trip planning, activities).
- ⏳ Next: continue adding group features, then merge all sprint work into `main` and tag a release with release notes.

## Development Notes
- After adding or modifying slash commands, re-register commands:
  - `npm run register`
- Run the bot:
  - `npm start`

## Release Workflow
When the sprint scope is finished:
1. Merge feature branches into `main`
2. Tag a release
3. Add release notes summarizing updates and new commands
4. Update this README with the final sprint scope features




