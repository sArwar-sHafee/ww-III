**Game Documentation: Text-Based War Game**

**Game Title**  
ww-III: Real-Time Resource Warfare (2-Player Edition)

**Version**  
1.0 (Text-Only Web Implementation)

**Current Implementation Status**  
This repository currently ships a playable prototype of the core multiplayer loop rather than the full design spec below. The live implementation uses SSE for updates, supports session recovery in-browser, exposes queued war actions in the UI, and includes inline action validation. Advanced systems described later in this document, such as worker assignment and nuclear strikes, are not fully implemented yet.

**Overview**  
ww-III is a fully text-based, real-time strategy war game for exactly two players. One player creates a game room and receives a unique 4-digit code. The second player enters that code to join. The game begins immediately when both players are connected.  

Each game year currently lasts exactly 60 seconds of real time in the shipped build. All actions, production, consumption, and combat resolve simultaneously for both players at the end of every year. The game continues until one player meets a victory condition or the other surrenders.  

The interface uses only HTML text, emojis, and optional small animated GIFs for visual feedback. No maps or graphics are used.


**Deployment Note (Render)**  
This game uses long-lived streaming connections (SSE) for live updates, which do not run reliably on Vercel serverless functions. Deploy on Render instead.  
- Live URL: https://ww-iii.onrender.com  
- Render service id: `srv-d6s4054hg0os73evlk5g`  
- Render blueprint file: `render.yaml` (included in this repo).  

**Game Setup**  
1. Player 1 clicks “Create Game”. The server generates a random 4-digit code and creates a private room.  
2. Player 1 shares the code.  
3. Player 2 enters the code in “Join Game”.  
4. Both players see a 10-second countdown.  
5. The game starts at Year 0 with identical starting conditions for both players.  

All game state is stored on the server. Disconnecting does not end the game; the room remains active until one player wins or both leave.

**Starting Conditions (identical for both players)**  
- Year: 0  
- Population: 10 (maximum capacity: 10)  
- Resources:  
  - Nutrition: 200  
  - Lumber: 150  
  - Steel: 100  
  - Alloy: 50  
  - Oil: 20  
  - Magnet: 20  
  - Electricity: 20  
  - Glass: 20  
  - Plastic: 20  
  - Concrete: 20  
  - Silicon: 20  

**Core Mechanics – The Year Tick**  
Every 60 seconds the server performs the following steps in exact order for both players:  
1. Population consumes nutrition (0.8 nutrition per person).  
2. All buildings produce their resources (workers assigned to buildings add extra output).  
3. Units consume their upkeep.  
4. Any launched missiles and ground assaults resolve.  
5. Resource changes are applied.  
6. Population growth or starvation is calculated.  
7. New year number is displayed and both screens update instantly.

**Resource Rules**  
Resources are displayed in the top bar with current total and net change for the next year.  
- If net change for any resource is negative, the number turns red.  
- If a resource total is 0 or the net change is exactly 0, the number turns solid yellow.  
- If total storage capacity of all related buildings is reached, the resource remains solid yellow. Excess production is lost.  

**Population Rules**  
- Base consumption: 0.8 nutrition per person per year.  
- If nutrition stock reaches 0 or below, 1 person dies every year until nutrition is available again.  
- Surplus nutrition (more than 10 extra per person) causes +0.2 population growth per year (rounded down).  
- Houses increase maximum population capacity by 5 each.  
- Population cannot exceed current house capacity.  

**User Interface Layout**  
- **Top Bar** (always visible):  
  Year number | Population (current/max) | Net nutrition change | All resources with emojis and net change (red when negative or at capacity). See `docs/ui/emoji-map.md` for the full emoji set.  

- **Left Panel**: Event Log  
  Displays the last 10 important events in chronological order (missile impacts, scout detections, battles, building completions, population deaths, etc.). New events push older ones down.  

- **Upper Right Panel**: Chat  
  Real-time chat between the two players. Messages appear instantly. No commands except “/surrender” which instantly ends the game in the opponent’s favor.  

- **Lower Right Panel**: Opponent Intel  
  Shows only scouted information (buildings and approximate resource levels). Updates only when new scouting data arrives.  

- **Main Area**: Six tabs (click to switch)  
  1. Dashboard (overview numbers and big “End Year Early” test button)  
  2. Economy (resource buildings only)  
  3. Buildings (support buildings only)  
  4. Military (train units and build defenses)  
  5. Research (tech tree with progress bars)  
  6. War Room (scout, launch missiles, commit ground assaults)

**Buildings**  
All buildings currently take 1–3 months to complete in the shipped prototype. Only one of each type can be built per category unless specified. Workers can be assigned to speed production.  

**Resource Buildings** (Economy tab)  
- Farm: +4 nutrition per year base. Cost: 15 lumber, 10 steel. Build time: 2 months. Capacity: 200 nutrition.  
- Lumber Camp: +3 lumber per year base. Cost: 10 lumber, 5 steel. Build time: 1 month. Capacity: 150 lumber.  
- Steel Mill: +2 steel per year base. Cost: 20 lumber, 10 steel. Build time: 2 months. Capacity: 100 steel.  
- Alloy Quarry: +1 alloy per year base. Cost: 25 lumber, 15 steel. Build time: 2 months. Capacity: 80 alloy.  
- Oil Rig: +2 oil per year base. Cost: 30 steel, 20 alloy. Build time: 3 months. Requires Electricity research. Capacity: 100 oil.  
- Magnet Extractor: +1 magnet per year base. Cost: 40 steel, 15 alloy, 10 oil. Build time: 3 months. Requires Advanced Mining research. Capacity: 60 magnet.  
- Power Plant: +3 electricity per year base. Cost: 25 steel, 15 oil. Build time: 2 months. Requires Electricity research. Consumes 1 oil per year. Capacity: 80 electricity.  
- Glassworks: +2 glass per year base. Cost: 15 lumber, 10 steel. Build time: 2 months. Requires Industrial Furnaces research. Capacity: 120 glass.  
- Plastics Plant: +2 plastic per year base. Cost: 10 steel, 15 oil, 5 electricity. Build time: 2 months. Requires Plastics research. Capacity: 120 plastic.  
- Concrete Plant: +3 concrete per year base. Cost: 20 lumber, 10 steel, 5 electricity. Build time: 2 months. Requires Industrial Materials research. Capacity: 180 concrete.  
- Silicon Refinery: +1 silicon per year base. Cost: 20 steel, 10 alloy, 5 electricity. Build time: 3 months. Requires Advanced Mining research. Capacity: 80 silicon.  

**Support Buildings**  
- House: +5 population capacity. Cost: 20 lumber, 10 steel. Build time: 1 month.  
- Barracks: Enables soldier training. Cost: 30 lumber, 20 steel. Build time: 2 months.  
- Factory: +20% production to all resource buildings when workers assigned. Cost: 40 steel, 25 alloy, 10 oil. Build time: 3 months. Requires Electricity research.  
- Radar Station: Increases scout accuracy and duration. Cost: 20 steel, 15 alloy, 10 magnet. Build time: 2 months. Requires Advanced Scouting research.  
- Dry Dock: Enables war ship training. Cost: 40 steel, 25 alloy, 15 oil. Build time: 3 months. Requires Naval Warfare research.
- Airfield: Enables fighter zed training. Cost: 30 steel, 25 alloy, 10 silicon. Build time: 3 months. Requires Aerial Warfare research.

**Military Buildings** (Military tab)  
- Missile Silo: Enables missile launches. Cost: 35 steel, 20 oil, 15 alloy. Build time: 3 months. Requires Guided Missiles research. Capacity: 3 missiles stored.  
- Anti-Missile Battery: 35% chance to intercept incoming missiles. Cost: 30 steel, 15 oil, 10 magnet. Build time: 2 months. Requires Guided Missiles research. One battery protects the entire base.  
- Wall: Reduces ground assault damage by 40%. Cost: 50 lumber, 30 steel. Build time: 2 months.  

**Units** (Military tab)  
- Soldier: Cost: 8 nutrition, 4 steel. Upkeep: 0.5 nutrition per year. Attack power: 10.  
- Tank: Cost: 12 steel, 8 oil. Upkeep: 1 nutrition + 0.5 oil per year. Attack power: 25. Requires Tanks research.  
- War Ship: Cost: 30 steel, 20 oil, 15 alloy. Upkeep: 2 nutrition + 1 oil per year. Attack power: 50. Requires Naval Warfare research and Dry Dock.
- Fighter Zed: Cost: 20 alloy, 15 oil, 10 silicon. Upkeep: 1.5 nutrition + 1 oil + 1 electricity per year. Attack power: 40. Requires Aerial Warfare research and Airfield.
- Scout Drone: Cost: 5 oil, 3 electricity. Upkeep: 1 electricity per year. Reveals exact opponent buildings and resources for 2 years. Cooldown: 1 year.  

**Research Tree** (Research tab)  
Research is unlocked sequentially. Each level costs alloy and currently resolves in months in the shipped prototype.  

Tier 1 (Year 3+ availability)  
- Basic Tools: +20% production on all buildings. Cost: 15 alloy. Time: 2 months.  

Tier 2  
- Electricity: Unlocks Power Plants and Oil Rigs. Cost: 25 alloy, 5 magnet. Time: 3 months.  
- Guided Missiles: Unlocks Missile Silos and Anti-Missile Batteries. Cost: 30 alloy, 10 magnet. Time: 3 months.  
- Industrial Furnaces: Unlocks Glassworks. Cost: 20 alloy, 5 steel. Time: 2 months.  

Tier 3  
- Advanced Mining: Unlocks Magnet Extractors. Cost: 35 alloy, 15 magnet. Time: 3 months.  
- Tanks: Unlocks tank training. Cost: 40 alloy, 20 magnet. Time: 4 months.  
- Advanced Scouting: Improves scout drone accuracy. Cost: 25 alloy, 10 magnet. Time: 2 months.  
- Plastics: Unlocks Plastics Plant. Cost: 30 alloy, 10 oil. Time: 3 months.  
- Industrial Materials: Unlocks Concrete Plant. Cost: 20 alloy, 5 steel, 5 electricity. Time: 2 months.  
- Naval Warfare: Unlocks war ship training. Cost: 50 alloy, 25 magnet. Time: 4 months.
- Aerial Warfare: Unlocks fighter zed training. Cost: 50 alloy, 25 silicon. Time: 4 months.

Tier 4 (End-game)  
- Nuclear Technology: Unlocks Nuke in War Room. Cost: 100 alloy, 50 magnet, 30 electricity. Time: 5 months.  

**War Room Mechanics**  
**Scouting**  
- Send Scout Drone: Reveals opponent’s exact number of every building and approximate resource totals (±10%) for the next 2 years.  
- Opponent receives “Scout Detected” in their event log.  

**Missile Strikes**  
- Requires Missile Silo.  
- Choose target: Economy buildings, Military buildings, or Population centers.  
- Cost per missile: 8 steel, 6 oil, 3 electricity.  
- Damage: 20–35% of targeted category (server calculates based on defender’s anti-missile batteries).  
- Anti-Missile Battery has 35% intercept chance per battery.  

**Ground Assaults**  
- Select number of soldiers, tanks, war ships, and fighter zeds to commit.
- Attacker strength = (soldiers × 10) + (tanks × 25) + (war_ships × 50) + (fighter_zeds × 40).
- Defender strength = (remaining soldiers × 5) + (tanks × 12) + (war_ships × 25) + (fighter_zeds × 20) + (Wall bonus).
- Winner loses 30% of committed forces; loser loses 70% of committed forces plus 1–2 random buildings.  
- Attacker steals 10–20% of one random resource type if victorious.  

All attacks launch instantly but resolve at the end of the current year tick.

**Victory Conditions**  
The game ends immediately when any of these occurs:  
1. Opponent population reaches 0.  
2. Nuclear strike lands and opponent has no active Anti-Missile Battery (instant win).  
3. Opponent resources remain at 0 or negative for 5 consecutive years.  
4. Opponent types “/surrender” in chat.  

**Additional Rules**  
- No random events occur.  
- All calculations are deterministic except missile damage range (20–35%) and ground assault loot amount.  
- Building capacity limits are strict; excess production is discarded.  
- Resource and population numbers turn red or blink exactly as described when conditions are met.  
- Chat and event log update in real time via WebSockets.  

**Technical Notes for Implementation**  
- Server uses Socket.io rooms keyed by the 4-digit code.  
- All logic (ticks, combat, production) runs exclusively on the server.  
- Client receives only state updates and renders text.  

This document contains every rule, number, cost, and mechanic required to build and play the complete game.
